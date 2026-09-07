import React from 'react';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  currentStreak,
  longestStreak,
  showLabel = true,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs font-semibold',
    lg: 'px-4 py-1.5 text-sm font-bold',
  };

  const isHot = currentStreak >= 3;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all ${
        sizeClasses[size]
      } ${
        isHot
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
          : 'bg-slate-800/80 text-slate-400 border-slate-700'
      }`}
    >
      <span className={isHot ? 'animate-pulse-flame text-amber-400' : 'text-slate-400'}>
        🔥
      </span>
      <span>{currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}</span>
      {showLabel && <span className="text-slate-400 font-normal">Streak</span>}
      {longestStreak !== undefined && longestStreak > currentStreak && (
        <span className="text-[10px] text-slate-500 font-mono ml-1">
          (Best: {longestStreak}d)
        </span>
      )}
    </div>
  );
};
