'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '../../components/AppShell';
import { RecommendationCard, RecommendationCandidate } from '../../components/RecommendationCard';
import { ExplanationModal } from '../../components/ExplanationModal';
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

  const handleAcceptRecommendation = async (candidate: RecommendationCandidate) => {
    try {
      const token = localStorage.getItem('devalign_token');
      const res = await fetch(`http://localhost:8000/api/recommendations/${candidate.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          decision: 'ACCEPTED',
          comments: 'Accepted recommendation via production UI',
        }),
      });

      if (res.ok) {
        setAcceptedIds((prev) => new Set(prev).add(candidate.id));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAssignDeveloper = async (candidate: RecommendationCandidate) => {
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
        }),
      });

      if (res.ok) {
        setAssignedIds((prev) => new Set(prev).add(candidate.id));
      } else {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to assign developer to task');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Developer Recommendation Engine</h1>
            <p className="text-slate-400 text-xs mt-1">Deterministic baseline developer ranking & allocation system (baseline-v1).</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-mono font-bold">
              Prod Engine: baseline-v1
            </span>
          </div>
        </div>

        {/* Task Selection Bar */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
          <label className="text-xs font-bold text-slate-300 shrink-0">Select Target Task:</label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 flex-1"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedTaskId && generateRecommendations(selectedTaskId)}
            disabled={recLoading || !selectedTaskId}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition shadow-lg shadow-blue-600/20 shrink-0"
          >
            {recLoading ? 'Ranking...' : 'FIND BEST DEVELOPER'}
          </button>
        </div>

        {loading || recLoading ? (
          <LoadingState message="Calculating baseline recommendation scores & workload suitability..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => selectedTaskId && generateRecommendations(selectedTaskId)} />
        ) : candidates.length === 0 ? (
          <EmptyState
            title="No Candidate Recommendations"
            description="Select an active task above to compute developer suitability rankings."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Ranked Developer Recommendations for: <span className="text-blue-400">{taskTitle}</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">{candidates.length} Candidates Evaluated</span>
            </div>

            <div className="space-y-4">
              {candidates.map((cand) => (
                <RecommendationCard
                  key={cand.id}
                  candidate={cand}
                  onWhyThisDeveloper={(c) => setExplanationCandidate(c)}
                  onAccept={(c) => handleAcceptRecommendation(c)}
                  onAssign={(c) => handleAssignDeveloper(c)}
                  isAccepted={acceptedIds.has(cand.id)}
                  isAssigned={assignedIds.has(cand.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Explanation Modal */}
        <ExplanationModal
          candidate={explanationCandidate}
          taskTitle={taskTitle}
          onClose={() => setExplanationCandidate(null)}
        />
      </div>
    </AppShell>
  );
}
