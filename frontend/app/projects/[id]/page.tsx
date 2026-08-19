'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Project, ProjectStatus, Team, TeamMember } from '../page';

interface DeveloperProfile {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  experience_years: number;
  availability_status: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { token, user, logout, apiUrl } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [developers, setDevelopers] = useState<DeveloperProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create Team form state
  const [teamName, setTeamName] = useState<string>('');
  const [teamDesc, setTeamDesc] = useState<string>('');
  const [isCreatingTeam, setIsCreatingTeam] = useState<boolean>(false);

  // Add Member state per team
  const [selectedDevMap, setSelectedDevMap] = useState<{ [teamId: string]: string }>({});

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

  const fetchDevelopers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/developers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDevelopers(data);
      }
    } catch (err) {
      console.error('Error loading developers:', err);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
    fetchDevelopers();
  }, [token, projectId]);

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
            <section className="card" style={{ marginBottom: '2rem' }}>
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
                  <div className="status-label">Project Owner / Creator</div>
                  <div className="status-value">{project.creator_name || 'Admin'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{project.creator_email}</div>
                </div>

                <div className="status-box">
                  <div className="status-label">Associated Teams</div>
                  <div className="status-value">{project.teams?.length || 0} Team(s)</div>
                </div>

                <div className="status-box">
                  <div className="status-label">Created Date</div>
                  <div className="status-value">{new Date(project.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </section>

            {/* Teams Management Section */}
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

                        {/* Team Members List */}
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
                                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem' }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Developer Dropdown (ADMIN/MANAGER) */}
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
          </>
        )}
      </main>
    </div>
  );
}
