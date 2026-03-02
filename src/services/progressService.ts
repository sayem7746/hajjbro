import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const PROGRESS_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

const ritualProgressSelect = {
  id: true,
  ritualId: true,
  status: true,
  completedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  ritual: {
    select: {
      id: true,
      slug: true,
      nameEn: true,
      nameAr: true,
      order: true,
      dayOfHajj: true,
      isRequired: true,
    },
  },
} as const;

export type RitualProgressWithRitual = {
  id: string;
  ritualId: string;
  status: string;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  ritual: {
    id: string;
    slug: string;
    nameEn: string;
    nameAr: string | null;
    order: number;
    dayOfHajj: number | null;
    isRequired: boolean;
  };
};

/**
 * Mark a ritual as complete for the user. Idempotent: if already completed,
 * returns existing row (no duplicate due to unique on userId + ritualId).
 */
export async function markRitualComplete(
  userId: string,
  ritualId: string,
  notes?: string | null
): Promise<RitualProgressWithRitual> {
  const ritual = await prisma.ritual.findUnique({ where: { id: ritualId } });
  if (!ritual) {
    throw new AppError(404, 'Ritual not found');
  }

  const existing = await prisma.userRitualProgress.findUnique({
    where: {
      userId_ritualId: { userId, ritualId },
    },
    select: ritualProgressSelect,
  });

  if (existing?.status === PROGRESS_STATUS.COMPLETED) {
    return existing as RitualProgressWithRitual;
  }

  const now = new Date();
  const updated = await prisma.userRitualProgress.upsert({
    where: {
      userId_ritualId: { userId, ritualId },
    },
    create: {
      userId,
      ritualId,
      status: PROGRESS_STATUS.COMPLETED,
      completedAt: now,
      notes: notes ?? null,
    },
    update: {
      status: PROGRESS_STATUS.COMPLETED,
      completedAt: now,
      ...(notes !== undefined && { notes }),
    },
    select: ritualProgressSelect,
  });

  return updated as RitualProgressWithRitual;
}

/**
 * List all ritual progress for the user with ritual details. Single efficient query.
 */
export async function getMyRitualProgress(userId: string): Promise<RitualProgressWithRitual[]> {
  const rows = await prisma.userRitualProgress.findMany({
    where: { userId },
    orderBy: { ritual: { order: 'asc' } },
    select: ritualProgressSelect,
  });
  return rows as RitualProgressWithRitual[];
}

/**
 * Get completion percentage: (completed rituals / total rituals) * 100.
 * Uses efficient relational queries (single count for total, one for completed).
 */
export async function getCompletionPercentage(userId: string): Promise<number> {
  const [totalRituals, completedCount] = await Promise.all([
    prisma.ritual.count(),
    prisma.userRitualProgress.count({
      where: {
        userId,
        status: PROGRESS_STATUS.COMPLETED,
      },
    }),
  ]);

  if (totalRituals === 0) return 0;
  return Math.round((completedCount / totalRituals) * 100);
}

export type ProgressSummary = {
  completionPercentage: number;
  totalRituals: number;
  completedCount: number;
  progress: RitualProgressWithRitual[];
};

/**
 * Summary endpoint: completion percentage plus full progress list in one efficient flow.
 * Single query for progress with ritual relation; one count for total rituals.
 */
export async function getProgressSummary(userId: string): Promise<ProgressSummary> {
  const [progress, totalRituals, completedCount] = await Promise.all([
    prisma.userRitualProgress.findMany({
      where: { userId },
      orderBy: { ritual: { order: 'asc' } },
      select: ritualProgressSelect,
    }),
    prisma.ritual.count(),
    prisma.userRitualProgress.count({
      where: { userId, status: PROGRESS_STATUS.COMPLETED },
    }),
  ]);

  const completionPercentage = totalRituals === 0 ? 0 : Math.round((completedCount / totalRituals) * 100);

  return {
    completionPercentage,
    totalRituals,
    completedCount,
    progress: progress as RitualProgressWithRitual[],
  };
}
