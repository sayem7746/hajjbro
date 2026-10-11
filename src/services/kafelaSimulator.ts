/**
 * Development-only kafela crowd for local testing.
 * Creates a demo admin + ~79 simulated members (~100 people with companions)
 * and walks their GPS every 15s so map pins stay fresh.
 */
import bcrypt from 'bcrypt';
import type { KafelaCompanionRelation, KafelaMemberRole } from '@prisma/client';
import { env } from '../config/env.js';
import prisma from '../lib/prisma.js';
import { GROUP_COLORS } from '../types/kafela.js';
import { logger } from '../utils/logger.js';

export const DEMO_EMAIL = 'kafela.demo@hajjbro.test';
export const DEMO_PASSWORD = 'KafelaDemo123';
const DEMO_NAME = 'Kafela Demo Admin';
const KAFELA_NAME = 'Demo Kafela';
const JOIN_CODE = 'DEMOHAJJ';
const SIM_COUNT = 79;
const COMPANION_TARGET = 20;
const NO_SHARE_COUNT = 5;
const WALK_MS = 15_000;

const FIRST_NAMES = [
  'Ahmed', 'Fatima', 'Omar', 'Aisha', 'Hassan', 'Maryam', 'Yusuf', 'Zainab',
  'Ibrahim', 'Khadija', 'Ali', 'Sara', 'Bilal', 'Layla', 'Hamza', 'Noor',
  'Tariq', 'Amira', 'Salim', 'Huda', 'Rashid', 'Salma', 'Karim', 'Rania',
  'Nabil', 'Dina', 'Faisal', 'Lina', 'Zayd', 'Hana', 'Imran', 'Yasmin',
];

const LAST_NAMES = [
  'Rahman', 'Hassan', 'Ali', 'Khan', 'Ahmed', 'Ibrahim', 'Malik', 'Qureshi',
  'Siddiqui', 'Ansari', 'Chowdhury', 'Hussain', 'Farooq', 'Nasser', 'Abbas',
];

const GROUP_DEFS = [
  { name: 'Mina A', color: GROUP_COLORS[0], lat: 21.4133, lng: 39.8933 },
  { name: 'Mina B', color: GROUP_COLORS[1], lat: 21.4155, lng: 39.888 },
  { name: 'Haram', color: GROUP_COLORS[2], lat: 21.4225, lng: 39.8262 },
  { name: 'Arafat', color: GROUP_COLORS[3], lat: 21.355, lng: 39.9942 },
] as const;

const COMPANION_NAMES = [
  { name: 'Amina', relation: 'spouse' as KafelaCompanionRelation },
  { name: 'Omar Jr', relation: 'child' as KafelaCompanionRelation },
  { name: 'Umm Fatima', relation: 'parent' as KafelaCompanionRelation },
  { name: 'Yusuf Jr', relation: 'child' as KafelaCompanionRelation },
  { name: 'Zainab', relation: 'spouse' as KafelaCompanionRelation },
  { name: 'Hafsa', relation: 'other' as KafelaCompanionRelation },
];

type WalkTarget = {
  memberId: string;
  anchorLat: number;
  anchorLng: number;
};

let walkTimer: ReturnType<typeof setInterval> | null = null;
let walkTargets: WalkTarget[] = [];

function simEmail(index: number): string {
  return `kafela.sim.${String(index).padStart(3, '0')}@hajjbro.test`;
}

function displayName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

/** ~meters → degrees at Makkah latitude */
function jitter(meters: number): number {
  return (Math.random() - 0.5) * 2 * (meters / 111_320);
}

function offsetAround(lat: number, lng: number, radiusM: number): { lat: number; lng: number } {
  return {
    lat: lat + jitter(radiusM),
    lng: lng + jitter(radiusM) / Math.cos((lat * Math.PI) / 180),
  };
}

