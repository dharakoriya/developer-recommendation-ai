'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';
import { StatusBadge } from '../../../components/StatusBadge';
import { WorkloadIndicator } from '../../../components/WorkloadIndicator';
import { RiskBadge } from '../../../components/RiskBadge';
import { MetricCard } from '../../../components/MetricCard';
import { StreakBadge } from '../../../components/StreakBadge';
import { AchievementCard } from '../../../components/AchievementCard';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';

export interface DeveloperSkillItem {
  id?: string;
  skill_id: string;
  skill_name?: string;
  skill_category?: string;
  proficiency_level: number;
}

export interface DeveloperProfile {
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
  created_at?: string;
  skills: DeveloperSkillItem[];
}

export interface PerformanceDetail {
  developer_id: string;
  performance_score: number;
  completion_rate: number;
  on_time_rate: number;
  weighted_productivity: number;
  total_assigned_tasks: number;
  completed_tasks: number;
  current_streak: number;
  longest_streak: number;
  total_incentive_points: number;
  achievements: {
    id: string;
    achievement_key: string;
    category: string;
    title: string;
    description: string;
    icon: string;
    earned_at: string;
  }[];
  recent_incentives: {
    id: string;
    task_id?: string;
    base_points: number;
    difficulty_bonus: number;
    on_time_bonus: number;
    streak_bonus: number;
    total_points: number;
    description?: string;
    earned_at: string;
  }[];
}

export interface RiskAssessment {
  developer_id: string;
  developer_name?: string;
  delivery_risk_level: string;
  delivery_risk_score: number;
  workload_percentage: number;
  active_task_count: number;
  performance_score: number;
  drivers: {
    category: string;
    severity: string;
    reason: string;
  }[];
  explanation: string;
}

export interface AssignedTask {
  id: string;
  title: string;
  project_id?: string;
  project_name?: string;
  status: string;
  priority: string;
  complexity: string;
  estimated_hours?: number;
  total_actual_seconds?: number;
  deadline?: string;
  assigned_developer_id?: string;
}

export interface SkillOption {
  id: string;
  name: string;
  category?: string;
}

