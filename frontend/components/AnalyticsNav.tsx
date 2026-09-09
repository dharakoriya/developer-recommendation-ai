'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../app/context/AuthContext';

export function AnalyticsNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isDev = user?.role === 'DEVELOPER';

  const tabs = [
    { label: 'Project Health', href: '/analytics' },
    { label: 'Team Capacity', href: '/analytics/teams' },
    { label: 'Performance Analytics', href: '/analytics/performance' },
    ...(!isDev ? [{ label: 'Developer Comparison', href: '/analytics/developers' }] : []),
    { label: 'Task Intelligence', href: '/analytics/tasks' },
    { label: 'Recommendation Effectiveness', href: '/analytics/recommendations' },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
