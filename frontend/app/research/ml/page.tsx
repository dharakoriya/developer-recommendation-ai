'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export interface MLMetricsData {
  cross_validation: {
    random_forest: {
      precision_mean: number;
      precision_std: number;
      recall_mean: number;
      recall_std: number;
      f1_mean: number;
      f1_std: number;
      roc_auc_mean: number;
      roc_auc_std: number;
      pr_auc_mean: number;
      pr_auc_std: number;
    };
    xgboost: {
      scale_pos_weight: number;
      precision_mean: number;
      precision_std: number;
      recall_mean: number;
      recall_std: number;
      f1_mean: number;
      f1_std: number;
      roc_auc_mean: number;
      roc_auc_std: number;
      pr_auc_mean: number;
      pr_auc_std: number;
    };
  };
  validation_selection: {
    selected_model: string;
    selected_threshold: number;
    random_forest: any;
    xgboost: any;
  };
  test_evaluation: {
    random_forest: any;
    xgboost: any;
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
    baseline_comparison: {
      ml_pr_auc: number;
      baseline_pr_auc: number;
      ml_roc_auc: number;
      baseline_roc_auc: number;
      comparison_note: string;
    };
  };
  feature_importances: {
    random_forest: Array<{ feature_name: string; importance_score: number; percentage: number }>;
    xgboost: Array<{ feature_name: string; importance_score: number; percentage: number }>;
  };
}

