/**
 * Weather via Open-Meteo (no API key). Forecast + historical archive for Hajj-season analysis.
 */

import { logger } from '../utils/logger.js';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';

/** Representative Hajj-season window in Gregorian (early July; Islamic Hajj dates move ~11 days/year). */
export const HAJJ_HISTORICAL_WINDOW = { startMonth: 7, startDay: 1, endMonth: 7, endDay: 15 } as const;

export const MAKKAH = { name: 'Makkah', lat: 21.4225, lng: 39.8262, slug: 'makkah' as const };
export const MADINAH = { name: 'Madinah', lat: 24.4672, lng: 39.6112, slug: 'madinah' as const };

export type HolyCitySlug = 'makkah' | 'madinah';
export type ForecastRange = '7d' | '30d' | '365d';

function coordsForCity(slug: HolyCitySlug) {
  return slug === 'makkah' ? MAKKAH : MADINAH;
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type DailyForecast = {
  date: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  weatherCode: number | null;
  precipProbMax: number | null;
};

export type CityForecast = {
  city: string;
  latitude: number;
  longitude: number;
  daily: DailyForecast[];
};

export type HistoricalYearPoint = {
  year: number;
  makkahAvgMaxC: number | null;
  medinaAvgMaxC: number | null;
};

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  weather_code?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Weather API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function mapDaily(daily: OpenMeteoDaily): DailyForecast[] {
  const { time, temperature_2m_max, temperature_2m_min, weather_code, precipitation_probability_max } = daily;
  return time.map((date, i) => ({
    date,
    tempMaxC: temperature_2m_max?.[i] ?? null,
    tempMinC: temperature_2m_min?.[i] ?? null,
    weatherCode: weather_code?.[i] ?? null,
    precipProbMax: precipitation_probability_max?.[i] ?? null,
  }));
}

export async function getForecast7d(): Promise<{ makkah: CityForecast; madinah: CityForecast }> {
  const params =
    'daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Asia/Riyadh&forecast_days=7';

  const [makkahJson, madinahJson] = await Promise.all([
    fetchJson<{ daily: OpenMeteoDaily }>(`${OPEN_METEO}?latitude=${MAKKAH.lat}&longitude=${MAKKAH.lng}&${params}`),
    fetchJson<{ daily: OpenMeteoDaily }>(`${OPEN_METEO}?latitude=${MADINAH.lat}&longitude=${MADINAH.lng}&${params}`),
  ]);

  return {
    makkah: {
      city: MAKKAH.name,
      latitude: MAKKAH.lat,
      longitude: MAKKAH.lng,
      daily: mapDaily(makkahJson.daily),
    },
    madinah: {
      city: MADINAH.name,
      latitude: MADINAH.lat,
      longitude: MADINAH.lng,
      daily: mapDaily(madinahJson.daily),
    },
  };
}

/**
 * One city: 7-day forecast, or 30 / 365 days of archived daily values (ending yesterday UTC).
 */
export async function getCityForecastRange(
  city: HolyCitySlug,
  range: ForecastRange
): Promise<{ city: string; range: ForecastRange; daily: DailyForecast[] }> {
  const { name, lat, lng } = coordsForCity(city);

  if (range === '7d') {
    const params =
      'daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Asia/Riyadh&forecast_days=7';
    const json = await fetchJson<{ daily: OpenMeteoDaily }>(
      `${OPEN_METEO}?latitude=${lat}&longitude=${lng}&${params}`
    );
    return { city: name, range, daily: mapDaily(json.daily) };
  }

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  if (range === '30d') {
    start.setUTCDate(start.getUTCDate() - 29);
  } else {
    start.setUTCDate(start.getUTCDate() - 364);
  }

  const startStr = utcYmd(start);
  const endStr = utcYmd(end);
  const q = `daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia/Riyadh&start_date=${startStr}&end_date=${endStr}`;
  const json = await fetchJson<{ daily: OpenMeteoDaily }>(
    `${OPEN_METEO_ARCHIVE}?latitude=${lat}&longitude=${lng}&${q}`
  );
  return { city: name, range, daily: mapDaily(json.daily) };
}

function avgMaxForWindow(dailyMax: (number | null)[] | undefined): number | null {
  if (!dailyMax?.length) return null;
  const nums = dailyMax.filter((v): v is number => v != null && !Number.isNaN(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** Latest Gregorian year Y for which the season end (month/day) has passed (archive-safe). */
export function getLatestCompleteYearForSeasonWindow(endMonth: number, endDay: number, now = new Date()): number {
  const y = now.getUTCFullYear();
  const endUtc = Date.UTC(y, endMonth - 1, endDay, 23, 59, 59);
  if (now.getTime() > endUtc) return y;
  return y - 1;
}

/** @deprecated use getLatestCompleteYearForSeasonWindow(7, 15) */
export function getLatestCompleteJulyYear(now = new Date()): number {
  return getLatestCompleteYearForSeasonWindow(7, 15, now);
}

export type HajjSeasonWindow = {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Same Gregorian month/day window each year (adjust yearly to match Hajj in Gregorian). */
export async function getHajjHistoricalTemperatures(
  startYear: number,
  endYear: number,
  window: HajjSeasonWindow
): Promise<HistoricalYearPoint[]> {
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  const { startMonth, startDay, endMonth, endDay } = window;
  const startDateStr = (yr: number) => `${yr}-${pad2(startMonth)}-${pad2(startDay)}`;
  const endDateStr = (yr: number) => `${yr}-${pad2(endMonth)}-${pad2(endDay)}`;

  const out: HistoricalYearPoint[] = [];

  for (const year of years) {
    const start = startDateStr(year);
    const end = endDateStr(year);
    const q = `daily=temperature_2m_max&timezone=Asia/Riyadh&start_date=${start}&end_date=${end}`;
    try {
      const [makkah, madinah] = await Promise.all([
        fetchJson<{ daily?: { temperature_2m_max?: (number | null)[] } }>(
          `${OPEN_METEO_ARCHIVE}?latitude=${MAKKAH.lat}&longitude=${MAKKAH.lng}&${q}`
        ),
        fetchJson<{ daily?: { temperature_2m_max?: (number | null)[] } }>(
          `${OPEN_METEO_ARCHIVE}?latitude=${MADINAH.lat}&longitude=${MADINAH.lng}&${q}`
        ),
      ]);
      out.push({
        year,
        makkahAvgMaxC: avgMaxForWindow(makkah.daily?.temperature_2m_max),
        medinaAvgMaxC: avgMaxForWindow(madinah.daily?.temperature_2m_max),
      });
    } catch (e) {
      logger.warn({ err: e, year }, 'Open-Meteo archive failed for Hajj historical year');
      out.push({ year, makkahAvgMaxC: null, medinaAvgMaxC: null });
    }
  }

  return out;
}
