'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export interface RecommendationExplanation {
  id: string;
  feature_name: string;
  feature_value?: string;
  contribution_score: number;
  direction: string;
}

export interface RecommendationItem {
  id: string;
  task_id: string;
  developer_id: string;
  developer_name: string;
  developer_email: string;
  experience_years: number;
  availability_status: string;
  workload_score: number;
  skill_coverage_ratio: number;
  performance_score: number;
  model_version: string;
  score: number;
  rank: number;
  created_at: string;
  explanations: RecommendationExplanation[];
}

export interface RecommendationListResponse {
  task_id: string;
  task_title: string;
  project_id: string;
  project_name: string;
  model_type: string;
  model_version: string;
  total_recommendations: number;
  recommendations: RecommendationItem[];
}

export interface ProjectOption {
  id: string;
  name: string;
}

export interface TaskOption {
  id: string;
  title: string;
  project_id: string;
}

export default function RecommendationsPage() {
  const { token, user, logout, apiUrl } = useAuth();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [recData, setRecData] = useState<RecommendationListResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [recLoading, setRecLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Explanation Breakdown Modal state
  const [selectedRecForModal, setSelectedRecForModal] = useState<RecommendationItem | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiUrl}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setProjects(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedProjectId) {
      setTasks([]);
      setSelectedTaskId('');
      setRecData(null);
      return;
    }

    const fetchTasks = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/projects/${selectedProjectId}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setTasks(data);
          if (data.length > 0) {
            setSelectedTaskId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load project tasks:', err);
      }
    };

    fetchTasks();
  }, [token, selectedProjectId]);

  const fetchRecommendations = async (regenerate: boolean = false) => {
    if (!token || !selectedTaskId) return;
    setRecLoading(true);
    setError(null);

    try {
      let url = `${apiUrl}/api/recommendations/tasks/${selectedTaskId}`;
      if (regenerate) {
        url += `?regenerate=true`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate recommendations');
      setRecData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTaskId) {
      fetchRecommendations(false);
    }
  }, [selectedTaskId]);

  if (!user || !token) {
    return (
      <main className="container" style={{ maxWidth: '500px', paddingTop: '4rem', textAlign: 'center' }}>
        <div className="card">
          <div className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            Authentication Required
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Sign In Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            You must be logged in to view developer recommendations and ranking breakdowns.
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
            <span className="badge" style={{ margin: 0 }}>Milestone 9 — Recommendation Ranking Engine</span>
            <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="/projects" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Projects & Teams
              </Link>
              <Link href="/workload" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Workload Engine
              </Link>
              <Link href="/features" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Feature Engine
              </Link>
              <button onClick={logout} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>
                Sign Out
              </button>
            </nav>
          </div>

          <h1 className="title">Developer Recommendation Engine</h1>
          <p className="subtitle">Deterministic baseline ranking & reproducible feature contribution explanations</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Research Benchmark Alert */}
        <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#c084fc' }}>
          🎯 <strong>Pre-ML Deterministic Benchmark (v1.0):</strong> Recommendations are generated using a transparent, reproducible weighted baseline model combining skill match (35%), skill coverage (15%), workload capacity (20%), performance (15%), experience (10%), and availability (5%). Supervised ML predictions will be evaluated against this baseline in Milestone 10.
        </div>

        {/* Task Selection Bar */}
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Select Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
              >
                <option value="">-- Select Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Select Task to Rank Developers</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                disabled={!selectedProjectId || tasks.length === 0}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
              >
                {!selectedProjectId ? (
                  <option value="">-- Select a project first --</option>
                ) : tasks.length === 0 ? (
                  <option value="">-- No tasks found in project --</option>
                ) : (
                  tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <button
                onClick={() => fetchRecommendations(true)}
                disabled={!selectedTaskId || recLoading}
                className="btn"
                style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {recLoading ? 'Ranking Candidates...' : '🔄 Recalculate Ranking'}
              </button>
            </div>
          </div>
        </section>

        {/* Ranked Candidate List */}
        {recLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <span className="pill pill-loading">Evaluating candidate developer suitability...</span>
          </div>
        ) : !recData || recData.recommendations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
            Select a project and task above to view candidate developer recommendations.
          </div>
        ) : (
          <section className="card">
            <div className="card-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <span>🏆 Candidate Developer Rankings for "{recData.task_title}"</span>
              <span className="pill" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                Model: {recData.model_type} ({recData.model_version})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {recData.recommendations.map((rec) => (
                <div key={rec.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ background: rec.rank === 1 ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' : rec.rank === 2 ? 'linear-gradient(135deg, #475569 0%, #94a3b8 100%)' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, fontSize: '1.1rem', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        #{rec.rank}
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {rec.developer_name}
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {rec.developer_email} • Exp: {rec.experience_years} yrs • Status: <strong style={{ color: 'var(--text-secondary)' }}>{rec.availability_status}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                        {rec.score.toFixed(1)} / 100
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline Recommendation Score</div>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <span className="pill" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-cyan)' }}>
                      ⭐ Rating: {rec.performance_score} / 100
                    </span>
                    <span className="pill" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)' }}>
                      💡 Exp: {rec.experience_years} yrs
                    </span>
                    <span className="pill" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                      ⚡ Status: {rec.availability_status}
                    </span>
                  </div>

                  {/* Action Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setSelectedRecForModal(rec)}
                      className="btn"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                    >
                      ❓ Why this developer? →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FEATURE CONTRIBUTION BREAKDOWN MODAL */}
        {selectedRecForModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}>
            <div className="card" style={{ maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto', margin: 0 }}>
              <div className="card-title" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span>❓ Score Breakdown — {selectedRecForModal.developer_name}</span>
                <button onClick={() => setSelectedRecForModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}>
                  ✕
                </button>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rank #{selectedRecForModal.rank} Candidate</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    Total Score: {selectedRecForModal.score.toFixed(1)} / 100
                  </div>
                </div>
                <span className="pill pill-success">{selectedRecForModal.model_version}</span>
              </div>

              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reproducible Feature Contributions (Sum = Total Score)
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {selectedRecForModal.explanations.map((exp) => (
                  <div key={exp.id} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <code>{exp.feature_name}</code>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Observed Value: <strong style={{ color: 'var(--text-secondary)' }}>{exp.feature_value || 'N/A'}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: exp.direction === 'POSITIVE' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                        {exp.contribution_score > 0 ? `+${exp.contribution_score.toFixed(2)}` : exp.contribution_score.toFixed(2)} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                <button onClick={() => setSelectedRecForModal(null)} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
