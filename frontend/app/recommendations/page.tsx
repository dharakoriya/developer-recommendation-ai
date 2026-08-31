'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '../../components/AppShell';
import { RecommendationCard, RecommendationCandidate } from '../../components/RecommendationCard';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

export interface TaskOption {
  id: string;
  title: string;
  project_name?: string;
}

export default function RecommendationsPage() {
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get('task_id') || '';

  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId);
  const [candidates, setCandidates] = useState<RecommendationCandidate[]>([]);
  const [taskTitle, setTaskTitle] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [recLoading, setRecLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [explanationCandidate, setExplanationCandidate] = useState<RecommendationCandidate | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOpenTasks();
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      generateRecommendations(selectedTaskId);
    }
  }, [selectedTaskId]);

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
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async (taskId: string, forceRegenerate: boolean = true) => {
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
      setTaskTitle(resData.task_title || 'Selected Task');
      
      const mappedCandidates: RecommendationCandidate[] = (resData.recommendations || []).map((r: any) => ({
        id: r.id,
        task_id: r.task_id,
        developer_id: r.developer_id,
        developer_name: r.developer_name || 'Developer',
        experience_years: r.experience_years ?? 3,
        performance_score: r.performance_score ?? 85,
        availability_status: r.availability_status || 'AVAILABLE',
        workload_score: r.workload_score ?? 0,
        rank: r.rank,
        recommendation_score: r.score ?? 0,
        weighted_skill_match_score: (r.skill_coverage_ratio ?? 1.0) * 100,
        skill_coverage_ratio: r.skill_coverage_ratio ?? 1.0,
        model_version: r.model_version || 'baseline-v1',
        explanations: r.explanations || [],
      }));

      setCandidates(mappedCandidates);
    } catch (err: any) {
      setError(err.message);
      setCandidates([]);
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
      }
    } catch (err) {
      console.error('Feedback error:', err);
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
          notes: `Assigned via baseline recommendation #${candidate.rank}`,
        }),
      });
      if (res.ok) {
        setAssignedIds((prev) => new Set(prev).add(candidate.id));
        // Refresh recommendations to reflect updated workload
        generateRecommendations(candidate.task_id, true);
      }
    } catch (err) {
      console.error('Assignment error:', err);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Developer Recommendations</h1>
            <p className="text-slate-400 text-xs mt-1">
              Transparent, explainable baseline recommendation engine for task assignment.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg font-mono font-bold">
              deterministic_baseline (baseline-v1)
            </span>
          </div>
        </div>

        {/* Task Selection Bar */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="w-full sm:w-2/3">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Select Task for Candidate Analysis
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

          <button
            onClick={() => selectedTaskId && generateRecommendations(selectedTaskId, true)}
            disabled={recLoading || !selectedTaskId}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
          >
            {recLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Evaluating Candidates...</span>
              </>
            ) : (
              <span>⚡ Find Best Developer</span>
            )}
          </button>
        </div>

        {/* Decision Flow Explanation Component */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-purple-500/20 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold text-sm">💡 How Developer Recommendations Work</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">baseline-v1 formula</span>
          </div>
          <p className="text-xs text-slate-300">
            The active recommendation engine uses a transparent, deterministic weighted scoring model based on 6 core factors:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-purple-400 font-bold block">35%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Skill Match</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-blue-400 font-bold block">15%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Skill Coverage</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-emerald-400 font-bold block">20%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Workload Capacity</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-amber-400 font-bold block">15%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Performance</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-indigo-400 font-bold block">10%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Experience</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-rose-400 font-bold block">5%</span>
              <span className="text-slate-300 font-medium block text-[11px]">Availability</span>
            </div>
          </div>
        </div>

        {/* Results List */}
        {loading ? (
          <LoadingState message="Loading task catalog..." />
        ) : recLoading ? (
          <LoadingState message="Evaluating developer candidate scores & workload capacity..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => selectedTaskId && generateRecommendations(selectedTaskId, true)} />
        ) : candidates.length === 0 ? (
          <EmptyState
            title="No Candidate Recommendations"
            description="Select an active task above to calculate suitable candidate rankings."
          />
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Ranked Candidates for <span className="text-white font-extrabold">{taskTitle}</span>
            </h2>

            <div className="space-y-4">
              {candidates.map((cand) => (
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
        )}

        {/* Score Breakdown Modal */}
        {explanationCandidate && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs text-purple-400 font-mono font-bold block">#{explanationCandidate.rank} CANDIDATE BREAKDOWN</span>
                  <h3 className="text-lg font-extrabold text-white">{explanationCandidate.developer_name}</h3>
                </div>
                <button onClick={() => setExplanationCandidate(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Total Recommendation Score</span>
                  <span className="text-2xl font-extrabold text-purple-400 font-mono">
                    {explanationCandidate.recommendation_score.toFixed(1)} / 100
                  </span>
                </div>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full font-mono font-bold">
                  {explanationCandidate.model_version}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Score Component Contributions</h4>
                {(explanationCandidate.explanations || []).map((exp: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
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
