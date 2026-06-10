import { ProjectStatus, TaskStatus } from '@prisma/client';
import { getTenantPrisma } from '../lib/tenant-prisma';

export interface AnalyticsSummary {
  projects: {
    active: number;
    completed: number;
    delayed: number;
  };
  tasksByStatus: Record<TaskStatus, number>;
  tasksCompletedPerUser: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    count: number;
  }>;
  teamCompletionRate: number;
  totals: {
    projects: number;
    tasks: number;
    completedTasks: number;
  };
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const tenantPrisma = getTenantPrisma();
  const now = new Date();

  const projects = await tenantPrisma.project.findMany({
    include: {
      tasks: {
        select: { id: true, status: true, dueDate: true, assigneeId: true },
      },
    },
  });

  const activeStatuses: ProjectStatus[] = [
    ProjectStatus.ACTIVE,
    ProjectStatus.PLANNING,
    ProjectStatus.ON_HOLD,
  ];

  let active = 0;
  let completed = 0;
  let delayed = 0;

  for (const project of projects) {
    if (project.status === ProjectStatus.COMPLETED) {
      completed++;
      continue;
    }

    if (activeStatuses.includes(project.status)) {
      active++;
    }

    if (project.status === ProjectStatus.ARCHIVED) continue;

    const hasOverdueTasks = project.tasks.some(
      (t) => t.dueDate && t.dueDate < now && t.status !== TaskStatus.DONE,
    );
    const projectOverdue = project.dueDate && project.dueDate < now;

    if (hasOverdueTasks || projectOverdue) {
      delayed++;
    }
  }

  const tasks = await tenantPrisma.task.findMany({
    select: { status: true, assigneeId: true, assignee: { select: { id: true, firstName: true, lastName: true } } },
  });

  const tasksByStatus: Record<TaskStatus, number> = {
    [TaskStatus.TODO]: 0,
    [TaskStatus.IN_PROGRESS]: 0,
    [TaskStatus.REVIEW]: 0,
    [TaskStatus.DONE]: 0,
  };

  const completedByUser = new Map<string, { firstName: string; lastName: string; count: number }>();

  for (const task of tasks) {
    tasksByStatus[task.status]++;
    if (task.status === TaskStatus.DONE && task.assigneeId && task.assignee) {
      const existing = completedByUser.get(task.assigneeId);
      if (existing) {
        existing.count++;
      } else {
        completedByUser.set(task.assigneeId, {
          firstName: task.assignee.firstName,
          lastName: task.assignee.lastName,
          count: 1,
        });
      }
    }
  }

  const totalTasks = tasks.length;
  const completedTasks = tasksByStatus[TaskStatus.DONE];
  const teamCompletionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

  return {
    projects: { active, completed, delayed },
    tasksByStatus,
    tasksCompletedPerUser: [...completedByUser.entries()].map(([userId, data]) => ({
      userId,
      ...data,
    })),
    teamCompletionRate,
    totals: {
      projects: projects.length,
      tasks: totalTasks,
      completedTasks,
    },
  };
}
