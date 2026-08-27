'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export interface DataCollectionMonitoring {
  total_observations: number;
  observations_this_week: number;
  observations_this_month: number;
  by_model_version: { model_version: string; count: number }[];
  by_environment: { environment: string; count: number }[];
  total_feedback_submitted: number;
  accepted_feedback_count: number;
  rejected_feedback_count: number;
  ignored_feedback_count: number;
  deferred_feedback_count: number;
  assigned_count: number;
  completed_count: number;
  reassigned_count: number;
  cancelled_count: number;
  weak_positive_labels: number;
  weak_negative_labels: number;
  ambiguous_observations: number;
  unlabeled_observations: number;
  validated_positive_labels: number;
  validated_negative_labels: number;
}

export interface DatasetGrowthPoint {
  period: string;
  timestamp: string;
  total_observations: number;
  labeled_observations: number;
  validated_observations: number;
  positive_labels: number;
  negative_labels: number;
}

export interface DatasetGrowth {
  dataset_version: string;
  time_series: DatasetGrowthPoint[];
  growth_summary: string;
}

export interface LabelQuality {
  label_coverage_percentage: number;
  validated_label_percentage: number;
  weak_label_rate: number;
  ambiguous_rate: number;
  rejected_label_rate: number;
  validation_turnaround_hours: number | null;
  positive_negative_ratio: number | null;
  anomaly_warnings: string[];
}

export interface OutcomeFunnel {
  funnel_stages: { stage_name: string; count: number; conversion_percentage: number }[];
  alternate_paths: Record<string, number>;
  funnel_summary: string;
}

export interface DatasetDiversity {
  unique_developers_count: number;
  unique_tasks_count: number;
  unique_projects_count: number;
  complexity_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  availability_distribution: Record<string, number>;
  workload_distribution: Record<string, number>;
  concentration_warnings: { dimension: string; warning_message: string }[];
}

export interface DatasetSnapshot {
  id: string;
  dataset_version: string;
  created_by_name: string | null;
  creation_timestamp: string;
  source_observation_range: string;
  total_observations: number;
  labeled_observations: number;
  validated_labels: number;
  positive_labels: number;
  negative_labels: number;
  ambiguous_observations: number;
  feature_version: string;
  label_methodology_version: string;
  data_quality_status: string;
  snapshot_metadata: Record<string, any>;
}

