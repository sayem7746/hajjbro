import { Request, Response, NextFunction } from 'express';
import * as duaService from '../services/duaService.js';
import { AppError } from '../middleware/errorHandler.js';

// ─── Admin CRUD ─────────────────────────────────────────────────────────────

export async function listAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ritualId = (req.query.ritualId as string) || undefined;
    const duas = await duaService.listDuasAdmin(
      ritualId ? { ritualId } : undefined
    );
    res.json({ success: true, data: duas });
  } catch (e) {
    next(e);
  }
}

export async function getByIdAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const dua = await duaService.getDuaById(id);
    if (!dua) {
      throw new AppError(404, 'Dua not found');
    }
    res.json({ success: true, data: dua });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as duaService.DuaCreateInput;
    if (!body.textAr) {
      throw new AppError(400, 'textAr is required');
    }
    const dua = await duaService.createDua(body);
    res.status(201).json({ success: true, data: dua });
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as duaService.DuaUpdateInput;
    const dua = await duaService.updateDua(id, body);
    res.json({ success: true, data: dua });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await duaService.deleteDua(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ritualId, orderedIds } = req.body as { ritualId: string; orderedIds: string[] };
    if (!ritualId || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new AppError(400, 'ritualId and orderedIds array are required');
    }
    const duas = await duaService.reorderDuas(ritualId, orderedIds);
    res.json({ success: true, data: duas });
  } catch (e) {
    next(e);
  }
}
