'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { PerformanceBadge } from '@/components/PerformanceBadge';
import { StreakBadge } from '@/components/StreakBadge';
import { AchievementCard } from '@/components/AchievementCard';
import { IncentivePointsCard } from '@/components/IncentivePointsCard';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';

interface Achievement {
  id: string;
  achievement_key: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface IncentiveLedger {
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

interface Snapshot {
  id: string;
  performance_score: number;
  completion_rate: number;
  on_time_rate: number;
  weighted_productivity: number;
  current_streak: number;
  total_incentive_points: number;
  snapshot_at: string;
}

interface DeveloperPerformanceDetail {
  developer_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  experience_years: number;
  availability_status: string;
  performance_score: number;
  completion_rate: number;
  on_time_rate: number;
  weighted_productivity: number;
  total_assigned_tasks: number;
  completed_tasks: number;
  current_streak: number;
  longest_streak: number;
  total_incentive_points: number;
  achievements: Achievement[];
  recent_incentives: IncentiveLedger[];
  performance_trend: Snapshot[];
}

export default function DeveloperPerformancePage() {
  const params = useParams();
  const router = useRouter();
  const developerId = params?.id as string;

  const [data, setData] = useState<DeveloperPerformanceDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!developerId) return;

    async function fetchPerformance() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('devalign_token');
        const res = await fetch(`http://localhost:8000/api/developers/${developerId}/performance`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Session expired or unauthenticated. Please log out and log back in.');
          }
          if (res.status === 403) {
            throw new Error('Access forbidden. You do not have permission to view this developer performance profile.');
          }
          throw new Error('Failed to load developer performance intelligence.');
        }

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, [developerId]);

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Navigation & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                Developer Performance Intelligence
              </h1>
            </div>
            {data && (
              <p className="text-sm text-slate-400 mt-1">
                {data.user_name} ({data.user_email}) — {data.experience_years} Yrs Exp • {data.availability_status}
              </p>
            )}
          </div>

          {data && (
            <div className="flex items-center gap-3 flex-wrap">
              <PerformanceBadge score={data.performance_score} />
              <StreakBadge currentStreak={data.current_streak} longestStreak={data.longest_streak} size="lg" />
            </div>
          )}
        </div>

        {loading && <LoadingState message="Loading developer performance intelligence metrics..." />}
        {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

        {data && (
          <>
            {/* Overview Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Performance Score"
                value={`${data.performance_score.toFixed(1)} / 100`}
                subtext="Multi-factor weighted composite rating"
                accentColor="indigo"
                trend={{ value: 'Multi-factor', isPositive: true }}
              />
              <MetricCard
                title="Completion Rate"
                value={`${data.completion_rate.toFixed(1)}%`}
                subtext={`${data.completed_tasks} completed of ${data.total_assigned_tasks} assigned`}
                accentColor="emerald"
                trend={{ value: 'Task ratio', isPositive: true }}
              />
              <MetricCard
                title="On-Time Rate"
                value={`${data.on_time_rate.toFixed(1)}%`}
                subtext="Delivered ahead of / within schedule"
                accentColor="cyan"
                trend={{ value: 'Schedule match', isPositive: true }}
              />
              <MetricCard
                title="Weighted Productivity"
                value={`${data.weighted_productivity.toFixed(1)} pts`}
                subtext="Task complexity & weight adjusted credit"
                accentColor="purple"
                trend={{ value: 'Difficulty weighted', isPositive: true }}
              />
            </div>

            {/* Main Content Layout: Incentive Points & Achievements */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Incentive Ledger */}
              <div className="lg:col-span-1">
                <IncentivePointsCard
                  totalPoints={data.total_incentive_points}
                  recentLedger={data.recent_incentives}
                />
              </div>

              {/* Right Column: Achievements & Trend Snapshots */}
              <div className="lg:col-span-2 space-y-6">
                {/* Achievements Showcase */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">Professional Badges & Achievements</h3>
                      <p className="text-xs text-slate-400">Earned through consistent delivery, speed, and high-difficulty tasks</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-indigo-400 border border-slate-700 font-mono">
                      {data.achievements.length} Badges Earned
                    </span>
                  </div>

                  {data.achievements.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-900/50 rounded-xl">
                      No achievements unlocked yet. Complete qualifying tasks to earn badges!
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {data.achievements.map((ach) => (
                        <AchievementCard
                          key={ach.id}
                          title={ach.title}
                          description={ach.description}
                          icon={ach.icon}
                          category={ach.category}
                          earnedAt={ach.earned_at}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Performance Trend Snapshot History */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold text-slate-100">Performance Snapshot Trend</h3>
                  {data.performance_trend.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-900/50 rounded-xl">
                      Historical snapshot logs will record performance evolution over time.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Score</th>
                            <th className="py-2.5 px-3">Completion %</th>
                            <th className="py-2.5 px-3">Streak</th>
                            <th className="py-2.5 px-3">Incentive Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                          {data.performance_trend.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-800/30 transition">
                              <td className="py-2.5 px-3">{new Date(s.snapshot_at).toLocaleDateString()}</td>
                              <td className="py-2.5 px-3 text-indigo-400 font-bold">{s.performance_score.toFixed(1)}</td>
                              <td className="py-2.5 px-3">{s.completion_rate.toFixed(1)}%</td>
                              <td className="py-2.5 px-3 text-amber-400 font-bold">🔥 {s.current_streak}d</td>
                              <td className="py-2.5 px-3 text-emerald-400 font-bold">{s.total_incentive_points.toFixed(1)} pts</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
