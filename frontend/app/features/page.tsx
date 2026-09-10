'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export interface FeatureMetadataItem {
  feature_name: string;
  data_type: string;
  category: string;
  source: string;
  description: string;
}

export interface CandidateFeatureVector {
  developer_id: string;
  user_name: string;
  user_email: string;
  task_id: string;
  task_title: string;
  project_id: string;
  project_name: string;

  dev_experience_years: number;
  dev_availability_status: string;
  dev_availability_encoded: number;
  dev_performance_score: number;
  dev_total_skills_count: number;
  dev_workload_score: number;
  dev_capacity_hours: number;
  dev_active_task_count: number;
  dev_workload_status: string;
  dev_workload_status_encoded: number;

  task_estimated_hours: number;
  task_complexity: string;
  task_complexity_encoded: number;
  task_priority: string;
  task_priority_encoded: number;
  task_status: string;
  task_required_skill_count: number;

  matching_skill_count: number;
  skill_coverage_ratio: number;
  avg_required_level: number;
  avg_developer_level: number;
  avg_proficiency_gap: number;
  min_proficiency_gap: number;
  weighted_skill_match_score: number;

  is_historically_assigned: number;
  label_target: number | null;
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

export default function FeaturesPage() {
  const { token, user, logout, apiUrl } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  const [metadata, setMetadata] = useState<FeatureMetadataItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [candidates, setCandidates] = useState<CandidateFeatureVector[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [candidatesLoading, setCandidatesLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canExport = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [metaRes, projRes] = await Promise.all([
          fetch(`${apiUrl}/api/features/metadata`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/projects`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const metaData = await metaRes.json();
        const projData = await projRes.json();

        if (metaRes.ok) setMetadata(metaData);
        if (projRes.ok) setProjects(projData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedProjectId) {
      setTasks([]);
      setSelectedTaskId('');
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

  useEffect(() => {
    if (!token || !selectedTaskId) {
      setCandidates([]);
      return;
    }

    const fetchCandidates = async () => {
      setCandidatesLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/features/tasks/${selectedTaskId}/candidates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setCandidates(data.candidates || []);
        }
      } catch (err) {
        console.error('Failed to generate candidate vectors:', err);
      } finally {
        setCandidatesLoading(false);
      }
    };

    fetchCandidates();
  }, [token, selectedTaskId]);

  const handleDownloadCsv = async () => {
    if (!token) return;
    try {
      let url = `${apiUrl}/api/features/dataset/download.csv`;
      if (selectedProjectId) {
        url += `?project_id=${selectedProjectId}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'devalign_recommendation_features.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user || !token) {
    return (
      <main className="container" style={{ maxWidth: '500px', paddingTop: '4rem', textAlign: 'center' }}>
        <div className="card">
          <div className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            Authentication Required
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Sign In Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            You must be logged in to inspect feature engineering vectors and dataset prepared files.
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
            <span className="badge" style={{ margin: 0 }}>Milestone 8 — Feature Engineering Layer</span>
            <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="/projects" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Projects & Teams
              </Link>
              <Link href="/workload" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Workload Engine
              </Link>
              <Link href="/developers" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Developers
              </Link>
              <button onClick={handleLogout} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>
                Sign Out
              </button>
            </nav>
          </div>

          <h1 className="title">Recommendation Feature Engine</h1>
          <p className="subtitle">Deterministic feature extraction & dataset candidate vectors for ML recommendation modeling</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Mandatory Research Label Disclaimer */}
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
          ℹ️ <strong>Research Dataset Disclaimer:</strong> Candidate feature vectors are deterministically generated from PostgreSQL state. Supervised target labels (<code>label_target</code>) are explicitly set to <code>NULL</code> (None) as ground-truth suitability labels are not yet available. Historical assignments are recorded separately as <code>is_historically_assigned</code> (0/1).
        </div>

        {/* Section 1: Task Candidate Generator */}
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <span>🧪 Task Candidate Feature Vector Generator</span>
            {canExport && (
              <button
                onClick={handleDownloadCsv}
                className="btn"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
              >
                📥 Export Dataset CSV
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Filter Project</label>
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
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Select Task</label>
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
          </div>

          {/* Candidate Feature Vectors Table */}
          {candidatesLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <span className="pill pill-loading">Generating feature vectors...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', fontSize: '0.9rem' }}>
              Select a project and task above to view generated developer candidate feature vectors.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.65rem' }}>Developer Candidate</th>
                    <th style={{ padding: '0.65rem' }}>Exp (Yrs)</th>
                    <th style={{ padding: '0.65rem' }}>Workload %</th>
                    <th style={{ padding: '0.65rem' }}>Skill Coverage</th>
                    <th style={{ padding: '0.65rem' }}>Avg Dev Lvl</th>
                    <th style={{ padding: '0.65rem' }}>Proficiency Gap</th>
                    <th style={{ padding: '0.65rem' }}>Weighted Match</th>
                    <th style={{ padding: '0.65rem' }}>Hist. Assigned</th>
                    <th style={{ padding: '0.65rem' }}>Target Label</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((vec) => (
                    <tr key={vec.developer_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.65rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        👤 {vec.user_name}
                      </td>
                      <td style={{ padding: '0.65rem' }}>{vec.dev_experience_years} yrs</td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className={`pill ${vec.dev_workload_score > 100 ? 'pill-error' : vec.dev_workload_score > 80 ? 'pill-loading' : 'pill-success'}`}>
                          {vec.dev_workload_score}% ({vec.dev_workload_status})
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        {(vec.skill_coverage_ratio * 100).toFixed(0)}% ({vec.matching_skill_count}/{vec.task_required_skill_count})
                      </td>
                      <td style={{ padding: '0.65rem' }}>{vec.avg_developer_level} / 100</td>
                      <td style={{ padding: '0.65rem', color: vec.avg_proficiency_gap < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                        {vec.avg_proficiency_gap > 0 ? `+${vec.avg_proficiency_gap}` : vec.avg_proficiency_gap}
                      </td>
                      <td style={{ padding: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {vec.weighted_skill_match_score}%
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        {vec.is_historically_assigned === 1 ? '✓ Yes (1)' : 'No (0)'}
                      </td>
                      <td style={{ padding: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        NULL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 2: Engineered Feature Catalog */}
        <section className="card">
          <div className="card-title">
            <span>📚 Engineered Feature Catalog ({metadata.length})</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.65rem' }}>Feature Name</th>
                  <th style={{ padding: '0.65rem' }}>Category</th>
                  <th style={{ padding: '0.65rem' }}>Type</th>
                  <th style={{ padding: '0.65rem' }}>Data Source</th>
                  <th style={{ padding: '0.65rem' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {metadata.map((item) => (
                  <tr key={item.feature_name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      <code>{item.feature_name}</code>
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      <span className="pill" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem', color: 'var(--text-muted)' }}>{item.data_type}</td>
                    <td style={{ padding: '0.65rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.source}</td>
                    <td style={{ padding: '0.65rem', color: 'var(--text-secondary)' }}>{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
