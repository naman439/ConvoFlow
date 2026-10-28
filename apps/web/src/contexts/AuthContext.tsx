'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types/index';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchCurrentUser = async () => {
    try {
      const data = await api.get<{ user: User } | User>('/auth/me');
      const currentUser = (data as any)?.user || data;
      setUser(currentUser);
      localStorage.setItem('convoflow_user', JSON.stringify(currentUser));
    } catch {
      setUser(null);
      api.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('convoflow_access_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', { email, password });

      api.setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      localStorage.setItem('convoflow_user', JSON.stringify(data.user));
      router.push('/chat');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    displayName: string,
  ) => {
    setIsLoading(true);
    try {
      const data = await api.post<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>('/auth/register', { email, username, password, displayName });

      api.setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      localStorage.setItem('convoflow_user', JSON.stringify(data.user));
      router.push('/chat');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('convoflow_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => null);
      }
    } finally {
      api.clearTokens();
      setUser(null);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
