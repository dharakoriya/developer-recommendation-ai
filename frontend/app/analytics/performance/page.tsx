 'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { PerformanceBadge } from '@/components/PerformanceBadge';
import { StreakBadge } from '@/components/StreakBadge';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';

interface LeaderboardItem {
  developer_id: string;
  user_name: string;
  user_email: string;
  experience_years: number;
  availability_status: string;
  performance_score: number;
  completion_rate: number;
  on_time_rate: number;
  weighted_productivity: number;
  current_streak: number;
  total_incentive_points: number;
  completed_tasks: number;
  workload_score: number;
}

interface TeamPerformanceAnalytics {
  total_developers: number;
  avg_performance_score: number;
  avg_completion_rate: number;
  top_performers: LeaderboardItem[];
  highest_productivity: LeaderboardItem[];
  best_streaks: LeaderboardItem[];
  task_difficulty_distribution: Record<string, number>;
  leaderboard: LeaderboardItem[];
}

export default function ManagerPerformanceAnalyticsPage() {
  const [data, setData] = useState<TeamPerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('devalign_token');
        const res = await fetch('http://localhost:8000/api/analytics/performance', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Session expired or unauthenticated. Please log out and log back in as Manager or Admin.');
          }
          if (res.status === 403) {
            throw new Error('Access forbidden. Manager or Admin role is required to view team performance analytics.');
          }
          throw new Error('Failed to load team performance analytics.');
        }

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Title Header */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Manager Performance Analytics
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Real-time team productivity rankings, task difficulty distribution, workload matrix & streaks
            </p>
          </div>
          {data && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
              {data.total_developers} Active Developers
            </span>
          )}
        </div>

        {loading && <LoadingState message="Calculating team performance analytics..." />}
        {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

        {data && (
          <>
            {/* Overview Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Team Performance Avg"
                value={`${data.avg_performance_score.toFixed(1)} / 100`}
                subtext="Overall composite performance rating"
                accentColor="indigo"
              />
              <MetricCard
                title="Average Completion Rate"
                value={`${data.avg_completion_rate.toFixed(1)}%`}
                subtext="Team task completion success ratio"
                accentColor="emerald"
              />
              <MetricCard
                title="Top Performer Score"
                value={`${data.top_performers[0]?.performance_score.toFixed(1) || 0} / 100`}
                subtext={data.top_performers[0]?.user_name || 'N/A'}
                accentColor="amber"
              />
              <MetricCard
                title="Best Active Streak"
                value={`🔥 ${data.best_streaks[0]?.current_streak || 0} Days`}
                subtext={data.best_streaks[0]?.user_name || 'N/A'}
                accentColor="rose"
              />
            </div>

            {/* Task Difficulty & Leaderboards Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Task Difficulty Distribution */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Task Difficulty Distribution</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Breakdown of system tasks by complexity tier</p>

                <div className="space-y-3 pt-2">
                  {Object.entries(data.task_difficulty_distribution).map(([tier, count]) => {
                    const total = Object.values(data.task_difficulty_distribution).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={tier} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">{tier}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono">{count} tasks ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              tier === 'CRITICAL' || tier === 'HIGH'
                                ? 'bg-rose-500'
                                : tier === 'MEDIUM'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Highest Weighted Productivity */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Top Productivity Leaders</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Ranked by weighted task difficulty completed</p>

                <div className="space-y-3 pt-2">
                  {data.highest_productivity.map((dev, idx) => (
                    <div key={dev.developer_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center border border-slate-300 dark:border-slate-700">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{dev.user_name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{dev.completed_tasks} completed tasks</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                        {dev.weighted_productivity.toFixed(1)} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best Streaks */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Streak Champions</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Active consecutive day delivery streaks</p>

                <div className="space-y-3 pt-2">
                  {data.best_streaks.map((dev, idx) => (
                    <div key={dev.developer_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center border border-slate-700">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{dev.user_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{dev.user_email}</p>
                        </div>
                      </div>
                      <StreakBadge currentStreak={dev.current_streak} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete Team Performance Ranking Table */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-slate-100">Full Team Performance Leaderboard</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Developer</th>
                      <th className="py-3 px-3">Performance Score</th>
                      <th className="py-3 px-3">Completion %</th>
                      <th className="py-3 px-3">On-Time %</th>
                      <th className="py-3 px-3">Productivity Pts</th>
                      <th className="py-3 px-3">Streak</th>
                      <th className="py-3 px-3">Incentive Pts</th>
                      <th className="py-3 px-3">Workload</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {data.leaderboard.map((dev) => (
                      <tr key={dev.developer_id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-semibold text-slate-100">
                          <div>
                            <p>{dev.user_name}</p>
                            <p className="text-[10px] font-normal text-slate-400">{dev.user_email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <PerformanceBadge score={dev.performance_score} />
                        </td>
                        <td className="py-3 px-3 font-mono">{dev.completion_rate.toFixed(1)}%</td>
                        <td className="py-3 px-3 font-mono">{dev.on_time_rate.toFixed(1)}%</td>
                        <td className="py-3 px-3 font-mono text-purple-400 font-bold">{dev.weighted_productivity.toFixed(1)}</td>
                        <td className="py-3 px-3">
                          <StreakBadge currentStreak={dev.current_streak} size="sm" showLabel={false} />
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{dev.total_incentive_points.toFixed(1)} pts</td>
                        <td className="py-3 px-3 font-mono">{dev.workload_score.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/developers/${dev.developer_id}/performance`}
                            className="px-3 py-1 text-xs font-semibold rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition inline-block"
                          >
                            Inspect Profile
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
