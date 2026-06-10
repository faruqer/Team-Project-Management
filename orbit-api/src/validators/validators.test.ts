import { describe, expect, it } from 'vitest';
import { loginSchema } from './auth.validators';
import { createProjectSchema } from './project.validators';
import { calendarQuerySchema } from './calendar.validators';
import { updateOrganizationStatusSchema } from './admin.validators';

describe('Zod input validation', () => {
  it('rejects invalid login email', () => {
    expect(() =>
      loginSchema.parse({ organizationSlug: 'acme', email: 'bad', password: 'x' }),
    ).toThrow();
  });

  it('accepts valid project create payload', () => {
    const result = createProjectSchema.parse({ name: 'Sprint 1' });
    expect(result.name).toBe('Sprint 1');
  });

  it('rejects invalid calendar query', () => {
    expect(() => calendarQuerySchema.parse({})).toThrow();
  });

  it('accepts organization status update', () => {
    const result = updateOrganizationStatusSchema.parse({ status: 'SUSPENDED' });
    expect(result.status).toBe('SUSPENDED');
  });
});
