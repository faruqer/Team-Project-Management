import { UserRole } from '@prisma/client';

export const Permission = {
  ORG_READ: 'org:read',
  ORG_UPDATE: 'org:update',
  TEAM_LIST: 'team:list',
  TEAM_INVITE: 'team:invite',
  TEAM_MANAGE: 'team:manage',
  TEAM_DEACTIVATE: 'team:deactivate',
  PROFILE_READ: 'profile:read',
  PROFILE_UPDATE: 'profile:update',
  PROJECT_LIST: 'project:list',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_MANAGE_MEMBERS: 'project:manage_members',
  TASK_LIST: 'task:list',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  COMMENT_LIST: 'comment:list',
  COMMENT_CREATE: 'comment:create',
  COMMENT_UPDATE: 'comment:update',
  COMMENT_DELETE: 'comment:delete',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  [UserRole.SUPER_ADMIN]: new Set(Object.values(Permission)),
  [UserRole.ORGANIZATION_ADMIN]: new Set([
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.TEAM_LIST,
    Permission.TEAM_INVITE,
    Permission.TEAM_MANAGE,
    Permission.TEAM_DEACTIVATE,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.PROJECT_LIST,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_MANAGE_MEMBERS,
    Permission.TASK_LIST,
    Permission.TASK_CREATE,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.COMMENT_LIST,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE,
    Permission.COMMENT_DELETE,
  ]),
  [UserRole.PROJECT_MANAGER]: new Set([
    Permission.ORG_READ,
    Permission.TEAM_LIST,
    Permission.TEAM_INVITE,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.PROJECT_LIST,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_MANAGE_MEMBERS,
    Permission.TASK_LIST,
    Permission.TASK_CREATE,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.COMMENT_LIST,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE,
    Permission.COMMENT_DELETE,
  ]),
  [UserRole.TEAM_MEMBER]: new Set([
    Permission.ORG_READ,
    Permission.TEAM_LIST,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.PROJECT_LIST,
    Permission.TASK_LIST,
    Permission.TASK_CREATE,
    Permission.TASK_UPDATE,
    Permission.COMMENT_LIST,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE,
    Permission.COMMENT_DELETE,
  ]),
  [UserRole.CLIENT]: new Set([
    Permission.ORG_READ,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.PROJECT_LIST,
    Permission.TASK_LIST,
    Permission.COMMENT_LIST,
    Permission.COMMENT_CREATE,
  ]),
};

export function hasPermission(role: UserRole | string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  if (!permissions) return false;
  return permissions.has(permission);
}

export function hasAnyPermission(role: UserRole | string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole | string, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export const ASSIGNABLE_ROLES: Record<UserRole, UserRole[]> = {
  [UserRole.SUPER_ADMIN]: [
    UserRole.ORGANIZATION_ADMIN,
    UserRole.PROJECT_MANAGER,
    UserRole.TEAM_MEMBER,
    UserRole.CLIENT,
  ],
  [UserRole.ORGANIZATION_ADMIN]: [
    UserRole.PROJECT_MANAGER,
    UserRole.TEAM_MEMBER,
    UserRole.CLIENT,
  ],
  [UserRole.PROJECT_MANAGER]: [UserRole.TEAM_MEMBER, UserRole.CLIENT],
  [UserRole.TEAM_MEMBER]: [],
  [UserRole.CLIENT]: [],
};

export function canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
  return ASSIGNABLE_ROLES[assignerRole]?.includes(targetRole) ?? false;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ORGANIZATION_ADMIN]: 'Organization Admin',
  [UserRole.PROJECT_MANAGER]: 'Project Manager',
  [UserRole.TEAM_MEMBER]: 'Team Member',
  [UserRole.CLIENT]: 'Client',
};
