'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, apiUrl, user } = useAuth();

  const [email, setEmail] = useState<string>('admin@devalign.ai');
  const [password, setPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, show polished logged in banner
  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 selection:bg-purple-500 selection:text-white transition-colors duration-300">
        {/* Ambient Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/15 dark:bg-purple-600/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-md w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-purple-500/5 dark:shadow-black/40">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-lg shadow-purple-600/30 text-white font-black">
            D
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Active Session Found</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Currently signed in as <span className="text-purple-600 dark:text-purple-400 font-bold">{user.name}</span>
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-mono font-bold mt-1">
              <span>ROLE:</span>
              <span>{user.role}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/dashboard"
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition text-center shadow-lg shadow-purple-600/25 cursor-pointer"
            >
              Go to Dashboard →
            </Link>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-semibold py-3 px-4 rounded-xl text-sm transition border border-slate-200 dark:border-slate-700 cursor-pointer"
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

    try {
      const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.detail || 'Invalid email or password');
      }

      login(loginData.access_token, loginData.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-purple-500 selection:text-white transition-colors duration-300">
      {/* Background Decorative Mesh Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-500/5 dark:bg-purple-900/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 my-auto">
        {/* Left Column: Brand Hero & Value Propositions */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-bold tracking-tight">DEVAlign AI v1.0.0</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Enterprise Engine</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-purple-600/30">
                D
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                DEVAlign <span className="bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">AI</span>
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Intelligent Workload & <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-400 bg-clip-text text-transparent">
                XAI Decision Engine
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
              Harmonize developer skills, capacity pressure, and project milestones through transparent, explainable machine learning.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-start gap-3">
              <span className="text-xl p-2 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300">⚡</span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">3-Tier Match Engine</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">SHAP-driven skill & capacity ranking</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-start gap-3">
              <span className="text-xl p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300">📈</span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Burnout Prevention</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Real-time capacity & workload monitoring</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-start gap-3">
              <span className="text-xl p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">⏱️</span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Live Execution Timer</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Precision tracking & incentive points</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-start gap-3">
              <span className="text-xl p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300">🛡️</span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Enterprise RBAC</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Admin provisioning & access controls</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Premium Glassmorphism Login Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-purple-500/10 dark:shadow-black/60 space-y-6">
            {/* Card Header */}
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Sign In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your credentials to access your enterprise workspace
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in duration-200">
                <span className="text-base shrink-0">⚠️</span>
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Work Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">✉️</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@devalign.ai"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition cursor-pointer"
                  >
                    {showPassword ? 'Hide Password' : 'Show Password'}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500/40 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                  <span>Remember my session</span>
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Secure JWT</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-xl shadow-purple-600/25 flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Accounts Preset */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400 dark:text-slate-500">
                  Quick Demo Accounts (1-Click)
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Auto-Fill</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Admin Preset */}
                <button
                  type="button"
                  onClick={() => setPreset('admin@devalign.ai', 'admin123')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    email === 'admin@devalign.ai'
                      ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 shadow-sm'
                      : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black font-mono text-purple-600 dark:text-purple-400">ADMIN</span>
                    <span className="text-[11px]">👑</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-1">admin@devalign.ai</span>
                </button>

                {/* Manager Preset */}
                <button
                  type="button"
                  onClick={() => setPreset('manager@devalign.ai', 'manager123')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    email === 'manager@devalign.ai'
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black font-mono text-blue-600 dark:text-blue-400">MANAGER</span>
                    <span className="text-[11px]">💼</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-1">manager@devalign.ai</span>
                </button>

                {/* Developer Preset */}
                <button
                  type="button"
                  onClick={() => setPreset('alice@devalign.ai', 'dev123')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    email === 'alice@devalign.ai'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-400">DEV</span>
                    <span className="text-[11px]">💻</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-1">alice@devalign.ai</span>
                </button>
              </div>
            </div>

            {/* Enterprise Provisioning Notice */}
            <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/60">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 leading-normal">
                <span>🔒</span>
                <span>Protected Enterprise Access • Managed by System Administrator</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
