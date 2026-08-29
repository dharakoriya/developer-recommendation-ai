'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface AssignmentRecord {
  id: string;
  task_id: string;
  task_title?: string;
  developer_id: string;
  developer_name?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'REASSIGNED' | 'CANCELLED';
  assigned_at: string;
  completed_at?: string;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setAssignments(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (assignmentId: string) => {
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/assignments/complete/${assignmentId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to complete assignment');
      }
      fetchAssignments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Task Assignments</h1>
            <p className="text-slate-400 text-xs mt-1">Track active and completed developer task assignments.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading task assignments..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAssignments} />
        ) : assignments.length === 0 ? (
          <EmptyState
            title="No Active Assignments"
            description="Use the recommendations workflow to allocate developers to open tasks."
          />
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Task</th>
                  <th className="p-3.5">Assigned Developer</th>
                  <th className="p-3.5">Assigned Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold text-white max-w-xs truncate">{a.task_title || a.task_id}</td>
                    <td className="p-3.5 text-slate-200 font-medium">{a.developer_name || a.developer_id}</td>
                    <td className="p-3.5 text-slate-400 font-mono">{new Date(a.assigned_at).toLocaleDateString()}</td>
                    <td className="p-3.5"><StatusBadge status={a.status} type="assignment_status" /></td>
                    <td className="p-3.5 text-right">
                      {a.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleComplete(a.id)}
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold px-3 py-1 rounded transition"
                        >
                          Mark Completed
                        </button>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
