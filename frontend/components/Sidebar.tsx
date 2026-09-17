'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../app/context/AuthContext';
import { getFilteredNavigation } from '../lib/navigation';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const { main: mainNav, research: researchNav, admin: adminNav = [] } = getFilteredNavigation(user?.role);

  const allItems = [...mainNav, ...researchNav, ...adminNav];

  const getActiveHref = (): string | null => {
    let bestMatch: string | null = null;
    let maxLength = -1;

    for (const item of allItems) {
      if (item.href === '/dashboard' && pathname === '/') {
        return item.href;
      }
      if (pathname === item.href) {
        if (item.href.length > maxLength) {
          maxLength = item.href.length;
          bestMatch = item.href;
        }
      } else if (pathname.startsWith(item.href + '/')) {
        if (item.href.length > maxLength) {
          maxLength = item.href.length;
          bestMatch = item.href;
        }
      }
    }
    return bestMatch;
  };

  const activeHref = getActiveHref();

  const isActive = (href: string) => {
    return activeHref === href;
  };

  const navContent = (
    <div className="flex flex-col h-full max-h-screen bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 w-64 transition-colors duration-200 select-none">
      {/* Fixed Brand & Profile Header */}
      <div className="p-4 pb-2 space-y-3 shrink-0 border-b border-slate-100 dark:border-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-purple-600/30">
              D
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight block">DevAlign AI</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">Workload & XAI Platform</span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md text-lg transition"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>

        {/* User Role Badge */}
        <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="truncate pr-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">{user?.name || 'Guest'}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate">{user?.email || 'Not authenticated'}</span>
          </div>
          <span className="text-[9px] font-extrabold font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 shrink-0">
            {user?.role || 'GUEST'}
          </span>
        </div>
      </div>

      {/* Scrollable Navigation Area (Prevents cropping on small laptop heights) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {/* Main Navigation Section */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            {user?.role === 'DEVELOPER' ? 'Developer Workspace' : 'Production Application'}
          </p>
          {mainNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  active
                    ? 'bg-purple-600/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Admin Governance Section (Admins Only) */}
        {adminNav.length > 0 && (
          <div className="space-y-1 border-t border-slate-200 dark:border-slate-800/80 pt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Administration & Access
              </p>
              <span className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                ADMIN
              </span>
            </div>
            {adminNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-amber-600/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Research Navigation Section (Admins Only) */}
        {researchNav.length > 0 && (
          <div className="space-y-1 border-t border-slate-200 dark:border-slate-800/80 pt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Research & ML Lab
              </p>
              <span className="text-[9px] bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                RESEARCH
              </span>
            </div>
            {researchNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-purple-600/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Footer info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Engine Ready
        </span>
        <span className="text-[10px] opacity-70">v1.0.0</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex shrink-0 h-screen sticky top-0 z-20">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onCloseMobile} />
          <div className="relative z-10 h-full max-h-screen shadow-2xl">{navContent}</div>
        </div>
      )}
    </>
  );
};
