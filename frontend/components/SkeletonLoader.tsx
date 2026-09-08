import React from 'react';

interface SkeletonLoaderProps {
  rows?: number;
  type?: 'card' | 'table' | 'text';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ rows = 3, type = 'card' }) => {
  if (type === 'table') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-800/60 gap-4">
            <div className="h-4 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-1/5"></div>
            <div className="h-4 bg-slate-800 rounded w-1/6"></div>
            <div className="h-6 bg-slate-800 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-3 bg-slate-800 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-4 bg-slate-800 rounded w-full"></div>
      ))}
    </div>
  );
};
