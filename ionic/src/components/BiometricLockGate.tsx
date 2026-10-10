import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Fingerprint } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authenticateWithBiometrics, checkBiometricAvailability } from '../services/biometric';
import { getBiometricLockEnabled } from '../services/tokenStorage';

const BiometricLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');
  const promptedRef = useRef(false);

  const shouldLock = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !isAuthenticated) return false;
    const enabled = await getBiometricLockEnabled();
    if (!enabled) return false;
    const { isAvailable } = await checkBiometricAvailability();
    return isAvailable;
  }, [isAuthenticated]);

  const tryUnlock = useCallback(async () => {
    setUnlocking(true);
    setError('');
    const ok = await authenticateWithBiometrics('Unlock HajjBro');
    setUnlocking(false);
    if (ok) {
      setLocked(false);
      setError('');
    } else {
      setError('Authentication failed. Try again.');
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void (async () => {
      const lock = await shouldLock();
      setLocked(lock);
      if (lock && !promptedRef.current) {
        promptedRef.current = true;
        setTimeout(() => {
          void tryUnlock();
        }, 250);
      }
      if (!lock) {
        promptedRef.current = false;
      }
    })();
  }, [isLoading, shouldLock, tryUnlock]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let wasBackground = false;
    const sub = CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        wasBackground = true;
        return;
      }
      if (!wasBackground || !isAuthenticated) return;
      wasBackground = false;
      if (await shouldLock()) {
        setLocked(true);
        setError('');
      }
    });

    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, [isAuthenticated, shouldLock]);

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-stitch-bg px-8 font-sans text-stitch-on-surface"
        role="dialog"
        aria-modal="true"
        aria-label="App locked"
      >
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-stitch-primary to-stitch-primary-mid shadow-[0_8px_32px_rgba(19,66,61,0.12)]">
          <Fingerprint className="h-8 w-8 text-white" aria-hidden />
        </div>
        <h1 className="mb-2 text-2xl font-extrabold text-stitch-primary">HajjBro is locked</h1>
        <p className="mb-8 max-w-xs text-center text-sm text-stitch-on-variant">
          Use biometrics or your device passcode to continue. Your session stays signed in.
        </p>
        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={unlocking}
          onClick={() => void tryUnlock()}
          className="min-h-touch w-full max-w-xs rounded-xl bg-gradient-to-br from-stitch-primary to-stitch-primary-mid px-6 py-3.5 text-sm font-semibold text-white shadow-ambient disabled:opacity-60"
        >
          {unlocking ? 'Authenticating…' : 'Unlock'}
        </button>
      </div>
    </>
  );
};

export default BiometricLockGate;
