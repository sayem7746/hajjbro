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
import { personAddOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

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
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
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
      <IonContent className="auth-content" fullscreen>
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="logo-circle">
                <IonIcon icon={personAddOutline} />
              </div>
            </div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join your Hajj journey</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            {error && (
              <div className="auth-error">
                <IonText color="danger">{error}</IonText>
              </div>
            )}

            <div className="input-group">
              <IonInput
                type="text"
                label="Full Name"
                labelPlacement="floating"
                fill="outline"
                value={name}
                onIonInput={(e) => setName(e.detail.value || '')}
                className="auth-input"
              />
            </div>

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

            <div className="input-group">
              <IonInput
                type="password"
                label="Confirm Password"
                labelPlacement="floating"
                fill="outline"
                value={confirmPassword}
                onIonInput={(e) => setConfirmPassword(e.detail.value || '')}
                className="auth-input"
              />
            </div>

            <IonButton
              expand="block"
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Create Account'}
            </IonButton>

            <div className="auth-footer">
              <IonText>
                Already have an account?{' '}
                <span className="auth-link" onClick={() => router.push('/login')}>
                  Sign In
                </span>
              </IonText>
            </div>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
