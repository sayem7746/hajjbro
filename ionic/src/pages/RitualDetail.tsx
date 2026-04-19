import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonFooter,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
} from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { checkmarkCircle, locationOutline } from 'ionicons/icons';

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
        title={ritual.title}
        showBack
        defaultHref="/app/rituals"
        backText={backFromGuide ? 'Guide' : undefined}
      />

      <IonContent fullscreen className="sanctuary-content pb-32">
        <motion.div
          className="box-border px-5 pb-8 pt-4 font-sans text-stitch-on-surface"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
        >
          <div className="rounded-stitch bg-stitch-white px-5 py-6 shadow-ambient">
            <p className="font-arabic text-right text-[1.35rem] leading-[1.75] text-stitch-primary-mid">{ritual.titleArabic}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-stitch-on-surface">{ritual.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <IonChip className="!m-0 bg-stitch-surface-low text-xs font-medium text-stitch-on-surface">
                <IonLabel>{ritual.day}</IonLabel>
              </IonChip>
              <IonChip className="!m-0 bg-stitch-surface-low text-xs font-medium text-stitch-on-surface">
                <IonIcon icon={locationOutline} className="text-stitch-primary-mid" />
                <IonLabel>{ritual.location}</IonLabel>
              </IonChip>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-widest text-stitch-on-variant">Overview</h2>
            <p className="mt-3 text-body leading-relaxed text-stitch-on-surface">{ritual.description}</p>
          </section>

          <section className="mt-10 rounded-2xl bg-stitch-surface-low px-4 py-5 shadow-ambient">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-widest text-stitch-on-variant">Steps</h2>
            <ol className="mt-4 list-none space-y-0 pl-0">
              {ritual.steps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-stitch-primary to-stitch-primary-mid text-sm font-bold text-white shadow-sm">
                      {index + 1}
                    </span>
                    {index < ritual.steps.length - 1 && (
                      <span className="h-10 w-px shrink-0 bg-stitch-primary/20" aria-hidden />
                    )}
                  </div>
                  <p
                    className={`min-w-0 flex-1 pt-2 text-[0.98rem] leading-relaxed text-stitch-on-surface ${
                      index < ritual.steps.length - 1 ? 'pb-8' : 'pb-0'
                    }`}
                  >
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {ritual.duas.length > 0 && (
            <section className="mt-10">
              <h2 className="text-[0.7rem] font-semibold uppercase tracking-widest text-stitch-on-variant">
                Duas &amp; supplications
              </h2>
              <div className="mt-4 flex flex-col gap-4">
                {ritual.duas.map((dua) => (
                  <DuaBlock key={dua.id} dua={dua} />
                ))}
              </div>
            </section>
          )}

          <div className="h-8" />
        </motion.div>
      </IonContent>

      <IonFooter className="ion-no-border safe-area-bottom">
        <IonToolbar className="border-t border-stitch-outline/25 bg-stitch-white/95 px-4 py-3 backdrop-blur-md [--background:rgba(255,255,255,0.92)]">
          <IonButton
            expand="block"
            size="large"
            className={`min-h-[48px] font-semibold ${completed ? '' : 'hajj-gradient-btn'}`}
            color={completed ? 'medium' : undefined}
            fill={completed ? 'outline' : 'solid'}
            onClick={() => toggleRitual(ritual.id)}
          >
            <IonIcon icon={checkmarkCircle} slot="start" />
            {completed ? 'Ritual marked complete' : 'Mark ritual complete'}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default RitualDetail;
