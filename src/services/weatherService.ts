/**
 * Weather via Open-Meteo (no API key). Forecast + historical archive for Hajj-season analysis.
 */

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';

/** Representative Hajj-season window in Gregorian (early July; Islamic Hajj dates move ~11 days/year). */
export const HAJJ_HISTORICAL_WINDOW = { startMonth: 7, startDay: 1, endMonth: 7, endDay: 15 } as const;

export const MAKKAH = { name: 'Makkah', lat: 21.4225, lng: 39.8262 };
export const MADINAH = { name: 'Madinah', lat: 24.4672, lng: 39.6112 };

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

function avgMaxForWindow(dailyMax: (number | null)[] | undefined): number | null {
  if (!dailyMax?.length) return null;
  const nums = dailyMax.filter((v): v is number => v != null && !Number.isNaN(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/**
 * Average daily max temperature for July 1–15 each year (proxy for Hajj-season heat trends).
 */
export async function getHajjHistoricalTemperatures(
  startYear: number,
  endYear: number
): Promise<HistoricalYearPoint[]> {
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  const { startMonth, startDay, endMonth, endDay } = HAJJ_HISTORICAL_WINDOW;
  const pad = (n: number) => String(n).padStart(2, '0');
  const startDate = (y: number) =>
    `${y}-${pad(startMonth)}-${pad(startDay)}`;
  const endDate = (y: number) => `${y}-${pad(endMonth)}-${pad(endDay)}`;

  const fetches = years.map(async (year) => {
    const start = startDate(year);
    const end = endDate(year);
    const q = `daily=temperature_2m_max&timezone=Asia/Riyadh&start_date=${start}&end_date=${end}`;
    const [makkah, madinah] = await Promise.all([
      fetchJson<{ daily: { temperature_2m_max?: (number | null)[] } }>(
        `${OPEN_METEO_ARCHIVE}?latitude=${MAKKAH.lat}&longitude=${MAKKAH.lng}&${q}`
      ),
      fetchJson<{ daily: { temperature_2m_max?: (number | null)[] } }>(
        `${OPEN_METEO_ARCHIVE}?latitude=${MADINAH.lat}&longitude=${MADINAH.lng}&${q}`
      ),
    ]);
    return {
      year,
      makkahAvgMaxC: avgMaxForWindow(makkah.daily.temperature_2m_max),
      medinaAvgMaxC: avgMaxForWindow(madinah.daily.temperature_2m_max),
    };
  });

  return Promise.all(fetches);
}
