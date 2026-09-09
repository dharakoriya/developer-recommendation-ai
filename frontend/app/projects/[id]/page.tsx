'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';

export interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  created_at: string;
  teams?: { id: string; name: string; description?: string }[];
}

export interface TaskItem {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  estimated_hours: number;
  assigned_developer_id?: string;
  assigned_developer_name?: string;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [title, setTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [hours, setHours] = useState('8.0');
  const [complexity, setComplexity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    if (projectId) fetchProjectDetails();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const pRes = await fetch(`http://localhost:8000/api/projects/${projectId}`, { headers });
      if (!pRes.ok) throw new Error('Failed to load project details');
      const pData = await pRes.json();
      setProject(pData);

      const tRes = await fetch(`http://localhost:8000/api/tasks/project/${projectId}`, { headers });
      if (tRes.ok) {
        setTasks(await tRes.json());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCreatingTask(true);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch('http://localhost:8000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: projectId,
          title: title.trim(),
          description: taskDesc.trim() || undefined,
          estimated_hours: parseFloat(hours) || 8.0,
          complexity,
          priority,
          status: 'TODO',
          required_skills: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to create task');
      }

      setTitle('');
      setTaskDesc('');
      setShowTaskModal(false);
      fetchProjectDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingTask(false);
    }
  };

  const todoTasks = tasks.filter((t) => t.status === 'TODO');
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  return (
    <AppShell>
      <div className="space-y-6">
        {loading ? (
          <LoadingState message="Loading project details..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchProjectDetails} />
        ) : project ? (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <Link href="/projects" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold">← Projects</Link>
                  <StatusBadge status={project.status} type="project_status" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">{project.name}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{project.description || 'No project description provided.'}</p>
              </div>

              <button
                onClick={() => setShowTaskModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-md shadow-blue-600/20"
              >
                + Create Task
              </button>
            </div>

            {/* Task Status Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: TODO / Unassigned */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Pending / To Do</span>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold px-2 py-0.5 rounded">{todoTasks.length}</span>
                </div>
                {todoTasks.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">No pending tasks.</div>
                ) : (
                  todoTasks.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t.title}</h4>
                        <StatusBadge status={t.priority} type="priority" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2">{t.description || 'No task description.'}</p>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 font-mono">{t.estimated_hours} hrs • {t.complexity}</span>
                        <Link
                          href={`/recommendations?task_id=${t.id}`}
                          className="bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-600 dark:text-blue-400 font-semibold px-2.5 py-1 rounded border border-blue-200 dark:border-blue-500/30 text-[11px] transition"
                        >
                          Find Best Developer →
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Column 2: In Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">In Progress</span>
                  <span className="bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-mono text-xs font-bold px-2 py-0.5 rounded">{inProgressTasks.length}</span>
                </div>
                {inProgressTasks.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">No tasks in progress.</div>
                ) : (
                  inProgressTasks.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t.title}</h4>
                        <StatusBadge status={t.priority} type="priority" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2">{t.description || 'No task description.'}</p>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Assigned: {t.assigned_developer_name || 'Developer'}</span>
                        <StatusBadge status={t.status} type="task_status" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Column 3: Completed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Completed</span>
                  <span className="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono text-xs font-bold px-2 py-0.5 rounded">{completedTasks.length}</span>
                </div>
                {completedTasks.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">No completed tasks yet.</div>
                ) : (
                  completedTasks.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 opacity-80 shadow-sm">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t.title}</h4>
                        <StatusBadge status="COMPLETED" type="task_status" />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{t.estimated_hours} hrs</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Create Task Modal */}
            {showTaskModal && (
              <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Create Task for {project.name}</h3>
                    <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
                  </div>

                  <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Task Title:</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Build JWT Refresh Token API"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Description:</label>
                      <textarea
                        rows={3}
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                        placeholder="Task specifications and acceptance criteria..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Est. Hours:</label>
                        <input
                          type="number"
                          step="0.5"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:border-blue-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Complexity:</label>
                        <select
                          value={complexity}
                          onChange={(e) => setComplexity(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 transition"
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Priority:</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 transition"
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowTaskModal(false)} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium">Cancel</button>
                      <button type="submit" disabled={creatingTask} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg">
                        {creatingTask ? 'Creating...' : 'Create Task'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
