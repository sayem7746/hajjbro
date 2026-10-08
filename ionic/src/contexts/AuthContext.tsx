import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthState } from '../types';
import { storageService } from '../services/storage';
import { authApi } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await storageService.getObject<User>('user');
      const token = await storageService.get('auth_token');
      if (user && token) {
        setState({ user, isAuthenticated: true, isLoading: false });
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const payload = response.data?.data ?? response.data;
      const token = payload.accessToken ?? payload.token;
      const rawUser = payload.user;
      if (!token || !rawUser) {
        throw new Error('Invalid login response from server');
      }
      const user: User = {
        id: rawUser.id,
        name: rawUser.name || rawUser.email,
        email: rawUser.email,
        token,
      };
      await storageService.set('auth_token', token);
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
      const rawUser = payload.user;
      if (!token || !rawUser) {
        throw new Error('Invalid registration response from server');
      }
      const user: User = {
        id: rawUser.id,
        name: rawUser.name || name,
        email: rawUser.email,
        token,
      };
      await storageService.set('auth_token', token);
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
    await storageService.remove('auth_token');
    await storageService.remove('user');
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
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
