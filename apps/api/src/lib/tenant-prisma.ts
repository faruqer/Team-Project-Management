import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';
import { getOrganizationId } from './tenant-context';

const TENANT_SCOPED_MODELS = new Set([
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
]);

type QueryArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
};

function injectTenantWhere(args: QueryArgs, organizationId: string): void {
  args.where = { ...(args.where ?? {}), organizationId };
}

function injectTenantData(args: QueryArgs, organizationId: string): void {
  if (args.data && !Array.isArray(args.data)) {
    args.data = { ...args.data, organizationId };
  }
}

function injectTenantCreate(args: QueryArgs, organizationId: string): void {
  if (args.create && typeof args.create === 'object') {
    args.create = { ...args.create, organizationId };
  }
}

export function createTenantPrisma(basePrisma: PrismaClient) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const organizationId = getOrganizationId();

          if (model === 'Organization') {
            if (organizationId) {
              const scopedOps = [
                'findUnique',
                'findFirst',
                'findMany',
                'count',
                'aggregate',
                'update',
                'updateMany',
                'delete',
                'deleteMany',
              ];
              if (scopedOps.includes(operation)) {
                const queryArgs = args as QueryArgs;
                if (queryArgs.where) {
                  queryArgs.where.id = organizationId;
                }
              }
            }
            return query(args);
          }

          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          if (!organizationId) {
            throw new Error(
              `Tenant scope required: attempted ${operation} on ${model} without organization context`,
            );
          }

          const readOps = [
            'findUnique',
            'findFirst',
            'findMany',
            'count',
            'aggregate',
            'groupBy',
          ];
          const writeFilterOps = ['update', 'updateMany', 'delete', 'deleteMany'];
          const createOps = ['create', 'createMany', 'upsert'];

          if (readOps.includes(operation) || writeFilterOps.includes(operation)) {
            injectTenantWhere(args as QueryArgs, organizationId);
          }

          if (createOps.includes(operation)) {
            if (operation === 'create') {
              injectTenantData(args as QueryArgs, organizationId);
            }
            if (operation === 'upsert') {
              injectTenantWhere(args as QueryArgs, organizationId);
              injectTenantCreate(args as QueryArgs, organizationId);
            }
          }

          return query(args);
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;

let tenantPrismaInstance: TenantPrismaClient | null = null;

export function getTenantPrisma(): TenantPrismaClient {
  if (!tenantPrismaInstance) {
    tenantPrismaInstance = createTenantPrisma(prisma);
  }
  return tenantPrismaInstance;
}
