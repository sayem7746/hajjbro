import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  useIonRouter,
} from '@ionic/react';
import {
  listOutline,
  checkboxOutline,
  mapOutline,
  timeOutline,
  statsChartOutline,
  bookOutline,
  partlySunnyOutline,
  libraryOutline,
} from 'ionicons/icons';
import { useProgress } from '../contexts/ProgressContext';
import { rituals } from '../data/rituals';
import { defaultChecklist } from '../data/checklist';
import logo from '../assets/logo-icon.svg';
import './Home.css';

const Home: React.FC = () => {
  const router = useIonRouter();
  const { completedRitualCount, totalChecklistComplete } = useProgress();

  const ritualPercent = Math.round((completedRitualCount / rituals.length) * 100);
  const checklistPercent = Math.round(
    (totalChecklistComplete / defaultChecklist.length) * 100
  );

  const quickLinks = [
    { title: 'Hajj Guide', icon: libraryOutline, path: '/app/guide', color: '#2E7D32' },
    { title: 'Rituals', icon: bookOutline, path: '/app/rituals', color: '#1B5E20' },
    { title: 'Progress', icon: statsChartOutline, path: '/app/progress', color: '#00695C' },
    { title: 'Checklist', icon: checkboxOutline, path: '/app/checklist', color: '#C8A951' },
    { title: 'Map', icon: mapOutline, path: '/app/map', color: '#5D4037' },
    { title: 'Prayer Times', icon: timeOutline, path: '/app/prayers', color: '#1565C0' },
    { title: 'Weather', icon: partlySunnyOutline, path: '/app/weather', color: '#0277BD' },
    { title: 'All Rituals', icon: listOutline, path: '/app/rituals', color: '#6A1B9A' },
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>HajjBro</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="home-content">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">HajjBro</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="home-hero">
          <img src={logo} alt="HajjBro" className="home-logo" />
          <p className="hero-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          <h2 className="hero-title">Your Hajj Journey</h2>
          <p className="hero-subtitle">May Allah accept your Hajj and grant you Hajj Mabrur</p>
        </div>

        <IonGrid className="stats-grid">
          <IonRow>
            <IonCol size="6">
              <IonCard className="stat-card-home" button onClick={() => router.push('/app/progress')}>
                <div className="stat-ring">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    <path
                      className="circle-bg"
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="circle-progress green"
                      strokeDasharray={`${ritualPercent}, 100`}
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" className="percentage">{ritualPercent}%</text>
                  </svg>
                </div>
                <IonCardContent>
                  <div className="stat-label-home">Rituals Complete</div>
                  <div className="stat-detail">{completedRitualCount} / {rituals.length}</div>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard className="stat-card-home" button onClick={() => router.push('/app/checklist')}>
                <div className="stat-ring">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    <path
                      className="circle-bg"
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="circle-progress gold"
                      strokeDasharray={`${checklistPercent}, 100`}
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" className="percentage">{checklistPercent}%</text>
                  </svg>
                </div>
                <IonCardContent>
                  <div className="stat-label-home">Checklist Done</div>
                  <div className="stat-detail">{totalChecklistComplete} / {defaultChecklist.length}</div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        <div className="section-header">Hajj guide</div>
        <IonCard className="guide-preview-card" button onClick={() => router.push('/app/guide')}>
          <IonCardContent>
            <div className="weather-preview-row">
              <div className="weather-preview-icon guide-preview-icon">
                <IonIcon icon={libraryOutline} />
              </div>
              <div>
                <div className="weather-preview-title">Book Hajj 24</div>
                <p className="weather-preview-text">
                  Summarized reference: method, adab, ‘Arafāt, ṭawāf, Minā, women’s notes, and more—linked to rituals here.
                </p>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <div className="section-header">Weather & climate</div>
        <IonCard className="weather-preview-card" button onClick={() => router.push('/app/weather')}>
          <IonCardContent>
            <div className="weather-preview-row">
              <div className="weather-preview-icon">
                <IonIcon icon={partlySunnyOutline} />
              </div>
              <div>
                <div className="weather-preview-title">Makkah & Madinah</div>
                <p className="weather-preview-text">
                  7-day forecast and Hajj-season temperature history (early July averages).
                </p>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <div className="section-header">Quick Access</div>
        <IonGrid>
          <IonRow>
            {quickLinks.map((link) => (
              <IonCol size="4" key={link.title}>
                <div className="quick-link" onClick={() => router.push(link.path)}>
                  <div className="quick-link-icon" style={{ background: link.color }}>
                    <IonIcon icon={link.icon} />
                  </div>
                  <span className="quick-link-label">{link.title}</span>
                </div>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        <div className="section-header">Current Ritual</div>
        {rituals
          .filter((r) => r.order === 1)
          .map((ritual) => (
            <IonCard
              key={ritual.id}
              className="current-ritual-card"
              button
              onClick={() => router.push(`/app/rituals/${ritual.id}`)}
            >
              <IonCardHeader>
                <div className="ritual-card-top">
                  <div className="ritual-icon-circle">
                    <IonIcon icon={bookOutline} />
                  </div>
                  <div>
                    <IonCardTitle>{ritual.title}</IonCardTitle>
                    <p className="ritual-arabic-small">{ritual.titleArabic}</p>
                  </div>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <p>{ritual.summary}</p>
                <IonButton fill="clear" size="small" className="view-details-btn">
                  View Details
                </IonButton>
              </IonCardContent>
            </IonCard>
          ))}

        <div style={{ height: 24 }} />
      </IonContent>
    </IonPage>
  );
};

export default Home;
