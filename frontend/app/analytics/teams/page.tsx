'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/AppShell';
import { AnalyticsNav } from '../../../components/AnalyticsNav';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { MetricCard } from '../../../components/MetricCard';
import { apiClient, ApiError } from '../../../lib/api';

export interface TeamCapacityMetrics {
  total_teams: number;
  total_developers: number;
  total_capacity_hours: number;
  used_capacity_hours: number;
  available_capacity_hours: number;
  capacity_utilization_pct: number;
  workload_distribution: {
    underutilized: number;
    balanced: number;
    high_workload: number;
    overloaded: number;
  };
  team_productivity: {
    tasks_completed: number;
    weighted_tasks_completed: number;
    avg_performance_score: number;
    avg_completion_rate: number;
  };
}

export default function TeamPerformanceAnalyticsPage() {
  const [data, setData] = useState<TeamCapacityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<TeamCapacityMetrics>('/analytics/teams');
      setData(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to calculate team performance capacity analytics.');
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
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Team Capacity & Performance Analytics</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Real-time capacity utilization, workload distribution, and overall team productivity performance.</p>
          </div>
          <AnalyticsNav />
        </div>

        {loading ? (
          <LoadingState message="Analyzing team capacity and workload distribution..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchTeamData} />
        ) : !data ? null : (
          <>
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Capacity Utilization"
                value={`${data.capacity_utilization_pct}%`}
                subtitle={`${data.used_capacity_hours} / ${data.total_capacity_hours} hrs used`}
                accentColor={data.capacity_utilization_pct > 85 ? 'amber' : 'indigo'}
              />
              <MetricCard
                title="Active Developers"
                value={data.total_developers}
                subtitle={`${data.total_teams} Active Teams`}
                accentColor="blue"
              />
              <MetricCard
                title="Available Capacity"
                value={`${data.available_capacity_hours} hrs`}
                subtitle="Ready for task assignment"
                accentColor="emerald"
              />
              <MetricCard
                title="Avg Performance Score"
                value={`${data.team_productivity.avg_performance_score} / 100`}
                subtitle={`Avg Completion: ${data.team_productivity.avg_completion_rate}%`}
                accentColor="purple"
              />
            </div>

            {/* Capacity Bar Visual */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Overall Team Capacity Meter</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Total available developer capacity hours across all active teams.</p>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {data.used_capacity_hours} / {data.total_capacity_hours} Hours Allocated
                </span>
              </div>
              <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, data.capacity_utilization_pct)}%` }}
                />
              </div>
            </div>

            {/* Workload Distribution Grid */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200">Developer Workload Distribution</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 space-y-2">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Underutilized</div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.workload_distribution.underutilized}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">&lt; 15 hrs / week assigned</div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/5 space-y-2">
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Balanced</div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.workload_distribution.balanced}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">15 – 35 hrs / week assigned</div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 space-y-2">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">High Workload</div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.workload_distribution.high_workload}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">36 – 45 hrs / week assigned</div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/5 space-y-2">
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Overloaded</div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.workload_distribution.overloaded}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">&gt; 45 hrs / week assigned</div>
                </div>
              </div>
            </div>

            {/* Team Productivity Breakdown */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Team Productivity Metrics Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-600 dark:text-slate-400">Completed Tasks</div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{data.team_productivity.tasks_completed}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-600 dark:text-slate-400">Weighted Tasks Completed</div>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{data.team_productivity.weighted_tasks_completed}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-600 dark:text-slate-400">Average Completion Rate</div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{data.team_productivity.avg_completion_rate}%</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
