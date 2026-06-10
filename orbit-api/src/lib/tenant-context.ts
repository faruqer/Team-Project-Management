import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  organizationId: string;
  userId: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

export function getOrganizationId(): string | undefined {
  return tenantStorage.getStore()?.organizationId;
}

export function getUserId(): string | undefined {
  return tenantStorage.getStore()?.userId;
}

export function requireTenantContext(): TenantContext {
  const ctx = getTenantContext();
  if (!ctx) {
    throw new Error('Tenant context is required but not set');
  }
  return ctx;
}

export function bindTenantContext(context: TenantContext): void {
  tenantStorage.enterWith(context);
}

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
  return tenantStorage.run(context, fn);
}

export async function runWithTenantContextAsync<T>(
  context: TenantContext,
  fn: () => Promise<T>,
): Promise<T> {
  return tenantStorage.run(context, fn);
}
