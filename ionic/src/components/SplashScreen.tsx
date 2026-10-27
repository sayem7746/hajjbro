import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import splashKaaba from '../assets/splash-kaaba.jpg';
import logoFg from '../assets/logo-icon-foreground.svg';

const MIN_VISIBLE_MS = 1200;
const FADE_MS = 400;

function getHijriYear(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic', {
      year: 'numeric',
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')?.value;
    return year ? `${year} AH` : '';
  } catch {
    return '';
  }
}

const SplashScreen: React.FC = () => {
  const { isLoading } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);
  const [progress, setProgress] = useState(8);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);
  const hijriYear = useMemo(() => getHijriYear(), []);

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + Math.random() * 6 + 2));
    }, 120);
    return () => window.clearInterval(id);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || !minElapsed || gone) return;
    setFading(true);
    const t = window.setTimeout(() => setGone(true), FADE_MS);
    return () => window.clearTimeout(t);
  }, [isLoading, minElapsed, gone]);

  if (gone) return null;

  const pct = Math.min(100, Math.round(progress));

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-between overflow-hidden select-none text-white antialiased transition-opacity duration-[400ms]"
      style={{
        backgroundColor: '#0A1A18',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading HajjBro"
    >
      <div className="absolute inset-0 z-0">
        <img
          src={splashKaaba}
          alt=""
          className="h-full w-full scale-105 object-cover object-center"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A18] via-[#0A1A18]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1A18]/70 via-transparent to-[#0A1A18]/90" />
        <div className="absolute inset-0 bg-[#13423D]/25 mix-blend-multiply" />
      </div>

      <header className="z-10 flex w-full items-center justify-between px-6 pt-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#FFE088]" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/80">
            Makkah Al-Mukarramah
          </span>
        </div>
        {hijriYear ? (
          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#FFE088] backdrop-blur-md">
            {hijriYear}
          </span>
        ) : (
          <span />
        )}
      </header>

      <main className="z-10 my-auto flex w-full max-w-sm flex-col items-center px-6 text-center">
        <div className="relative w-full overflow-hidden rounded-[36px] border border-white/20 bg-white/10 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FFE088]/40 bg-gradient-to-br from-[#13423D] to-[#2D5A54] shadow-[0_8px_24px_rgba(204,168,48,0.3)]">
            <img src={logoFg} alt="" className="h-10 w-10" draggable={false} />
          </div>

          <h1 className="mb-1 font-sans text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            HajjBro
          </h1>
          <p className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[0.25em] text-[#FFE088]">
            Your Sacred Sanctuary
          </p>
          <p className="mb-6 font-sans text-sm leading-relaxed text-white/85">
            Step-by-step guidance, authentic duas, and offline rituals support for pilgrims.
          </p>

          <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/10 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#CCA830] via-[#FFE088] to-white transition-[width] duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-white/60">
            <span>Loading Rites</span>
            <span>{pct}%</span>
          </div>
        </div>
      </main>

      <footer className="z-10 flex w-full flex-col items-center px-6 pb-10 text-center">
        <div className="flex w-full max-w-sm items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl">
          <p className="font-arabic text-lg text-[#FFE088]" dir="rtl">
            رَبَّنَا تَقَبَّلْ مِنَّا
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SplashScreen;
