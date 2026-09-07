import React from 'react';

interface IncentiveLedgerItem {
  id: string;
  task_id?: string;
  base_points: number;
  difficulty_bonus: number;
  on_time_bonus: number;
  streak_bonus: number;
  total_points: number;
  description?: string;
  earned_at: string;
}

interface IncentivePointsCardProps {
  totalPoints: number;
  recentLedger?: IncentiveLedgerItem[];
}

export const IncentivePointsCard: React.FC<IncentivePointsCardProps> = ({
  totalPoints,
  recentLedger = [],
}) => {
  return (
    <div className="glass-panel rounded-xl p-5 border border-indigo-500/20 bg-gradient-to-br from-slate-900/90 to-indigo-950/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Developer Incentive Balance
          </span>
          <h3 className="text-3xl font-extrabold text-slate-100 mt-1 font-mono tracking-tight">
            {totalPoints.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            <span className="text-sm font-semibold text-indigo-400 ml-1.5 font-sans">pts</span>
          </h3>
        </div>
        <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-2xl">
          💰
        </div>
      </div>

      {recentLedger.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Recent Incentive Ledger
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentLedger.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/40 border border-slate-700/50"
              >
                <div className="truncate mr-2">
                  <p className="text-slate-200 font-medium truncate">{item.description || 'Task Completion Bonus'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.earned_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-bold text-emerald-400 font-mono">
                    +{item.total_points.toFixed(1)} pts
                  </span>
                  <div className="text-[9px] text-slate-400">
                    Base: {item.base_points.toFixed(0)} | Diff: +{item.difficulty_bonus.toFixed(0)} | On-Time: +{item.on_time_bonus.toFixed(0)} | Streak: +{item.streak_bonus.toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
