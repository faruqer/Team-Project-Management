import { ActivityAction, NotificationType, TaskStatus, UserRole } from '@prisma/client';
import { recordActivity } from './activity.service';
import { createNotification, createNotifications } from './notification.service';
import { emitToProject } from '../lib/socket';
import { getTenantPrisma } from '../lib/tenant-prisma';
import { getUserId } from '../lib/tenant-context';

function fireAndForget(fn: () => Promise<void>): void {
  fn().catch((err) => console.error('[Events]', err));
}

export function onTaskCreated(task: {
  id: string;
  projectId: string;
  title: string;
  assigneeId: string | null;
}): void {
  fireAndForget(async () => {
    const actorId = getUserId();
    await recordActivity({
      action: ActivityAction.TASK_CREATED,
      targetType: 'task',
      targetId: task.id,
      projectId: task.projectId,
      metadata: { title: task.title },
      actorId,
    });

    emitToProject(task.projectId, 'task:created', { task });

    if (task.assigneeId && task.assigneeId !== actorId) {
      await createNotification({
        userId: task.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task assigned to you',
        message: `You were assigned to "${task.title}"`,
        metadata: { taskId: task.id, projectId: task.projectId },
      });
    }
  });
}

export function onTaskUpdated(
  before: {
    id: string;
    projectId: string;
    title: string;
    status: TaskStatus;
    assigneeId: string | null;
  },
  after: {
    id: string;
    projectId: string;
    title: string;
    status: TaskStatus;
    assigneeId: string | null;
  },
  fullTask: unknown,
): void {
  fireAndForget(async () => {
    const actorId = getUserId();

    await recordActivity({
      action: ActivityAction.TASK_UPDATED,
      targetType: 'task',
      targetId: after.id,
      projectId: after.projectId,
      metadata: {
        title: after.title,
        changes: {
          status: before.status !== after.status ? { from: before.status, to: after.status } : undefined,
          assigneeId: before.assigneeId !== after.assigneeId ? { from: before.assigneeId, to: after.assigneeId } : undefined,
        },
      },
      actorId,
    });

    emitToProject(after.projectId, 'task:updated', { task: fullTask });

    if (after.assigneeId && after.assigneeId !== before.assigneeId && after.assigneeId !== actorId) {
      await createNotification({
        userId: after.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task assigned to you',
        message: `You were assigned to "${after.title}"`,
        metadata: { taskId: after.id, projectId: after.projectId },
      });
    }

    if (after.status === TaskStatus.DONE && before.status !== TaskStatus.DONE) {
      const tenantPrisma = getTenantPrisma();
      const members = await tenantPrisma.projectMember.findMany({
        where: { projectId: after.projectId },
        select: { userId: true },
      });

      const recipientIds = members
        .map((m) => m.userId)
        .filter((id) => id !== actorId);

      if (recipientIds.length > 0) {
        await createNotifications(recipientIds, {
          type: NotificationType.TASK_COMPLETED,
          title: 'Task completed',
          message: `"${after.title}" was marked as done`,
          metadata: { taskId: after.id, projectId: after.projectId },
        });
      }
    }
  });
}

export function onTaskDeleted(task: {
  id: string;
  projectId: string;
  title: string;
}): void {
  fireAndForget(async () => {
    await recordActivity({
      action: ActivityAction.TASK_DELETED,
      targetType: 'task',
      targetId: task.id,
      projectId: task.projectId,
      metadata: { title: task.title },
    });

    emitToProject(task.projectId, 'task:deleted', { taskId: task.id });
  });
}

export function onProjectUpdated(project: {
  id: string;
  name: string;
}): void {
  fireAndForget(async () => {
    await recordActivity({
      action: ActivityAction.PROJECT_UPDATED,
      targetType: 'project',
      targetId: project.id,
      projectId: project.id,
      metadata: { name: project.name },
    });
  });
}

export function onProjectCreated(
  project: { id: string; name: string },
  memberIds: string[],
): void {
  fireAndForget(async () => {
    const actorId = getUserId();
    const recipients = memberIds.filter((id) => id !== actorId);

    if (recipients.length > 0) {
      await createNotifications(recipients, {
        type: NotificationType.PROJECT_CREATED,
        title: 'New project created',
        message: `Project "${project.name}" was created`,
        metadata: { projectId: project.id },
      });
    }
  });
}

export function onUserInvited(input: {
  email: string;
  role: UserRole;
  inviterName: string;
  inviterId: string;
}): void {
  fireAndForget(async () => {
    const tenantPrisma = getTenantPrisma();
    const admins = await tenantPrisma.user.findMany({
      where: {
        role: { in: [UserRole.SUPER_ADMIN, UserRole.ORGANIZATION_ADMIN] },
        isActive: true,
        id: { not: input.inviterId },
      },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await createNotifications(
      admins.map((a) => a.id),
      {
        type: NotificationType.USER_INVITED,
        title: 'User invited',
        message: `${input.inviterName} invited ${input.email} as ${input.role}`,
        metadata: { email: input.email, role: input.role },
      },
    );
  });
}
