import React from 'react';

interface PerformanceBadgeProps {
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({
  score,
  showScore = true,
  size = 'md',
}) => {
  let label = 'Standard';
  let badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-700';

  if (score >= 90) {
    label = 'Elite Performer';
    badgeStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20';
  } else if (score >= 80) {
    label = 'High Performer';
    badgeStyle = 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/20';
  } else if (score >= 70) {
    label = 'Growing';
    badgeStyle = 'bg-sky-950/80 text-sky-300 border-sky-500/40';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold border ${sizeClass} ${badgeStyle}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      <span>{label}</span>
      {showScore && (
        <span className="font-mono opacity-85 text-[10px]">({Math.round(score)})</span>
      )}
    </span>
  );
};
