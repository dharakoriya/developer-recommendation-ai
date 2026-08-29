'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/AppShell';
import { StatCard } from '../../../components/StatCard';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';

export interface AuditRecord {
  id: string;
  recommendation_id: string;
  developer_id: string;
  developer_name?: string;
  task_id: string;
  task_title?: string;
  model_name: string;
  model_version: string;
  environment: string;
  rank: number;
  score: number;
  created_at: string;
}

export default function RecommendationsAuditPage() {
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch('http://localhost:8000/api/recommendations/audit/logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load recommendation audit logs');
      setAudits(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status="RESEARCH" type="environment" />
              <span className="text-xs text-purple-400 font-mono font-bold">MODEL GOVERNANCE & PROVENANCE</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Recommendation Audit & Model Governance Log</h1>
            <p className="text-slate-400 text-xs mt-0.5">Immutable audit trail of prediction timestamps, model versions, environments, and feature snapshots.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading recommendation audit logs..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAuditLogs} />
        ) : audits.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
            No audit logs recorded yet. Generate recommendations to populate auditable log entries.
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Task</th>
                  <th className="p-3.5">Developer Candidate</th>
                  <th className="p-3.5">Rank</th>
                  <th className="p-3.5">Score</th>
                  <th className="p-3.5">Model Version</th>
                  <th className="p-3.5">Environment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono text-slate-400">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="p-3.5 font-bold text-white max-w-xs truncate">{a.task_title || a.task_id}</td>
                    <td className="p-3.5 text-slate-200">{a.developer_name || a.developer_id}</td>
                    <td className="p-3.5 font-mono font-bold text-purple-400">#{a.rank}</td>
                    <td className="p-3.5 font-mono font-bold text-blue-400">{Math.round(a.score > 1 ? a.score : a.score * 100)} / 100</td>
                    <td className="p-3.5 font-mono text-slate-300">{a.model_version}</td>
                    <td className="p-3.5"><StatusBadge status={a.environment} type="environment" /></td>
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
