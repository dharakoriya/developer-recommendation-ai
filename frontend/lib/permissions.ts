export type UserRole = 'ADMIN' | 'MANAGER' | 'DEVELOPER';

export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  { path: '/dashboard', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { path: '/projects', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/analytics', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/analytics/me', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { path: '/teams', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/developers', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/tasks', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { path: '/assignments', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/recommendations', allowedRoles: ['ADMIN', 'MANAGER'] },
  { path: '/workload', allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'] },
  { path: '/research', allowedRoles: ['ADMIN'] },
  { path: '/recommendations/audit', allowedRoles: ['ADMIN'] },
  { path: '/ai-planning', allowedRoles: ['ADMIN', 'MANAGER'] },
];

export function hasPermission(role: UserRole | undefined, path: string): boolean {
  if (!role) return false;
  if (role === 'ADMIN') return true;

  const matched = ROUTE_PERMISSIONS.find((p) => path === p.path || path.startsWith(p.path + '/'));
  if (!matched) return true;

  return matched.allowedRoles.includes(role);
}
