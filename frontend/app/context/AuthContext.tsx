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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    // Check localStorage for existing session
    const storedToken = localStorage.getItem('devalign_token');
    const storedUser = localStorage.getItem('devalign_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token with backend
        fetch(`${apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
          .then((res) => {
            if (res.ok) {
              return res.json();
            }
            throw new Error('Session expired');
          })
          .then((validUser) => {
            setUser(validUser);
            localStorage.setItem('devalign_user', JSON.stringify(validUser));
          })
          .catch(() => {
            logout();
          })
          .finally(() => setLoading(false));
      } catch {
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [apiUrl]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('devalign_token', newToken);
    localStorage.setItem('devalign_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('devalign_token');
    localStorage.removeItem('devalign_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, apiUrl }}>
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
