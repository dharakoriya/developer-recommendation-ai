'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './context/AuthContext';

interface HealthResponse {
  status: string;
  project: string;
  environment: string;
  timestamp: string;
  database: {
    status: string;
    message: string;
    database_url_configured: boolean;
  };
}

export default function Home() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const { user, logout } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      const res = await fetch(`${apiUrl}/api/health`, { cache: 'no-store' });
      const duration = Math.round(performance.now() - startTime);
      setLatency(duration);

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const data: HealthResponse = await res.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to reach FastAPI backend server');
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="container">
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span className="badge" style={{ margin: 0 }}>System Foundation</span>
            <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {user ? (
                <>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Signed in: <strong>{user.name}</strong> ({user.role})
                  </span>
                  <Link href="/projects" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' }}>
                    Projects & Teams
                  </Link>
                  <Link href="/developers" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                    Developers
                  </Link>
                  <Link href="/skills" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
                    Skills Catalog
                  </Link>
                  <Link href="/protected" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
                    Auth Area
                  </Link>
                  <button onClick={logout} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                  Sign In / Register
                </Link>
              )}
            </nav>

          </div>

          <h1 className="title">DevAlign AI</h1>
          <p className="subtitle">
            Explainable AI-Based Developer Recommendation and Workload Balancing System
          </p>
        </header>

        <section className="card">
          <div className="card-title">
            <span>🔌 System Integration & Health Status</span>
          </div>

          <div className="status-grid">
            <div className="status-box">
              <div className="status-label">Next.js Frontend</div>
              <div className="status-value">
                <span className="pill pill-success">
                  <span className="pulse-dot"></span> Ready
                </span>
              </div>
            </div>

            <div className="status-box">
              <div className="status-label">FastAPI Backend</div>
              <div className="status-value">
                {loading ? (
                  <span className="pill pill-loading">Checking...</span>
                ) : error ? (
                  <span className="pill pill-error">Disconnected</span>
                ) : (
                  <span className="pill pill-success">
                    <span className="pulse-dot"></span> {healthData?.status === 'ok' ? 'Connected (OK)' : healthData?.status}
                  </span>
                )}
              </div>
            </div>

            <div className="status-box">
              <div className="status-label">PostgreSQL Database</div>
              <div className="status-value">
                {loading ? (
                  <span className="pill pill-loading">Checking...</span>
                ) : error ? (
                  <span className="pill pill-error">Backend Offline</span>
                ) : healthData?.database.status === 'connected' ? (
                  <span className="pill pill-success">
                    <span className="pulse-dot"></span> Connected
                  </span>
                ) : (
                  <span className="pill pill-loading" title={healthData?.database.message}>
                    Configured (Idle)
                  </span>
                )}
              </div>
            </div>

            <div className="status-box">
              <div className="status-label">API Latency</div>
              <div className="status-value">
                <span style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>
                  {latency !== null ? `${latency} ms` : '--'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Target Endpoint: <code style={{ color: 'var(--accent-cyan)' }}>{apiUrl}/api/health</code>
            </span>
            <button className="btn" onClick={checkHealth} disabled={loading}>
              {loading ? 'Testing...' : 'Re-test Health Endpoint'}
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', color: '#fda4af', fontSize: '0.9rem' }}>
              <strong>Connection Error:</strong> {error}
            </div>
          )}

          {healthData && (
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Raw REST API Health Response:
              </div>
              <pre className="json-view">{JSON.stringify(healthData, null, 2)}</pre>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        DevAlign AI Architecture Foundation • Next.js ↔ REST API ↔ FastAPI ↔ PostgreSQL
      </footer>
    </div>
  );
}
