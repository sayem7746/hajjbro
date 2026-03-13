export interface User {
  id: string;
  name: string;
  email: string;
  token: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Dua {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
}

export interface Ritual {
  id: string;
  title: string;
  titleArabic: string;
  day: string;
  order: number;
  summary: string;
  description: string;
  steps: string[];
  duas: Dua[];
  location: string;
  icon: string;
}

export interface ChecklistItem {
  id: string;
  category: 'before_travel' | 'packing' | 'spiritual' | 'documents' | 'health';
  label: string;
  checked: boolean;
}

export interface HajjLocation {
  id: string;
  name: string;
  nameArabic: string;
  latitude: number;
  longitude: number;
  description: string;
  icon: string;
}

export interface PrayerTime {
  name: string;
  nameArabic: string;
  time: string;
}

export interface ProgressState {
  completedRituals: string[];
  checklist: Record<string, boolean>;
  currentDay: number;
}
