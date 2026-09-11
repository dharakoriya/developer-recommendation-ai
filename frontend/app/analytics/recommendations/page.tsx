'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/AppShell';
import { AnalyticsNav } from '../../../components/AnalyticsNav';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';
import { MetricCard } from '../../../components/MetricCard';
import { StatusBadge } from '../../../components/StatusBadge';
import { apiClient, ApiError } from '../../../lib/api';

export interface RecommendationEffectivenessData {
  recommendations_generated: number;
  recommendations_accepted: number;
  recommendations_rejected: number;
  assignments_created: number;
  tasks_completed: number;
  acceptance_rate: number;
  assignment_conversion_rate: number;
  completion_conversion_rate: number;
  has_sufficient_data: boolean;
  message: string;
}

export default function RecommendationEffectivenessPage() {
  const [data, setData] = useState<RecommendationEffectivenessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendationData();
  }, []);

  const fetchRecommendationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<RecommendationEffectivenessData>('/analytics/recommendations');
      setData(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to calculate recommendation conversion funnel metrics.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status="PRODUCTION" type="environment" />
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">RECOMMENDATION ENGINE LIFECYCLE</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Recommendation Effectiveness & Conversion Funnel</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Measuring the real-world utility and adoption funnel of AI developer recommendations from generation to completion.</p>
          </div>
          <AnalyticsNav />
        </div>

        {loading ? (
          <LoadingState message="Calculating recommendation conversion funnel metrics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchRecommendationData} />
        ) : !data ? null : (
          <>
            {/* Top Conversion Rates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                title="Acceptance Rate"
                value={`${data.acceptance_rate}%`}
                subtitle={`${data.recommendations_accepted} / ${data.recommendations_generated} Accepted`}
                accentColor="emerald"
              />
              <MetricCard
                title="Assignment Conversion"
                value={`${data.assignment_conversion_rate}%`}
                subtitle={`${data.assignments_created} Assignments Created`}
                accentColor="indigo"
              />
              <MetricCard
                title="Completion Conversion"
                value={`${data.completion_conversion_rate}%`}
                subtitle={`${data.tasks_completed} Tasks Completed`}
                accentColor="purple"
              />
            </div>

            {/* Recommendation Funnel Visualization */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recommendation Conversion Funnel</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Step-by-step conversion pipeline from AI recommendation to verified code delivery.</p>
                </div>
                {!data.has_sufficient_data && (
                  <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    ⚠️ Insufficient Historical Data
                  </span>
                )}
              </div>

              {/* Funnel Steps Visual */}
              <div className="space-y-4 max-w-3xl mx-auto py-4">
                {/* Step 1: Recommended */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>1. RECOMMENDATIONS GENERATED</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{data.recommendations_generated}</span>
                  </div>
                  <div className="w-full h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 p-1 flex items-center justify-center">
                    <span className="text-xs font-bold font-mono text-indigo-700 dark:text-indigo-300">100% — BASE RECOMMENDATIONS</span>
                  </div>
                </div>

                {/* Down Arrow */}
                <div className="flex justify-center text-slate-400 dark:text-slate-500 text-sm">↓</div>

                {/* Step 2: Accepted */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>2. REVIEWER ACCEPTED</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{data.recommendations_accepted}</span>
                  </div>
                  <div
                    className="mx-auto h-10 rounded-xl bg-emerald-600/15 border border-emerald-500/30 p-1 flex items-center justify-center transition-all"
                    style={{ width: `${Math.max(30, data.acceptance_rate)}%` }}
                  >
                    <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300">{data.acceptance_rate}% ACCEPTANCE</span>
                  </div>
                </div>

                {/* Down Arrow */}
                <div className="flex justify-center text-slate-400 dark:text-slate-500 text-sm">↓</div>

                {/* Step 3: Assigned */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>3. TASK ASSIGNMENTS CREATED</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{data.assignments_created}</span>
                  </div>
                  <div
                    className="mx-auto h-10 rounded-xl bg-purple-600/15 border border-purple-500/30 p-1 flex items-center justify-center transition-all"
                    style={{ width: `${Math.max(25, data.assignment_conversion_rate)}%` }}
                  >
                    <span className="text-xs font-bold font-mono text-purple-700 dark:text-purple-300">{data.assignment_conversion_rate}% CONVERTED TO ASSIGNMENT</span>
                  </div>
                </div>

                {/* Down Arrow */}
                <div className="flex justify-center text-slate-400 dark:text-slate-500 text-sm">↓</div>

                {/* Step 4: Completed */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>4. TASKS SUCCESSFULLY DELIVERED</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{data.tasks_completed}</span>
                  </div>
                  <div
                    className="mx-auto h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 p-1 flex items-center justify-center transition-all"
                    style={{ width: `${Math.max(20, data.completion_conversion_rate)}%` }}
                  >
                    <span className="text-xs font-bold font-mono text-blue-700 dark:text-blue-300">{data.completion_conversion_rate}% COMPLETED</span>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span>ℹ️</span>
                <span>{data.message}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
