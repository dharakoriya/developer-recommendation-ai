'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

interface Developer {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  experience_years: number;
  availability_status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  performance_score?: number;
  created_at: string;
  skills: any[];
}

export default function DevelopersPage() {
  const { token, user, apiUrl } = useAuth();
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [expYears, setExpYears] = useState<number>(3.0);
  const [availability, setAvailability] = useState<'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE'>('AVAILABLE');
  const [perfScore, setPerfScore] = useState<string>('');

  const fetchDevelopers = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/developers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load developers');
      setDevelopers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/developers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userIdInput,
          experience_years: expYears,
          availability_status: availability,
          performance_score: perfScore ? parseFloat(perfScore) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create developer profile');

      setUserIdInput('');
      setExpYears(3.0);
      fetchDevelopers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="container">
        <header className="header">
          <span className="badge">Developer Management</span>
          <h1 className="title">Developer Profiles Directory</h1>
          <p className="subtitle">Structured developer expertise, availability, and technical proficiencies</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {canManage && (
          <section className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-title">
              <span>➕ Create Developer Profile</span>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>User UUID</label>
                <input
                  type="text"
                  required
                  placeholder="Paste User UUID"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Experience (Years)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0"
                  max="50"
                  value={expYears}
                  onChange={(e) => setExpYears(parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as any)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white' }}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Performance Score (0-100)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Optional e.g. 88.5"
                  value={perfScore}
                  onChange={(e) => setPerfScore(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>

              <div>
                <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
                  Create Profile
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span>👨‍💻 Developer Profiles ({developers.length})</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <span className="pill pill-loading">Loading developer directory...</span>
            </div>
          ) : developers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
              No developer profiles found.
            </p>
          ) : (
            <div className="status-grid">
              {developers.map((dev) => (
                <div key={dev.id} className="status-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{dev.user_name || 'Developer'}</span>
                      <span
                        className="pill"
                        style={{
                          background: dev.availability_status === 'AVAILABLE' ? 'rgba(16,185,129,0.15)' : dev.availability_status === 'PARTIAL' ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)',
                          color: dev.availability_status === 'AVAILABLE' ? 'var(--accent-emerald)' : dev.availability_status === 'PARTIAL' ? '#f59e0b' : 'var(--accent-rose)',
                          border: '1px solid currentColor',
                        }}
                      >
                        {dev.availability_status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      {dev.user_email}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Experience: <strong>{dev.experience_years} years</strong> • Skills: <strong>{dev.skills.length} assigned</strong>
                    </div>
                  </div>

                  <Link href={`/developers/${dev.id}`} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', justifyContent: 'center' }}>
                    View & Manage Skills →
                  </Link>
                </div>
              ))}
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
