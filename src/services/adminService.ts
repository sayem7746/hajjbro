import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Prisma, UserRole } from '@prisma/client';

// ─── Shared pagination helpers ──────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function normalisePagination(page?: number, limit?: number) {
  const p = Math.max(1, page ?? DEFAULT_PAGE);
  const l = Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
  return { page: p, limit: l, skip: (p - 1) * l };
}

function paginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasMore: page < totalPages };
}

// ─── User Management ────────────────────────────────────────────────────────

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  locale: true,
  emailVerified: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} as const;

export type AdminUserPayload = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export type ListUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'name' | 'email' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
};

export async function listUsers(params: ListUsersParams = {}) {
  const { page, limit, skip } = normalisePagination(params.page, params.limit);

  const where: Prisma.UserWhereInput = {};
  if (params.role) where.role = params.role;
  if (params.isActive !== undefined) where.isActive = params.isActive;
  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: 'insensitive' } },
      { name: { contains: params.search, mode: 'insensitive' } },
      { phone: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.UserOrderByWithRelationInput = {
    [params.sortBy ?? 'createdAt']: params.sortOrder ?? 'desc',
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, skip, take: limit, orderBy }),
    prisma.user.count({ where }),
  ]);

  return { data: users, pagination: paginationMeta(total, page, limit) };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...userSelect,
      _count: {
        select: {
          contacts: true,
          ritualProgress: true,
          checklists: true,
          notifications: true,
        },
      },
    },
  });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export type AdminUserUpdateInput = {
  name?: string;
  phone?: string | null;
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  locale?: string | null;
};

export async function updateUser(id: string, data: AdminUserUpdateInput) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'User not found');

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.emailVerified !== undefined && { emailVerified: data.emailVerified }),
      ...(data.locale !== undefined && { locale: data.locale }),
    },
    select: userSelect,
  });
}

export async function deleteUser(id: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'User not found');
  await prisma.user.delete({ where: { id } });
}

// ─── Ritual Management (with pagination + filtering) ────────────────────────

const ritualSelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAr: true,
  description: true,
  order: true,
  dayOfHajj: true,
  isRequired: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ListRitualsParams = {
  page?: number;
  limit?: number;
  search?: string;
  dayOfHajj?: number;
  isRequired?: boolean;
  sortBy?: 'order' | 'createdAt' | 'nameEn';
  sortOrder?: 'asc' | 'desc';
};

