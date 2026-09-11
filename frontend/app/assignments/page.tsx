'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useToast } from '../../context/ToastContext';

export interface AssignmentRecord {
  id: string;
  task_id: string;
  task_title?: string;
  project_name?: string;
  developer_id: string;
  developer_name?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'REASSIGNED' | 'CANCELLED';
  assigned_at: string;
  completed_at?: string;
  compatibility_score?: number;
  task_weight_score?: number;
  task_weight_category?: string;
  workload_score?: number;
  due_date?: string;
}

export default function AssignmentsPage() {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [weightFilter, setWeightFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch('http://localhost:8000/api/assignments', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load task assignments');
      const data = await res.json();
      setAssignments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (assignmentId: string) => {
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/assignments/${assignmentId}/complete`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to complete assignment');
      }
      showToast('Assignment marked as completed and rewards updated!', 'success');
      fetchAssignments();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getWorkloadRiskBadge = (workload: number) => {
    if (workload > 100) {
      return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold">🔴 Overloaded ({workload}%)</span>;
    }
    if (workload >= 86) {
      return <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded font-mono font-bold">🟠 High Risk ({workload}%)</span>;
    }
    if (workload >= 71) {
      return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">🟡 Moderate ({workload}%)</span>;
    }
    return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">🟢 Healthy ({workload}%)</span>;
  };

  const getWeightBadge = (category?: string, score?: number) => {
    const cat = category || 'MODERATE';
    let colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (cat === 'LIGHT') colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (cat === 'HEAVY') colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (cat === 'CRITICAL') colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

    return (
      <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold ${colorClass}`}>
        {cat} {score !== undefined ? `(${score})` : ''}
      </span>
    );
  };

  const filteredAssignments = assignments.filter((a) => {
    const titleMatch = (a.task_title || a.task_id).toLowerCase().includes(search.toLowerCase()) ||
                       (a.developer_name || a.developer_id).toLowerCase().includes(search.toLowerCase()) ||
                       (a.project_name || '').toLowerCase().includes(search.toLowerCase());

    const statusMatch = statusFilter === 'ALL' || a.status === statusFilter;
    const weightMatch = weightFilter === 'ALL' || (a.task_weight_category || 'MODERATE') === weightFilter;

    const wl = a.workload_score ?? 35;
    let riskMatch = true;
    if (riskFilter === 'HEALTHY') riskMatch = wl <= 70;
    if (riskFilter === 'MODERATE') riskMatch = wl >= 71 && wl <= 85;
    if (riskFilter === 'HIGH') riskMatch = wl >= 86 && wl <= 100;
    if (riskFilter === 'OVERLOADED') riskMatch = wl > 100;

    return titleMatch && statusMatch && weightMatch && riskMatch;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Assignment Management Intelligence</h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
              Central management interface for developer assignments, capacity risks, task weights & completion outcomes.
            </p>
          </div>
          <Link
            href="/recommendations"
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-1.5"
          >
            <span>⚡ New Recommendation Assignment</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-sm">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search task, developer, project..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REASSIGNED">REASSIGNED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Task Weight</label>
            <select
              value={weightFilter}
              onChange={(e) => setWeightFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Weights</option>
              <option value="LIGHT">LIGHT</option>
              <option value="MODERATE">MODERATE</option>
              <option value="HEAVY">HEAVY</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Workload Risk</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HEALTHY">🟢 Healthy (0-70%)</option>
              <option value="MODERATE">🟡 Moderate (71-85%)</option>
              <option value="HIGH">🟠 High Risk (86-100%)</option>
              <option value="OVERLOADED">🔴 Overloaded (&gt;100%)</option>
            </select>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <LoadingState message="Loading assignment intelligence database..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAssignments} />
        ) : filteredAssignments.length === 0 ? (
          <EmptyState
            title="No Assignments Found"
            description="No task assignments match your search and filter parameters."
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Task & Project</th>
                    <th className="p-4">Assigned Developer</th>
                    <th className="p-4">Compatibility</th>
                    <th className="p-4">Task Weight</th>
                    <th className="p-4">Workload Risk</th>
                    <th className="p-4">Assigned Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <Link href={`/tasks/${a.task_id}`} className="font-bold text-white hover:text-purple-400 block text-xs truncate max-w-xs">
                          {a.task_title || a.task_id}
                        </Link>
                        <span className="text-[10px] text-slate-500 font-mono block">{a.project_name || 'Agile Core Project'}</span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-[10px]">
                            {(a.developer_name || 'D')[0]}
                          </div>
                          <span className="text-slate-200 font-semibold">{a.developer_name || a.developer_id}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-mono font-bold text-purple-400 text-xs">
                          {a.compatibility_score ?? 88}%
                        </span>
                      </td>

                      <td className="p-4">
                        {getWeightBadge(a.task_weight_category, a.task_weight_score)}
                      </td>

                      <td className="p-4">
                        {getWorkloadRiskBadge(a.workload_score ?? 45)}
                      </td>

                      <td className="p-4 text-slate-400 font-mono">
                        {new Date(a.assigned_at).toLocaleDateString()}
                      </td>

                      <td className="p-4">
                        <StatusBadge status={a.status} type="assignment_status" />
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {a.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleComplete(a.id)}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition"
                          >
                            ✓ Complete Task
                          </button>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">Archived</span>
                        )}

                        <Link
                          href={`/tasks/${a.task_id}`}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition inline-block"
                        >
                          View Task →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
