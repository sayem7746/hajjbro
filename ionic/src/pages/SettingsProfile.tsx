import React, { useEffect, useState } from 'react';
import { IonPage, IonContent, useIonRouter, useIonToast } from '@ionic/react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import InscribedField from '../components/InscribedField';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { clearAuthTokens } from '../services/tokenStorage';

const SettingsProfile: React.FC = () => {
  const router = useIonRouter();
  const [presentToast] = useIonToast();
  const { user, isAuthenticated, updateLocalUser, logout } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login', 'root', 'replace');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.name, user?.phone]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const response = await authApi.updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
      });
      const profile = response.data?.data;
      if (profile) {
        await updateLocalUser({
          name: profile.name || profile.email,
          phone: profile.phone,
          email: profile.email,
        });
      }
      await presentToast({
        message: 'Profile updated',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
    } catch (err: unknown) {
      const eObj = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(
        eObj.response?.data?.error ||
          eObj.response?.data?.message ||
          eObj.message ||
          'Could not update profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordError('');
    setPasswordSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      await clearAuthTokens();
      await logout();
      await presentToast({
        message: 'Password updated. Please sign in again.',
        duration: 2500,
        color: 'success',
        position: 'bottom',
      });
      router.push('/login', 'root', 'replace');
    } catch (err: unknown) {
      const eObj = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setPasswordError(
        eObj.response?.data?.error ||
          eObj.response?.data?.message ||
          eObj.message ||
          'Could not change password.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <IonPage>
      <AppHeader title="Edit profile" showBack defaultHref="/app/settings" />
      <IonContent fullscreen className="sanctuary-content">
        <div className="mx-auto box-border w-full max-w-lg px-5 pb-28 font-sans text-stitch-on-surface">
          <motion.form
            onSubmit={handleSaveProfile}
            className="mt-4 space-y-5 rounded-2xl bg-white px-5 py-6 shadow-ambient"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
          >
            <InscribedField
              id="profile-name"
              label="Name"
              value={name}
              onChange={setName}
              autoComplete="name"
            />
            <div>
              <p className="mb-1 ml-1 text-xs font-semibold text-stitch-primary/60">Email</p>
              <p className="rounded-lg bg-stitch-surface-low px-4 py-4 text-base text-stitch-on-variant">
                {user?.email}
              </p>
              <p className="mt-1 ml-1 text-xs text-stitch-on-variant">Email cannot be changed here.</p>
            </div>
            <InscribedField
              id="profile-phone"
              label="Phone"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="Optional"
              autoComplete="tel"
            />
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-800" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="min-h-touch w-full rounded-xl bg-gradient-to-br from-stitch-primary to-stitch-primary-mid py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </motion.form>

          <motion.form
            onSubmit={handleChangePassword}
            className="mt-6 space-y-5 rounded-2xl bg-white px-5 py-6 shadow-ambient"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.05 }}
          >
            <h2 className="text-base font-bold text-stitch-primary">Change password</h2>
            <InscribedField
              id="current-password"
              label="Current password"
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              trailing={
                <button
                  type="button"
                  className="text-stitch-on-variant"
                  onClick={() => setShowPasswords((v) => !v)}
                  aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                >
                  {showPasswords ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
            />
            <InscribedField
              id="new-password"
              label="New password"
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            <InscribedField
              id="confirm-password"
              label="Confirm new password"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {passwordError && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-800" role="alert">
                {passwordError}
              </p>
            )}
            <button
              type="submit"
              disabled={passwordSaving}
              className="min-h-touch w-full rounded-xl border border-stitch-primary/30 bg-stitch-surface-low py-3.5 text-sm font-semibold text-stitch-primary disabled:opacity-60"
            >
              {passwordSaving ? 'Updating…' : 'Update password'}
            </button>
          </motion.form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SettingsProfile;
