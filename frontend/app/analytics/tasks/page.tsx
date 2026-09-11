'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/AppShell';
import { AnalyticsNav } from '../../../components/AnalyticsNav';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { MetricCard } from '../../../components/MetricCard';
import { apiClient, ApiError } from '../../../lib/api';

export interface TaskIntelligenceMetrics {
  total_tasks: number;
  priority_distribution: Record<string, number>;
  complexity_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  project_distribution: Record<string, number>;
  weight_distribution: {
    low_weight: number;
    medium_weight: number;
    high_weight: number;
    critical_weight: number;
  };
  avg_estimated_hours: number;
  avg_actual_completion_hours: number;
  on_time_completion_rate: number;
}

export default function TaskIntelligenceAnalyticsPage() {
  const [data, setData] = useState<TaskIntelligenceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTaskData();
  }, []);

  const fetchTaskData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<TaskIntelligenceMetrics>('/analytics/tasks');
      setData(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load task intelligence metrics.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Task Intelligence & Weight Distribution</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Multi-dimensional analysis of task complexity, difficulty weights, priority distribution, and completion efficiency.</p>
          </div>
          <AnalyticsNav />
        </div>

        {loading ? (
          <LoadingState message="Analyzing task weight distribution and intelligence metrics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchTaskData} />
        ) : !data ? null : (
          <>
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Tasks"
                value={data.total_tasks}
                subtitle="Cataloged across projects"
                accentColor="indigo"
              />
              <MetricCard
                title="On-Time Completion Rate"
                value={`${data.on_time_completion_rate}%`}
                subtitle="Delivered within estimate buffer"
                accentColor="emerald"
              />
              <MetricCard
                title="Avg Estimated Hours"
                value={`${data.avg_estimated_hours} hrs`}
                subtitle="Per task target effort"
                accentColor="blue"
              />
              <MetricCard
                title="Avg Actual Time"
                value={`${data.avg_actual_completion_hours} hrs`}
                subtitle="Real completion duration"
                accentColor="purple"
              />
            </div>

            {/* Task Weight Distribution Section */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Task Weight Score Distribution</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Deterministic 1–100 task weighting derived from complexity (40%), effort (35%), and skill requirements (25%).</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Low Weight (&lt; 20)</div>
                  <div className="text-2xl font-black text-slate-800 dark:text-slate-200">{data.weight_distribution.low_weight}</div>
                  <div className="text-[11px] text-slate-500">Simple maintenance / routine tasks</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Medium Weight (20 – 49)</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{data.weight_distribution.medium_weight}</div>
                  <div className="text-[11px] text-slate-500">Standard feature implementations</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">High Weight (50 – 74)</div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{data.weight_distribution.high_weight}</div>
                  <div className="text-[11px] text-slate-500">Complex architecture & multi-skill tasks</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">Critical Weight (75+)</div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{data.weight_distribution.critical_weight}</div>
                  <div className="text-[11px] text-slate-500">High-risk critical infrastructure</div>
                </div>
              </div>
            </div>

            {/* Distribution Breakdown Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Priority Distribution */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Priority Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(data.priority_distribution).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{key}</span>
                      <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{val} tasks</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complexity Distribution */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Complexity Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(data.complexity_distribution).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{key}</span>
                      <span className="font-mono font-extrabold text-purple-600 dark:text-purple-400">{val} tasks</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Distribution */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Status Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(data.status_distribution).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{key}</span>
                      <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{val} tasks</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
