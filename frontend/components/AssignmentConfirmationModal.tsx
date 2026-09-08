'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, ApiError } from '@/lib/api';

interface AssignmentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    estimated_hours: number;
    complexity?: string;
    priority?: string;
    task_weight_score?: number;
    task_weight_category?: string;
  };
  candidate: {
    developer_id: string;
    developer_name: string;
    developer_email?: string;
    workload_score?: number;
    score: number;
    rank: number;
    eligibility_status?: string;
    recommendation_id?: string;
  };
  onSuccess: (assignment: any) => void;
}

const OVERRIDE_REASONS = [
  'Client preference',
  'Domain knowledge',
  'Team familiarity',
  'Developer availability tomorrow',
  'Other',
];

export function AssignmentConfirmationModal({
  isOpen,
  onClose,
  task,
  candidate,
  onSuccess,
}: AssignmentConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentWorkload, setCurrentWorkload] = useState<number>(candidate.workload_score || 0);
  const [projectedWorkload, setProjectedWorkload] = useState<number>(0);
  const [selectionReason, setSelectionReason] = useState<string>('Recommended candidate selected');
  const [overrideReason, setOverrideReason] = useState<string>(OVERRIDE_REASONS[0]);
  const [customOverrideReason, setCustomOverrideReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requiresOverride, setRequiresOverride] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !candidate.developer_id) return;

    setErrorMsg(null);
    setLoading(true);

    apiClient
      .get<any>(`/workload`)
      .then((res: any) => {
        const devs = res.developers || [];
        const devItem = devs.find((d: any) => d.developer_id === candidate.developer_id);
        const curr = devItem ? Number(devItem.workload_score) : Number(candidate.workload_score || 0);
        setCurrentWorkload(curr);

        // Approximate workload impact
        const estHours = Number(task.estimated_hours || 10);
        const taskImpact = Math.round((estHours / 40.0) * 100);
        const proj = Math.round((curr + taskImpact) * 10) / 10;
        setProjectedWorkload(proj);
        setRequiresOverride(proj > 100.0 || candidate.rank > 1);
      })
      .catch(() => {
        setCurrentWorkload(Number(candidate.workload_score || 0));
        setProjectedWorkload(Number(candidate.workload_score || 0) + 25);
      })
      .finally(() => setLoading(false));
  }, [isOpen, candidate.developer_id, candidate.workload_score, candidate.rank, task.estimated_hours]);

  if (!isOpen) return null;

  const handleConfirmAssignment = async () => {
    setLoading(true);
    setErrorMsg(null);

    const isOverloaded = projectedWorkload > 100.0;
    const isOverride = isOverloaded || candidate.rank > 1;
    const finalOverrideReason =
      overrideReason === 'Other' && customOverrideReason.trim()
        ? customOverrideReason.trim()
        : overrideReason;

    try {
      const payload = {
        task_id: task.id,
        developer_id: candidate.developer_id,
        recommendation_id: candidate.recommendation_id,
        selection_reason: selectionReason,
        override_reason: isOverride ? finalOverrideReason : undefined,
        force_override: isOverloaded,
        notes: `Assigned via Recommendation Candidate Rank #${candidate.rank}`,
      };

      const result = await apiClient.post<any>('/recommendations/assign', payload);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError && err.data?.requires_override) {
        setRequiresOverride(true);
        setErrorMsg(err.data.message || 'Workload exceeds 100% capacity limit. Manager Override reason required.');
      } else {
        setErrorMsg(err.message || 'Failed to create assignment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (val: number) => {
    if (val <= 70) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 Healthy ({val}%)</span>;
    if (val <= 85) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">🟡 Moderate ({val}%)</span>;
    if (val <= 100) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">🟠 High Risk ({val}%)</span>;
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">🔴 Overloaded ({val}%)</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Assign Developer</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Rank #{candidate.rank}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Confirm task assignment & workload safety</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Details Summary Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60">
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1">Developer</span>
              <span className="text-sm font-semibold text-white block truncate">{candidate.developer_name}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1">Task</span>
              <span className="text-sm font-semibold text-white block truncate">{task.title}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1">Compatibility Score</span>
              <span className="text-sm font-bold text-indigo-400">{Math.round(candidate.score)}% Match</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1">Task Weight</span>
              <span className="text-sm font-bold text-amber-400">
                {task.task_weight_category || 'HEAVY'} ({task.task_weight_score || 50}/100)
              </span>
            </div>
          </div>

          {/* Workload Impact Indicator */}
          <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-400">Current Workload</span>
              <span className="text-slate-300 font-semibold">{currentWorkload}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, currentWorkload)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-medium pt-2">
              <span className="text-slate-400">Projected Workload</span>
              <div className="flex items-center gap-2">{getRiskBadge(projectedWorkload)}</div>
            </div>
          </div>

          {/* Selection Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Assignment Note / Reason</label>
            <input
              type="text"
              value={selectionReason}
              onChange={(e) => setSelectionReason(e.target.value)}
              placeholder="E.g. Selected highest compatibility candidate"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Manager Override Reason Section */}
          {(requiresOverride || candidate.rank > 1 || projectedWorkload > 100) && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <span>🛡️ Manager Override Required</span>
              </div>
              <p className="text-xs text-slate-300">
                {projectedWorkload > 100
                  ? 'Projected workload exceeds 100% capacity. Select an explicit override reason to record in the recommendation audit log.'
                  : 'You are selecting a developer other than the top-ranked recommendation (#1). Please specify an override reason.'}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Select Override Reason</label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {OVERRIDE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {overrideReason === 'Other' && (
                <input
                  type="text"
                  value={customOverrideReason}
                  onChange={(e) => setCustomOverrideReason(e.target.value)}
                  placeholder="Specify custom override justification..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmAssignment}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>Assigning...</span>
              </>
            ) : (
              <span>Confirm Assignment</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
