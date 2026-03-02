/**
 * Notification scheduling: persist scheduled notifications, dispatch via cron,
 * update sent status, and retry on failure.
 */
import prisma from '../lib/prisma.js';
import { Prisma, ScheduledNotificationStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { sendPushNotification } from './firebase.js';

const DEFAULT_MAX_RETRIES = 3;
/** Base delay in ms for retry backoff (exponential: base * 2^retryCount). */
const RETRY_BASE_MS = 2 * 60 * 1000;

export type CreateScheduledNotificationInput = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string> | string | null;
  scheduledAt: Date;
  maxRetries?: number;
};

export async function createScheduledNotification(
  input: CreateScheduledNotificationInput
): Promise<{ id: string; scheduledAt: Date; status: ScheduledNotificationStatus }> {
  const dataStr =
    input.data == null
      ? null
      : typeof input.data === 'string'
        ? input.data
        : JSON.stringify(input.data);

  const row = await prisma.scheduledNotification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      data: dataStr,
      scheduledAt: input.scheduledAt,
      maxRetries: input.maxRetries ?? DEFAULT_MAX_RETRIES,
    },
    select: { id: true, scheduledAt: true, status: true },
  });
  logger.debug({ id: row.id, userId: input.userId, scheduledAt: row.scheduledAt }, 'Scheduled notification created');
  return row;
}

/**
 * Fetch scheduled notifications that are due (pending and scheduledAt <= now).
 * Orders by scheduledAt ascending and limits to avoid overload.
 */
const DISPATCH_BATCH_SIZE = 100;

export async function getDueScheduledNotifications(): Promise<
  Array<{
    id: string;
    userId: string;
    title: string;
    body: string;
    data: string | null;
    retryCount: number;
    maxRetries: number;
    user: { fcmToken: string | null };
  }>
