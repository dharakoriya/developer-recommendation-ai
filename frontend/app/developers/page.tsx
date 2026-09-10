'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { StatusBadge } from '../../components/StatusBadge';
import { WorkloadIndicator } from '../../components/WorkloadIndicator';
import { RiskBadge } from '../../components/RiskBadge';
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
  workload_status?: string;
  completion_rate?: number;
  productivity_score?: number;
  active_task_count?: number;
  delivery_risk_level?: string;
  skills?: { skill_id: string; skill_name: string; proficiency_level: number }[];
}

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [availFilter, setAvailFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Add Skill Modal State
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [selectedDev, setSelectedDev] = useState<Developer | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState<number>(80);
  const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);

  useEffect(() => {
    fetchDevelopersAndSkills();
  }, [sortBy, sortOrder]);

  const fetchDevelopersAndSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const queryParams = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const dRes = await fetch(`http://localhost:8000/api/developers?${queryParams.toString()}`, { headers });
      if (!dRes.ok) throw new Error('Failed to load developers directory');
      const dData = await dRes.json();
      setDevelopers(dData);

      const sRes = await fetch('http://localhost:8000/api/skills', { headers });
      if (sRes.ok) {
        const sData = await sRes.json();
        setSkills(sData);
        if (sData.length > 0 && !selectedSkillId) setSelectedSkillId(sData[0].id);
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Developer Intelligence Directory</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Engineering talent overview with workload balancing, performance analytics, skill matrices, and delivery risk signals.
            </p>
          </div>
        </div>

        {/* Controls: Search, Filters & Sorting */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search input */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search developers by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-semibold"
              >
                <option value="name">Name</option>
                <option value="experience">Experience</option>
                <option value="performance">Performance Score</option>
                <option value="workload">Workload %</option>
                <option value="availability">Availability</option>
                <option value="task_completion">Task Completion Rate</option>
                <option value="productivity">Productivity Score</option>
              </select>

              <button
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title="Toggle sort direction"
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition font-mono border border-slate-200 dark:border-slate-700"
              >
                {sortOrder === 'asc' ? '⬆️ ASC' : '⬇️ DESC'}
              </button>
            </div>
          </div>

          {/* Availability filter buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Availability:</span>
            {['ALL', 'AVAILABLE', 'PARTIAL', 'UNAVAILABLE'].map((av) => (
              <button
                key={av}
                onClick={() => setAvailFilter(av)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
                  availFilter === av
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Developer Cards Grid */}
        {loading ? (
          <LoadingState message="Loading developer profiles & risk intelligence..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDevelopersAndSkills} />
        ) : filteredDevs.length === 0 ? (
          <EmptyState
            title="No Developers Found"
            description="No engineering profiles match your search and filter criteria."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDevs.map((dev) => (
              <div key={dev.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
                {/* Header with Name & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{dev.user_name || 'Developer'}</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono block">{dev.user_email}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={dev.availability_status} type="availability_status" />
                    {dev.delivery_risk_level && (
                      <RiskBadge level={dev.delivery_risk_level} />
                    )}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Experience</span>
                    <span className="text-slate-900 dark:text-slate-200 font-bold font-mono">{dev.experience_years} yrs</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Performance</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{dev.performance_score ?? 85}/100</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Workload</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">{Math.round(dev.workload_score ?? 0)}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Tasks</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">{dev.active_task_count ?? 0} active</span>
                  </div>
                </div>

                {/* Skill Badges */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Skill Proficiencies</span>
                    <button
                      onClick={() => {
                        setSelectedDev(dev);
                        setShowSkillModal(true);
                      }}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-500 font-semibold text-[11px] transition"
                    >
                      + Add Skill
                    </button>
                  </div>
                  {dev.skills && dev.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dev.skills.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                          {s.skill_name}: <strong className="text-purple-600 dark:text-purple-400">{s.proficiency_level}</strong>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No skills linked yet.</p>
                  )}
                </div>

                {/* Workload Indicator */}
                <WorkloadIndicator score={dev.workload_score ?? 0} />
              </div>
            ))}
          </div>
        )}

        {/* Add Skill Modal */}
        {showSkillModal && selectedDev && (
          <div className="fixed inset-0 bg-black/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Skill Proficiency</h3>
                <button onClick={() => setShowSkillModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
              </div>

              <form onSubmit={handleAddSkill} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Developer</label>
                  <input type="text" disabled value={selectedDev.user_name || 'Developer'} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Select Skill</label>
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:border-purple-500"
                  >
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category || 'General'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Proficiency Level (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={proficiency}
                    onChange={(e) => setProficiency(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowSkillModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingSkill} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20">
                    {isSubmittingSkill ? 'Saving...' : 'Save Skill'}
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
