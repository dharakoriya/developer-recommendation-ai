'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const handleLogout = () => {
    logout();
    showToast('Signed out successfully', 'info');
    router.push('/login');
  };

  return (
    <header className="bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md transition-colors duration-200">
      <div className="flex items-center gap-4">
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="md:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-md text-xl"
            aria-label="Toggle mobile menu"
          >
            ☰
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            PROD: baseline-v2
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Switcher Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setTheme('dark')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
              theme === 'dark'
                ? 'bg-purple-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Switch to Dark theme"
            aria-label="Dark theme"
          >
            <span>🌙</span> <span className="hidden sm:inline">Dark</span>
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
              theme === 'light'
                ? 'bg-purple-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Switch to Light theme"
            aria-label="Light theme"
          >
            <span>☀️</span> <span className="hidden sm:inline">Light</span>
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
              theme === 'system'
                ? 'bg-purple-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Switch to System theme"
            aria-label="System theme"
          >
            <span>💻</span> <span className="hidden sm:inline">System</span>
          </button>
        </div>

        {user ? (
          <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">{user.name}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block uppercase">{user.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md shadow-purple-600/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-semibold px-2 py-1 transition"
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
