import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonRefresher,
  IonRefresherContent,
  IonBackButton,
  IonButtons,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonItem,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonText,
} from '@ionic/react';
import { weatherApi, type WeatherRange } from '../services/api';
import './Weather.css';

type DailyForecast = {
  date: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  weatherCode: number | null;
  precipProbMax: number | null;
};

type HistoricalPoint = {
  year: number;
  makkahAvgMaxC: number | null;
  medinaAvgMaxC: number | null;
};

function weatherLabel(code: number | null): string {
  if (code == null) return '';
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Mainly clear';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return '';
}

const RANGE_LABEL: Record<WeatherRange, string> = {
  '7d': '7 days',
  '30d': '1 month',
  '365d': '1 year',
};

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Wheel must span real years so the year column scrolls; API still uses month/day only. */
const SEASON_PICKER_MIN = '1990-01-01';
const SEASON_PICKER_MAX = '2040-12-31';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function buildLinePath(
  values: (number | null)[],
  xFor: (i: number) => number,
  yFor: (t: number) => number
): string {
  const segments: string[] = [];
  let started = false;
  values.forEach((v, i) => {
    if (v == null) {
      started = false;
      return;
    }
    const x = xFor(i);
    const y = yFor(v);
    segments.push(`${started ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    started = true;
  });
  return segments.join(' ');
}

const Weather: React.FC = () => {
  const [cityTab, setCityTab] = useState<'makkah' | 'madinah'>('makkah');
  const [range, setRange] = useState<WeatherRange>('7d');
  const [forecastDaily, setForecastDaily] = useState<DailyForecast[]>([]);
  const [forecastLoading, setForecastLoading] = useState(true);

  const [historical, setHistorical] = useState<HistoricalPoint[]>([]);
  const [histNote, setHistNote] = useState('');
  const [histLoading, setHistLoading] = useState(true);

  const [seasonStartMonth, setSeasonStartMonth] = useState(7);
  const [seasonStartDay, setSeasonStartDay] = useState(1);
  const [seasonEndMonth, setSeasonEndMonth] = useState(7);
  const [seasonEndDay, setSeasonEndDay] = useState(15);
  /** Display year for wheel only (ignored by API). */
  const [seasonPickerYearStart, setSeasonPickerYearStart] = useState(2000);
  const [seasonPickerYearEnd, setSeasonPickerYearEnd] = useState(2000);

  const [err, setErr] = useState<string | null>(null);

  const loadForecast = useCallback(async () => {
    setForecastLoading(true);
    setErr(null);
    try {
      const res = await weatherApi.getForecastRange(cityTab, range);
      setForecastDaily(res.data.data.daily);
    } catch {
      setErr('Could not load forecast.');
      setForecastDaily([]);
    } finally {
      setForecastLoading(false);
    }
  }, [cityTab, range]);

  const loadHistorical = useCallback(async () => {
    setHistLoading(true);
    try {
      const hi = await weatherApi.getHistoricalHajj({
        startYear: 2015,
        startMonth: seasonStartMonth,
        startDay: seasonStartDay,
        endMonth: seasonEndMonth,
        endDay: seasonEndDay,
      });
      setHistorical(hi.data.data.series);
      setHistNote(hi.data.data.description ?? '');
    } catch {
      setHistorical([]);
    } finally {
      setHistLoading(false);
    }
  }, [seasonStartMonth, seasonStartDay, seasonEndMonth, seasonEndDay]);

  useEffect(() => {
    void loadForecast();
  }, [loadForecast]);

  useEffect(() => {
    void loadHistorical();
  }, [loadHistorical]);

  const refreshAll = useCallback(async () => {
    setErr(null);
    await Promise.all([loadForecast(), loadHistorical()]);
  }, [loadForecast, loadHistorical]);

  const forecastChart = useMemo(() => {
    if (range === '7d' || !forecastDaily.length) return null;
    const maxT = forecastDaily.map((d) => d.tempMaxC);
    const minT = forecastDaily.map((d) => d.tempMinC);
    const nums = [...maxT, ...minT].filter((v): v is number => v != null && !Number.isNaN(v));
    if (nums.length < 2) return null;
    const hi = Math.max(...nums) + 1;
    const lo = Math.min(...nums) - 1;
    const w = 340;
    const h = 160;
    const pad = 32;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    const n = forecastDaily.length;
    const xFor = (i: number) => pad + (i / Math.max(1, n - 1)) * innerW;
    const yFor = (t: number) => pad + innerH - ((t - lo) / (hi - lo || 1)) * innerH;
    return {
      w,
      h,
      pad,
      pathMax: buildLinePath(maxT, xFor, yFor),
      pathMin: buildLinePath(minT, xFor, yFor),
      hi,
      lo,
      firstDate: forecastDaily[0]?.date,
      lastDate: forecastDaily[forecastDaily.length - 1]?.date,
    };
  }, [forecastDaily, range]);

  const hajjChart = useMemo(() => {
    const pts = historical.filter((p) => p.makkahAvgMaxC != null || p.medinaAvgMaxC != null);
    if (pts.length < 2) return null;
    const allVals = pts.flatMap((p) =>
      [p.makkahAvgMaxC, p.medinaAvgMaxC].filter((v): v is number => v != null)
    );
    const minT = Math.min(...allVals) - 1;
    const maxT = Math.max(...allVals) + 1;
    const w = 320;
    const h = 140;
    const pad = 28;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    const xFor = (i: number) => pad + (i / Math.max(1, pts.length - 1)) * innerW;
    const yFor = (t: number) => pad + innerH - ((t - minT) / (maxT - minT || 1)) * innerH;

    const line = (key: 'makkahAvgMaxC' | 'medinaAvgMaxC') => {
      const segments: string[] = [];
      let started = false;
      pts.forEach((p, i) => {
        const v = p[key];
        if (v == null) {
          started = false;
          return;
        }
        const x = xFor(i);
        const y = yFor(v);
        segments.push(`${started ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`);
        started = true;
      });
      return segments.join(' ');
    };

    return { pts, minT, maxT, w, h, pad, line };
  }, [historical]);

  const refStart = `${seasonPickerYearStart}-${pad2(seasonStartMonth)}-${pad2(seasonStartDay)}`;
  const refEnd = `${seasonPickerYearEnd}-${pad2(seasonEndMonth)}-${pad2(seasonEndDay)}`;

  const parseIsoDateParts = (value: string | string[] | null | undefined) => {
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v !== 'string' || v.length < 10) return null;
    const y = parseInt(v.slice(0, 4), 10);
    const m = parseInt(v.slice(5, 7), 10);
    const d = parseInt(v.slice(8, 10), 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return { y, m, d };
  };

  const onSeasonStartChange = (value: string | string[] | null | undefined) => {
    const parts = parseIsoDateParts(value);
    if (!parts) return;
    setSeasonPickerYearStart(parts.y);
    setSeasonStartMonth(parts.m);
    setSeasonStartDay(parts.d);
  };

  const onSeasonEndChange = (value: string | string[] | null | undefined) => {
    const parts = parseIsoDateParts(value);
    if (!parts) return;
    setSeasonPickerYearEnd(parts.y);
    setSeasonEndMonth(parts.m);
    setSeasonEndDay(parts.d);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="hajj-glass-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/home" className="min-h-touch min-w-touch" />
          </IonButtons>
          <IonTitle>Weather</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="sanctuary-content weather-page">
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            await refreshAll();
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <p className="weather-intro">
          Forecasts and archived temperatures for Makkah and Madinah. Choose a Hajj-season window (Gregorian
          month/day, repeated each year) to compare trends across years.
        </p>

        {err && <p className="weather-error">{err}</p>}

        <h2 className="weather-section-title">City forecast</h2>
        <IonSegment
          value={cityTab}
          onIonChange={(e) => {
            const v = e.detail.value as string;
            if (v === 'makkah' || v === 'madinah') setCityTab(v);
          }}
          className="weather-segment"
        >
          <IonSegmentButton value="makkah">
            <IonLabel>Makkah</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="madinah">
            <IonLabel>Madinah</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <IonSegment
          value={range}
          onIonChange={(e) => {
            const v = e.detail.value as WeatherRange;
            if (v === '7d' || v === '30d' || v === '365d') setRange(v);
          }}
          className="weather-segment range-segment"
        >
          <IonSegmentButton value="7d">
            <IonLabel>7 days</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="30d">
            <IonLabel>1 month</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="365d">
            <IonLabel>1 year</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {forecastLoading && (
          <div className="weather-skeleton px-4" aria-hidden>
            <div className="mb-3 h-36 animate-pulse rounded-card border border-[var(--hajj-border-soft)] bg-[var(--ion-card-background)]" />
            <div className="mb-3 h-14 animate-pulse rounded-card border border-[var(--hajj-border-soft)] bg-[var(--ion-card-background)]" />
            <div className="h-48 animate-pulse rounded-card border border-[var(--hajj-border-soft)] bg-[var(--ion-card-background)]" />
          </div>
        )}

        {!forecastLoading && forecastDaily.length > 0 && (
          <>
            <IonText color="medium">
              <p className="range-caption">
                {cityTab === 'makkah' ? 'Makkah' : 'Madinah'} · {RANGE_LABEL[range]}
                {range !== '7d' && forecastChart && (
                  <>
                    {' '}
                    ({forecastChart.firstDate} → {forecastChart.lastDate})
                  </>
                )}
              </p>
            </IonText>

            {range !== '7d' && forecastChart && (
              <IonCard className="weather-card chart-card">
                <IonCardContent>
                  <svg
                    viewBox={`0 0 ${forecastChart.w} ${forecastChart.h}`}
                    className="temp-chart forecast-range-chart"
                    role="img"
                    aria-label="Temperature min and max over selected range"
                  >
                    <text x={forecastChart.pad} y={18} className="chart-axis-label">
                      {forecastChart.hi.toFixed(0)}°C
                    </text>
                    <text x={forecastChart.pad} y={forecastChart.h - 4} className="chart-axis-label">
                      {forecastChart.lo.toFixed(0)}°C
                    </text>
                    <path
                      d={forecastChart.pathMax}
                      fill="none"
                      stroke="var(--weather-line-max)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={forecastChart.pathMin}
                      fill="none"
                      stroke="var(--weather-line-min)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="4 3"
                    />
                  </svg>
                  <div className="chart-legend">
                    <span>
                      <i className="legend-dot legend-dot-max" /> Daily max
                    </span>
                    <span>
                      <i className="legend-dot legend-dot-min" /> Daily min
                    </span>
                  </div>
                </IonCardContent>
              </IonCard>
            )}

            {range === '7d' && (
              <IonCard className="weather-card">
                <IonCardContent>
                  <div className="forecast-rows">
                    {forecastDaily.map((d) => (
                      <div key={d.date} className="forecast-row">
                        <span className="forecast-date">{d.date}</span>
                        <span className="forecast-temps">
                          {d.tempMaxC != null && d.tempMinC != null
                            ? `${Math.round(d.tempMinC)}° / ${Math.round(d.tempMaxC)}°`
                            : '—'}
                          <span className="forecast-unit">C</span>
                        </span>
                        <span className="forecast-desc">{weatherLabel(d.weatherCode)}</span>
                        {d.precipProbMax != null && d.precipProbMax > 0 && (
                          <span className="forecast-rain">{d.precipProbMax}% rain</span>
                        )}
                      </div>
                    ))}
                  </div>
                </IonCardContent>
              </IonCard>
            )}

            {range !== '7d' && (
              <IonCard className="weather-card">
                <IonCardContent>
                  <div className="forecast-rows compact">
                    {forecastDaily.map((d) => (
                      <div key={d.date} className="forecast-row">
                        <span className="forecast-date">{d.date}</span>
                        <span className="forecast-temps">
                          {d.tempMaxC != null && d.tempMinC != null
                            ? `${Math.round(d.tempMinC)}° / ${Math.round(d.tempMaxC)}°`
                            : '—'}
                          <span className="forecast-unit">C</span>
                        </span>
                        <span className="forecast-desc">{weatherLabel(d.weatherCode)}</span>
                      </div>
                    ))}
                  </div>
                </IonCardContent>
              </IonCard>
            )}
          </>
        )}

        <h2 className="weather-section-title">Hajj-season temperature trend</h2>
        <p className="weather-hist-note">{histNote}</p>
        <p className="weather-hist-note calendar-hint">
          Pick the Gregorian window that matches Hajj for the years you care about (dates shift each year). Same
          month/day is applied each year. The year in the picker is only for scrolling—trends are still month/day
          across years.
        </p>

        <IonCard className="weather-card season-card">
          <IonCardContent>
            <div className="season-pickers">
              <IonItem lines="none" className="season-datetime-item">
                <IonLabel position="stacked">Season start</IonLabel>
                <IonDatetimeButton datetime="hajj-season-start">
                  <span slot="date-target" className="season-date-target">
                    {MONTH_SHORT[seasonStartMonth - 1]} {seasonStartDay}
                  </span>
                </IonDatetimeButton>
              </IonItem>
              <IonItem lines="none" className="season-datetime-item">
                <IonLabel position="stacked">Season end</IonLabel>
                <IonDatetimeButton datetime="hajj-season-end">
                  <span slot="date-target" className="season-date-target">
                    {MONTH_SHORT[seasonEndMonth - 1]} {seasonEndDay}
                  </span>
                </IonDatetimeButton>
              </IonItem>
            </div>
            <IonText color="medium">
              <p className="season-window-text">
                Window: {pad2(seasonStartMonth)}/{pad2(seasonStartDay)} → {pad2(seasonEndMonth)}/
                {pad2(seasonEndDay)} (each year)
              </p>
            </IonText>
          </IonCardContent>
        </IonCard>

        {histLoading && (
          <div className="weather-skeleton px-4" aria-hidden>
            <div className="h-44 animate-pulse rounded-card border border-[var(--hajj-border-soft)] bg-[var(--ion-card-background)]" />
          </div>
        )}

        {!histLoading && hajjChart && (
          <IonCard className="weather-card chart-card">
            <IonCardHeader>
              <IonCardTitle className="hajj-chart-title">Avg daily max (°C) by year</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <svg
                viewBox={`0 0 ${hajjChart.w} ${hajjChart.h}`}
                className="temp-chart"
                role="img"
                aria-label="Line chart of average maximum temperatures for Makkah and Madinah"
              >
                <text x={hajjChart.pad} y={16} className="chart-axis-label">
                  {hajjChart.maxT.toFixed(0)}°C
                </text>
                <text x={hajjChart.pad} y={hajjChart.h - 8} className="chart-axis-label">
                  {hajjChart.minT.toFixed(0)}°C
                </text>
                <path
                  d={hajjChart.line('makkahAvgMaxC')}
                  fill="none"
                  stroke="var(--weather-line-makkah)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={hajjChart.line('medinaAvgMaxC')}
                  fill="none"
                  stroke="var(--weather-line-madinah)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="chart-legend">
                <span>
                  <i className="legend-dot makkah" /> Makkah
                </span>
                <span>
                  <i className="legend-dot madinah" /> Madinah
                </span>
              </div>
              <div className="chart-years">
                {hajjChart.pts.map((p) => (
                  <span key={p.year} className="chart-year-tick">
                    {p.year}
                  </span>
                ))}
              </div>
            </IonCardContent>
          </IonCard>
        )}

        <div style={{ height: 24 }} />
      </IonContent>

      <IonModal keepContentsMounted>
        <IonDatetime
          id="hajj-season-start"
          presentation="date"
          min={SEASON_PICKER_MIN}
          max={SEASON_PICKER_MAX}
          value={refStart}
          preferWheel
          onIonChange={(e) => onSeasonStartChange(e.detail.value)}
        />
      </IonModal>

      <IonModal keepContentsMounted>
        <IonDatetime
          id="hajj-season-end"
          presentation="date"
          min={SEASON_PICKER_MIN}
          max={SEASON_PICKER_MAX}
          value={refEnd}
          preferWheel
          onIonChange={(e) => onSeasonEndChange(e.detail.value)}
        />
      </IonModal>
    </IonPage>
  );
};

export default Weather;
