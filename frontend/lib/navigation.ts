import { UserRole } from './permissions';

export interface NavItem {
  name: string;
  href: string;
  icon: string;
  allowedRoles: UserRole[];
}

// Shown for ADMIN and MANAGER
export const MAIN_NAVIGATION: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { name: 'Project Intelligence', href: '/analytics', icon: '🧠', allowedRoles: ['ADMIN', 'MANAGER'] },
  { name: 'Projects', href: '/projects', icon: '📁', allowedRoles: ['ADMIN', 'MANAGER'] },
  { name: '✨ AI Project Planner', href: '/ai-planning', icon: '🤖', allowedRoles: ['ADMIN', 'MANAGER'] },
  { name: 'Tasks', href: '/tasks', icon: '📋', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { name: 'Developers', href: '/developers', icon: '👥', allowedRoles: ['ADMIN', 'MANAGER'] },
  { name: 'Performance Analytics', href: '/analytics/performance', icon: '🏆', allowedRoles: ['ADMIN', 'MANAGER'] },
  { name: 'Teams', href: '/teams', icon: '🏢', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { name: 'Assignments', href: '/assignments', icon: '🎯', allowedRoles: ['ADMIN', 'MANAGER'] },
  { name: 'Recommendations', href: '/recommendations', icon: '⚡', allowedRoles: ['ADMIN', 'MANAGER'] },
  { name: 'Workload Engine', href: '/workload', icon: '📈', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  // Developer-only workspace links
  { name: 'My Work Intelligence', href: '/analytics/me', icon: '🎯', allowedRoles: ['DEVELOPER'] },
];

export const RESEARCH_NAVIGATION: NavItem[] = [
  { name: 'ML Model Evaluation', href: '/research/ml', icon: '🧪', allowedRoles: ['ADMIN'] },
  { name: 'Research Dataset & Labels', href: '/research/dataset', icon: '🔬', allowedRoles: ['ADMIN'] },
  { name: 'Dataset Monitoring', href: '/research/dataset/monitoring', icon: '📉', allowedRoles: ['ADMIN'] },
  { name: 'Audit & Governance Log', href: '/recommendations/audit', icon: '🛡️', allowedRoles: ['ADMIN'] },
];

export const ADMIN_NAVIGATION: NavItem[] = [
  { name: 'User Management', href: '/admin/users', icon: '👤', allowedRoles: ['ADMIN'] },
];

export function getFilteredNavigation(role: UserRole | undefined) {
  if (!role) {
    return { main: [], research: [], admin: [] };
  }
  if (role === 'ADMIN') {
    return {
      main: MAIN_NAVIGATION.filter((i) => i.allowedRoles.includes('ADMIN')),
      research: RESEARCH_NAVIGATION,
      admin: ADMIN_NAVIGATION,
    };
  }

  const main = MAIN_NAVIGATION.filter((item) => item.allowedRoles.includes(role));
  const research = RESEARCH_NAVIGATION.filter((item) => item.allowedRoles.includes(role));

  return { main, research, admin: [] };
}