import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Prisma } from '@prisma/client';

// ─── Selects & types ─────────────────────────────────────────────────────────

const checklistSelect = {
  id: true,
  slug: true,
  titleEn: true,
  titleAr: true,
  description: true,
  category: true,
  order: true,
  isRequired: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ChecklistPayload = Prisma.ChecklistGetPayload<{ select: typeof checklistSelect }>;

export type ChecklistCreateInput = {
  slug: string;
  titleEn: string;
  titleAr?: string | null;
  description?: string | null;
  category: string;
  order?: number;
  isRequired?: boolean;
};

export type ChecklistUpdateInput = Partial<ChecklistCreateInput>;

const userChecklistSelect = {
  id: true,
  checklistId: true,
  completed: true,
  completedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Single checklist item with optional user completion (for "my" list). */
export type ChecklistItemWithUserProgress = ChecklistPayload & {
  userChecklist: Array<{
    id: string;
    checklistId: string;
    completed: boolean;
    completedAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

/** Grouped by category for API response. */
export type ChecklistByCategory = {
  category: string;
  items: (ChecklistItemWithUserProgress & { completed: boolean; completedAt: Date | null; notes: string | null })[];
};

export type ChecklistProgressSummary = {
  totalItems: number;
  completedCount: number;
  completionPercentage: number;
  byCategory: Array<{
    category: string;
    total: number;
    completed: number;
    percentage: number;
  }>;
};

// ─── Admin CRUD ─────────────────────────────────────────────────────────────

export async function listChecklistsAdmin(): Promise<ChecklistPayload[]> {
  return prisma.checklist.findMany({
    select: checklistSelect,
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  });
}

export async function getChecklistById(id: string): Promise<ChecklistPayload | null> {
  return prisma.checklist.findUnique({
    where: { id },
    select: checklistSelect,
  });
}

export async function createChecklist(data: ChecklistCreateInput): Promise<ChecklistPayload> {
  const existing = await prisma.checklist.findUnique({ where: { slug: data.slug } });
  if (existing) {
    throw new AppError(409, `Checklist item with slug "${data.slug}" already exists`);
  }
  return prisma.checklist.create({
    data: {
      slug: data.slug,
      titleEn: data.titleEn,
      titleAr: data.titleAr ?? null,
      description: data.description ?? null,
      category: data.category,
      order: data.order ?? 0,
      isRequired: data.isRequired ?? false,
    },
    select: checklistSelect,
  });
}

export async function updateChecklist(id: string, data: ChecklistUpdateInput): Promise<ChecklistPayload> {
  const existing = await prisma.checklist.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Checklist item not found');
  }
  if (data.slug != null && data.slug !== existing.slug) {
    const bySlug = await prisma.checklist.findUnique({ where: { slug: data.slug } });
    if (bySlug) {
      throw new AppError(409, `Checklist item with slug "${data.slug}" already exists`);
    }
  }
  return prisma.checklist.update({
    where: { id },
    data: {
      ...(data.slug != null && { slug: data.slug }),
      ...(data.titleEn != null && { titleEn: data.titleEn }),
      ...(data.titleAr !== undefined && { titleAr: data.titleAr }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category != null && { category: data.category }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
    },
    select: checklistSelect,
  });
}

export async function deleteChecklist(id: string): Promise<void> {
  const existing = await prisma.checklist.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Checklist item not found');
  }
  await prisma.checklist.delete({ where: { id } });
}

// ─── User: list with completion (grouped by category) ───────────────────────

/**
 * Public template: all checklist items grouped by category (no user completion).
 * Single query, ordered by category and order.
 */
export async function listChecklistTemplateGrouped(): Promise<
  Array<{ category: string; items: ChecklistPayload[] }>
> {
  const items = await prisma.checklist.findMany({
    select: checklistSelect,
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  });
  const byCategory = new Map<string, ChecklistPayload[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  return Array.from(byCategory.entries()).map(([category, itemsList]) => ({ category, items: itemsList }));
}

/**
 * Single optimized query: all checklists with user's completion for the given userId.
 * Returns items grouped by category with completed/completedAt/notes per item.
 */
export async function listMyChecklistGroupedByCategory(
  userId: string
): Promise<ChecklistByCategory[]> {
  const items = await prisma.checklist.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
    select: {
      ...checklistSelect,
      userChecklists: {
        where: { userId },
        select: userChecklistSelect,
      },
    },
  });

  const withProgress = items.map((item) => {
    const uc = item.userChecklists[0];
    return {
      ...item,
      userChecklist: item.userChecklists,
      completed: uc?.completed ?? false,
      completedAt: uc?.completedAt ?? null,
      notes: uc?.notes ?? null,
    };
  });

  const byCategory = new Map<string, typeof withProgress>();
  for (const row of withProgress) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  return Array.from(byCategory.entries()).map(([category, itemsList]) => ({
    category,
    items: itemsList,
  }));
}

// ─── User: mark item done ───────────────────────────────────────────────────

/**
 * Mark a checklist item as done (or undo). Idempotent; uses upsert on (userId, checklistId).
 */
export async function markChecklistItemDone(
  userId: string,
  checklistId: string,
  done: boolean,
  notes?: string | null
): Promise<{
  id: string;
  checklistId: string;
  completed: boolean;
  completedAt: Date | null;
  notes: string | null;
  checklist: ChecklistPayload;
}> {
  const checklist = await prisma.checklist.findUnique({ where: { id: checklistId } });
  if (!checklist) {
    throw new AppError(404, 'Checklist item not found');
  }

  const now = new Date();
  const userChecklist = await prisma.userChecklist.upsert({
    where: {
      userId_checklistId: { userId, checklistId },
    },
    create: {
      userId,
      checklistId,
      completed: done,
      completedAt: done ? now : null,
      notes: notes ?? null,
    },
    update: {
      completed: done,
      completedAt: done ? now : null,
      ...(notes !== undefined && { notes }),
    },
    select: {
      id: true,
      checklistId: true,
      completed: true,
      completedAt: true,
      notes: true,
      checklist: { select: checklistSelect },
    },
  });

  return {
    id: userChecklist.id,
    checklistId: userChecklist.checklistId,
    completed: userChecklist.completed,
    completedAt: userChecklist.completedAt,
    notes: userChecklist.notes,
    checklist: userChecklist.checklist,
  };
}

// ─── User: progress summary ─────────────────────────────────────────────────

/**
 * Progress summary: total, completed count, percentage, and per-category breakdown.
 * Uses one query for all checklists with user completion, then aggregates in memory.
 */
export async function getChecklistProgressSummary(userId: string): Promise<ChecklistProgressSummary> {
  const items = await prisma.checklist.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
    select: {
      id: true,
      category: true,
      userChecklists: {
        where: { userId },
        select: { completed: true },
      },
    },
  });

  let completedCount = 0;
  const categoryCounts = new Map<string, { total: number; completed: number }>();

  for (const item of items) {
    const completed = item.userChecklists[0]?.completed ?? false;
    if (completed) completedCount++;
    const cat = categoryCounts.get(item.category) ?? { total: 0, completed: 0 };
    cat.total += 1;
    if (completed) cat.completed += 1;
    categoryCounts.set(item.category, cat);
  }

  const totalItems = items.length;
  const completionPercentage = totalItems === 0 ? 0 : Math.round((completedCount / totalItems) * 100);

  const byCategory = Array.from(categoryCounts.entries()).map(([category, { total, completed }]) => ({
    category,
    total,
    completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  }));

  return {
    totalItems,
    completedCount,
    completionPercentage,
    byCategory,
  };
}
