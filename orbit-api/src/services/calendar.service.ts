import { getTenantPrisma } from '../lib/tenant-prisma';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  type: 'project' | 'task';
  projectId: string;
  taskId?: string;
  status?: string;
}

export async function getCalendarEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  const tenantPrisma = getTenantPrisma();
  const events: CalendarEvent[] = [];

  const projects = await tenantPrisma.project.findMany({
    where: {
      dueDate: { gte: start, lte: end },
    },
    select: { id: true, name: true, dueDate: true, status: true },
  });

  for (const project of projects) {
    if (!project.dueDate) continue;
    const day = project.dueDate.toISOString();
    events.push({
      id: `project-${project.id}`,
      title: `[Project] ${project.name}`,
      start: day,
      end: day,
      allDay: true,
      type: 'project',
      projectId: project.id,
      status: project.status,
    });
  }

  const tasks = await tenantPrisma.task.findMany({
    where: {
      dueDate: { gte: start, lte: end },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      status: true,
      projectId: true,
      project: { select: { name: true } },
    },
  });

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const day = task.dueDate.toISOString();
    events.push({
      id: `task-${task.id}`,
      title: `[Task] ${task.title}`,
      start: day,
      end: day,
      allDay: true,
      type: 'task',
      projectId: task.projectId,
      taskId: task.id,
      status: task.status,
    });
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}
