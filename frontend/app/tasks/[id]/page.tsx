'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../components/AppShell';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { useToast } from '../../../context/ToastContext';

interface TaskDetail {
  id: string;
  title: string;
  description?: string;
  project_id?: string;
  project_name?: string;
  team_id?: string;
  team_name?: string;
  status: string;
  priority: string;
  complexity: string;
  estimated_hours: number;
  created_at?: string;
  due_date?: string;
  task_weight_score?: number;
  task_weight_category?: string;
  weight_breakdown?: {
    complexity_score?: number;
    priority_score?: number;
    effort_score?: number;
    skill_difficulty_score?: number;
  };
  required_skills?: { skill_name: string; required_level: number }[];
  assignment?: {
    id: string;
    developer_id: string;
    developer_name?: string;
    compatibility_score?: number;
    current_workload?: number;
    assigned_at?: string;
    status?: string;
  };
}

interface RecHistoryItem {
  id: string;
  created_at: string;
  developer_name: string;
  rank: number;
  compatibility_score: number;
  eligibility_status: string;
  selected_by_user_id?: string;
  selection_reason?: string;
  override_reason?: string;
  assigned_at?: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;
  const { showToast } = useToast();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [history, setHistory] = useState<RecHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [blockerReason, setBlockerReason] = useState<string>('');
  const [showBlockerInput, setShowBlockerInput] = useState<boolean>(false);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail();
      fetchRecommendationHistory();
    }
  }, [taskId]);

  const fetchTaskDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error('Failed to load task details');
      }
      const data = await res.json();
      setTask(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendationHistory = async () => {
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/recommendations/tasks/${taskId}/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      // optional history load
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (!task) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('devalign_token');
      const payload: any = { status: newStatus };
      if (newStatus === 'BLOCKED' && blockerReason) {
        payload.blocker_reason = blockerReason;
      }

      const res = await fetch(`http://localhost:8000/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update task status');
      }

      setTask((prev) => (prev ? { ...prev, status: data.status } : null));
      showToast(`Task status updated to ${data.status}`, 'success');
      setShowBlockerInput(false);
      setBlockerReason('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleReopen = async () => {
    if (!task) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/tasks/${taskId}/reopen`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to reopen task');
      }

      setTask((prev) => (prev ? { ...prev, status: data.status } : null));
      showToast('Task successfully reopened to READY status', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Loading central task intelligence..." />
      </AppShell>
    );
  }

  if (error || !task) {
    return (
      <AppShell>
        <ErrorState message={error || 'Task not found'} onRetry={fetchTaskDetail} />
      </AppShell>
    );
  }

  const weightCategory = task.task_weight_category || 'MODERATE';
  const weightScore = task.task_weight_score ?? 50;

  const getWeightColor = (cat: string) => {
    switch (cat) {
      case 'LIGHT': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'MODERATE': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'HEAVY': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'CRITICAL': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'TODO': return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'READY': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'IN_PROGRESS': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'IN_REVIEW': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'BLOCKED': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'CANCELLED': return 'bg-slate-800 text-slate-500 border-slate-700';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link href="/tasks" className="hover:text-purple-400">Tasks</Link>
              <span>/</span>
              <span className="text-slate-200 font-mono">{task.project_name || 'Project'}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{task.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border font-mono ${getStatusBadge(task.status)}`}>
              {task.status}
            </span>

            <Link
              href={`/recommendations?task_id=${task.id}`}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center gap-1.5"
            >
              <span>⚡ Find Best Developer</span>
            </Link>
          </div>
        </div>

        {/* Status Transition Control Bar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workflow Action:</span>
            {task.status === 'TODO' && (
              <button
                onClick={() => handleStatusTransition('READY')}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
              >
                Mark Ready
              </button>
            )}
            {(task.status === 'TODO' || task.status === 'READY' || task.status === 'BLOCKED') && (
              <button
                onClick={() => handleStatusTransition('IN_PROGRESS')}
                disabled={updating}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
              >
                Start Task (In Progress)
              </button>
            )}
            {task.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleStatusTransition('IN_REVIEW')}
                disabled={updating}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
              >
                Mark Ready for Review
              </button>
            )}
            {(task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW') && (
              <button
                onClick={() => handleStatusTransition('COMPLETED')}
                disabled={updating}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
              >
                ✓ Complete Task
              </button>
            )}
            {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && task.status !== 'BLOCKED' && (
              <button
                onClick={() => setShowBlockerInput(!showBlockerInput)}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl transition"
              >
                🚨 Report Blocker
              </button>
            )}
            {(task.status === 'COMPLETED' || task.status === 'CANCELLED') && (
              <button
                onClick={handleReopen}
                disabled={updating}
                className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl transition"
              >
                🔓 Reopen Task
              </button>
            )}
          </div>

          {showBlockerInput && (
            <div className="w-full flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                placeholder="Describe blocker issue..."
                className="flex-1 bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={() => handleStatusTransition('BLOCKED')}
                disabled={updating || !blockerReason.trim()}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                Confirm Blocker
              </button>
            </div>
          )}
        </div>

        {/* 2-Column Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3): Task Overview + Task Weight Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Overview */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Task Overview</h2>
              {task.description && (
                <p className="text-slate-300 text-sm leading-relaxed">{task.description}</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Priority</span>
                  <span className="text-amber-400 font-bold font-mono">{task.priority}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Complexity</span>
                  <span className="text-purple-400 font-bold font-mono">{task.complexity}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Estimated Effort</span>
                  <span className="text-cyan-400 font-bold font-mono">{task.estimated_hours} Hours</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Created Date</span>
                  <span className="text-slate-300 font-mono">
                    {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Task Weight Intelligence */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-purple-500/20 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    <span>🎯</span> Task Weight Intelligence
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Calculated based on complexity, priority, effort & skill difficulty</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-xl border ${getWeightColor(weightCategory)}`}>
                    {weightCategory}
                  </span>
                  <span className="text-2xl font-extrabold text-white font-mono block mt-1">
                    {weightScore} <span className="text-xs text-slate-500">/ 100</span>
                  </span>
                </div>
              </div>

              {/* Breakdown progress bars */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Complexity Score</span>
                    <span className="font-mono text-purple-400 font-bold">{task.weight_breakdown?.complexity_score ?? Math.round(weightScore * 0.35)} / 100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all"
                      style={{ width: `${task.weight_breakdown?.complexity_score ?? Math.round(weightScore * 0.35)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Priority Weight</span>
                    <span className="font-mono text-amber-400 font-bold">{task.weight_breakdown?.priority_score ?? Math.round(weightScore * 0.25)} / 100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${task.weight_breakdown?.priority_score ?? Math.round(weightScore * 0.25)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Effort & Hours Impact</span>
                    <span className="font-mono text-cyan-400 font-bold">{task.weight_breakdown?.effort_score ?? Math.round(weightScore * 0.2)} / 100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all"
                      style={{ width: `${task.weight_breakdown?.effort_score ?? Math.round(weightScore * 0.2)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Skill Difficulty Level</span>
                    <span className="font-mono text-blue-400 font-bold">{task.weight_breakdown?.skill_difficulty_score ?? Math.round(weightScore * 0.2)} / 100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${task.weight_breakdown?.skill_difficulty_score ?? Math.round(weightScore * 0.2)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Required Skills */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Required Skills & Target Proficiency</h2>
              {task.required_skills && task.required_skills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.required_skills.map((s, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-200 font-bold text-xs">{s.skill_name}</span>
                      <span className="text-purple-400 font-mono font-bold text-xs">Required Level {s.required_level}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No specific skill requirements specified for this task.</p>
              )}
            </div>
          </div>

          {/* Right Column (1/3): Assignment Card + Recommendation History */}
          <div className="space-y-6">
            {/* Assignment Section */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Assigned Developer</h2>

              {task.assignment ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {task.assignment.developer_name?.[0] || 'D'}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">{task.assignment.developer_name}</h3>
                      <span className="text-xs text-slate-400 block font-mono">Assigned Developer</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Compatibility</span>
                      <span className="text-purple-400 font-extrabold font-mono">{task.assignment.compatibility_score ?? 85}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Workload</span>
                      <span className="text-emerald-400 font-extrabold font-mono">{task.assignment.current_workload ?? 35}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-3">
                  <span className="text-2xl block">🧑‍💻</span>
                  <p className="text-xs text-slate-400">No developer assigned to this task yet.</p>
                  <Link
                    href={`/recommendations?task_id=${task.id}`}
                    className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition"
                  >
                    Find & Assign Developer →
                  </Link>
                </div>
              )}
            </div>

            {/* Recommendation History */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recommendation History</h2>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((h, i) => (
                    <div key={h.id || i} className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-1 text-xs">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span>Run #{history.length - i}</span>
                        <span>{new Date(h.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-slate-200">
                        <span>{h.developer_name}</span>
                        <span className="text-purple-400 font-mono">{h.compatibility_score}%</span>
                      </div>
                      {h.selection_reason && (
                        <p className="text-[10px] text-slate-400 italic">Reason: {h.selection_reason}</p>
                      )}
                      {h.override_reason && (
                        <p className="text-[10px] text-amber-400 font-medium">Override: {h.override_reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No historical recommendation runs recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
