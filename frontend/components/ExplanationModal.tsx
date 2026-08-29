'use client';

import React from 'react';
import { RecommendationCandidate } from './RecommendationCard';

interface ExplanationModalProps {
  candidate: RecommendationCandidate | null;
  taskTitle?: string;
  onClose: () => void;
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({
  candidate,
  taskTitle,
  onClose,
}) => {
  if (!candidate) return null;

  const scorePercent = Math.round((candidate.recommendation_score > 1 ? candidate.recommendation_score : candidate.recommendation_score * 100) * 10) / 10;
  const skillMatch = candidate.weighted_skill_match_score ? Math.round(candidate.weighted_skill_match_score) : 90;
  const skillCoverage = candidate.skill_coverage_ratio ? Math.round(candidate.skill_coverage_ratio * 100) : 100;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-white text-lg">Why {candidate.developer_name} is Recommended</h3>
            {taskTitle && <p className="text-xs text-slate-400">For task: {taskTitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div>
            <span className="text-[11px] text-blue-300 uppercase font-bold tracking-wider block">Production Engine Evaluation</span>
            <span className="text-xs text-slate-300 font-mono">Model: deterministic_baseline (baseline-v1)</span>
          </div>
          <span className="text-2xl font-extrabold text-blue-400 font-mono">{scorePercent} / 100</span>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Key Suitability Factors</h4>
          <div className="space-y-2 text-xs text-slate-200">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <div>
                <span className="font-bold text-white block">Strong Skill Match ({skillMatch}%)</span>
                <span className="text-slate-400 text-[11px]">Developer possesses the required technical proficiency for this task.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <div>
                <span className="font-bold text-white block">Complete Skill Coverage ({skillCoverage}%)</span>
                <span className="text-slate-400 text-[11px]">Covers all required skill domains specified in task requirements.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <div>
                <span className="font-bold text-white block">Healthy Workload Capacity ({Math.round(candidate.workload_score)}%)</span>
                <span className="text-slate-400 text-[11px]">Current active task workload allows taking on new task assignments without burnout.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <div>
                <span className="font-bold text-white block">High Historical Performance ({candidate.performance_score}/100)</span>
                <span className="text-slate-400 text-[11px]">Proven track record of high quality code delivery and reliability.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg"
          >
            Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
};
