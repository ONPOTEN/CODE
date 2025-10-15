/**
 * Role management utilities for Next.js frontend
 * Matches Laravel backend role system
 */

export type UserRole = 'user' | 'editor' | 'moderator' | 'admin';

export interface UserWithRole {
  role?: string;
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: UserWithRole | null | undefined): boolean {
  return user?.role === 'admin';
}

/**
 * Check if user has moderator role or higher
 */
export function isModerator(user: UserWithRole | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'moderator';
}

/**
 * Check if user has editor role or higher
 */
export function isEditor(user: UserWithRole | null | undefined): boolean {
  return (
    user?.role === 'admin' ||
    user?.role === 'moderator' ||
    user?.role === 'editor'
  );
}

/**
 * Check if user has a specific role
 */
export function hasRole(
  user: UserWithRole | null | undefined,
  role: UserRole
): boolean {
  return user?.role === role;
}

/**
 * Check if user has any of the given roles
 */
export function hasAnyRole(
  user: UserWithRole | null | undefined,
  roles: UserRole[]
): boolean {
  return roles.includes(user?.role as UserRole);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role?: string): string {
  const roleNames: Record<string, string> = {
    user: 'User',
    editor: 'Editor',
    moderator: 'Moderator',
    admin: 'Administrator',
  };

  return roleNames[role || 'user'] || 'User';
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role?: string): string {
  const colors: Record<string, string> = {
    user: 'bg-gray-100 text-gray-800',
    editor: 'bg-blue-100 text-blue-800',
    moderator: 'bg-purple-100 text-purple-800',
    admin: 'bg-red-100 text-red-800',
  };

  return colors[role || 'user'] || 'bg-gray-100 text-gray-800';
}

/**
 * Get all available roles
 */
export function getAllRoles(): { value: UserRole; label: string }[] {
  return [
    { value: 'user', label: 'User' },
    { value: 'editor', label: 'Editor' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'admin', label: 'Administrator' },
  ];
}
