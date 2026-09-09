'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../lib/api';

export default function NewProjectPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'CHOICE' | 'MANUAL'>('CHOICE');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post<any>('/projects', {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
      });
      showToast(`Project "${res.name}" created successfully!`, 'success');
      router.push('/projects');
    } catch (err: any) {
      showToast(err.message || 'Failed to create project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8 py-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create New Project</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select how you would like to structure and initialize your project.
            </p>
          </div>
          <Link
            href="/projects"
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            ← Back to Projects
          </Link>
        </div>

        {mode === 'CHOICE' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option A: Manual Creation */}
            <div
              onClick={() => setMode('MANUAL')}
              className="group cursor-pointer p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-xl transition-all shadow-sm hover:shadow-md space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl font-semibold mb-4 group-hover:scale-105 transition-transform">
                  📁
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Option A — Create Project Manually
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Start with a basic project container and manually define tasks, teams, and assignments as your project evolves.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Traditional workflow</span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                  Configure Form →
                </span>
              </div>
            </div>

            {/* Option B: AI Planning */}
            <div
              onClick={() => router.push('/ai-planning')}
              className="group cursor-pointer p-6 bg-purple-50/50 dark:bg-gradient-to-br dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/60 border border-purple-200 dark:border-purple-500/30 hover:border-purple-400/60 rounded-xl transition-all shadow-sm hover:shadow-md space-y-4 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse"></span>
                  AI Powered
                </span>
              </div>

              <div>
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-300 text-xl font-semibold mb-4 group-hover:scale-105 transition-transform">
                  ✨
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                  Option B — ✨ Plan Project with AI
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Describe high-level goals and let AI analyze modules, decompose tasks, estimate efforts, detect skill gaps, and validate dependencies.
                </p>
              </div>

              <div className="pt-4 border-t border-purple-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300/80">Intelligent breakdown</span>
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 group-hover:translate-x-1 transition-transform">
                  Launch Planning Wizard ✨ →
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Manual Project Creation Form */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-2xl mx-auto space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Manual Project Details</h2>
              <button
                type="button"
                onClick={() => setMode('CHOICE')}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Switch to Choice View
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NextGen Payment Gateway"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Project Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the business goals, scope, or timeline..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('CHOICE')}
                  className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Project...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
