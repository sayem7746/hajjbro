import axios from 'axios';
import { storageService } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hajjbro-production.up.railway.app/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await storageService.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storageService.remove('auth_token');
      await storageService.remove('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),

  getProfile: () => api.get('/auth/profile'),
};

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
