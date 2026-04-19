import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonButton,
} from '@ionic/react';
import { motion } from 'framer-motion';
import {
  sunnyOutline,
  partlySunnyOutline,
  cloudyOutline,
  moonOutline,
  timeOutline,
  locationOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { prayerTimesApi } from '../services/api';
import { notificationService } from '../services/notifications';
import { PrayerTime } from '../types';
import AppHeader from '../components/AppHeader';
import './PrayerTimes.css';

const MAKKAH_COORDS = { lat: 21.4225, lng: 39.8262 };
const MADINAH_COORDS = { lat: 24.4672, lng: 39.6112 };

const prayerIcons: Record<string, string> = {
  Fajr: sunnyOutline,
  Sunrise: sunnyOutline,
  Dhuhr: sunnyOutline,
  Asr: partlySunnyOutline,
  Maghrib: cloudyOutline,
  Isha: moonOutline,
};

const prayerArabic: Record<string, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

function PrayerTimesSkeleton() {
  return (
    <div className="prayer-skeleton-wrap px-4" aria-hidden>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="mb-3 flex min-h-[72px] animate-pulse items-center gap-4 rounded-card border border-border-soft bg-surface px-4 py-3"
        >
          <div className="h-12 w-12 shrink-0 rounded-card bg-canvas" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-canvas" />
            <div className="h-3 w-16 rounded bg-canvas" />
          </div>
          <div className="h-6 w-14 rounded bg-canvas" />
        </div>
      ))}
    </div>
  );
}

const PrayerTimesPage: React.FC = () => {
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<'makkah' | 'madinah'>('makkah');
  const [dateStr, setDateStr] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const fetchPrayerTimes = useCallback(async () => {
    setLoading(true);
    try {
      const coords = city === 'makkah' ? MAKKAH_COORDS : MADINAH_COORDS;
      const response = await prayerTimesApi.getTimes(coords.lat, coords.lng);
      const timings = response.data.data.timings;
      const date = response.data.data.date;
      setDateStr(`${date.readable} | ${date.hijri.day} ${date.hijri.month.en} ${date.hijri.year} AH`);

      const prayerNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const mapped: PrayerTime[] = prayerNames.map((name) => ({
        name,
        nameArabic: prayerArabic[name],
        time: timings[name]?.replace(/\s*\(.*\)/, '') || '--:--',
      }));
      setPrayers(mapped);
    } catch {
      setPrayers([
        { name: 'Fajr', nameArabic: 'الفجر', time: '04:30' },
        { name: 'Sunrise', nameArabic: 'الشروق', time: '06:00' },
        { name: 'Dhuhr', nameArabic: 'الظهر', time: '12:15' },
        { name: 'Asr', nameArabic: 'العصر', time: '15:30' },
        { name: 'Maghrib', nameArabic: 'المغرب', time: '18:30' },
        { name: 'Isha', nameArabic: 'العشاء', time: '20:00' },
      ]);
      setDateStr('Offline - Approximate Times');
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    fetchPrayerTimes();
  }, [fetchPrayerTimes]);

  const handleRefresh = async (event: CustomEvent) => {
    await fetchPrayerTimes();
    event.detail.complete();
  };

  const enableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setNotificationsEnabled(true);
      const today = new Date();
      prayers
        .filter((p) => p.name !== 'Sunrise')
        .forEach((prayer, index) => {
          const [hours, minutes] = prayer.time.split(':').map(Number);
          const notifDate = new Date(today);
          notifDate.setHours(hours, minutes - 10, 0, 0);
          if (notifDate > today) {
            notificationService.schedulePrayerReminder(
              100 + index,
              `${prayer.name} Prayer`,
              `${prayer.name} (${prayer.nameArabic}) is in 10 minutes at ${prayer.time}`,
              notifDate
            );
          }
        });
    }
  };

  const getNextPrayer = (): string | null => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    for (const prayer of prayers) {
      const [h, m] = prayer.time.split(':').map(Number);
      if (h * 60 + m > currentMinutes) return prayer.name;
    }
    return null;
  };

  const nextPrayer = getNextPrayer();

  return (
    <IonPage>
      <AppHeader title="Prayer times" />
      <IonContent fullscreen className="sanctuary-content">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <motion.div
          className="prayer-location-bar px-4 pt-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <IonSegment
            value={city}
            onIonChange={(e) => setCity(e.detail.value as 'makkah' | 'madinah')}
          >
            <IonSegmentButton value="makkah">
              <IonLabel>Makkah</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="madinah">
              <IonLabel>Madinah</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </motion.div>

        {dateStr && (
          <div className="prayer-date">
            <IonIcon icon={timeOutline} />
            <span>{dateStr}</span>
          </div>
        )}

        <div className="prayer-city-label">
          <IonIcon icon={locationOutline} />
          <span>{city === 'makkah' ? 'Makkah al-Mukarramah' : 'Madinah al-Munawwarah'}</span>
        </div>

        {loading ? (
          <PrayerTimesSkeleton />
        ) : (
          <>
            <IonList lines="none" className="prayer-list">
              {prayers.map((prayer) => {
                const isNext = prayer.name === nextPrayer;
                return (
                  <IonCard
                    key={prayer.name}
                    className={`prayer-card ${isNext ? 'next-prayer' : ''}`}
                  >
                    <IonCardContent className="prayer-card-content">
                      <div className="prayer-icon-wrap">
                        <IonIcon icon={prayerIcons[prayer.name] || timeOutline} />
                      </div>
                      <div className="prayer-info">
                        <div className="prayer-name">{prayer.name}</div>
                        <div className="prayer-arabic">{prayer.nameArabic}</div>
                      </div>
                      <div className="prayer-time-value">
                        {prayer.time}
                        {isNext && <span className="next-badge">Next</span>}
                      </div>
                    </IonCardContent>
                  </IonCard>
                );
              })}
            </IonList>

            {!notificationsEnabled && (
              <div className="notif-prompt px-4">
                <IonButton expand="block" fill="outline" className="min-h-touch" onClick={enableNotifications}>
                  <IonIcon icon={notificationsOutline} slot="start" />
                  Enable prayer reminders
                </IonButton>
              </div>
            )}
          </>
        )}

        <div style={{ height: 32 }} />
      </IonContent>
    </IonPage>
  );
};

export default PrayerTimesPage;
