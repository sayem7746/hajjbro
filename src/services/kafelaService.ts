import type {
  BroadcastPriority,
  KafelaMember,
  KafelaMemberRole,
  Prisma,
} from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { GROUP_COLORS, isKafelaAdmin } from '../types/kafela.js';
import { generateJoinCode, normalizeJoinCode } from '../utils/joinCode.js';
import { sendMulticastPush } from './firebase.js';
import { publishKafelaChange } from './kafelaLive.js';
import { logger } from '../utils/logger.js';

const STALE_LOCATION_MS = 10 * 60 * 1000;

const memberUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  fcmToken: true,
} as const;

const memberSelect = {
  id: true,
  userId: true,
  kafelaId: true,
  role: true,
  groupId: true,
  status: true,
  sharingEnabled: true,
  displayName: true,
  phone: true,
  tentOrRoom: true,
  joinedAt: true,
  updatedAt: true,
  user: { select: memberUserSelect },
  group: { select: { id: true, name: true, color: true, adminMemberId: true } },
  location: {
    select: {
      latitude: true,
      longitude: true,
      accuracy: true,
      battery: true,
      updatedAt: true,
    },
  },
} as const;

const kafelaSelect = {
  id: true,
  name: true,
  joinCode: true,
  maxMembers: true,
  startsOn: true,
  endsOn: true,
  createdById: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { members: { where: { status: 'active' } } } },
} as const;

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = generateJoinCode();
    const existing = await prisma.kafela.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new AppError(500, 'Could not generate a unique join code');
}

export async function getActiveMembership(userId: string) {
  return prisma.kafelaMember.findFirst({
    where: { userId, status: 'active', kafela: { isActive: true } },
    select: memberSelect,
  });
}

export async function requireActiveMember(userId: string, kafelaId: string) {
  const member = await prisma.kafelaMember.findFirst({
    where: { userId, kafelaId, status: 'active', kafela: { isActive: true } },
    select: memberSelect,
  });
  if (!member) throw new AppError(403, 'You are not an active member of this kafela');
  return member;
}

function assertKafelaAdmin(member: { role: KafelaMemberRole }) {
  if (!isKafelaAdmin(member.role)) {
    throw new AppError(403, 'Kafela admin permission required');
  }
}

function assertCanManageBroadcast(
  me: { role: KafelaMemberRole; groupId: string | null },
  broadcast: { groupId: string | null }
) {
  if (isKafelaAdmin(me.role)) return;
  if (me.role === 'group_admin' && me.groupId && broadcast.groupId === me.groupId) return;
  throw new AppError(403, 'Not allowed to change this broadcast');
}

function canManageGroup(
  actor: { id: string; role: KafelaMemberRole; groupId: string | null },
  group: { id: string; adminMemberId: string | null }
): boolean {
  if (isKafelaAdmin(actor.role)) return true;
  return group.adminMemberId === actor.id;
}

function canSeeMemberLocation(
  viewer: { id: string; role: KafelaMemberRole; groupId: string | null },
  target: { id: string; groupId: string | null; sharingEnabled: boolean }
): boolean {
  if (viewer.id === target.id) return true;
  if (!target.sharingEnabled) return false;
  if (isKafelaAdmin(viewer.role)) return true;
  if (!target.groupId || viewer.groupId !== target.groupId) return false;
  return true;
}

async function notifyMembers(
  members: Array<{ user: { fcmToken: string | null; id: string } }>,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const tokens = members
    .map((m) => m.user.fcmToken)
    .filter((t): t is string => Boolean(t));

  const notificationRows = members.map((m) => ({
    userId: m.user.id,
    title,
    body,
    data: data ? JSON.stringify(data) : null,
  }));

  if (notificationRows.length) {
    await prisma.notification.createMany({ data: notificationRows });
  }

  if (tokens.length) {
    try {
      await sendMulticastPush(tokens, title, body, data);
    } catch (err) {
      logger.warn({ err }, 'Kafela multicast push failed');
    }
  }
}

// ─── Phase 1: Roster ─────────────────────────────────────────────────────────

export async function createKafela(
  userId: string,
  input: {
    name: string;
    maxMembers?: number;
    startsOn?: string | null;
    endsOn?: string | null;
    displayName?: string | null;
    phone?: string | null;
  }
) {
  const name = input.name?.trim();
  if (!name || name.length < 2) throw new AppError(400, 'Kafela name is required');

  const existing = await getActiveMembership(userId);
  if (existing) throw new AppError(409, 'You are already in an active kafela. Leave it first.');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const joinCode = await uniqueJoinCode();
  const maxMembers = Math.min(Math.max(input.maxMembers ?? 150, 2), 200);

  const kafela = await prisma.$transaction(async (tx) => {
    const created = await tx.kafela.create({
      data: {
        name,
        joinCode,
        maxMembers,
        startsOn: input.startsOn ? new Date(input.startsOn) : null,
        endsOn: input.endsOn ? new Date(input.endsOn) : null,
        createdById: userId,
      },
      select: kafelaSelect,
    });

    await tx.kafelaMember.create({
      data: {
        userId,
        kafelaId: created.id,
        role: 'kafela_admin',
        sharingEnabled: false,
        displayName: input.displayName?.trim() || user.name,
        phone: input.phone?.trim() || user.phone,
      },
    });

    return created;
  });

  const me = await requireActiveMember(userId, kafela.id);
  publishKafelaChange(kafela.id);
  return { kafela, me };
}

