'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/AppShell';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { canEditTeam } from '../../lib/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  developer_id: string;
  user_name?: string;
  user_email?: string;
  experience_years?: number;
  availability_status?: string;
  joined_at: string;
}

interface Team {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  description?: string;
  manager_id?: string;
  manager_name?: string;
  created_at: string;
  members_count: number;
  members: TeamMember[];
  active_tasks_count: number;
  completed_tasks_count: number;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface ManagerOption {
  id: string;
  name: string;
  email: string;
}

interface DeveloperOption {
  id: string;
  user_name: string;
  user_email?: string;
  availability_status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const availColor: Record<string, string> = {
  AVAILABLE: 'text-emerald-600 dark:text-emerald-400',
  BUSY: 'text-amber-600 dark:text-amber-400',
  ON_LEAVE: 'text-rose-600 dark:text-rose-400',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { user, apiUrl: contextApiUrl } = useAuth();
  const { showToast } = useToast();

  const apiUrl = contextApiUrl || 'http://localhost:8000';

  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [allDevs, setAllDevs] = useState<DeveloperOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Team modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamProjectId, setNewTeamProjectId] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamManagerId, setNewTeamManagerId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit Team modal
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Add Member modal
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [selectedDevId, setSelectedDevId] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Expanded teams (show members)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('devalign_token') : null;
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canManageAny = isAdmin || isManager;

  // ── Data fetch ───────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const tRes = await fetch(`${apiUrl}/api/teams`, { headers });
      if (!tRes.ok) throw new Error('Failed to load teams');
      setTeams(await tRes.json());

