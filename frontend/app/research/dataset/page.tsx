'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export interface ObservationItem {
  observation_id: string;
  recommendation_id: string;
  developer_id: string;
  developer_name: string;
  task_id: string;
  task_title: string;
  project_id: string;
  project_name: string;
  recommendation_timestamp: string;
  model_name: string;
  model_version: string;
  environment: string;
  rank: number;
  recommendation_score: number;
  feature_snapshot: Record<string, any>;
  feedback_decision: string | null;
  reviewer_comment: string | null;
  was_assigned: boolean;
  assignment_status: string | null;
  completion_status: string | null;
  outcome_status: string;
  proposed_research_label: number | null;
  label_status: string;
  label_reason: string | null;
  validation_status: string;
  validator_name: string | null;
  validation_reason: string | null;
  validated_at: string | null;
}

export interface QualityReport {
  total_observations: number;
  missing_value_count: number;
  duplicate_observation_count: number;
  invalid_range_count: number;
  temporal_leakage_flag_count: number;
  invalid_lifecycle_transition_count: number;
  quality_score_percentage: number;
  disclaimer: string;
}

export interface ClassDist {
  total_observations: number;
  validated_positive_count: number;
  validated_negative_count: number;
  weak_label_count: number;
  unlabeled_count: number;
  ambiguous_count: number;
  class_imbalance_ratio: number | null;
  imbalance_description: string;
}

export interface ReadinessCheck {
  criterion: string;
  required_condition: string;
  actual_value: string;
  is_passed: boolean;
}

export interface ReadinessReport {
  readiness_status: 'NOT_READY' | 'REVIEW_REQUIRED' | 'READY_FOR_EXPERIMENT';
  total_observations: number;
  validated_labels_count: number;
  validated_positive_count: number;
  validated_negative_count: number;
  temporal_leakage_passed: boolean;
  feature_completeness_passed: boolean;
  lifecycle_consistency_passed: boolean;
  readiness_summary: string;
  readiness_checks: ReadinessCheck[];
}

export interface FeatureComp {
  feature_name: string;
  synthetic_mean: number | null;
  synthetic_std: number | null;
  realworld_mean: number | null;
  realworld_std: number | null;
  delta_mean: number | null;
}

export interface ComparisonReport {
  synthetic_dataset_version: string;
  realworld_dataset_version: string;
  synthetic_total_samples: number;
  realworld_total_samples: number;
  comparison_summary: string;
  feature_comparisons: FeatureComp[];
}

