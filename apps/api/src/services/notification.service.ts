import { NotificationType, Prisma } from '@prisma/client';
import { getTenantPrisma } from '../lib/tenant-prisma';
import { getUserId } from '../lib/tenant-context';
import { emitToUser } from '../lib/socket';
import { NotFoundError } from '../utils/errors';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<NotificationDto> {
  const tenantPrisma = getTenantPrisma();
  const notification = await tenantPrisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    } as Parameters<typeof tenantPrisma.notification.create>[0]['data'],
  });

  const dto: NotificationDto = {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    metadata: notification.metadata,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };

  emitToUser(input.userId, 'notification:new', dto);
  return dto;
}

export async function createNotifications(
  userIds: string[],
  input: Omit<Parameters<typeof createNotification>[0], 'userId'>,
): Promise<void> {
  const unique = [...new Set(userIds)];
  await Promise.all(
    unique.map((userId) => createNotification({ ...input, userId })),
  );
}

export async function listNotifications(limit = 30): Promise<NotificationDto[]> {
  const userId = getUserId();
  if (!userId) return [];

  const tenantPrisma = getTenantPrisma();
  const notifications = await tenantPrisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    metadata: n.metadata,
    readAt: n.readAt,
    createdAt: n.createdAt,
  }));
}

export async function getUnreadCount(): Promise<number> {
  const userId = getUserId();
  if (!userId) return 0;

  const tenantPrisma = getTenantPrisma();
  return tenantPrisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markAsRead(id: string): Promise<NotificationDto> {
  const userId = getUserId();
  const tenantPrisma = getTenantPrisma();

  const notification = await tenantPrisma.notification.findFirst({
    where: { id, userId: userId ?? undefined },
  });

  if (!notification) throw new NotFoundError('Notification not found');

  const updated = await tenantPrisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return {
    id: updated.id,
    type: updated.type,
    title: updated.title,
    message: updated.message,
    metadata: updated.metadata,
    readAt: updated.readAt,
    createdAt: updated.createdAt,
  };
}

export async function markAllAsRead(): Promise<void> {
  const userId = getUserId();
  if (!userId) return;

  const tenantPrisma = getTenantPrisma();
  await tenantPrisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
