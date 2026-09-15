'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../components/AppShell';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RequiredSkill {
  skill_name: string;
  required_level: number;
}

interface AssignmentInfo {
  id: string;
  developer_id: string;
  developer_name?: string;
  compatibility_score?: number;
  current_workload?: number;
  assigned_at?: string;
  status?: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description?: string;
  category?: string;
  project_id?: string;
  project_name?: string;
  team_id?: string;
  team_name?: string;
  status: string;
  priority: string;
  complexity: string;
  estimated_hours: number;
  deadline?: string;
  assigned_developer_id?: string;
  assigned_developer_name?: string;
  started_at?: string;
  completed_at?: string;
  completed_by?: string;
  completed_by_name?: string;
  total_actual_minutes: number;
  total_actual_seconds: number;
  is_timer_running: boolean;
  timer_started_at?: string;
  actual_hours: number;
  variance_hours: number;
  created_at?: string;
  updated_at?: string;
  task_weight_score?: number;
  required_skills?: RequiredSkill[];
  current_assignment?: AssignmentInfo;
  assignment_history?: AssignmentInfo[];
  creator_name?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSecs(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  CANCELLED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  BLOCKED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-blue-600 dark:text-blue-400',
  HIGH: 'text-amber-600 dark:text-amber-400',
  CRITICAL: 'text-rose-600 dark:text-rose-400',
};

const COMPLEXITY_BADGE: Record<string, string> = {
  LOW: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  MEDIUM: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  HIGH: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  VERY_HIGH: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 w-36">{label}</span>
      <span className={`text-xs font-semibold text-slate-800 dark:text-slate-200 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
        <span className="text-base">{icon}</span>
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Live Timer Display ───────────────────────────────────────────────────────

function LiveTimerDisplay({ task }: { task: TaskDetail }) {
  const [liveSecs, setLiveSecs] = useState<number>(task.total_actual_seconds || 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const base = task.total_actual_seconds || 0;

    if (task.is_timer_running && task.timer_started_at) {
      const startMs = new Date(task.timer_started_at).getTime();
      const computeLive = () => {
        const elapsed = Math.floor((Date.now() - startMs) / 1000);
        setLiveSecs(base + elapsed);
      };
      computeLive();
      intervalRef.current = setInterval(computeLive, 1000);
    } else {
      setLiveSecs(base);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [task.is_timer_running, task.timer_started_at, task.total_actual_seconds]);

  const estimatedSecs = Math.round((task.estimated_hours || 0) * 3600);
  const overBudget = liveSecs > estimatedSecs && estimatedSecs > 0;
  const pct = estimatedSecs > 0 ? Math.min(100, Math.round((liveSecs / estimatedSecs) * 100)) : 0;

  return (
    <div className="space-y-4">
      {/* Big timer display */}
      <div className="flex items-center gap-4">
        <div className={`text-5xl font-black font-mono tracking-wider ${task.is_timer_running ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {fmtSecs(liveSecs)}
        </div>
        <div className="space-y-1">
          {task.is_timer_running ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">RECORDING</span>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {task.status === 'COMPLETED' ? 'TOTAL TIME' : 'PAUSED'}
            </div>
          )}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Est: {fmtSecs(estimatedSecs)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {estimatedSecs > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span>{overBudget ? '⚠ Over Estimated Time' : 'Time vs Estimate'}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${overBudget ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Variance */}
      <div className="flex gap-4 text-xs font-mono">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Actual: </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">{(liveSecs / 3600).toFixed(2)} h</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Est: </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">{task.estimated_hours} h</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Δ </span>
          <span className={`font-bold ${overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {overBudget ? '+' : ''}{((liveSecs / 3600) - (task.estimated_hours || 0)).toFixed(2)} h
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRecommendModal, setShowRecommendModal] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('devalign_token') : null;
  const authHeaders = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchTask = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/tasks/${id}`, { headers: authHeaders });
      if (!res.ok) throw new Error((await res.json()).detail || 'Task not found');
      setTask(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  // ── Derived role state ────────────────────────────────────────────────────
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isDeveloper = user?.role === 'DEVELOPER';
  const isManagerOrAdmin = isAdmin || isManager;

  const isAssignedToMe = isDeveloper && !!task?.current_assignment && task.current_assignment.developer_id === task.assigned_developer_id;
  // (API returns assigned_developer_id from active assignment; we compare via user name matching from context)
  // More reliable: check assigned_developer_name vs user name
  const isMyTask = isDeveloper && !!task?.assigned_developer_name &&
    task.assigned_developer_name.toLowerCase().trim() === (user?.name || '').toLowerCase().trim();

  const canStartTimer = isMyTask && task?.status === 'IN_PROGRESS' && !task?.is_timer_running;
  const canPauseTimer = isMyTask && task?.is_timer_running;
  const canCompleteTask = isMyTask && (task?.status === 'IN_PROGRESS' || task?.status === 'TODO');
  const canReopenTask = isManagerOrAdmin && task?.status === 'CANCELLED';
  const canReassign = isManagerOrAdmin && task?.status !== 'COMPLETED' && task?.status !== 'CANCELLED';

  // ── API action helper ─────────────────────────────────────────────────────
  const doAction = async (endpoint: string, method = 'POST', body?: object) => {
    setActionLoading(endpoint);
    try {
      const res = await fetch(`http://localhost:8000/api/tasks/${id}/${endpoint}`, {
        method,
        headers: authHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Action failed');
      setTask(data);
      showToast(`${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)} successful`, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading('status');
    try {
      const res = await fetch(`http://localhost:8000/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Status update failed');
      setTask(data);
      showToast(`Status changed to ${newStatus}`, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <AppShell><LoadingState message="Loading task details..." /></AppShell>;
  if (error || !task) return <AppShell><ErrorState message={error || 'Task not found'} onRetry={fetchTask} /></AppShell>;

  const statusCls = STATUS_COLORS[task.status] || STATUS_COLORS['TODO'];
  const weightScore = task.task_weight_score ? Math.round(Number(task.task_weight_score)) : null;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-5 pb-12">

        {/* ── Breadcrumb & Header ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/tasks" className="hover:text-purple-600 dark:hover:text-purple-400 font-medium">Tasks</Link>
            <span>›</span>
            {task.project_name && (
              <>
                <span className="text-slate-400 dark:text-slate-500">{task.project_name}</span>
                <span>›</span>
              </>
            )}
            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-xs">{task.title}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              {isMyTask && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold font-mono px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  🎯 MY TASK
                </span>
              )}
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                {task.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusCls}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className={`text-xs font-bold ${PRIORITY_COLORS[task.priority]}`}>
                  ▲ {task.priority}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${COMPLEXITY_BADGE[task.complexity] || ''}`}>
                  {task.complexity}
                </span>
                {weightScore !== null && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300">
                    WEIGHT {weightScore}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {/* Developer controls */}
              {canStartTimer && (
                <button
                  onClick={() => doAction('start')}
                  disabled={!!actionLoading}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {actionLoading === 'start' ? '…' : '▶ Resume Timer'}
                </button>
              )}
              {canPauseTimer && (
                <button
                  onClick={() => doAction('pause')}
                  disabled={!!actionLoading}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition disabled:opacity-50"
                >
                  {actionLoading === 'pause' ? '…' : '⏸ Pause'}
                </button>
              )}
              {canCompleteTask && (
                <button
                  onClick={() => doAction('stop')}
                  disabled={!!actionLoading}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md disabled:opacity-50"
                >
                  {actionLoading === 'stop' ? '…' : '✓ Mark Complete'}
                </button>
              )}

              {/* Developer: start work (start timer + set IN_PROGRESS) */}
              {isMyTask && task.status === 'TODO' && !task.is_timer_running && (
                <button
                  onClick={() => doAction('start')}
                  disabled={!!actionLoading}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-md disabled:opacity-50"
                >
                  {actionLoading === 'start' ? '…' : '▶ Start Work'}
                </button>
              )}

              {/* Manager/Admin controls */}
              {canReopenTask && (
                <button
                  onClick={() => handleStatusChange('TODO')}
                  disabled={!!actionLoading}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 transition disabled:opacity-50"
                >
                  ↩ Reopen
                </button>
              )}
              {isManagerOrAdmin && task.status === 'TODO' && !task.assigned_developer_id && (
                <Link
                  href={`/recommendations?task_id=${task.id}`}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-md"
                >
                  🤖 Find Best Developer
                </Link>
              )}
              {canReassign && task.assigned_developer_id && (
                <Link
                  href={`/recommendations?task_id=${task.id}`}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition"
                >
                  ⇄ Reassign
                </Link>
              )}

              <button
                onClick={fetchTask}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition"
              >
                ↻
              </button>
            </div>
          </div>
        </div>

        {/* ── DEVELOPER VIEW ──────────────────────────────────────────────── */}
        {isDeveloper && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Timer Panel (prominent for developer) */}
            <div className="lg:col-span-2">
              <SectionCard title="Execution Timer" icon="⏱">
                <LiveTimerDisplay task={task} />
                {task.status === 'COMPLETED' && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                    ✓ Completed {fmtDate(task.completed_at)}{task.completed_by_name ? ` by ${task.completed_by_name}` : ''}
                  </div>
                )}
                {!isMyTask && task.status !== 'COMPLETED' && (
                  <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">
                    Timer controls are only available to the assigned developer.
                  </p>
                )}
              </SectionCard>
            </div>

            {/* Task Metadata */}
            <div>
              <SectionCard title="Task Details" icon="📋">
                <InfoRow label="Project" value={task.project_name || '—'} />
                <InfoRow label="Team" value={task.team_name || '—'} />
                <InfoRow label="Category" value={task.category || '—'} />
                <InfoRow label="Estimated" value={`${task.estimated_hours} h`} mono />
                {task.deadline && <InfoRow label="Deadline" value={fmtDateShort(task.deadline)} mono />}
                <InfoRow label="Created by" value={task.creator_name || '—'} />
                {task.assigned_developer_name && (
                  <InfoRow label="Assigned to" value={task.assigned_developer_name} />
                )}
              </SectionCard>
            </div>
          </div>
        )}

        {/* ── MANAGER/ADMIN VIEW ──────────────────────────────────────────── */}
        {isManagerOrAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Task Metadata */}
            <div className="lg:col-span-2 space-y-5">
              {/* Task Overview */}
              <SectionCard title="Task Overview" icon="📋">
                {task.description && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    {task.description}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <InfoRow label="Project" value={task.project_name || '—'} />
                    <InfoRow label="Team" value={task.team_name || '—'} />
                    <InfoRow label="Category" value={task.category || '—'} />
                    <InfoRow label="Priority" value={<span className={`font-bold ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>} />
                    <InfoRow label="Complexity" value={task.complexity} />
                  </div>
                  <div>
                    <InfoRow label="Estimated Hours" value={`${task.estimated_hours} h`} mono />
                    <InfoRow label="Deadline" value={fmtDateShort(task.deadline)} mono />
                    <InfoRow label="Created by" value={task.creator_name || '—'} />
                    <InfoRow label="Created at" value={fmtDate(task.created_at)} mono />
                    <InfoRow label="Updated at" value={fmtDate(task.updated_at)} mono />
                  </div>
                </div>
              </SectionCard>

              {/* Execution State */}
              <SectionCard title="Execution State & Timer" icon="⏱">
                <LiveTimerDisplay task={task} />
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <InfoRow label="Started at" value={fmtDate(task.started_at)} mono />
                  <InfoRow label="Completed at" value={fmtDate(task.completed_at)} mono />
                  <InfoRow label="Completed by" value={task.completed_by_name || '—'} />
                  <InfoRow label="Timer running?" value={task.is_timer_running ? '🟢 Yes' : '⚫ No'} />
                </div>
              </SectionCard>

              {/* Assignment Info */}
              {task.current_assignment && (
                <SectionCard title="Current Assignment" icon="🎯">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-base">
                      👤
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {task.current_assignment.developer_name || task.assigned_developer_name || '—'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Assigned {fmtDate(task.current_assignment.assigned_at)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {task.current_assignment.compatibility_score != null && (
                        <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
                          Fit: {Math.round(Number(task.current_assignment.compatibility_score))}%
                        </span>
                      )}
                      {task.current_assignment.current_workload != null && (
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          Workload: {Math.round(Number(task.current_assignment.current_workload))}
                        </span>
                      )}
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* Assignment History */}
              {(task.assignment_history || []).length > 0 && (
                <SectionCard title="Assignment History" icon="🕐">
                  <div className="space-y-2">
                    {(task.assignment_history || []).map((a, idx) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {a.developer_name || '—'}
                          </span>
                          <span className="ml-2 font-mono text-slate-400">
                            {fmtDate(a.assigned_at)}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${a.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Weight Score */}
              {weightScore !== null && (
                <SectionCard title="Task Weight Score" icon="⚖️">
                  <div className="text-center py-2">
                    <div className={`text-5xl font-black mb-1 ${weightScore >= 75 ? 'text-rose-600 dark:text-rose-400' : weightScore >= 50 ? 'text-amber-600 dark:text-amber-400' : weightScore >= 20 ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {weightScore}
                    </div>
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400">/ 100</div>
                    <div className="mt-2 w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${weightScore >= 75 ? 'bg-rose-500' : weightScore >= 50 ? 'bg-amber-500' : weightScore >= 20 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, weightScore)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Composite of priority, complexity, effort & skill difficulty
                    </p>
                  </div>
                </SectionCard>
              )}

              {/* Required Skills */}
              {(task.required_skills || []).length > 0 && (
                <SectionCard title="Required Skills" icon="🛠️">
                  <div className="space-y-2">
                    {(task.required_skills || []).map((sk, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{sk.skill_name}</span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">{sk.required_level}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${Math.min(100, sk.required_level)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Quick nav to Recommendations */}
              {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                <SectionCard title="AI Recommendations" icon="🤖">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Run the AI recommendation engine to find the best developer for this task.
                  </p>
                  <Link
                    href={`/recommendations?task_id=${task.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-bold transition"
                  >
                    🤖 Open Recommendation Engine
                  </Link>
                </SectionCard>
              )}
            </div>
          </div>
        )}

        {/* ── DEVELOPER TASK DESCRIPTION (if set) ─────────────────────────── */}
        {isDeveloper && task.description && (
          <SectionCard title="Task Description" icon="📝">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{task.description}</p>
          </SectionCard>
        )}

        {/* ── DEVELOPER REQUIRED SKILLS ───────────────────────────────────── */}
        {isDeveloper && (task.required_skills || []).length > 0 && (
          <SectionCard title="Required Skills" icon="🛠️">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(task.required_skills || []).map((sk, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{sk.skill_name}</div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, sk.required_level)}%` }} />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">Level {sk.required_level}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}
