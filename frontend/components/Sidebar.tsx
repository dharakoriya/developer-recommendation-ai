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

  const { main: mainNav, research: researchNav } = getFilteredNavigation(user?.role);

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/') return true;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 text-slate-300 w-64 p-4 space-y-6">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-1">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-purple-600/30">
          D
        </div>
        <div>
          <span className="font-extrabold text-white text-base tracking-tight block">DevAlign AI</span>
          <span className="text-[10px] text-slate-400 block font-mono">Workload & XAI Platform</span>
        </div>
      </div>

      {/* User Role Badge */}
      <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="truncate">
          <span className="text-xs font-bold text-white block truncate">{user?.name || 'Guest'}</span>
          <span className="text-[10px] text-slate-400 font-mono block">{user?.email || 'Not authenticated'}</span>
        </div>
        <span className="text-[9px] font-extrabold font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
          {user?.role || 'GUEST'}
        </span>
      </div>

      {/* Main Navigation Section */}
      <div className="space-y-1">
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
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
                  ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Research Navigation Section (Admins Only) */}
      {researchNav.length > 0 && (
        <div className="space-y-1 border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
              Research & ML Lab
            </p>
            <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
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
                    ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative z-10">{navContent}</div>
        </div>
      )}
    </>
  );
};
