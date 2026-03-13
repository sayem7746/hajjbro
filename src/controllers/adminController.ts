import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/adminService.js';
import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '@prisma/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

function qInt(val: unknown): number | undefined {
  if (val == null) return undefined;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? undefined : n;
}

function qBool(val: unknown): boolean | undefined {
  if (val == null) return undefined;
  if (val === 'true' || val === '1') return true;
  if (val === 'false' || val === '0') return false;
  return undefined;
}

function qStr(val: unknown): string | undefined {
  return typeof val === 'string' && val.length > 0 ? val : undefined;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listUsers({
      page: qInt(req.query.page),
      limit: qInt(req.query.limit),
      search: qStr(req.query.search),
      role: qStr(req.query.role) as UserRole | undefined,
      isActive: qBool(req.query.isActive),
      sortBy: qStr(req.query.sortBy) as 'createdAt' | 'name' | 'email' | 'lastLoginAt' | undefined,
      sortOrder: qStr(req.query.sortOrder) as 'asc' | 'desc' | undefined,
    });
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminService.updateUser(req.params.id, req.body as adminService.AdminUserUpdateInput);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.params.id === req.user?.sub) {
      throw new AppError(400, 'Cannot delete your own account');
    }
    await adminService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

// ─── Rituals ────────────────────────────────────────────────────────────────

export async function listRituals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listRituals({
      page: qInt(req.query.page),
      limit: qInt(req.query.limit),
      search: qStr(req.query.search),
      dayOfHajj: qInt(req.query.dayOfHajj),
      isRequired: qBool(req.query.isRequired),
      sortBy: qStr(req.query.sortBy) as 'order' | 'createdAt' | 'nameEn' | undefined,
      sortOrder: qStr(req.query.sortOrder) as 'asc' | 'desc' | undefined,
    });
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
}

export async function getRitualById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ritual = await adminService.getRitualById(req.params.id);
    res.json({ success: true, data: ritual });
  } catch (e) {
    next(e);
  }
}

export async function createRitual(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as adminService.RitualCreateInput;
    if (!body.slug || !body.nameEn) {
      throw new AppError(400, 'slug and nameEn are required');
    }
    const ritual = await adminService.createRitual(body);
    res.status(201).json({ success: true, data: ritual });
  } catch (e) {
    next(e);
  }
}

export async function updateRitual(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ritual = await adminService.updateRitual(req.params.id, req.body as Partial<adminService.RitualCreateInput>);
    res.json({ success: true, data: ritual });
  } catch (e) {
    next(e);
  }
}

export async function deleteRitual(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteRitual(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

// ─── Duas ───────────────────────────────────────────────────────────────────

export async function listDuas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listDuas({
      page: qInt(req.query.page),
      limit: qInt(req.query.limit),
      search: qStr(req.query.search),
      ritualId: qStr(req.query.ritualId),
      sortBy: qStr(req.query.sortBy) as 'order' | 'createdAt' | 'titleEn' | undefined,
      sortOrder: qStr(req.query.sortOrder) as 'asc' | 'desc' | undefined,
    });
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
}

export async function getDuaById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dua = await adminService.getDuaById(req.params.id);
    res.json({ success: true, data: dua });
  } catch (e) {
    next(e);
  }
}

export async function createDua(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as adminService.DuaCreateInput;
    if (!body.textAr) {
      throw new AppError(400, 'textAr is required');
    }
    const dua = await adminService.createDua(body);
    res.status(201).json({ success: true, data: dua });
  } catch (e) {
    next(e);
  }
}

export async function updateDua(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dua = await adminService.updateDua(req.params.id, req.body as Partial<adminService.DuaCreateInput>);
    res.json({ success: true, data: dua });
  } catch (e) {
    next(e);
  }
}

export async function deleteDua(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteDua(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

// ─── Locations ──────────────────────────────────────────────────────────────

export async function listLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listLocations({
      page: qInt(req.query.page),
      limit: qInt(req.query.limit),
      search: qStr(req.query.search),
      type: qStr(req.query.type),
      sortBy: qStr(req.query.sortBy) as 'nameEn' | 'createdAt' | 'type' | undefined,
      sortOrder: qStr(req.query.sortOrder) as 'asc' | 'desc' | undefined,
    });
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
}

export async function getLocationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const location = await adminService.getLocationById(req.params.id);
    res.json({ success: true, data: location });
  } catch (e) {
    next(e);
  }
}

export async function createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as adminService.LocationCreateInput;
    if (!body.slug || !body.nameEn || !body.type) {
      throw new AppError(400, 'slug, nameEn, and type are required');
    }
    const location = await adminService.createLocation(body);
    res.status(201).json({ success: true, data: location });
  } catch (e) {
    next(e);
  }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const location = await adminService.updateLocation(req.params.id, req.body as Partial<adminService.LocationCreateInput>);
    res.json({ success: true, data: location });
  } catch (e) {
    next(e);
  }
}

export async function deleteLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteLocation(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

// ─── Contacts ───────────────────────────────────────────────────────────────

export async function listContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.listContacts({
      page: qInt(req.query.page),
      limit: qInt(req.query.limit),
      search: qStr(req.query.search),
      userId: qStr(req.query.userId),
      relationship: qStr(req.query.relationship),
      sortBy: qStr(req.query.sortBy) as 'name' | 'createdAt' | undefined,
      sortOrder: qStr(req.query.sortOrder) as 'asc' | 'desc' | undefined,
    });
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
}

export async function getContactById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contact = await adminService.getContactById(req.params.id);
    res.json({ success: true, data: contact });
  } catch (e) {
    next(e);
  }
}

export async function updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contact = await adminService.updateContact(req.params.id, req.body as adminService.ContactUpdateInput);
    res.json({ success: true, data: contact });
  } catch (e) {
    next(e);
  }
}

export async function deleteContact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteContact(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export async function getAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const analytics = await adminService.getAnalytics();
    res.json({ success: true, data: analytics });
  } catch (e) {
    next(e);
  }
}
