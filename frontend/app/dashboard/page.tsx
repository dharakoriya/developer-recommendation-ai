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
import { apiClient, ApiError } from '../../lib/api';

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
  const [riskSummary, setRiskSummary] = useState<any>(null);
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
      const summary = await apiClient.get<DashboardSummary>('/dashboard/summary');
      setData(summary);

      if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        try {
          const rSummary = await apiClient.get('/risk/summary');
          setRiskSummary(rSummary);
        } catch {
          // Non-blocking fallback
        }
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard statistics.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const assignments = await apiClient.get<any[]>(`/assignments/tasks/${taskId}/assignments`);
      const activeAssign = assignments.find((a) => a.status === 'ACTIVE') || assignments[0];
      if (activeAssign) {
        await apiClient.post(`/assignments/${activeAssign.id}/complete`);
        showToast('Task marked completed successfully!', 'success');
        fetchDashboard();
        return;
      }
      showToast('No active assignment found for task', 'error');
    } catch (err: any) {
      showToast(err.message || 'Failed to complete task', 'error');
    } finally {
      setCompletingTaskId(null);
    }
  };

  const isDev = user?.role === 'DEVELOPER';
  const isAdmin = user?.role === 'ADMIN';

  const myTasks = data?.my_tasks || [];

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Role-Specific Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={user?.role || 'GUEST'} type="environment" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Signed in as {user?.name}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isAdmin ? 'Admin Operations Command Center' : isDev ? 'Developer Workspace' : 'Manager Command Center'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
              {isAdmin
                ? 'System oversight, project health scores, team analytics, and recommendation governance.'
                : isDev
                ? 'Personal task queue, current capacity workload, streaks, and performance.'
                : 'Scoped team capacity, unassigned tasks, workload balancing, and quick actions.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/analytics"
              className="bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-3.5 py-2 rounded-xl transition border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5"
            >
              <span>🧠</span> View Analytics Hub
            </Link>
            {!isDev && (
              <>
                <Link
                  href="/projects"
                  className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition border border-slate-300 dark:border-slate-700 shadow-sm"
                >
                  + New Project
                </Link>
                <Link
                  href="/tasks"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-lg shadow-purple-600/20"
                >
                  + Create Task
                </Link>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading workspace statistics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDashboard} />
        ) : isDev ? (
          /* DEVELOPER ROLE DASHBOARD */
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-100 via-white to-indigo-100 dark:from-purple-950/40 dark:via-slate-900 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-500/20 shadow-md dark:shadow-xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👋</span>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Welcome back, {user?.name}!</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">You have {myTasks.length} active tasks assigned in your personal engineering workspace.</p>
                </div>
              </div>
            </div>

            {/* Developer Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="My Active Tasks" value={myTasks.length} subtext={`${myTasks.filter(t => t.status === 'IN_PROGRESS').length} in progress`} icon="📋" accentColor="purple" />
              <StatCard title="My Workload Capacity" value={`${Math.round(data?.my_workload_score ?? 0)}%`} subtext="Calculated from active tasks" icon="📈" accentColor="blue" />
              <StatCard title="My Current Streak" value={`${(data as any)?.my_streak?.current_streak ?? 0} Days`} subtext={`Best: ${(data as any)?.my_streak?.longest_streak ?? 0} days`} icon="🔥" accentColor="amber" />
              <StatCard title="My Incentive Points" value={`${(data as any)?.my_incentives ?? 0} pts`} subtext="Earned rewards ledger" icon="💎" accentColor="emerald" />
            </div>

            {/* Performance & Skills 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* My Performance */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span>🏆</span> My Performance Intelligence
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Performance Score</span>
                    <span className="text-purple-600 dark:text-purple-400 font-extrabold text-xl font-mono">
                      {((data as any)?.my_performance?.performance_score ?? 85.0).toFixed(1)} / 100
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Completion Rate</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xl font-mono">
                      {((data as any)?.my_performance?.completion_rate ?? 100.0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">On-Time Rate</span>
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold text-xl font-mono">
                      {((data as any)?.my_performance?.on_time_rate ?? 100.0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Weighted Productivity</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-extrabold text-xl font-mono">
                      {((data as any)?.my_performance?.weighted_productivity ?? 50.0).toFixed(1)} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* My Skills & Achievements */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span>💪</span> My Skills & Achievements
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase block mb-1.5">My Verified Skills</span>
                    <div className="flex flex-wrap gap-2">
                      {(data?.my_skills || []).map((sk, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-mono font-bold text-xs">
                          {sk.skill_name}: Lvl {sk.proficiency_level}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase block mb-1.5">Unlocked Achievements</span>
                    <div className="flex flex-wrap gap-2">
                      {((data as any)?.my_achievements || []).length > 0 ? (
                        ((data as any)?.my_achievements).map((ach: any, idx: number) => (
                          <span key={idx} className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-bold text-xs flex items-center gap-1">
                            <span>🎖️</span> {ach.title}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 text-xs italic">Complete tasks to unlock achievements!</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Developer Assigned Tasks Table */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span>📌</span> My Assigned Tasks
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{myTasks.length} Active Tasks</span>
              </div>

              {myTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  You currently have no tasks assigned. Check back later or notify your project manager.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Task Title</th>
                        <th className="p-3">Project</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Complexity</th>
                        <th className="p-3">Est. Hours</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {myTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3">
                            <Link href={`/tasks/${task.id}`} className="font-bold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 truncate max-w-xs block">
                              {task.title}
                            </Link>
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{task.project_name}</td>
                          <td className="p-3"><StatusBadge status={task.priority} type="priority" /></td>
                          <td className="p-3"><StatusBadge status={task.complexity} type="complexity" /></td>
                          <td className="p-3 font-mono">{task.estimated_hours} hrs</td>
                          <td className="p-3"><StatusBadge status={task.status} type="status" /></td>
                          <td className="p-3 text-right space-x-2">
                            {task.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                disabled={completingTaskId === task.id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                              >
                                {completingTaskId === task.id ? 'Updating...' : 'Mark Complete'}
                              </button>
                            )}
                            <Link
                              href={`/tasks/${task.id}`}
                              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition inline-block border border-slate-200 dark:border-slate-700"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ADMIN & MANAGER DASHBOARD */
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Active Projects" value={data?.active_projects || 0} subtext={`${data?.total_projects || 0} Total Projects`} icon="📁" accentColor="purple" />
              <StatCard title="Active Developers" value={data?.total_developers || 0} subtext={`${data?.available_developers || 0} Available for Tasks`} icon="👥" accentColor="blue" />
              <StatCard title="Unassigned Tasks" value={data?.unassigned_tasks || 0} subtext={`${data?.active_tasks || 0} Active Tasks`} icon="📋" accentColor="amber" />
              <StatCard title="High Workload Devs" value={data?.high_workload_developers || 0} subtext="Capacity > 75%" icon="📈" accentColor="amber" />
            </div>

            {/* Risk Assessment Summary Section */}
            {riskSummary && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Platform Delivery Risk Intelligence</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Real-time schedule, capacity, and skill gap assessment across operations.</p>
                    </div>
                  </div>
                  <Link
                    href="/analytics"
                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500"
                  >
                    Explore Risk Analytics →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">High/Critical Risk Projects</span>
                    <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                      {(riskSummary.high_risk_projects_count || 0) + (riskSummary.critical_risk_projects_count || 0)} / {riskSummary.total_projects || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">High/Critical Risk Tasks</span>
                    <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                      {(riskSummary.high_risk_tasks_count || 0) + (riskSummary.critical_risk_tasks_count || 0)} / {riskSummary.active_tasks_count || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">High Delivery Risk Devs</span>
                    <span className="text-lg font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                      {riskSummary.high_delivery_risk_developers_count || 0} / {riskSummary.total_developers || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold font-mono border border-emerald-500/30">
                      Rule-Based Engine Active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions & Navigation Bar */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-lg">⚡</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Project Intelligence Quick Actions</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Navigate directly to specific operational analytics views.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/analytics" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700">
                  Project Health
                </Link>
                <Link href="/analytics/teams" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700">
                  Team Capacity
                </Link>
                <Link href="/analytics/developers" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700">
                  Dev Comparison
                </Link>
                <Link href="/analytics/tasks" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700">
                  Task Intelligence
                </Link>
                <Link href="/analytics/recommendations" className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-500/30">
                  Recommendation Funnel
                </Link>
              </div>
            </div>

            {/* Recent Recommendations & Assignments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recommendations Box */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span>⚡</span> Recent AI Recommendations
                  </h3>
                  <Link href="/recommendations" className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold">
                    View Engine →
                  </Link>
                </div>
                {!data?.recent_recommendations || data.recent_recommendations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    No recent AI recommendations generated yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recent_recommendations.map((rec) => (
                      <div key={rec.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{rec.task_title}</div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5">Top Match: <span className="text-purple-600 dark:text-purple-300 font-semibold">{rec.developer_name}</span></div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">{Math.round(rec.recommendation_score > 1 ? rec.recommendation_score : rec.recommendation_score * 100)} / 100</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{rec.model_version}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignments Box */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span>🎯</span> Active Assignments
                  </h3>
                  <Link href="/assignments" className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold">
                    Manage All →
                  </Link>
                </div>
                {!data?.recent_assignments || data.recent_assignments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    No active assignments recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recent_assignments.map((asg) => (
                      <div key={asg.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{asg.task_title}</div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5">Assigned to: <span className="text-indigo-600 dark:text-indigo-300 font-semibold">{asg.developer_name}</span></div>
                        </div>
                        <StatusBadge status={asg.status} type="status" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
