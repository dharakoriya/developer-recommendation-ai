'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { WorkloadIndicator } from '../../components/WorkloadIndicator';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface Developer {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  experience_years: number;
  availability_status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  performance_score?: number;
  workload_score?: number;
  skills?: { skill_name: string; proficiency_level: number }[];
}

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [availFilter, setAvailFilter] = useState('ALL');

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const fetchDevelopers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch('http://localhost:8000/api/developers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load developers directory');
      setDevelopers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevs = developers.filter((d) => {
    const name = d.user_name || 'Developer';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAvail = availFilter === 'ALL' || d.availability_status === availFilter;
    return matchesSearch && matchesAvail;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Developer Directory</h1>
            <p className="text-slate-400 text-xs mt-1">Directory of engineering profiles, skills, performance scores, and availability.</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search developers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3.5 py-2.5 flex-1 focus:outline-none focus:border-blue-500"
          />
          <div className="flex items-center gap-2">
            {['ALL', 'AVAILABLE', 'PARTIAL', 'UNAVAILABLE'].map((av) => (
              <button
                key={av}
                onClick={() => setAvailFilter(av)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition border ${
                  availFilter === av
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading developer profiles..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDevelopers} />
        ) : filteredDevs.length === 0 ? (
          <EmptyState
            title="No Developers Found"
            description="No developer profiles match your current search and availability filters."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDevs.map((d) => (
              <div key={d.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-white text-base">{d.user_name || 'Developer Profile'}</h3>
                      <p className="text-slate-400 text-xs mt-0.5">{d.experience_years} Years Experience</p>
                    </div>
                    <StatusBadge status={d.availability_status} type="workload_status" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Performance</span>
                      <span className="font-bold text-emerald-400 mt-0.5 block">{d.performance_score ?? 85}/100</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Skills Count</span>
                      <span className="font-bold text-blue-400 mt-0.5 block">{d.skills?.length ?? 0} Skills</span>
                    </div>
                  </div>

                  <WorkloadIndicator score={d.workload_score ?? 20.0} />
                </div>

                <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-end">
                  <Link
                    href={`/developers/${d.id}`}
                    className="bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-md transition border border-slate-700"
                  >
                    View Developer Profile →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
