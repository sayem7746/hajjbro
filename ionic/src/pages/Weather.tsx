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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonBackButton,
  IonButtons,
} from '@ionic/react';
import { weatherApi } from '../services/api';
import './Weather.css';

type DailyForecast = {
  date: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  weatherCode: number | null;
  precipProbMax: number | null;
};

type CityForecast = {
  city: string;
  daily: DailyForecast[];
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

const Weather: React.FC = () => {
  const [makkah, setMakkah] = useState<CityForecast | null>(null);
  const [madinah, setMadinah] = useState<CityForecast | null>(null);
  const [historical, setHistorical] = useState<HistoricalPoint[]>([]);
  const [histNote, setHistNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [fc, hi] = await Promise.all([
        weatherApi.getForecast(),
        // end year omitted: server caps to last complete July 1–15 window (avoids archive errors)
        weatherApi.getHistoricalHajj(2015),
      ]);
      const d = fc.data.data;
      setMakkah(d.makkah);
      setMadinah(d.madinah);
      setHistorical(hi.data.data.series);
      setHistNote(hi.data.data.description ?? '');
    } catch {
      setErr('Could not load weather. Check your connection and API URL.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chart = useMemo(() => {
    const pts = historical.filter(
      (p) => p.makkahAvgMaxC != null || p.medinaAvgMaxC != null
    );
    if (pts.length < 2) return null;
    const allVals = pts.flatMap((p) => [p.makkahAvgMaxC, p.medinaAvgMaxC].filter((v): v is number => v != null));
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/home" />
          </IonButtons>
          <IonTitle>Weather</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="weather-page">
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            await load();
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <p className="weather-intro">
          Seven-day forecast for the holy cities, plus long-run temperature trends during an approximate Hajj-season
          window (early July).
        </p>

        {loading && (
          <div className="weather-center">
            <IonSpinner name="crescent" />
          </div>
        )}
        {err && <p className="weather-error">{err}</p>}

        {!loading && makkah && madinah && (
          <>
            <h2 className="weather-section-title">7-day forecast</h2>
            {[makkah, madinah].map((city) => (
              <IonCard key={city.city} className="weather-card">
                <IonCardHeader>
                  <IonCardTitle>{city.city}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="forecast-rows">
                    {city.daily.map((d) => (
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
            ))}

            <h2 className="weather-section-title">Hajj-season temperature trend</h2>
            <p className="weather-hist-note">{histNote}</p>
            {chart && (
              <IonCard className="weather-card chart-card">
                <IonCardContent>
                  <svg
                    viewBox={`0 0 ${chart.w} ${chart.h}`}
                    className="temp-chart"
                    role="img"
                    aria-label="Line chart of average maximum temperatures for Makkah and Madinah"
                  >
                    <text x={chart.pad} y={16} className="chart-axis-label">
                      {chart.maxT.toFixed(0)}°C
                    </text>
                    <text x={chart.pad} y={chart.h - 8} className="chart-axis-label">
                      {chart.minT.toFixed(0)}°C
                    </text>
                    <path
                      d={chart.line('makkahAvgMaxC')}
                      fill="none"
                      stroke="var(--weather-line-makkah)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={chart.line('medinaAvgMaxC')}
                      fill="none"
                      stroke="var(--weather-line-madinah)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="chart-legend">
                    <span>
                      <i className="legend-dot makkah" /> Makkah (avg daily max, 1–15 Jul)
                    </span>
                    <span>
                      <i className="legend-dot madinah" /> Madinah (avg daily max, 1–15 Jul)
                    </span>
                  </div>
                  <div className="chart-years">
                    {chart.pts.map((p) => (
                      <span key={p.year} className="chart-year-tick">
                        {p.year}
                      </span>
                    ))}
                  </div>
                </IonCardContent>
              </IonCard>
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Weather;
