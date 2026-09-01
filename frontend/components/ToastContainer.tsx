'use client';

import React from 'react';
import { useToast } from '../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const bgColors = {
          success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
          error: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
          info: 'bg-blue-950/90 border-blue-500/40 text-blue-200',
          warning: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
        };

        const icons = {
          success: '✓',
          error: '✕',
          info: 'ℹ',
          warning: '⚠️',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold animate-in fade-in slide-in-from-top-2 transition ${bgColors[toast.type]}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-sm">{icons[toast.type]}</span>
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white ml-3 font-bold"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};
