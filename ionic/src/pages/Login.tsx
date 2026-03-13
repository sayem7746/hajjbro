import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonIcon,
  useIonRouter,
} from '@ionic/react';
import { logInOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useIonRouter();

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

  const handleSkip = () => {
    router.push('/app/home', 'root', 'replace');
  };

  return (
    <IonPage>
      <IonContent className="auth-content" fullscreen>
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="logo-circle">
                <IonIcon icon={logInOutline} />
              </div>
            </div>
            <h1 className="auth-title">HajjBro</h1>
            <p className="auth-subtitle">Your Hajj Companion</p>
            <p className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            {error && (
              <div className="auth-error">
                <IonText color="danger">{error}</IonText>
              </div>
            )}

            <div className="input-group">
              <IonInput
                type="email"
                label="Email"
                labelPlacement="floating"
                fill="outline"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value || '')}
                className="auth-input"
              />
            </div>

            <div className="input-group password-group">
              <IonInput
                type={showPassword ? 'text' : 'password'}
                label="Password"
                labelPlacement="floating"
                fill="outline"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value || '')}
                className="auth-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
              </button>
            </div>

            <IonButton
              expand="block"
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Sign In'}
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              className="auth-button-secondary"
              onClick={handleSkip}
            >
              Continue as Guest
            </IonButton>

            <div className="auth-footer">
              <IonText>
                Don&apos;t have an account?{' '}
                <span className="auth-link" onClick={() => router.push('/register')}>
                  Register
                </span>
              </IonText>
            </div>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
