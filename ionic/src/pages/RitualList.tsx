import React, { useMemo } from 'react';
import { IonPage, IonContent, IonRouterLink } from '@ionic/react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  DoorOpen,
  Footprints,
  Heart,
  Landmark,
  Moon,
  Mountain,
  RefreshCw,
  Scissors,
  Shirt,
  Sun,
  Tent,
  type LucideIcon,
} from 'lucide-react';

import AppHeader from '../components/AppHeader';
import { useOfflineRituals } from '../hooks/useOfflineData';
import { useProgress } from '../contexts/ProgressContext';
import { getCurrentRitual } from '../lib/currentRitual';
import { Ritual } from '../types';

const ritualIcons: Record<string, LucideIcon> = {
  ihram: Shirt,
  'tawaf-qudum': RefreshCw,
  sai: Footprints,
  'mina-8th': Tent,
  arafah: Sun,
  muzdalifah: Moon,
  'rami-10th': Mountain,
  hady: Heart,
  halq: Scissors,
  'tawaf-ifadah': Landmark,
  tashreeq: CalendarDays,
  'tawaf-wada': DoorOpen,
};

const RitualList: React.FC = () => {
  const { rituals } = useOfflineRituals();
  const { isRitualComplete, completedRitualCount } = useProgress();

  const sorted = useMemo(() => [...rituals].sort((a, b) => a.order - b.order), [rituals]);

  const current = useMemo(
    () => getCurrentRitual(rituals, isRitualComplete),
    [rituals, isRitualComplete]
  );

  const allComplete = sorted.length > 0 && sorted.every((r) => isRitualComplete(r.id));
  const completed = sorted.filter((r) => isRitualComplete(r.id) && (allComplete || r.id !== current.id));
  const upcoming = sorted.filter((r) => !isRitualComplete(r.id) && r.id !== current.id);
  const percent = sorted.length ? Math.round((completedRitualCount / sorted.length) * 100) : 0;

  return (
    <IonPage>
      <AppHeader title="HajjBro" />
      <IonContent fullscreen className="sanctuary-content">
        <div className="box-border px-5 pb-32 pt-4 font-sans text-stitch-on-surface">
          <motion.section
            className="mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
          >
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl font-extrabold tracking-tight text-stitch-primary">The {sorted.length} Rituals</h2>
                <p className="mt-1 text-sm text-stitch-on-variant/70">Your sacred journey through Hajj</p>
              </div>
              <p className="shrink-0 text-right text-3xl font-bold text-stitch-primary">
                {completedRitualCount}
                <span className="text-xl font-medium text-stitch-on-variant/30">/{sorted.length}</span>
              </p>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-stitch-surface-low">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-stitch-primary to-stitch-primary-mid shadow-[0_0_12px_rgba(19,66,61,0.2)]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-widest text-[#735c00]">
              Alhamdulillah • {percent}% Completed
            </p>
          </motion.section>

          <div className="flex flex-col gap-8">
            {completed.map((ritual, index) => (
              <RitualRow key={ritual.id} ritual={ritual} index={index} completed />
            ))}

            {!allComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34 }}
              >
                <IonRouterLink
                  routerLink={`/app/rituals/${current.id}`}
                  className="relative block overflow-hidden rounded-[32px] bg-gradient-to-br from-stitch-primary to-stitch-primary-mid p-8 text-white no-underline shadow-[0_20px_40px_rgba(19,66,61,0.15)]"
                >
                  <Landmark className="pointer-events-none absolute -right-2 -top-2 h-28 w-28 text-white/10" aria-hidden />
                  <div className="relative z-10">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#ffe088]" />
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Current Station</span>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <h3 className="text-3xl font-extrabold">{current.title}</h3>
                        <p className="max-w-[220px] text-sm leading-relaxed text-white/80">{current.summary}</p>
                      </div>
                      <span dir="rtl" className="shrink-0 font-arabic text-3xl font-bold leading-relaxed">
                        {current.titleArabic}
                      </span>
                    </div>
                    <span className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-stitch-primary">
                      Continue Ritual
                      <ArrowRight className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                </IonRouterLink>
              </motion.div>
            )}

            {upcoming.map((ritual, index) => (
              <RitualRow key={ritual.id} ritual={ritual} index={index} />
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center border-y border-stitch-outline/20 py-12 text-center">
            <p dir="rtl" className="px-4 font-arabic text-2xl leading-[1.8] text-stitch-primary">
              لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ
            </p>
            <p className="mt-4 text-sm italic text-stitch-on-variant/60">&quot;Here I am, O Allah, here I am...&quot;</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

const RitualRow: React.FC<{ ritual: Ritual; index: number; completed?: boolean }> = ({
  ritual,
  index,
  completed = false,
}) => {
  const Icon = ritualIcons[ritual.id] ?? Landmark;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.24) }}
    >
      <IonRouterLink
        routerLink={`/app/rituals/${ritual.id}`}
        className={`flex min-h-[48px] items-start gap-5 rounded-2xl p-6 no-underline ${
          completed
            ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
            : 'bg-stitch-surface-low'
        }`}
      >
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            completed ? 'bg-stitch-primary/5 text-stitch-primary' : 'bg-stitch-bg text-stitch-on-variant'
          }`}
        >
          {completed ? <CircleCheck className="h-6 w-6" strokeWidth={1.75} /> : <Icon className="h-5 w-5" strokeWidth={1.75} />}
        </span>
        <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-xl font-bold text-stitch-primary">{ritual.title}</span>
            <span className="mt-1 block text-sm leading-relaxed text-stitch-on-variant">{ritual.summary}</span>
          </span>
          <span dir="rtl" className="shrink-0 font-arabic text-xl leading-relaxed text-stitch-primary-mid/60">
            {ritual.titleArabic}
          </span>
        </span>
      </IonRouterLink>
    </motion.div>
  );
};

export default RitualList;
