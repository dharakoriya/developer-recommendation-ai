'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, UserRole } from '../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, apiUrl, user } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('manager@devalign.ai');
  const [password, setPassword] = useState<string>('manager123');
  const [name, setName] = useState<string>('Project Manager');
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            🤖
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Already Signed In</h2>
            <p className="text-slate-400 text-sm">
              Signed in as <span className="text-white font-semibold">{user.name}</span> ({user.role})
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/dashboard"
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition text-center shadow-lg shadow-purple-600/20"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-sm transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isRegisterMode) {
        if (!name) {
          throw new Error('Please enter your full name for registration.');
        }
        const regRes = await fetch(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role }),
        });

        const regData = await regRes.json();
        if (!regRes.ok) {
          throw new Error(regData.detail || 'Registration failed');
        }

        setMessage(`Account created for ${regData.email}! Signing in...`);
      }

      // Login to obtain JWT token
      const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.detail || 'Invalid email or password');
      }

      login(loginData.access_token, loginData.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 selection:bg-purple-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-3 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
          <span>⚡</span>
          <span>DevAlign AI Platform v1.0</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {isRegisterMode ? 'Create Account' : 'Sign In to DevAlign AI'}
        </h1>
        <p className="text-sm text-slate-400">
          Explainable Developer Recommendation & Workload Balancing Engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
              <span className="text-base">⚠️</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {message && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-3">
              <span className="text-base">✓</span>
              <div className="flex-1 font-medium">{message}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Manager"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@devalign.ai"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-mono pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white transition px-2 py-1"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  User Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                >
                  <option value="MANAGER">MANAGER (Project & Team Lead)</option>
                  <option value="ADMIN">ADMIN (System Administrator)</option>
                  <option value="DEVELOPER">DEVELOPER (Engineer Profile)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{isRegisterMode ? 'Create & Sign In' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Preset Demo Accounts Shortcut */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="block text-[11px] uppercase font-mono font-semibold text-slate-500 text-center">
              Quick Demo Accounts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setEmail('manager@devalign.ai');
                  setPassword('manager123');
                  setIsRegisterMode(false);
                }}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/50 text-slate-300 transition text-left"
              >
                <span className="text-purple-400 block font-bold text-[10px]">MANAGER</span>
                <span>manager@devalign.ai</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@devalign.ai');
                  setPassword('admin123');
                  setIsRegisterMode(false);
                }}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-slate-300 transition text-left"
              >
                <span className="text-blue-400 block font-bold text-[10px]">ADMIN</span>
                <span>admin@devalign.ai</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
                setMessage(null);
              }}
              className="text-xs text-slate-400 hover:text-purple-400 transition"
            >
              {isRegisterMode
                ? 'Already have an account? Sign in here'
                : "Need a new account? Register here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
