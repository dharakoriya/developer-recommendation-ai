'use client';

import React from 'react';
import { RiskBadge, RiskLevel } from './RiskBadge';

export interface RiskDriver {
  category: string;
  severity: string;
  reason: string;
  task_title?: string;
}

export interface RiskBreakdownItem {
  score: number;
  level: RiskLevel;
}

export interface RiskData {
  overall_risk_level: RiskLevel;
  overall_risk_score: number;
  drivers?: RiskDriver[];
  top_drivers?: RiskDriver[];
  risk_breakdown?: {
    schedule_risk?: RiskBreakdownItem;
    workload_risk?: RiskBreakdownItem;
    skill_gap_risk?: RiskBreakdownItem;
    complexity_risk?: RiskBreakdownItem;
  };
  recommended_action?: string;
  explanation?: string;
}

interface RiskCardProps {
  data: RiskData;
  title?: string;
}

export function RiskCard({ data, title = 'Risk Assessment & Decision Support' }: RiskCardProps) {
  const drivers = data.drivers || data.top_drivers || [];
  const breakdown = data.risk_breakdown;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{title}</h3>
        </div>
        <RiskBadge level={data.overall_risk_level} score={data.overall_risk_score} showScore />
      </div>

      {/* Explanation */}
      {data.explanation && (
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
          {data.explanation}
        </p>
      )}

      {/* Breakdown Grid if available */}
      {breakdown && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {Object.entries(breakdown).map(([key, item]) => {
            const label = key.replace('_risk', '').replace('_', ' ').toUpperCase();
            return (
              <div
                key={key}
                className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 p-2.5 rounded-xl text-center"
              >
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  {label}
                </span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">
                  {item.score.toFixed(0)} / 100
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Key Drivers */}
      {drivers.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Primary Risk Drivers
          </h4>
          <ul className="space-y-1.5">
            {drivers.map((d, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/50"
              >
                <span className="text-rose-500 font-bold text-xs mt-0.5">•</span>
                <div>
                  {d.task_title && (
                    <span className="font-bold text-slate-900 dark:text-white text-xs block">
                      [{d.task_title}]
                    </span>
                  )}
                  <span>{d.reason}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Action */}
      {data.recommended_action && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 flex items-start gap-2.5">
          <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">💡</span>
          <div>
            <span className="text-[11px] font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wider block">
              Recommended Manager Action
            </span>
            <span className="text-xs text-purple-800 dark:text-purple-300 font-medium">
              {data.recommended_action}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
