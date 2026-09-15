'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'ADMIN' | 'MANAGER' | 'DEVELOPER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  apiUrl: string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const refreshUser = async () => {
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem('devalign_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.ok) {
        const validUser: User = await res.json();
        setUser(validUser);
        setToken(storedToken);
        localStorage.setItem('devalign_user', JSON.stringify(validUser));
      } else {
        localStorage.removeItem('devalign_token');
        localStorage.removeItem('devalign_user');
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Session validation error:', err);
      const storedUser = localStorage.getItem('devalign_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch {
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('devalign_token', newToken);
      localStorage.setItem('devalign_user', JSON.stringify(newUser));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('devalign_token');
      localStorage.removeItem('devalign_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  };

  useEffect(() => {
    refreshUser();

    const handleAuthLogout = () => {
      setToken(null);
      setUser(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'devalign_token' && !e.newValue) {
        handleAuthLogout();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:logout', handleAuthLogout);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:logout', handleAuthLogout);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [apiUrl]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, apiUrl, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
