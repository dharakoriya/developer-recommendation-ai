'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/AppShell';
import { StatCard } from '../../../components/StatCard';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';

export interface ClassDistributionData {
  total_observations: number;
  unlabeled_count: number;
  weak_labeled_count: number;
  validated_labeled_count: number;
  validated_positive_count: number;
  validated_negative_count: number;
  rejected_count: number;
  ambiguous_count: number;
  class_imbalance_ratio: number;
}

export interface DataQualityReportData {
  missing_feature_values_count: number;
  duplicate_candidate_pairs_count: number;
  invalid_feature_ranges_count: number;
  temporal_leakage_flags: number;
  invalid_lifecycle_transitions_count: number;
  overall_data_quality_status: string;
  data_quality_score_percentage: number;
}

export interface MultiCriteriaReadinessCheck {
  criterion: string;
  required_condition: string;
  actual_value: string;
  is_passed: boolean;
}

export interface RealworldTrainingReadinessData {
  readiness_status: 'NOT_READY' | 'REVIEW_REQUIRED' | 'READY_FOR_EXPERIMENT';
  readiness_summary?: string;
  readiness_checks?: MultiCriteriaReadinessCheck[];
  validated_labels_count: number;
  required_validated_labels?: number;
  validated_positive_count?: number;
  validated_negative_count?: number;
  temporal_leakage_passed?: boolean;
}

export default function ResearchDatasetPage() {
  const [dist, setDist] = useState<ClassDistributionData | null>(null);
  const [quality, setQuality] = useState<DataQualityReportData | null>(null);
  const [readiness, setReadiness] = useState<RealworldTrainingReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasetData();
  }, []);

  const fetchDatasetData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const sRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/statistics', { headers });
      if (sRes.ok) setDist(await sRes.json());

      const qRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/quality', { headers });
      if (qRes.ok) setQuality(await qRes.json());

      const rRes = await fetch('http://localhost:8000/api/recommendations/research/dataset/readiness', { headers });
      if (rRes.ok) setReadiness(await rRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status="RESEARCH" type="environment" />
              <span className="text-xs text-purple-600 dark:text-purple-400 font-mono font-bold">REAL-WORLD DATASET & GROUND-TRUTH PIPELINE</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Research Dataset & Label Validation</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Observational feature snapshots, ground-truth label validation, and data quality audits.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading research dataset metrics & readiness assessment..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDatasetData} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Observations" value={dist?.total_observations ?? 0} subtext={`${dist?.weak_labeled_count ?? 0} weak labels proposed`} icon="📊" accentColor="blue" />
              <StatCard title="Human Validated" value={dist?.validated_labeled_count ?? 0} subtext={`${dist?.validated_positive_count ?? 0} Pos / ${dist?.validated_negative_count ?? 0} Neg`} icon="✅" accentColor="emerald" />
              <StatCard title="Quality Score" value={`${quality?.data_quality_score_percentage ?? 100}%`} subtext={`Status: ${quality?.overall_data_quality_status ?? 'PASS'}`} icon="🛡️" accentColor="purple" />
              <StatCard title="Training Readiness" value={readiness?.readiness_status || 'NOT_READY'} subtext={`${readiness?.validated_labels_count ?? 0} / ${readiness?.required_validated_labels ?? 200} validated labels`} icon="⚡" accentColor="amber" />
            </div>

            {/* Readiness Reasons / Multi-Criteria Checks */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Multi-Criteria Training Readiness Assessment</h3>
                {readiness?.readiness_summary && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{readiness.readiness_summary}</span>
                )}
              </div>
              <div className="space-y-2 text-xs">
                {(readiness?.readiness_checks || []).map((check, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-slate-900 dark:text-slate-200 font-bold block">{check.criterion}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">{check.required_condition} (Actual: {check.actual_value})</span>
                    </div>
                    <StatusBadge status={check.is_passed ? 'PASSED' : 'NOT_READY'} type="workload_status" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
