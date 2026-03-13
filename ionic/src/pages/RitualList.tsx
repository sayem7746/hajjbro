import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonBadge,
  IonNote,
} from '@ionic/react';
import { checkmarkCircle, ellipseOutline } from 'ionicons/icons';
import { useOfflineRituals } from '../hooks/useOfflineData';
import { useProgress } from '../contexts/ProgressContext';
import './RitualList.css';

const RitualList: React.FC = () => {
  const { rituals } = useOfflineRituals();
  const { isRitualComplete } = useProgress();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Hajj Rituals</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Hajj Rituals</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="ritual-list-header">
          <p className="ritual-list-intro">
            Follow the rituals of Hajj in order. Tap each one to learn the steps and duas.
          </p>
        </div>

        <IonList className="ritual-list" lines="none">
          {rituals
            .sort((a, b) => a.order - b.order)
            .map((ritual, index) => {
              const completed = isRitualComplete(ritual.id);
              return (
                <IonItem
                  key={ritual.id}
                  routerLink={`/app/rituals/${ritual.id}`}
                  detail
                  className={`ritual-list-item ${completed ? 'completed' : ''}`}
                >
                  <div className="ritual-order" slot="start">
                    {completed ? (
                      <IonIcon icon={checkmarkCircle} color="success" className="check-icon" />
                    ) : (
                      <div className="order-number">{index + 1}</div>
                    )}
                  </div>
                  <IonLabel>
                    <div className="ritual-item-header">
                      <h2>{ritual.title}</h2>
                      <span className="ritual-title-arabic">{ritual.titleArabic}</span>
                    </div>
                    <p className="ritual-item-summary">{ritual.summary}</p>
                    <div className="ritual-item-meta">
                      <IonBadge className="day-badge">{ritual.day}</IonBadge>
                      <IonNote className="location-note">
                        <IonIcon icon={ellipseOutline} /> {ritual.location}
                      </IonNote>
                    </div>
                  </IonLabel>
                </IonItem>
              );
            })}
        </IonList>

        <div style={{ height: 24 }} />
      </IonContent>
    </IonPage>
  );
};

export default RitualList;
