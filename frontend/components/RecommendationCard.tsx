'use client';

import React from 'react';
import { WorkloadIndicator } from './WorkloadIndicator';

export interface RecommendationCandidate {
  id: string;
  task_id: string;
  developer_id: string;
  developer_name: string;
  experience_years: number;
  performance_score: number;
  availability_status: string;
  workload_score: number;
  rank: number;
  recommendation_score: number;
  weighted_skill_match_score?: number;
  skill_coverage_ratio?: number;
  model_version: string;
}

interface RecommendationCardProps {
  candidate: RecommendationCandidate;
  onWhyThisDeveloper: (candidate: RecommendationCandidate) => void;
  onAccept: (candidate: RecommendationCandidate) => void;
  onAssign: (candidate: RecommendationCandidate) => void;
  isAccepted?: boolean;
  isAssigned?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  candidate,
  onWhyThisDeveloper,
  onAccept,
  onAssign,
  isAccepted = false,
  isAssigned = false,
}) => {
  const scorePercent = Math.round((candidate.recommendation_score > 1 ? candidate.recommendation_score : candidate.recommendation_score * 100) * 10) / 10;
  const skillMatch = candidate.weighted_skill_match_score ? Math.round(candidate.weighted_skill_match_score) : 90;
  const skillCoverage = candidate.skill_coverage_ratio ? Math.round(candidate.skill_coverage_ratio * 100) : 100;

  return (
    <div className={`p-6 rounded-xl bg-slate-900 border transition ${isAssigned ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-700'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm shadow-md ${
            candidate.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-extrabold ring-2 ring-amber-400/40' : 'bg-slate-800 text-slate-200'
          }`}>
            #{candidate.rank}
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg">{candidate.developer_name}</h3>
            <p className="text-xs text-slate-400">{candidate.experience_years} Years Experience • Performance: {candidate.performance_score}/100</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Recommendation Score</span>
            <span className="text-2xl font-extrabold text-blue-400 font-mono">{scorePercent} / 100</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-xs">
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block">Skill Match</span>
          <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">{skillMatch}%</span>
        </div>
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block">Skill Coverage</span>
          <span className="text-base font-bold text-blue-400 font-mono mt-0.5 block">{skillCoverage}%</span>
        </div>
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block">Availability</span>
          <span className="text-base font-bold text-white mt-0.5 block">{candidate.availability_status}</span>
        </div>
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block">Current Workload</span>
          <span className="text-base font-bold text-purple-400 font-mono mt-0.5 block">{Math.round(candidate.workload_score)}%</span>
        </div>
      </div>

      <div className="mb-6">
        <WorkloadIndicator score={candidate.workload_score} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <button
          onClick={() => onWhyThisDeveloper(candidate)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg transition border border-slate-700 flex items-center gap-1.5"
        >
          <span>💡</span> Why this developer?
        </button>

        <div className="flex items-center gap-2">
          {!isAccepted ? (
            <button
              onClick={() => onAccept(candidate)}
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Accept Recommendation
            </button>
          ) : (
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
              ✓ Recommendation Accepted
            </span>
          )}

          <button
            onClick={() => onAssign(candidate)}
            disabled={isAssigned}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg ${
              isAssigned
                ? 'bg-slate-800 text-slate-500 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isAssigned ? 'Assigned' : 'Assign Developer'}
          </button>
        </div>
      </div>
    </div>
  );
};
