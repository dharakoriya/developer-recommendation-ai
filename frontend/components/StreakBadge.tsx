import React from 'react';

interface StreakBadgeProps {
  currentStreak?: number;
  streakCount?: number;
  longestStreak?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  currentStreak,
  streakCount,
  longestStreak,
  showLabel = true,
  size = 'md',
}) => {
  const activeStreak = currentStreak !== undefined ? currentStreak : streakCount || 0;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs font-semibold',
    lg: 'px-4 py-1.5 text-sm font-bold',
  };

  const isHot = activeStreak >= 3;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all ${
        sizeClasses[size]
      } ${
        isHot
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
          : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
      }`}
    >
      <span className={isHot ? 'animate-bounce' : 'opacity-60'}>🔥</span>
      <span className="font-mono font-bold">{activeStreak}</span>
      {showLabel && <span className="text-[11px] opacity-80">Day Streak</span>}
      {longestStreak !== undefined && longestStreak > activeStreak && (
        <span className="text-[10px] text-slate-500 font-mono pl-1 border-l border-slate-700">
          Best: {longestStreak}d
        </span>
      )}
    </div>
  );
};
