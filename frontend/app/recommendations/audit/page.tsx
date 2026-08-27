'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export interface AuditRecord {
  id: string;
  recommendation_id: string;
  developer_id: string;
  developer_name: string;
  task_id: string;
  task_title: string;
  project_id: string;
  project_name: string;
  rank: number;
  recommendation_score: number;
  model_name: string;
  model_version: string;
  environment: string;
  feature_snapshot: Record<string, any>;
  generated_at: string;
}

export interface FeedbackRecord {
  id: string;
  recommendation_id: string;
  reviewer_id: string;
  reviewer_name: string;
  decision: 'ACCEPTED' | 'REJECTED' | 'IGNORED' | 'DEFERRED';
  comment: string | null;
  created_at: string;
}

export interface OutcomeRecord {
  id: string;
  recommendation_id: string;
  developer_id: string;
  developer_name: string;
  task_id: string;
  task_title: string;
  was_assigned: boolean;
  assignment_id: string | null;
  assignment_created_at: string | null;
  assignment_outcome_status: string;
  completed_at: string | null;
  created_at: string;
}

export interface ModelRegistryItem {
  model_name: string;
  model_version: string;
  environment: string;
  status: string;
  trained_dataset_version: string | null;
  label_strategy: string | null;
  is_production_active: boolean;
  description: string;
}

export interface DatasetPreviewMetrics {
  total_audits: number;
  total_feedbacks: number;
  total_outcomes: number;
  assigned_count: number;
  completed_count: number;
  label_status_counts: Record<string, number>;
  feedback_decision_counts: Record<string, number>;
  real_world_ml_training_readiness: boolean;
  disclaimer: string;
}

