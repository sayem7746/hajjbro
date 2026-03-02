import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/** Saudi Arabia timezone for prayer times. */
const SAUDI_TIMEZONE = env.SAUDI_TIMEZONE ?? 'Asia/Riyadh';

/** Aladhan API response timings. */
interface AladhanTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface AladhanResponse {
  code: number;
  data?: {
    timings: AladhanTimings;
    date?: { readable?: string };
  };
}

export type PrayerTimePayload = {
  id: string;
  locationId: string;
  date: Date;
  fajr: string;
  sunrise: string | null;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  source: string | null;
  location?: { slug: string; nameEn: string; nameAr: string | null };
};

/**
 * Get today's date string in Saudi timezone (DD-MM-YYYY) for API.
 */
export function getTodaySaudiDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAUDI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const day = parts.find((p) => p.type === 'day')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const year = parts.find((p) => p.type === 'year')!.value;
  return `${day}-${month}-${year}`;
}

/**
 * Fetch prayer times from Aladhan API for a given date and coordinates.
 * Returns null on API error.
 */
export async function fetchPrayerTimesFromApi(
  latitude: number,
  longitude: number,
  dateStr: string
): Promise<AladhanTimings | null> {
  const base = env.PRAYER_TIMES_API_BASE?.replace(/\/$/, '') ?? 'https://api.aladhan.com/v1';
  const url = `${base}/timings/${dateStr}?latitude=${latitude}&longitude=${longitude}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn({ status: res.status, url }, 'Prayer times API non-OK');
      return null;
    }
    const json = (await res.json()) as AladhanResponse;
    if (json.code !== 200 || !json.data?.timings) {
      logger.warn({ code: json.code }, 'Prayer times API invalid response');
      return null;
    }
    return json.data.timings;
  } catch (e) {
    logger.warn({ err: e, url }, 'Prayer times API request failed');
    return null;
  }
}

/**
 * Get today's date as Date (midnight UTC) for the calendar day in Saudi timezone (for DB date field).
 */
function getTodaySaudiDate(): Date {
  const dateStr = getTodaySaudiDateString(); // DD-MM-YYYY
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Cache prayer times in DB for a location and date.
 */
async function upsertPrayerTime(
  locationId: string,
  date: Date,
  timings: AladhanTimings
): Promise<void> {
  await prisma.prayerTime.upsert({
    where: {
      locationId_date: { locationId, date },
    },
    create: {
      locationId,
      date,
      fajr: timings.Fajr,
      sunrise: timings.Sunrise ?? null,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      source: 'api',
    },
    update: {
      fajr: timings.Fajr,
      sunrise: timings.Sunrise ?? null,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      source: 'api',
    },
  });
}

/**
 * Get today's prayer times for a location by slug (city/location identifier).
 * Serves from cache (DB); if missing, fetches from API and caches.
 */
export async function getTodayByCity(slug: string): Promise<PrayerTimePayload | null> {
  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true, slug: true, nameEn: true, nameAr: true, latitude: true, longitude: true },
  });
  if (!location) return null;
  const lat = location.latitude == null ? null : Number(location.latitude);
  const lng = location.longitude == null ? null : Number(location.longitude);

  const today = getTodaySaudiDate();

  let prayerTime = await prisma.prayerTime.findUnique({
    where: { locationId_date: { locationId: location.id, date: today } },
    select: {
      id: true,
      locationId: true,
      date: true,
      fajr: true,
      sunrise: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
      source: true,
    },
  });

  if (!prayerTime && lat != null && lng != null) {
    const dateStr = getTodaySaudiDateString();
    const timings = await fetchPrayerTimesFromApi(lat, lng, dateStr);
    if (timings) {
      await upsertPrayerTime(location.id, today, timings);
      prayerTime = await prisma.prayerTime.findUnique({
        where: { locationId_date: { locationId: location.id, date: today } },
        select: {
          id: true,
          locationId: true,
          date: true,
          fajr: true,
          sunrise: true,
          dhuhr: true,
          asr: true,
          maghrib: true,
          isha: true,
          source: true,
        },
      });
    }
  }

  if (!prayerTime) return null;
  return {
    ...prayerTime,
    location: { slug: location.slug, nameEn: location.nameEn, nameAr: location.nameAr },
  };
}

/**
 * Refresh and cache today's prayer times for all locations that have coordinates.
 * Groups by (lat, lng) to minimize API calls, then upserts per location.
 * Called by cron (e.g. daily at midnight Saudi time).
 */
export async function refreshDailyPrayerTimes(): Promise<{ updated: number; errors: number }> {
  const today = getTodaySaudiDate();
  const dateStr = getTodaySaudiDateString();

  const locations = await prisma.location.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, latitude: true, longitude: true },
  });

  const coordKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cache = new Map<string, AladhanTimings | null>();
  let updated = 0;
  let errors = 0;

  for (const loc of locations) {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    const key = coordKey(lat, lng);
    let timings = cache.get(key);
    if (timings === undefined) {
      timings = await fetchPrayerTimesFromApi(lat, lng, dateStr);
      cache.set(key, timings);
    }
    if (timings) {
      try {
        await upsertPrayerTime(loc.id, today, timings);
        updated++;
      } catch (e) {
        logger.warn({ err: e, locationId: loc.id }, 'Failed to upsert prayer time');
        errors++;
      }
    } else {
      errors++;
    }
  }

  logger.info(
    { updated, errors, date: dateStr, timezone: SAUDI_TIMEZONE },
    'Prayer times daily refresh completed'
  );
  return { updated, errors };
}
