import React from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton as IonHeaderBtn,
} from '@ionic/react';
import { motion } from 'framer-motion';
import { checkmarkCircle, ellipseOutline, refreshOutline } from 'ionicons/icons';

import AppHeader from '../components/AppHeader';
import { rituals } from '../data/rituals';
import { defaultChecklist } from '../data/checklist';
import { useProgress } from '../contexts/ProgressContext';
import './Progress.css';

const Progress: React.FC = () => {
  const {
    completedRitualCount,
    totalChecklistComplete,
    isRitualComplete,
    toggleRitual,
    resetProgress,
  } = useProgress();

  const [showReset, setShowReset] = React.useState(false);

  const ritualPercent = Math.round((completedRitualCount / rituals.length) * 100);
  const checklistPercent = Math.round(
    (totalChecklistComplete / defaultChecklist.length) * 100
  );
  const overallPercent = Math.round(
    ((completedRitualCount + totalChecklistComplete) /
      (rituals.length + defaultChecklist.length)) *
      100
  );

  return (
    <IonPage>
      <AppHeader title="Progress" />
      <IonContent fullscreen className="sanctuary-content">
        <div className="pb-8 font-sans">
          <motion.div
            className="progress-hero-section px-4 pt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
          >
            <div className="progress-main-ring">
              <svg viewBox="0 0 36 36" className="circular-chart large">
                <path
                  className="circle-bg"
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle-progress green"
                  strokeDasharray={`${overallPercent}, 100`}
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="18" className="percentage large">
                  {overallPercent}%
                </text>
                <text x="18" y="23" className="percentage-label">
                  Overall
                </text>
              </svg>
            </div>
          </motion.div>

          <IonGrid className="progress-stats px-2">
            <IonRow>
              <IonCol size="6">
                <IonCard className="mini-stat-card">
                  <IonCardContent>
                    <div className="mini-stat-value green">{ritualPercent}%</div>
                    <div className="mini-stat-label">Rituals</div>
                    <div className="mini-stat-detail">
                      {completedRitualCount}/{rituals.length}
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
              <IonCol size="6">
                <IonCard className="mini-stat-card">
                  <IonCardContent>
                    <div className="mini-stat-value gold">{checklistPercent}%</div>
                    <div className="mini-stat-label">Checklist</div>
                    <div className="mini-stat-detail">
                      {totalChecklistComplete}/{defaultChecklist.length}
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>

          <div className="section-header">Ritual progress</div>
          <IonList lines="none" className="progress-ritual-list">
            {rituals
              .sort((a, b) => a.order - b.order)
              .map((ritual) => {
                const completed = isRitualComplete(ritual.id);
                return (
                  <IonItem
                    key={ritual.id}
                    className={`progress-item min-h-touch ${completed ? 'done' : ''}`}
                    button
                    onClick={() => toggleRitual(ritual.id)}
                  >
                    <IonIcon
                      slot="start"
                      icon={completed ? checkmarkCircle : ellipseOutline}
                      color={completed ? 'success' : 'medium'}
                      className="progress-check"
                    />
                    <IonLabel>
                      <h3 className={completed ? 'line-through' : ''}>{ritual.title}</h3>
                      <p>{ritual.day}</p>
                    </IonLabel>
                  </IonItem>
                );
              })}
          </IonList>

          <div className="reset-section px-4">
            <IonButton
              expand="block"
              fill="outline"
              color="danger"
              className="reset-btn min-h-touch"
              onClick={() => setShowReset(true)}
            >
              <IonIcon icon={refreshOutline} slot="start" />
              Reset all progress
            </IonButton>
          </div>
        </div>

        <IonModal
          isOpen={showReset}
          onDidDismiss={() => setShowReset(false)}
          className="hajj-reset-modal"
        >
          <IonHeader className="ion-no-border">
            <IonToolbar className="hajj-glass-toolbar">
              <IonTitle>Reset progress</IonTitle>
              <IonButtons slot="end">
                <IonHeaderBtn onClick={() => setShowReset(false)}>Close</IonHeaderBtn>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <div className="ion-padding modal-calm-body">
            <p className="modal-calm-text">
              This will clear your ritual and checklist progress on this device. You can start fresh whenever you
              are ready.
            </p>
            <IonButton
              expand="block"
              fill="outline"
              className="mt-4 min-h-touch"
              onClick={() => setShowReset(false)}
            >
              Keep my progress
            </IonButton>
            <IonButton
              expand="block"
              color="danger"
              className="mt-2 min-h-touch"
              onClick={() => {
                resetProgress();
                setShowReset(false);
              }}
            >
              Reset progress
            </IonButton>
          </div>
        </IonModal>

        <div style={{ height: 24 }} />
      </IonContent>
    </IonPage>
  );
};

export default Progress;
