'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/AppShell';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useToast } from '../../context/ToastContext';

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
  const { showToast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [allDevs, setAllDevs] = useState<DeveloperOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Team modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamProjectId, setNewTeamProjectId] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Add Member modal
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [selectedDevId, setSelectedDevId] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Expanded teams (show members)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('devalign_token') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

  // ── Data fetch ───────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, pRes, dRes] = await Promise.all([
        fetch('http://localhost:8000/api/teams', { headers }),
        fetch('http://localhost:8000/api/projects', { headers }),
        fetch('http://localhost:8000/api/developers', { headers }),
      ]);

      if (!tRes.ok) throw new Error('Failed to load teams');
      setTeams(await tRes.json());

      if (pRes.ok) {
        const pData: ProjectOption[] = await pRes.json();
        setProjects(pData);
        if (pData.length > 0 && !newTeamProjectId) setNewTeamProjectId(pData[0].id);
      }

      if (dRes.ok) {
        const dData = await dRes.json();
        setAllDevs(dData.map((d: any) => ({
          id: d.id,  // DeveloperProfile.id — used as developer_id in TeamMemberAdd
          user_name: d.user_name || d.name || 'Unknown',
          user_email: d.user_email || d.email,
          availability_status: d.availability_status || 'AVAILABLE',
        })));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Create Team ──────────────────────────────────────────────────────────

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamProjectId) return;
    setIsCreating(true);
    try {
      const res = await fetch('http://localhost:8000/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify({ project_id: newTeamProjectId, name: newTeamName.trim(), description: newTeamDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create team');
      setNewTeamName(''); setNewTeamDesc(''); setShowCreateModal(false);
      showToast('Team created successfully', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Add Member ───────────────────────────────────────────────────────────

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberTeamId || !selectedDevId) return;
    setIsAddingMember(true);
    try {
      const res = await fetch(`http://localhost:8000/api/teams/${addMemberTeamId}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ developer_id: selectedDevId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add member');
      showToast('Developer added to team', 'success');
      setAddMemberTeamId(null); setSelectedDevId('');
      fetchAll();
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
      const res = await fetch(`http://localhost:8000/api/teams/${teamId}/members/${developerId}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to remove');
      }
      showToast('Developer removed from team', 'success');
      fetchAll();
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
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Team Management</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create and manage engineering teams, assign developers, and track team task progress.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-purple-600/20"
          >
            + Create Team
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading teams..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAll} />
        ) : teams.length === 0 ? (
          <EmptyState
            title="No Teams Yet"
            description="Create your first team to assign developers to project scopes."
            actionLabel="+ Create Team"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {teams.map((team) => {
              const isExpanded = expandedTeam === team.id;
              return (
                <div
                  key={team.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                  {/* Team Header */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate">{team.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {team.project_name || 'Unknown Project'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono font-semibold border border-slate-200 dark:border-slate-700">
                          {team.members_count} Members
                        </span>
                      </div>
                    </div>

                    {team.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{team.description}</p>
                    )}

                    {/* Task counts */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div className="text-lg font-black text-blue-700 dark:text-blue-300">{team.active_tasks_count}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Active Tasks</div>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{team.completed_tasks_count}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Completed</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                        className="flex-1 text-xs font-semibold py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                      >
                        {isExpanded ? '▲ Hide Members' : `▼ Show Members (${team.members_count})`}
                      </button>
                      <button
                        onClick={() => { setAddMemberTeamId(team.id); setSelectedDevId(allDevs[0]?.id || ''); }}
                        className="text-xs font-semibold px-3 py-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition"
                      >
                        + Add Dev
                      </button>
                    </div>
                  </div>

                  {/* Members list (expandable) */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                      {team.members.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-5">No active members. Add a developer above.</p>
                      ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                          {team.members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 shrink-0">
                                  {(m.user_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{m.user_name || '—'}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">{m.user_email || ''}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {m.availability_status && (
                                  <span className={`text-[10px] font-bold ${availColor[m.availability_status] || 'text-slate-500'}`}>
                                    {m.availability_status}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-mono">{m.experience_years != null ? `${m.experience_years} yrs` : ''}</span>
                                <button
                                  onClick={() => handleRemoveMember(team.id, m.developer_id)}
                                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                                  title="Remove from team"
                                >
                                  ✕
                                </button>
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
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
              </div>
              <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Project:</label>
                  <select
                    value={newTeamProjectId}
                    onChange={(e) => setNewTeamProjectId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500"
                  >
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Team Name: *</label>
                  <input
                    type="text" required value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Backend Platform Squad"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Description:</label>
                  <textarea
                    rows={3} value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)}
                    placeholder="Team responsibilities and scope..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-semibold">Cancel</button>
                  <button type="submit" disabled={isCreating} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50">
                    {isCreating ? 'Creating…' : 'Create Team'}
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
                <button onClick={() => setAddMemberTeamId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
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
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setAddMemberTeamId(null)} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-semibold">Cancel</button>
                  <button type="submit" disabled={isAddingMember || !selectedDevId} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50">
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
