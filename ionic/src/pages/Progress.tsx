import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
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
  IonAlert,
} from '@ionic/react';
import { checkmarkCircle, ellipseOutline, refreshOutline } from 'ionicons/icons';
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
      <IonHeader>
        <IonToolbar>
          <IonTitle>Progress</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Progress</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="progress-hero-section">
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
              <text x="18" y="18" className="percentage large">{overallPercent}%</text>
              <text x="18" y="23" className="percentage-label">Overall</text>
            </svg>
          </div>
        </div>

        <IonGrid className="progress-stats">
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

        <div className="section-header">Ritual Progress</div>
        <IonList lines="none" className="progress-ritual-list">
          {rituals
            .sort((a, b) => a.order - b.order)
            .map((ritual) => {
              const completed = isRitualComplete(ritual.id);
              return (
                <IonItem
                  key={ritual.id}
                  className={`progress-item ${completed ? 'done' : ''}`}
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

        <div className="reset-section">
          <IonButton
            expand="block"
            fill="outline"
            color="danger"
            className="reset-btn"
            onClick={() => setShowReset(true)}
          >
            <IonIcon icon={refreshOutline} slot="start" />
            Reset All Progress
          </IonButton>
        </div>

        <IonAlert
          isOpen={showReset}
          onDidDismiss={() => setShowReset(false)}
          header="Reset Progress"
          message="Are you sure you want to reset all progress? This cannot be undone."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Reset',
              role: 'destructive',
              handler: () => resetProgress(),
            },
          ]}
        />

        <div style={{ height: 32 }} />
      </IonContent>
    </IonPage>
  );
};

export default Progress;
