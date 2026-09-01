'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const { user, loading } = useAuth();

  const isAllowed = loading || !user ? true : hasPermission(user.role, pathname);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onToggleMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950">
          {!isAllowed ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-4xl shadow-xl">
                🚫
              </div>
              <div className="space-y-2 max-w-md">
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                  HTTP 403 FORBIDDEN
                </span>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Access Denied</h2>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Your account role (<strong className="text-purple-400 font-mono">{user?.role}</strong>) does not have authorization to access <code className="text-slate-200 bg-slate-900 px-2 py-0.5 rounded font-mono">{pathname}</code>.
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
