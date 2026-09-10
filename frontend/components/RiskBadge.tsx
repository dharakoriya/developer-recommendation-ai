'use client';

import React from 'react';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showScore?: boolean;
  className?: string;
}

export function RiskBadge({ level, score, showScore = false, className = '' }: RiskBadgeProps) {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  const badgeStyles: Record<string, string> = {
    LOW: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40 animate-pulse',
  };

  const icons: Record<string, string> = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🟠',
    CRITICAL: '🚨',
  };

  const style = badgeStyles[normalizedLevel] || badgeStyles.LOW;
  const icon = icons[normalizedLevel] || '⚪';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono border transition-all ${style} ${className}`}
    >
      <span className="text-xs">{icon}</span>
      <span>RISK: {normalizedLevel}</span>
      {showScore && score !== undefined && (
        <span className="opacity-80">({score.toFixed(0)})</span>
      )}
    </span>
  );
}