export default function ResearchMonitoringDashboard() {
  const [monitoring, setMonitoring] = useState<DataCollectionMonitoring | null>(null);
  const [growth, setGrowth] = useState<DatasetGrowth | null>(null);
  const [labelQuality, setLabelQuality] = useState<LabelQuality | null>(null);
  const [funnel, setFunnel] = useState<OutcomeFunnel | null>(null);
  const [diversity, setDiversity] = useState<DatasetDiversity | null>(null);
  const [snapshots, setSnapshots] = useState<DatasetSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Snapshot modal state
  const [showSnapModal, setShowSnapModal] = useState(false);
  const [snapVersion, setSnapVersion] = useState('realworld-v1.1');
  const [snapRange, setSnapRange] = useState('all_available');
  const [snapSubmitting, setSnapSubmitting] = useState(false);
  const [snapMessage, setSnapMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const mRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/monitoring', { headers });
      if (mRes.ok) setMonitoring(await mRes.json());

      const gRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/growth', { headers });
      if (gRes.ok) setGrowth(await gRes.json());

      const lRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/label-quality', { headers });
      if (lRes.ok) setLabelQuality(await lRes.json());

      const fRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/outcomes', { headers });
      if (fRes.ok) setFunnel(await fRes.json());

      const dRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/diversity', { headers });
      if (dRes.ok) setDiversity(await dRes.json());

      const sRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/snapshots', { headers });
      if (sRes.ok) setSnapshots(await sRes.json());
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSnapSubmitting(true);
    setSnapMessage(null);
    try {
      const token = localStorage.getItem('token');
      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch('http://localhost:8000/api/recommendations/research/dataset/snapshots', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          dataset_version: snapVersion,
          source_observation_range: snapRange,
        }),
      });

      if (res.ok) {
        setSnapMessage(`Immutable snapshot '${snapVersion}' created successfully!`);
        setShowSnapModal(false);
        fetchMonitoringData();
      } else {
        const errData = await res.json();
        setSnapMessage(`Error: ${errData.detail || 'Failed to create snapshot'}`);
      }
    } catch (err: any) {
      setSnapMessage(`Error: ${err.message}`);
    } finally {
      setSnapSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/20">
                RESEARCH / EXPERIMENTAL
              </span>
              <span className="text-xs bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-md font-mono">
                Active Production: baseline-v1
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2">
              Real-World Data Collection & Research Monitoring Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Monitors real-world recommendation observations, label accumulation rates, outcome funnels, feature diversity, and versioned immutable dataset snapshots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSnapModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-purple-600/20"
            >
              + Create Versioned Snapshot
            </button>
            <Link
              href="/research/dataset"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 transition"
            >
              ← Research Dataset & Labels
            </Link>
          </div>
        </div>

        {snapMessage && (
          <div className={`p-3.5 rounded-xl border text-xs font-medium ${snapMessage.startsWith('Error') ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
            {snapMessage}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mb-4"></div>
            <p>Loading research monitoring analysis...</p>
          </div>
        ) : (
          <>
            {/* Top Stat Cards */}
            {monitoring && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 text-xs font-semibold uppercase">Total Observations</p>
                  <p className="text-3xl font-extrabold text-white mt-1">{monitoring.total_observations}</p>
                  <p className="text-[11px] text-slate-500 mt-1">+{monitoring.observations_this_week} this week</p>
                </div>
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 text-xs font-semibold uppercase">Human Validated</p>
                  <p className="text-3xl font-extrabold text-emerald-400 mt-1">
                    {monitoring.validated_positive_labels + monitoring.validated_negative_labels}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {monitoring.validated_positive_labels} Pos / {monitoring.validated_negative_labels} Neg
                  </p>
                </div>
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 text-xs font-semibold uppercase">Weak Labels</p>
                  <p className="text-3xl font-extrabold text-blue-400 mt-1">
                    {monitoring.weak_positive_labels + monitoring.weak_negative_labels}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Rule-derived candidate labels</p>
                </div>
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 text-xs font-semibold uppercase">Ambiguous</p>
                  <p className="text-3xl font-extrabold text-amber-400 mt-1">{monitoring.ambiguous_observations}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Cancelled/Ignored events</p>
                </div>
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 text-xs font-semibold uppercase">Pending Validation</p>
                  <p className="text-3xl font-extrabold text-purple-400 mt-1">{monitoring.unlabeled_observations}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Awaiting reviewer feedback</p>
                </div>
              </div>
            )}

            {/* Outcome Lifecycle Funnel */}
            {funnel && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">Recommendation Outcome Conversion Funnel</h3>
                    <p className="text-slate-400 text-xs mt-0.5">{funnel.funnel_summary}</p>
                  </div>
                  <span className="text-xs bg-slate-950 text-slate-300 border border-slate-800 px-3 py-1 rounded-md font-mono">
                    Lifecycle Conversion
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {funnel.funnel_stages.map((stg, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase">
                        <span>Stage {i + 1}: {stg.stage_name}</span>
                        <span className="text-purple-400 font-mono font-bold">{stg.conversion_percentage}%</span>
                      </div>
                      <p className="text-2xl font-extrabold text-white">{stg.count}</p>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all" style={{ width: `${stg.conversion_percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Alternate Path Counts:</span>
                  <span>Rejected: <strong className="text-slate-200">{funnel.alternate_paths.REJECTED}</strong></span>
                  <span>Ignored: <strong className="text-slate-200">{funnel.alternate_paths.IGNORED}</strong></span>
                  <span>Deferred: <strong className="text-slate-200">{funnel.alternate_paths.DEFERRED}</strong></span>
                  <span>Reassigned: <strong className="text-slate-200">{funnel.alternate_paths.REASSIGNED}</strong></span>
                  <span>Cancelled: <strong className="text-slate-200">{funnel.alternate_paths.CANCELLED}</strong></span>
                </div>
              </div>
            )}

            {/* Label Quality & Anomaly Detection */}
            {labelQuality && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">Label Quality & Coverage Metrics</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Label Coverage</span>
                      <span className="text-xl font-bold text-purple-400 mt-1 block">{labelQuality.label_coverage_percentage}%</span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Validated Ground-Truth</span>
                      <span className="text-xl font-bold text-emerald-400 mt-1 block">{labelQuality.validated_label_percentage}%</span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Weak Label Rate</span>
                      <span className="text-xl font-bold text-blue-400 mt-1 block">{labelQuality.weak_label_rate}%</span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Validation Turnaround</span>
                      <span className="text-xl font-bold text-slate-200 mt-1 block">
                        {labelQuality.validation_turnaround_hours !== null ? `${labelQuality.validation_turnaround_hours} hrs` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">Label Distribution Anomaly Warnings</h3>
                  {labelQuality.anomaly_warnings.length === 0 ? (
                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                      ✓ No label distribution anomalies detected. Validation balance remains normal.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {labelQuality.anomaly_warnings.map((warn, i) => (
                        <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                          ⚠️ {warn}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dataset Diversity Metrics */}
            {diversity && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">Dataset Representation & Feature Diversity</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Monitors sample distribution across developers, tasks, and projects to prevent bias.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-xs">Unique Developers</span>
                    <span className="text-3xl font-extrabold text-white block mt-1">{diversity.unique_developers_count}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-xs">Unique Tasks</span>
                    <span className="text-3xl font-extrabold text-white block mt-1">{diversity.unique_tasks_count}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-xs">Unique Projects</span>
                    <span className="text-3xl font-extrabold text-white block mt-1">{diversity.unique_projects_count}</span>
                  </div>
                </div>

                {diversity.concentration_warnings.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Diversity Concentration Warnings:</span>
                    {diversity.concentration_warnings.map((cw, i) => (
                      <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                        ⚠️ [{cw.dimension}] {cw.warning_message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Versioned Dataset Snapshots Manager */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white text-sm">Immutable Versioned Dataset Snapshots</h3>
                  <p className="text-slate-400 text-xs">Persisted dataset snapshots with immutable quality metrics and metadata.</p>
                </div>
                <span className="text-xs text-slate-400">{snapshots.length} Snapshots Saved</span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Dataset Version</th>
                    <th className="p-3.5">Creation Date</th>
                    <th className="p-3.5">Observations</th>
                    <th className="p-3.5">Validated Pos / Neg</th>
                    <th className="p-3.5">Quality Status</th>
                    <th className="p-3.5 text-right">Methodology</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {snapshots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No versioned dataset snapshots created yet. Click "+ Create Versioned Snapshot" above.
                      </td>
                    </tr>
                  ) : (
                    snapshots.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono text-purple-400 font-bold">{s.dataset_version}</td>
                        <td className="p-3.5 text-slate-300">{new Date(s.creation_timestamp).toLocaleString()}</td>
                        <td className="p-3.5 font-mono text-white">{s.total_observations}</td>
                        <td className="p-3.5 font-mono text-emerald-400">{s.positive_labels} Pos / {s.negative_labels} Neg</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                              s.data_quality_status === 'PASS'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {s.data_quality_status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-400">{s.label_methodology_version}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Create Snapshot Modal */}
        {showSnapModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base">Create Immutable Dataset Snapshot</h3>
                <button onClick={() => setShowSnapModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateSnapshot} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Snapshot Version Tag:</label>
                  <input
                    type="text"
                    value={snapVersion}
                    onChange={(e) => setSnapVersion(e.target.value)}
                    required
                    placeholder="e.g. realworld-v1.1"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Existing versions cannot be overwritten.</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Source Range:</label>
                  <input
                    type="text"
                    value={snapRange}
                    onChange={(e) => setSnapRange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowSnapModal(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">Cancel</button>
                  <button type="submit" disabled={snapSubmitting} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg">
                    {snapSubmitting ? 'Creating...' : 'Create Snapshot'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
