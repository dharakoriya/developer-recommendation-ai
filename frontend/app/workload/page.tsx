'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export interface WorkloadSummaryItem {
  developer_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  experience_years: number;
  availability_status: string;
  active_task_count: number;
  total_estimated_hours: number;
  weighted_hours: number;
  capacity_hours: number;
  workload_score: number;
  workload_status: string;
}

export interface WorkloadSummaryResponse {
  total_developers: number;
  available_developers_count: number;
  balanced_developers_count: number;
  high_workload_count: number;
  overloaded_developers_count: number;
  average_workload_score: number;
  developers: WorkloadSummaryItem[];
}

export interface TaskItem {
  id: string;
  title: string;
  category?: string;
  priority: string;
  complexity: string;
  estimated_hours: number;
  status: string;
  project_name?: string;
}

export interface DeveloperWorkloadDetail {
  developer_id: string;
  user_name: string;
  user_email: string;
  experience_years: number;
  availability_status: string;
  active_task_count: number;
  total_estimated_hours: number;
  weighted_hours: number;
  capacity_hours: number;
  workload_score: number;
  workload_status: string;
  active_tasks: TaskItem[];
  last_snapshot_at?: string;
}

export interface WorkloadRecord {
  id: string;
  developer_id: string;
  workload_score: number;
  active_task_count: number;
  estimated_hours: number;
  availability_factor?: number;
  calculated_at: string;
}

