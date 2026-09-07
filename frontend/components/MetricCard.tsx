import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'purple';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  accentColor = 'indigo',
}) => {
  const accentBorderMap = {
    indigo: 'border-l-indigo-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    cyan: 'border-l-sky-400',
    rose: 'border-l-rose-500',
    purple: 'border-l-purple-500',
  };

  const accentBgMap = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    cyan: 'bg-sky-400/10 text-sky-400',
    rose: 'bg-rose-500/10 text-rose-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div
      className={`glass-panel glass-panel-hover rounded-xl p-5 border-l-4 ${accentBorderMap[accentColor]} flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-lg ${accentBgMap[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <span className="text-2xl font-bold text-slate-100 tracking-tight">
          {value}
        </span>

        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>
      )}
    </div>
  );
};
