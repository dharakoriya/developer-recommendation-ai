import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'purple' | 'blue';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  subtitle,
  icon,
  trend,
  accentColor = 'indigo',
}) => {
  const displaySubtext = subtext || subtitle;

  const accentBorderMap = {
    indigo: 'border-l-indigo-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    cyan: 'border-l-sky-400',
    rose: 'border-l-rose-500',
    purple: 'border-l-purple-500',
    blue: 'border-l-blue-500',
  };

  const accentBgMap = {
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    cyan: 'bg-sky-400/10 text-sky-600 dark:text-sky-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };

  return (
    <div
      className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${accentBorderMap[accentColor]} shadow-sm hover:shadow-md transition-all hover:translate-y-[-2px]`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-xl ${accentBgMap[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
              trend.isPositive
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {displaySubtext && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          {displaySubtext}
        </p>
      )}
    </div>
  );
};
