import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { storageService } from './storage';

const REFRESH_KEY = 'refresh_token';
const ACCESS_KEY = 'auth_token';
const USER_KEY = 'user';
const BIOMETRIC_KEY = 'biometric_lock_enabled';

let prefixReady: Promise<void> | null = null;

async function ensurePrefix(): Promise<void> {
  if (!prefixReady) {
    prefixReady = SecureStorage.setKeyPrefix('hajjbro_').catch(() => {
      // Web / unavailable — SecureStorage still works with default prefix
    });
  }
  await prefixReady;
}

export async function getAccessToken(): Promise<string | null> {
  return storageService.get(ACCESS_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  await storageService.set(ACCESS_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    await ensurePrefix();
    const value = await SecureStorage.get(REFRESH_KEY);
    return typeof value === 'string' ? value : null;
  } catch {
    // Fallback if secure storage fails (e.g. web edge cases)
    return storageService.get(REFRESH_KEY);
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    await ensurePrefix();
    await SecureStorage.set(REFRESH_KEY, token);
    await storageService.remove(REFRESH_KEY);
  } catch {
    await storageService.set(REFRESH_KEY, token);
  }
}

export async function clearAuthTokens(): Promise<void> {
  await storageService.remove(ACCESS_KEY);
  await storageService.remove(USER_KEY);
  try {
    await ensurePrefix();
    await SecureStorage.remove(REFRESH_KEY);
  } catch {
    // ignore
  }
  await storageService.remove(REFRESH_KEY);
}

export async function getBiometricLockEnabled(): Promise<boolean> {
  const value = await storageService.get(BIOMETRIC_KEY);
  return value === '1';
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await storageService.set(BIOMETRIC_KEY, '1');
  } else {
    await storageService.remove(BIOMETRIC_KEY);
  }
}

/** Returns JWT `exp` (unix seconds) or null if unreadable. */
export function getJwtExp(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** True if token is missing, expired, or expires within `skewSeconds`. */
export function isAccessTokenStale(token: string | null, skewSeconds = 120): boolean {
  if (!token) return true;
  const exp = getJwtExp(token);
  if (exp == null) return true;
  return exp * 1000 <= Date.now() + skewSeconds * 1000;
}
