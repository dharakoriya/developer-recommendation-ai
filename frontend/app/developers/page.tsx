'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { WorkloadIndicator } from '../../components/WorkloadIndicator';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface SkillOption {
  id: string;
  name: string;
  category?: string;
}

export interface Developer {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  experience_years: number;
  availability_status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  performance_score?: number;
  workload_score?: number;
  skills?: { skill_id: string; skill_name: string; proficiency_level: number }[];
}

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [availFilter, setAvailFilter] = useState('ALL');

  // Add Skill Modal State
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [selectedDev, setSelectedDev] = useState<Developer | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState<number>(80);
  const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);

  useEffect(() => {
    fetchDevelopersAndSkills();
  }, []);

  const fetchDevelopersAndSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const dRes = await fetch('http://localhost:8000/api/developers', { headers });
      if (!dRes.ok) throw new Error('Failed to load developers directory');
      const dData = await dRes.json();
      setDevelopers(dData);

      const sRes = await fetch('http://localhost:8000/api/skills', { headers });
      if (sRes.ok) {
        const sData = await sRes.json();
        setSkills(sData);
        if (sData.length > 0) setSelectedSkillId(sData[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDev || !selectedSkillId) return;

    setIsSubmittingSkill(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/developers/${selectedDev.id}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          skill_id: selectedSkillId,
          proficiency_level: Number(proficiency),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to add skill proficiency');
      }

      setShowSkillModal(false);
      setSelectedDev(null);
      fetchDevelopersAndSkills();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingSkill(false);
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
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3.5 py-2.5 flex-1 focus:outline-none focus:border-purple-500"
          />
          <div className="flex items-center gap-2">
            {['ALL', 'AVAILABLE', 'PARTIAL', 'UNAVAILABLE'].map((av) => (
              <button
                key={av}
                onClick={() => setAvailFilter(av)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition border ${
                  availFilter === av
                    ? 'bg-purple-600 text-white border-purple-500'
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
          <ErrorState message={error} onRetry={fetchDevelopersAndSkills} />
        ) : filteredDevs.length === 0 ? (
          <EmptyState
            title="No Developers Found"
            description="No engineering profiles match your search criteria."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDevs.map((dev) => (
              <div key={dev.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-white text-base">{dev.user_name || 'Developer'}</h3>
                    <span className="text-xs text-slate-400 font-mono block">{dev.user_email}</span>
                  </div>
                  <StatusBadge status={dev.availability_status} type="availability_status" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-850">
                    <span className="text-slate-500 block text-[10px]">Experience</span>
                    <span className="text-slate-200 font-bold font-mono">{dev.experience_years} yrs</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-850">
                    <span className="text-slate-500 block text-[10px]">Performance</span>
                    <span className="text-emerald-400 font-bold font-mono">{dev.performance_score ?? 85}/100</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-850">
                    <span className="text-slate-500 block text-[10px]">Workload</span>
                    <span className="text-purple-400 font-bold font-mono">{Math.round(dev.workload_score ?? 0)}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Skill Proficiencies</span>
                    <button
                      onClick={() => {
                        setSelectedDev(dev);
                        setShowSkillModal(true);
                      }}
                      className="text-purple-400 hover:text-purple-300 font-semibold text-[11px] transition"
                    >
                      + Add Skill
                    </button>
                  </div>
                  {dev.skills && dev.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dev.skills.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                          {s.skill_name}: <strong className="text-purple-400">{s.proficiency_level}</strong>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No skills linked yet.</p>
                  )}
                </div>

                <WorkloadIndicator score={dev.workload_score ?? 0} />
              </div>
            ))}
          </div>
        )}

        {/* Add Skill Modal */}
        {showSkillModal && selectedDev && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Add Skill Proficiency</h3>
                <button onClick={() => setShowSkillModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleAddSkill} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Developer</label>
                  <input type="text" disabled value={selectedDev.user_name || 'Developer'} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Select Skill</label>
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-purple-500"
                  >
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category || 'General'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Proficiency Level (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={proficiency}
                    onChange={(e) => setProficiency(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowSkillModal(false)} className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs font-semibold">Cancel</button>
                  <button type="submit" disabled={isSubmittingSkill} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-purple-500 transition">
                    {isSubmittingSkill ? 'Saving...' : 'Add Skill'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
