import React, { useState } from 'react';
import { IonPage, IonContent, useIonRouter } from '@ionic/react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InscribedField from '../components/InscribedField';

const MosqueMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M12 2.2a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4ZM4.2 20.5V11.2L6 8.4v12.1H4.2Zm15.6 0V11.2L18 8.4v12.1h1.8ZM7.2 20.5V9.6C7.2 6.6 9.3 4.2 12 4.2s4.8 2.4 4.8 5.4v10.9h-2.6v-3.6c0-.9-.7-1.6-1.6-1.6h-1.2c-.9 0-1.6.7-1.6 1.6v3.6H7.2Z"
    />
  </svg>
);

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useIonRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      router.push('/app/home', 'root', 'replace');
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="sanctuary-content">
        <div className="relative min-h-full overflow-hidden bg-stitch-bg font-sans text-stitch-on-surface">
          <div className="pointer-events-none absolute -right-[10%] -top-[10%] h-[400px] w-[400px] rounded-full bg-stitch-primary/5 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-[10%] -left-[10%] h-[300px] w-[300px] rounded-full bg-stitch-gold/10 blur-[90px]" />

          <main className="relative z-10 mx-auto flex w-full max-w-[420px] flex-col items-center px-8 py-12">
            <motion.div
              className="mb-10 flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-stitch-primary to-stitch-primary-mid shadow-[0_8px_32px_rgba(19,66,61,0.12)]">
                <MosqueMark />
              </div>
              <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-stitch-primary">Create Account</h1>
              <p className="text-sm font-medium uppercase tracking-wide text-stitch-on-variant/80">
                The Digital Sanctuary
              </p>
            </motion.div>

            <motion.form
              onSubmit={handleRegister}
              className="w-full space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.06 }}
            >
              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}

              <div className="space-y-4">
                <InscribedField
                  id="register-name"
                  label="Full Name"
                  value={name}
                  onChange={setName}
                  placeholder="Your name"
                  autoComplete="name"
                />
                <InscribedField
                  id="register-email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
                <div className="relative">
                  <InscribedField
                    id="register-password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute bottom-1 right-1 flex h-12 w-12 items-center justify-center text-stitch-on-variant"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <InscribedField
                  id="register-confirm"
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-br from-stitch-primary to-stitch-primary-mid px-6 py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(19,66,61,0.15)] transition-all duration-300 active:scale-[0.98] disabled:opacity-70"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
                <button
                  type="button"
                  className="w-full rounded-xl bg-stitch-surface-high px-6 py-4 text-base font-bold text-stitch-primary transition-all duration-300 active:scale-[0.98]"
                  onClick={() => router.push('/app/home', 'root', 'replace')}
                >
                  Continue as Guest
                </button>
              </div>

              <div className="relative flex items-center justify-center py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stitch-outline/30" />
                </div>
                <span className="relative bg-stitch-bg px-4 text-xs font-medium text-stitch-on-variant/50">OR</span>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-center rounded-xl border border-stitch-outline/50 bg-transparent px-6 py-4 text-base font-bold text-stitch-on-surface transition-all duration-300"
                onClick={() => router.push('/login')}
              >
                Sign In
              </button>
            </motion.form>
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
