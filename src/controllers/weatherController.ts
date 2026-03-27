import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import * as weatherService from '../services/weatherService.js';

export async function getForecast(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await weatherService.getForecast7d();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getForecastRange(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const city = String(req.query.city ?? 'makkah').toLowerCase();
    const range = String(req.query.range ?? '7d');
    if (city !== 'makkah' && city !== 'madinah') {
      throw new AppError(400, 'city must be makkah or madinah');
    }
    if (range !== '7d' && range !== '30d' && range !== '365d') {
      throw new AppError(400, 'range must be 7d, 30d, or 365d');
    }
    const data = await weatherService.getCityForecastRange(city, range);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

function parseMonthDay(v: unknown, fallback: number): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function getHistoricalHajj(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startMonth = Math.min(12, Math.max(1, parseMonthDay(req.query.startMonth, weatherService.HAJJ_HISTORICAL_WINDOW.startMonth)));
    const startDay = Math.min(31, Math.max(1, parseMonthDay(req.query.startDay, weatherService.HAJJ_HISTORICAL_WINDOW.startDay)));
    const endMonth = Math.min(12, Math.max(1, parseMonthDay(req.query.endMonth, weatherService.HAJJ_HISTORICAL_WINDOW.endMonth)));
    const endDay = Math.min(31, Math.max(1, parseMonthDay(req.query.endDay, weatherService.HAJJ_HISTORICAL_WINDOW.endDay)));

    const window: weatherService.HajjSeasonWindow = { startMonth, startDay, endMonth, endDay };
    if (
      startMonth > endMonth ||
      (startMonth === endMonth && startDay > endDay)
    ) {
      throw new AppError(400, 'Season start must be on or before season end (same calendar year).');
    }

    const latestComplete = weatherService.getLatestCompleteYearForSeasonWindow(endMonth, endDay);
    const start = parseInt(String(req.query.startYear ?? '2015'), 10);
    const end = parseInt(String(req.query.endYear ?? String(latestComplete)), 10);
    const startYear = Number.isFinite(start) ? Math.max(1990, start) : 2015;
    let endYear = Number.isFinite(end) ? end : latestComplete;
    endYear = Math.min(endYear, latestComplete);
    if (startYear > endYear) {
      res.status(400).json({ success: false, error: 'startYear must be <= endYear' });
      return;
    }
    const series = await weatherService.getHajjHistoricalTemperatures(startYear, endYear, window);
    res.json({
      success: true,
      data: {
        window,
        description:
          'Average daily maximum temperature for your chosen Gregorian window each year. Adjust dates as Hajj moves in the Gregorian calendar.',
        series,
      },
    });
  } catch (e) {
    next(e);
  }
}
