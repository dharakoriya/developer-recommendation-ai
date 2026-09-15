'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../app/context/AuthContext';
import { hasPermission } from '../lib/permissions';
import { RuntimeAuthDebug } from './RuntimeAuthDebug';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 animate-pulse">
            Authenticating workspace session...
          </p>
        </div>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Session unauthenticated. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  const isAllowed = !user ? false : hasPermission(user.role, pathname);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <Header onToggleMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          {!isAllowed ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-4xl shadow-xl">
                🚫
              </div>
              <div className="space-y-2 max-w-md">
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                  HTTP 403 FORBIDDEN
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Access Denied</h2>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                  Your account role (<strong className="text-purple-600 dark:text-purple-400 font-mono">{user?.role}</strong>) does not have authorization to access <code className="text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded font-mono">{pathname}</code>.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-purple-600/20"
              >
                Return to Workspace Dashboard
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <RuntimeAuthDebug />
    </div>
  );
};
