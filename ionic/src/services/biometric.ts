import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

export type BiometricAvailability = {
  isAvailable: boolean;
  label: string;
};

export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  if (!Capacitor.isNativePlatform()) {
    return { isAvailable: false, label: 'Biometrics' };
  }
  try {
    const result = await BiometricAuth.checkBiometry();
    const label = biometryLabel(result.biometryType);
    return { isAvailable: result.isAvailable, label };
  } catch {
    return { isAvailable: false, label: 'Biometrics' };
  }
}

function biometryLabel(type: BiometryType): string {
  switch (type) {
    case BiometryType.faceId:
      return 'Face ID';
    case BiometryType.touchId:
      return 'Touch ID';
    case BiometryType.fingerprintAuthentication:
      return 'Fingerprint';
    case BiometryType.faceAuthentication:
      return 'Face unlock';
    case BiometryType.irisAuthentication:
      return 'Iris';
    default:
      return 'Biometrics';
  }
}

/** Face ID / passcode UI resigns the app active state. Ignore lock-on-resume until this time. */
let suppressRelockUntil = 0;

export function shouldSuppressBiometricRelock(): boolean {
  return Date.now() < suppressRelockUntil;
}

function suppressRelockFor(ms: number) {
  suppressRelockUntil = Date.now() + ms;
}

export async function authenticateWithBiometrics(reason?: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  // Cover the whole system prompt. iOS fires appStateChange while Face ID is up.
  suppressRelockFor(60_000);
  try {
    await BiometricAuth.authenticate({
      reason: reason ?? 'Unlock HajjBro',
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      androidTitle: 'Unlock HajjBro',
      androidSubtitle: reason ?? 'Confirm it is you',
    });
    return true;
  } catch {
    return false;
  } finally {
    // The resume event can arrive just after the prompt closes.
    suppressRelockFor(1_500);
  }
}