export default function AuditGovernancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'governance' | 'audits' | 'feedbacks' | 'outcomes' | 'dataset'>('governance');
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([]);
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [previewMetrics, setPreviewMetrics] = useState<DatasetPreviewMetrics | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AuditRecord | null>(null);

  // Feedback form state
  const [feedbackRecId, setFeedbackRecId] = useState<string>('');
  const [feedbackDecision, setFeedbackDecision] = useState<'ACCEPTED' | 'REJECTED' | 'IGNORED' | 'DEFERRED'>('ACCEPTED');
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [filterEnv, setFilterEnv] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filterEnv]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch model registry
      const regRes = await fetch('http://localhost:8000/api/recommendations/research/model-registry', { headers });
      if (regRes.ok) setModels(await regRes.json());

      // Fetch audits
      const auditUrl = filterEnv
        ? `http://localhost:8000/api/recommendations/audit?environment=${filterEnv}`
        : 'http://localhost:8000/api/recommendations/audit';
      const auditRes = await fetch(auditUrl, { headers });
      if (auditRes.ok) setAudits(await auditRes.json());

      // Fetch feedbacks
      const fbRes = await fetch('http://localhost:8000/api/recommendations/feedback', { headers });
      if (fbRes.ok) setFeedbacks(await fbRes.json());

      // Fetch outcomes
      const outRes = await fetch('http://localhost:8000/api/recommendations/research/outcomes', { headers });
      if (outRes.ok) setOutcomes(await outRes.json());

      // Fetch dataset preview
      const previewRes = await fetch('http://localhost:8000/api/recommendations/research/dataset-preview', { headers });
      if (previewRes.ok) setPreviewMetrics(await previewRes.json());
    } catch (err) {
      console.error('Failed to load governance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackRecId) return;

    setFeedbackSubmitting(true);
    setFeedbackMessage(null);
    try {
      const token = localStorage.getItem('token');
      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`http://localhost:8000/api/recommendations/${feedbackRecId}/feedback`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          decision: feedbackDecision,
          comment: feedbackComment || null,
        }),
      });

      if (res.ok) {
        setFeedbackMessage('Feedback submitted successfully!');
        setFeedbackComment('');
        fetchData();
      } else {
        const errorData = await res.json();
        setFeedbackMessage(`Error: ${errorData.detail || 'Failed to submit feedback'}`);
      }
    } catch (err: any) {
      setFeedbackMessage(`Error: ${err.message}`);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Header Banner */}
      <div className="max-w-7xl mx-mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-blue-500/20">
                Milestone 13 Subsystem
              </span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono">
                Production Isolation Active
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2">
              Recommendation Audit, Feedback Loop & Model Governance
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Captures immutable feature snapshots at recommendation time, collects human reviewer feedback decisions, tracks assignment outcomes, and enforces strict model registry governance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/research/ml"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium px-4 py-2 rounded-lg border border-slate-700 transition"
            >
              ← Back to ML Research
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800">
          {[
            { id: 'governance', label: 'Model Governance Registry' },
            { id: 'audits', label: `Recommendation Audits (${audits.length})` },
            { id: 'feedbacks', label: `Reviewer Feedbacks (${feedbacks.length})` },
            { id: 'outcomes', label: `Assignment Outcomes (${outcomes.length})` },
            { id: 'dataset', label: 'Observational Dataset & Readiness' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 font-medium text-sm rounded-t-lg transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 bg-slate-900 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p>Loading audit and governance metrics...</p>
          </div>
        ) : (
          <>
            {/* Tab 1: Model Governance Registry */}
            {activeTab === 'governance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {models.map((m) => (
                    <div
                      key={m.model_name}
                      className={`p-6 rounded-xl border ${
                        m.is_production_active
                          ? 'bg-slate-900/90 border-blue-500/50 ring-1 ring-blue-500/30'
                          : 'bg-slate-900/40 border-slate-800'
                      } flex flex-col justify-between space-y-4`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold uppercase ${
                              m.environment === 'production'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}
                          >
                            {m.environment}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                              m.is_production_active
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-white mt-3">{m.model_name}</h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">Version: {m.model_version}</p>
                        <p className="text-slate-300 text-xs mt-3 leading-relaxed">{m.description}</p>
                      </div>

                      <div className="pt-4 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Dataset:</span>
                          <span className="font-mono text-slate-200">{m.trained_dataset_version || 'N/A (Rule Engine)'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Label Strategy:</span>
                          <span className="font-mono text-slate-200">{m.label_strategy || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active Status:</span>
                          <span className={m.is_production_active ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                            {m.is_production_active ? 'PRODUCTION ACTIVE' : 'RESEARCH ONLY'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Governance Statement */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs leading-relaxed space-y-2">
                  <h4 className="font-semibold text-slate-100 text-sm">Model Governance & Production Isolation Guidelines</h4>
                  <p>
                    • Production recommendation engine MUST remain <code className="text-blue-400 font-mono">baseline-v1</code> (Deterministic Multi-Criteria Baseline) until at least 200 validated real-world outcomes are collected.
                  </p>
                  <p>
                    • Trained ML models (<code className="text-purple-400 font-mono">ml-v1-rf-xgb</code>) and TreeSHAP explainability run in strictly isolated research mode under <code className="text-purple-400 font-mono">/api/recommendations/research/ml/*</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Recommendation Audits */}
            {activeTab === 'audits' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Filter Environment:</label>
                    <select
                      value={filterEnv}
                      onChange={(e) => setFilterEnv(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Environments</option>
                      <option value="production">Production</option>
                      <option value="research">Research</option>
                    </select>
                  </div>
                  <span className="text-xs text-slate-400">Total Audits Recorded: {audits.length}</span>
                </div>

                <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Developer</th>
                        <th className="p-3.5">Task & Project</th>
                        <th className="p-3.5">Score / Rank</th>
                        <th className="p-3.5">Model & Version</th>
                        <th className="p-3.5">Env</th>
                        <th className="p-3.5">Generated At</th>
                        <th className="p-3.5 text-right">Feature Snapshot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {audits.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No recommendation audit records found. Generate task recommendations to automatically log audit feature snapshots.
                          </td>
                        </tr>
                      ) : (
                        audits.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-medium text-white">{a.developer_name}</td>
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-200">{a.task_title}</div>
                              <div className="text-[11px] text-slate-400">{a.project_name}</div>
                            </td>
                            <td className="p-3.5">
                              <span className="text-blue-400 font-mono font-bold">{a.recommendation_score.toFixed(1)}</span>
                              <span className="text-slate-500 text-[11px] ml-1.5">(Rank #{a.rank})</span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-300">{a.model_version}</td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  a.environment === 'production' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                                }`}
                              >
                                {a.environment}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                              {new Date(a.generated_at).toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => setSelectedSnapshot(a)}
                                className="bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white px-2.5 py-1 rounded text-[11px] font-medium transition"
                              >
                                View Snapshot
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

            {/* Tab 3: Reviewer Feedbacks */}
            {activeTab === 'feedbacks' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Submit Feedback Form */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white">Submit Reviewer Feedback</h3>
                  <p className="text-slate-400 text-xs">
                    Human review decisions capture explicit feedback to construct validated ground-truth labels for future ML research datasets.
                  </p>

                  {feedbackMessage && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium ${
                        feedbackMessage.startsWith('Error')
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {feedbackMessage}
                    </div>
                  )}

                  <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Select Recommendation Audit:</label>
                      <select
                        value={feedbackRecId}
                        onChange={(e) => setFeedbackRecId(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Select Recommendation --</option>
                        {audits.map((a) => (
                          <option key={a.recommendation_id} value={a.recommendation_id}>
                            {a.developer_name} for "{a.task_title}" ({a.recommendation_score.toFixed(1)} score)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Feedback Decision:</label>
                      <select
                        value={feedbackDecision}
                        onChange={(e) => setFeedbackDecision(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                      >
                        <option value="ACCEPTED">ACCEPTED — Valid recommendation</option>
                        <option value="REJECTED">REJECTED — Unsuitable candidate</option>
                        <option value="DEFERRED">DEFERRED — Pending evaluation</option>
                        <option value="IGNORED">IGNORED — Not reviewed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Reviewer Comment / Rationale:</label>
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Optional comment explaining decision..."
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={feedbackSubmitting}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
                    >
                      {feedbackSubmitting ? 'Submitting...' : 'Submit Human Feedback'}
                    </button>
                  </form>
                </div>

                {/* Feedback History Table */}
                <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">Human Feedback History</h3>
                    <span className="text-xs text-slate-400">{feedbacks.length} Submissions</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Reviewer</th>
                        <th className="p-3.5">Decision</th>
                        <th className="p-3.5">Comment</th>
                        <th className="p-3.5">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {feedbacks.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500">
                            No feedback records submitted yet.
                          </td>
                        </tr>
                      ) : (
                        feedbacks.map((fb) => (
                          <tr key={fb.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-medium text-white">{fb.reviewer_name}</td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  fb.decision === 'ACCEPTED'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : fb.decision === 'REJECTED'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {fb.decision}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-300">{fb.comment || '—'}</td>
                            <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                              {new Date(fb.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Assignment Outcomes */}
            {activeTab === 'outcomes' && (
              <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white text-sm">Assignment Event Outcomes</h3>
                    <p className="text-slate-400 text-xs">
                      Tracks distinct lifecycle progression (RECOMMENDED → ACCEPTED → ASSIGNED → COMPLETED) without collapsing events.
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{outcomes.length} Outcome Records</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Developer</th>
                      <th className="p-3.5">Task</th>
                      <th className="p-3.5">Was Assigned?</th>
                      <th className="p-3.5">Outcome Lifecycle Status</th>
                      <th className="p-3.5">Assigned Date</th>
                      <th className="p-3.5">Completed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {outcomes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No assignment outcome records found.
                        </td>
                      </tr>
                    ) : (
                      outcomes.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-medium text-white">{o.developer_name}</td>
                          <td className="p-3.5 text-slate-200 font-semibold">{o.task_title}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.was_assigned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {o.was_assigned ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {o.assignment_outcome_status}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400">
                            {o.assignment_created_at ? new Date(o.assignment_created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400">
                            {o.completed_at ? new Date(o.completed_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 5: Observational Dataset & Readiness */}
            {activeTab === 'dataset' && previewMetrics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Total Audits</p>
                    <p className="text-3xl font-extrabold text-white mt-1">{previewMetrics.total_audits}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Human Feedbacks</p>
                    <p className="text-3xl font-extrabold text-blue-400 mt-1">{previewMetrics.total_feedbacks}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Assigned Outcomes</p>
                    <p className="text-3xl font-extrabold text-emerald-400 mt-1">{previewMetrics.assigned_count}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 text-xs font-semibold uppercase">Real-World ML Readiness</p>
                    <p
                      className={`text-lg font-bold mt-2 ${
                        previewMetrics.real_world_ml_training_readiness ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {previewMetrics.real_world_ml_training_readiness ? 'READINESS READY (≥200)' : 'NOT READY (<200 Validated)'}
                    </p>
                  </div>
                </div>

                {/* Disclaimer Notice */}
                <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-2">
                  <h4 className="font-bold text-sm text-amber-300">Statutory Model Governance Disclaimer</h4>
                  <p>{previewMetrics.disclaimer}</p>
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
                  <h3 className="font-bold text-white text-base">Feature Snapshot Log</h3>
                  <p className="text-xs text-slate-400">
                    {selectedSnapshot.developer_name} for "{selectedSnapshot.task_title}"
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg overflow-x-auto max-h-96 border border-slate-800">
                <pre className="text-xs font-mono text-emerald-400">
                  {JSON.stringify(selectedSnapshot.feature_snapshot, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
