'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export interface ProjectOption {
  id: string;
  name: string;
}

export interface TaskItem {
  id: string;
  project_id: string;
  project_name?: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'READY' | 'ASSIGNED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
  estimated_hours: number;
  assigned_developer_id?: string;
  assigned_developer_name?: string;
  current_assignment?: {
    id: string;
    developer_id: string;
    developer_name: string;
    status: string;
  };
}

export default function TasksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isDev = user?.role === 'DEVELOPER';
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'PROJECT_GROUPS'>('TABLE');

  // Create Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('8.0');
  const [complexity, setComplexity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    fetchTasksAndProjects();
  }, []);

  const fetchTasksAndProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [tRes, pRes] = await Promise.all([
        fetch('http://localhost:8000/api/tasks', { headers }),
        fetch('http://localhost:8000/api/projects', { headers }),
      ]);

      if (!tRes.ok) throw new Error('Failed to load tasks catalog');
      const tData = await tRes.json();
      setTasks(tData);

      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(pData);
        if (pData.length > 0 && !projectId) {
          setProjectId(pData[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = (targetProjId?: string) => {
    if (targetProjId) {
      setProjectId(targetProjId);
    } else if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
    setShowTaskModal(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      showToast('Please select a Target Project for this task.', 'error');
      return;
    }
    if (!title.trim()) {
      showToast('Task title is required.', 'error');
      return;
    }

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
          description: description.trim() || undefined,
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

      showToast(`Task "${title.trim()}" created successfully!`, 'success');
      setTitle('');
      setDescription('');
      setShowTaskModal(false);
      fetchTasksAndProjects();
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setCreatingTask(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.project_name && t.project_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesProject = projectFilter === 'ALL' || t.project_id === projectFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return matchesSearch && matchesProject && matchesStatus && matchesPriority;
  });

  // Group tasks by project for Project Bifurcated View
  const projectGroupMap = new Map<string, { project: ProjectOption; tasks: TaskItem[] }>();
  projects.forEach((p) => {
    projectGroupMap.set(p.id, { project: p, tasks: [] });
  });

  filteredTasks.forEach((t) => {
    const existing = projectGroupMap.get(t.project_id);
    if (existing) {
      existing.tasks.push(t);
    } else {
      projectGroupMap.set(t.project_id, {
        project: { id: t.project_id, name: t.project_name || 'Unknown Project' },
        tasks: [t],
      });
    }
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Tasks Management</h1>
              <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                {filteredTasks.length} Tasks ({projects.length} Projects)
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Create, filter, and organize tasks assigned to specific projects, and allocate them to optimal developers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            >
              <span>📁</span> Manage Projects
            </Link>

            <button
              onClick={() => handleOpenCreateModal()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <span>+</span> Create Task
            </button>
          </div>
        </div>

        {/* Search, Filters & View Toggle Bar */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <input
              type="text"
              placeholder="Search tasks by title, description, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-3.5 py-2.5 flex-1 focus:outline-none focus:border-blue-500"
            />

            {/* Filter by Project */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-300 font-semibold text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">📁 All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">TODO / Unassigned</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>

            {/* Filter by Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          {/* View Toggle Button Group */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg self-start lg:self-auto">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'TABLE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📊</span> Table View
            </button>
            <button
              onClick={() => setViewMode('PROJECT_GROUPS')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'PROJECT_GROUPS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📁</span> Group by Project
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading tasks catalog & project mapping..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchTasksAndProjects} />
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            title="No Tasks Found"
            description={
              projects.length === 0
                ? 'No projects exist yet. Create a project first to start adding tasks.'
                : 'Create a task or clear filters to view existing tasks.'
            }
            actionLabel={projects.length === 0 ? '+ Create First Project' : '+ Create Task'}
            onAction={() => (projects.length === 0 ? (window.location.href = '/projects') : handleOpenCreateModal())}
          />
        ) : viewMode === 'TABLE' ? (
          /* TABLE VIEW WITH PROJECT COLUMN */
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Task Title</th>
                  <th className="p-3.5">Project</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Complexity</th>
                  <th className="p-3.5">Est. Hours</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assigned Developer</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filteredTasks.map((t) => {
                  const devName = t.assigned_developer_name || t.current_assignment?.developer_name;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        <Link href={`/tasks/${t.id}`} className="hover:text-purple-600 dark:hover:text-purple-400">
                          {t.title}
                        </Link>
                      </td>
                      <td className="p-3.5">
                        <Link
                          href={`/projects/${t.project_id}`}
                          className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-md text-[11px] font-semibold hover:bg-purple-500/20 transition"
                        >
                          <span>📁</span>
                          <span>{t.project_name || 'Project'}</span>
                        </Link>
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={t.priority} type="priority" />
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={t.complexity} type="complexity" />
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{t.estimated_hours} hrs</td>
                      <td className="p-3.5">
                        <StatusBadge status={t.status} type="task_status" />
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {devName ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md text-[11px]">
                            <span>🧑‍💻</span> {devName}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {isDev ? (
                          <Link
                            href={`/tasks/${t.id}`}
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] inline-block transition"
                          >
                            View Task →
                          </Link>
                        ) : !devName ? (
                          <Link
                            href={`/recommendations?task_id=${t.id}`}
                            className="bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 rounded border border-blue-200 dark:border-blue-500/30 text-[11px] inline-block transition"
                          >
                            Find Best Developer →
                          </Link>
                        ) : (
                          <Link
                            href={`/recommendations?task_id=${t.id}`}
                            className="bg-purple-50 dark:bg-purple-600/20 hover:bg-purple-100 dark:hover:bg-purple-600/30 text-purple-600 dark:text-purple-400 font-semibold px-3 py-1.5 rounded border border-purple-200 dark:border-purple-500/30 text-[11px] inline-block transition"
                          >
                            Reassign / View →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* BIFURCATED GROUP-BY-PROJECT VIEW */
          <div className="space-y-6">
            {Array.from(projectGroupMap.values()).map(({ project: proj, tasks: projTasks }) => (
              <div
                key={proj.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📁</span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">
                        {proj.name}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        {projTasks.length} task{projTasks.length !== 1 ? 's' : ''} assigned to this project
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${proj.id}`}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline px-3 py-1.5 rounded bg-purple-50 dark:bg-purple-600/10 border border-purple-200 dark:border-purple-500/30"
                    >
                      Project Details & Kanban →
                    </Link>
                    <button
                      onClick={() => handleOpenCreateModal(proj.id)}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      + Add Task to {proj.name}
                    </button>
                  </div>
                </div>

                {projTasks.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                    No tasks currently created under this project. Click "+ Add Task to {proj.name}" to add one.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug">{t.title}</h4>
                          <StatusBadge status={t.priority} type="priority" />
                        </div>
                        {t.description && (
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2">{t.description}</p>
                        )}
                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400 font-mono">{t.estimated_hours} hrs</span>
                          <StatusBadge status={t.status} type="task_status" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Create New Task</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Tasks are assigned to a specific target project.
                  </p>
                </div>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="space-y-4 py-2">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                    ⚠️ <strong>No Projects Found:</strong> You must create at least one project before you can add tasks.
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowTaskModal(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
                    >
                      Cancel
                    </button>
                    <Link
                      href="/projects"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                    >
                      + Create Project Now
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Target Project <span className="text-rose-500">*</span>:
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-200 font-bold rounded-lg p-2.5 focus:outline-none focus:border-purple-500"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          📁 {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Task Title <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Implement OAuth2 Refresh Strategy"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Description:
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Technical task specs and requirements..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Est. Hours:
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Complexity:
                      </label>
                      <select
                        value={complexity}
                        onChange={(e) => setComplexity(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Priority:
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowTaskModal(false)}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingTask}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg shadow-md shadow-blue-600/20"
                    >
                      {creatingTask ? 'Creating Task...' : 'Create Task'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