export default function MLEvaluationPage() {
  const { token, user, logout, apiUrl } = useAuth();
  const [metrics, setMetrics] = useState<MLMetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiUrl}/api/recommendations/research/ml/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to fetch ML evaluation metrics.');
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [token]);

  if (!user || !token) {
    return (
      <main className="container" style={{ maxWidth: '500px', paddingTop: '4rem', textAlign: 'center' }}>
        <div className="card">
          <div className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            Authentication Required
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Sign In Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            You must be logged in to view research ML evaluation metrics.
          </p>
          <Link href="/login" className="btn">
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="container">
        {/* Header & Navigation */}
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span className="badge" style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)', margin: 0 }}>
              🧪 RESEARCH / EXPERIMENTAL (Milestone 11)
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

          <h1 className="title">Supervised ML Recommendation Model Evaluation</h1>
          <p className="subtitle">Random Forest & XGBoost candidate evaluation against baseline-v1 benchmark</p>
        </header>

        {/* Research Isolation Notice */}
        <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
          🛡️ <strong>Production Isolation Status:</strong> Active production recommendations remain strictly powered by <code>deterministic_baseline</code> (<code>baseline-v1</code>). Trained ML models are candidate research models evaluated against synthetic ground-truth targets (<code>suitability-v1</code>).
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <span className="pill pill-loading">Loading ML evaluation metrics report...</span>
          </div>
        ) : !metrics ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No ML evaluation report found. Execute <code>python research/ml/pipeline_ml.py</code> to generate model metrics.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Model Selection Banner */}
            <section className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%)', border: '1px solid rgba(99,102,241,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Selected Candidate Model (val.csv tuning)
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: '0.25rem 0' }}>
                    🏆 {metrics.validation_selection.selected_model}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Optimal Probability Threshold: <strong style={{ color: 'var(--accent-emerald)' }}>{metrics.validation_selection.selected_threshold}</strong> • Class Imbalance Strategy: <code>scale_pos_weight = 37.85</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1.25rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {(metrics.test_evaluation.selected_model.f1 * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Test F1 Score</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1.25rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {(metrics.test_evaluation.selected_model.pr_auc * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Test PR-AUC</div>
                  </div>
                </div>
              </div>
            </section>

            {/* 5-Fold Cross-Validation Table */}
            <section className="card">
              <div className="card-title">
                <span>📊 5-Fold Stratified Cross-Validation Performance (train.csv)</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem' }}>Model Architecture</th>
                      <th style={{ padding: '0.75rem' }}>Class Imbalance Handling</th>
                      <th style={{ padding: '0.75rem' }}>Precision (Mean ± Std)</th>
                      <th style={{ padding: '0.75rem' }}>Recall (Mean ± Std)</th>
                      <th style={{ padding: '0.75rem' }}>F1 Score (Mean ± Std)</th>
                      <th style={{ padding: '0.75rem' }}>ROC-AUC</th>
                      <th style={{ padding: '0.75rem' }}>PR-AUC</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>Random Forest</td>
                      <td style={{ padding: '0.75rem' }}><code>class_weight="balanced"</code></td>
                      <td style={{ padding: '0.75rem' }}>{(metrics.cross_validation.random_forest.precision_mean * 100).toFixed(1)}% ± {(metrics.cross_validation.random_forest.precision_std * 100).toFixed(1)}%</td>
                      <td style={{ padding: '0.75rem' }}>{(metrics.cross_validation.random_forest.recall_mean * 100).toFixed(1)}% ± {(metrics.cross_validation.random_forest.recall_std * 100).toFixed(1)}%</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{(metrics.cross_validation.random_forest.f1_mean * 100).toFixed(1)}% ± {(metrics.cross_validation.random_forest.f1_std * 100).toFixed(1)}%</td>
                      <td style={{ padding: '0.75rem' }}>{(metrics.cross_validation.random_forest.roc_auc_mean * 100).toFixed(1)}%</td>
                      <td style={{ padding: '0.75rem' }}>{(metrics.cross_validation.random_forest.pr_auc_mean * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>XGBoost</td>
                      <td style={{ padding: '0.75rem' }}><code>scale_pos_weight={metrics.cross_validation.xgboost.scale_pos_weight.toFixed(1)}</code></td>
                      <td style={{ padding: '0.75rem' }}>{(metrics.cross_validation.xgboost.precision_mean * 100).toFixed(1)}% ± {(metrics.cross_validation.xgboost.precision_std * 100).toFixed(1)}%</td>
                      <td style={{ padding: '0.75rem' }}>{(metrics.cross_validation.xgboost.recall_mean * 100).toFixed(1)}% ± {(metrics.cross_validation.xgboost.recall_std * 100).toFixed(1)}%</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{(metrics.cross_validation.xgboost.f1_mean * 100).toFixed(1)}% ± {(metrics.cross_validation.xgboost.f1_std * 100).toFixed(1)}%</td>
                      <td style={{ padding: '0.75rem' }}>{(metrics.cross_validation.xgboost.roc_auc_mean * 100).toFixed(1)}%</td>
                      <td style={{ padding: '0.75rem' }}>{(metrics.cross_validation.xgboost.pr_auc_mean * 100).toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Test Set Confusion Matrix & Isolated Test Results */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <section className="card">
                <div className="card-title">
                  <span>🎯 Isolated Test Set Performance (test.csv)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Isolated Test Samples:</span>
                    <strong>{metrics.test_evaluation.selected_model.total_test_samples} candidate pairs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Test Positive Suitable Pairs:</span>
                    <strong>{metrics.test_evaluation.selected_model.positive_test_samples} pairs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Precision:</span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>{(metrics.test_evaluation.selected_model.precision * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Recall:</span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>{(metrics.test_evaluation.selected_model.recall * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>F1 Score:</span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{(metrics.test_evaluation.selected_model.f1 * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              </section>

              {/* Confusion Matrix Card */}
              <section className="card">
                <div className="card-title">
                  <span>🧩 Confusion Matrix (test.csv)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {metrics.test_evaluation.selected_model.confusion_matrix[0][0]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>True Negatives (TN)</div>
                  </div>
                  <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
                      {metrics.test_evaluation.selected_model.confusion_matrix[0][1]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>False Positives (FP)</div>
                  </div>
                  <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
                      {metrics.test_evaluation.selected_model.confusion_matrix[1][0]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>False Negatives (FN)</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {metrics.test_evaluation.selected_model.confusion_matrix[1][1]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>True Positives (TP)</div>
                  </div>
                </div>
              </section>
            </div>

            {/* Feature Importance Ranking */}
            <section className="card">
              <div className="card-title">
                <span>🌲 Top Feature Importance Ranking (Gini / MDI)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {metrics.feature_importances.xgboost.map((item, idx) => (
                  <div key={item.feature_name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '24px' }}>#{idx + 1}</span>
                    <span style={{ fontSize: '0.85rem', width: '220px', fontFamily: 'monospace' }}>{item.feature_name}</span>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '0.25rem', height: '12px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percentage * 3.5}%`, background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)', height: '100%' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, width: '60px', textAlign: 'right', color: 'var(--accent-cyan)' }}>
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
