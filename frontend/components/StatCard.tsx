import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: string;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  accentColor = 'blue',
}) => {
  const getAccentClass = () => {
    if (accentColor === 'emerald') return 'text-emerald-600 dark:text-emerald-400';
    if (accentColor === 'amber') return 'text-amber-600 dark:text-amber-400';
    if (accentColor === 'purple') return 'text-purple-600 dark:text-purple-400';
    if (accentColor === 'slate') return 'text-slate-700 dark:text-slate-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md dark:hover:border-slate-700 transition">
      <div className="flex justify-between items-start">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
        {icon && <span className="text-lg opacity-80">{icon}</span>}
      </div>
      <p className={`text-3xl font-extrabold mt-2 font-mono ${getAccentClass()}`}>{value}</p>
      {subtext && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
};