async function ensureDemoCrowd(): Promise<{ kafelaId: string; adminMemberId: string }> {
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, Math.min(env.BCRYPT_SALT_ROUNDS, 12));
  const simHash = await bcrypt.hash('sim-unused-password', 4);

  const adminUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      passwordHash: demoHash,
      name: DEMO_NAME,
      phone: '+966500000000',
    },
    update: {
      passwordHash: demoHash,
      name: DEMO_NAME,
      isActive: true,
    },
  });

  let kafela = await prisma.kafela.findUnique({ where: { joinCode: JOIN_CODE } });
  if (!kafela) {
    kafela = await prisma.kafela.create({
      data: {
        name: KAFELA_NAME,
        joinCode: JOIN_CODE,
        maxMembers: 150,
        createdById: adminUser.id,
        isActive: true,
      },
    });
  } else {
    kafela = await prisma.kafela.update({
      where: { id: kafela.id },
      data: {
        name: KAFELA_NAME,
        maxMembers: 150,
        isActive: true,
        createdById: adminUser.id,
      },
    });
  }

  const adminMember = await prisma.kafelaMember.upsert({
    where: {
      userId_kafelaId: { userId: adminUser.id, kafelaId: kafela.id },
    },
    create: {
      userId: adminUser.id,
      kafelaId: kafela.id,
      role: 'kafela_admin',
      status: 'active',
      sharingEnabled: true,
      displayName: DEMO_NAME,
      phone: '+966500000000',
      tentOrRoom: 'HQ',
    },
    update: {
      role: 'kafela_admin',
      status: 'active',
      sharingEnabled: true,
      displayName: DEMO_NAME,
    },
  });

  const haram = offsetAround(21.4225, 39.8262, 40);
  await prisma.memberLocation.upsert({
    where: { memberId: adminMember.id },
    create: {
      memberId: adminMember.id,
      latitude: haram.lat,
      longitude: haram.lng,
      accuracy: 12,
      battery: 88,
    },
    update: {
      latitude: haram.lat,
      longitude: haram.lng,
      accuracy: 12,
      battery: 88,
    },
  });

  // Groups
  const groups: Array<{ id: string; name: string; lat: number; lng: number }> = [];
  for (const def of GROUP_DEFS) {
    let group = await prisma.kafelaGroup.findFirst({
      where: { kafelaId: kafela.id, name: def.name },
    });
    if (!group) {
      group = await prisma.kafelaGroup.create({
        data: {
          kafelaId: kafela.id,
          name: def.name,
          color: def.color,
        },
      });
    } else if (group.color !== def.color) {
      group = await prisma.kafelaGroup.update({
        where: { id: group.id },
        data: { color: def.color },
      });
    }
    groups.push({ id: group.id, name: def.name, lat: def.lat, lng: def.lng });
  }

  const newWalkTargets: WalkTarget[] = [];

  for (let i = 1; i <= SIM_COUNT; i++) {
    const email = simEmail(i);
    const name = displayName(i - 1);
    const group = groups[(i - 1) % groups.length];
    const sharingEnabled = i > SIM_COUNT - NO_SHARE_COUNT ? false : true;
    const isGroupAdmin = i <= groups.length; // first member of each group slot
    const role: KafelaMemberRole = isGroupAdmin ? 'group_admin' : 'member';

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash: simHash,
        name,
        phone: `+9665${String(10000000 + i).slice(0, 8)}`,
      },
      update: {
        name,
        isActive: true,
        passwordHash: simHash,
      },
    });

    const member = await prisma.kafelaMember.upsert({
      where: {
        userId_kafelaId: { userId: user.id, kafelaId: kafela.id },
      },
      create: {
        userId: user.id,
        kafelaId: kafela.id,
        role,
        status: 'active',
        sharingEnabled,
        displayName: name,
        phone: user.phone,
        tentOrRoom: `T-${group.name.replace(/\s+/g, '')}-${String(i).padStart(2, '0')}`,
        groupId: group.id,
      },
      update: {
        role,
        status: 'active',
        sharingEnabled,
        displayName: name,
        groupId: group.id,
      },
    });

    if (isGroupAdmin) {
      await prisma.kafelaGroup.update({
        where: { id: group.id },
        data: { adminMemberId: member.id },
      });
    }

    if (sharingEnabled) {
      const pos = offsetAround(group.lat, group.lng, 180);
      await prisma.memberLocation.upsert({
        where: { memberId: member.id },
        create: {
          memberId: member.id,
          latitude: pos.lat,
          longitude: pos.lng,
          accuracy: 8 + Math.floor(Math.random() * 20),
          battery: 40 + Math.floor(Math.random() * 55),
        },
        update: {
          latitude: pos.lat,
          longitude: pos.lng,
          accuracy: 8 + Math.floor(Math.random() * 20),
          battery: 40 + Math.floor(Math.random() * 55),
        },
      });
      newWalkTargets.push({
        memberId: member.id,
        anchorLat: group.lat,
        anchorLng: group.lng,
      });
    }
  }

  // Companions (~20 people without phones)
  const companionHolders = await prisma.kafelaMember.findMany({
    where: {
      kafelaId: kafela.id,
      status: 'active',
      role: 'member',
      user: { email: { startsWith: 'kafela.sim.' } },
    },
    select: { id: true, companions: { select: { id: true } } },
    orderBy: { joinedAt: 'asc' },
    take: COMPANION_TARGET,
  });

  for (let i = 0; i < companionHolders.length; i++) {
    const holder = companionHolders[i];
    if (holder.companions.length > 0) continue;
    const def = COMPANION_NAMES[i % COMPANION_NAMES.length];
    await prisma.kafelaCompanion.create({
      data: {
        memberId: holder.id,
        name: def.name,
        relation: def.relation,
      },
    });
  }

  // Sample SOS (one open)
  const openSos = await prisma.sosEvent.findFirst({
    where: { kafelaId: kafela.id, resolvedAt: null },
  });
  if (!openSos) {
    const sosMember = await prisma.kafelaMember.findFirst({
      where: {
        kafelaId: kafela.id,
        status: 'active',
        role: 'member',
        sharingEnabled: true,
        user: { email: { startsWith: 'kafela.sim.' } },
      },
      include: { location: true },
    });
    if (sosMember) {
      await prisma.sosEvent.create({
        data: {
          kafelaId: kafela.id,
          memberId: sosMember.id,
          latitude: sosMember.location ? Number(sosMember.location.latitude) : 21.4225,
          longitude: sosMember.location ? Number(sosMember.location.longitude) : 39.8262,
          note: 'For: Simulated pilgrim — Separated near Jamarat (demo SOS)',
        },
      });
    }
  }

  // Sample broadcast
  const existingBroadcast = await prisma.broadcast.findFirst({
    where: { kafelaId: kafela.id },
  });
  if (!existingBroadcast) {
    await prisma.broadcast.create({
      data: {
        kafelaId: kafela.id,
        authorId: adminMember.id,
        title: 'Gather at Camp HQ',
        body: 'Demo broadcast: please regroup at the kafela tent before Maghrib. Bring water.',
        priority: 'info',
        rallyLat: 21.4133,
        rallyLng: 39.8933,
      },
    });
  }

  // Open roll call with mixed responses
  const openRoll = await prisma.rollCall.findFirst({
    where: { kafelaId: kafela.id, closedAt: null },
  });
  if (!openRoll) {
    const rollCall = await prisma.rollCall.create({
      data: {
        kafelaId: kafela.id,
        authorId: adminMember.id,
        title: 'Evening headcount (demo)',
      },
    });

    const responders = await prisma.kafelaMember.findMany({
      where: {
        kafelaId: kafela.id,
        status: 'active',
        user: { email: { startsWith: 'kafela.sim.' } },
      },
      select: { id: true, companions: { select: { id: true } } },
      take: 40,
      orderBy: { joinedAt: 'asc' },
    });

    for (let i = 0; i < responders.length; i++) {
      // Mark about half present, leave rest unmarked
      if (i % 2 !== 0) continue;
      const m = responders[i];
      await prisma.rollCallResponse.upsert({
        where: {
          rollCallId_memberId: { rollCallId: rollCall.id, memberId: m.id },
        },
        create: {
          rollCallId: rollCall.id,
          memberId: m.id,
          present: true,
          markedById: m.id,
        },
        update: { present: true },
      });
      for (const c of m.companions) {
        await prisma.rollCallCompanionResponse.upsert({
          where: {
            rollCallId_companionId: { rollCallId: rollCall.id, companionId: c.id },
          },
          create: {
            rollCallId: rollCall.id,
            companionId: c.id,
            present: i % 4 === 0,
            markedById: m.id,
          },
          update: { present: i % 4 === 0 },
        });
      }
    }
  }

  walkTargets = newWalkTargets;
  return { kafelaId: kafela.id, adminMemberId: adminMember.id };
}

