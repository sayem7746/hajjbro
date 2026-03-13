import { Preferences } from '@capacitor/preferences';

export const storageService = {
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },

  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  },

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    await Preferences.set({ key, value: JSON.stringify(value) });
  },

  async getObject<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key });
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    await Preferences.clear();
  },
};
