'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { WorkloadIndicator } from '../../../components/WorkloadIndicator';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';

export interface SkillDetail {
  skill_id: string;
  skill_name: string;
  proficiency_level: number;
  years_experience?: number;
}

export interface DeveloperProfileDetail {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  experience_years: number;
  availability_status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  performance_score?: number;
  workload_score?: number;
  skills: SkillDetail[];
}

export default function DeveloperProfilePage() {
  const params = useParams();
  const developerId = params.id as string;

  const [dev, setDev] = useState<DeveloperProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (developerId) fetchProfile();
  }, [developerId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/developers/${developerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load developer profile');
      setDev(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {loading ? (
          <LoadingState message="Loading developer profile..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchProfile} />
        ) : dev ? (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <Link href="/developers" className="text-slate-400 hover:text-white text-xs font-semibold">← Developers</Link>
                  <StatusBadge status={dev.availability_status} type="workload_status" />
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">{dev.user_name || 'Developer Profile'}</h1>
                <p className="text-slate-400 text-xs mt-0.5">{dev.user_email || 'No email specified'}</p>
              </div>
            </div>

            {/* Profile Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs uppercase font-semibold">Years Experience</span>
                <span className="text-3xl font-extrabold text-white block mt-1 font-mono">{dev.experience_years} Yrs</span>
              </div>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs uppercase font-semibold">Performance Rating</span>
                <span className="text-3xl font-extrabold text-emerald-400 block mt-1 font-mono">{dev.performance_score ?? 85} / 100</span>
              </div>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-xs uppercase font-semibold">Workload Score</span>
                <span className="text-3xl font-extrabold text-purple-400 block mt-1 font-mono">{Math.round(dev.workload_score ?? 20)}%</span>
              </div>
            </div>

            {/* Workload Capacity */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="font-bold text-white text-sm">Workload Capacity & Status</h3>
              <WorkloadIndicator score={dev.workload_score ?? 20} status={dev.availability_status} />
            </div>

            {/* Technical Skills Catalog */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-white text-sm">Technical Skills & Proficiency Levels</h3>
              {dev.skills.length === 0 ? (
                <p className="text-slate-500 text-xs">No technical skills registered for this developer profile.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dev.skills.map((s, i) => (
                    <div key={i} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{s.skill_name}</span>
                        <span className="text-blue-400 font-mono font-bold">Level {s.proficiency_level} / 5</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all"
                          style={{ width: `${(s.proficiency_level / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
