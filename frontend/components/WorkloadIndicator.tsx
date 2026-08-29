import React from 'react';

interface WorkloadIndicatorProps {
  score: number;
  status?: string;
  showLabel?: boolean;
}

export const WorkloadIndicator: React.FC<WorkloadIndicatorProps> = ({
  score,
  status,
  showLabel = true,
}) => {
  const rounded = Math.round(score * 10) / 10;

  const getColorClass = () => {
    if (rounded < 50) return 'bg-emerald-500 text-emerald-400';
    if (rounded < 75) return 'bg-blue-500 text-blue-400';
    if (rounded <= 100) return 'bg-amber-500 text-amber-400';
    return 'bg-rose-500 text-rose-400';
  };

  const getStatusLabel = () => {
    if (status) return status;
    if (rounded < 50) return 'Healthy';
    if (rounded < 75) return 'Moderate';
    if (rounded <= 100) return 'High';
    return 'Overloaded';
  };

  const pct = Math.min(100, Math.max(0, rounded));

  return (
    <div className="space-y-1.5 w-full">
      {showLabel && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">Workload Capacity</span>
          <span className="font-mono font-bold text-white">
            {rounded}% <span className={`ml-1 text-[11px] ${getColorClass().split(' ')[1]}`}>({getStatusLabel()})</span>
          </span>
        </div>
      )}
      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getColorClass().split(' ')[0]}`}
          style={{ width: `${pct}%` }}
        ></div>
      </div>
    </div>
  );
};
