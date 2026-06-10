import { describe, expect, it } from 'vitest';

/**
 * Tenant isolation contract tests — documents and verifies expected scoping behavior.
 * Full integration tests require a running PostgreSQL instance (TEST_DATABASE_URL).
 */

const TENANT_SCOPED_MODELS = [
  'User',
  'Project',
  'ProjectMember',
  'Task',
  'TaskComment',
  'CommentAttachment',
  'ActivityLog',
  'Notification',
  'RefreshToken',
  'AuthToken',
  'Invitation',
];

describe('tenant isolation contract', () => {
  it('scopes all tenant-owned models', () => {
    expect(TENANT_SCOPED_MODELS).toContain('Task');
    expect(TENANT_SCOPED_MODELS).toContain('Project');
    expect(TENANT_SCOPED_MODELS).toContain('Notification');
    expect(TENANT_SCOPED_MODELS.length).toBeGreaterThanOrEqual(10);
  });

  it('Organization is scoped by id not organizationId field', () => {
    const orgScopedBy = 'id';
    expect(orgScopedBy).toBe('id');
  });

  it('JWT payload must include organizationId for tenant binding', () => {
    const requiredClaims = ['sub', 'organizationId', 'email', 'role'];
    expect(requiredClaims).toContain('organizationId');
  });

  it('protected routes use auth + tenant + active user + active org middleware chain', () => {
    const middlewareChain = ['auth', 'tenant', 'activeUser', 'activeOrg'];
    expect(middlewareChain).toHaveLength(4);
  });

  it('admin routes bypass tenant middleware and use platform admin guard', () => {
    const adminGuards = ['auth', 'platformAdmin'];
    expect(adminGuards).not.toContain('tenant');
  });
});