      if (canManageAny) {
        const [pRes, dRes, mRes] = await Promise.all([
          fetch(`${apiUrl}/api/projects`, { headers }).catch(() => null),
          fetch(`${apiUrl}/api/developers`, { headers }).catch(() => null),
          fetch(`${apiUrl}/api/managers`, { headers }).catch(() => null),
        ]);

        if (pRes && pRes.ok) {
          const pData: ProjectOption[] = await pRes.json();
          setProjects(pData);
          if (pData.length > 0 && !newTeamProjectId) setNewTeamProjectId(pData[0].id);
        }

        if (dRes && dRes.ok) {
          const dData = await dRes.json();
          setAllDevs(
            dData.map((d: any) => ({
              id: d.id,
              user_name: d.user_name || d.name || 'Unknown',
              user_email: d.user_email || d.email,
              availability_status: d.availability_status || 'AVAILABLE',
            }))
          );
        }

        if (mRes && mRes.ok) {
          setManagers(await mRes.json());
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [user]);

  // ── Create Team ──────────────────────────────────────────────────────────

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamProjectId) return;
    setIsCreating(true);
    try {
      const payload: any = {
        project_id: newTeamProjectId,
        name: newTeamName.trim(),
        description: newTeamDesc.trim() || undefined,
      };

      if (isAdmin && newTeamManagerId) {
        payload.manager_id = newTeamManagerId;
      } else if (isManager && user?.id) {
        payload.manager_id = user.id;
      }

      const res = await fetch(`${apiUrl}/api/teams`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create team');
      setNewTeamName('');
      setNewTeamDesc('');
      setNewTeamManagerId('');
      setShowCreateModal(false);
      showToast('Team created successfully', 'success');
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Open Edit Team ───────────────────────────────────────────────────────

  const handleOpenEdit = (team: Team) => {
    setEditingTeam(team);
    setEditName(team.name);
    setEditDesc(team.description || '');
    setEditManagerId(team.manager_id || '');
  };

  // ── Save Edit Team ───────────────────────────────────────────────────────

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editName.trim()) return;
    setIsEditing(true);
    try {
      const payload: any = {
        name: editName.trim(),
        description: editDesc.trim() || null,
      };

      if (isAdmin) {
        payload.manager_id = editManagerId || null;
      }

      const res = await fetch(`${apiUrl}/api/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update team');
      setEditingTeam(null);
      showToast('Team updated successfully', 'success');
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsEditing(false);
    }
  };

  // ── Delete Team ──────────────────────────────────────────────────────────

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/teams/${team.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to delete team');
      }
      showToast('Team deleted successfully', 'success');
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ── Add Member ───────────────────────────────────────────────────────────

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberTeamId || !selectedDevId) return;
    setIsAddingMember(true);
    try {
      const res = await fetch(`${apiUrl}/api/teams/${addMemberTeamId}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ developer_id: selectedDevId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add member');
      showToast('Developer added to team', 'success');
      setAddMemberTeamId(null);
      setSelectedDevId('');
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  // ── Remove Member ────────────────────────────────────────────────────────

  const handleRemoveMember = async (teamId: string, developerId: string) => {
    if (!confirm('Remove this developer from the team?')) return;
    try {
      const res = await fetch(`${apiUrl}/api/teams/${teamId}/members/${developerId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to remove developer');
      }
      showToast('Developer removed from team', 'success');
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {user?.role === 'DEVELOPER' ? 'My Teams' : 'Team Management'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAdmin
                ? 'System-wide teams overview: manage all engineering squads, assign managers, and allocate developers.'
                : isManager
                ? 'Your assigned teams: manage developers, track sprint task progress, and update squad information.'
                : 'Your assigned teams: view your squad allocations, team members, and project scopes.'}
            </p>
          </div>
          {canManageAny && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-purple-600/20 flex items-center gap-1.5"
            >
              <span>+</span> Create Team
            </button>
          )}
        </div>

        {loading ? (
          <LoadingState message="Loading teams..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAll} />
        ) : teams.length === 0 ? (
          <EmptyState
            title={
              user?.role === 'DEVELOPER'
                ? 'No Team Assigned'
                : isManager
                ? 'No Assigned Teams'
                : 'No Teams Yet'
            }
            description={
              user?.role === 'DEVELOPER'
                ? 'You are not assigned to a team yet. Contact your manager or administrator to be assigned to an engineering squad.'
                : isManager
                ? 'You do not have any teams assigned to you yet. Create your first team or contact an administrator.'
                : 'Create your first team to assign developers to project scopes.'
            }
            actionLabel={canManageAny ? '+ Create Team' : undefined}
            onAction={canManageAny ? () => setShowCreateModal(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {teams.map((team) => {
              const isExpanded = expandedTeam === team.id;
              const hasTeamEditPermission = canEditTeam(user?.role, user?.id, team.manager_id);

              return (
                <div
                  key={team.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  {/* Team Header */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate">{team.name}</h3>
                          {user?.role === 'DEVELOPER' && (
                            <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 shrink-0">
                              🛡️ My Squad
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono font-medium text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            📁 {team.project_name || 'General Project'}
                          </span>
                          {team.manager_name ? (
                            <span
                              className="text-[10px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                              title="Assigned Manager"
                            >
                              👤 Manager: {team.manager_name}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              ⚠️ Unassigned Manager
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-mono font-semibold border border-slate-200 dark:border-slate-700">
                          {team.members_count} {team.members_count === 1 ? 'Member' : 'Members'}
                        </span>
                      </div>
                    </div>

                    {team.description ? (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {team.description}
                      </p>
                    ) : (
                      <p className="text-xs italic text-slate-400 dark:text-slate-500">No description provided.</p>
                    )}

                    {/* Task counts */}
                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div className="text-lg font-black text-blue-700 dark:text-blue-300">{team.active_tasks_count}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Active Tasks</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{team.completed_tasks_count}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Completed Tasks</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                        className="flex-1 text-xs font-semibold py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                      >
                        {isExpanded ? '▲ Hide Members' : `▼ View Members (${team.members_count})`}
                      </button>

                      {hasTeamEditPermission && (
                        <>
                          <button
                            onClick={() => {
                              setAddMemberTeamId(team.id);
                              setSelectedDevId(allDevs[0]?.id || '');
                            }}
                            className="text-xs font-semibold px-3 py-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition"
                            title="Add developer to this team"
                          >
                            + Add Dev
                          </button>
                          <button
                            onClick={() => handleOpenEdit(team)}
                            className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                            title="Edit team details"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team)}
                            className="text-xs font-semibold px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition"
                            title="Delete team"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Members list (expandable) */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-1">
                      {team.members.length === 0 ? (
                        <div className="text-center py-6 space-y-2">
                          <p className="text-xs text-slate-400">No active members in this team.</p>
                          {hasTeamEditPermission && (
                            <button
                              onClick={() => {
                                setAddMemberTeamId(team.id);
                                setSelectedDevId(allDevs[0]?.id || '');
                              }}
                              className="text-xs font-bold text-purple-600 hover:text-purple-500 underline"
                            >
                              + Assign a Developer
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                          {team.members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-lg transition">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 shrink-0">
                                  {(m.user_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{m.user_name || '—'}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">{m.user_email || ''}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                {m.availability_status && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/50 ${availColor[m.availability_status] || 'text-slate-500'}`}>
                                    {m.availability_status}
                                  </span>
                                )}
                                {m.experience_years != null && (
                                  <span className="text-[10px] text-slate-400 font-mono">{m.experience_years} yrs</span>
                                )}
                                {hasTeamEditPermission && (
                                  <button
                                    onClick={() => handleRemoveMember(team.id, m.developer_id)}
                                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                                    title="Remove developer from team"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Create Team Modal ─────────────────────────────────────────────── */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Create New Team</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Project: *</label>
                  <select
                    value={newTeamProjectId}
                    onChange={(e) => setNewTeamProjectId(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Team Name: *</label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Core Payments Squad"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {isAdmin ? (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Assigned Manager:</label>
                    <select
                      value={newTeamManagerId}
                      onChange={(e) => setNewTeamManagerId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">— Unassigned —</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : isManager ? (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Assigned Manager:</label>
                    <div className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg p-2.5 font-medium">
                      👤 {user?.name} (You)
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Description:</label>
                  <textarea
                    rows={3}
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    placeholder="Team responsibilities, domain architecture, and scope..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50 transition"
                  >
                    {isCreating ? 'Creating…' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Edit Team Modal ───────────────────────────────────────────────── */}
        {editingTeam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Edit Team Details</h3>
                <button
                  onClick={() => setEditingTeam(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Team Name: *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Team name..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Assigned Manager:</label>
                    <select
                      value={editManagerId}
                      onChange={(e) => setEditManagerId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">— Unassigned —</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Description:</label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Team description and responsibility scope..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTeam(null)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditing}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50 transition"
                  >
                    {isEditing ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Add Member Modal ──────────────────────────────────────────────── */}
        {addMemberTeamId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Add Developer to Team</h3>
                <button
                  onClick={() => setAddMemberTeamId(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddMember} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Select Developer:</label>
                  <select
                    value={selectedDevId}
                    onChange={(e) => setSelectedDevId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">— Select developer —</option>
                    {allDevs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user_name} ({d.availability_status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddMemberTeamId(null)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingMember || !selectedDevId}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50 transition"
                  >
                    {isAddingMember ? 'Adding…' : 'Add to Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
