'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function ProtectedPage() {
  const { user, token, logout, loading, apiUrl } = useAuth();
  const [roleTestResult, setRoleTestResult] = useState<string | null>(null);
  const [roleTestError, setRoleTestError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);

  if (loading) {
    return (
      <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <span className="pill pill-loading">Validating authentication session...</span>
      </main>
    );
  }

  if (!user || !token) {
    return (
      <main className="container" style={{ maxWidth: '500px', paddingTop: '4rem', textAlign: 'center' }}>
        <div className="card">
          <div className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            401 Unauthorized
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Protected Area Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            You must be logged in with a valid JWT session to view this protected page.
          </p>
          <Link href="/login" className="btn">
            Sign In to Continue
          </Link>
        </div>
      </main>
    );
  }

  const testRoleAccess = async (targetRole: 'admin' | 'manager') => {
    setTestLoading(true);
    setRoleTestResult(null);
    setRoleTestError(null);

    try {
      const res = await fetch(`${apiUrl}/api/auth/test-role/${targetRole}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${data.detail || 'Forbidden'}`);
      }

      setRoleTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setRoleTestError(err.message || 'Authorization check failed');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="container">
        <header className="header">
          <span className="badge">Authenticated Session</span>
          <h1 className="title">Protected Area Verification</h1>
          <p className="subtitle">Role-Based Authorization & JWT Session Verification</p>
        </header>

        <section className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span>👤 User Profile</span>
            <button className="btn" onClick={logout} style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
              Sign Out
            </button>
          </div>

          <div className="status-grid">
            <div className="status-box">
              <div className="status-label">Authenticated User</div>
              <div className="status-value">{user.name}</div>
            </div>

            <div className="status-box">
              <div className="status-label">Email Address</div>
              <div className="status-value" style={{ fontSize: '0.95rem' }}>{user.email}</div>
            </div>

            <div className="status-box">
              <div className="status-label">Assigned Role</div>
              <div className="status-value">
                <span
                  className="pill"
                  style={{
                    background: user.role === 'ADMIN' ? 'rgba(244, 63, 94, 0.15)' : user.role === 'MANAGER' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: user.role === 'ADMIN' ? 'var(--accent-rose)' : user.role === 'MANAGER' ? 'var(--accent-indigo)' : 'var(--accent-emerald)',
                    border: '1px solid currentColor',
                  }}
                >
                  {user.role}
                </span>
              </div>
            </div>

            <div className="status-box">
              <div className="status-label">Account Status</div>
              <div className="status-value">
                <span className="pill pill-success">Active Account</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <div className="status-label">Active JWT Bearer Token (Truncated):</div>
            <code style={{ display: 'block', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '0.375rem', fontSize: '0.8rem', color: 'var(--accent-cyan)', wordBreak: 'break-all' }}>
              Bearer {token.slice(0, 35)}...{token.slice(-15)}
            </code>
          </div>
        </section>

        <section className="card">
          <div className="card-title">
            <span>🛡️ Backend Role-Based Authorization Tests</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Query role-protected backend endpoints to test HTTP 403 Forbidden vs HTTP 200 OK authorization logic:
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button className="btn" onClick={() => testRoleAccess('admin')} disabled={testLoading}>
              Test ADMIN Endpoint (/api/auth/test-role/admin)
            </button>

            <button className="btn" onClick={() => testRoleAccess('manager')} disabled={testLoading} style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
              Test MANAGER Endpoint (/api/auth/test-role/manager)
            </button>
          </div>

          {roleTestError && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
              ⛔ {roleTestError}
            </div>
          )}

          {roleTestResult && (
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Response Payload:</div>
              <pre className="json-view">{roleTestResult}</pre>
            </div>
          )}
        </section>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            ← Return to Home Verification Page
          </Link>
        </div>
      </main>
    </div>
  );
}
