// src/lib/auth-utils.ts
import { useUser } from '@auth0/nextjs-auth0/client';

/**
 * Auth0 namespace for custom claims.
 * Set via NEXT_PUBLIC_AUTH0_NAMESPACE env var (for client) or AUTH0_NAMESPACE (for server).
 * Must match the namespace configured in Auth0 Actions.
 *
 * To rebrand: Update NEXT_PUBLIC_AUTH0_NAMESPACE in .env.local and Auth0 Actions.
 */
export const AUTH0_NAMESPACE =
  process.env.NEXT_PUBLIC_AUTH0_NAMESPACE ||
  process.env.AUTH0_NAMESPACE ||
  'https://authskye.com';

/**
 * Helper to build namespaced claim key.
 * Usage: user[getClaimKey('roles')] instead of user['https://authskye.com/roles']
 */
export function getClaimKey(claim: string): string {
  return `${AUTH0_NAMESPACE}/${claim}`;
}

export interface UserRoles {
  roles: string[];
  permissions: string[];
}

export const REQUIRED_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  DATA_ANALYST: 'Data Analyst',
} as const;

export const REQUIRED_PERMISSIONS = {
  READ_REPORTS: 'read:reports',
  CREATE_REPORTS: 'create:reports',
  EDIT_REPORTS: 'edit:reports',
  DELETE_REPORTS: 'delete:reports',
  READ_ANALYTICS: 'read:analytics',
} as const;

export function getUserRoles(user: Record<string, any> | undefined): string[] {
  return user?.[getClaimKey('roles')] || [];
}

export function getUserPermissions(user: Record<string, any> | undefined): string[] {
  return user?.[getClaimKey('permissions')] || [];
}

export function hasRole(user: Record<string, any> | undefined, role: string): boolean {
  const userRoles = getUserRoles(user);
  return userRoles.includes(role);
}

export function hasPermission(user: Record<string, any> | undefined, permission: string): boolean {
  const userPermissions = getUserPermissions(user);
  return userPermissions.includes(permission);
}

export function hasAnalyticsAccess(user: Record<string, any> | undefined): boolean {
  return hasRole(user, REQUIRED_ROLES.DATA_ANALYST) &&
         hasPermission(user, REQUIRED_PERMISSIONS.READ_ANALYTICS);
}

// Custom hook for role checking
export function useRoles() {
  const { user, isLoading } = useUser();

  return {
    user,
    isLoading,
    roles: getUserRoles(user),
    permissions: getUserPermissions(user),
    hasRole: (role: string) => hasRole(user, role),
    hasPermission: (permission: string) => hasPermission(user, permission),
    hasAnalyticsAccess: () => hasAnalyticsAccess(user),
    isAdmin: () => hasRole(user, REQUIRED_ROLES.ADMIN),
    isEditor: () => hasRole(user, REQUIRED_ROLES.EDITOR),
    isViewer: () => hasRole(user, REQUIRED_ROLES.VIEWER),
    isDataAnalyst: () => hasRole(user, REQUIRED_ROLES.DATA_ANALYST),
  };
}
