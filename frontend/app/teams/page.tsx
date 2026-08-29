'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/AppShell';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface TeamMember {
  id: string;
  user_name?: string;
  user_email?: string;
  joined_at: string;
}

export interface Team {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  description?: string;
  created_at: string;
  members_count?: number;
  members?: TeamMember[];
}

export interface ProjectOption {
  id: string;
  name: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTeamsAndProjects();
  }, []);

  const fetchTeamsAndProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const tRes = await fetch('http://localhost:8000/api/teams', { headers });
      if (!tRes.ok) throw new Error('Failed to load teams');
      setTeams(await tRes.json());

      const pRes = await fetch('http://localhost:8000/api/projects', { headers });
      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(pData);
        if (pData.length > 0) setProjectId(pData[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectId) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch('http://localhost:8000/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: projectId,
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to create team');
      }

      setName('');
      setDescription('');
      setShowModal(false);
      fetchTeamsAndProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Teams Management</h1>
            <p className="text-slate-400 text-xs mt-1">Organize engineering team members and project assignments.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-blue-600/20"
          >
            + Create Team
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading teams catalog..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchTeamsAndProjects} />
        ) : teams.length === 0 ? (
          <EmptyState
            title="No Teams Created"
            description="Create your first engineering team to assign developers to project scopes."
            actionLabel="+ Create Team"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => (
              <div key={t.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition">
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-white text-base">{t.name}</h3>
                  <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-semibold">
                    {t.members_count ?? (t.members?.length || 0)} Members
                  </span>
                </div>
                <p className="text-slate-400 text-xs">{t.description || 'No team description.'}</p>
                <div className="pt-2 border-t border-slate-800 text-xs text-slate-500 font-mono">
                  Project ID: {t.project_id.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Team Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base">Create New Team</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Project Scope:</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Team Name:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Backend Platform Squad"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description:</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Team responsibilities..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg">
                    {isSubmitting ? 'Creating...' : 'Create Team'}
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
