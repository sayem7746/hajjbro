import { Request, Response, NextFunction } from 'express';
import * as checklistService from '../services/checklistService.js';
import { AppError } from '../middleware/errorHandler.js';

// ─── Admin ─────────────────────────────────────────────────────────────────

export async function listAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await checklistService.listChecklistsAdmin();
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
}

export async function getByIdAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const item = await checklistService.getChecklistById(id);
    if (!item) {
      throw new AppError(404, 'Checklist item not found');
    }
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as checklistService.ChecklistCreateInput;
    if (!body.slug || !body.titleEn || !body.category) {
      throw new AppError(400, 'slug, titleEn and category are required');
    }
    const item = await checklistService.createChecklist(body);
    res.status(201).json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as checklistService.ChecklistUpdateInput;
    const item = await checklistService.updateChecklist(id, body);
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await checklistService.deleteChecklist(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

// ─── User (auth required) ────────────────────────────────────────────────────

export async function listTemplate(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await checklistService.listChecklistTemplateGrouped();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }
    const data = await checklistService.listMyChecklistGroupedByCategory(userId);
    res.json({ success: true, data });
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
    const data = await checklistService.getChecklistProgressSummary(userId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function markDone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }
    const checklistId = req.params.id;
    if (!checklistId) {
      throw new AppError(400, 'Checklist item ID is required');
    }
    const body = (req.body ?? {}) as { done?: boolean; notes?: string | null };
    const done = body.done !== false; // default true when marking "complete"
    const data = await checklistService.markChecklistItemDone(
      userId,
      checklistId,
      done,
      body.notes ?? null
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
