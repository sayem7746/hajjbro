import { useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { kafelaApi } from '../services/kafelaApi';

const MOVING_INTERVAL_MS = 20_000;
const STILL_INTERVAL_MS = 120_000;
const MOVE_THRESHOLD_M = 25;

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Foreground location sharing while the kafela screen/map is mounted
 * and the member has sharing enabled.
 */
export function useKafelaLocationSharing(
  kafelaId: string | null | undefined,
  sharingEnabled: boolean
): void {
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    if (!kafelaId || !sharingEnabled) return;

    const clearTimer = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };

    const tick = async () => {
      if (stopped.current || !kafelaId) return;
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        await kafelaApi.upsertLocation(kafelaId, {
          latitude: lat,
          longitude: lng,
          accuracy: accuracy ?? null,
        });

        const prev = lastPos.current;
        const moving =
          !prev || haversineMeters(prev, { lat, lng }) >= MOVE_THRESHOLD_M;
        lastPos.current = { lat, lng };

        if (!stopped.current) {
          timer.current = setTimeout(tick, moving ? MOVING_INTERVAL_MS : STILL_INTERVAL_MS);
        }
      } catch {
        if (!stopped.current) {
          timer.current = setTimeout(tick, STILL_INTERVAL_MS);
        }
      }
    };

    void tick();

    return () => {
      stopped.current = true;
      clearTimer();
    };
  }, [kafelaId, sharingEnabled]);
}
