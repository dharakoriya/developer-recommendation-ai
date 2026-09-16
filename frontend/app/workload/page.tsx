'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { WorkloadIndicator } from '../../components/WorkloadIndicator';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { useAuth } from '../context/AuthContext';

export interface WorkloadSummaryItem {
  developer_id: string;
  name?: string;
  user_name?: string;
  user_email?: string;
  experience_years?: number;
  availability_status?: string;
  active_task_count?: number;
  total_estimated_hours?: number;
  weighted_hours?: number;
  capacity_hours?: number;
  workload_score: number;
  status: string;
}

export default function WorkloadPage() {
  const { apiUrl } = useAuth();
  const [data, setData] = useState<{
    healthy_count: number;
    moderate_count: number;
    high_count: number;
    overloaded_count: number;
    average_workload_score?: number;
    total_developers?: number;
    developer_workloads: WorkloadSummaryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkload();
  }, [apiUrl]);

  const fetchWorkload = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('devalign_token') : null;
      const res = await fetch(`${apiUrl}/api/dashboard/workload`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load workload statistics');
      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Workload Balancing Engine</h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
              Live deterministic capacity & weighted workload distribution calculations across team developers.
            </p>
          </div>
          <button
            onClick={fetchWorkload}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <span>🔄</span> Refresh Workloads
          </button>
        </div>

        {loading ? (
          <LoadingState message="Calculating real-time team workload distributions..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchWorkload} />
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Healthy Workload" value={data.healthy_count} subtext="< 50% capacity score" icon="💚" accentColor="emerald" />
              <StatCard title="Moderate Workload" value={data.moderate_count} subtext="50% - 75% capacity score" icon="💙" accentColor="blue" />
              <StatCard title="High Workload" value={data.high_count} subtext="75% - 100% capacity score" icon="💛" accentColor="amber" />
              <StatCard title="Overloaded" value={data.overloaded_count} subtext="> 100% capacity score" icon="🔴" accentColor="purple" />
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Developer Workload Distribution</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Calculated using active tasks, complexity weights, and availability factors.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {typeof data.average_workload_score === 'number' && (
                    <span className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-lg font-mono font-bold">
                      Avg Score: {data.average_workload_score}%
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {data.developer_workloads.length} Developers
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Developer</th>
                      <th className="p-3.5">Availability</th>
                      <th className="p-3.5 text-center">Active Tasks</th>
                      <th className="p-3.5 text-center">Hours (Assigned / Cap)</th>
                      <th className="p-3.5 min-w-[220px]">Workload Capacity</th>
                      <th className="p-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                    {data.developer_workloads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                          No developer profiles registered in workspace.
                        </td>
                      </tr>
                    ) : (
                      data.developer_workloads.map((dw) => {
                        const devName = dw.name || dw.user_name || 'Developer';
                        const assignedHrs = dw.total_estimated_hours ?? 0;
                        const capHrs = dw.capacity_hours ?? 40;
                        return (
                          <tr key={dw.developer_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3.5">
                              <Link
                                href={`/developers/${dw.developer_id}`}
                                className="font-bold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition block"
                              >
                                {devName}
                              </Link>
                              {dw.user_email && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                                  {dw.user_email}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${
                                dw.availability_status === 'AVAILABLE'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : dw.availability_status === 'PARTIAL'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              }`}>
                                {dw.availability_status || 'AVAILABLE'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                              {dw.active_task_count ?? 0}
                            </td>
                            <td className="p-3.5 text-center font-mono text-xs">
                              <span className="font-bold text-slate-900 dark:text-white">{assignedHrs.toFixed(1)}h</span>
                              <span className="text-slate-400 dark:text-slate-500 text-[11px]"> / {capHrs.toFixed(1)}h</span>
                            </td>
                            <td className="p-3.5 min-w-[220px]">
                              <WorkloadIndicator score={dw.workload_score} status={dw.status} />
                            </td>
                            <td className="p-3.5 text-right">
                              <StatusBadge status={dw.status} type="workload_status" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
