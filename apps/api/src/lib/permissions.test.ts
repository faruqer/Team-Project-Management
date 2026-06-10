import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { hasPermission, Permission } from './permissions';

describe('role permission guards', () => {
  it('grants SUPER_ADMIN all permissions', () => {
    for (const permission of Object.values(Permission)) {
      expect(hasPermission(UserRole.SUPER_ADMIN, permission)).toBe(true);
    }
  });

  it('denies CLIENT destructive project permissions', () => {
    expect(hasPermission(UserRole.CLIENT, Permission.PROJECT_CREATE)).toBe(false);
    expect(hasPermission(UserRole.CLIENT, Permission.PROJECT_DELETE)).toBe(false);
    expect(hasPermission(UserRole.CLIENT, Permission.TASK_UPDATE)).toBe(false);
  });

  it('allows TEAM_MEMBER task create and update only', () => {
    expect(hasPermission(UserRole.TEAM_MEMBER, Permission.TASK_CREATE)).toBe(true);
    expect(hasPermission(UserRole.TEAM_MEMBER, Permission.TASK_UPDATE)).toBe(true);
    expect(hasPermission(UserRole.TEAM_MEMBER, Permission.TASK_DELETE)).toBe(false);
    expect(hasPermission(UserRole.TEAM_MEMBER, Permission.TEAM_INVITE)).toBe(false);
  });

  it('allows PROJECT_MANAGER project management but not team deactivate', () => {
    expect(hasPermission(UserRole.PROJECT_MANAGER, Permission.PROJECT_CREATE)).toBe(true);
    expect(hasPermission(UserRole.PROJECT_MANAGER, Permission.TEAM_DEACTIVATE)).toBe(false);
  });

  it('allows ORGANIZATION_ADMIN org update', () => {
    expect(hasPermission(UserRole.ORGANIZATION_ADMIN, Permission.ORG_UPDATE)).toBe(true);
    expect(hasPermission(UserRole.ORGANIZATION_ADMIN, Permission.TEAM_DEACTIVATE)).toBe(true);
  });
});
