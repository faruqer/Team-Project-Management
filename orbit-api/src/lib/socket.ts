import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from './prisma';

let io: Server | null = null;

export function orgRoom(organizationId: string): string {
  return `org:${organizationId}`;
}

export function projectRoom(projectId: string): string {
  return `project:${projectId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub, organizationId: payload.organizationId },
        select: { id: true, organizationId: true, isActive: true },
      });

      if (!user?.isActive) {
        next(new Error('Unauthorized'));
        return;
      }

      socket.data.userId = user.id;
      socket.data.organizationId = user.organizationId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId as string;
    const organizationId = socket.data.organizationId as string;

    socket.join(orgRoom(organizationId));
    socket.join(userRoom(userId));

    const memberships = await prisma.projectMember.findMany({
      where: { userId, organizationId },
      select: { projectId: true },
    });

    for (const m of memberships) {
      socket.join(projectRoom(m.projectId));
    }

    socket.on('join:project', async (projectId: string, callback?: (err?: string) => void) => {
      const member = await prisma.projectMember.findFirst({
        where: { projectId, userId, organizationId },
      });

      if (!member) {
        callback?.('Not a project member');
        return;
      }

      socket.join(projectRoom(projectId));
      callback?.();
    });

    socket.on('leave:project', (projectId: string) => {
      socket.leave(projectRoom(projectId));
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(userRoom(userId)).emit(event, data);
}

export function emitToOrg(organizationId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(orgRoom(organizationId)).emit(event, data);
}

export function emitToProject(projectId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(projectRoom(projectId)).emit(event, data);
}
