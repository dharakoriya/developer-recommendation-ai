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
    if (accentColor === 'emerald') return 'text-emerald-400 border-emerald-500/20';
    if (accentColor === 'amber') return 'text-amber-400 border-amber-500/20';
    if (accentColor === 'purple') return 'text-purple-400 border-purple-500/20';
    if (accentColor === 'slate') return 'text-slate-400 border-slate-700/50';
    return 'text-blue-400 border-blue-500/20';
  };

  return (
    <div className={`p-5 rounded-xl bg-slate-900 border border-slate-800 transition hover:border-slate-700`}>
      <div className="flex justify-between items-start">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
        {icon && <span className="text-lg opacity-80">{icon}</span>}
      </div>
      <p className={`text-3xl font-extrabold mt-2 font-mono ${getAccentClass().split(' ')[0]}`}>{value}</p>
      {subtext && <p className="text-[11px] text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
};