export default function DeveloperProfilePage() {
  const params = useParams();
  const router = useRouter();
  const developerId = params?.id as string;

  const [dev, setDev] = useState<DeveloperProfile | null>(null);
  const [performance, setPerformance] = useState<PerformanceDetail | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [allSkills, setAllSkills] = useState<SkillOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile Modal
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editExp, setEditExp] = useState<number>(3);
  const [editAvail, setEditAvail] = useState<'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE'>('AVAILABLE');
  const [editPerfScore, setEditPerfScore] = useState<number>(85);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Add Skill Modal
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkillId, setNewSkillId] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState<number>(80);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Edit Skill Modal
  const [editingSkill, setEditingSkill] = useState<DeveloperSkillItem | null>(null);
  const [editSkillProficiency, setEditSkillProficiency] = useState<number>(80);
  const [isEditingSkill, setIsEditingSkill] = useState(false);

  // Status message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAllDeveloperData = useCallback(async () => {
    if (!developerId) return;
    setLoading(true);
    setError(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('devalign_token') : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // 1. Fetch Developer Profile
      const devRes = await fetch(`http://localhost:8000/api/developers/${developerId}`, { headers });
      if (!devRes.ok) {
        if (devRes.status === 404) throw new Error(`Developer profile (${developerId}) not found.`);
        throw new Error('Failed to load developer profile.');
      }
      const devData: DeveloperProfile = await devRes.json();
      setDev(devData);
      setEditExp(devData.experience_years);
      setEditAvail(devData.availability_status);
      setEditPerfScore(devData.performance_score ?? 85);

      // 2. Fetch Performance Intelligence (parallel safe)
      try {
        const perfRes = await fetch(`http://localhost:8000/api/developers/${developerId}/performance`, { headers });
        if (perfRes.ok) {
          const perfData = await perfRes.json();
          setPerformance(perfData);
        }
      } catch {
        // Optional sub-resource
      }

      // 3. Fetch Risk Intelligence
      try {
        const riskRes = await fetch(`http://localhost:8000/api/risk/developers/${developerId}`, { headers });
        if (riskRes.ok) {
          const riskData = await riskRes.json();
          setRisk(riskData);
        }
      } catch {
        // Optional sub-resource
      }

      // 4. Fetch Tasks assigned to this developer
      try {
        const tasksRes = await fetch(`http://localhost:8000/api/tasks`, { headers });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          const devTasks = tasksData.filter((t: any) => {
            if (t.assigned_developer_id === developerId) return true;
            if (t.current_assignment?.developer_id === developerId) return true;
            if (t.assignments && Array.isArray(t.assignments)) {
              return t.assignments.some((a: any) => a.developer_id === developerId && a.status === 'ACTIVE');
            }
            return false;
          });
          setTasks(devTasks);
        }
      } catch {
        // Optional tasks
      }

      // 5. Fetch available skills for assignment dropdown
      try {
        const skillsRes = await fetch(`http://localhost:8000/api/skills`, { headers });
        if (skillsRes.ok) {
          const skillsData = await skillsRes.json();
          setAllSkills(skillsData);
          if (skillsData.length > 0 && !newSkillId) {
            setNewSkillId(skillsData[0].id);
          }
        }
      } catch {
        // Optional skills
      }
    } catch (err: any) {
      setError(err.message || 'Error loading developer details.');
    } finally {
      setLoading(false);
    }
  }, [developerId, newSkillId]);

  useEffect(() => {
    fetchAllDeveloperData();
  }, [fetchAllDeveloperData]);

  // Handle Edit Profile Submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dev) return;
    setIsUpdatingProfile(true);
    setActionSuccess(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/developers/${dev.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          experience_years: Number(editExp),
          availability_status: editAvail,
          performance_score: Number(editPerfScore),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update developer profile.');
      }

      setShowEditProfileModal(false);
      setActionSuccess('Developer profile updated successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchAllDeveloperData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Add Skill Submission
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dev || !newSkillId) return;
    setIsAddingSkill(true);
    setActionSuccess(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/developers/${dev.id}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          skill_id: newSkillId,
          proficiency_level: Number(newSkillProficiency),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to add skill.');
      }

      setShowAddSkillModal(false);
      setActionSuccess('Skill successfully added to profile.');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchAllDeveloperData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAddingSkill(false);
    }
  };

  // Handle Edit Skill Proficiency Submission
  const handleUpdateSkillProficiency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dev || !editingSkill) return;
    setIsEditingSkill(true);
    setActionSuccess(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/developers/${dev.id}/skills/${editingSkill.skill_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          proficiency_level: Number(editSkillProficiency),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update skill proficiency.');
      }

      setEditingSkill(null);
      setActionSuccess('Skill proficiency updated successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchAllDeveloperData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsEditingSkill(false);
    }
  };

  // Handle Remove Skill
  const handleRemoveSkill = async (skillId: string, skillName?: string) => {
    if (!dev) return;
    if (!confirm(`Are you sure you want to remove skill "${skillName || 'this skill'}" from this developer?`)) {
      return;
    }
    setActionSuccess(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/developers/${dev.id}/skills/${skillId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to remove skill.');
      }

      setActionSuccess('Skill removed from profile.');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchAllDeveloperData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getProficiencyLabel = (level: number) => {
    if (level >= 90) return { label: 'Expert', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30' };
    if (level >= 75) return { label: 'Advanced', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
    if (level >= 50) return { label: 'Intermediate', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' };
    return { label: 'Foundational', color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30' };
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {loading ? (
          <LoadingState message="Loading developer intelligence profile, workload metrics, and delivery risk signals..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAllDeveloperData} />
        ) : dev ? (
          <>
            {/* Success Toast */}
            {actionSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
                <span>✓ {actionSuccess}</span>
                <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-300">✕</button>
              </div>
            )}

            {/* Profile Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-600/20 flex-shrink-0">
                    {dev.user_name ? dev.user_name.charAt(0).toUpperCase() : 'D'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href="/developers"
                        className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500 transition inline-flex items-center gap-1"
                      >
                        ← Developers Directory
                      </Link>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">ID: {dev.id.slice(0, 8)}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {dev.user_name || 'Developer Profile'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono">{dev.user_email || 'No email registered'}</span>
                      <span>•</span>
                      <span>{dev.experience_years} Years Experience</span>
                      {dev.created_at && (
                        <>
                          <span>•</span>
                          <span>Member since {new Date(dev.created_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges & Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <StatusBadge status={dev.availability_status} type="availability_status" />
                  {dev.delivery_risk_level && <RiskBadge level={dev.delivery_risk_level} />}
                  {performance && (
                    <StreakBadge
                      currentStreak={performance.current_streak}
                      longestStreak={performance.longest_streak}
                    />
                  )}

                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <button
                      onClick={() => setShowEditProfileModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
                    >
                      ✏️ Edit Profile
                    </button>
                    <button
                      onClick={() => setShowAddSkillModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/20"
                    >
                      + Add Skill
                    </button>
                    <Link
                      href={`/developers/${dev.id}/performance`}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold transition shadow-lg shadow-amber-500/20"
                    >
                      🏆 Performance Page →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Workload Capacity Bar in Header */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <WorkloadIndicator score={dev.workload_score ?? 0} status={dev.workload_status} />
              </div>
            </div>

            {/* KPI Performance Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard
                title="Experience"
                value={`${dev.experience_years} Yrs`}
                subtitle="Seniority Level"
                accentColor="purple"
                icon={<span className="text-sm">💼</span>}
              />
              <MetricCard
                title="Performance"
                value={`${dev.performance_score ?? 85}/100`}
                subtitle="Quality Rating"
                accentColor="emerald"
                icon={<span className="text-sm">⭐</span>}
              />
              <MetricCard
                title="Workload"
                value={`${Math.round(dev.workload_score ?? 0)}%`}
                subtitle={dev.workload_status || 'Capacity'}
                accentColor="indigo"
                icon={<span className="text-sm">📊</span>}
              />
              <MetricCard
                title="Active Tasks"
                value={dev.active_task_count ?? tasks.length}
                subtitle="In Progress"
                accentColor="blue"
                icon={<span className="text-sm">📋</span>}
              />
              <MetricCard
                title="Completion Rate"
                value={`${Math.round(performance?.completion_rate ?? dev.completion_rate ?? 90)}%`}
                subtitle="On-time Delivery"
                accentColor="cyan"
                icon={<span className="text-sm">🎯</span>}
              />
              <MetricCard
                title="Incentive Points"
                value={`${performance?.total_incentive_points ?? 0} 💎`}
                subtitle="Reward Ledger"
                accentColor="amber"
                icon={<span className="text-sm">💎</span>}
              />
            </div>

            {/* Main Content Layout: Left 2 cols, Right 1 col */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2 Cols): Skills, Active Tasks, Workload */}
              <div className="lg:col-span-2 space-y-6">
                {/* Technical Skills Catalog */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Technical Skills & Proficiencies</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Verified skill competencies used for intelligent task matching & workload routing.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddSkillModal(true)}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 transition"
                    >
                      + Add Skill
                    </button>
                  </div>

                  {dev.skills.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">No skills registered for this developer profile.</p>
                      <button
                        onClick={() => setShowAddSkillModal(true)}
                        className="text-xs font-bold text-purple-600 hover:underline"
                      >
                        Click here to add the first technical skill
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {dev.skills.map((s) => {
                        const prof = Number(s.proficiency_level) || 0;
                        const tier = getProficiencyLabel(prof);
                        return (
                          <div
                            key={s.skill_id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/90 space-y-2.5 group hover:border-slate-300 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                                  {s.skill_name || 'Skill'}
                                </h4>
                                {s.skill_category && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">
                                    {s.skill_category}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tier.color}`}>
                                  {tier.label}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingSkill(s);
                                    setEditSkillProficiency(prof);
                                  }}
                                  title="Edit proficiency"
                                  className="p-1 text-slate-400 hover:text-purple-500 text-xs rounded transition"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleRemoveSkill(s.skill_id, s.skill_name)}
                                  title="Remove skill"
                                  className="p-1 text-slate-400 hover:text-rose-500 text-xs rounded transition"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-mono">
                                <span className="text-slate-500 dark:text-slate-400">Proficiency</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{prof}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, prof))}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Assigned Active Tasks Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Active Tasks & Workload Items</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Current assignments tracked against sprint timelines and delivery deadlines.
                      </p>
                    </div>
                    <Link
                      href="/tasks"
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 transition"
                    >
                      All Tasks →
                    </Link>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No active tasks currently assigned to this developer.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                            <th className="pb-2.5 font-bold">Task Title</th>
                            <th className="pb-2.5 font-bold">Status</th>
                            <th className="pb-2.5 font-bold">Priority</th>
                            <th className="pb-2.5 font-bold">Complexity</th>
                            <th className="pb-2.5 font-bold">Estimated</th>
                            <th className="pb-2.5 font-bold">Deadline</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {tasks.map((task) => (
                            <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                              <td className="py-3 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                                {task.title}
                                {task.project_name && (
                                  <span className="block text-[10px] text-slate-400 font-normal">{task.project_name}</span>
                                )}
                              </td>
                              <td className="py-3">
                                <StatusBadge status={task.status} type="task_status" />
                              </td>
                              <td className="py-3">
                                <StatusBadge status={task.priority} type="priority" />
                              </td>
                              <td className="py-3">
                                <StatusBadge status={task.complexity} type="complexity" />
                              </td>
                              <td className="py-3 font-mono text-slate-600 dark:text-slate-300">
                                {task.estimated_hours ? `${task.estimated_hours} hrs` : '—'}
                              </td>
                              <td className="py-3 font-mono text-slate-500 dark:text-slate-400">
                                {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'None'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (1 Col): Delivery Risk & Achievements */}
              <div className="space-y-6">
                {/* Delivery Risk Intelligence Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Delivery Risk Intelligence</h3>
                    {risk?.delivery_risk_level ? (
                      <RiskBadge level={risk.delivery_risk_level} />
                    ) : dev.delivery_risk_level ? (
                      <RiskBadge level={dev.delivery_risk_level} />
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">Calculated Live</span>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Risk Assessment Score</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {risk?.delivery_risk_score ?? 15} / 100
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {risk?.explanation || 'Developer delivery risk is healthy based on current task concurrency and workload balance.'}
                    </p>
                  </div>

                  {risk?.drivers && risk.drivers.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Risk Factor Signals
                      </span>
                      <div className="space-y-2">
                        {risk.drivers.map((d, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-rose-600 dark:text-rose-400 uppercase text-[10px]">
                                {d.category}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-rose-500">
                                {d.severity}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-[11px]">{d.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>✓</span>
                      <span>No critical risk drivers detected on this profile.</span>
                    </div>
                  )}
                </div>

                {/* Achievements & Recognitions */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Achievements & Badges</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Gamification badges earned through consistency and quality.
                      </p>
                    </div>
                    {performance && (
                      <span className="text-xs font-bold text-amber-500 font-mono">
                        {performance.achievements?.length || 0} Earned
                      </span>
                    )}
                  </div>

                  {!performance?.achievements || performance.achievements.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-2xl block mb-1">🏅</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No achievements unlocked yet. Unlocks upon completing tasks and maintaining streaks.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {performance.achievements.map((ach) => (
                        <AchievementCard
                          key={ach.id}
                          title={ach.title}
                          description={ach.description}
                          icon={ach.icon}
                          category={ach.category}
                          earnedAt={ach.earned_at}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EDIT PROFILE MODAL */}
            {showEditProfileModal && (
              <div className="fixed inset-0 bg-black/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Edit Developer Profile</h3>
                    <button onClick={() => setShowEditProfileModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Developer Name
                      </label>
                      <input
                        type="text"
                        disabled
                        value={dev.user_name || 'Developer'}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="70"
                        step="0.5"
                        value={editExp}
                        onChange={(e) => setEditExp(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:border-purple-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Availability Status
                      </label>
                      <select
                        value={editAvail}
                        onChange={(e) => setEditAvail(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-purple-500"
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="PARTIAL">PARTIAL</option>
                        <option value="UNAVAILABLE">UNAVAILABLE</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Performance Score (0 - 100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editPerfScore}
                        onChange={(e) => setEditPerfScore(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:border-purple-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowEditProfileModal(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingProfile}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20"
                      >
                        {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ADD SKILL MODAL */}
            {showAddSkillModal && (
              <div className="fixed inset-0 bg-black/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Add Skill to Developer Profile</h3>
                    <button onClick={() => setShowAddSkillModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
                  </div>

                  <form onSubmit={handleAddSkill} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Select Skill
                      </label>
                      <select
                        value={newSkillId}
                        onChange={(e) => setNewSkillId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-purple-500"
                        required
                      >
                        {allSkills.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.category || 'General'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Proficiency Level (0 - 100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newSkillProficiency}
                        onChange={(e) => setNewSkillProficiency(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:border-purple-500"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddSkillModal(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAddingSkill}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20"
                      >
                        {isAddingSkill ? 'Adding...' : 'Add Skill'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* EDIT SKILL PROFICIENCY MODAL */}
            {editingSkill && (
              <div className="fixed inset-0 bg-black/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      Edit Proficiency: {editingSkill.skill_name}
                    </h3>
                    <button onClick={() => setEditingSkill(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold">✕</button>
                  </div>

                  <form onSubmit={handleUpdateSkillProficiency} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Proficiency Level (0 - 100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editSkillProficiency}
                        onChange={(e) => setEditSkillProficiency(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:border-purple-500"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3">
                      <button
                        type="button"
                        onClick={() => setEditingSkill(null)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isEditingSkill}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20"
                      >
                        {isEditingSkill ? 'Updating...' : 'Update Proficiency'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
