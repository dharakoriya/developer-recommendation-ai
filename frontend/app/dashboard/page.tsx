'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../../context/ToastContext';
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
  my_tasks?: {
    id: string;
    title: string;
    project_name: string;
    priority: string;
    complexity: string;
    estimated_hours: number;
    status: string;
  }[];
  my_workload_score?: number;
  my_availability?: string;
  my_skills?: {
    skill_name: string;
    proficiency_level: number;
  }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch('http://localhost:8000/api/dashboard/summary', { headers });
      if (res.ok) {
        const summary: DashboardSummary = await res.json();
        setData(summary);
      } else {
        throw new Error('Failed to load dashboard statistics');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const token = localStorage.getItem('devalign_token');
      // Fetch assignment for task
      const assignRes = await fetch(`http://localhost:8000/api/assignments/tasks/${taskId}/assignments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (assignRes.ok) {
        const assignments: any[] = await assignRes.json();
        const activeAssign = assignments.find((a) => a.status === 'ACTIVE') || assignments[0];
        if (activeAssign) {
          const compRes = await fetch(`http://localhost:8000/api/assignments/${activeAssign.id}/complete`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (compRes.ok) {
            showToast('Task marked completed successfully!', 'success');
            fetchDashboard();
            return;
          }
        }
      }
      showToast('Failed to complete task', 'error');
    } catch (err) {
      showToast('Failed to complete task', 'error');
    } finally {
      setCompletingTaskId(null);
    }
  };

  const isDev = user?.role === 'DEVELOPER';
  const isAdmin = user?.role === 'ADMIN';

  const myTasks = data?.my_tasks || [];

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Role-Specific Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={user?.role || 'GUEST'} type="environment" />
              <span className="text-xs text-slate-400 font-mono">Signed in as {user?.name}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isAdmin ? 'Admin Operations Dashboard' : isDev ? 'Developer Workspace' : 'Manager Team Dashboard'}
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              {isAdmin
                ? 'Full system oversight, governance, research metrics, and team allocations.'
                : isDev
                ? 'Personal task queue, current capacity workload, and skill proficiencies.'
                : 'Project management overview, active developer allocations, and workload balancing.'}
            </p>
          </div>
          {!isDev && (
            <div className="flex items-center gap-2">
              <Link
                href="/projects"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition border border-slate-700"
              >
                + New Project
              </Link>
              <Link
                href="/tasks"
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-lg shadow-purple-600/20"
              >
                + Create Task
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingState message="Loading workspace statistics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDashboard} />
        ) : isDev ? (
          /* DEVELOPER ROLE DASHBOARD */
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/30 border border-purple-500/20 shadow-xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👋</span>
                <div>
                  <h2 className="text-xl font-extrabold text-white">Welcome back, {user?.name}!</h2>
                  <p className="text-xs text-slate-300">You have {myTasks.length} active tasks assigned in your personal engineering workspace.</p>
                </div>
              </div>
            </div>

            {/* Developer Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="My Active Tasks" value={myTasks.length} subtext={`${myTasks.filter(t => t.status === 'IN_PROGRESS').length} in progress`} icon="📋" accentColor="purple" />
              <StatCard title="My Workload Capacity" value={`${Math.round(data?.my_workload_score ?? 0)}%`} subtext="Calculated from active tasks" icon="📈" accentColor="blue" />
              <StatCard title="Availability Status" value={data?.my_availability || 'AVAILABLE'} subtext="Standard capacity" icon="✅" accentColor="emerald" />
            </div>

            {/* Developer Assigned Tasks Table */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>📌</span> My Assigned Tasks
                </h3>
                <span className="text-xs text-slate-400 font-mono">{myTasks.length} Active Tasks</span>
              </div>

              {myTasks.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <span className="text-3xl block">🎉</span>
                  <h4 className="text-sm font-bold text-slate-300">Clear Task Queue</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">You currently have no active task assignments. Enjoy your clear workload queue!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {myTasks.map((t) => (
                    <div key={t.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-white text-sm">{t.title}</h4>
                        <span className="text-xs text-slate-400 font-mono">{t.project_name} • {t.estimated_hours}h estimated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={t.priority} type="priority" />
                        <StatusBadge status={t.complexity} type="complexity" />
                        <StatusBadge status={t.status} type="task_status" />
                        {t.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleCompleteTask(t.id)}
                            disabled={completingTaskId === t.id}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] px-3 py-1 rounded-lg transition ml-2"
                          >
                            {completingTaskId === t.id ? 'Completing...' : '✓ Mark Complete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Skills & Proficiencies */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                <span>🛠️</span> My Skill Proficiencies
              </h3>
              {!data?.my_skills || data.my_skills.length === 0 ? (
                <p className="text-slate-500 text-xs py-2 italic">No skill proficiencies recorded.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {data.my_skills.map((sk, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-xs font-bold text-slate-200 block">{sk.skill_name}</span>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${sk.proficiency_level}%` }} />
                      </div>
                      <span className="text-[10px] text-purple-400 font-mono block text-right font-bold">{sk.proficiency_level}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ADMIN & MANAGER ROLE DASHBOARD */
          <>
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Projects" value={data?.total_projects ?? 0} subtext={`${data?.active_projects ?? 0} active projects`} icon="📁" accentColor="blue" />
              <StatCard title="Team Developers" value={data?.total_developers ?? 0} subtext={`${data?.available_developers ?? 0} available for tasks`} icon="👥" accentColor="emerald" />
              <StatCard title="Active Tasks" value={data?.active_tasks ?? 0} subtext={`${data?.unassigned_tasks ?? 0} unassigned tasks`} icon="📋" accentColor="amber" />
              <StatCard title="High Workload" value={data?.high_workload_developers ?? 0} subtext="Developers >= 75% capacity" icon="⚠️" accentColor="purple" />
            </div>

            {/* Content Split: Recent Allocations & Recommendation Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Task Assignments */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>🎯</span> Recent Task Assignments
                  </h3>
                  <Link href="/assignments" className="text-xs text-purple-400 hover:text-purple-300 font-medium">View All →</Link>
                </div>
                {!data?.recent_assignments || data.recent_assignments.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center italic">No assignments recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {data.recent_assignments.map((a) => (
                      <div key={a.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <h4 className="font-bold text-white">{a.task_title}</h4>
                          <span className="text-slate-400 font-mono">Assigned to: <strong className="text-slate-200">{a.developer_name}</strong></span>
                        </div>
                        <StatusBadge status={a.status} type="assignment_status" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Recommendation Engine Output */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>⚡</span> Recent Recommendation Activity
                  </h3>
                  <Link href="/recommendations" className="text-xs text-purple-400 hover:text-purple-300 font-medium">Run Recommendations →</Link>
                </div>
                {!data?.recent_recommendations || data.recent_recommendations.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center italic">No recommendation runs generated yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {data.recent_recommendations.map((r) => (
                      <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <h4 className="font-bold text-white">{r.task_title}</h4>
                          <span className="text-slate-400 font-mono">Top Candidate: <strong className="text-purple-400">#{r.rank} {r.developer_name}</strong></span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-purple-400 block">{r.recommendation_score.toFixed(1)} / 100</span>
                          <span className="text-[10px] text-slate-500 font-mono">{r.model_version}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
