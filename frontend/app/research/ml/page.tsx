'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../../components/AppShell';
import { StatCard } from '../../../components/StatCard';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';

export interface MLMetricsData {
  cross_validation: {
    random_forest: any;
    xgboost: any;
  };
  validation_selection: {
    selected_model: string;
    selected_threshold: number;
    random_forest: any;
    xgboost: any;
  };
  test_evaluation: {
    selected_model: {
      threshold: number;
      precision: number;
      recall: number;
      f1: number;
      roc_auc: number;
      pr_auc: number;
      confusion_matrix: number[][];
      total_test_samples: number;
      positive_test_samples: number;
      negative_test_samples: number;
    };
    baseline_comparison: any;
  };
  feature_importances: any;
}

export interface SHAPGlobalItem {
  feature_name: string;
  mean_abs_shap: number;
  percentage: number;
  rank: number;
}

export default function ResearchMLPage() {
  const [metrics, setMetrics] = useState<MLMetricsData | null>(null);
  const [shapData, setShapData] = useState<SHAPGlobalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResearchData();
  }, []);

  const fetchResearchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('devalign_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const mRes = await fetch('http://localhost:8000/api/recommendations/research/ml/metrics', { headers });
      if (mRes.ok) setMetrics(await mRes.json());

      const sRes = await fetch('http://localhost:8000/api/recommendations/research/ml/explainability/global', { headers });
      if (sRes.ok) {
        const sJson = await sRes.json();
        setShapData(sJson.global_feature_importance || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status="RESEARCH" type="environment" />
              <span className="text-xs text-purple-400 font-mono font-bold">EXPERIMENTAL MODEL BENCHMARKS</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">ML Model Evaluation & SHAP Feature Attributions</h1>
            <p className="text-slate-400 text-xs mt-0.5">Offline research performance metrics for Random Forest and XGBoost experimental models.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading experimental ML metrics & SHAP explanations..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchResearchData} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Selected Research Model" value={metrics?.validation_selection?.selected_model || 'XGBoost'} subtext="Version: ml-v1-rf-xgb" icon="🧪" accentColor="purple" />
              <StatCard title="Test ROC-AUC" value={metrics?.test_evaluation?.selected_model?.roc_auc ? (metrics.test_evaluation.selected_model.roc_auc * 100).toFixed(1) + '%' : '100%'} subtext="Synthetic test set evaluation" icon="📈" accentColor="emerald" />
              <StatCard title="Test PR-AUC" value={metrics?.test_evaluation?.selected_model?.pr_auc ? (metrics.test_evaluation.selected_model.pr_auc * 100).toFixed(1) + '%' : '100%'} subtext="Precision-Recall Area Under Curve" icon="🎯" accentColor="blue" />
              <StatCard title="Optimal Threshold" value={metrics?.validation_selection?.selected_threshold ?? 0.5} subtext="Decision probability threshold" icon="⚡" accentColor="amber" />
            </div>

            {/* Global SHAP Feature Importance Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm">Global SHAP Feature Importance Attribution</h3>
                <span className="text-xs text-purple-400 font-mono font-bold">{shapData.length} Features Analyzed</span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Rank</th>
                    <th className="p-3.5">Feature Name</th>
                    <th className="p-3.5">Mean |SHAP Value|</th>
                    <th className="p-3.5">Importance Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {shapData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">No SHAP importance data available.</td>
                    </tr>
                  ) : (
                    shapData.map((item) => (
                      <tr key={item.feature_name} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-bold text-purple-400">#{item.rank}</td>
                        <td className="p-3.5 font-bold text-white">{item.feature_name}</td>
                        <td className="p-3.5 font-mono text-slate-200">{item.mean_abs_shap.toFixed(4)}</td>
                        <td className="p-3.5 min-w-[160px]">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, item.percentage)}%` }}></div>
                            </div>
                            <span className="font-mono text-purple-300 text-[11px]">{item.percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