> {
  const now = new Date();
  const rows = await prisma.scheduledNotification.findMany({
    where: {
      status: ScheduledNotificationStatus.pending,
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    take: DISPATCH_BATCH_SIZE,
    select: {
      id: true,
      userId: true,
      title: true,
      body: true,
      data: true,
      retryCount: true,
      maxRetries: true,
      user: { select: { fcmToken: true } },
    },
  });
  return rows as Array<{
    id: string;
    userId: string;
    title: string;
    body: string;
    data: string | null;
    retryCount: number;
    maxRetries: number;
    user: { fcmToken: string | null };
  }>;
}

/** Mark as sent and optionally create in-app Notification record. */
export async function markScheduledNotificationSent(
  id: string,
  options?: { createInAppNotification?: boolean }
): Promise<void> {
  const now = new Date();
  const update: Prisma.ScheduledNotificationUpdateInput = {
    status: ScheduledNotificationStatus.sent,
    sentAt: now,
    lastAttemptAt: now,
    lastError: null,
  };

  if (options?.createInAppNotification) {
    const scheduled = await prisma.scheduledNotification.findUnique({
      where: { id },
      select: { userId: true, title: true, body: true, data: true },
    });
    if (scheduled) {
      await prisma.$transaction([
        prisma.scheduledNotification.update({ where: { id }, data: update }),
        prisma.notification.create({
          data: {
            userId: scheduled.userId,
            title: scheduled.title,
            body: scheduled.body,
            data: scheduled.data,
            read: false,
            sentAt: now,
          },
        }),
      ]);
      return;
    }
  }

  await prisma.scheduledNotification.update({ where: { id }, data: update });
}

/** Mark as failed (e.g. no FCM token or max retries exceeded). */
export async function markScheduledNotificationFailed(id: string, error: string): Promise<void> {
  await prisma.scheduledNotification.update({
    where: { id },
    data: {
      status: ScheduledNotificationStatus.failed,
      lastAttemptAt: new Date(),
      lastError: error.slice(0, 2000),
    },
  });
  logger.warn({ scheduledNotificationId: id, error }, 'Scheduled notification marked failed');
}

/**
 * Schedule next retry: increment retryCount, set lastAttemptAt/lastError,
 * and set scheduledAt to now + backoff. If retryCount >= maxRetries, mark as failed.
 */
export async function scheduleRetry(id: string, error: string): Promise<{ retryScheduled: boolean }> {
  const row = await prisma.scheduledNotification.findUnique({
    where: { id },
    select: { retryCount: true, maxRetries: true },
  });
  if (!row) return { retryScheduled: false };

  const nextRetryCount = row.retryCount + 1;
  if (nextRetryCount > row.maxRetries) {
    await markScheduledNotificationFailed(id, `Max retries exceeded. Last error: ${error}`);
    return { retryScheduled: false };
  }

  const backoffMs = RETRY_BASE_MS * Math.pow(2, row.retryCount);
  const nextScheduledAt = new Date(Date.now() + backoffMs);

  await prisma.scheduledNotification.update({
    where: { id },
    data: {
      retryCount: nextRetryCount,
      lastAttemptAt: new Date(),
      lastError: error.slice(0, 2000),
      scheduledAt: nextScheduledAt,
    },
  });
  logger.info(
    { scheduledNotificationId: id, retryCount: nextRetryCount, nextScheduledAt },
    'Scheduled notification retry scheduled'
  );
  return { retryScheduled: true };
}

/** List scheduled notifications for a user (optional status filter). */
export async function getUserScheduledNotifications(
  userId: string,
  options?: { status?: ScheduledNotificationStatus }
): Promise<
  Array<{
    id: string;
    title: string;
    body: string;
    data: string | null;
    scheduledAt: Date;
    status: ScheduledNotificationStatus;
    sentAt: Date | null;
    retryCount: number;
    maxRetries: number;
    lastError: string | null;
    createdAt: Date;
  }>
> {
  const where: Prisma.ScheduledNotificationWhereInput = { userId };
  if (options?.status) where.status = options.status;

  const rows = await prisma.scheduledNotification.findMany({
    where,
    orderBy: [{ status: 'asc' }, { scheduledAt: 'desc' }],
    select: {
      id: true,
      title: true,
      body: true,
      data: true,
      scheduledAt: true,
      status: true,
      sentAt: true,
      retryCount: true,
      maxRetries: true,
      lastError: true,
      createdAt: true,
    },
  });
  return rows;
}

/** Cancel a pending scheduled notification (returns false if not found or not pending). */
export async function cancelScheduledNotification(id: string, userId: string): Promise<boolean> {
  const result = await prisma.scheduledNotification.updateMany({
    where: { id, userId, status: ScheduledNotificationStatus.pending },
    data: { status: ScheduledNotificationStatus.failed, lastError: 'Cancelled by user' },
  });
  return result.count > 0;
}

/**
 * Parse stored data JSON into FCM-friendly Record<string, string>.
 * FCM requires all data values to be strings.
 */
function dataToFcmPayload(data: string | null): Record<string, string> | undefined {
  if (!data) return undefined;
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      out[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Cron dispatcher: fetch due scheduled notifications, send via FCM,
 * update sent status or schedule retry on failure.
 */
export async function dispatchScheduledNotifications(): Promise<{
  sent: number;
  failed: number;
  retried: number;
}> {
  const due = await getDueScheduledNotifications();
  let sent = 0;
  let failed = 0;
  let retried = 0;

  for (const row of due) {
    const fcmToken = row.user?.fcmToken ?? null;
    if (!fcmToken) {
      await markScheduledNotificationFailed(row.id, 'User has no FCM token');
      failed++;
      continue;
    }

    const dataPayload = dataToFcmPayload(row.data);
    const success = await sendPushNotification(
      fcmToken,
      row.title,
      row.body,
      dataPayload
    );

    if (success) {
      await markScheduledNotificationSent(row.id, { createInAppNotification: true });
      sent++;
    } else {
      const { retryScheduled } = await scheduleRetry(
        row.id,
        'FCM send failed; will retry.'
      );
      if (retryScheduled) retried++;
      else failed++;
    }
  }

  if (due.length > 0) {
    logger.info(
      { total: due.length, sent, failed, retried },
      'Scheduled notifications dispatch run'
    );
  }
  return { sent, failed, retried };
}