export async function listRituals(params: ListRitualsParams = {}) {
  const { page, limit, skip } = normalisePagination(params.page, params.limit);

  const where: Prisma.RitualWhereInput = {};
  if (params.dayOfHajj !== undefined) where.dayOfHajj = params.dayOfHajj;
  if (params.isRequired !== undefined) where.isRequired = params.isRequired;
  if (params.search) {
    where.OR = [
      { nameEn: { contains: params.search, mode: 'insensitive' } },
      { nameAr: { contains: params.search, mode: 'insensitive' } },
      { slug: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.RitualOrderByWithRelationInput = {
    [params.sortBy ?? 'order']: params.sortOrder ?? 'asc',
  };

  const [rituals, total] = await Promise.all([
    prisma.ritual.findMany({
      where,
      select: { ...ritualSelect, _count: { select: { duas: true, userProgress: true } } },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.ritual.count({ where }),
  ]);

  return { data: rituals, pagination: paginationMeta(total, page, limit) };
}

export async function getRitualById(id: string) {
  const ritual = await prisma.ritual.findUnique({
    where: { id },
    select: {
      ...ritualSelect,
      duas: { select: { id: true, slug: true, titleEn: true, titleAr: true, order: true }, orderBy: { order: 'asc' } },
      _count: { select: { userProgress: true } },
    },
  });
  if (!ritual) throw new AppError(404, 'Ritual not found');
  return ritual;
}

export type RitualCreateInput = {
  slug: string;
  nameEn: string;
  nameAr?: string | null;
  description?: string | null;
  order?: number;
  dayOfHajj?: number | null;
  isRequired?: boolean;
};

export async function createRitual(data: RitualCreateInput) {
  const existing = await prisma.ritual.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError(409, `Ritual with slug "${data.slug}" already exists`);

  return prisma.ritual.create({
    data: {
      slug: data.slug,
      nameEn: data.nameEn,
      nameAr: data.nameAr ?? null,
      description: data.description ?? null,
      order: data.order ?? 0,
      dayOfHajj: data.dayOfHajj ?? null,
      isRequired: data.isRequired ?? true,
    },
    select: ritualSelect,
  });
}

export async function updateRitual(id: string, data: Partial<RitualCreateInput>) {
  const existing = await prisma.ritual.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Ritual not found');

  if (data.slug != null && data.slug !== existing.slug) {
    const bySlug = await prisma.ritual.findUnique({ where: { slug: data.slug } });
    if (bySlug) throw new AppError(409, `Ritual with slug "${data.slug}" already exists`);
  }

  return prisma.ritual.update({
    where: { id },
    data: {
      ...(data.slug != null && { slug: data.slug }),
      ...(data.nameEn != null && { nameEn: data.nameEn }),
      ...(data.nameAr !== undefined && { nameAr: data.nameAr }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.dayOfHajj !== undefined && { dayOfHajj: data.dayOfHajj }),
      ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
    },
    select: ritualSelect,
  });
}

export async function deleteRitual(id: string) {
  const existing = await prisma.ritual.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Ritual not found');
  await prisma.ritual.delete({ where: { id } });
}

// ─── Dua Management (with pagination + filtering) ───────────────────────────

const duaSelect = {
  id: true,
  slug: true,
  ritualId: true,
  titleEn: true,
  titleAr: true,
  textAr: true,
  textEn: true,
  transliteration: true,
  source: true,
  order: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ListDuasParams = {
  page?: number;
  limit?: number;
  search?: string;
  ritualId?: string;
  sortBy?: 'order' | 'createdAt' | 'titleEn';
  sortOrder?: 'asc' | 'desc';
};

export async function listDuas(params: ListDuasParams = {}) {
  const { page, limit, skip } = normalisePagination(params.page, params.limit);

  const where: Prisma.DuaWhereInput = {};
  if (params.ritualId) where.ritualId = params.ritualId;
  if (params.search) {
    where.OR = [
      { titleEn: { contains: params.search, mode: 'insensitive' } },
      { titleAr: { contains: params.search, mode: 'insensitive' } },
      { slug: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.DuaOrderByWithRelationInput = {
    [params.sortBy ?? 'order']: params.sortOrder ?? 'asc',
  };

  const [duas, total] = await Promise.all([
    prisma.dua.findMany({
      where,
      select: { ...duaSelect, ritual: { select: { id: true, nameEn: true, slug: true } } },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.dua.count({ where }),
  ]);

  return { data: duas, pagination: paginationMeta(total, page, limit) };
}

export async function getDuaById(id: string) {
  const dua = await prisma.dua.findUnique({
    where: { id },
    select: { ...duaSelect, ritual: { select: { id: true, nameEn: true, slug: true } } },
  });
  if (!dua) throw new AppError(404, 'Dua not found');
  return dua;
}

export type DuaCreateInput = {
  slug?: string | null;
  ritualId?: string | null;
  titleEn?: string | null;
  titleAr?: string | null;
  textAr: string;
  textEn?: string | null;
  transliteration?: string | null;
  source?: string | null;
  order?: number;
};

export async function createDua(data: DuaCreateInput) {
  if (data.slug) {
    const existing = await prisma.dua.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError(409, `Dua with slug "${data.slug}" already exists`);
  }
  if (data.ritualId) {
    const ritual = await prisma.ritual.findUnique({ where: { id: data.ritualId } });
    if (!ritual) throw new AppError(404, 'Referenced ritual not found');
  }

  return prisma.dua.create({ data: { ...data, order: data.order ?? 0 }, select: duaSelect });
}

export async function updateDua(id: string, data: Partial<DuaCreateInput>) {
  const existing = await prisma.dua.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Dua not found');

  if (data.slug != null && data.slug !== existing.slug) {
    const bySlug = await prisma.dua.findUnique({ where: { slug: data.slug } });
    if (bySlug) throw new AppError(409, `Dua with slug "${data.slug}" already exists`);
  }
  if (data.ritualId) {
    const ritual = await prisma.ritual.findUnique({ where: { id: data.ritualId } });
    if (!ritual) throw new AppError(404, 'Referenced ritual not found');
  }

  return prisma.dua.update({
    where: { id },
    data: {
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.ritualId !== undefined && { ritualId: data.ritualId }),
      ...(data.titleEn !== undefined && { titleEn: data.titleEn }),
      ...(data.titleAr !== undefined && { titleAr: data.titleAr }),
      ...(data.textAr != null && { textAr: data.textAr }),
      ...(data.textEn !== undefined && { textEn: data.textEn }),
      ...(data.transliteration !== undefined && { transliteration: data.transliteration }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.order !== undefined && { order: data.order }),
    },
    select: duaSelect,
  });
}

export async function deleteDua(id: string) {
  const existing = await prisma.dua.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Dua not found');
  await prisma.dua.delete({ where: { id } });
}

// ─── Location Management ────────────────────────────────────────────────────

const locationSelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAr: true,
  description: true,
  latitude: true,
  longitude: true,
  type: true,
  address: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ListLocationsParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  sortBy?: 'nameEn' | 'createdAt' | 'type';
  sortOrder?: 'asc' | 'desc';
};

export async function listLocations(params: ListLocationsParams = {}) {
  const { page, limit, skip } = normalisePagination(params.page, params.limit);

  const where: Prisma.LocationWhereInput = {};
  if (params.type) where.type = params.type;
  if (params.search) {
    where.OR = [
      { nameEn: { contains: params.search, mode: 'insensitive' } },
      { nameAr: { contains: params.search, mode: 'insensitive' } },
      { slug: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.LocationOrderByWithRelationInput = {
    [params.sortBy ?? 'nameEn']: params.sortOrder ?? 'asc',
  };

  const [locations, total] = await Promise.all([
    prisma.location.findMany({
      where,
      select: { ...locationSelect, _count: { select: { prayerTimes: true } } },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.location.count({ where }),
  ]);

  return { data: locations, pagination: paginationMeta(total, page, limit) };
}

export async function getLocationById(id: string) {
  const location = await prisma.location.findUnique({
    where: { id },
    select: { ...locationSelect, _count: { select: { prayerTimes: true } } },
  });
  if (!location) throw new AppError(404, 'Location not found');
  return location;
}

export type LocationCreateInput = {
  slug: string;
  nameEn: string;
  nameAr?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  address?: string | null;
};

export async function createLocation(data: LocationCreateInput) {
  const existing = await prisma.location.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError(409, `Location with slug "${data.slug}" already exists`);

  return prisma.location.create({
    data: {
      slug: data.slug,
      nameEn: data.nameEn,
      nameAr: data.nameAr ?? null,
      description: data.description ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      type: data.type,
      address: data.address ?? null,
    },
    select: locationSelect,
  });
}

export async function updateLocation(id: string, data: Partial<LocationCreateInput>) {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Location not found');

  if (data.slug != null && data.slug !== existing.slug) {
    const bySlug = await prisma.location.findUnique({ where: { slug: data.slug } });
    if (bySlug) throw new AppError(409, `Location with slug "${data.slug}" already exists`);
  }

  return prisma.location.update({
    where: { id },
    data: {
      ...(data.slug != null && { slug: data.slug }),
      ...(data.nameEn != null && { nameEn: data.nameEn }),
      ...(data.nameAr !== undefined && { nameAr: data.nameAr }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.type != null && { type: data.type }),
      ...(data.address !== undefined && { address: data.address }),
    },
    select: locationSelect,
  });
}

export async function deleteLocation(id: string) {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Location not found');
  await prisma.location.delete({ where: { id } });
}

// ─── Contact Management ─────────────────────────────────────────────────────

const contactSelect = {
  id: true,
  userId: true,
  name: true,
  phone: true,
  relationship: true,
  isPrimary: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ListContactsParams = {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  relationship?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export async function listContacts(params: ListContactsParams = {}) {
  const { page, limit, skip } = normalisePagination(params.page, params.limit);

  const where: Prisma.ContactWhereInput = {};
  if (params.userId) where.userId = params.userId;
  if (params.relationship) where.relationship = params.relationship;
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { phone: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.ContactOrderByWithRelationInput = {
    [params.sortBy ?? 'createdAt']: params.sortOrder ?? 'desc',
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: { ...contactSelect, user: { select: { id: true, name: true, email: true } } },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.contact.count({ where }),
  ]);

  return { data: contacts, pagination: paginationMeta(total, page, limit) };
}

export async function getContactById(id: string) {
  const contact = await prisma.contact.findUnique({
    where: { id },
    select: { ...contactSelect, user: { select: { id: true, name: true, email: true } } },
  });
  if (!contact) throw new AppError(404, 'Contact not found');
  return contact;
}

export type ContactUpdateInput = {
  name?: string;
  phone?: string;
  relationship?: string | null;
  isPrimary?: boolean;
};

export async function updateContact(id: string, data: ContactUpdateInput) {
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Contact not found');

  return prisma.contact.update({
    where: { id },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.phone != null && { phone: data.phone }),
      ...(data.relationship !== undefined && { relationship: data.relationship }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
    },
    select: contactSelect,
  });
}

export async function deleteContact(id: string) {
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Contact not found');
  await prisma.contact.delete({ where: { id } });
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export async function getAnalytics() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsersLast7Days,
    totalRituals,
    completedRitualProgress,
    totalDuas,
    totalLocations,
    totalContacts,
    usersByRole,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.ritual.count(),
    prisma.userRitualProgress.count({ where: { status: 'completed' } }),
    prisma.dua.count(),
    prisma.location.count(),
    prisma.contact.count(),
    prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ]);

  const roleBreakdown = Object.fromEntries(
    usersByRole.map((r) => [r.role, r._count.id])
  );

  return {
    users: {
      total: totalUsers,
      activeLastSevenDays: activeUsersLast7Days,
      newLastSevenDays: recentSignups,
      byRole: roleBreakdown,
    },
    content: {
      totalRituals,
      totalDuas,
      totalLocations,
      totalContacts,
    },
    progress: {
      completedRituals: completedRitualProgress,
    },
  };
}
