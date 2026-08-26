'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export interface MLMetricsData {
  cross_validation: {
    random_forest: any;
    xgboost: any;
  };
  validation_selection: {
    selected_model: string;
    selected_threshold: number;
    random_forest: any;
    xgboost: any;
  };
  test_evaluation: {
    selected_model: {
      threshold: number;
      precision: number;
      recall: number;
      f1: number;
      roc_auc: number;
      pr_auc: number;
      confusion_matrix: number[][];
      total_test_samples: number;
      positive_test_samples: number;
      negative_test_samples: number;
    };
    baseline_comparison: any;
  };
  feature_importances: any;
}

export interface SHAPGlobalItem {
  feature_name: string;
  mean_abs_shap: number;
  percentage: number;
  rank: number;
}

export interface SHAPLocalAttribution {
  feature_name: string;
  raw_value: number;
  shap_contribution: number;
  direction: 'POSITIVE' | 'NEGATIVE';
  rank: number;
}

export interface LocalSHAPExplanation {
  environment: string;
  model_version: string;
  dataset_version: string;
  label_strategy: string;
  developer_name: string;
  task_title: string;
  suitability_probability: number;
  suitability_percentage: number;
  base_value: number;
  positive_factors: string[];
  negative_factors: string[];
  feature_attributions: SHAPLocalAttribution[];
  research_disclaimer: string;
}

