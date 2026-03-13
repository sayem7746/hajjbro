import { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { rituals } from '../data/rituals';
import { defaultChecklist } from '../data/checklist';
import { hajjLocations } from '../data/locations';
import { Ritual, ChecklistItem, HajjLocation } from '../types';

const RITUALS_KEY = 'offline_rituals';
const CHECKLIST_KEY = 'offline_checklist';
const LOCATIONS_KEY = 'offline_locations';

export function useOfflineRituals() {
  const [data, setData] = useState<Ritual[]>(rituals);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const cached = await storageService.getObject<Ritual[]>(RITUALS_KEY);
        if (cached && cached.length > 0) {
          setData(cached);
        } else {
          await storageService.setObject(RITUALS_KEY, rituals);
          setData(rituals);
        }
      } catch {
        setData(rituals);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return { rituals: data, isLoading };
}

export function useOfflineChecklist() {
  const [data, setData] = useState<ChecklistItem[]>(defaultChecklist);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const cached = await storageService.getObject<ChecklistItem[]>(CHECKLIST_KEY);
        if (cached && cached.length > 0) {
          setData(cached);
        } else {
          await storageService.setObject(CHECKLIST_KEY, defaultChecklist);
          setData(defaultChecklist);
        }
      } catch {
        setData(defaultChecklist);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return { checklist: data, isLoading };
}

export function useOfflineLocations() {
  const [data, setData] = useState<HajjLocation[]>(hajjLocations);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const cached = await storageService.getObject<HajjLocation[]>(LOCATIONS_KEY);
        if (cached && cached.length > 0) {
          setData(cached);
        } else {
          await storageService.setObject(LOCATIONS_KEY, hajjLocations);
          setData(hajjLocations);
        }
      } catch {
        setData(hajjLocations);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return { locations: data, isLoading };
}
