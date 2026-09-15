'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../components/AppShell';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { apiClient, ApiError } from '../../../lib/api';

interface PersonalTaskSummary {
  id: string;
  title: string;
  project_name?: string;
  team_name?: string;
  status: string;
  priority: string;
  complexity: string;
  estimated_hours: number;
  total_actual_seconds: number;
  is_timer_running: boolean;
  deadline?: string;
}

interface DeveloperPersonalAnalytics {
  developer_id: string;
  user_name: string;
  total_assigned: number;
  in_progress_count: number;
  completed_count: number;
  blocked_count: number;
  completion_rate: number;
  on_time_rate: number;
  performance_score: number;
  current_workload_score: number;
  availability_status: string;
  total_actual_hours: number;
  total_estimated_hours: number;
  current_streak: number;
  longest_streak: number;
  incentive_points: number;
  active_tasks: PersonalTaskSummary[];
  completed_tasks_recent: PersonalTaskSummary[];
  top_skills: string[];
}

function fmtSeconds(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function LiveTimer({ task, nowRef }: { task: PersonalTaskSummary; nowRef: number }) {
  let totalSecs = task.total_actual_seconds || 0;
  if (task.is_timer_running) {
    // We can't store timer_started_at here without refetching full task, but the
    // analytics endpoint provides is_timer_running + total_actual_seconds as a snapshot.
    // Show the stored value (updates on page refresh / refetch).
    totalSecs = task.total_actual_seconds || 0;
  }
  return (
    <span className="font-mono text-xs text-purple-700 dark:text-purple-300">
      {fmtSeconds(totalSecs)}
      {task.is_timer_running && (
        <span className="ml-1 inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
      )}
    </span>
  );
}

const priorityColor: Record<string, string> = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-blue-600 dark:text-blue-400',
  HIGH: 'text-amber-600 dark:text-amber-400',
  CRITICAL: 'text-rose-600 dark:text-rose-400',
};

const statusBg: Record<string, string> = {
  TODO: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  CANCELLED: 'bg-slate-500/10 text-slate-500',
};

export default function MyWorkIntelligencePage() {
  const [data, setData] = useState<DeveloperPersonalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await apiClient.get<DeveloperPersonalAnalytics>('/analytics/developer/me');
      setData(res);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your work analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live tick every second for any running timer (visual indicator only)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const workloadColor =
    (data?.current_workload_score || 0) >= 75
      ? 'rose'
      : (data?.current_workload_score || 0) >= 50
      ? 'amber'
      : 'emerald';

  const perfColor =
    (data?.performance_score || 0) >= 85
      ? 'emerald'
      : (data?.performance_score || 0) >= 60
      ? 'amber'
      : 'rose';

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/dashboard" className="hover:text-purple-600 dark:hover:text-purple-400">Dashboard</Link>
              <span>›</span>
              <span className="text-slate-900 dark:text-white">My Work Intelligence</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              🎯 My Work Intelligence
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your personal workload, task performance, and productivity analytics.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="self-start text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading your personal work analytics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : !data ? null : (
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: 'Performance Score',
                  value: `${data.performance_score.toFixed(1)}`,
                  sub: '/ 100',
                  color: perfColor,
                  icon: '🏆',
                },
                {
                  label: 'Completion Rate',
                  value: `${data.completion_rate.toFixed(1)}%`,
                  sub: 'tasks completed on time',
                  color: 'indigo',
                  icon: '✅',
                },
                {
                  label: 'Workload Score',
                  value: `${data.current_workload_score.toFixed(1)}`,
                  sub: data.availability_status,
                  color: workloadColor,
                  icon: '📈',
                },
                {
                  label: 'Incentive Points',
                  value: data.incentive_points.toFixed(0),
                  sub: 'XP earned',
                  color: 'purple',
                  icon: '⭐',
                },
              ].map(({ label, value, sub, color, icon }) => (
                <div
                  key={label}
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
                  </div>
                  <div className={`text-2xl font-extrabold text-${color}-600 dark:text-${color}-400`}>{value}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{sub}</div>
                </div>
              ))}
            </div>

            {/* Streak + Skills Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Streak Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  🔥 Completion Streak
                </h3>
                <div className="flex items-end gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-black text-orange-500">{data.current_streak}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Current Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-slate-700 dark:text-slate-300">{data.longest_streak}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Best Streak</div>
                  </div>
                </div>
              </div>

              {/* Top Skills */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  🛠️ Top Skills
                </h3>
                {data.top_skills.length === 0 ? (
                  <p className="text-xs text-slate-400">No skills registered yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.top_skills.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Time Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Actual Hours Tracked</div>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{data.total_actual_hours.toFixed(1)} h</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Estimated Hours</div>
                <div className="text-2xl font-black text-slate-700 dark:text-slate-300">{data.total_estimated_hours.toFixed(1)} h</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">On-Time Completion</div>
                <div className={`text-2xl font-black ${data.on_time_rate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {data.on_time_rate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Active Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  ⚡ Active Tasks ({data.active_tasks.length})
                </h2>
                <Link href="/tasks" className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold">
                  View All Tasks →
                </Link>
              </div>

              {data.active_tasks.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 text-sm">No active tasks assigned to you.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.active_tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/40 dark:hover:border-purple-500/40 transition shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{task.title}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${statusBg[task.status] || statusBg['TODO']}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="truncate">{task.project_name || '—'}</span>
                        {task.team_name && <span className="truncate">· {task.team_name}</span>}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold ${priorityColor[task.priority] || ''}`}>
                            {task.priority}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">{task.complexity}</span>
                          <span className="text-slate-500 dark:text-slate-400">{task.estimated_hours}h est.</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {task.is_timer_running && (
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          )}
                          <LiveTimer task={task} nowRef={tick} />
                        </div>
                      </div>

                      {task.deadline && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Deadline: {new Date(task.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Completed */}
            {data.completed_tasks_recent.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  ✅ Recently Completed ({data.completed_tasks_recent.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.completed_tasks_recent.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition shadow-sm space-y-2"
                    >
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">{task.title}</h3>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>{task.project_name || '—'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {fmtSeconds(task.total_actual_seconds)} actual
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
