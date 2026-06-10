import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

describe('API health and security headers', () => {
  const app = createApp();

  it('returns health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('orbit-api');
  });

  it('issues CSRF token', async () => {
    const res = await request(app).get('/api/auth/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body.csrfToken).toBeTruthy();
  });

  it('rejects login without CSRF token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      organizationSlug: 'demo',
      email: 'user@demo.com',
      password: 'password',
    });
    expect(res.status).toBe(403);
  });

  it('rejects protected route without auth', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(401);
  });

  it('rejects admin route without auth', async () => {
    const res = await request(app).get('/api/admin/organizations');
    expect(res.status).toBe(401);
  });
});
