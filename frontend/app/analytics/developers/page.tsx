'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/AppShell';
import { AnalyticsNav } from '../../../components/AnalyticsNav';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { PerformanceBadge } from '../../../components/PerformanceBadge';
import { StreakBadge } from '../../../components/StreakBadge';
import { StatusBadge } from '../../../components/StatusBadge';
import { apiClient, ApiError } from '../../../lib/api';
import { useAuth } from '../../context/AuthContext';

export interface DeveloperComparisonItem {
  developer_id: string;
  user_name: string;
  email: string;
  performance_score: number;
  completion_rate: number;
  weighted_productivity: number;
  current_workload_score: number;
  current_workload_hours: number;
  experience_years: number;
  current_streak: number;
  incentive_points: number;
  top_skills: string[];
  availability_status: string;
}

export interface DeveloperComparisonData {
  total_developers: number;
  developers: DeveloperComparisonItem[];
}

export default function DeveloperComparisonAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DeveloperComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDevRole = user?.role === 'DEVELOPER';

  useEffect(() => {
    if (!isDevRole) {
      fetchComparisonData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchComparisonData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DeveloperComparisonData>('/analytics/developers');
      setData(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load developer comparison matrix.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isDevRole) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Developer Comparison</h1>
            <AnalyticsNav />
          </div>
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-200">Access Forbidden</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Developer accounts are restricted from accessing multi-developer comparison analytics. You may view your personal metrics under <strong>Performance Analytics</strong>.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Developer Intelligence & Comparison Matrix</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Side-by-side performance score, productivity streaks, workload, and skill comparison across team developers.</p>
          </div>
          <AnalyticsNav />
        </div>

        {loading ? (
          <LoadingState message="Generating developer comparison matrix..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchComparisonData} />
        ) : !data ? null : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200">All Developers ({data.total_developers})</h2>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Developer</th>
                      <th className="p-3.5">Performance</th>
                      <th className="p-3.5">Completion Rate</th>
                      <th className="p-3.5">Streak</th>
                      <th className="p-3.5">Points</th>
                      <th className="p-3.5">Workload</th>
                      <th className="p-3.5">Experience</th>
                      <th className="p-3.5">Availability</th>
                      <th className="p-3.5">Top Skills</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                    {data.developers.map((d) => (
                      <tr key={d.developer_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{d.user_name}</div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">{d.email}</div>
                        </td>
                        <td className="p-3.5">
                          <PerformanceBadge score={d.performance_score} size="sm" />
                        </td>
                        <td className="p-3.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {d.completion_rate}%
                        </td>
                        <td className="p-3.5">
                          <StreakBadge streakCount={d.current_streak} size="sm" />
                        </td>
                        <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {d.incentive_points} pts
                        </td>
                        <td className="p-3.5 font-mono">
                          <span className={d.current_workload_score > 75 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                            {d.current_workload_hours}h ({d.current_workload_score}%)
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                          {d.experience_years} yrs
                        </td>
                        <td className="p-3.5">
                          <StatusBadge status={d.availability_status} type="availability" />
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {d.top_skills.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
