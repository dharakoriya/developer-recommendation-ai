export type UserRole = 'ADMIN' | 'MANAGER' | 'DEVELOPER';

export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  { path: '/dashboard', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { path: '/analytics/me', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { path: '/analytics', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/recommendations/audit', allowedRoles: ['ADMIN'] },
  { path: '/recommendations', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/projects', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/teams', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { path: '/developers', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/tasks', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { path: '/assignments', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/workload', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { path: '/research', allowedRoles: ['ADMIN'] },
  { path: '/ai-planning', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/admin', allowedRoles: ['ADMIN'] },
];

export function hasPermission(role: UserRole | undefined, path: string): boolean {
  if (!role) return false;
  if (role === 'ADMIN') return true;

  // Sort by longest / most specific path first to ensure child routes (e.g. /analytics/me) take precedence over parent routes (/analytics)
  const sorted = [...ROUTE_PERMISSIONS].sort((a, b) => b.path.length - a.path.length);
  const matched = sorted.find((p) => path === p.path || path.startsWith(p.path + '/'));
  if (!matched) return true;

  return matched.allowedRoles.includes(role);
}

export function canEditTeam(userRole: UserRole | undefined, userId: string | undefined, teamManagerId: string | undefined | null): boolean {
  if (!userRole) return false;
  if (userRole === 'ADMIN') return true;
  if (userRole === 'MANAGER') {
    return !!userId && !!teamManagerId && userId === teamManagerId;
  }
  return false;
}
