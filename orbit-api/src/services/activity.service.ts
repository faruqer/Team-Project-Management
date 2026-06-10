import { ActivityAction, Prisma } from '@prisma/client';
import { getTenantPrisma } from '../lib/tenant-prisma';
import { getOrganizationId, getUserId } from '../lib/tenant-context';
import { emitToOrg, emitToProject } from '../lib/socket';

const actorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
};

export interface ActivityLogDto {
  id: string;
  action: ActivityAction;
  targetType: string;
  targetId: string;
  projectId: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export async function recordActivity(input: {
  action: ActivityAction;
  targetType: string;
  targetId: string;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
  actorId?: string;
}): Promise<ActivityLogDto | null> {
  const actorId = input.actorId ?? getUserId();
  if (!actorId) return null;

  const tenantPrisma = getTenantPrisma();
  const created = await tenantPrisma.activityLog.create({
    data: {
      actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      projectId: input.projectId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    } as Parameters<typeof tenantPrisma.activityLog.create>[0]['data'],
  });

  const log = await tenantPrisma.activityLog.findUniqueOrThrow({
    where: { id: created.id },
    include: { actor: { select: actorSelect } },
  });

  const dto: ActivityLogDto = {
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    projectId: log.projectId,
    metadata: log.metadata,
    createdAt: log.createdAt,
    actor: log.actor,
  };

  const organizationId = getOrganizationId();
  if (organizationId) {
    emitToOrg(organizationId, 'activity:new', dto);
    if (input.projectId) {
      emitToProject(input.projectId, 'activity:new', dto);
    }
  }

  return dto;
}

export async function listOrgActivity(limit = 50): Promise<ActivityLogDto[]> {
  const tenantPrisma = getTenantPrisma();
  const logs = await tenantPrisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: actorSelect } },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    projectId: log.projectId,
    metadata: log.metadata,
    createdAt: log.createdAt,
    actor: log.actor,
  }));
}

export async function listProjectActivity(projectId: string, limit = 50): Promise<ActivityLogDto[]> {
  const tenantPrisma = getTenantPrisma();
  const logs = await tenantPrisma.activityLog.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: actorSelect } },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    projectId: log.projectId,
    metadata: log.metadata,
    createdAt: log.createdAt,
    actor: log.actor,
  }));
}
