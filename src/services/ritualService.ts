import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Prisma } from '@prisma/client';

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

export type RitualPayload = Prisma.RitualGetPayload<{ select: typeof ritualSelect }>;

export type RitualCreateInput = {
  slug: string;
  nameEn: string;
  nameAr?: string | null;
  description?: string | null;
  order?: number;
  dayOfHajj?: number | null;
  isRequired?: boolean;
};

export type RitualUpdateInput = Partial<RitualCreateInput>;

export async function listRitualsAdmin(): Promise<RitualPayload[]> {
  return prisma.ritual.findMany({
    select: ritualSelect,
    orderBy: { order: 'asc' },
  });
}

export async function getRitualById(id: string): Promise<RitualPayload | null> {
  return prisma.ritual.findUnique({
    where: { id },
    select: ritualSelect,
  });
}

export async function getRitualBySlug(slug: string): Promise<RitualPayload | null> {
  return prisma.ritual.findUnique({
    where: { slug },
    select: ritualSelect,
  });
}

export async function createRitual(data: RitualCreateInput): Promise<RitualPayload> {
  const existing = await prisma.ritual.findUnique({ where: { slug: data.slug } });
  if (existing) {
    throw new AppError(409, `Ritual with slug "${data.slug}" already exists`);
  }
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

export async function updateRitual(id: string, data: RitualUpdateInput): Promise<RitualPayload> {
  const existing = await prisma.ritual.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Ritual not found');
  }
  if (data.slug != null && data.slug !== existing.slug) {
    const bySlug = await prisma.ritual.findUnique({ where: { slug: data.slug } });
    if (bySlug) {
      throw new AppError(409, `Ritual with slug "${data.slug}" already exists`);
    }
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

export async function deleteRitual(id: string): Promise<void> {
  const existing = await prisma.ritual.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Ritual not found');
  }
  await prisma.ritual.delete({ where: { id } });
}

export async function reorderRituals(orderedIds: string[]): Promise<RitualPayload[]> {
  const updates = orderedIds.map((id, index) =>
    prisma.ritual.update({
      where: { id },
      data: { order: index },
      select: ritualSelect,
    })
  );
  const results = await prisma.$transaction(updates);
  return results.sort((a, b) => a.order - b.order);
}

// ─── Public API (paginated, with duas, language-aware) ───────────────────────

export type PublicRitualWithDuas = RitualPayload & {
  duas: Array<{
    id: string;
    slug: string | null;
    ritualId: string | null;
    titleEn: string | null;
    titleAr: string | null;
    textAr: string;
    textEn: string | null;
    transliteration: string | null;
    source: string | null;
    order: number;
  }>;
};

export type ListRitualsPublicParams = {
  page?: number;
  limit?: number;
  lang?: 'en' | 'ar';
};

export type ListRitualsPublicResult = {
  data: PublicRitualWithDuas[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function listRitualsPublic(
  params: ListRitualsPublicParams = {}
): Promise<ListRitualsPublicResult> {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const [rituals, total] = await Promise.all([
    prisma.ritual.findMany({
      skip,
      take: limit,
      orderBy: { order: 'asc' },
      include: {
        duas: {
          orderBy: { order: 'asc' },
          select: {
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
          },
        },
      },
    }),
    prisma.ritual.count(),
  ]);

  const data = rituals as PublicRitualWithDuas[];
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}
