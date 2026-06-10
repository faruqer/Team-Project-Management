import { TaskPriority, TaskStatus } from '@prisma/client';
import { getTenantPrisma } from '../lib/tenant-prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { getProject } from './project.service';
import * as events from './events.service';

const assigneeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

const taskInclude = {
  assignee: { select: assigneeSelect },
  _count: { select: { comments: true } },
};

export async function listProjectTasks(projectId: string) {
  await getProject(projectId);
  const tenantPrisma = getTenantPrisma();

  return tenantPrisma.task.findMany({
    where: { projectId },
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
    include: taskInclude,
  });
}

export async function getTask(id: string) {
  const tenantPrisma = getTenantPrisma();
  const task = await tenantPrisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });

  if (!task) throw new NotFoundError('Task not found');
  return task;
}

async function nextPosition(projectId: string, status: TaskStatus): Promise<number> {
  const tenantPrisma = getTenantPrisma();
  const last = await tenantPrisma.task.findFirst({
    where: { projectId, status },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  return (last?.position ?? -1) + 1;
}

export async function createTask(
  projectId: string,
  input: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
  },
) {
  await getProject(projectId);
  const tenantPrisma = getTenantPrisma();

  if (input.assigneeId) {
    const assignee = await tenantPrisma.user.findFirst({
      where: { id: input.assigneeId, isActive: true },
    });
    if (!assignee) throw new ValidationError('Assignee not found or inactive');
  }

  const status = input.status ?? TaskStatus.TODO;
  const position = await nextPosition(projectId, status);

  const task = await tenantPrisma.task.create({
    data: {
      projectId,
      title: input.title,
      description: input.description,
      status,
      priority: input.priority ?? TaskPriority.MEDIUM,
      position,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    } as Parameters<typeof tenantPrisma.task.create>[0]['data'],
    include: taskInclude,
  });

  events.onTaskCreated(task);

  return task;
}

export async function updateTask(
  id: string,
  input: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
  },
) {
  const tenantPrisma = getTenantPrisma();
  const existing = await getTask(id);

  if (input.assigneeId) {
    const assignee = await tenantPrisma.user.findFirst({
      where: { id: input.assigneeId, isActive: true },
    });
    if (!assignee) throw new ValidationError('Assignee not found or inactive');
  }

  let position = existing.position;
  if (input.status && input.status !== existing.status) {
    position = await nextPosition(existing.projectId, input.status);
  }

  const task = await tenantPrisma.task.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status, position }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
    },
    include: taskInclude,
  });

  events.onTaskUpdated(
    {
      id: existing.id,
      projectId: existing.projectId,
      title: existing.title,
      status: existing.status,
      assigneeId: existing.assigneeId,
    },
    {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      status: task.status,
      assigneeId: task.assigneeId,
    },
    task,
  );

  return task;
}

export async function deleteTask(id: string) {
  const task = await getTask(id);
  const tenantPrisma = getTenantPrisma();
  await tenantPrisma.task.delete({ where: { id } });

  events.onTaskDeleted({
    id: task.id,
    projectId: task.projectId,
    title: task.title,
  });
}

export async function moveTask(
  id: string,
  input: { status: TaskStatus; position: number },
) {
  const tenantPrisma = getTenantPrisma();
  const task = await getTask(id);
  const { projectId } = task;
  const newStatus = input.status;
  const newPosition = Math.max(0, input.position);

  if (task.status !== newStatus) {
    const oldSiblings = await tenantPrisma.task.findMany({
      where: { projectId, status: task.status, id: { not: id } },
      orderBy: { position: 'asc' },
    });
    for (let i = 0; i < oldSiblings.length; i++) {
      await tenantPrisma.task.update({
        where: { id: oldSiblings[i].id },
        data: { position: i },
      });
    }
  }

  const targetSiblings = await tenantPrisma.task.findMany({
    where: { projectId, status: newStatus, id: { not: id } },
    orderBy: { position: 'asc' },
  });

  targetSiblings.splice(newPosition, 0, task);

  for (let i = 0; i < targetSiblings.length; i++) {
    await tenantPrisma.task.update({
      where: { id: targetSiblings[i].id },
      data: { status: newStatus, position: i },
    });
  }

  const updated = await tenantPrisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });

  if (updated) {
    events.onTaskUpdated(
      {
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        status: task.status,
        assigneeId: task.assigneeId,
      },
      {
        id: updated.id,
        projectId: updated.projectId,
        title: updated.title,
        status: updated.status,
        assigneeId: updated.assigneeId,
      },
      updated,
    );
  }

  return updated;
}
