'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Project, ProjectStatus } from '../page';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskComplexity = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
export type AssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'REASSIGNED' | 'CANCELLED';

export interface DeveloperProfile {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  experience_years: number;
  availability_status: string;
}

export interface SkillCatalogItem {
  id: string;
  name: string;
  category?: string;
}

export interface TaskSkill {
  id: string;
  task_id: string;
  skill_id: string;
  skill_name?: string;
  skill_category?: string;
  required_level: number;
  created_at: string;
}

export interface Assignment {
  id: string;
  task_id: string;
  developer_id: string;
  developer_name?: string;
  developer_email?: string;
  assigned_by: string;
  assigner_name?: string;
  status: AssignmentStatus;
  assigned_at: string;
  completed_at?: string;
  reassigned_at?: string;
  notes?: string;
}

export interface Task {
  id: string;
  project_id: string;
  project_name?: string;
  team_id?: string;
  team_name?: string;
  title: string;
  description?: string;
  category?: string;
  priority: TaskPriority;
  complexity: TaskComplexity;
  estimated_hours: number;
  deadline?: string;
  status: TaskStatus;
  created_by: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  required_skills: TaskSkill[];
  current_assignment?: Assignment;
  assignment_history: Assignment[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { token, user, logout, apiUrl } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [developers, setDevelopers] = useState<DeveloperProfile[]>([]);
  const [skillsCatalog, setSkillsCatalog] = useState<SkillCatalogItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: 'TEAMS' | 'TASKS'
  const [activeTab, setActiveTab] = useState<'TEAMS' | 'TASKS'>('TASKS');

  // Teams state
  const [teamName, setTeamName] = useState<string>('');
  const [teamDesc, setTeamDesc] = useState<string>('');
  const [isCreatingTeam, setIsCreatingTeam] = useState<boolean>(false);
  const [selectedDevMap, setSelectedDevMap] = useState<{ [teamId: string]: string }>({});

  // Tasks state
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('ALL');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDesc, setTaskDesc] = useState<string>('');
  const [taskCategory, setTaskCategory] = useState<string>('Backend');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskComplexity, setTaskComplexity] = useState<TaskComplexity>('MEDIUM');
  const [taskEstHours, setTaskEstHours] = useState<number>(8.0);
  const [taskDeadline, setTaskDeadline] = useState<string>('');
  const [taskTeamId, setTaskTeamId] = useState<string>('');
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);

  // Task Skill Addition map
  const [taskSkillMap, setTaskSkillMap] = useState<{ [taskId: string]: { skillId: string; level: number } }>({});

  // Developer Assignment map
  const [assignMap, setAssignMap] = useState<{ [taskId: string]: { devId: string; notes: string } }>({});

  // Assignment History Drawer state
  const [historyModalTask, setHistoryModalTask] = useState<Task | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchProjectDetails = async () => {
    if (!token || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load project details');
      setProject(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!token || !projectId) return;
    setTasksLoading(true);
    try {
      let url = `${apiUrl}/api/projects/${projectId}/tasks`;
      if (taskStatusFilter !== 'ALL') {
        url += `?status=${taskStatusFilter}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchDevelopers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/developers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setDevelopers(data);
    } catch (err) {
      console.error('Error loading developers:', err);
    }
  };

  const fetchSkillsCatalog = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/skills`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setSkillsCatalog(data);
    } catch (err) {
      console.error('Error loading skills catalog:', err);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
    fetchTasks();
    fetchDevelopers();
    fetchSkillsCatalog();
  }, [token, projectId, taskStatusFilter]);

  // Teams Handlers
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !teamName.trim()) return;
    setIsCreatingTeam(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create team');

      setTeamName('');
      setTeamDesc('');
      fetchProjectDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!token || !confirm('Are you sure you want to delete this team?')) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Delete team failed');
      }
      fetchProjectDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMember = async (teamId: string) => {
    const devId = selectedDevMap[teamId];
    if (!token || !devId) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ developer_id: devId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add developer to team');

      setSelectedDevMap((prev) => ({ ...prev, [teamId]: '' }));
      fetchProjectDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (teamId: string, developerId: string) => {
    if (!token || !confirm('Remove this developer from team?')) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/teams/${teamId}/members/${developerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to remove member');
      }

      fetchProjectDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!token || !project) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Status update failed');
      }

      fetchProjectDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Tasks Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !taskTitle.trim()) return;
    setIsCreatingTask(true);
    setError(null);

    try {
      const payload: any = {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        category: taskCategory.trim() || undefined,
        priority: taskPriority,
        complexity: taskComplexity,
        estimated_hours: taskEstHours,
        team_id: taskTeamId || undefined,
      };

      if (taskDeadline) {
        payload.deadline = new Date(taskDeadline).toISOString();
      }

      const res = await fetch(`${apiUrl}/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create task');

      setTaskTitle('');
      setTaskDesc('');
      setTaskEstHours(8.0);
      setTaskDeadline('');
      setTaskTeamId('');
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!token) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Task status update failed');
      }

      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!token || !confirm('Are you sure you want to delete this task?')) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Delete task failed');
      }
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddTaskSkill = async (taskId: string) => {
    const skillData = taskSkillMap[taskId];
    if (!token || !skillData?.skillId) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/tasks/${taskId}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skill_id: skillData.skillId,
          required_level: skillData.level || 75.0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add required skill');

      setTaskSkillMap((prev) => ({ ...prev, [taskId]: { skillId: '', level: 75.0 } }));
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveTaskSkill = async (taskId: string, skillId: string) => {
    if (!token || !confirm('Remove required skill from task?')) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/tasks/${taskId}/skills/${skillId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to remove task skill');
      }

      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Developer Assignment Handler (Non-destructive)
  const handleAssignDeveloper = async (taskId: string) => {
    const assignData = assignMap[taskId];
    if (!token || !assignData?.devId) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          developer_id: assignData.devId,
          notes: assignData.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to assign developer');

      setAssignMap((prev) => ({ ...prev, [taskId]: { devId: '', notes: '' } }));
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCompleteAssignment = async (assignmentId: string) => {
    if (!token) return;
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/assignments/${assignmentId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to complete assignment');
      }

      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadgeClass = (pStatus: ProjectStatus) => {
    switch (pStatus) {
      case 'ACTIVE':
        return 'pill-success';
      case 'COMPLETED':
        return 'pill-loading';
      case 'ARCHIVED':
        return 'pill-error';
      default:
        return 'pill';
    }
  };

  const getPriorityBadgeClass = (p: TaskPriority) => {
    switch (p) {
      case 'CRITICAL':
        return 'pill-error';
      case 'HIGH':
        return 'pill-loading';
      case 'MEDIUM':
        return 'pill';
      case 'LOW':
        return 'pill-success';
      default:
        return 'pill';
    }
  };

  const getTaskStatusBadgeClass = (s: TaskStatus) => {
    switch (s) {
      case 'COMPLETED':
        return 'pill-success';
      case 'IN_PROGRESS':
        return 'pill-loading';
      case 'BLOCKED':
      case 'CANCELLED':
        return 'pill-error';
      default:
        return 'pill';
    }
  };

  if (!user || !token) {
    return (
      <main className="container" style={{ maxWidth: '500px', paddingTop: '4rem', textAlign: 'center' }}>
        <div className="card">
          <div className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            Authentication Required
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Sign In Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            You must be logged in to view project details.
          </p>
          <Link href="/login" className="btn">
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="container">
        {/* Navigation & Header */}
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Link href="/projects" style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', textDecoration: 'none' }}>
              ← Back to Projects
            </Link>

            <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="/developers" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Developers
              </Link>
              <Link href="/skills" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Skills Catalog
              </Link>
              <button onClick={logout} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>
                Sign Out
              </button>
            </nav>
          </div>
        </header>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {loading || !project ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <span className="pill pill-loading">Loading project details...</span>
          </div>
        ) : (
          <>
            {/* Project Details Card */}
            <section className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`pill ${getStatusBadgeClass(project.status)}`}>{project.status}</span>
                    {canManage && (
                      <select
                        value={project.status}
                        onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.75rem' }}
                      >
                        <option value="ACTIVE">Set ACTIVE</option>
                        <option value="COMPLETED">Set COMPLETED</option>
                        <option value="ARCHIVED">Set ARCHIVED</option>
                      </select>
                    )}
                  </div>
                  <h1 className="title" style={{ fontSize: '1.75rem', textAlign: 'left', margin: 0 }}>
                    {project.name}
                  </h1>
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
                {project.description || 'No detailed description provided.'}
              </p>

              <div className="status-grid" style={{ marginBottom: 0 }}>
                <div className="status-box">
                  <div className="status-label">Project Owner</div>
                  <div className="status-value">{project.creator_name || 'Admin'}</div>
                </div>

                <div className="status-box">
                  <div className="status-label">Teams Count</div>
                  <div className="status-value">{project.teams?.length || 0} Team(s)</div>
                </div>

                <div className="status-box">
                  <div className="status-label">Tasks Count</div>
                  <div className="status-value">{tasks.length} Task(s)</div>
                </div>
              </div>
            </section>

            {/* Navigation Tabs (TASKS / TEAMS) */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('TASKS')}
                className="btn"
                style={{
                  background: activeTab === 'TASKS' ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : 'transparent',
                  border: activeTab === 'TASKS' ? 'none' : '1px solid var(--border-color)',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                }}
              >
                📋 Tasks & Assignments ({tasks.length})
              </button>

              <button
                onClick={() => setActiveTab('TEAMS')}
                className="btn"
                style={{
                  background: activeTab === 'TEAMS' ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : 'transparent',
                  border: activeTab === 'TEAMS' ? 'none' : '1px solid var(--border-color)',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                }}
              >
                👥 Project Teams ({project.teams?.length || 0})
              </button>
            </div>

            {/* TAB 1: TASKS & ASSIGNMENTS */}
            {activeTab === 'TASKS' && (
              <section className="card">
                <div className="card-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <span>📋 Tasks & Developer Assignments</span>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
                    <select
                      value={taskStatusFilter}
                      onChange={(e) => setTaskStatusFilter(e.target.value)}
                      style={{ padding: '0.35rem 0.65rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem' }}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>

                {/* Create Task Form (ADMIN/MANAGER) */}
                {canManage && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-indigo)' }}>
                      + Create New Task
                    </h4>
                    <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Task Title *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Implement Payment Gateway"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Category</label>
                          <input
                            type="text"
                            placeholder="e.g. Backend / API"
                            value={taskCategory}
                            onChange={(e) => setTaskCategory(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Estimated Hours *</label>
                          <input
                            type="number"
                            step="0.5"
                            required
                            min="0.5"
                            max="500"
                            value={taskEstHours}
                            onChange={(e) => setTaskEstHours(parseFloat(e.target.value))}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Priority</label>
                          <select
                            value={taskPriority}
                            onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="CRITICAL">CRITICAL</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Complexity</label>
                          <select
                            value={taskComplexity}
                            onChange={(e) => setTaskComplexity(e.target.value as TaskComplexity)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Assign Team (Optional)</label>
                          <select
                            value={taskTeamId}
                            onChange={(e) => setTaskTeamId(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                          >
                            <option value="">-- No Specific Team --</option>
                            {project.teams?.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Deadline (Optional)</label>
                          <input
                            type="date"
                            value={taskDeadline}
                            onChange={(e) => setTaskDeadline(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Description</label>
                        <input
                          type="text"
                          placeholder="Task details and deliverables"
                          value={taskDesc}
                          onChange={(e) => setTaskDesc(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                        />
                      </div>

                      <button type="submit" className="btn" disabled={isCreatingTask} style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        {isCreatingTask ? 'Creating...' : '+ Add Task'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Tasks List */}
                {tasksLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <span className="pill pill-loading">Loading tasks...</span>
                  </div>
                ) : tasks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    No tasks found in this project.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {tasks.map((t) => {
                      const reqSkills = t.required_skills || [];
                      const activeAssign = t.current_assignment;
                      const assignHistory = t.assignment_history || [];

                      return (
                        <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                          {/* Task Card Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                                <span className={`pill ${getTaskStatusBadgeClass(t.status)}`}>{t.status}</span>
                                <span className={`pill ${getPriorityBadgeClass(t.priority)}`}>Priority: {t.priority}</span>
                                <span className="pill" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>Complexity: {t.complexity}</span>
                                {t.category && <span className="pill" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-cyan)' }}>{t.category}</span>}
                              </div>

                              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {t.title}
                              </h3>
                            </div>

                            {/* Task Action Dropdowns / Delete */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <select
                                value={t.status}
                                onChange={(e) => handleTaskStatusChange(t.id, e.target.value as TaskStatus)}
                                style={{ padding: '0.3rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.75rem' }}
                              >
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="BLOCKED">BLOCKED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>

                              {canManage && (
                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  title="Delete task"
                                  style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)', padding: '0.3rem 0.5rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>

                          {t.description && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{t.description}</p>
                          )}

                          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <div>⏱️ Estimated: <strong style={{ color: 'var(--text-secondary)' }}>{t.estimated_hours} hrs</strong></div>
                            {t.deadline && <div>📅 Deadline: <strong style={{ color: 'var(--text-secondary)' }}>{new Date(t.deadline).toLocaleDateString()}</strong></div>}
                            {t.team_name && <div>👥 Team: <strong style={{ color: 'var(--text-secondary)' }}>{t.team_name}</strong></div>}
                          </div>

                          {/* Task Required Skills Section */}
                          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                💡 Required Skills ({reqSkills.length})
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: canManage ? '0.5rem' : '0' }}>
                              {reqSkills.length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  No specific skill requirements added.
                                </span>
                              ) : (
                                reqSkills.map((sk) => (
                                  <span key={sk.id} className="pill" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                    {sk.skill_name} ({sk.required_level}%)
                                    {canManage && (
                                      <button
                                        onClick={() => handleRemoveTaskSkill(t.id, sk.skill_id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.75rem' }}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ))
                              )}
                            </div>

                            {/* Add Required Skill dropdown (ADMIN/MANAGER) */}
                            {canManage && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                <select
                                  value={taskSkillMap[t.id]?.skillId || ''}
                                  onChange={(e) => setTaskSkillMap({ ...taskSkillMap, [t.id]: { skillId: e.target.value, level: taskSkillMap[t.id]?.level || 75.0 } })}
                                  style={{ padding: '0.35rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.75rem', flex: 1 }}
                                >
                                  <option value="">-- Add Required Skill --</option>
                                  {skillsCatalog
                                    .filter((s) => !reqSkills.some((rs) => rs.skill_id === s.id))
                                    .map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} ({s.category || 'General'})
                                      </option>
                                    ))}
                                </select>

                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="Level (0-100)"
                                  value={taskSkillMap[t.id]?.level ?? 75}
                                  onChange={(e) => setTaskSkillMap({ ...taskSkillMap, [t.id]: { skillId: taskSkillMap[t.id]?.skillId || '', level: parseFloat(e.target.value) || 0 } })}
                                  style={{ width: '90px', padding: '0.35rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.75rem' }}
                                />

                                <button
                                  onClick={() => handleAddTaskSkill(t.id)}
                                  disabled={!taskSkillMap[t.id]?.skillId}
                                  className="btn"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                >
                                  + Skill
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Task Assignment Section */}
                          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                👤 Current Assignment
                              </span>

                              <button
                                onClick={() => setHistoryModalTask(t)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                              >
                                📜 View History ({assignHistory.length})
                              </button>
                            </div>

                            {activeAssign ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    👤 {activeAssign.developer_name} ({activeAssign.developer_email})
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Assigned by {activeAssign.assigner_name} on {new Date(activeAssign.assigned_at).toLocaleDateString()}
                                    {activeAssign.notes && <span> • "{activeAssign.notes}"</span>}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleCompleteAssignment(activeAssign.id)}
                                  className="btn"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                                >
                                  ✓ Complete Assignment
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Unassigned task.
                              </div>
                            )}

                            {/* Manual Developer Assignment Form (ADMIN/MANAGER) */}
                            {canManage && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                <select
                                  value={assignMap[t.id]?.devId || ''}
                                  onChange={(e) => setAssignMap({ ...assignMap, [t.id]: { devId: e.target.value, notes: assignMap[t.id]?.notes || '' } })}
                                  style={{ flex: 1, minWidth: '200px', padding: '0.35rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.75rem' }}
                                >
                                  <option value="">-- Select Developer Profile to Assign --</option>
                                  {developers.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.user_name || 'Dev'} ({d.user_email}) — Exp: {d.experience_years} yrs ({d.availability_status})
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="text"
                                  placeholder="Assignment notes (optional)"
                                  value={assignMap[t.id]?.notes || ''}
                                  onChange={(e) => setAssignMap({ ...assignMap, [t.id]: { devId: assignMap[t.id]?.devId || '', notes: e.target.value } })}
                                  style={{ width: '180px', padding: '0.35rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.75rem' }}
                                />

                                <button
                                  onClick={() => handleAssignDeveloper(t.id)}
                                  disabled={!assignMap[t.id]?.devId}
                                  className="btn"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                >
                                  {activeAssign ? '🔄 Reassign' : '+ Assign'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* TAB 2: TEAMS MANAGEMENT */}
            {activeTab === 'TEAMS' && (
              <section className="card">
                <div className="card-title" style={{ justifyContent: 'space-between' }}>
                  <span>👥 Project Teams ({project.teams?.length || 0})</span>
                </div>

                {/* Create Team Form (ADMIN/MANAGER) */}
                {canManage && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-indigo)' }}>
                      + Add New Team to Project
                    </h4>
                    <form onSubmit={handleCreateTeam} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Team Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Frontend Engineering"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Description</label>
                        <input
                          type="text"
                          placeholder="Team purpose or scope"
                          value={teamDesc}
                          onChange={(e) => setTeamDesc(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                        />
                      </div>

                      <button type="submit" className="btn" disabled={isCreatingTeam} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        {isCreatingTeam ? 'Adding...' : '+ Create Team'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Teams List */}
                {(!project.teams || project.teams.length === 0) ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    No teams added to this project yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {project.teams.map((t) => {
                      const activeMembers = t.members || [];
                      const assignedDevIds = new Set(activeMembers.map((m) => m.developer_id));
                      const availableDevs = developers.filter((d) => !assignedDevIds.has(d.id));

                      return (
                        <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {t.name}
                              </h3>
                              {t.description && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.description}</p>
                              )}
                            </div>

                            {canManage && (
                              <button
                                onClick={() => handleDeleteTeam(t.id)}
                                style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)', padding: '0.3rem 0.6rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                🗑️ Delete Team
                              </button>
                            )}
                          </div>

                          <div style={{ marginTop: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Active Members ({activeMembers.length})
                            </h4>

                            {activeMembers.length === 0 ? (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                                No developers currently assigned to this team.
                              </p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                {activeMembers.map((m) => (
                                  <div key={m.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        👤 {m.user_name || 'Developer'}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.user_email}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                                        Exp: {m.experience_years} yrs • Status: {m.availability_status}
                                      </div>
                                    </div>

                                    {canManage && (
                                      <button
                                        onClick={() => handleRemoveMember(t.id, m.developer_id)}
                                        title="Remove from team"
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem' }}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {canManage && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
                                <select
                                  value={selectedDevMap[t.id] || ''}
                                  onChange={(e) => setSelectedDevMap({ ...selectedDevMap, [t.id]: e.target.value })}
                                  style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem' }}
                                >
                                  <option value="">-- Select Developer Profile to Add --</option>
                                  {availableDevs.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.user_name || 'Dev'} ({d.user_email || d.id}) — {d.experience_years} yrs
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => handleAddMember(t.id)}
                                  disabled={!selectedDevMap[t.id]}
                                  className="btn"
                                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  + Add
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ASSIGNMENT HISTORY MODAL / DRAWER */}
        {historyModalTask && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', margin: 0 }}>
              <div className="card-title" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span>📜 Assignment History — {historyModalTask.title}</span>
                <button onClick={() => setHistoryModalTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}>
                  ✕
                </button>
              </div>

              {(!historyModalTask.assignment_history || historyModalTask.assignment_history.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                  No assignment records found for this task.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {historyModalTask.assignment_history.map((h, idx) => (
                    <div key={h.id} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span className={`pill ${h.status === 'ACTIVE' ? 'pill-success' : h.status === 'REASSIGNED' ? 'pill-loading' : h.status === 'COMPLETED' ? 'pill-success' : 'pill-error'}`}>
                          {h.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Record #{historyModalTask.assignment_history.length - idx}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        👤 {h.developer_name} ({h.developer_email})
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Assigned by: {h.assigner_name} on {new Date(h.assigned_at).toLocaleString()}
                      </div>

                      {h.reassigned_at && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', marginTop: '0.25rem' }}>
                          🔄 Reassigned on {new Date(h.reassigned_at).toLocaleString()}
                        </div>
                      )}

                      {h.completed_at && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                          ✓ Completed on {new Date(h.completed_at).toLocaleString()}
                        </div>
                      )}

                      {h.notes && (
                        <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                          Notes: "{h.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                <button onClick={() => setHistoryModalTask(null)} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
