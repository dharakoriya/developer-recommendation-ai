'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

interface DeveloperSkill {
  id: string;
  developer_id: string;
  skill_id: string;
  skill_name?: string;
  skill_category?: string;
  proficiency_level: number;
}

interface Developer {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  experience_years: number;
  availability_status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  performance_score?: number;
  skills: DeveloperSkill[];
}

interface Skill {
  id: string;
  name: string;
  category?: string;
}

export default function DeveloperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const developerId = params.id as string;

  const { token, user, apiUrl } = useAuth();

  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [catalogSkills, setCatalogSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Skill assignment form states
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [proficiency, setProficiency] = useState<number>(75);

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editExp, setEditExp] = useState<number>(0);
  const [editAvailability, setEditAvailability] = useState<'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE'>('AVAILABLE');
  const [editPerf, setEditPerf] = useState<string>('');

  const fetchDeveloperDetails = async () => {
    if (!token || !developerId) return;
    setLoading(true);
    setError(null);
    try {
      const [devRes, skillRes] = await Promise.all([
        fetch(`${apiUrl}/api/developers/${developerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/skills`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const devData = await devRes.json();
      if (!devRes.ok) throw new Error(devData.detail || 'Developer profile not found');
      setDeveloper(devData);

      setEditExp(devData.experience_years);
      setEditAvailability(devData.availability_status);
      setEditPerf(devData.performance_score ? String(devData.performance_score) : '');

      if (skillRes.ok) {
        const skillData = await skillRes.json();
        setCatalogSkills(skillData);
        if (skillData.length > 0) setSelectedSkillId(skillData[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeveloperDetails();
  }, [token, developerId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/developers/${developerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          experience_years: editExp,
          availability_status: editAvailability,
          performance_score: editPerf ? parseFloat(editPerf) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Profile update failed');

      setIsEditingProfile(false);
      fetchDeveloperDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAssignSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/developers/${developerId}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skill_id: selectedSkillId,
          proficiency_level: proficiency,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Skill assignment failed');

      fetchDeveloperDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateProficiency = async (skillId: string, newProficiency: number) => {
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/developers/${developerId}/skills/${skillId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ proficiency_level: newProficiency }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Proficiency update failed');

      fetchDeveloperDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!confirm('Remove this skill from developer profile?')) return;
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/developers/${developerId}/skills/${skillId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Remove skill failed');
      }
      fetchDeveloperDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || (developer && developer.user_id === user?.id);

  if (loading) {
    return (
      <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <span className="pill pill-loading">Loading developer profile details...</span>
      </main>
    );
  }

  if (!developer) {
    return (
      <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card">
          <h2>Developer Profile Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>{error}</p>
          <Link href="/developers" className="btn">
            Back to Directory
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="container">
        <header className="header">
          <span className="badge">Developer Profile Details</span>
          <h1 className="title">{developer.user_name || 'Developer Profile'}</h1>
          <p className="subtitle">{developer.user_email}</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        <section className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span>📊 Developer Overview</span>
            {canEdit && (
              <button
                className="btn"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Experience (Years)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={editExp}
                  onChange={(e) => setEditExp(parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Availability</label>
                <select
                  value={editAvailability}
                  onChange={(e) => setEditAvailability(e.target.value as any)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white' }}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Performance Score</label>
                <input
                  type="number"
                  step="0.1"
                  value={editPerf}
                  onChange={(e) => setEditPerf(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>

              <div>
                <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
                  Save Profile Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="status-grid">
              <div className="status-box">
                <div className="status-label">Total Experience</div>
                <div className="status-value">{developer.experience_years} Years</div>
              </div>

              <div className="status-box">
                <div className="status-label">Availability Status</div>
                <div className="status-value">
                  <span className="pill pill-success">{developer.availability_status}</span>
                </div>
              </div>

              <div className="status-box">
                <div className="status-label">Performance Rating</div>
                <div className="status-value" style={{ color: 'var(--accent-cyan)' }}>
                  {developer.performance_score ? `${developer.performance_score} / 100` : 'Not Rated'}
                </div>
              </div>

              <div className="status-box">
                <div className="status-label">Technical Skills Count</div>
                <div className="status-value">{developer.skills.length} Skills</div>
              </div>
            </div>
          )}
        </section>

        {canEdit && catalogSkills.length > 0 && (
          <section className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-title">
              <span>⚡ Assign Technical Skill</span>
            </div>
            <form onSubmit={handleAssignSkill} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Select Skill</label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white' }}
                >
                  {catalogSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Proficiency Level: <strong>{proficiency}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={proficiency}
                  onChange={(e) => setProficiency(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                />
              </div>

              <div>
                <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
                  Assign Skill
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="card">
          <div className="card-title">
            <span>💻 Assigned Technical Skills & Proficiency</span>
          </div>

          {developer.skills.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
              No technical skills assigned to this developer profile yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {developer.skills.map((ds) => (
                <div
                  key={ds.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <strong style={{ fontSize: '1.05rem', marginRight: '0.5rem' }}>{ds.skill_name || 'Skill'}</strong>
                      <span className="pill" style={{ fontSize: '0.75rem', background: 'rgba(56,189,248,0.15)', color: 'var(--accent-cyan)' }}>
                        {ds.skill_category || 'General'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                        {ds.proficiency_level}%
                      </span>
                      {canEdit && (
                        <button
                          className="btn"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}
                          onClick={() => handleRemoveSkill(ds.skill_id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden', margin: '0.5rem 0' }}>
                    <div
                      style={{
                        width: `${ds.proficiency_level}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent-indigo) 0%, var(--accent-cyan) 100%)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {canEdit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Adjust Proficiency:</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={ds.proficiency_level}
                        onChange={(e) => handleUpdateProficiency(ds.skill_id, parseInt(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--accent-cyan)' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/developers" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            ← Back to Developer Profiles Directory
          </Link>
        </div>
      </main>
    </div>
  );
}
