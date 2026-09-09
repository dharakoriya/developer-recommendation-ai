'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useToast } from '../../context/ToastContext';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  created_by: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  teams_count?: number;
}

export default function ProjectsPage() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Project Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      let url = 'http://localhost:8000/api/projects';
      if (statusFilter !== 'ALL') {
        url += `?status=${statusFilter}`;
      }
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch('http://localhost:8000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create project');

      showToast(`Project "${data.name}" created successfully!`, 'success');
      setShowModal(false);
      setName('');
      setDescription('');
      setStatus('ACTIVE');
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Projects Management</h1>
            <p className="text-slate-400 text-xs mt-1">Manage development projects, teams, tasks, and allocations.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/ai-planning"
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5"
            >
              <span>✨</span> Plan with AI
            </Link>
            <Link
              href="/projects/new"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-lg shadow-blue-600/20"
            >
              + Create Project
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3.5 py-2.5 flex-1 focus:outline-none focus:border-blue-500"
          />
          <div className="flex items-center gap-2">
            {['ALL', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition border ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading projects catalog..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchProjects} />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title="No Projects Found"
            description="Create your first development project to begin assigning tasks and developer teams."
            actionLabel="+ Create Project"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((p) => (
              <div key={p.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-extrabold text-white text-base leading-snug">{p.name}</h3>
                    <StatusBadge status={p.status} type="project_status" />
                  </div>
                  <p className="text-slate-400 text-xs line-clamp-2">{p.description || 'No description provided.'}</p>
                </div>

                <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">Teams: {p.teams_count ?? 0}</span>
                  <Link
                    href={`/projects/${p.id}`}
                    className="bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold px-3 py-1.5 rounded-md transition border border-slate-700"
                  >
                    View Project Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base">Create New Project</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Project Name:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Core Authentication Service"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description:</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Project scope and description..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Initial Status:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg">
                    {isSubmitting ? 'Creating...' : 'Create Project'}
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
