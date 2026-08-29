'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

interface DashboardSummary {
  total_projects: number;
  active_projects: number;
  total_developers: number;
  available_developers: number;
  active_tasks: number;
  completed_tasks: number;
  unassigned_tasks: number;
  high_workload_developers: number;
  recent_recommendations: {
    id: string;
    task_id: string;
    task_title: string;
    developer_id: string;
    developer_name: string;
    rank: number;
    recommendation_score: number;
    model_version: string;
    created_at: string;
  }[];
  recent_assignments: {
    id: string;
    task_id: string;
    task_title: string;
    developer_id: string;
    developer_name: string;
    status: string;
    assigned_at: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch('http://localhost:8000/api/dashboard/summary', { headers });
      if (res.ok) {
        setData(await res.json());
      } else {
        throw new Error('Failed to load dashboard statistics');
      }
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
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Executive Dashboard</h1>
            <p className="text-slate-400 text-xs mt-1">Operational team overview, active tasks, workload health, and recent allocations.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/tasks"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-blue-600/20"
            >
              + Create Task
            </Link>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading dashboard stats..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDashboard} />
        ) : data ? (
          <>
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Projects" value={data.total_projects} subtext={`${data.active_projects} active projects`} icon="📁" accentColor="blue" />
              <StatCard title="Team Developers" value={data.total_developers} subtext={`${data.available_developers} available for tasks`} icon="👥" accentColor="emerald" />
              <StatCard title="Active Tasks" value={data.active_tasks} subtext={`${data.unassigned_tasks} unassigned tasks`} icon="📋" accentColor="amber" />
              <StatCard title="High Workload" value={data.high_workload_developers} subtext="Developers >= 75% capacity" icon="⚠️" accentColor="purple" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Recommendations */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-white text-sm">Recent Recommendation Allocations</h3>
                  <Link href="/recommendations" className="text-xs text-blue-400 hover:underline">View All →</Link>
                </div>
                <div className="divide-y divide-slate-800/60 text-xs">
                  {data.recent_recommendations.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">No recent recommendations generated yet.</div>
                  ) : (
                    data.recent_recommendations.map((rec) => (
                      <div key={rec.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition">
                        <div>
                          <p className="font-bold text-white">{rec.task_title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Rank #{rec.rank}: <strong className="text-slate-200">{rec.developer_name}</strong>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-blue-400 block">{Math.round(rec.recommendation_score > 1 ? rec.recommendation_score : rec.recommendation_score * 100)} / 100</span>
                          <span className="text-[10px] text-slate-500 block font-mono">{rec.model_version}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Assignments */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-white text-sm">Recent Task Assignments</h3>
                  <Link href="/assignments" className="text-xs text-blue-400 hover:underline">View All →</Link>
                </div>
                <div className="divide-y divide-slate-800/60 text-xs">
                  {data.recent_assignments.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">No active assignments recorded yet.</div>
                  ) : (
                    data.recent_assignments.map((asg) => (
                      <div key={asg.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition">
                        <div>
                          <p className="font-bold text-white">{asg.task_title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Assigned to: <strong className="text-slate-200">{asg.developer_name}</strong></p>
                        </div>
                        <StatusBadge status={asg.status} type="assignment_status" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
