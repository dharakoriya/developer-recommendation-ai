'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../../components/AppShell';
import { StatCard } from '../../../../components/StatCard';
import { StatusBadge } from '../../../../components/StatusBadge';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';

export interface DataCollectionMonitoringData {
  total_observations: number;
  by_model_version: Record<string, number>;
  by_environment: Record<string, number>;
  by_feedback_decision: Record<string, number>;
  by_outcome_status: Record<string, number>;
  by_label_status: Record<string, number>;
  by_validation_status: Record<string, number>;
  collection_this_week: number;
  collection_this_month: number;
}

export interface OutcomeFunnelData {
  total_recommended: number;
  accepted_count: number;
  assigned_count: number;
  completed_count: number;
  acceptance_rate: number;
  assignment_conversion_rate: number;
  completion_conversion_rate: number;
  overall_conversion_rate: number;
}

export default function ResearchDatasetMonitoringPage() {
  const [monitoring, setMonitoring] = useState<DataCollectionMonitoringData | null>(null);
  const [funnel, setFunnel] = useState<OutcomeFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  const fetchMonitoringData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const mRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/monitoring', { headers });
      if (mRes.ok) setMonitoring(await mRes.json());

      const oRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/outcomes', { headers });
      if (oRes.ok) setFunnel(await oRes.json());
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
              <span className="text-xs text-purple-400 font-mono font-bold">REAL-WORLD DATA COLLECTION LAB</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Real-World Data Collection & Research Monitoring</h1>
            <p className="text-slate-400 text-xs mt-0.5">Track observation accumulation rates, outcome conversion funnels, and dataset diversity.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading data collection monitoring statistics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchMonitoringData} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Observations" value={monitoring?.total_observations ?? 0} subtext={`${monitoring?.collection_this_week ?? 0} collected this week`} icon="📈" accentColor="blue" />
              <StatCard title="Acceptance Rate" value={`${funnel?.acceptance_rate ?? 0}%`} subtext={`${funnel?.accepted_count ?? 0} accepted by reviewers`} icon="✓" accentColor="emerald" />
              <StatCard title="Assignment Conversion" value={`${funnel?.assignment_conversion_rate ?? 0}%`} subtext={`${funnel?.assigned_count ?? 0} assigned to tasks`} icon="🎯" accentColor="purple" />
              <StatCard title="Completion Funnel" value={`${funnel?.completion_conversion_rate ?? 0}%`} subtext={`${funnel?.completed_count ?? 0} tasks completed`} icon="⚡" accentColor="amber" />
            </div>

            {/* Conversion Funnel Breakdown */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-white text-sm">Outcome Lifecycle Conversion Funnel</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-slate-400 block font-semibold">1. RECOMMENDED</span>
                  <span className="text-2xl font-extrabold text-blue-400 font-mono mt-1 block">{funnel?.total_recommended ?? 0}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-slate-400 block font-semibold">2. ACCEPTED</span>
                  <span className="text-2xl font-extrabold text-purple-400 font-mono mt-1 block">{funnel?.accepted_count ?? 0}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-slate-400 block font-semibold">3. ASSIGNED</span>
                  <span className="text-2xl font-extrabold text-amber-400 font-mono mt-1 block">{funnel?.assigned_count ?? 0}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-slate-400 block font-semibold">4. COMPLETED</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">{funnel?.completed_count ?? 0}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
