'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../app/context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface HeaderProps {
  onToggleMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileNav }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const handleLogout = () => {
    logout();
    showToast('Signed out successfully', 'info');
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md bg-slate-950/90">
      <div className="flex items-center gap-4">
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md text-xl"
            aria-label="Toggle mobile menu"
          >
            ☰
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className="text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            PROD: baseline-v1
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Switcher Toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setTheme('dark')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
              theme === 'dark' ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-400 hover:text-white'
            }`}
            title="Dark theme"
          >
            🌙 Dark
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
              theme === 'light' ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-400 hover:text-white'
            }`}
            title="Light theme"
          >
            ☀️ Light
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
              theme === 'system' ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-400 hover:text-white'
            }`}
            title="System theme"
          >
            💻 System
          </button>
        </div>

        {user ? (
          <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block">{user.name}</span>
              <span className="text-[10px] text-slate-400 font-mono block uppercase">{user.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md shadow-purple-600/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-400 text-xs font-semibold px-2 py-1 transition"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-purple-600/20"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
