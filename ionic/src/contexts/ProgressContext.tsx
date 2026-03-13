import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ProgressState } from '../types';
import { storageService } from '../services/storage';

const STORAGE_KEY = 'hajj_progress';

const defaultProgress: ProgressState = {
  completedRituals: [],
  checklist: {},
  currentDay: 1,
};

interface ProgressContextType {
  progress: ProgressState;
  toggleRitual: (ritualId: string) => void;
  toggleChecklistItem: (itemId: string) => void;
  setCurrentDay: (day: number) => void;
  resetProgress: () => void;
  isRitualComplete: (ritualId: string) => boolean;
  isChecklistItemComplete: (itemId: string) => boolean;
  completedRitualCount: number;
  totalChecklistComplete: number;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<ProgressState>(defaultProgress);

  useEffect(() => {
    loadProgress();
  }, []);

  useEffect(() => {
    storageService.setObject(STORAGE_KEY, progress);
  }, [progress]);

  const loadProgress = async () => {
    const saved = await storageService.getObject<ProgressState>(STORAGE_KEY);
    if (saved) {
      setProgress(saved);
    }
  };

  const toggleRitual = useCallback((ritualId: string) => {
    setProgress((prev) => {
      const completed = prev.completedRituals.includes(ritualId)
        ? prev.completedRituals.filter((id) => id !== ritualId)
        : [...prev.completedRituals, ritualId];
      return { ...prev, completedRituals: completed };
    });
  }, []);

  const toggleChecklistItem = useCallback((itemId: string) => {
    setProgress((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [itemId]: !prev.checklist[itemId],
      },
    }));
  }, []);

  const setCurrentDay = useCallback((day: number) => {
    setProgress((prev) => ({ ...prev, currentDay: day }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(defaultProgress);
  }, []);

  const isRitualComplete = useCallback(
    (ritualId: string) => progress.completedRituals.includes(ritualId),
    [progress.completedRituals]
  );

  const isChecklistItemComplete = useCallback(
    (itemId: string) => !!progress.checklist[itemId],
    [progress.checklist]
  );

  const completedRitualCount = progress.completedRituals.length;
  const totalChecklistComplete = Object.values(progress.checklist).filter(Boolean).length;

  return (
    <ProgressContext.Provider
      value={{
        progress,
        toggleRitual,
        toggleChecklistItem,
        setCurrentDay,
        resetProgress,
        isRitualComplete,
        isChecklistItemComplete,
        completedRitualCount,
        totalChecklistComplete,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = (): ProgressContextType => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};
