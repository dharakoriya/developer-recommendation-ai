'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/AppShell';
import { AnalyticsNav } from '../../components/AnalyticsNav';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { MetricCard } from '../../components/MetricCard';
import { apiClient, ApiError } from '../../lib/api';

export interface ProjectHealthMetrics {
  project_id: string;
  project_name: string;
  description?: string;
  health_score: number;
  health_status: 'HEALTHY' | 'AT RISK' | 'CRITICAL';
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  unassigned_tasks: number;
  developer_count: number;
  high_risk_workload_count: number;
  risk_factors: string[];
}

export interface ProjectHealthOverviewData {
  overall_avg_health_score: number;
  healthy_projects_count: number;
  at_risk_projects_count: number;
  critical_projects_count: number;
  projects: ProjectHealthMetrics[];
}

export default function ProjectHealthAnalyticsPage() {
  const [data, setData] = useState<ProjectHealthOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ProjectHealthOverviewData>('/analytics/projects');
      setData(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to calculate project health intelligence analytics.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'AT RISK':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Page Header & Tab Nav */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Project Intelligence & Analytics Hub</h1>
            <p className="text-sm text-slate-400 mt-1">Real-time multi-dimensional project health scores, task completion, workload risks, and team capacity.</p>
          </div>
          <AnalyticsNav />
        </div>

        {loading ? (
          <LoadingState message="Calculating real-time project health intelligence..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchHealthData} />
        ) : !data ? null : (
          <>
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Overall Health Score"
                value={`${data.overall_avg_health_score} / 100`}
                subtitle="Calculated across active projects"
                accentColor={data.overall_avg_health_score >= 85 ? 'emerald' : data.overall_avg_health_score >= 60 ? 'amber' : 'rose'}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <MetricCard
                title="Healthy Projects"
                value={data.healthy_projects_count}
                subtitle="Health Score ≥ 85"
                accentColor="emerald"
              />
              <MetricCard
                title="At Risk Projects"
                value={data.at_risk_projects_count}
                subtitle="Health Score 60 – 84"
                accentColor="amber"
              />
              <MetricCard
                title="Critical Projects"
                value={data.critical_projects_count}
                subtitle="Health Score < 60"
                accentColor="rose"
              />
            </div>

            {/* Project Cards List */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-200">Active Project Health Breakdown</h2>

              {data.projects.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <p className="text-slate-400 text-sm">No active projects found in database. Create your first project to view health analytics.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {data.projects.map((p) => (
                    <div key={p.project_id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition">
                      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-100">{p.project_name}</h3>
                          {p.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${getStatusBadgeClass(p.health_status)}`}>
                          {p.health_status} ({p.health_score})
                        </span>
                      </div>

                      {/* Health Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Health Score</span>
                          <span className="font-mono font-semibold text-slate-200">{p.health_score}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              p.health_score >= 85 ? 'bg-emerald-500' : p.health_score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, p.health_score))}%` }}
                          />
                        </div>
                      </div>

                      {/* Metrics Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center">
                        <div>
                          <div className="text-xs text-slate-400">Total Tasks</div>
                          <div className="text-sm font-extrabold text-slate-200">{p.total_tasks}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Completed</div>
                          <div className="text-sm font-extrabold text-emerald-400">{p.completed_tasks}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Overdue</div>
                          <div className={`text-sm font-extrabold ${p.overdue_tasks > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                            {p.overdue_tasks}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">Unassigned</div>
                          <div className={`text-sm font-extrabold ${p.unassigned_tasks > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                            {p.unassigned_tasks}
                          </div>
                        </div>
                      </div>

                      {/* Risk Factors */}
                      {p.risk_factors.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-slate-400">Identified Risk Factors:</div>
                          <ul className="space-y-1 text-xs">
                            {p.risk_factors.map((rf, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-rose-400 bg-rose-500/5 px-2.5 py-1 rounded-lg border border-rose-500/10">
                                <span>⚠️</span>
                                <span>{rf}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
