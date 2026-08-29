import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'priority' | 'complexity' | 'task_status' | 'project_status' | 'workload_status' | 'assignment_status' | 'environment';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'task_status' }) => {
  const getBadgeStyle = () => {
    const s = (status || '').toUpperCase();

    if (type === 'priority') {
      if (s === 'CRITICAL') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      if (s === 'HIGH') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      if (s === 'MEDIUM') return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      return 'bg-slate-800 text-slate-300 border-slate-700';
    }

    if (type === 'complexity') {
      if (s === 'HIGH') return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      if (s === 'MEDIUM') return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      return 'bg-slate-800 text-slate-300 border-slate-700';
    }

    if (type === 'workload_status') {
      if (s === 'HEALTHY' || s === 'AVAILABLE') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      if (s === 'MODERATE' || s === 'PARTIAL') return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      if (s === 'HIGH') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      if (s === 'OVERLOADED' || s === 'UNAVAILABLE') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }

    if (type === 'project_status' || type === 'task_status' || type === 'assignment_status') {
      if (s === 'ACTIVE' || s === 'IN_PROGRESS') return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      if (s === 'COMPLETED') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      if (s === 'TODO') return 'bg-slate-800 text-slate-300 border-slate-700';
      if (s === 'CANCELLED' || s === 'REASSIGNED' || s === 'BLOCKED') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }

    if (type === 'environment') {
      if (s === 'PRODUCTION') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
    }

    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getBadgeStyle()}`}>
      {status}
    </span>
  );
};
