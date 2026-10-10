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

export async function authenticateWithBiometrics(reason?: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
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
  }
}
