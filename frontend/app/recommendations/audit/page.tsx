'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/AppShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { apiClient, ApiError } from '../../../lib/api';

export interface AuditRecord {
  id: string;
  recommendation_id: string;
  developer_id: string;
  developer_name?: string;
  task_id: string;
  task_title?: string;
  project_id?: string;
  project_name?: string;
  model_name: string;
  model_version: string;
  environment: string;
  rank: number;
  recommendation_score: number;
  generated_at?: string;
  created_at?: string;
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
      const data = await apiClient.get<AuditRecord[]>('/recommendations/audit');
      setAudits(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to load recommendation audit data. Please verify your connection to the server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status="RESEARCH" type="environment" />
              <span className="text-xs text-purple-600 dark:text-purple-400 font-mono font-bold">MODEL GOVERNANCE & PROVENANCE</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Recommendation Audit & Model Governance Log</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Immutable audit trail of prediction timestamps, model versions, environments, and feature snapshots.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading recommendation audit & model governance records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAuditLogs} />
        ) : audits.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm">
            <div className="inline-flex p-3 rounded-full bg-purple-50 dark:bg-slate-800/80 text-purple-600 dark:text-purple-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-200">No recommendation audit records yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Generate AI developer recommendations and assign tasks to begin building the auditable governance log.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {audits.map((a) => {
                    const timestamp = a.generated_at || a.created_at;
                    const dateStr = timestamp ? new Date(timestamp).toLocaleString() : 'N/A';
                    const scoreVal = a.recommendation_score > 1 ? a.recommendation_score : a.recommendation_score * 100;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">{dateStr}</td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white max-w-xs truncate">{a.task_title || a.task_id}</td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-200">{a.developer_name || a.developer_id}</td>
                        <td className="p-3.5 font-mono font-bold text-purple-600 dark:text-purple-400">#{a.rank}</td>
                        <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{Math.round(scoreVal)} / 100</td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{a.model_version || 'baseline-v1.1'}</td>
                        <td className="p-3.5"><StatusBadge status={a.environment || 'development'} type="environment" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
