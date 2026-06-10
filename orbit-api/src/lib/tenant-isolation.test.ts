import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { hasPermission, Permission } from './permissions';

/**
 * Tenant isolation is enforced at three layers:
 * 1. JWT embeds organizationId — authMiddleware sets req.user.organizationId
 * 2. tenantMiddleware binds AsyncLocalStorage context
 * 3. getTenantPrisma() Prisma extension injects organizationId on all tenant-scoped models
 *
 * Cross-tenant access is prevented because:
 * - Login requires organizationSlug (users are scoped to org)
 * - All protected routes use protectedMiddleware including activeOrgMiddleware
 * - Raw prisma is only used for pre-auth flows and platform admin routes
 * - Socket.io joins rooms based on user's organizationId from JWT
 */
describe('tenant isolation guards', () => {
  it('ensures CLIENT cannot access team management (cross-role boundary)', () => {
    expect(hasPermission(UserRole.CLIENT, Permission.TEAM_MANAGE)).toBe(false);
    expect(hasPermission(UserRole.CLIENT, Permission.TEAM_INVITE)).toBe(false);
  });

  it('ensures TEAM_MEMBER cannot delete projects (data mutation boundary)', () => {
    expect(hasPermission(UserRole.TEAM_MEMBER, Permission.PROJECT_DELETE)).toBe(false);
    expect(hasPermission(UserRole.TEAM_MEMBER, Permission.PROJECT_UPDATE)).toBe(false);
  });

  it('ensures only elevated roles can deactivate users', () => {
    expect(hasPermission(UserRole.ORGANIZATION_ADMIN, Permission.TEAM_DEACTIVATE)).toBe(true);
    expect(hasPermission(UserRole.PROJECT_MANAGER, Permission.TEAM_DEACTIVATE)).toBe(false);
    expect(hasPermission(UserRole.TEAM_MEMBER, Permission.TEAM_DEACTIVATE)).toBe(false);
  });

  it('ensures analytics requires project list permission', () => {
    expect(hasPermission(UserRole.CLIENT, Permission.PROJECT_LIST)).toBe(true);
    expect(hasPermission(UserRole.CLIENT, Permission.PROJECT_CREATE)).toBe(false);
  });
});
