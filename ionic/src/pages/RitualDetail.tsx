import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons } from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

import AppHeader from '../components/AppHeader';
import DuaBlock from '../components/DuaBlock';
import { useOfflineRituals } from '../hooks/useOfflineData';
import { useProgress } from '../contexts/ProgressContext';

type RitualLocationState = { fromBookHajjSection?: boolean };

const RitualDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation<RitualLocationState>();
  const { rituals } = useOfflineRituals();
  const { isRitualComplete, toggleRitual } = useProgress();

  const ritual = rituals.find((r) => r.id === id);
  const backFromGuide = Boolean(location.state?.fromBookHajjSection);
  const total = rituals.length;

  if (!ritual) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar className="hajj-glass-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/app/rituals" text={backFromGuide ? 'Guide' : undefined} />
            </IonButtons>
            <IonTitle>Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="sanctuary-content ion-padding">
          <p className="font-sans text-stitch-on-variant">Ritual not found.</p>
        </IonContent>
      </IonPage>
    );
  }

  const completed = isRitualComplete(ritual.id);

  return (
    <IonPage>
      <AppHeader
        title="HajjBro"
        showBack
        defaultHref="/app/rituals"
        backText={backFromGuide ? 'Guide' : ''}
      />

      <IonContent fullscreen className="sanctuary-content">
        <motion.div
          className="box-border px-5 pb-32 pt-6 font-sans text-stitch-on-surface"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
        >
          <section className="mb-10">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-[#ffe088] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#241a00]">
                Ritual {ritual.order} of {total}
              </span>
            </div>
            <h2 className="mb-6 text-4xl font-extrabold tracking-tight text-stitch-primary">{ritual.title}</h2>

            <div className="relative mb-8 h-48 overflow-hidden rounded-3xl shadow-ambient">
              <div className="absolute inset-0 bg-gradient-to-br from-stitch-primary to-stitch-primary-mid" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
              <p
                dir="rtl"
                className="absolute inset-x-6 bottom-6 font-arabic text-3xl leading-[1.8] text-white"
              >
                {ritual.titleArabic}
              </p>
            </div>

            <p className="text-lg font-medium italic leading-relaxed text-stitch-on-variant/90">{ritual.description}</p>
          </section>

          <section className="mb-12 space-y-2">
            {ritual.steps.map((step, index) => {
              const active = completed || index === 0;
              return (
                <div key={index} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        active
                          ? 'bg-stitch-primary text-white shadow-lg'
                          : 'bg-stitch-surface-high text-stitch-primary'
                      }`}
                    >
                      {index + 1}
                    </div>
                    {index < ritual.steps.length - 1 && (
                      <div className="mt-2 w-0.5 flex-1 bg-stitch-outline/30" />
                    )}
                  </div>
                  <div className={`min-w-0 flex-1 pt-1 ${index < ritual.steps.length - 1 ? 'pb-6' : ''}`}>
                    <p className="text-base font-medium leading-relaxed text-stitch-on-variant">{step}</p>
                  </div>
                </div>
              );
            })}
          </section>

          {ritual.duas.length > 0 && (
            <section className="mb-12 flex flex-col gap-6">
              {ritual.duas.map((dua) => (
                <DuaBlock key={dua.id} dua={dua} />
              ))}
            </section>
          )}

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-stitch-primary to-stitch-primary-mid py-5 text-lg font-bold text-white shadow-[0_8px_32px_rgba(19,66,61,0.15)] transition-opacity hover:opacity-95"
            onClick={() => toggleRitual(ritual.id)}
          >
            <span>{completed ? 'Ritual marked complete' : 'Mark Ritual as Complete'}</span>
            {completed ? <CheckCircle2 className="h-6 w-6" /> : <Sparkles className="h-6 w-6" aria-hidden />}
          </button>
        </motion.div>
      </IonContent>
    </IonPage>
  );
};

export default RitualDetail;
