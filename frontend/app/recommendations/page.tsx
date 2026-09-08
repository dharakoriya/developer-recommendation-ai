'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '../../components/AppShell';
import { RecommendationCard, RecommendationCandidate } from '../../components/RecommendationCard';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useToast } from '../../context/ToastContext';

export interface TaskOption {
  id: string;
  title: string;
  project_name?: string;
  priority?: string;
  complexity?: string;
  estimated_hours?: number;
  task_weight_score?: number;
  task_weight_category?: string;
  required_skills?: { skill_name: string; required_level: number }[];
}

export default function RecommendationsPage() {
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get('task_id') || '';
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId);
  const [selectedTask, setSelectedTask] = useState<TaskOption | null>(null);

  const [eligibleCandidates, setEligibleCandidates] = useState<RecommendationCandidate[]>([]);
  const [excludedCandidates, setExcludedCandidates] = useState<RecommendationCandidate[]>([]);
  
  const [freshnessStatus, setFreshnessStatus] = useState<string>('FRESH');
  const [modelVersion, setModelVersion] = useState<string>('baseline-v2');

  const [loading, setLoading] = useState<boolean>(true);
  const [recLoading, setRecLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [explanationCandidate, setExplanationCandidate] = useState<RecommendationCandidate | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [showModelDetails, setShowModelDetails] = useState<boolean>(false);
  const [showExcluded, setShowExcluded] = useState<boolean>(true);

  useEffect(() => {
    fetchOpenTasks();
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      const found = tasks.find((t) => t.id === selectedTaskId) || null;
      setSelectedTask(found);
      generateRecommendations(selectedTaskId);
    }
  }, [selectedTaskId, tasks]);

  const fetchOpenTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch('http://localhost:8000/api/tasks', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to load tasks. Please sign in to access recommendations.');
      }
      const data: TaskOption[] = await res.json();
      setTasks(data);

      if (!selectedTaskId && data.length > 0) {
        setSelectedTaskId(data[0].id);
        setSelectedTask(data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async (taskId: string, forceRegenerate: boolean = false) => {
    setRecLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const url = `http://localhost:8000/api/recommendations/tasks/${taskId}${forceRegenerate ? '?regenerate=true' : ''}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to generate developer recommendations');
      }

      const resData = await res.json();
      setFreshnessStatus(resData.freshness_status || 'FRESH');
      setModelVersion(resData.model_version || 'baseline-v2');

      const mapCandidate = (r: any): RecommendationCandidate => ({
        id: r.id,
        task_id: r.task_id,
        developer_id: r.developer_id,
        developer_name: r.developer_name || 'Developer',
        developer_email: r.developer_email || '',
        experience_years: r.experience_years ?? 3,
        performance_score: r.performance_score ?? 85,
        availability_status: r.availability_status || 'AVAILABLE',
        workload_score: r.workload_score ?? 0,
        rank: r.rank,
        recommendation_score: r.score ?? 0,
        weighted_skill_match_score: (r.skill_coverage_ratio ?? 1.0) * 100,
        skill_coverage_ratio: r.skill_coverage_ratio ?? 1.0,
        model_version: r.model_version || 'baseline-v2',
        eligibility_status: r.eligibility_status || 'ELIGIBLE',
        exclusion_reasons: r.exclusion_reasons || [],
        task_weight_score: r.task_weight_score ?? 50,
        task_weight_category: r.task_weight_category || 'MODERATE',
        explanations: r.explanations || [],
      });

      setEligibleCandidates((resData.recommendations || []).map(mapCandidate));
      setExcludedCandidates((resData.excluded_recommendations || []).map(mapCandidate));

      if (forceRegenerate) {
        showToast('Fresh recommendations calculated for baseline-v2', 'info');
      }
    } catch (err: any) {
      setError(err.message);
      setEligibleCandidates([]);
      setExcludedCandidates([]);
      showToast(err.message, 'error');
    } finally {
      setRecLoading(false);
    }
  };

  const handleAccept = async (candidate: RecommendationCandidate) => {
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/recommendations/${candidate.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision: 'ACCEPTED', comment: 'Accepted by manager' }),
      });
      if (res.ok) {
        setAcceptedIds((prev) => new Set(prev).add(candidate.id));
        showToast(`Accepted recommendation for ${candidate.developer_name}`, 'success');
      }
    } catch (err) {
      showToast('Failed to record feedback', 'error');
    }
  };

  const handleAssign = async (candidate: RecommendationCandidate) => {
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch('http://localhost:8000/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          task_id: candidate.task_id,
          developer_id: candidate.developer_id,
          notes: `Assigned via baseline-v2 recommendation #${candidate.rank}`,
        }),
      });
      if (res.ok) {
        setAssignedIds((prev) => new Set(prev).add(candidate.id));
        showToast(`Task assigned to ${candidate.developer_name}!`, 'success');
        generateRecommendations(candidate.task_id, true);
      }
    } catch (err) {
      showToast('Failed to assign task', 'error');
    }
  };

  const topCandidate = eligibleCandidates.length > 0 ? eligibleCandidates[0] : null;

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Developer Recommendations 2.0</h1>
            <p className="text-slate-400 text-xs mt-1">
              Transparent, explainable recommendation engine combining skill match, capacity, performance & task weight compatibility.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl font-mono font-bold">
              deterministic_baseline ({modelVersion})
            </span>
          </div>
        </div>

        {/* Task Selection & Intelligence Header Bar */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="w-full sm:w-2/3">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Select Task for Compatibility Analysis
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.project_name || 'Project'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span
                className={`text-xs font-mono font-bold px-3 py-2 rounded-xl border ${
                  freshnessStatus === 'FRESH'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {freshnessStatus === 'FRESH' ? '🟢 FRESH' : '⚡ STALE'}
              </span>

              <button
                onClick={() => selectedTaskId && generateRecommendations(selectedTaskId, true)}
                disabled={recLoading || !selectedTaskId}
                className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
              >
                {recLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Calculating Compatibility...</span>
                  </>
                ) : (
                  <span>⚡ Force Regenerate baseline-v2</span>
                )}
              </button>
            </div>
          </div>

          {/* Task Intelligence Metadata Header */}
          {selectedTask && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Project</span>
                <span className="text-slate-200 font-bold font-mono truncate block">{selectedTask.project_name || 'Agile Core'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Priority</span>
                <span className="text-amber-400 font-bold font-mono">{selectedTask.priority || 'MEDIUM'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Complexity</span>
                <span className="text-purple-400 font-bold font-mono">{selectedTask.complexity || 'MEDIUM'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Task Weight</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {selectedTask.task_weight_score ?? 50} ({selectedTask.task_weight_category || 'MODERATE'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Est. Effort</span>
                <span className="text-cyan-400 font-bold font-mono">{selectedTask.estimated_hours ?? 8} Hours</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Required Skills</span>
                <span className="text-slate-200 font-bold font-mono">
                  {selectedTask.required_skills?.length ?? 0} Required
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 7-Factor Model Explanation Header */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/20 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-bold text-sm">🤖 DevAlign AI 2.0 Compatibility Factors</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">baseline-v2 formula</span>
            </div>
            <button
              onClick={() => setShowModelDetails(!showModelDetails)}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              {showModelDetails ? 'Hide Model Details ▲' : 'View Model Details ▼'}
            </button>
          </div>

          <p className="text-xs text-slate-300">
            Recommendations use a 7-factor transparent scoring formula (Skill Match 30%, Skill Coverage 15%, Workload & Anti-Monopoly 15%, Availability 10%, Experience 10%, Performance 10%, Task Weight Compatibility 10%). Research ML models remain strictly <strong>RESEARCH ONLY</strong>.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-purple-400 font-bold block">30%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Skill Match</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-blue-400 font-bold block">15%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Coverage</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-emerald-400 font-bold block">15%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Capacity & Anti-Monopoly</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-amber-400 font-bold block">10%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Availability</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-indigo-400 font-bold block">10%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Experience</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-cyan-400 font-bold block">10%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Performance</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-rose-400 font-bold block">10%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Task Weight</span>
            </div>
          </div>
        </div>

        {/* Results Showcase Section */}
        {loading ? (
          <LoadingState message="Loading task backlog directory..." />
        ) : recLoading ? (
          <LoadingState message="Evaluating developer candidate scores & workload capacity..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => selectedTaskId && generateRecommendations(selectedTaskId, true)} />
        ) : eligibleCandidates.length === 0 && excludedCandidates.length === 0 ? (
          <EmptyState
            title="No Candidate Recommendations Found"
            description="Select an active task above to calculate suitable candidate rankings."
          />
        ) : (
          <div className="space-y-6">
            {/* 🏆 BEST DEVELOPER MATCH HERO CARD */}
            {topCandidate && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/30 border border-purple-500/30 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-600/30">
                      🏆
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                          BEST DEVELOPER MATCH
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{topCandidate.experience_years} Yrs Exp</span>
                        {topCandidate.eligibility_status && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono font-extrabold">
                            {topCandidate.eligibility_status}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-extrabold text-white mt-1">{topCandidate.developer_name}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-mono">Compatibility Score</span>
                      <span className="text-3xl font-extrabold text-purple-400 font-mono">
                        {topCandidate.recommendation_score.toFixed(1)} <span className="text-sm text-slate-500 font-normal">/ 100</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleAssign(topCandidate)}
                      disabled={assignedIds.has(topCandidate.id)}
                      className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition shadow-lg ${
                        assignedIds.has(topCandidate.id)
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      }`}
                    >
                      {assignedIds.has(topCandidate.id) ? '✓ Assigned' : '🟢 Assign Recommended Developer'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs border-t border-purple-500/20 pt-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                    ✓ Strong Skill Match ({topCandidate.weighted_skill_match_score?.toFixed(0)}%)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                    ✓ Available Capacity ({100 - topCandidate.workload_score}% free)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                    ⭐ Performance: {topCandidate.performance_score}/100
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                    🎯 Task Weight Alignment
                  </span>
                  <button
                    onClick={() => setExplanationCandidate(topCandidate)}
                    className="ml-auto text-xs text-purple-400 hover:text-purple-300 font-bold underline"
                  >
                    View Score Breakdown →
                  </button>
                </div>
              </div>
            )}

            {/* Candidate Ranking List with Score Visualizers */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Eligible Candidate Rankings for <span className="text-white font-extrabold">{selectedTask?.title || 'Task'}</span>
              </h2>

              <div className="space-y-4">
                {eligibleCandidates.map((cand) => (
                  <RecommendationCard
                    key={cand.id}
                    candidate={cand}
                    onWhyThisDeveloper={(c) => setExplanationCandidate(c)}
                    onAccept={handleAccept}
                    onAssign={handleAssign}
                    isAccepted={acceptedIds.has(cand.id)}
                    isAssigned={assignedIds.has(cand.id)}
                  />
                ))}
              </div>
            </div>

            {/* Excluded Candidates Section ("Not Recommended") */}
            {excludedCandidates.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-rose-500/20 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-rose-300 flex items-center gap-2">
                      <span>🚫</span> Not Recommended Candidates ({excludedCandidates.length})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Candidates excluded due to hard eligibility rules (Missing Skills, High Workload, Unavailability)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowExcluded(!showExcluded)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    {showExcluded ? 'Hide Excluded ▲' : 'Show Excluded ▼'}
                  </button>
                </div>

                {showExcluded && (
                  <div className="space-y-3 pt-2">
                    {excludedCandidates.map((cand) => (
                      <RecommendationCard
                        key={cand.id}
                        candidate={cand}
                        onWhyThisDeveloper={(c) => setExplanationCandidate(c)}
                        onAccept={handleAccept}
                        onAssign={handleAssign}
                        isAccepted={acceptedIds.has(cand.id)}
                        isAssigned={assignedIds.has(cand.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Factor Score Breakdown Modal */}
        {explanationCandidate && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs text-purple-400 font-mono font-bold block">#{explanationCandidate.rank} CANDIDATE COMPATIBILITY BREAKDOWN</span>
                  <h3 className="text-lg font-extrabold text-white">{explanationCandidate.developer_name}</h3>
                </div>
                <button onClick={() => setExplanationCandidate(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Final Compatibility Score</span>
                  <span className="text-2xl font-extrabold text-purple-400 font-mono">
                    {explanationCandidate.recommendation_score.toFixed(1)} / 100
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-mono">Engine Version</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full font-mono font-bold inline-block">
                    {explanationCandidate.model_version}
                  </span>
                </div>
              </div>

              {explanationCandidate.exclusion_reasons && explanationCandidate.exclusion_reasons.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                  <span className="text-[11px] font-bold text-rose-300 uppercase block">Eligibility & Warning Flags</span>
                  {explanationCandidate.exclusion_reasons.map((r, idx) => (
                    <p key={idx} className="text-xs text-rose-200 font-medium">
                      {r}
                    </p>
                  ))}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">7-Factor Score Contributions</h4>
                {(explanationCandidate.explanations || []).map((exp: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{exp.feature_name}</span>
                      <span className="font-mono text-purple-400 font-bold">+{exp.contribution_score} pts</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Value: <strong className="text-slate-300">{exp.feature_value}</strong></span>
                      <span className={exp.direction === 'POSITIVE' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {exp.direction}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setExplanationCandidate(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition"
              >
                Close Score Breakdown
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
