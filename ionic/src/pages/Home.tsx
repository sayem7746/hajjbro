import React, { useMemo } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { motion } from 'framer-motion';
import { ChevronRight, ClipboardList, BookOpen, Star, Users } from 'lucide-react';

import AppHeader from '../components/AppHeader';
import CircularProgressRing from '../components/CircularProgressRing';
import HomeMapPreview from '../components/HomeMapPreview';
import { useAuth } from '../contexts/AuthContext';
import { useProgress } from '../contexts/ProgressContext';
import { rituals } from '../data/rituals';
import { defaultChecklist } from '../data/checklist';
import { dailyWisdom } from '../data/dailyWisdom';
import { homeVerseArabic } from '../data/homeVerse';
import { getCurrentRitual } from '../lib/currentRitual';

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const Home: React.FC = () => {
  const router = useIonRouter();
  const { user } = useAuth();
  const { completedRitualCount, isRitualComplete, totalChecklistComplete } = useProgress();

  const firstName = useMemo(() => {
    const n = user?.name?.trim();
    if (!n) return 'Guest';
    return n.split(/\s+/)[0] ?? 'Guest';
  }, [user?.name]);

  const currentRitual = useMemo(
    () => getCurrentRitual(rituals, isRitualComplete),
    [isRitualComplete]
  );

  const journeyPercent = Math.round((completedRitualCount / rituals.length) * 100);
  const checklistRemaining = Math.max(0, defaultChecklist.length - totalChecklistComplete);

  return (
    <IonPage className="hajj-home-page">
      <AppHeader title="HajjBro" />
      <IonContent fullscreen className="sanctuary-content hajj-home-content">
        <div className="box-border w-full max-w-full overflow-x-hidden px-5 pb-28 font-sans text-stitch-on-surface">
          <motion.section className="pt-2" {...fadeUp} transition={{ duration: 0.35 }}>
            <p className="mb-1 text-sm font-medium text-[#466270]">Peace and Blessings</p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-stitch-primary">
              Assalamu Alaikum, {firstName}
            </h1>
          </motion.section>

          <motion.div
            className="relative mt-5 flex items-center gap-3 rounded-2xl bg-stitch-surface-low px-4 py-4 shadow-ambient"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
          >
            <p className="min-w-0 flex-1 text-center font-arabic text-[0.95rem] leading-[1.85] text-stitch-on-surface">
              {homeVerseArabic}
            </p>
            <Star className="h-6 w-6 shrink-0 fill-stitch-gold text-stitch-gold" strokeWidth={1.25} aria-hidden />
          </motion.div>

          <motion.div
            className="relative mt-6 overflow-hidden rounded-[32px] bg-white px-6 pb-8 pt-6 shadow-ambient"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: 0.04 }}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-300/15"
              aria-hidden
            />
            <button
              type="button"
              className="relative z-[1] w-full text-center"
              onClick={() => router.push(`/app/rituals/${currentRitual.id}`)}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stitch-on-variant">
                Current ritual
              </p>
              <div className="mx-auto mt-5 flex h-[148px] w-[148px] items-center justify-center">
                <div className="relative h-[148px] w-[148px]">
                  <CircularProgressRing
                    percent={journeyPercent}
                    size={148}
                    stroke={6}
                    trackClass="text-[#e9e8e6]"
                    progressClass="text-stitch-primary-mid"
                  />
                  <span className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[1.75rem] font-bold leading-none tracking-tight text-stitch-on-surface">
                      {completedRitualCount}/{rituals.length}
                    </span>
                    <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stitch-on-variant">
                      Rituals
                    </span>
                  </span>
                </div>
              </div>
              <h2 className="mt-5 text-lg font-bold text-stitch-primary-mid">{currentRitual.title}</h2>
              <p className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-relaxed text-stitch-on-variant">
                {currentRitual.summary}
              </p>
            </button>
          </motion.div>

          <motion.div
            className="mt-5 flex flex-col gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.08 }}
          >
            <button
              type="button"
              className="min-h-[48px] w-full rounded-[24px] bg-stitch-surface-low p-5 text-left transition-colors active:bg-stitch-surface-high"
              onClick={() => router.push('/app/checklist')}
            >
              <span className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stitch-primary-mid text-white">
                  <ClipboardList className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <ChevronRight className="h-5 w-5 text-stitch-on-variant/50" aria-hidden />
              </span>
              <span className="block text-base font-bold text-stitch-on-surface">Checklist</span>
              <span className="mt-1 block text-xs text-[#466270]">
                {checklistRemaining === 0
                  ? 'All checklist items complete'
                  : `${checklistRemaining} items remaining for Hajj`}
              </span>
            </button>

            <button
              type="button"
              className="min-h-[48px] w-full rounded-[24px] bg-stitch-surface-low p-5 text-left transition-colors active:bg-stitch-surface-high"
              onClick={() => router.push(`/app/rituals/${currentRitual.id}`)}
            >
              <span className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stitch-gold text-[#4f3e00]">
                  <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <ChevronRight className="h-5 w-5 text-stitch-on-variant/50" aria-hidden />
              </span>
              <span className="block text-base font-bold text-stitch-on-surface">Dua &amp; Prayers</span>
              <span className="mt-1 block text-xs text-[#466270]">Specific duas for {currentRitual.title}</span>
            </button>

            <button
              type="button"
              className="min-h-[48px] w-full rounded-[24px] bg-stitch-surface-low p-5 text-left transition-colors active:bg-stitch-surface-high"
              onClick={() => router.push('/app/kafela')}
            >
              <span className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stitch-primary text-white">
                  <Users className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <ChevronRight className="h-5 w-5 text-stitch-on-variant/50" aria-hidden />
              </span>
              <span className="block text-base font-bold text-stitch-on-surface">Kafela</span>
              <span className="mt-1 block text-xs text-[#466270]">
                Join your group, live map, broadcasts &amp; SOS
              </span>
            </button>
          </motion.div>

          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.1 }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-stitch-primary">Live Sacred Map</h3>
              <button
                type="button"
                className="flex items-center gap-0.5 text-sm font-semibold text-stitch-gold"
                onClick={() => router.push('/app/map')}
              >
                Full Map
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            <button type="button" className="w-full text-left" onClick={() => router.push('/app/map')}>
              <HomeMapPreview />
            </button>
          </motion.div>

          <motion.section
            className="relative mt-8 overflow-hidden rounded-[32px] bg-gradient-to-br from-stitch-primary to-stitch-primary-mid px-8 py-8 text-center text-white shadow-float"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.12 }}
          >
            <svg
              className="pointer-events-none absolute bottom-0 right-0 h-28 w-36 text-white/10"
              viewBox="0 0 120 100"
              fill="currentColor"
              aria-hidden
            >
              <path d="M60 8 L95 28 L95 88 L25 88 L25 28 Z M45 88 L45 48 L75 48 L75 88" opacity={0.9} />
              <circle cx="60" cy="22" r="8" />
            </svg>
            <p className="relative text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/75">
              Daily wisdom
            </p>
            <p className="relative mt-3 font-arabic text-[1.05rem] leading-[1.85] text-white/95">
              {dailyWisdom.arabic}
            </p>
            <p className="relative mt-4 text-sm italic leading-relaxed text-white/90">{dailyWisdom.translation}</p>
            <p className="relative mt-2 text-xs font-medium text-white/70">{dailyWisdom.reference}</p>
          </motion.section>

          <div className="h-6" />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