export default function RealworldDatasetDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'comparison' | 'inspector'>('overview');
  const [observations, setObservations] = useState<ObservationItem[]>([]);
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [dist, setDist] = useState<ClassDist | null>(null);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Inspector & Validation Modal State
  const [selectedSnapshot, setSelectedSnapshot] = useState<ObservationItem | null>(null);
  const [valObs, setValObs] = useState<ObservationItem | null>(null);
  const [valStatus, setValStatus] = useState<string>('VALIDATED_POSITIVE');
  const [valReason, setValReason] = useState<string>('');
  const [valSubmitting, setValSubmitting] = useState(false);
  const [valMessage, setValMessage] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const obsRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/observations', { headers });
      if (obsRes.ok) setObservations(await obsRes.json());

      const qRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/quality', { headers });
      if (qRes.ok) setQuality(await qRes.json());

      const dRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/statistics', { headers });
      if (dRes.ok) setDist(await dRes.json());

      const rRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/readiness', { headers });
      if (rRes.ok) setReadiness(await rRes.json());

      const cRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/comparison', { headers });
      if (cRes.ok) setComparison(await cRes.json());
    } catch (err) {
      console.error('Failed to load dataset research data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valObs) return;

    setValSubmitting(true);
    setValMessage(null);
    try {
      const token = localStorage.getItem('token');
      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`http://localhost:8000/api/recommendations/research/dataset/labels/${valObs.recommendation_id}/validate`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          validation_status: valStatus,
          validation_reason: valReason || null,
        }),
      });

      if (res.ok) {
        setValMessage('Research label validated successfully!');
        setValObs(null);
        setValReason('');
        fetchData();
      } else {
        const errData = await res.json();
        setValMessage(`Error: ${errData.detail || 'Failed to validate label'}`);
      }
    } catch (err: any) {
      setValMessage(`Error: ${err.message}`);
    } finally {
      setValSubmitting(false);
    }
  };

  const handleExportDataset = async () => {
    setExporting(true);
    setExportMessage(null);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('http://localhost:8000/api/recommendations/research/dataset/export', { headers });
      if (res.ok) {
        const data = await res.json();
        setExportMessage(`Export complete! Files generated under research/dataset/realworld/ (${data.exported_files.join(', ')})`);
      } else {
        const errData = await res.json();
        setExportMessage(`Export error: ${errData.detail || 'Failed to export'}`);
      }
    } catch (err: any) {
      setExportMessage(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/20">
                RESEARCH / EXPERIMENTAL
              </span>
              <span className="text-xs bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-md font-mono">
                Dataset: realworld-v1
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2">
              Real-World Research Dataset & Label Quality Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Assembles real application recommendation observations, enforces temporal leakage protection, computes weak research labels vs. human ground-truth sign-offs, and evaluates multi-criteria ML model training readiness.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportDataset}
              disabled={exporting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-emerald-600/20"
            >
              {exporting ? 'Exporting...' : 'Export realworld-v1 Files'}
            </button>
            <Link
              href="/recommendations/audit"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 transition"
            >
              ← Model Governance Audit
            </Link>
          </div>
        </div>

        {exportMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            {exportMessage}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800">
          {[
            { id: 'overview', label: 'Dataset Overview & Training Readiness' },
            { id: 'quality', label: 'Data Quality & Leakage Audit' },
            { id: 'comparison', label: 'Synthetic vs. Real-World Comparison' },
            { id: 'inspector', label: `Observational Dataset Inspector (${observations.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 font-medium text-sm rounded-t-lg transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-purple-500 bg-slate-900 text-purple-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mb-4"></div>
            <p>Loading real-world research dataset analysis...</p>
          </div>
        ) : (
          <>
            {/* Tab 1: Dataset Overview & Training Readiness */}
            {activeTab === 'overview' && readiness && dist && (
              <div className="space-y-6">
                {/* Readiness Status Banner */}
                <div
                  className={`p-6 rounded-xl border ${
                    readiness.readiness_status === 'READY_FOR_EXPERIMENT'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : readiness.readiness_status === 'REVIEW_REQUIRED'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider opacity-80">
                        ML Model Training Readiness Status
                      </span>
                      <h2 className="text-2xl font-extrabold mt-1">{readiness.readiness_status}</h2>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full font-mono font-semibold bg-slate-950/60 border border-current">
                      {readiness.validated_labels_count} / 200 Required Validated Labels
                    </span>
                  </div>
                  <p className="text-xs mt-3 leading-relaxed">{readiness.readiness_summary}</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Real Observations</p>
                    <p className="text-3xl font-extrabold text-white mt-1">{dist.total_observations}</p>
                    <p className="text-[11px] text-slate-500 mt-1">realworld-v1 pipeline</p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Human Validated</p>
                    <p className="text-3xl font-extrabold text-emerald-400 mt-1">
                      {dist.validated_positive_count + dist.validated_negative_count}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {dist.validated_positive_count} Pos / {dist.validated_negative_count} Neg
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Weak Labels</p>
                    <p className="text-3xl font-extrabold text-blue-400 mt-1">{dist.weak_label_count}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Rule-derived candidate labels</p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Ambiguous</p>
                    <p className="text-3xl font-extrabold text-amber-400 mt-1">{dist.ambiguous_count}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Cancelled/Ignored events</p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Unlabeled</p>
                    <p className="text-3xl font-extrabold text-slate-400 mt-1">{dist.unlabeled_count}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Awaiting reviewer feedback</p>
                  </div>
                </div>

                {/* Multi-Criteria Readiness Checks */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 bg-slate-950 border-b border-slate-800">
                    <h3 className="font-bold text-white text-sm">Multi-Criteria Training Readiness Checks</h3>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Criterion</th>
                        <th className="p-3.5">Required Condition</th>
                        <th className="p-3.5">Actual Value</th>
                        <th className="p-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {readiness.readiness_checks.map((chk, i) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-medium text-white">{chk.criterion}</td>
                          <td className="p-3.5 font-mono text-slate-300">{chk.required_condition}</td>
                          <td className="p-3.5 font-mono text-slate-200">{chk.actual_value}</td>
                          <td className="p-3.5 text-right">
                            <span
                              className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                                chk.is_passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {chk.is_passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Data Quality & Leakage Audit */}
            {activeTab === 'quality' && quality && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Overall Quality Score</p>
                    <p className="text-4xl font-extrabold text-purple-400 mt-2">{quality.quality_score_percentage}%</p>
                    <p className="text-slate-400 text-xs mt-2">Evaluated across all real-world observations.</p>
                  </div>
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Temporal Leakage Flags</p>
                    <p className={`text-4xl font-extrabold mt-2 ${quality.temporal_leakage_flag_count === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {quality.temporal_leakage_flag_count}
                    </p>
                    <p className="text-slate-400 text-xs mt-2">Prediction-time features strictly isolated from outcomes.</p>
                  </div>
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Lifecycle Inconsistencies</p>
                    <p className={`text-4xl font-extrabold mt-2 ${quality.invalid_lifecycle_transition_count === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {quality.invalid_lifecycle_transition_count}
                    </p>
                    <p className="text-slate-400 text-xs mt-2">Valid RECOMMENDED → ASSIGNED → COMPLETED state transitions.</p>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white">Data Quality Audit Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Missing Feature Values</span>
                      <span className="text-xl font-bold text-white mt-1 block">{quality.missing_value_count}</span>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Duplicate Candidate Pairs</span>
                      <span className="text-xl font-bold text-white mt-1 block">{quality.duplicate_observation_count}</span>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Invalid Feature Ranges</span>
                      <span className="text-xl font-bold text-white mt-1 block">{quality.invalid_range_count}</span>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Total Observations</span>
                      <span className="text-xl font-bold text-white mt-1 block">{quality.total_observations}</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs border-t border-slate-800 pt-3">{quality.disclaimer}</p>
                </div>
              </div>
            )}

            {/* Tab 3: Synthetic vs Real-World Comparison */}
            {activeTab === 'comparison' && comparison && (
              <div className="space-y-6">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-xs text-slate-300">
                  <h3 className="font-bold text-white text-sm mb-1">Feature Distribution Comparison</h3>
                  <p>{comparison.comparison_summary}</p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Feature Name</th>
                        <th className="p-3.5">Synthetic Mean (± STD)</th>
                        <th className="p-3.5">Real-World Mean (± STD)</th>
                        <th className="p-3.5 text-right">Mean Delta |Δ|</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {comparison.feature_comparisons.map((fc, i) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-mono font-medium text-purple-300">{fc.feature_name}</td>
                          <td className="p-3.5 font-mono text-slate-300">
                            {fc.synthetic_mean !== null ? `${fc.synthetic_mean} (± ${fc.synthetic_std})` : '—'}
                          </td>
                          <td className="p-3.5 font-mono text-slate-200">
                            {fc.realworld_mean !== null ? `${fc.realworld_mean} (± ${fc.realworld_std})` : 'No data yet'}
                          </td>
                          <td className="p-3.5 text-right font-mono text-purple-400 font-bold">
                            {fc.delta_mean !== null ? fc.delta_mean : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Observational Dataset Inspector & Label Validation */}
            {activeTab === 'inspector' && (
              <div className="space-y-6">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white text-sm">Observational Research Records</h3>
                      <p className="text-slate-400 text-xs">Inspect individual candidate pairs and validate proposed research labels.</p>
                    </div>
                    <span className="text-xs text-slate-400">{observations.length} Observations</span>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Observation ID</th>
                        <th className="p-3.5">Developer</th>
                        <th className="p-3.5">Task</th>
                        <th className="p-3.5">Proposed Label</th>
                        <th className="p-3.5">Label Status</th>
                        <th className="p-3.5">Validation Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {observations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No real-world recommendation observations found.
                          </td>
                        </tr>
                      ) : (
                        observations.map((obs) => (
                          <tr key={obs.observation_id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-mono text-purple-400">{obs.observation_id}</td>
                            <td className="p-3.5 font-medium text-white">{obs.developer_name}</td>
                            <td className="p-3.5 text-slate-200">{obs.task_title}</td>
                            <td className="p-3.5">
                              {obs.proposed_research_label !== null ? (
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    obs.proposed_research_label === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  Label {obs.proposed_research_label}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono">—</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300">
                                {obs.label_status}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  obs.validation_status === 'VALIDATED_POSITIVE'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : obs.validation_status === 'VALIDATED_NEGATIVE'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {obs.validation_status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-2">
                              <button
                                onClick={() => setSelectedSnapshot(obs)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] font-medium"
                              >
                                Snapshot
                              </button>
                              <button
                                onClick={() => setValObs(obs)}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded text-[11px] font-semibold"
                              >
                                Validate
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Feature Snapshot Modal */}
        {selectedSnapshot && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-base">Prediction-Time Feature Snapshot</h3>
                  <p className="text-xs text-slate-400">{selectedSnapshot.observation_id} — {selectedSnapshot.developer_name}</p>
                </div>
                <button onClick={() => setSelectedSnapshot(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg overflow-x-auto max-h-96 border border-slate-800">
                <pre className="text-xs font-mono text-purple-400">
                  {JSON.stringify(selectedSnapshot.feature_snapshot, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setSelectedSnapshot(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-lg">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Validate Label Modal */}
        {valObs && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base">Validate Research Label</h3>
                <button onClick={() => setValObs(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              {valMessage && (
                <div className={`p-3 rounded-lg text-xs ${valMessage.startsWith('Error') ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {valMessage}
                </div>
              )}

              <form onSubmit={handleValidateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Observation ID:</label>
                  <input type="text" readOnly value={valObs.observation_id} className="w-full bg-slate-950 border border-slate-800 text-slate-400 rounded-lg p-2 font-mono" />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Validation Decision:</label>
                  <select value={valStatus} onChange={(e) => setValStatus(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5">
                    <option value="VALIDATED_POSITIVE">VALIDATED_POSITIVE — Suitable Ground Truth (Label = 1)</option>
                    <option value="VALIDATED_NEGATIVE">VALIDATED_NEGATIVE — Unsuitable Ground Truth (Label = 0)</option>
                    <option value="REJECTED_LABEL">REJECTED_LABEL — Reject Proposed Weak Label</option>
                    <option value="AMBIGUOUS">AMBIGUOUS — Mark Confounding / Ambiguous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Validation Rationale:</label>
                  <textarea value={valReason} onChange={(e) => setValReason(e.target.value)} placeholder="Reason for research label validation..." rows={3} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5" />
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setValObs(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">Cancel</button>
                  <button type="submit" disabled={valSubmitting} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg">
                    {valSubmitting ? 'Validating...' : 'Submit Validation'}
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
