import React, { useMemo } from 'react';
import { IonPage, IonContent, IonRouterLink } from '@ionic/react';
import { motion } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';

import AppHeader from '../components/AppHeader';
import { useOfflineRituals } from '../hooks/useOfflineData';
import { useProgress } from '../contexts/ProgressContext';
import { getCurrentRitual } from '../lib/currentRitual';

const RitualList: React.FC = () => {
  const { rituals } = useOfflineRituals();
  const { isRitualComplete } = useProgress();

  const sorted = useMemo(() => [...rituals].sort((a, b) => a.order - b.order), [rituals]);

  const current = useMemo(
    () => getCurrentRitual(rituals, isRitualComplete),
    [rituals, isRitualComplete]
  );

  return (
    <IonPage>
      <AppHeader title="Rituals" />
      <IonContent fullscreen className="sanctuary-content">
        <div className="box-border px-5 pb-28 pt-2 font-sans text-stitch-on-surface">
          <motion.p
            className="text-sm leading-relaxed text-stitch-on-variant"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            Follow the rituals of Hajj in order. Tap each card for steps and duas.
          </motion.p>

          <IonRouterLink
            routerLink={`/app/rituals/${current.id}`}
            className="mt-5 block min-h-[48px] w-full overflow-hidden rounded-stitch bg-gradient-to-br from-stitch-primary to-stitch-primary-mid p-5 text-white shadow-float no-underline"
          >
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/85">Current focus</p>
              <p className="mt-2 font-arabic text-right text-lg leading-relaxed text-stitch-gold">{current.titleArabic}</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">{current.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-white/88">{current.summary}</p>
              <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                <span>Open guide</span>
                <ChevronRight className="h-5 w-5" aria-hidden />
              </div>
            </motion.div>
          </IonRouterLink>

          <p className="mb-3 mt-8 text-[0.7rem] font-semibold uppercase tracking-widest text-stitch-on-variant">
            All rituals ({sorted.length})
          </p>

          <ul className="flex flex-col gap-3">
            {sorted.map((ritual, index) => {
              const completed = isRitualComplete(ritual.id);
              const isCurrent = ritual.id === current.id;
              return (
                <motion.li
                  key={ritual.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.04 * index }}
                >
                  <IonRouterLink
                    routerLink={`/app/rituals/${ritual.id}`}
                    className={`flex min-h-[48px] w-full items-start gap-3 rounded-2xl px-4 py-4 shadow-ambient no-underline transition active:opacity-95 ${
                      isCurrent ? 'bg-stitch-surface-low ring-1 ring-stitch-primary/15' : 'bg-stitch-white'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        completed
                          ? 'bg-gradient-to-br from-stitch-primary to-stitch-primary-mid text-white'
                          : 'bg-stitch-surface-low text-stitch-on-variant'
                      }`}
                    >
                      {completed ? <Check className="h-5 w-5" strokeWidth={2.5} /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-stitch-on-surface">{ritual.title}</span>
                      <span className="mt-0.5 block font-arabic text-right text-[0.95rem] leading-relaxed text-stitch-primary-mid">
                        {ritual.titleArabic}
                      </span>
                      <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-stitch-on-variant">
                        {ritual.day} · {ritual.location}
                      </span>
                    </span>
                  </IonRouterLink>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RitualList;
