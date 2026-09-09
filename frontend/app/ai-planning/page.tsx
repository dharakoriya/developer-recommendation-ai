'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../components/AppShell';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../lib/api';

export interface AIPlanDraft {
  id: string;
  project_name: string;
  project_description: string;
  project_type: string;
  granularity: string;
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  created_at: string;
  tasks_count: number;
  creator_name?: string;
}

export interface AIProviderInfo {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  is_selected?: boolean;
  description: string;
}

export default function AIPlanningWizardPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [existingPlans, setExistingPlans] = useState<AIPlanDraft[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [businessObjective, setBusinessObjective] = useState('');
  const [targetUsers, setTargetUsers] = useState('');

  const [functionalRequirements, setFunctionalRequirements] = useState('');
  const [technicalRequirements, setTechnicalRequirements] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [deadline, setDeadline] = useState('');

  const [granularity, setGranularity] = useState<'HIGH_LEVEL' | 'BALANCED' | 'DETAILED'>('BALANCED');
  const [preferredTeamSize, setPreferredTeamSize] = useState<number>(5);
  const [projectType, setProjectType] = useState<'WEB_APP' | 'MOBILE_APP' | 'AI_ML_SYSTEM' | 'ENTERPRISE_SOFTWARE' | 'ECOMMERCE' | 'OTHER'>('WEB_APP');

  useEffect(() => {
    fetchExistingPlans();
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const data = await apiClient.get<AIProviderInfo[]>('/ai-planning/providers');
      setProviders(data || []);
    } catch (err: any) {
      console.error('Failed to fetch AI providers:', err);
    }
  };

  const fetchExistingPlans = async () => {
    setPlansLoading(true);
    try {
      const data = await apiClient.get<AIPlanDraft[]>('/ai-planning/plans');
      setExistingPlans(data || []);
    } catch (err: any) {
      console.error('Failed to fetch plan drafts:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectDescription.trim()) {
      showToast('Project Name and Description are required', 'error');
      return;
    }

    setLoading(true);
    setLoadingStep('Analyzing Project Requirements...');

    const techStack = techStackInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload = {
      project_name: projectName.trim(),
      project_description: projectDescription.trim(),
      business_objective: businessObjective.trim() || undefined,
      target_users: targetUsers.trim() || undefined,
      functional_requirements: functionalRequirements.trim() || undefined,
      technical_requirements: technicalRequirements.trim() || undefined,
      technology_stack: techStack.length > 0 ? techStack : undefined,
      deadline: deadline || undefined,
      granularity,
      preferred_team_size: preferredTeamSize,
      project_type: projectType,
    };

    try {
      setTimeout(() => setLoadingStep('Identifying System Modules...'), 700);
      setTimeout(() => setLoadingStep('Decomposing Tasks & Estimating Hours...'), 1400);
      setTimeout(() => setLoadingStep('Analyzing Team Capability & Skill Gaps...'), 2100);

      const res = await apiClient.post<any>('/ai-planning/plans', payload);
      showToast('AI Project Plan generated successfully!', 'success');
      router.push(`/ai-planning/${res.id}`);
    } catch (err: any) {
      showToast(err.message || 'AI Service temporarily unavailable', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-10 py-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">AI Project Planner</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                Linear + Notion Hybrid
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Turn natural language requirements into structured delivery plans, module breakdowns, effort estimates, and capability analysis.
            </p>
          </div>
          <Link
            href="/projects"
            className="px-3.5 py-2 text-xs font-medium text-gray-300 bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors text-center"
          >
            View Existing Projects
          </Link>
        </div>

        {/* Main Grid: Left Wizard Input, Right Plan Preview & Recent Drafts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Wizard Form (7 cols) */}
          <div className="lg:col-span-7 bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-6">
            {/* Step Indicators */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              {[
                { s: 1, label: '1. Basic Info' },
                { s: 2, label: '2. Requirements' },
                { s: 3, label: '3. Preferences' },
              ].map((st) => (
                <button
                  key={st.s}
                  type="button"
                  onClick={() => setStep(st.s as any)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                    step === st.s
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-gray-200 bg-gray-950/40'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-16 text-center space-y-4">
                <div className="inline-block w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-purple-300 animate-pulse">{loadingStep}</p>
                  <p className="text-xs text-gray-400">Synthesizing structure and validating dependencies...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGeneratePlan} className="space-y-5">
                {/* STEP 1: Basic Information */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Project Name *</label>
                      <input
                        type="text"
                        required
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g. Real-Time Analytics Pipeline"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Project Description *</label>
                      <textarea
                        rows={3}
                        required
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        placeholder="Describe the system scope, architecture, core features, or technical goals..."
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Business Objective (Optional)</label>
                      <input
                        type="text"
                        value={businessObjective}
                        onChange={(e) => setBusinessObjective(e.target.value)}
                        placeholder="e.g. Reduce latency under 100ms for high-frequency trading data"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Target Users (Optional)</label>
                      <input
                        type="text"
                        value={targetUsers}
                        onChange={(e) => setTargetUsers(e.target.value)}
                        placeholder="e.g. Enterprise Financial Analysts, Internal Risk Operations"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                      >
                        Next: Requirements →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Requirements */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Functional Requirements</label>
                      <textarea
                        rows={3}
                        value={functionalRequirements}
                        onChange={(e) => setFunctionalRequirements(e.target.value)}
                        placeholder="e.g. User auth, WebSocket stream, CSV export, role-based dashboards..."
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Technical Requirements</label>
                      <textarea
                        rows={3}
                        value={technicalRequirements}
                        onChange={(e) => setTechnicalRequirements(e.target.value)}
                        placeholder="e.g. PostgreSQL DB, Redis cache, Dockerized deployment, OAuth2 JWT..."
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Technology Stack (Comma Separated)</label>
                        <input
                          type="text"
                          value={techStackInput}
                          onChange={(e) => setTechStackInput(e.target.value)}
                          placeholder="e.g. Python, FastAPI, Next.js, PostgreSQL"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Target Deadline (Optional)</label>
                        <input
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                      >
                        Next: Preferences →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Planning Preferences */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-2">Project Type</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { id: 'WEB_APP', label: '🌐 Web App' },
                          { id: 'MOBILE_APP', label: '📱 Mobile App' },
                          { id: 'AI_ML_SYSTEM', label: '🤖 AI / ML System' },
                          { id: 'ENTERPRISE_SOFTWARE', label: '🏢 Enterprise' },
                          { id: 'ECOMMERCE', label: '🛒 E-Commerce' },
                          { id: 'OTHER', label: '⚙️ Other' },
                        ].map((pt) => (
                          <button
                            key={pt.id}
                            type="button"
                            onClick={() => setProjectType(pt.id as any)}
                            className={`p-2.5 text-xs font-medium rounded-lg border transition-all ${
                              projectType === pt.id
                                ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                            }`}
                          >
                            {pt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-2">Task Granularity</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'HIGH_LEVEL', title: 'High-Level', desc: '4-6 coarse modules & epics' },
                          { id: 'BALANCED', title: 'Balanced', desc: '8-12 actionable tasks & specs' },
                          { id: 'DETAILED', title: 'Detailed', desc: '14+ granular subtasks & setup' },
                        ].map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGranularity(g.id as any)}
                            className={`p-3 text-left rounded-lg border transition-all ${
                              granularity === g.id
                                ? 'bg-purple-600/30 border-purple-500 text-white'
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                            }`}
                          >
                            <p className="text-xs font-semibold">{g.title}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{g.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Preferred Team Size</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={preferredTeamSize}
                        onChange={(e) => setPreferredTeamSize(parseInt(e.target.value) || 5)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-gray-800">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <span>✨</span> Generate AI Project Plan
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Right Side: AI Planning Information & Recent Drafts (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live AI Planning Preview Card */}
            <div className="p-5 bg-gradient-to-br from-gray-900/90 to-purple-950/20 border border-gray-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">🤖</span>
                  <h2 className="text-sm font-semibold text-white">AI Planning Preview</h2>
                </div>
                {providers.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-800 text-gray-300 rounded border border-gray-700">
                    {providers.find(p => p.is_selected && p.is_active)?.name || providers.find(p => p.is_active)?.name || 'No Active Provider'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                When generated, DevAlign AI will analyze your specifications and produce:
              </p>
              <ul className="text-xs space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Executive Summary & Core Value Proposition
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Modular System Architecture Decomposition
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Estimated Task Hours, Complexity & Priorities
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Skill Gap & Resource Bottleneck Analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Dependency Cycle Validation
                </li>
              </ul>
            </div>

            {/* Recent Drafts Section */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Recent Plan Drafts</h2>
                <span className="text-[11px] text-gray-500">{existingPlans.length} plans</span>
              </div>

              {plansLoading ? (
                <div className="py-6 text-center text-xs text-gray-500">Loading plan drafts...</div>
              ) : existingPlans.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">No project plan drafts generated yet.</div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {existingPlans.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/ai-planning/${p.id}`)}
                      className="group cursor-pointer p-3 bg-gray-950 border border-gray-800/80 hover:border-purple-500/40 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-gray-200 group-hover:text-purple-300 transition-colors">
                            {p.project_name}
                          </p>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              p.status === 'APPLIED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : p.status === 'APPROVED'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 line-clamp-1">{p.project_description}</p>
                      </div>
                      <span className="text-xs text-gray-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
