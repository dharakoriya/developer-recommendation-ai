'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../lib/api';

const formatSkillName = (sk: any): string => {
  if (!sk) return '';
  if (typeof sk === 'string') return sk;
  if (typeof sk === 'object') {
    return sk.skill_name || sk.name || JSON.stringify(sk);
  }
  return String(sk);
};

export interface AIPlanTask {
  id: string;
  title: string;
  description?: string;
  module?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimated_hours: number;
  required_skills: any[];
  dependencies: string[];
  acceptance_criteria?: string[];
  status: 'PROPOSED' | 'EDITED' | 'APPROVED' | 'EXCLUDED';
  is_manually_added: boolean;
}

export interface AIPlanDetail {
  id: string;
  project_name: string;
  project_description: string;
  project_type: string;
  granularity: string;
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  summary_json?: {
    project_summary?: string;
    business_objective?: string;
    primary_users?: string;
    core_value_proposition?: string;
    modules?: string[];
  };
  ai_provider?: string;
  ai_model?: string;
  prompt_version?: string;
  created_at: string;
  tasks: AIPlanTask[];
}

export interface TaskCapabilityItem {
  task_id: string;
  task_title?: string;
  title?: string;
  status_classification?: 'WELL_SUPPORTED' | 'CAPACITY_RISK' | 'SKILL_GAP' | string;
  category?: 'WELL_SUPPORTED' | 'CAPACITY_RISK' | 'SKILL_GAP' | string;
  required_skills?: any[];
  matching_developers?: any[];
  matching_developers_count?: number;
  reason?: string;
  notes?: string;
}

export interface CapabilityAnalysis {
  total_generated_tasks: number;
  well_supported_count: number;
  capacity_risk_count: number;
  skill_gap_count: number;
  missing_skills: any[];
  resource_bottlenecks: Array<{ skill: string; task_count: number; developer_count: number }>;
  task_analyses?: TaskCapabilityItem[];
  task_capabilities?: TaskCapabilityItem[];
}

