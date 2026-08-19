'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface TeamMember {
  id: string;
  team_id: string;
  developer_id: string;
  user_name?: string;
  user_email?: string;
  experience_years?: number;
  availability_status?: string;
  joined_at: string;
  left_at?: string;
}

export interface Team {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  members_count?: number;
  members?: TeamMember[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_by: string;
  creator_name?: string;
  creator_email?: string;
  created_at: string;
  updated_at: string;
  teams_count?: number;
  teams?: Team[];
}

export default function ProjectsPage() {
  const { token, user, logout, apiUrl } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form state
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchProjects = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      let url = `${apiUrl}/api/projects`;
      if (statusFilter !== 'ALL') {
        url += `?status=${statusFilter}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load projects');
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token, statusFilter]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Project creation failed');

      setName('');
      setDescription('');
      setStatus('ACTIVE');
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}`, {
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
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!token || !confirm('Are you sure you want to delete this project? This will remove associated teams.')) return;
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Delete project failed');
      }
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const filteredProjects = projects.filter((p) => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.creator_name && p.creator_name.toLowerCase().includes(q))
    );
  });

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

  if (!user || !token) {
    return (
      <main className="container" style={{ maxWidth: '500px', paddingTop: '4rem', textAlign: 'center' }}>
        <div className="card">
          <div className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            Authentication Required
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Sign In Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            You must be logged in to view and manage projects.
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
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span className="badge" style={{ margin: 0 }}>Milestone 5 — Projects & Teams</span>
            <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="/developers" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Developers
              </Link>
              <Link href="/skills" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Skills Catalog
              </Link>
              <Link href="/protected" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Auth Area
              </Link>
              <button onClick={logout} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>
                Sign Out
              </button>
            </nav>
          </div>

          <h1 className="title">Project Management</h1>
          <p className="subtitle">View, create, and manage software development projects and assigned teams</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {canManage && (
          <section className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-title">
              <span>🚀 Create New Project</span>
            </div>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mobile App Redesign"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional project goals and architecture overview..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', resize: 'vertical' }}
                />
              </div>

              <div style={{ alignSelf: 'flex-start' }}>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : '+ Create Project'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Filter and Search Bar */}
        <section className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div style={{ flex: '1', maxWidth: '320px' }}>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </section>

        {/* Projects List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <span className="pill pill-loading">Loading projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
            📁 No projects found. {canManage ? 'Create a project above to get started.' : ''}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {filteredProjects.map((p) => (
              <div key={p.id} className="status-box" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span className={`pill ${getStatusBadgeClass(p.status)}`}>{p.status}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    👥 {p.teams_count || 0} Team{(p.teams_count || 0) === 1 ? '' : 's'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  {p.name}
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', flex: 1 }}>
                  {p.description || 'No description provided.'}
                </p>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div>Created by: <strong style={{ color: 'var(--text-secondary)' }}>{p.creator_name || 'Admin'}</strong></div>
                  <div>Created: {new Date(p.created_at).toLocaleDateString()}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Link href={`/projects/${p.id}`} className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                    View & Teams →
                  </Link>

                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value as ProjectStatus)}
                        style={{ padding: '0.3rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.75rem' }}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>

                      <button
                        onClick={() => handleDeleteProject(p.id)}
                        title="Delete project"
                        style={{ padding: '0.3rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
