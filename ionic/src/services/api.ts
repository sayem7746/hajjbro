import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenStale,
  setAccessToken,
  setRefreshToken,
} from './tokenStorage';
import { storageService } from './storage';
import type { User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hajjbro-production.up.railway.app/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/** Bare client without auth interceptors — used for refresh to avoid loops. */
const bareApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

async function persistAuthPair(
  accessToken: string,
  refreshToken: string,
  rawUser?: { id: string; email: string; name?: string | null; phone?: string | null }
): Promise<void> {
  await setAccessToken(accessToken);
  await setRefreshToken(refreshToken);
  if (rawUser) {
    const existing = await storageService.getObject<User>('user');
    const user: User = {
      id: rawUser.id,
      name: rawUser.name || existing?.name || rawUser.email,
      email: rawUser.email,
      phone: rawUser.phone ?? existing?.phone ?? null,
      token: accessToken,
    };
    await storageService.setObject('user', user);
  } else {
    const existing = await storageService.getObject<User>('user');
    if (existing) {
      await storageService.setObject('user', { ...existing, token: accessToken });
    }
  }
}

/**
 * Rotate refresh token and return a fresh access token.
 * Concurrent callers share one in-flight refresh.
 */
export async function refreshSession(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await bareApi.post('/auth/refresh', { refreshToken });
      const payload = response.data?.data ?? response.data;
      const accessToken = payload.accessToken ?? payload.token;
      const nextRefresh = payload.refreshToken;
      if (!accessToken || !nextRefresh) return null;

      await persistAuthPair(accessToken, nextRefresh, payload.user);
      return accessToken as string;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/** Refresh if access token is missing/expired/near expiry. */
export async function ensureFreshAccessToken(): Promise<string | null> {
  const token = await getAccessToken();
  if (!isAccessTokenStale(token)) return token;
  return refreshSession();
}

async function forceLogoutLocal(): Promise<void> {
  await clearAuthTokens();
  if (onSessionExpired) {
    onSessionExpired();
  } else {
    window.location.href = '/login';
  }
}

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetryConfig | undefined;

    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    // Do not try to refresh the refresh/login endpoints themselves
    const url = original.url ?? '';
    if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    original._retry = true;
    const newToken = await refreshSession();
    if (!newToken) {
      await forceLogoutLocal();
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);

export type AuthProfile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  locale: string | null;
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),

  refresh: (refreshToken: string) =>
    bareApi.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string | null) =>
    bareApi.post('/auth/logout', { refreshToken }),

  getProfile: () => api.get<{ success: boolean; data: AuthProfile }>('/auth/me'),

  updateProfile: (data: { name?: string; phone?: string | null }) =>
    api.patch<{ success: boolean; data: AuthProfile }>('/auth/me', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/password', { currentPassword, newPassword }),

  deleteAccount: (password: string) =>
    api.delete('/auth/me', { data: { password } }),
};

export { persistAuthPair };

export const prayerTimesApi = {
  getTimes: (latitude: number, longitude: number, date?: string) =>
    axios.get('https://api.aladhan.com/v1/timings', {
      params: {
        latitude,
        longitude,
        method: 4, // Umm Al-Qura University, Makkah
        date: date || undefined,
      },
    }),
};

export type WeatherRange = '7d' | '30d' | '365d';

export type HajjSeasonQuery = {
  startYear?: number;
  endYear?: number;
  startMonth?: number;
  startDay?: number;
  endMonth?: number;
  endDay?: number;
};

export const weatherApi = {
  getForecast: () => api.get('/weather/forecast'),
  getForecastRange: (city: 'makkah' | 'madinah', range: WeatherRange) =>
    api.get('/weather/forecast-range', {
      params: { city, range },
      timeout: 90000,
    }),
  getHistoricalHajj: (q?: HajjSeasonQuery) =>
    api.get('/weather/historical-hajj', {
      params: {
        ...(q?.startYear != null && { startYear: q.startYear }),
        ...(q?.endYear != null && { endYear: q.endYear }),
        ...(q?.startMonth != null && { startMonth: q.startMonth }),
        ...(q?.startDay != null && { startDay: q.startDay }),
        ...(q?.endMonth != null && { endMonth: q.endMonth }),
        ...(q?.endDay != null && { endDay: q.endDay }),
      },
      timeout: 90000,
    }),
};

export default api;
