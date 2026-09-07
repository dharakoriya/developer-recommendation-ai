import React from 'react';

interface AchievementCardProps {
  title: string;
  description: string;
  icon: string;
  category: string;
  earnedAt?: string;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  title,
  description,
  icon,
  category,
  earnedAt,
}) => {
  const iconMap: Record<string, string> = {
    flame: '🔥',
    rocket: '🚀',
    brain: '🧠',
    zap: '⚡',
  };

  const categoryColorMap: Record<string, string> = {
    consistency: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    productivity: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-300',
    difficulty: 'border-purple-500/30 bg-purple-500/5 text-purple-300',
    speed: 'border-sky-500/30 bg-sky-500/5 text-sky-300',
  };

  const currentIcon = iconMap[icon] || '🏆';
  const badgeStyle = categoryColorMap[category] || 'border-slate-700 bg-slate-800/40 text-slate-300';

  return (
    <div className={`glass-panel glass-panel-hover p-4 rounded-xl border ${badgeStyle} flex items-start gap-3.5`}>
      <div className="text-2xl p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex-shrink-0">
        {currentIcon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-100 truncate">{title}</h4>
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-800/90 text-slate-400 border border-slate-700">
            {category}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{description}</p>
        {earnedAt && (
          <span className="text-[10px] text-slate-500 mt-2 block font-mono">
            Earned: {new Date(earnedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};
