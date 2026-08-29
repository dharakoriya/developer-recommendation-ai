'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/AppShell';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { WorkloadIndicator } from '../../components/WorkloadIndicator';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

export interface WorkloadSummaryItem {
  developer_id: string;
  name?: string;
  user_name?: string;
  experience_years?: number;
  availability_status?: string;
  active_task_count?: number;
  total_estimated_hours?: number;
  workload_score: number;
  status: string;
}

export default function WorkloadPage() {
  const [data, setData] = useState<{
    healthy_count: number;
    moderate_count: number;
    high_count: number;
    overloaded_count: number;
    developer_workloads: WorkloadSummaryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkload();
  }, []);

  const fetchWorkload = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch('http://localhost:8000/api/dashboard/workload', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load workload statistics');
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Workload Balancing Engine</h1>
            <p className="text-slate-400 text-xs mt-1">Deterministic capacity & workload distribution calculations across team developers.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Calculating team workload distributions..." />
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

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm">Developer Workload Distribution</h3>
                <span className="text-xs text-slate-400 font-mono">{data.developer_workloads.length} Developers</span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Developer Name</th>
                    <th className="p-3.5">Workload Capacity</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {data.developer_workloads.map((dw) => (
                    <tr key={dw.developer_id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold text-white">{dw.name || dw.user_name || 'Developer'}</td>
                      <td className="p-3.5 min-w-[200px]">
                        <WorkloadIndicator score={dw.workload_score} status={dw.status} />
                      </td>
                      <td className="p-3.5 text-right">
                        <StatusBadge status={dw.status} type="workload_status" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
