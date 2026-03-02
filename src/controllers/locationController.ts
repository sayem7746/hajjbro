import { Request, Response, NextFunction } from 'express';
import * as locationService from '../services/locationService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lat = parseFloat(String(req.query.lat));
    const lng = parseFloat(String(req.query.lng));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new AppError(400, 'Query parameters lat and lng are required and must be numbers');
    }
    const radiusKm = req.query.radius_km != null ? parseFloat(String(req.query.radius_km)) : undefined;
    const limit = req.query.limit != null ? parseInt(String(req.query.limit), 10) : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;

    const locations = await locationService.findNearbyLocations({
      lat,
      lng,
      radiusKm,
      limit,
      type,
    });
    res.json({ success: true, data: locations });
  } catch (e) {
    next(e);
  }
}

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const locations = await locationService.listLocations();
    res.json({ success: true, data: locations });
  } catch (e) {
    next(e);
  }
}

export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug } = req.params;
    const location = await locationService.getLocationBySlug(slug);
    if (!location) {
      throw new AppError(404, 'Location not found');
    }
    res.json({ success: true, data: location });
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const location = await locationService.getLocationById(id);
    if (!location) {
      throw new AppError(404, 'Location not found');
    }
    res.json({ success: true, data: location });
  } catch (e) {
    next(e);
  }
}
