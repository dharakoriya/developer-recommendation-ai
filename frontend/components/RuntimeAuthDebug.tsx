'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../app/context/AuthContext';

export const RuntimeAuthDebug: React.FC = () => {
  const pathname = usePathname();
  const { user, token, apiUrl } = useAuth();

  const [backendRole, setBackendRole] = useState<string | null>(null);
  const [jwtRole, setJwtRole] = useState<string | null>(null);
  const [minimized, setMinimized] = useState<boolean>(true);

  useEffect(() => {
    if (!token) {
      setBackendRole(null);
      setJwtRole(null);
      return;
    }

    // Decode JWT payload locally for diagnostic verification
    try {
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const decoded = JSON.parse(atob(payloadBase64));
        setJwtRole(decoded.role || null);
      }
    } catch {
      setJwtRole('INVALID_JWT');
    }

    // Verify backend role from /api/auth/me
    fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setBackendRole(data.role);
      })
      .catch(() => setBackendRole('ERROR'));
  }, [token, apiUrl]);

  if (!user) return null;

  const isConsistent =
    user.role === backendRole && (jwtRole === null || user.role === jwtRole);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs select-none">
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className={`px-3 py-1.5 rounded-full border shadow-2xl backdrop-blur-md font-bold flex items-center gap-2 transition ${
            isConsistent
              ? 'bg-slate-900/90 text-emerald-400 border-emerald-500/40 hover:bg-slate-900'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/50 hover:bg-rose-900'
          }`}
        >
          <span>🔐 RBAC Debug:</span>
          <span>{user.role}</span>
          <span>{isConsistent ? '✓' : '❌'}</span>
        </button>
      ) : (
        <div className="bg-slate-900/95 border border-slate-700 rounded-2xl p-4 shadow-2xl w-80 space-y-3 backdrop-blur-md text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <span>⚡</span> RUNTIME AUTH DEBUG
            </span>
            <button
              onClick={() => setMinimized(true)}
              className="text-slate-400 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">User Name:</span>
              <span className="font-bold text-white truncate max-w-[150px]">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">User Email:</span>
              <span className="text-slate-300 truncate max-w-[150px]">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">AuthContext Role:</span>
              <span className="font-bold text-purple-400">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">JWT Payload Role:</span>
              <span className="font-bold text-blue-400">{jwtRole || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Backend /api/auth/me:</span>
              <span className="font-bold text-emerald-400">{backendRole || 'Loading...'}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5">
              <span className="text-slate-400">Current Route:</span>
              <span className="text-slate-200 truncate max-w-[150px]">{pathname}</span>
            </div>
          </div>

          <div
            className={`p-2 rounded-lg border text-center font-bold text-[10px] ${
              isConsistent
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {isConsistent ? 'CONSISTENT AUTH STATE ✓' : 'AUTH STATE MISMATCH ❌'}
          </div>
        </div>
      )}
    </div>
  );
};
