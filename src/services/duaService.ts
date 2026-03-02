import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Prisma } from '@prisma/client';

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

export type DuaPayload = Prisma.DuaGetPayload<{ select: typeof duaSelect }>;

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

export type DuaUpdateInput = Partial<DuaCreateInput>;

export async function listDuasAdmin(filters?: { ritualId?: string | null }): Promise<DuaPayload[]> {
  return prisma.dua.findMany({
    where: filters?.ritualId != null ? { ritualId: filters.ritualId } : undefined,
    select: duaSelect,
    orderBy: [{ ritualId: 'asc' }, { order: 'asc' }],
  });
}

export async function getDuaById(id: string): Promise<DuaPayload | null> {
  return prisma.dua.findUnique({
    where: { id },
    select: duaSelect,
  });
}

export async function getDuaBySlug(slug: string): Promise<DuaPayload | null> {
  return prisma.dua.findUnique({
    where: { slug },
    select: duaSelect,
  });
}

export async function createDua(data: DuaCreateInput): Promise<DuaPayload> {
  if (data.slug) {
    const existing = await prisma.dua.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new AppError(409, `Dua with slug "${data.slug}" already exists`);
    }
  }
  if (data.ritualId) {
    const ritual = await prisma.ritual.findUnique({ where: { id: data.ritualId } });
    if (!ritual) {
      throw new AppError(400, 'Ritual not found');
    }
  }
  return prisma.dua.create({
    data: {
      slug: data.slug ?? null,
      ritualId: data.ritualId ?? null,
      titleEn: data.titleEn ?? null,
      titleAr: data.titleAr ?? null,
      textAr: data.textAr,
      textEn: data.textEn ?? null,
      transliteration: data.transliteration ?? null,
      source: data.source ?? null,
      order: data.order ?? 0,
    },
    select: duaSelect,
  });
}

export async function updateDua(id: string, data: DuaUpdateInput): Promise<DuaPayload> {
  const existing = await prisma.dua.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Dua not found');
  }
  if (data.slug != null && data.slug !== existing.slug) {
    const bySlug = await prisma.dua.findUnique({ where: { slug: data.slug } });
    if (bySlug) {
      throw new AppError(409, `Dua with slug "${data.slug}" already exists`);
    }
  }
  if (data.ritualId !== undefined && data.ritualId != null) {
    const ritual = await prisma.ritual.findUnique({ where: { id: data.ritualId } });
    if (!ritual) {
      throw new AppError(400, 'Ritual not found');
    }
  }
  return prisma.dua.update({
    where: { id },
    data: {
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.ritualId !== undefined && { ritualId: data.ritualId }),
      ...(data.titleEn !== undefined && { titleEn: data.titleEn }),
      ...(data.titleAr !== undefined && { titleAr: data.titleAr }),
      ...(data.textAr !== undefined && { textAr: data.textAr }),
      ...(data.textEn !== undefined && { textEn: data.textEn }),
      ...(data.transliteration !== undefined && { transliteration: data.transliteration }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.order !== undefined && { order: data.order }),
    },
    select: duaSelect,
  });
}

export async function deleteDua(id: string): Promise<void> {
  const existing = await prisma.dua.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Dua not found');
  }
  await prisma.dua.delete({ where: { id } });
}

export async function reorderDuas(ritualId: string, orderedIds: string[]): Promise<DuaPayload[]> {
  const duas = await prisma.dua.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, ritualId: true },
  });
  const invalid = duas.filter((d) => d.ritualId !== ritualId);
  if (invalid.length > 0) {
    throw new AppError(400, 'All duas must belong to the specified ritual');
  }
  const updates = orderedIds.map((id, index) =>
    prisma.dua.update({
      where: { id },
      data: { order: index },
      select: duaSelect,
    })
  );
  return prisma.$transaction(updates);
}
