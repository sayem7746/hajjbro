import React, { useCallback, useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonToggle,
  useIonRouter,
  useIonAlert,
  useIonLoading,
} from '@ionic/react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  LogOut,
  Trash2,
  UserRound,
  Shield,
  Fingerprint,
  ChartNoAxesColumn,
} from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { clearAuthTokens, getBiometricLockEnabled, setBiometricLockEnabled } from '../services/tokenStorage';
import {
  authenticateWithBiometrics,
  checkBiometricAvailability,
} from '../services/biometric';

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const Settings: React.FC = () => {
  const router = useIonRouter();
  const [presentAlert] = useIonAlert();
  const [presentLoading, dismissLoading] = useIonLoading();
  const { user, isAuthenticated, isLoading, logout, refreshProfile } = useAuth();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [biometricOn, setBiometricOn] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

  useEffect(() => {
    void (async () => {
      const avail = await checkBiometricAvailability();
      setBiometricAvailable(avail.isAvailable);
      setBiometricLabel(avail.label);
      setBiometricOn(await getBiometricLockEnabled());
    })();
  }, []);

  const onToggleBiometric = useCallback(
    async (checked: boolean) => {
      if (checked) {
        const ok = await authenticateWithBiometrics(`Enable ${biometricLabel} lock`);
        if (!ok) return;
        await setBiometricLockEnabled(true);
        setBiometricOn(true);
      } else {
        await setBiometricLockEnabled(false);
        setBiometricOn(false);
      }
    },
    [biometricLabel]
  );

  const handleLogout = () => {
    presentAlert({
      header: 'Log out?',
      message: 'You will need to sign in again on this device.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Log out',
          role: 'destructive',
          handler: () => {
            void (async () => {
              await logout();
              router.push('/login', 'root', 'replace');
            })();
          },
        },
      ],
    });
  };

  const handleDeleteAccount = () => {
    presentAlert({
      header: 'Delete account',
      message:
        'This permanently deletes your account, progress, and kafela memberships. Type DELETE and enter your password.',
      inputs: [
        {
          name: 'confirm',
          type: 'text',
          placeholder: 'Type DELETE',
        },
        {
          name: 'password',
          type: 'password',
          placeholder: 'Current password',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete forever',
          role: 'destructive',
          handler: (data) => {
            const confirm = String(data?.confirm ?? '').trim();
            const password = String(data?.password ?? '');
            if (confirm !== 'DELETE') {
              presentAlert({
                header: 'Confirmation required',
                message: 'Please type DELETE exactly to confirm.',
                buttons: ['OK'],
              });
              return false;
            }
            if (!password) {
              presentAlert({
                header: 'Password required',
                message: 'Enter your password to delete your account.',
                buttons: ['OK'],
              });
              return false;
            }
            void (async () => {
              await presentLoading({ message: 'Deleting account…' });
              try {
                await authApi.deleteAccount(password);
                await clearAuthTokens();
                await logout();
                router.push('/login', 'root', 'replace');
              } catch (err: unknown) {
                const e = err as {
                  response?: { data?: { error?: string; message?: string } };
                  message?: string;
                };
                presentAlert({
                  header: 'Could not delete account',
                  message:
                    e.response?.data?.error ||
                    e.response?.data?.message ||
                    e.message ||
                    'Something went wrong.',
                  buttons: ['OK'],
                });
              } finally {
                await dismissLoading();
              }
            })();
            return true;
          },
        },
      ],
    });
  };

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'G';

  return (
    <IonPage>
      <AppHeader title="Settings" showBack defaultHref="/app/home" />
      <IonContent fullscreen className="sanctuary-content">
        <div className="mx-auto box-border w-full max-w-lg overflow-x-hidden px-5 pb-28 font-sans text-stitch-on-surface">
          {isLoading ? (
            <p className="mt-8 text-center text-sm text-stitch-on-variant">Loading…</p>
          ) : !isAuthenticated || !user ? (
            <motion.section className="mt-8 rounded-2xl bg-stitch-surface-low px-5 py-8 text-center shadow-ambient" {...fadeUp}>
              <p className="mb-4 text-sm text-stitch-on-variant">
                Sign in to manage your profile, security, and account.
              </p>
              <button
                type="button"
                onClick={() => router.push('/login', 'root', 'replace')}
                className="min-h-touch rounded-xl bg-gradient-to-br from-stitch-primary to-stitch-primary-mid px-6 py-3 text-sm font-semibold text-white"
              >
                Sign in
              </button>
            </motion.section>
          ) : (
            <>
              <motion.section
                className="mt-4 flex items-center gap-4 rounded-2xl bg-white px-5 py-5 shadow-ambient"
                {...fadeUp}
                transition={{ duration: 0.32 }}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border-soft bg-stitch-surface-low text-xl font-bold text-stitch-primary">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-stitch-primary">{user.name}</p>
                  <p className="truncate text-sm text-stitch-on-variant">{user.email}</p>
                  {user.phone ? (
                    <p className="truncate text-sm text-stitch-on-variant">{user.phone}</p>
                  ) : null}
                </div>
              </motion.section>

              <motion.section
                className="mt-6 overflow-hidden rounded-2xl bg-white shadow-ambient"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.04 }}
              >
                <p className="px-5 pt-4 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stitch-on-variant">
                  Account
                </p>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-stitch-surface-low"
                  onClick={() => router.push('/app/settings/profile', 'forward', 'push')}
                >
                  <UserRound className="h-5 w-5 text-stitch-primary" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-stitch-on-surface">Edit profile</span>
                  <ChevronRight className="h-4 w-4 text-stitch-on-variant" aria-hidden />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-t border-border-soft/60 px-5 py-4 text-left active:bg-stitch-surface-low"
                  onClick={() => router.push('/app/progress', 'forward', 'push')}
                >
                  <ChartNoAxesColumn className="h-5 w-5 text-stitch-primary" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-stitch-on-surface">Journey progress</span>
                  <ChevronRight className="h-4 w-4 text-stitch-on-variant" aria-hidden />
                </button>
              </motion.section>

              {biometricAvailable && (
                <motion.section
                  className="mt-4 overflow-hidden rounded-2xl bg-white shadow-ambient"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.06 }}
                >
                  <p className="px-5 pt-4 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stitch-on-variant">
                    Security
                  </p>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <Fingerprint className="h-5 w-5 text-stitch-primary" strokeWidth={1.75} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stitch-on-surface">{biometricLabel} lock</p>
                      <p className="text-xs text-stitch-on-variant">
                        Require {biometricLabel} when opening the app
                      </p>
                    </div>
                    <IonToggle
                      checked={biometricOn}
                      onIonChange={(e) => void onToggleBiometric(e.detail.checked)}
                      aria-label={`Toggle ${biometricLabel} lock`}
                    />
                  </div>
                  <div className="flex items-start gap-3 border-t border-border-soft/60 px-5 py-3">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-stitch-on-variant" aria-hidden />
                    <p className="text-xs leading-relaxed text-stitch-on-variant">
                      You stay signed in for up to 90 days of inactivity. Biometrics only unlock the
                      app; they do not replace your password.
                    </p>
                  </div>
                </motion.section>
              )}

              <motion.section
                className="mt-4 overflow-hidden rounded-2xl bg-white shadow-ambient"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.08 }}
              >
                <p className="px-5 pt-4 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stitch-on-variant">
                  Session
                </p>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-stitch-surface-low"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 text-stitch-primary" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-stitch-on-surface">Log out</span>
                </button>
              </motion.section>

              <motion.section
                className="mt-4 overflow-hidden rounded-2xl bg-white shadow-ambient"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.1 }}
              >
                <p className="px-5 pt-4 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-red-700/70">
                  Danger zone
                </p>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-red-50"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="h-5 w-5 text-red-700" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-red-800">Delete account</span>
                </button>
              </motion.section>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Settings;
