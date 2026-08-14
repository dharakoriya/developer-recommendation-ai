'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

interface Skill {
  id: string;
  name: string;
  category?: string;
  created_at: string;
}

export default function SkillsPage() {
  const { token, user, apiUrl } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Backend');
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);

  const fetchSkills = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/skills`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load skills');
      setSkills(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const endpoint = editingSkillId
        ? `${apiUrl}/api/skills/${editingSkillId}`
        : `${apiUrl}/api/skills`;
      const method = editingSkillId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, category }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Operation failed');

      setName('');
      setCategory('Backend');
      setEditingSkillId(null);
      fetchSkills();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkillId(skill.id);
    setName(skill.name);
    setCategory(skill.category || 'Backend');
  };

  const handleDelete = async (skillId: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/skills/${skillId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Delete failed');
      }
      fetchSkills();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="container">
        <header className="header">
          <span className="badge">Skill Management Catalog</span>
          <h1 className="title">Technical Skills Catalog</h1>
          <p className="subtitle">Master repository of development tools, languages, and frameworks</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {canManage && (
          <section className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-title">
              <span>{editingSkillId ? '✏️ Edit Skill' : '➕ Create New Skill'}</span>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Skill Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python, React, PostgreSQL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Category</label>
                <input
                  type="text"
                  placeholder="e.g. Language, Framework, Database"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn">
                  {editingSkillId ? 'Update Skill' : 'Add Skill'}
                </button>
                {editingSkillId && (
                  <button
                    type="button"
                    className="btn"
                    style={{ background: 'transparent', border: '1px solid var(--border-color)' }}
                    onClick={() => {
                      setEditingSkillId(null);
                      setName('');
                      setCategory('Backend');
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        <section className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span>🛠️ Catalog List ({skills.length})</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <span className="pill pill-loading">Loading catalog skills...</span>
            </div>
          ) : skills.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
              No skills registered in the catalog yet.
            </p>
          ) : (
            <div className="status-grid">
              {skills.map((skill) => (
                <div key={skill.id} className="status-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{skill.name}</div>
                    <span className="pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      {skill.category || 'General'}
                    </span>
                  </div>

                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button className="btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleEdit(skill)}>
                        Edit
                      </button>
                      <button className="btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }} onClick={() => handleDelete(skill.id)}>
                        Delete
                      </button>
                    </div>
                  )}
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
