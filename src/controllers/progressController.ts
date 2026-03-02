import { Request, Response, NextFunction } from 'express';
import * as progressService from '../services/progressService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getMyProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }
    const progress = await progressService.getMyRitualProgress(userId);
    res.json({ success: true, data: progress });
  } catch (e) {
    next(e);
  }
}

export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }
    const summary = await progressService.getProgressSummary(userId);
    res.json({ success: true, data: summary });
  } catch (e) {
    next(e);
  }
}

export async function getCompletionPercentage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }
    const percentage = await progressService.getCompletionPercentage(userId);
    res.json({ success: true, data: { completionPercentage: percentage } });
  } catch (e) {
    next(e);
  }
}

export async function markRitualComplete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }
    const ritualId = req.params.ritualId;
    if (!ritualId) {
      throw new AppError(400, 'Ritual ID is required');
    }
    const { notes } = req.body ?? {};
    const progress = await progressService.markRitualComplete(userId, ritualId, notes ?? null);
    res.json({ success: true, data: progress });
  } catch (e) {
    next(e);
  }
}
