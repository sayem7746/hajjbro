import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { User, AuthState } from '../types';
import { storageService } from '../services/storage';
import {
  authApi,
  ensureFreshAccessToken,
  persistAuthPair,
  setOnSessionExpired,
} from '../services/api';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
} from '../services/tokenStorage';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalUser: (patch: Partial<Pick<User, 'name' | 'email' | 'phone'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(
  rawUser: { id: string; email: string; name?: string | null; phone?: string | null },
  token: string,
  fallbackName?: string
): User {
  return {
    id: rawUser.id,
    name: rawUser.name || fallbackName || rawUser.email,
    email: rawUser.email,
    phone: rawUser.phone ?? null,
    token,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const clearSessionState = useCallback(() => {
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  useEffect(() => {
    setOnSessionExpired(() => {
      clearSessionState();
      window.location.href = '/login';
    });
    return () => setOnSessionExpired(null);
  }, [clearSessionState]);

  const loadUser = useCallback(async () => {
    try {
      const user = await storageService.getObject<User>('user');
      const token = await getAccessToken();
      const refresh = await getRefreshToken();

      if (!user || (!token && !refresh)) {
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const fresh = await ensureFreshAccessToken();
      if (!fresh) {
        await clearAuthTokens();
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const latest = (await storageService.getObject<User>('user')) ?? {
        ...user,
        token: fresh,
      };
      setState({ user: latest, isAuthenticated: true, isLoading: false });
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void ensureFreshAccessToken();
      }
    });

    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const payload = response.data?.data ?? response.data;
      const token = payload.accessToken ?? payload.token;
      const refreshToken = payload.refreshToken;
      const rawUser = payload.user;
      if (!token || !rawUser) {
        throw new Error('Invalid login response from server');
      }
      if (refreshToken) {
        await persistAuthPair(token, refreshToken, rawUser);
      } else {
        await storageService.set('auth_token', token);
      }
      const user = toUser(rawUser, token);
      await storageService.setObject('user', user);
      setState({ user, isAuthenticated: true, isLoading: false });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
      throw new Error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Login failed. Please try again.'
      );
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const response = await authApi.register(name, email, password);
      const payload = response.data?.data ?? response.data;
      const token = payload.accessToken ?? payload.token;
      const refreshToken = payload.refreshToken;
      const rawUser = payload.user;
      if (!token || !rawUser) {
        throw new Error('Invalid registration response from server');
      }
      if (refreshToken) {
        await persistAuthPair(token, refreshToken, rawUser);
      } else {
        await storageService.set('auth_token', token);
      }
      const user = toUser(rawUser, token, name);
      await storageService.setObject('user', user);
      setState({ user, isAuthenticated: true, isLoading: false });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
      throw new Error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Registration failed. Please try again.'
      );
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      await authApi.logout(refreshToken);
    } catch {
      // still clear local session
    }
    await clearAuthTokens();
    clearSessionState();
  }, [clearSessionState]);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await authApi.getProfile();
      const profile = response.data?.data;
      if (!profile) return;
      const token = (await getAccessToken()) ?? '';
      setState((prev) => {
        const merged = toUser(profile, token, prev.user?.name);
        const user: User = {
          ...merged,
          name: profile.name || prev.user?.name || merged.email,
          phone: profile.phone !== undefined ? profile.phone : prev.user?.phone ?? null,
        };
        void storageService.setObject('user', user);
        return {
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
        };
      });
    } catch {
      // keep cached user
    }
  }, []);

  const updateLocalUser = useCallback(
    async (patch: Partial<Pick<User, 'name' | 'email' | 'phone'>>) => {
      setState((prev) => {
        if (!prev.user) return prev;
        const next = { ...prev.user, ...patch };
        void storageService.setObject('user', next);
        return { ...prev, user: next };
      });
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, refreshProfile, updateLocalUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