export async function joinKafela(
  userId: string,
  input: {
    joinCode: string;
    sharingEnabled?: boolean;
    displayName?: string | null;
    phone?: string | null;
    tentOrRoom?: string | null;
  }
) {
  const code = normalizeJoinCode(input.joinCode);
  if (!code) throw new AppError(400, 'Join code is required');

  const existing = await getActiveMembership(userId);
  if (existing) throw new AppError(409, 'You are already in an active kafela. Leave it first.');

  const kafela = await prisma.kafela.findUnique({
    where: { joinCode: code },
    select: { ...kafelaSelect, isActive: true },
  });
  if (!kafela || !kafela.isActive) throw new AppError(404, 'Invalid join code');

  const activeCount = await prisma.kafelaMember.count({
    where: { kafelaId: kafela.id, status: 'active' },
  });
  if (activeCount >= kafela.maxMembers) {
    throw new AppError(409, 'This kafela is full');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const prior = await prisma.kafelaMember.findUnique({
    where: { userId_kafelaId: { userId, kafelaId: kafela.id } },
  });

  if (prior?.status === 'active') {
    throw new AppError(409, 'You are already a member of this kafela');
  }

  if (prior) {
    await prisma.kafelaMember.update({
      where: { id: prior.id },
      data: {
        status: 'active',
        role: 'member',
        groupId: null,
        sharingEnabled: Boolean(input.sharingEnabled),
        displayName: input.displayName?.trim() || user.name,
        phone: input.phone?.trim() || user.phone,
        tentOrRoom: input.tentOrRoom?.trim() || null,
        joinedAt: new Date(),
      },
    });
  } else {
    await prisma.kafelaMember.create({
      data: {
        userId,
        kafelaId: kafela.id,
        role: 'member',
        sharingEnabled: Boolean(input.sharingEnabled),
        displayName: input.displayName?.trim() || user.name,
        phone: input.phone?.trim() || user.phone,
        tentOrRoom: input.tentOrRoom?.trim() || null,
      },
    });
  }

  const me = await requireActiveMember(userId, kafela.id);
  publishKafelaChange(kafela.id);
  return { kafela, me };
}

export async function getMyKafela(userId: string) {
  const me = await getActiveMembership(userId);
  if (!me) return null;

  const kafela = await prisma.kafela.findUnique({
    where: { id: me.kafelaId },
    select: {
      ...kafelaSelect,
      groups: {
        select: {
          id: true,
          name: true,
          color: true,
          adminMemberId: true,
          _count: { select: { members: { where: { status: 'active' } } } },
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  return { kafela, me };
}

export async function leaveKafela(userId: string, kafelaId: string) {
  const me = await requireActiveMember(userId, kafelaId);

  if (isKafelaAdmin(me.role)) {
    const otherAdmins = await prisma.kafelaMember.count({
      where: {
        kafelaId,
        status: 'active',
        role: 'kafela_admin',
        id: { not: me.id },
      },
    });
    const otherMembers = await prisma.kafelaMember.count({
      where: { kafelaId, status: 'active', id: { not: me.id } },
    });
    if (otherMembers > 0 && otherAdmins === 0) {
      throw new AppError(
        409,
        'Promote another kafela admin before leaving, or remove remaining members'
      );
    }
  }

  const adminGroup = await prisma.kafelaGroup.findFirst({
    where: { adminMemberId: me.id },
  });
  if (adminGroup) {
    await prisma.kafelaGroup.update({
      where: { id: adminGroup.id },
      data: { adminMemberId: null },
    });
    if (me.role === 'group_admin') {
      // role cleared below
    }
  }

  await prisma.kafelaMember.update({
    where: { id: me.id },
    data: { status: 'left', groupId: null, role: 'member', sharingEnabled: false },
  });

  const remaining = await prisma.kafelaMember.count({
    where: { kafelaId, status: 'active' },
  });
  if (remaining === 0) {
    await prisma.kafela.update({
      where: { id: kafelaId },
      data: { isActive: false },
    });
  }

  publishKafelaChange(kafelaId);
  return { left: true };
}

export async function rotateJoinCode(userId: string, kafelaId: string) {
  const me = await requireActiveMember(userId, kafelaId);
  assertKafelaAdmin(me);
  const joinCode = await uniqueJoinCode();
  const kafela = await prisma.kafela.update({
    where: { id: kafelaId },
    data: { joinCode },
    select: kafelaSelect,
  });
  publishKafelaChange(kafelaId);
  return kafela;
}

export async function listMembers(userId: string, kafelaId: string, q?: string) {
  await requireActiveMember(userId, kafelaId);

  const where: Prisma.KafelaMemberWhereInput = {
    kafelaId,
    status: 'active',
  };
  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { displayName: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
      { tentOrRoom: { contains: term, mode: 'insensitive' } },
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
    ];
  }

  return prisma.kafelaMember.findMany({
    where,
    select: memberSelect,
    orderBy: [{ role: 'asc' }, { displayName: 'asc' }, { joinedAt: 'asc' }],
  });
}

export async function updateMemberRole(
  actorUserId: string,
  kafelaId: string,
  memberId: string,
  role: KafelaMemberRole
) {
  const actor = await requireActiveMember(actorUserId, kafelaId);
  assertKafelaAdmin(actor);

  if (!['kafela_admin', 'group_admin', 'member'].includes(role)) {
    throw new AppError(400, 'Invalid role');
  }

  const target = await prisma.kafelaMember.findFirst({
    where: { id: memberId, kafelaId, status: 'active' },
  });
  if (!target) throw new AppError(404, 'Member not found');

  if (target.id === actor.id && role !== 'kafela_admin') {
    const otherAdmins = await prisma.kafelaMember.count({
      where: {
        kafelaId,
        status: 'active',
        role: 'kafela_admin',
        id: { not: actor.id },
      },
    });
    if (otherAdmins === 0) {
      throw new AppError(409, 'Cannot demote the only kafela admin');
    }
  }

  // group_admin role requires being assigned as a group admin separately;
  // promoting to kafela_admin is the main path here.
  const updated = await prisma.kafelaMember.update({
    where: { id: memberId },
    data: { role },
    select: memberSelect,
  });
  publishKafelaChange(kafelaId);
  return updated;
}

export async function removeMember(actorUserId: string, kafelaId: string, memberId: string) {
  const actor = await requireActiveMember(actorUserId, kafelaId);
  assertKafelaAdmin(actor);

  const target = await prisma.kafelaMember.findFirst({
    where: { id: memberId, kafelaId, status: 'active' },
  });
  if (!target) throw new AppError(404, 'Member not found');
  if (target.id === actor.id) throw new AppError(400, 'Use leave instead of removing yourself');

  const adminGroup = await prisma.kafelaGroup.findFirst({
    where: { adminMemberId: target.id },
  });
  if (adminGroup) {
    await prisma.kafelaGroup.update({
      where: { id: adminGroup.id },
      data: { adminMemberId: null },
    });
  }

  await prisma.kafelaMember.update({
    where: { id: memberId },
    data: { status: 'removed', groupId: null, sharingEnabled: false },
  });

  publishKafelaChange(kafelaId);
  return { removed: true };
}

export async function updateMyProfile(
  userId: string,
  kafelaId: string,
  input: {
    displayName?: string | null;
    phone?: string | null;
    tentOrRoom?: string | null;
    sharingEnabled?: boolean;
  }
) {
  const me = await requireActiveMember(userId, kafelaId);
  const data: Prisma.KafelaMemberUpdateInput = {};
  if (input.displayName !== undefined) data.displayName = input.displayName?.trim() || null;
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.tentOrRoom !== undefined) data.tentOrRoom = input.tentOrRoom?.trim() || null;
  if (input.sharingEnabled !== undefined) data.sharingEnabled = Boolean(input.sharingEnabled);

  const updated = await prisma.kafelaMember.update({
    where: { id: me.id },
    data,
    select: memberSelect,
  });
  publishKafelaChange(kafelaId);
  return updated;
}

// ─── Phase 2: Groups ─────────────────────────────────────────────────────────

export async function createGroup(
  userId: string,
  kafelaId: string,
  input: { name: string; color?: string; adminMemberId?: string | null }
) {
  const me = await requireActiveMember(userId, kafelaId);
  assertKafelaAdmin(me);

  const name = input.name?.trim();
  if (!name) throw new AppError(400, 'Group name is required');

  const groupCount = await prisma.kafelaGroup.count({ where: { kafelaId } });
  const color = input.color?.trim() || GROUP_COLORS[groupCount % GROUP_COLORS.length];

  let adminMemberId: string | null = input.adminMemberId ?? null;
  if (adminMemberId) {
    const admin = await prisma.kafelaMember.findFirst({
      where: { id: adminMemberId, kafelaId, status: 'active' },
    });
    if (!admin) throw new AppError(404, 'Admin member not found');
  }

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.kafelaGroup.create({
      data: { kafelaId, name, color, adminMemberId },
    });

    if (adminMemberId) {
      await tx.kafelaMember.update({
        where: { id: adminMemberId },
        data: {
          groupId: created.id,
          role: isKafelaAdmin(
            (
              await tx.kafelaMember.findUniqueOrThrow({ where: { id: adminMemberId } })
            ).role
          )
            ? 'kafela_admin'
            : 'group_admin',
        },
      });
    }

    return created;
  });

  const created = await prisma.kafelaGroup.findUniqueOrThrow({
    where: { id: group.id },
    select: {
      id: true,
      name: true,
      color: true,
      adminMemberId: true,
      kafelaId: true,
      createdAt: true,
      _count: { select: { members: { where: { status: 'active' } } } },
      admin: {
        select: {
          id: true,
          displayName: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
  publishKafelaChange(kafelaId);
  return created;
}

export async function updateGroup(
  userId: string,
  kafelaId: string,
  groupId: string,
  input: { name?: string; color?: string; adminMemberId?: string | null }
) {
  const me = await requireActiveMember(userId, kafelaId);
  assertKafelaAdmin(me);
  const group = await prisma.kafelaGroup.findFirst({ where: { id: groupId, kafelaId } });
  if (!group) throw new AppError(404, 'Group not found');

  const data: Prisma.KafelaGroupUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new AppError(400, 'Group name is required');
    data.name = name;
  }
  if (input.color !== undefined) data.color = input.color;

  if (input.adminMemberId !== undefined) {
    const prevAdminId = group.adminMemberId;
    if (input.adminMemberId) {
      const admin = await prisma.kafelaMember.findFirst({
        where: { id: input.adminMemberId, kafelaId, status: 'active' },
      });
      if (!admin) throw new AppError(404, 'Admin member not found');
    }
    data.admin = input.adminMemberId
      ? { connect: { id: input.adminMemberId } }
      : { disconnect: true };

    await prisma.$transaction(async (tx) => {
      await tx.kafelaGroup.update({ where: { id: groupId }, data });

      if (prevAdminId && prevAdminId !== input.adminMemberId) {
        const prev = await tx.kafelaMember.findUnique({ where: { id: prevAdminId } });
        if (prev && prev.role === 'group_admin') {
          await tx.kafelaMember.update({
            where: { id: prevAdminId },
            data: { role: 'member' },
          });
        }
      }

      if (input.adminMemberId) {
        const next = await tx.kafelaMember.findUniqueOrThrow({
          where: { id: input.adminMemberId },
        });
        await tx.kafelaMember.update({
          where: { id: input.adminMemberId },
          data: {
            groupId,
            role: isKafelaAdmin(next.role) ? 'kafela_admin' : 'group_admin',
          },
        });
      }
    });
  } else {
    await prisma.kafelaGroup.update({ where: { id: groupId }, data });
  }

  const updated = await prisma.kafelaGroup.findUniqueOrThrow({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      color: true,
      adminMemberId: true,
      kafelaId: true,
      createdAt: true,
      _count: { select: { members: { where: { status: 'active' } } } },
      admin: {
        select: {
          id: true,
          displayName: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
  publishKafelaChange(kafelaId);
  return updated;
}

export async function deleteGroup(userId: string, kafelaId: string, groupId: string) {
  const me = await requireActiveMember(userId, kafelaId);
  assertKafelaAdmin(me);

  const group = await prisma.kafelaGroup.findFirst({ where: { id: groupId, kafelaId } });
  if (!group) throw new AppError(404, 'Group not found');

  await prisma.$transaction(async (tx) => {
    await tx.kafelaMember.updateMany({
      where: { groupId, kafelaId },
      data: { groupId: null },
    });
    if (group.adminMemberId) {
      const admin = await tx.kafelaMember.findUnique({ where: { id: group.adminMemberId } });
      if (admin && admin.role === 'group_admin') {
        await tx.kafelaMember.update({
          where: { id: group.adminMemberId },
          data: { role: 'member' },
        });
      }
    }
    await tx.kafelaGroup.delete({ where: { id: groupId } });
  });

  publishKafelaChange(kafelaId);
  return { deleted: true };
}

export async function assignMembersToGroup(
  userId: string,
  kafelaId: string,
  groupId: string | null,
  memberIds: string[]
) {
  const me = await requireActiveMember(userId, kafelaId);

  if (groupId) {
    const group = await prisma.kafelaGroup.findFirst({ where: { id: groupId, kafelaId } });
    if (!group) throw new AppError(404, 'Group not found');
    if (!canManageGroup(me, group)) {
      throw new AppError(403, 'Not allowed to assign members to this group');
    }
  } else if (!isKafelaAdmin(me.role)) {
    throw new AppError(403, 'Kafela admin permission required to ungroup members');
  }

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    throw new AppError(400, 'memberIds is required');
  }

  const members = await prisma.kafelaMember.findMany({
    where: { id: { in: memberIds }, kafelaId, status: 'active' },
  });
  if (members.length !== memberIds.length) {
    throw new AppError(404, 'One or more members not found');
  }

  // Group admins may only assign within their group (or ungrouped → their group)
  if (!isKafelaAdmin(me.role)) {
    for (const m of members) {
      if (m.groupId && m.groupId !== me.groupId) {
        throw new AppError(403, 'Group admins can only manage their own group members');
      }
    }
  }

  await prisma.kafelaMember.updateMany({
    where: { id: { in: memberIds }, kafelaId },
    data: { groupId },
  });

  const roster = await listMembers(userId, kafelaId);
  publishKafelaChange(kafelaId);
  return roster;
}

export async function listGroups(userId: string, kafelaId: string) {
  await requireActiveMember(userId, kafelaId);
  return prisma.kafelaGroup.findMany({
    where: { kafelaId },
    select: {
      id: true,
      name: true,
      color: true,
      adminMemberId: true,
      kafelaId: true,
      createdAt: true,
      _count: { select: { members: { where: { status: 'active' } } } },
      admin: {
        select: {
          id: true,
          displayName: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

// ─── Phase 3: Location ───────────────────────────────────────────────────────

export async function upsertMyLocation(
  userId: string,
  kafelaId: string,
  input: { latitude: number; longitude: number; accuracy?: number | null; battery?: number | null }
) {
  const me = await requireActiveMember(userId, kafelaId);
  if (!me.sharingEnabled) {
    throw new AppError(403, 'Location sharing is disabled. Enable sharing first.');
  }

  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError(400, 'Valid latitude and longitude are required');
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError(400, 'Coordinates out of range');
  }

  return prisma.memberLocation.upsert({
    where: { memberId: me.id },
    create: {
      memberId: me.id,
      latitude: lat,
      longitude: lng,
      accuracy: input.accuracy ?? null,
      battery: input.battery ?? null,
    },
    update: {
      latitude: lat,
      longitude: lng,
      accuracy: input.accuracy ?? null,
      battery: input.battery ?? null,
    },
    select: {
      latitude: true,
      longitude: true,
      accuracy: true,
      battery: true,
      updatedAt: true,
    },
  });
}

export async function getVisibleLocations(userId: string, kafelaId: string) {
  const me = await requireActiveMember(userId, kafelaId);

  const members = await prisma.kafelaMember.findMany({
    where: { kafelaId, status: 'active' },
    select: {
      id: true,
      role: true,
      groupId: true,
      sharingEnabled: true,
      displayName: true,
      phone: true,
      tentOrRoom: true,
      user: { select: { id: true, name: true, phone: true } },
      group: { select: { id: true, name: true, color: true, adminMemberId: true } },
      location: {
        select: {
          latitude: true,
          longitude: true,
          accuracy: true,
          battery: true,
          updatedAt: true,
        },
      },
    },
  });

  const now = Date.now();
  return members
    .filter((target) => canSeeMemberLocation(me, target))
    .map((m) => {
      const updatedAt = m.location?.updatedAt ? m.location.updatedAt.getTime() : null;
      const ageMs = updatedAt != null ? now - updatedAt : null;
      const stale = ageMs != null ? ageMs > STALE_LOCATION_MS : true;
      const showCoords = m.sharingEnabled && m.location && (m.id === me.id || m.sharingEnabled);

      return {
        memberId: m.id,
        displayName: m.displayName || m.user.name || 'Pilgrim',
        phone: m.phone || m.user.phone,
        tentOrRoom: m.tentOrRoom,
        role: m.role,
        group: m.group,
        sharingEnabled: m.sharingEnabled,
        isSelf: m.id === me.id,
        location:
          showCoords && m.location
            ? {
                latitude: Number(m.location.latitude),
                longitude: Number(m.location.longitude),
                accuracy: m.location.accuracy,
                battery: m.location.battery,
                updatedAt: m.location.updatedAt,
                ageMs,
                stale,
              }
            : null,
      };
    });
}

// ─── Phase 4: Broadcasts ─────────────────────────────────────────────────────

export async function createBroadcast(
  userId: string,
  kafelaId: string,
  input: {
    title: string;
    body: string;
    groupId?: string | null;
    priority?: BroadcastPriority;
    rallyLat?: number | null;
    rallyLng?: number | null;
  }
) {
  const me = await requireActiveMember(userId, kafelaId);
  const title = input.title?.trim();
  const body = input.body?.trim();
  if (!title || !body) throw new AppError(400, 'Title and body are required');

  let groupId: string | null = input.groupId ?? null;

  if (isKafelaAdmin(me.role)) {
    if (groupId) {
      const group = await prisma.kafelaGroup.findFirst({ where: { id: groupId, kafelaId } });
      if (!group) throw new AppError(404, 'Group not found');
    }
  } else if (me.role === 'group_admin') {
    if (!me.groupId) throw new AppError(403, 'You are not assigned to a group');
    if (groupId && groupId !== me.groupId) {
      throw new AppError(403, 'Group admins can only broadcast to their own group');
    }
    groupId = me.groupId;
  } else {
    throw new AppError(403, 'Only kafela or group admins can broadcast');
  }

  const priority: BroadcastPriority = input.priority === 'urgent' ? 'urgent' : 'info';

  const broadcast = await prisma.broadcast.create({
    data: {
      kafelaId,
      groupId,
      authorId: me.id,
      title,
      body,
      priority,
      rallyLat: input.rallyLat ?? null,
      rallyLng: input.rallyLng ?? null,
    },
    include: {
      group: { select: { id: true, name: true, color: true } },
      author: {
        select: { id: true, displayName: true, user: { select: { name: true } } },
      },
      _count: { select: { acks: true } },
    },
  });

  const recipients = await prisma.kafelaMember.findMany({
    where: {
      kafelaId,
      status: 'active',
      ...(groupId ? { groupId } : {}),
    },
    select: { user: { select: { id: true, fcmToken: true } } },
  });

  const prefix = priority === 'urgent' ? '🚨 ' : '';
  const scope = broadcast.group?.name ? ` [${broadcast.group.name}]` : '';
  await notifyMembers(
    recipients,
    `${prefix}${title}${scope}`,
    body,
    {
      type: 'kafela_broadcast',
      kafelaId,
      broadcastId: broadcast.id,
      priority,
    }
  );

  publishKafelaChange(kafelaId);
  return broadcast;
}

export async function listBroadcasts(userId: string, kafelaId: string) {
  const me = await requireActiveMember(userId, kafelaId);

  const where: Prisma.BroadcastWhereInput = { kafelaId };
  if (!isKafelaAdmin(me.role)) {
    where.OR = [{ groupId: null }, ...(me.groupId ? [{ groupId: me.groupId }] : [])];
  }

  const broadcasts = await prisma.broadcast.findMany({
    where,
    include: {
      group: { select: { id: true, name: true, color: true } },
      author: {
        select: { id: true, displayName: true, user: { select: { name: true } } },
      },
      acks: {
        where: { memberId: me.id },
        select: { seenAt: true },
        take: 1,
      },
      _count: { select: { acks: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return broadcasts.map((b) => ({
    ...b,
    seenByMe: b.acks.length > 0,
    acks: undefined,
  }));
}

export async function ackBroadcast(userId: string, kafelaId: string, broadcastId: string) {
  const me = await requireActiveMember(userId, kafelaId);
  const broadcast = await prisma.broadcast.findFirst({
    where: { id: broadcastId, kafelaId },
  });
  if (!broadcast) throw new AppError(404, 'Broadcast not found');

  if (!isKafelaAdmin(me.role)) {
    if (broadcast.groupId && broadcast.groupId !== me.groupId) {
      throw new AppError(403, 'This broadcast is not for your group');
    }
  }

  await prisma.broadcastAck.upsert({
    where: { broadcastId_memberId: { broadcastId, memberId: me.id } },
    create: { broadcastId, memberId: me.id },
    update: { seenAt: new Date() },
  });

  publishKafelaChange(kafelaId);
  return { acked: true };
}

export async function getBroadcastAckStatus(
  userId: string,
  kafelaId: string,
  broadcastId: string
) {
  const me = await requireActiveMember(userId, kafelaId);
  if (!isKafelaAdmin(me.role) && me.role !== 'group_admin') {
    throw new AppError(403, 'Admin permission required');
  }

  const broadcast = await prisma.broadcast.findFirst({
    where: { id: broadcastId, kafelaId },
  });
  if (!broadcast) throw new AppError(404, 'Broadcast not found');

  if (me.role === 'group_admin' && broadcast.groupId !== me.groupId) {
    throw new AppError(403, 'Not allowed for this broadcast');
  }

  const recipients = await prisma.kafelaMember.findMany({
    where: {
      kafelaId,
      status: 'active',
      ...(broadcast.groupId ? { groupId: broadcast.groupId } : {}),
    },
    select: {
      id: true,
      displayName: true,
      user: { select: { name: true } },
      broadcastAcks: {
        where: { broadcastId },
        select: { seenAt: true },
        take: 1,
      },
    },
  });

  return recipients.map((r) => ({
    memberId: r.id,
    displayName: r.displayName || r.user.name || 'Pilgrim',
    seen: r.broadcastAcks.length > 0,
    seenAt: r.broadcastAcks[0]?.seenAt ?? null,
  }));
}

const broadcastWriteInclude = {
  group: { select: { id: true, name: true, color: true } },
  author: {
    select: { id: true, displayName: true, user: { select: { name: true } } },
  },
  _count: { select: { acks: true } },
} as const;

export async function updateBroadcast(
  userId: string,
  kafelaId: string,
  broadcastId: string,
  input: {
    title?: string;
    body?: string;
    priority?: BroadcastPriority;
  }
) {
  const me = await requireActiveMember(userId, kafelaId);
  const existing = await prisma.broadcast.findFirst({
    where: { id: broadcastId, kafelaId },
  });
  if (!existing) throw new AppError(404, 'Broadcast not found');
  assertCanManageBroadcast(me, existing);

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  const body = input.body !== undefined ? input.body.trim() : existing.body;
  if (!title || !body) throw new AppError(400, 'Title and body are required');

  const priority: BroadcastPriority =
    input.priority === undefined ? existing.priority : input.priority === 'urgent' ? 'urgent' : 'info';

  const broadcast = await prisma.broadcast.update({
    where: { id: existing.id },
    data: { title, body, priority },
    include: broadcastWriteInclude,
  });

  publishKafelaChange(kafelaId);
  return broadcast;
}

export async function deleteBroadcast(userId: string, kafelaId: string, broadcastId: string) {
  const me = await requireActiveMember(userId, kafelaId);
  const existing = await prisma.broadcast.findFirst({
    where: { id: broadcastId, kafelaId },
  });
  if (!existing) throw new AppError(404, 'Broadcast not found');
  assertCanManageBroadcast(me, existing);

  await prisma.broadcast.delete({ where: { id: existing.id } });
  publishKafelaChange(kafelaId);
  return { deleted: true };
}

export async function deleteAllBroadcasts(userId: string, kafelaId: string) {
  const me = await requireActiveMember(userId, kafelaId);

  const where: Prisma.BroadcastWhereInput = { kafelaId };
  if (!isKafelaAdmin(me.role)) {
    if (me.role !== 'group_admin' || !me.groupId) {
      throw new AppError(403, 'Only kafela or group admins can delete broadcasts');
    }
    where.groupId = me.groupId;
  }

  const result = await prisma.broadcast.deleteMany({ where });
  if (result.count > 0) publishKafelaChange(kafelaId);
  return { deleted: result.count };
}

// ─── Phase 5: SOS + Roll call ────────────────────────────────────────────────

export async function createSos(
  userId: string,
  kafelaId: string,
  input: {
    latitude?: number | null;
    longitude?: number | null;
    note?: string | null;
  }
) {
  const me = await requireActiveMember(userId, kafelaId);

  let lat = input.latitude ?? null;
  let lng = input.longitude ?? null;

  if (lat == null || lng == null) {
    const loc = await prisma.memberLocation.findUnique({ where: { memberId: me.id } });
    if (loc) {
      lat = Number(loc.latitude);
      lng = Number(loc.longitude);
    }
  }

  const sos = await prisma.sosEvent.create({
    data: {
      kafelaId,
      memberId: me.id,
      latitude: lat,
      longitude: lng,
      note: input.note?.trim() || null,
    },
    include: {
      member: {
        select: {
          id: true,
          displayName: true,
          phone: true,
          groupId: true,
          group: { select: { id: true, name: true, color: true } },
          user: { select: { name: true, phone: true } },
        },
      },
    },
  });

  const leaders = await prisma.kafelaMember.findMany({
    where: {
      kafelaId,
      status: 'active',
      OR: [
        { role: 'kafela_admin' },
        ...(me.groupId
          ? [{ groupId: me.groupId, role: 'group_admin' as const }]
          : []),
      ],
    },
    select: { user: { select: { id: true, fcmToken: true } } },
  });

  const name = me.displayName || me.user.name || 'A pilgrim';
  await notifyMembers(leaders, `SOS: ${name}`, input.note?.trim() || 'Needs help now', {
    type: 'kafela_sos',
    kafelaId,
    sosId: sos.id,
    memberId: me.id,
  });

  publishKafelaChange(kafelaId);
  return sos;
}

export async function listSos(userId: string, kafelaId: string, openOnly = true) {
  const me = await requireActiveMember(userId, kafelaId);

  const where: Prisma.SosEventWhereInput = { kafelaId };
  if (openOnly) where.resolvedAt = null;

  if (!isKafelaAdmin(me.role)) {
    if (me.role === 'group_admin' && me.groupId) {
      where.OR = [{ memberId: me.id }, { member: { groupId: me.groupId } }];
    } else {
      where.memberId = me.id;
    }
  }

  return prisma.sosEvent.findMany({
    where,
    include: {
      member: {
        select: {
          id: true,
          displayName: true,
          phone: true,
          group: { select: { id: true, name: true, color: true } },
          user: { select: { name: true, phone: true } },
        },
      },
      resolvedBy: {
        select: { id: true, displayName: true, user: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function resolveSos(userId: string, kafelaId: string, sosId: string) {
  const me = await requireActiveMember(userId, kafelaId);
  const sos = await prisma.sosEvent.findFirst({
    where: { id: sosId, kafelaId },
    include: { member: true },
  });
  if (!sos) throw new AppError(404, 'SOS not found');
  if (sos.resolvedAt) return sos;

  const canResolve =
    isKafelaAdmin(me.role) ||
    (me.role === 'group_admin' && me.groupId && sos.member.groupId === me.groupId) ||
    sos.memberId === me.id;

  if (!canResolve) throw new AppError(403, 'Not allowed to resolve this SOS');

  const resolved = await prisma.sosEvent.update({
    where: { id: sosId },
    data: { resolvedAt: new Date(), resolvedById: me.id },
    include: {
      member: {
        select: {
          id: true,
          displayName: true,
          phone: true,
          group: { select: { id: true, name: true, color: true } },
          user: { select: { name: true, phone: true } },
        },
      },
      resolvedBy: {
        select: { id: true, displayName: true, user: { select: { name: true } } },
      },
    },
  });
  publishKafelaChange(kafelaId);
  return resolved;
}

export async function createRollCall(
  userId: string,
  kafelaId: string,
  input: { title: string; groupId?: string | null }
) {
  const me = await requireActiveMember(userId, kafelaId);
  const title = input.title?.trim() || 'Roll call';

  let groupId: string | null = input.groupId ?? null;

  if (isKafelaAdmin(me.role)) {
    if (groupId) {
      const group = await prisma.kafelaGroup.findFirst({ where: { id: groupId, kafelaId } });
      if (!group) throw new AppError(404, 'Group not found');
    }
  } else if (me.role === 'group_admin') {
    if (!me.groupId) throw new AppError(403, 'You are not assigned to a group');
    groupId = me.groupId;
  } else {
    throw new AppError(403, 'Only admins can start a roll call');
  }

  const rollCall = await prisma.rollCall.create({
    data: {
      kafelaId,
      groupId,
      authorId: me.id,
      title,
    },
    include: {
      group: { select: { id: true, name: true, color: true } },
      author: {
        select: { id: true, displayName: true, user: { select: { name: true } } },
      },
    },
  });

  const recipients = await prisma.kafelaMember.findMany({
    where: {
      kafelaId,
      status: 'active',
      ...(groupId ? { groupId } : {}),
    },
    select: { user: { select: { id: true, fcmToken: true } } },
  });

  await notifyMembers(recipients, `Roll call: ${title}`, 'Tap to mark yourself present', {
    type: 'kafela_roll_call',
    kafelaId,
    rollCallId: rollCall.id,
  });

  publishKafelaChange(kafelaId);
  return rollCall;
}

export async function respondRollCall(
  userId: string,
  kafelaId: string,
  rollCallId: string,
  present = true
) {
  const me = await requireActiveMember(userId, kafelaId);
  const rollCall = await prisma.rollCall.findFirst({
    where: { id: rollCallId, kafelaId },
  });
  if (!rollCall) throw new AppError(404, 'Roll call not found');
  if (rollCall.closedAt) throw new AppError(409, 'This roll call is closed');

  if (rollCall.groupId && rollCall.groupId !== me.groupId && !isKafelaAdmin(me.role)) {
    throw new AppError(403, 'This roll call is not for your group');
  }

  await prisma.rollCallResponse.upsert({
    where: { rollCallId_memberId: { rollCallId, memberId: me.id } },
    create: { rollCallId, memberId: me.id, present },
    update: { present, respondedAt: new Date() },
  });

  publishKafelaChange(kafelaId);
  return { responded: true, present };
}

export async function getRollCallStatus(userId: string, kafelaId: string, rollCallId: string) {
  const me = await requireActiveMember(userId, kafelaId);
  const rollCall = await prisma.rollCall.findFirst({
    where: { id: rollCallId, kafelaId },
    include: {
      group: { select: { id: true, name: true, color: true } },
      author: {
        select: { id: true, displayName: true, user: { select: { name: true } } },
      },
    },
  });
  if (!rollCall) throw new AppError(404, 'Roll call not found');

  const canViewFull =
    isKafelaAdmin(me.role) ||
    (me.role === 'group_admin' && me.groupId === rollCall.groupId) ||
    rollCall.authorId === me.id;

  if (!canViewFull && rollCall.groupId && rollCall.groupId !== me.groupId) {
    throw new AppError(403, 'Not allowed to view this roll call');
  }

  const expected = await prisma.kafelaMember.findMany({
    where: {
      kafelaId,
      status: 'active',
      ...(rollCall.groupId ? { groupId: rollCall.groupId } : {}),
    },
    select: {
      id: true,
      displayName: true,
      phone: true,
      group: { select: { id: true, name: true, color: true } },
      user: { select: { name: true, phone: true } },
      rollCallResponses: {
        where: { rollCallId },
        select: { present: true, respondedAt: true },
        take: 1,
      },
    },
    orderBy: { displayName: 'asc' },
  });

  const roster = expected.map((m) => ({
    memberId: m.id,
    displayName: m.displayName || m.user.name || 'Pilgrim',
    phone: m.phone || m.user.phone,
    group: m.group,
    present: m.rollCallResponses[0]?.present ?? null,
    respondedAt: m.rollCallResponses[0]?.respondedAt ?? null,
  }));

  const present = roster.filter((r) => r.present === true);
  const missing = roster.filter((r) => r.present !== true);

  return {
    rollCall,
    summary: {
      expected: roster.length,
      present: present.length,
      missing: missing.length,
    },
    present: canViewFull ? present : present.filter((p) => p.memberId === me.id),
    missing: canViewFull ? missing : missing.filter((p) => p.memberId === me.id),
    myResponse: roster.find((r) => r.memberId === me.id) ?? null,
  };
}

export async function listRollCalls(userId: string, kafelaId: string) {
  const me = await requireActiveMember(userId, kafelaId);
  const where: Prisma.RollCallWhereInput = { kafelaId, closedAt: null };
  if (!isKafelaAdmin(me.role)) {
    where.OR = [{ groupId: null }, ...(me.groupId ? [{ groupId: me.groupId }] : [])];
  }

  return prisma.rollCall.findMany({
    where,
    include: {
      group: { select: { id: true, name: true, color: true } },
      author: {
        select: { id: true, displayName: true, user: { select: { name: true } } },
      },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function closeRollCall(userId: string, kafelaId: string, rollCallId: string) {
  const me = await requireActiveMember(userId, kafelaId);
  const rollCall = await prisma.rollCall.findFirst({ where: { id: rollCallId, kafelaId } });
  if (!rollCall) throw new AppError(404, 'Roll call not found');

  const canClose =
    isKafelaAdmin(me.role) ||
    rollCall.authorId === me.id ||
    (me.role === 'group_admin' && me.groupId === rollCall.groupId);
  if (!canClose) throw new AppError(403, 'Not allowed to close this roll call');

  const closed = await prisma.rollCall.update({
    where: { id: rollCallId },
    data: { closedAt: new Date() },
  });
  publishKafelaChange(kafelaId);
  return closed;
}

export async function getKafelaSnapshot(userId: string, kafelaId: string) {
  const me = await requireActiveMember(userId, kafelaId);
  const kafela = await prisma.kafela.findUnique({
    where: { id: kafelaId },
    select: kafelaSelect,
  });
  if (!kafela || !kafela.isActive) throw new AppError(404, 'Kafela not found');

  const [members, groups, broadcasts, sosEvents, rollCalls] = await Promise.all([
    listMembers(userId, kafelaId),
    listGroups(userId, kafelaId),
    listBroadcasts(userId, kafelaId),
    listSos(userId, kafelaId, true),
    listRollCalls(userId, kafelaId),
  ]);

  return { kafela, me, members, groups, broadcasts, sosEvents, rollCalls };
}

export type { KafelaMember };
