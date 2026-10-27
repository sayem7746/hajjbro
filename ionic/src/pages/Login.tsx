import React, { useState } from 'react';
import { IonPage, IonContent, useIonRouter } from '@ionic/react';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InscribedField from '../components/InscribedField';
import loginKaaba from '../assets/login-kaaba.jpg';

const MosqueMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M12 2.2a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4ZM4.2 20.5V11.2L6 8.4v12.1H4.2Zm15.6 0V11.2L18 8.4v12.1h1.8ZM7.2 20.5V9.6C7.2 6.6 9.3 4.2 12 4.2s4.8 2.4 4.8 5.4v10.9h-2.6v-3.6c0-.9-.7-1.6-1.6-1.6h-1.2c-.9 0-1.6.7-1.6 1.6v3.6H7.2Z"
    />
  </svg>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetNote, setResetNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useIonRouter();
  const reduceMotion = useReducedMotion();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/app/home', 'root', 'replace');
    } catch (err: unknown) {
      setError((err as Error).message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#0A1A18' } as React.CSSProperties}>
        <div className="relative min-h-full overflow-hidden bg-[#0A1A18] font-sans text-stitch-on-surface">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {/* Soft blurred layer — drifts slightly for motion-blur feel */}
            <motion.img
              src={loginKaaba}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full scale-125 object-cover blur-[14px] brightness-[0.85]"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scale: [1.28, 1.38, 1.3, 1.28],
                      x: ['0%', '-4%', '3%', '0%'],
                      y: ['0%', '2%', '-3%', '0%'],
                    }
              }
              transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
            />
            {/* Sharper layer — slow Ken Burns “video” pan */}
            <motion.img
              src={loginKaaba}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              animate={
                reduceMotion
                  ? { scale: 1.12 }
                  : {
                      scale: [1.14, 1.24, 1.18, 1.14],
                      x: ['0%', '-3.5%', '2.5%', '0%'],
                      y: ['0%', '-2%', '1.5%', '0%'],
                    }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 28, repeat: Infinity, ease: 'linear' }
              }
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A18] via-[#0A1A18]/55 to-[#0A1A18]/35" />
            <div className="absolute inset-0 bg-[#13423D]/25 mix-blend-multiply" />
            {!reduceMotion && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#FFE088]/10 to-transparent"
                animate={{
                  x: ['-40%', '40%', '-40%'],
                  opacity: [0.15, 0.35, 0.15],
                }}
                transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>

          <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col items-center justify-center px-5 py-6">
            <motion.div
              className="mb-4 flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FFE088]/35 bg-gradient-to-br from-stitch-primary to-stitch-primary-mid shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                <MosqueMark />
              </div>
              <h1 className="mb-0.5 text-2xl font-extrabold tracking-tight text-white drop-shadow-md">
                HajjBro
              </h1>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#FFE088]/90">
                The Digital Sanctuary
              </p>
            </motion.div>

            <motion.form
              onSubmit={handleLogin}
              className="w-full space-y-3 rounded-3xl border border-white/25 bg-white p-4 shadow-[0_20px_48px_rgba(0,0,0,0.35)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.06 }}
            >
              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}

              <div className="space-y-2.5">
                <InscribedField
                  id="login-email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="name@example.com"
                  autoComplete="email"
                  compact
                />
                <InscribedField
                  id="login-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  compact
                  trailing={
                    <button
                      type="button"
                      className="flex h-full w-full items-center justify-center border-0 bg-transparent p-0 text-stitch-on-variant"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-semibold text-stitch-primary/70"
                  onClick={() =>
                    setResetNote('Password reset is not available in this version. You can continue as a guest.')
                  }
                >
                  Forgot Password?
                </button>
              </div>
              {resetNote && <p className="text-xs leading-relaxed text-stitch-on-variant">{resetNote}</p>}

              <div className="space-y-2 pt-0.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-br from-stitch-primary to-stitch-primary-mid px-5 py-3 text-[15px] font-bold text-white shadow-[0_6px_18px_rgba(19,66,61,0.22)] transition-all duration-300 active:scale-[0.98] disabled:opacity-70"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
                <button
                  type="button"
                  className="w-full rounded-xl border border-stitch-primary/25 bg-transparent px-5 py-3 text-[15px] font-bold text-stitch-primary transition-all duration-300 active:scale-[0.98]"
                  onClick={() => router.push('/app/home', 'root', 'replace')}
                >
                  Continue as Guest
                </button>
              </div>

              <div className="relative flex items-center justify-center py-0.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stitch-outline/35" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-medium tracking-wide text-stitch-on-variant/45">
                  OR
                </span>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-center py-1.5 text-[15px] font-bold text-stitch-primary/75 transition-colors active:text-stitch-primary"
                onClick={() => router.push('/register')}
              >
                Register
              </button>
            </motion.form>

            <footer className="mt-4 flex flex-col items-center text-center">
              <p dir="rtl" className="mb-1 font-arabic text-lg leading-relaxed text-[#FFE088]/80">
                رَبِّ زِدْنِي عِلْمًا
              </p>
              <p className="text-[9px] font-medium uppercase tracking-widest text-white/45">
                Your companion for the sacred path
              </p>
            </footer>
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