async function walkSimulatedGps(): Promise<void> {
  if (walkTargets.length === 0) return;

  const chunkSize = 25;
  for (let i = 0; i < walkTargets.length; i += chunkSize) {
    const chunk = walkTargets.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((t) => {
        const pos = offsetAround(t.anchorLat, t.anchorLng, 220);
        return prisma.memberLocation.update({
          where: { memberId: t.memberId },
          data: {
            latitude: pos.lat,
            longitude: pos.lng,
            accuracy: 8 + Math.floor(Math.random() * 18),
            battery: 35 + Math.floor(Math.random() * 60),
          },
        });
      })
    );
  }
}

function startWalkLoop(): void {
  if (walkTimer) return;
  walkTimer = setInterval(() => {
    walkSimulatedGps().catch((err) => {
      logger.warn({ err }, 'Kafela simulator GPS walk failed');
    });
  }, WALK_MS);
  // Unref so the timer does not keep the process alive on its own
  if (typeof walkTimer === 'object' && 'unref' in walkTimer) {
    walkTimer.unref();
  }
}

export function stopKafelaSimulator(): void {
  if (walkTimer) {
    clearInterval(walkTimer);
    walkTimer = null;
  }
  walkTargets = [];
}

/**
 * Seed demo crowd and start GPS walking. No-op when disabled.
 * Safe to call once at server boot.
 */
export async function startKafelaSimulator(): Promise<void> {
  if (!env.KAFELA_SIMULATOR) {
    logger.info('Kafela simulator disabled');
    return;
  }
  if (!env.DATABASE_URL) {
    logger.warn('Kafela simulator skipped: DATABASE_URL not set');
    return;
  }

  try {
    const { kafelaId } = await ensureDemoCrowd();
    startWalkLoop();
    logger.info(
      {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        joinCode: JOIN_CODE,
        kafelaId,
        phones: SIM_COUNT + 1,
        companionsApprox: COMPANION_TARGET,
      },
      'Kafela demo crowd ready — log in with the demo email to test'
    );
  } catch (err) {
    logger.error({ err }, 'Kafela simulator failed to start');
  }
}