export default function MLEvaluationPage() {
  const { token, user, logout, apiUrl } = useAuth();
  const [metrics, setMetrics] = useState<MLMetricsData | null>(null);
  const [globalShap, setGlobalShap] = useState<SHAPGlobalItem[]>([]);
  const [localShap, setLocalShap] = useState<LocalSHAPExplanation | null>(null);

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [developers, setDevelopers] = useState<any[]>([]);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [metricsRes, shapRes, projectsRes, devsRes] = await Promise.all([
          fetch(`${apiUrl}/api/recommendations/research/ml/metrics`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/recommendations/research/ml/explainability/global`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/projects`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/developers`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (metricsRes.ok) setMetrics(await metricsRes.json());
        if (shapRes.ok) {
          const shapData = await shapRes.json();
          setGlobalShap(shapData.global_feature_importance || []);
        }
        if (projectsRes.ok) setProjects(await projectsRes.json());
        if (devsRes.ok) setDevelopers(await devsRes.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, apiUrl]);

  // Load tasks when project is selected
  useEffect(() => {
    if (!selectedProjectId || !token) return;
    fetch(`${apiUrl}/api/projects/${selectedProjectId}/tasks`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]));
  }, [selectedProjectId, token, apiUrl]);

  // Fetch local SHAP explanation
  const fetchLocalShap = async (devId: string, taskId: string) => {
    if (!devId || !taskId || !token) return;
    setLocalLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/recommendations/research/ml/explainability/local/${devId}/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch candidate SHAP attribution.');
      setLocalShap(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  if (!user || !token) {
    return (
      <main className="container" style={{ maxWidth: '500px', paddingTop: '4rem', textAlign: 'center' }}>
        <div className="card">
          <div className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            Sign In Required
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Authentication Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            You must be logged in to view research ML explainability dashboard.
          </p>
          <Link href="/login" className="btn">Sign In</Link>
        </div>
      </main>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="container">
        {/* Header */}
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span className="badge" style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)', margin: 0 }}>
              🧪 RESEARCH / EXPERIMENTAL (Milestone 12)
            </span>
            <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="/recommendations" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Production Recommendations
              </Link>
              <Link href="/features" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Feature Engine
              </Link>
              <button onClick={logout} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>
                Sign Out
              </button>
            </nav>
          </div>

          <h1 className="title">Explainable ML Recommendation Engine (SHAP Analysis)</h1>
          <p className="subtitle">Global & Candidate-Level Feature Attribution for Research XGBoost Model</p>
        </header>

        {/* Prominent Research Disclaimer */}
        <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', lineHeight: '1.5' }}>
          🛡️ <strong>Research & Attribution Safety Disclaimer:</strong> These explanations describe the behavior of the research XGBoost model (<code>ml-v1-rf-xgb</code>) trained on <code>synthetic-v1</code> data under <code>suitability-v1</code> ground truth rules. They do not establish real-world recommendation accuracy. Production recommendations remain strictly powered by <code>deterministic_baseline</code> (<code>baseline-v1</code>).
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <span className="pill pill-loading">Loading SHAP explainability dashboard...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Model Metadata Card */}
            <section className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%)', border: '1px solid rgba(99,102,241,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Trained Research Candidate Model
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: '0.25rem 0' }}>
                    🌳 XGBoost Explainer (TreeSHAP)
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Model Version: <code>ml-v1-rf-xgb</code> • Dataset: <code>synthetic-v1</code> (1,500 candidate pairs) • Strategy: <code>suitability-v1</code>
                  </div>
                </div>
                <span className="badge" style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--accent-emerald)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  RESEARCH ONLY (baseline-v1 active in production)
                </span>
              </div>
            </section>

            {/* Global SHAP Feature Importance Ranking */}
            <section className="card">
              <div className="card-title">
                <span>🌐 Global SHAP Feature Importance Ranking (TreeSHAP over 1,500 samples)</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Quantifies average absolute marginal impact E[|SHAP|] of each feature on candidate suitability predictions.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {globalShap.map((item) => (
                  <div key={item.feature_name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '24px' }}>#{item.rank}</span>
                    <span style={{ fontSize: '0.85rem', width: '220px', fontFamily: 'monospace' }}>{item.feature_name}</span>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '0.25rem', height: '12px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, item.percentage * 1.8)}%`, background: 'linear-gradient(90deg, #38bdf8 0%, #a855f7 100%)', height: '100%' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', width: '90px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      E[|SHAP|] = {item.mean_abs_shap.toFixed(3)}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, width: '50px', textAlign: 'right', color: 'var(--accent-cyan)' }}>
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Candidate Pair Local SHAP Explanation Inspector */}
            <section className="card">
              <div className="card-title">
                <span>🔍 Candidate Local SHAP Feature Attribution Inspector</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Select a Project, Task, and Developer candidate to explain candidate-specific model suitability prediction.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>1. Select Project</label>
                  <select
                    className="input"
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedTaskId('');
                    }}
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>2. Select Task</label>
                  <select
                    className="input"
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    disabled={!selectedProjectId}
                  >
                    <option value="">-- Choose Task --</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title} ({t.priority})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>3. Select Developer</label>
                  <select
                    className="input"
                    value={selectedDeveloperId}
                    onChange={(e) => setSelectedDeveloperId(e.target.value)}
                  >
                    <option value="">-- Choose Developer --</option>
                    {developers.map((d) => (
                      <option key={d.id} value={d.id}>{d.user_name || d.user_email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="btn"
                disabled={!selectedTaskId || !selectedDeveloperId || localLoading}
                onClick={() => fetchLocalShap(selectedDeveloperId, selectedTaskId)}
              >
                {localLoading ? 'Calculating SHAP Attributions...' : 'Generate Local SHAP Explanation'}
              </button>

              {/* Local SHAP Results Display */}
              {localShap && (
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Probability Header */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Candidate Pair: {localShap.developer_name} ➔ {localShap.task_title}
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                        Suitability Probability: {localShap.suitability_percentage.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Base Model Value E[f(X)]: <code>{localShap.base_value.toFixed(4)}</code>
                    </div>
                  </div>

                  {/* Factors Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', padding: '1rem', borderRadius: '0.5rem' }}>
                      <h4 style={{ color: 'var(--accent-emerald)', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                        🟢 Positive Contributing Factors
                      </h4>
                      {localShap.positive_factors.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No strong positive factors</span>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {localShap.positive_factors.map((f, idx) => <li key={idx}>{f}</li>)}
                        </ul>
                      )}
                    </div>

                    <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', padding: '1rem', borderRadius: '0.5rem' }}>
                      <h4 style={{ color: 'var(--accent-rose)', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                        🔴 Negative Contributing Factors
                      </h4>
                      {localShap.negative_factors.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No strong negative factors</span>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {localShap.negative_factors.map((f, idx) => <li key={idx}>{f}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* SHAP Contribution Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.6rem' }}>Rank</th>
                          <th style={{ padding: '0.6rem' }}>Feature</th>
                          <th style={{ padding: '0.6rem' }}>Raw Value</th>
                          <th style={{ padding: '0.6rem' }}>SHAP Contribution</th>
                          <th style={{ padding: '0.6rem' }}>Direction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {localShap.feature_attributions.map((attr) => (
                          <tr key={attr.feature_name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.6rem', color: 'var(--text-muted)' }}>#{attr.rank}</td>
                            <td style={{ padding: '0.6rem', fontFamily: 'monospace', fontWeight: 600 }}>{attr.feature_name}</td>
                            <td style={{ padding: '0.6rem' }}>{attr.raw_value.toFixed(2)}</td>
                            <td style={{ padding: '0.6rem', fontWeight: 700, color: attr.shap_contribution > 0 ? 'var(--accent-emerald)' : attr.shap_contribution < 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                              {attr.shap_contribution > 0 ? `+${attr.shap_contribution.toFixed(4)}` : attr.shap_contribution.toFixed(4)}
                            </td>
                            <td style={{ padding: '0.6rem' }}>
                              <span className={`pill ${attr.direction === 'POSITIVE' ? 'pill-success' : 'pill-error'}`}>
                                {attr.direction}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
