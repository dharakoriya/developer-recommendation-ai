'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../app/context/AuthContext';

interface HeaderProps {
  onToggleMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileNav }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-slate-950 border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md text-xl"
            aria-label="Toggle mobile menu"
          >
            ☰
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            PROD: baseline-v1
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block">{user.name}</span>
              <span className="text-[10px] text-slate-400 font-mono block uppercase">{user.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-rose-400 text-xs font-semibold px-2 py-1 transition"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-blue-600/20"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
