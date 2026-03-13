import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { checkmarkCircle, ellipseOutline, locationOutline } from 'ionicons/icons';
import { useOfflineRituals } from '../hooks/useOfflineData';
import { useProgress } from '../contexts/ProgressContext';
import './RitualDetail.css';

const RitualDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { rituals } = useOfflineRituals();
  const { isRitualComplete, toggleRitual } = useProgress();

  const ritual = rituals.find((r) => r.id === id);
  if (!ritual) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/app/rituals" />
            </IonButtons>
            <IonTitle>Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>Ritual not found.</p>
        </IonContent>
      </IonPage>
    );
  }

  const completed = isRitualComplete(ritual.id);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/rituals" />
          </IonButtons>
          <IonTitle>{ritual.title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="detail-hero">
          <span className="detail-arabic">{ritual.titleArabic}</span>
          <h1 className="detail-title">{ritual.title}</h1>
          <div className="detail-meta">
            <IonChip className="detail-chip day-chip">
              <IonLabel>{ritual.day}</IonLabel>
            </IonChip>
            <IonChip className="detail-chip location-chip">
              <IonIcon icon={locationOutline} />
              <IonLabel>{ritual.location}</IonLabel>
            </IonChip>
          </div>
        </div>

        <div className="detail-body">
          <IonButton
            expand="block"
            className={`complete-btn ${completed ? 'completed' : ''}`}
            color={completed ? 'medium' : 'primary'}
            onClick={() => toggleRitual(ritual.id)}
          >
            <IonIcon icon={completed ? checkmarkCircle : ellipseOutline} slot="start" />
            {completed ? 'Completed' : 'Mark as Complete'}
          </IonButton>

          <div className="detail-section">
            <h3 className="detail-section-title">Overview</h3>
            <p className="detail-description">{ritual.description}</p>
          </div>

          <div className="detail-section">
            <h3 className="detail-section-title">Steps</h3>
            <div className="steps-list">
              {ritual.steps.map((step, index) => (
                <div key={index} className="ritual-step">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-text">{step}</div>
                </div>
              ))}
            </div>
          </div>

          {ritual.duas.length > 0 && (
            <div className="detail-section">
              <h3 className="detail-section-title">Duas & Supplications</h3>
              {ritual.duas.map((dua) => (
                <div key={dua.id} className="dua-card">
                  <div className="arabic-text">{dua.arabic}</div>
                  <div className="transliteration-text">{dua.transliteration}</div>
                  <div className="translation-text">{dua.translation}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 32 }} />
      </IonContent>
    </IonPage>
  );
};

export default RitualDetail;
