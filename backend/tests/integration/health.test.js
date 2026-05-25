const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/redis');

describe('GET /health', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(async () => {
    await closePool();
    await closeRedis();
  });

  test('returns 200 with status ok when postgres + redis reachable', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      checks: {
        database: { status: 'ok' },
        redis: { status: 'ok' },
      },
    });
  });

  test('returns 404 with structured error for unknown routes', async () => {
    const res = await request(app).get('/this-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