export default function WorkloadPage() {
  const { token, user, logout, apiUrl } = useAuth();
  const [summary, setSummary] = useState<WorkloadSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal state
  const [selectedDevDetail, setSelectedDevDetail] = useState<DeveloperWorkloadDetail | null>(null);
  const [devHistory, setDevHistory] = useState<WorkloadRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchWorkloadSummary = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/workload/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load workload summary');
      setSummary(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloadSummary();
  }, [token]);

  const handleInspectDeveloper = async (devId: string) => {
    if (!token) return;
    setDetailLoading(true);
    setError(null);
    try {
      const [detailRes, histRes] = await Promise.all([
        fetch(`${apiUrl}/api/workload/developers/${devId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/workload/developers/${devId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const detailData = await detailRes.json();
      const histData = await histRes.json();

      if (!detailRes.ok) throw new Error(detailData.detail || 'Failed to load developer workload');

      setSelectedDevDetail(detailData);
      if (histRes.ok) setDevHistory(histData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTakeSnapshot = async (devId: string) => {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/workload/developers/${devId}/snapshot`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to take workload snapshot');

      // Refresh data
      fetchWorkloadSummary();
      if (selectedDevDetail?.developer_id === devId) {
        handleInspectDeveloper(devId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getWorkloadStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'pill-success';
      case 'BALANCED':
        return 'pill-loading';
      case 'HIGH':
        return 'pill-loading';
      case 'OVERLOADED':
        return 'pill-error';
      default:
        return 'pill';
    }
  };

  const getProgressBarColor = (score: number) => {
    if (score < 50) return '#10b981'; // Green
    if (score <= 80) return '#38bdf8'; // Cyan/Blue
    if (score <= 100) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose/Red
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
            You must be logged in to view workload calculations and metrics.
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
        {/* Navigation & Header */}
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span className="badge" style={{ margin: 0 }}>Milestone 7 — Workload Engine</span>
            <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="/projects" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Projects & Teams
              </Link>
              <Link href="/developers" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Developers
              </Link>
              <Link href="/skills" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                Skills Catalog
              </Link>
              <button onClick={logout} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>
                Sign Out
              </button>
            </nav>
          </div>

          <h1 className="title">Developer Workload Engine</h1>
          <p className="subtitle">Deterministic calculation of developer active task load, available capacity, and workload balance</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {loading || !summary ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <span className="pill pill-loading">Calculating workload metrics...</span>
          </div>
        ) : (
          <>
            {/* System Aggregate Summary KPIs */}
            <section className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title">
                <span>⚡ System Workload Distribution</span>
              </div>

              <div className="status-grid" style={{ marginBottom: 0 }}>
                <div className="status-box">
                  <div className="status-label">Total Developers</div>
                  <div className="status-value">{summary.total_developers}</div>
                </div>

                <div className="status-box">
                  <div className="status-label">Available (&lt;50%)</div>
                  <div className="status-value" style={{ color: 'var(--accent-emerald)' }}>
                    {summary.available_developers_count} Dev(s)
                  </div>
                </div>

                <div className="status-box">
                  <div className="status-label">Balanced (50%-80%)</div>
                  <div className="status-value" style={{ color: 'var(--accent-cyan)' }}>
                    {summary.balanced_developers_count} Dev(s)
                  </div>
                </div>

                <div className="status-box">
                  <div className="status-label">Overloaded (&gt;100%)</div>
                  <div className="status-value" style={{ color: 'var(--accent-rose)' }}>
                    {summary.overloaded_developers_count} Dev(s)
                  </div>
                </div>

                <div className="status-box">
                  <div className="status-label">Average System Workload</div>
                  <div className="status-value">{summary.average_workload_score}%</div>
                </div>
              </div>
            </section>

            {/* Developer Workload Directory */}
            <section className="card">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span>👥 Developer Workload Directory ({summary.developers.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {summary.developers.map((dev) => (
                  <div key={dev.developer_id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            👤 {dev.user_name}
                          </span>
                          <span className={`pill ${getWorkloadStatusBadge(dev.workload_status)}`}>
                            {dev.workload_status} ({dev.workload_score}%)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {dev.user_email} • Exp: {dev.experience_years} yrs • Status: <strong style={{ color: 'var(--text-secondary)' }}>{dev.availability_status}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {canManage && (
                          <button
                            onClick={() => handleTakeSnapshot(dev.developer_id)}
                            className="btn"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)' }}
                          >
                            📸 Take Snapshot
                          </button>
                        )}

                        <button
                          onClick={() => handleInspectDeveloper(dev.developer_id)}
                          className="btn"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          🔍 Inspect Tasks →
                        </button>
                      </div>
                    </div>

                    {/* Workload Progress Bar */}
                    <div style={{ marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        <span>Active Tasks: <strong>{dev.active_task_count}</strong> ({dev.total_estimated_hours} hrs est. / {dev.weighted_hours} hrs weighted)</span>
                        <span>Capacity: <strong>{dev.capacity_hours} hrs/wk</strong></span>
                      </div>

                      <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div
                          style={{
                            width: `${Math.min(dev.workload_score, 100)}%`,
                            height: '100%',
                            background: getProgressBarColor(dev.workload_score),
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* DEVELOPER WORKLOAD BREAKDOWN MODAL */}
        {selectedDevDetail && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}>
            <div className="card" style={{ maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto', margin: 0 }}>
              <div className="card-title" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span>🔍 Workload Breakdown — {selectedDevDetail.user_name}</span>
                <button onClick={() => setSelectedDevDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}>
                  ✕
                </button>
              </div>

              {/* Breakdown Metrics Card */}
              <div className="status-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="status-box">
                  <div className="status-label">Workload Score</div>
                  <div className="status-value" style={{ color: getProgressBarColor(selectedDevDetail.workload_score) }}>
                    {selectedDevDetail.workload_score}% ({selectedDevDetail.workload_status})
                  </div>
                </div>

                <div className="status-box">
                  <div className="status-label">Active Hours / Capacity</div>
                  <div className="status-value">{selectedDevDetail.total_estimated_hours}h / {selectedDevDetail.capacity_hours}h</div>
                </div>

                <div className="status-box">
                  <div className="status-label">Complexity Weighted Hours</div>
                  <div className="status-value">{selectedDevDetail.weighted_hours} hrs</div>
                </div>
              </div>

              {/* Active Tasks Contributing to Workload */}
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Assigned Tasks ({selectedDevDetail.active_tasks.length})
              </h4>

              {selectedDevDetail.active_tasks.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.25rem' }}>
                  No active tasks contributing to workload.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  {selectedDevDetail.active_tasks.map((task) => (
                    <div key={task.id} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Project: {task.project_name || 'System Project'} • Status: {task.status}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className="pill" style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent-cyan)' }}>
                          {task.estimated_hours} hrs
                        </span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Complexity: {task.complexity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Workload Snapshots History */}
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Historical Snapshots ({devHistory.length})
              </h4>

              {devHistory.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No workload snapshots recorded yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {devHistory.map((rec) => (
                    <div key={rec.id} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span>Score: <strong style={{ color: 'var(--text-primary)' }}>{rec.workload_score}%</strong> ({rec.active_task_count} tasks, {rec.estimated_hours} hrs)</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(rec.calculated_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                <button onClick={() => setSelectedDevDetail(null)} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
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
