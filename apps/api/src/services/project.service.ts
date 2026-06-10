import { ProjectStatus } from '@prisma/client';
import { getTenantPrisma } from '../lib/tenant-prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import * as events from './events.service';

const memberSelect = {
  id: true,
  userId: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      role: true,
    },
  },
};

export async function listProjects() {
  const tenantPrisma = getTenantPrisma();
  return tenantPrisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      members: { select: memberSelect },
      _count: { select: { tasks: true } },
    },
  });
}

export async function getProject(id: string) {
  const tenantPrisma = getTenantPrisma();
  const project = await tenantPrisma.project.findUnique({
    where: { id },
    include: {
      members: { select: memberSelect },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) throw new NotFoundError('Project not found');
  return project;
}

export async function createProject(input: {
  name: string;
  description?: string;
  status?: ProjectStatus;
  dueDate?: string | null;
  memberIds?: string[];
  creatorId: string;
}) {
  const tenantPrisma = getTenantPrisma();
  const memberIds = input.memberIds ?? [input.creatorId];
  const uniqueMemberIds = [...new Set(memberIds)];

  const users = await tenantPrisma.user.findMany({
    where: { id: { in: uniqueMemberIds }, isActive: true },
  });

  if (users.length !== uniqueMemberIds.length) {
    throw new ValidationError('One or more team members are invalid or inactive');
  }

  const project = await tenantPrisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      status: input.status ?? ProjectStatus.PLANNING,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      members: {
        create: uniqueMemberIds.map((userId) => ({ userId })),
      },
    } as Parameters<typeof tenantPrisma.project.create>[0]['data'],
    include: {
      members: { select: memberSelect },
      _count: { select: { tasks: true } },
    },
  });

  events.onProjectCreated({ id: project.id, name: project.name }, uniqueMemberIds);

  return project;
}

export async function updateProject(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    status?: ProjectStatus;
    dueDate?: string | null;
  },
) {
  const tenantPrisma = getTenantPrisma();
  await getProject(id);

  const { dueDate, ...rest } = input;
  const project = await tenantPrisma.project.update({
    where: { id },
    data: {
      ...rest,
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
    include: {
      members: { select: memberSelect },
      _count: { select: { tasks: true } },
    },
  });

  events.onProjectUpdated({ id: project.id, name: project.name });

  return project;
}

export async function deleteProject(id: string) {
  const tenantPrisma = getTenantPrisma();
  await getProject(id);
  await tenantPrisma.project.delete({ where: { id } });
}

export async function setProjectMembers(projectId: string, userIds: string[]) {
  const tenantPrisma = getTenantPrisma();
  await getProject(projectId);

  const uniqueIds = [...new Set(userIds)];
  const users = await tenantPrisma.user.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
  });

  if (users.length !== uniqueIds.length) {
    throw new ValidationError('One or more team members are invalid or inactive');
  }

  await tenantPrisma.projectMember.deleteMany({ where: { projectId } });

  if (uniqueIds.length > 0) {
    await tenantPrisma.projectMember.createMany({
      data: uniqueIds.map((userId) => ({ projectId, userId })) as Parameters<
        typeof tenantPrisma.projectMember.createMany
      >[0]['data'],
    });
  }

  return getProject(projectId);
}
