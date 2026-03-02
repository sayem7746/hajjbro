import { Request, Response, NextFunction } from 'express';
import * as notificationScheduleService from '../services/notificationScheduleService.js';
import { AppError } from '../middleware/errorHandler.js';
import { ScheduledNotificationStatus } from '@prisma/client';

export async function createScheduled(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }
    const { title, body, data, scheduledAt, maxRetries } = req.body;
    if (!title || !body || !scheduledAt) {
      throw new AppError(400, 'title, body, and scheduledAt are required');
    }
    const at = new Date(scheduledAt);
    if (isNaN(at.getTime())) {
      throw new AppError(400, 'scheduledAt must be a valid ISO date');
    }
    if (at.getTime() <= Date.now()) {
      throw new AppError(400, 'scheduledAt must be in the future');
    }
    const result = await notificationScheduleService.createScheduledNotification({
      userId,
      title: String(title).trim(),
      body: String(body).trim(),
      data: data ?? null,
      scheduledAt: at,
      maxRetries: maxRetries != null ? parseInt(String(maxRetries), 10) : undefined,
    });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function listScheduled(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }
    const status = req.query.status as string | undefined;
    const statusFilter =
      status === 'pending' || status === 'sent' || status === 'failed'
        ? (status as ScheduledNotificationStatus)
        : undefined;
    const data = await notificationScheduleService.getUserScheduledNotifications(userId, {
      status: statusFilter,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function cancelScheduled(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'Notification id is required');
    }
    const cancelled = await notificationScheduleService.cancelScheduledNotification(id, userId);
    if (!cancelled) {
      throw new AppError(404, 'Scheduled notification not found or already sent/cancelled');
    }
    res.json({ success: true, message: 'Scheduled notification cancelled' });
  } catch (e) {
    next(e);
  }
}