export default function AIPlanReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const planId = params?.id as string;

  const [plan, setPlan] = useState<AIPlanDetail | null>(null);
  const [capability, setCapability] = useState<CapabilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'CAPABILITY' | 'DEPENDENCIES'>('TASKS');

  // Task Editing Modal State
  const [editingTask, setEditingTask] = useState<AIPlanTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editModule, setEditModule] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [editComplexity, setEditComplexity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [editHours, setEditHours] = useState(8);
  const [editSkillsInput, setEditSkillsInput] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Add Manual Task Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newModule, setNewModule] = useState('Core Architecture');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newComplexity, setNewComplexity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newHours, setNewHours] = useState(8);
  const [newSkillsInput, setNewSkillsInput] = useState('');

  // Skill Resolution Modal for Apply Plan
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [skillResolutions, setSkillResolutions] = useState<Record<string, { action: 'CREATE_NEW' | 'MAP_EXISTING' | 'REMOVE'; mapped_id?: string }>>({});
  const [existingSkills, setExistingSkills] = useState<Array<{ id: string; name: string }>>([]);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (planId) {
      fetchPlanDetail();
      fetchCapabilityAnalysis();
      fetchExistingSkills();
    }
  }, [planId]);

  const fetchPlanDetail = async () => {
    try {
      const data = await apiClient.get<AIPlanDetail>(`/ai-planning/plans/${planId}`);
      setPlan(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load AI plan detail', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCapabilityAnalysis = async () => {
    try {
      const data = await apiClient.get<CapabilityAnalysis>(`/ai-planning/plans/${planId}/capability-analysis`);
      setCapability(data);
      if (data.missing_skills) {
        const initRes: Record<string, { action: 'CREATE_NEW' | 'MAP_EXISTING' | 'REMOVE'; mapped_id?: string }> = {};
        data.missing_skills.forEach((s) => {
          initRes[s] = { action: 'CREATE_NEW' };
        });
        setSkillResolutions(initRes);
      }
    } catch (err: any) {
      console.error('Failed capability analysis:', err);
    }
  };

  const fetchExistingSkills = async () => {
    try {
      const data = await apiClient.get<Array<{ id: string; name: string }>>('/skills');
      setExistingSkills(data || []);
    } catch (err) {
      console.error('Failed to fetch existing skills:', err);
    }
  };

  const handleOpenEdit = (t: AIPlanTask) => {
    setEditingTask(t);
    setEditTitle(t.title);
    setEditDesc(t.description || '');
    setEditModule(t.module || '');
    setEditPriority(t.priority);
    setEditComplexity(t.complexity);
    setEditHours(t.estimated_hours);
    setEditSkillsInput((t.required_skills || []).map(formatSkillName).join(', '));
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    setIsSavingTask(true);
    const updatedSkills = editSkillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      await apiClient.put(`/ai-planning/plans/${planId}/tasks/${editingTask.id}`, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        module: editModule.trim() || undefined,
        priority: editPriority,
        complexity: editComplexity,
        estimated_hours: Number(editHours),
        required_skills: updatedSkills,
      });

      showToast('Task updated successfully!', 'success');
      setEditingTask(null);
      fetchPlanDetail();
      fetchCapabilityAnalysis();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task', 'error');
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleAddManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const skills = newSkillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      await apiClient.post(`/ai-planning/plans/${planId}/tasks`, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        module: newModule.trim() || 'Core Architecture',
        priority: newPriority,
        complexity: newComplexity,
        estimated_hours: Number(newHours),
        required_skills: skills,
      });

      showToast('Manual task added to plan!', 'success');
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewSkillsInput('');
      fetchPlanDetail();
      fetchCapabilityAnalysis();
    } catch (err: any) {
      showToast(err.message || 'Failed to add task', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to exclude this task from the project plan?')) return;
    try {
      await apiClient.delete(`/ai-planning/plans/${planId}/tasks/${taskId}`);
      showToast('Task removed from plan.', 'success');
      fetchPlanDetail();
      fetchCapabilityAnalysis();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove task', 'error');
    }
  };

  const handleRegeneratePlan = async () => {
    if (!confirm('Regenerating will rebuild proposed tasks based on initial parameters. Continue?')) return;
    setLoading(true);
    try {
      await apiClient.post(`/ai-planning/plans/${planId}/regenerate`);
      showToast('Plan regenerated successfully!', 'success');
      fetchPlanDetail();
      fetchCapabilityAnalysis();
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPlan = async () => {
    setIsApplying(true);
    const resolutions = Object.entries(skillResolutions).map(([skillName, obj]) => ({
      skill_name: skillName,
      action: obj.action,
      mapped_existing_skill_id: obj.mapped_id,
    }));

    try {
      const res = await apiClient.post<any>(`/ai-planning/plans/${planId}/apply`, {
        create_new_project: true,
        skill_resolutions: resolutions,
      });

      showToast(`Plan applied! Created ${res.created_tasks_count} tasks in project "${res.project_name}".`, 'success');
      setShowApplyModal(false);
      router.push(`/projects/${res.project_id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to apply plan', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  if (loading || !plan) {
    return (
      <AppShell>
        <div className="py-20 text-center space-y-4">
          <div className="inline-block w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400">Loading AI Project Plan details & analysis...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8 py-4 pb-28">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span>
              <h1 className="text-2xl font-bold text-white tracking-tight">{plan.project_name}</h1>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                  plan.status === 'APPLIED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : plan.status === 'APPROVED'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                }`}
              >
                {plan.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 line-clamp-2">{plan.project_description}</p>
            {plan.ai_provider && (
              <div className="flex items-center gap-2 mt-2 pt-2">
                <span className="text-xs text-gray-500">Planned by:</span>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${plan.ai_provider?.includes('heuristic') ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50' : 'bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-700/50'}`}>
                  {plan.ai_provider?.includes('fallback') ? '🧠 Rule-Based Heuristic (AI Fallback)' : plan.ai_provider?.includes('heuristic') ? '🧠 Rule-Based Heuristic' : '🤖 Generative AI'}
                </span>
                <span className="text-[10px] text-gray-500 font-mono bg-gray-900 px-1.5 py-0.5 rounded">
                  Model: {plan.ai_model || 'Unknown'}
                </span>
                <span className="text-[10px] text-gray-500 font-mono bg-gray-900 px-1.5 py-0.5 rounded">
                  Prompt: {plan.prompt_version || 'N/A'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRegeneratePlan}
              className="px-3.5 py-2 text-xs font-medium text-gray-300 bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors flex items-center gap-1.5"
            >
              🔄 Regenerate Plan
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 rounded-lg transition-colors flex items-center gap-1.5"
            >
              ➕ Add Task
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
          {[
            { id: 'TASKS', label: `📋 Tasks (${plan.tasks.length})` },
            { id: 'CAPABILITY', label: '👥 Team Capability' },
            { id: 'DEPENDENCIES', label: '🔗 Dependencies Graph' },
            { id: 'OVERVIEW', label: '📄 Executive Summary' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: TASKS & MODULES */}
        {activeTab === 'TASKS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Proposed Project Tasks</h2>
              <span className="text-xs text-gray-500">
                Total Estimated Effort: {plan.tasks.reduce((sum, t) => sum + Number(t.estimated_hours), 0)} Hours
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plan.tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-5 bg-gray-900/60 border border-gray-800 hover:border-purple-500/40 rounded-xl transition-all space-y-3 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-800 text-purple-300 rounded">
                        {task.module || 'General'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            task.priority === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-300'
                              : task.priority === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {task.priority}
                        </span>
                        {task.is_manually_added && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 rounded">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {task.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{task.description}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-800/80 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {task.required_skills.map((sk, idx) => (
                        <span key={formatSkillName(sk) || idx} className="px-2 py-0.5 text-[10px] bg-gray-950 text-gray-300 rounded border border-gray-800">
                          {formatSkillName(sk)}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-400">⏱️ {task.estimated_hours}h | Complexity: {task.complexity}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(task)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium"
                        >
                          ❌ Exclude
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: TEAM CAPABILITY ANALYSIS */}
        {activeTab === 'CAPABILITY' && capability && (
          <div className="space-y-8">
            {/* Capability Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase">Total Tasks</p>
                <p className="text-2xl font-bold text-white">{capability.total_generated_tasks}</p>
              </div>

              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                <p className="text-xs font-medium text-emerald-400 uppercase">🟢 Well Supported</p>
                <p className="text-2xl font-bold text-emerald-300">{capability.well_supported_count}</p>
                <p className="text-[11px] text-emerald-400/80">Skills & capacity exist</p>
              </div>

              <div className="p-4 bg-yellow-950/20 border border-yellow-500/30 rounded-xl space-y-1">
                <p className="text-xs font-medium text-yellow-400 uppercase">🟡 Capacity Risk</p>
                <p className="text-2xl font-bold text-yellow-300">{capability.capacity_risk_count}</p>
                <p className="text-[11px] text-yellow-400/80">Developers have high workload</p>
              </div>

              <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl space-y-1">
                <p className="text-xs font-medium text-red-400 uppercase">🔴 Skill Gap</p>
                <p className="text-2xl font-bold text-red-300">{capability.skill_gap_count}</p>
                <p className="text-[11px] text-red-400/80">Required skills missing in org</p>
              </div>
            </div>

            {/* Missing Skills & Overloaded Bottlenecks Alert */}
            {((capability.missing_skills?.length || 0) > 0 || (capability.resource_bottlenecks?.length || 0) > 0) && (
              <div className="p-5 bg-gradient-to-r from-red-950/30 via-orange-950/20 to-gray-900 border border-red-500/30 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                  <span>⚠️</span> Team Capability Insights & Warnings
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {(capability.missing_skills?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-red-300">Missing Required Skills in Team:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {capability.missing_skills.map((sk, idx) => (
                          <span key={formatSkillName(sk) || idx} className="px-2.5 py-1 bg-red-500/20 text-red-200 border border-red-500/30 rounded-md">
                            🔴 {formatSkillName(sk)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(capability.resource_bottlenecks?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-orange-300">Potential Resource Bottlenecks:</p>
                      <ul className="space-y-1">
                        {capability.resource_bottlenecks.map((b) => (
                          <li key={b.skill} className="text-orange-200">
                            • <strong className="text-white">{b.skill}</strong>: {b.task_count} tasks required, but only {b.developer_count} developer available.
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Task-by-Task Capability Breakdown */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Task Capability Coverage Breakdown</h3>
              <div className="divide-y divide-gray-800">
                {((capability.task_analyses || capability.task_capabilities || []) as TaskCapabilityItem[]).map((tc) => {
                  const statusClass = tc.status_classification || tc.category || 'WELL_SUPPORTED';
                  const taskTitle = tc.task_title || tc.title || 'Task Breakdown';
                  const notesReason = tc.reason || tc.notes || '';
                  const devCount = tc.matching_developers ? tc.matching_developers.length : (tc.matching_developers_count || 0);

                  return (
                    <div key={tc.task_id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              statusClass === 'WELL_SUPPORTED'
                                ? 'bg-emerald-400'
                                : statusClass === 'CAPACITY_RISK'
                                ? 'bg-yellow-400'
                                : 'bg-red-400'
                            }`}
                          />
                          <p className="text-xs font-semibold text-white">{taskTitle}</p>
                        </div>
                        <p className="text-[11px] text-gray-400">{notesReason}</p>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-right">
                          <span className="text-gray-400">Matching Developers: </span>
                          <strong className="text-white">{devCount}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEPENDENCIES GRAPH */}
        {activeTab === 'DEPENDENCIES' && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white">Task Dependency Structure</h2>
              <p className="text-xs text-gray-400 mt-1">
                Visual order of operations and task execution pipeline.
              </p>
            </div>

            <div className="space-y-4">
              {plan.tasks.map((task) => (
                <div key={task.id} className="p-4 bg-gray-950 border border-gray-800 rounded-lg flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">{task.title}</p>
                    <p className="text-[11px] text-gray-400">Module: {task.module || 'Core'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Depends on:</span>
                    {task.dependencies && task.dependencies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {task.dependencies.map((d) => (
                          <span key={d} className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                            ← {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-500 italic">None (Independent)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: EXECUTIVE SUMMARY */}
        {activeTab === 'OVERVIEW' && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-6">
            <h2 className="text-sm font-semibold text-white">Project Executive Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300">
              <div className="space-y-2">
                <p className="font-semibold text-purple-300">Business Objective</p>
                <p className="p-3 bg-gray-950 rounded-lg border border-gray-800">
                  {plan.summary_json?.business_objective || plan.project_description}
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-purple-300">Primary Users & Value</p>
                <p className="p-3 bg-gray-950 rounded-lg border border-gray-800">
                  {plan.summary_json?.primary_users || 'Internal Engineering Teams & Managers'}
                </p>
              </div>
            </div>

            {plan.summary_json?.modules && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-300">Identified System Modules</p>
                <div className="flex flex-wrap gap-2">
                  {plan.summary_json.modules.map((m) => (
                    <span key={m} className="px-3 py-1 bg-gray-950 text-gray-200 border border-gray-800 text-xs font-medium rounded-lg">
                      📦 {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STICKY ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 border-t border-gray-800 backdrop-blur-md py-4 px-8 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>Status: <strong className="text-white">{plan.status}</strong></span>
              <span>•</span>
              <span>Tasks: <strong className="text-white">{plan.tasks.length}</strong></span>
              {capability && capability.skill_gap_count > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-400 font-semibold">⚠️ {capability.skill_gap_count} Skill Gaps</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/ai-planning')}
                className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white"
              >
                Back to Planner
              </button>

              <button
                onClick={() => setShowApplyModal(true)}
                disabled={plan.status === 'APPLIED'}
                className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span>🚀</span> {plan.status === 'APPLIED' ? 'Plan Already Applied' : 'Approve & Create Tasks'}
              </button>
            </div>
          </div>
        </div>

        {/* EDIT TASK MODAL */}
        {editingTask && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4">
              <h2 className="text-base font-semibold text-white">Edit Task Details</h2>

              <form onSubmit={handleSaveEditTask} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-300 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 mb-1">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e: any) => setEditPriority(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1">Complexity</label>
                    <select
                      value={editComplexity}
                      onChange={(e: any) => setEditComplexity(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 mb-1">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={editHours}
                      onChange={(e) => setEditHours(parseFloat(e.target.value) || 1)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1">Required Skills (Comma separated)</label>
                    <input
                      type="text"
                      value={editSkillsInput}
                      onChange={(e) => setEditSkillsInput(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTask}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg"
                  >
                    {isSavingTask ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD MANUAL TASK MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4">
              <h2 className="text-base font-semibold text-white">Add Manual Task to Plan</h2>

              <form onSubmit={handleAddManualTask} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-300 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Load Testing & Security Audit"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1">Module</label>
                  <input
                    type="text"
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 mb-1">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e: any) => setNewPriority(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1">Complexity</label>
                    <select
                      value={newComplexity}
                      onChange={(e: any) => setNewComplexity(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-1">Required Skills (Comma separated)</label>
                  <input
                    type="text"
                    value={newSkillsInput}
                    onChange={(e) => setNewSkillsInput(e.target.value)}
                    placeholder="e.g. Python, Docker, PyTest"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* APPLY PLAN & SKILL RESOLUTION MODAL */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-xl w-full p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🚀</span> Confirm & Create Production Tasks
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Applying this plan will generate real tasks, trigger the Task Weight Engine, and calculate baseline-v2 recommendations.
                </p>
              </div>

              {capability && capability.missing_skills.length > 0 && (
                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800">
                  <p className="text-xs font-semibold text-amber-300">
                    Skill Resolution — {capability.missing_skills.length} skills do not exist in system:
                  </p>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {capability.missing_skills.map((sk, idx) => {
                      const sName = formatSkillName(sk);
                      return (
                        <div key={sName || idx} className="flex items-center justify-between text-xs gap-3 py-1 border-b border-gray-800/60">
                          <span className="font-semibold text-white">{sName}</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={skillResolutions[sName]?.action || 'CREATE_NEW'}
                              onChange={(e: any) =>
                                setSkillResolutions({
                                  ...skillResolutions,
                                  [sName]: { ...skillResolutions[sName], action: e.target.value },
                                })
                              }
                              className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1"
                            >
                            <option value="CREATE_NEW">Create Skill</option>
                            <option value="MAP_EXISTING">Map to Existing</option>
                            <option value="REMOVE">Remove Requirement</option>
                          </select>

                          {skillResolutions[sName]?.action === 'MAP_EXISTING' && (
                            <select
                              value={skillResolutions[sName]?.mapped_id || ''}
                              onChange={(e: any) =>
                                setSkillResolutions({
                                  ...skillResolutions,
                                  [sName]: { ...skillResolutions[sName], mapped_id: e.target.value },
                                })
                              }
                              className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1"
                            >
                              <option value="">Select Existing...</option>
                              {existingSkills.map((ex) => (
                                <option key={ex.id} value={ex.id}>
                                  {ex.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPlan}
                  disabled={isApplying}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/30"
                >
                  {isApplying ? 'Creating Tasks & Calculating Weights...' : 'Confirm & Apply Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
