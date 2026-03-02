import { Request, Response, NextFunction } from 'express';
import * as prayerTimesService from '../services/prayerTimesService.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

/**
 * GET /prayer-times/today?city=<locationSlug>
 * Returns today's prayer times for the given city (location slug).
 * Timezone: Saudi Arabia (Asia/Riyadh). Results are cached in DB; cron refreshes daily.
 */
export async function getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : undefined;
    if (!city) {
      throw new AppError(400, 'Query parameter "city" is required (e.g. city=makkah or city=medina)');
    }
    const data = await prayerTimesService.getTodayByCity(city);
    if (!data) {
      throw new AppError(404, `Location or prayer times not found for city: ${city}`);
    }
    res.json({
      success: true,
      data: {
        ...data,
        date: prayerTimesService.getTodaySaudiDateString(),
        timezone: env.SAUDI_TIMEZONE ?? 'Asia/Riyadh',
      },
    });
  } catch (e) {
    next(e);
  }
}
