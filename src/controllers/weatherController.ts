import { Request, Response, NextFunction } from 'express';
import * as weatherService from '../services/weatherService.js';

export async function getForecast(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await weatherService.getForecast7d();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getHistoricalHajj(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const start = parseInt(String(req.query.startYear ?? '2015'), 10);
    const end = parseInt(String(req.query.endYear ?? String(new Date().getFullYear() - 1)), 10);
    const startYear = Number.isFinite(start) ? Math.max(1990, start) : 2015;
    const endYear = Number.isFinite(end) ? Math.min(new Date().getFullYear(), end) : new Date().getFullYear() - 1;
    if (startYear > endYear) {
      res.status(400).json({ success: false, error: 'startYear must be <= endYear' });
      return;
    }
    const series = await weatherService.getHajjHistoricalTemperatures(startYear, endYear);
    res.json({
      success: true,
      data: {
        window: weatherService.HAJJ_HISTORICAL_WINDOW,
        description:
          'Average daily maximum temperature for 1–15 July each year (approximate Hajj-season window in Gregorian calendar; Islamic Hajj dates shift annually).',
        series,
      },
    });
  } catch (e) {
    next(e);
  }
}
