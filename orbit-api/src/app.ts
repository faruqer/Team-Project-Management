import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import organizationRoutes from './routes/organization.routes';
import teamRoutes from './routes/team.routes';
import profileRoutes from './routes/profile.routes';
import projectsRoutes from './routes/projects.routes';
import tasksRoutes from './routes/tasks.routes';
import activityRoutes from './routes/activity.routes';
import notificationsRoutes from './routes/notifications.routes';
import analyticsRoutes from './routes/analytics.routes';
import calendarRoutes from './routes/calendar.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error-handler';
import { uploadsPath } from './lib/upload';
import { generalRateLimiter } from './middleware/rate-limit';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(generalRateLimiter);
  app.use('/uploads', express.static(uploadsPath));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'orbit-api' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/organizations', organizationRoutes);
  app.use('/api/team', teamRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(errorHandler);

  return app;
}
