'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, UserRole } from '../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, apiUrl, user } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('manager@devalign.ai');
  const [password, setPassword] = useState<string>('Password123!');
  const [name, setName] = useState<string>('Jane Manager');
  const [role, setRole] = useState<UserRole>('MANAGER');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // If already logged in, redirect to protected page
  if (user) {
    return (
      <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card">
          <h2>Already Authenticated</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>
            Logged in as <strong>{user.name}</strong> ({user.role})
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/protected" className="btn">
              Go to Protected Area
            </Link>
            <Link href="/" className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)' }}>
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isRegisterMode) {
        // Register account
        const regRes = await fetch(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role }),
        });

        const regData = await regRes.json();
        if (!regRes.ok) {
          throw new Error(regData.detail || 'Registration failed');
        }

        setMessage(`Account created for ${regData.email}! Now signing in...`);
      }

      // Login to obtain JWT
      const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.detail || 'Invalid email or password');
      }

      login(loginData.access_token, loginData.user);
      router.push('/protected');
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="container" style={{ maxWidth: '480px', paddingTop: '4rem' }}>
        <div className="header">
          <span className="badge">Milestone 3 — Authentication</span>
          <h1 className="title">{isRegisterMode ? 'Create Account' : 'Sign In'}</h1>
          <p className="subtitle">DevAlign AI Decision-Support Platform</p>
        </div>

        <div className="card">
          {error && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
              ⚠️ {error}
            </div>
          )}

          {message && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
              ✅ {message}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isRegisterMode && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
              />
            </div>

            {isRegisterMode && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Select Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white' }}
                >
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            )}

            <button type="submit" className="btn" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? 'Processing...' : isRegisterMode ? 'Register & Sign In' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isRegisterMode ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
                setMessage(null);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
            >
              {isRegisterMode ? 'Sign In' : 'Register Account'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            ← Return to Home Verification
          </Link>
        </div>
      </main>
    </div>
  );
}
