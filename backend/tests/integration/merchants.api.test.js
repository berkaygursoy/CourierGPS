const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool, getPool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/redis');
const { truncateAll } = require('../helpers/db');
const merchantRepo = require('../../src/repositories/merchant.repository');

describe('Merchants', () => {
  let app;

  beforeAll(() => { app = createApp(); });
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => {
    await closePool();
    await closeRedis();
  });

  describe('repository', () => {
    test('create then findById returns same row', async () => {
      const created = await merchantRepo.create({
        name: 'Pizza Place',
        address: '1 Main St',
        latitude: 41.0,
        longitude: 28.9,
        phone: '+901112223344',
        is_active: true,
      });
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.name).toBe('Pizza Place');
      const fetched = await merchantRepo.findById(created.id);
      expect(fetched).toEqual(created);
    });

    test('findAll returns rows in newest-first order', async () => {
      const a = await merchantRepo.create({ name: 'A', address: 'x', latitude: 0, longitude: 0 });
      const b = await merchantRepo.create({ name: 'B', address: 'y', latitude: 0, longitude: 0 });
      const list = await merchantRepo.findAll();
      expect(list.map((m) => m.id)).toEqual([b.id, a.id]);
    });

    test('update returns the updated row', async () => {
      const m = await merchantRepo.create({ name: 'A', address: 'x', latitude: 0, longitude: 0 });
      const updated = await merchantRepo.update(m.id, { name: 'A2', is_active: false });
      expect(updated.name).toBe('A2');
      expect(updated.is_active).toBe(false);
      expect(updated.address).toBe('x');
    });

    test('update returns null when id does not exist', async () => {
      const result = await merchantRepo.update(
        '00000000-0000-0000-0000-000000000000',
        { name: 'X' },
      );
      expect(result).toBeNull();
    });

    test('delete returns true when row existed, false otherwise', async () => {
      const m = await merchantRepo.create({ name: 'A', address: 'x', latitude: 0, longitude: 0 });
      expect(await merchantRepo.deleteById(m.id)).toBe(true);
      expect(await merchantRepo.deleteById(m.id)).toBe(false);
    });

    test('findById returns null when id does not exist', async () => {
      expect(await merchantRepo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });
  });

  describe('service', () => {
    const merchantSvc = require('../../src/services/merchant.service');
    const { HttpError } = require('../../src/utils/errors');

    test('getById throws 404 HttpError when not found', async () => {
      await expect(
        merchantSvc.getById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(HttpError);
      try {
        await merchantSvc.getById('00000000-0000-0000-0000-000000000000');
      } catch (e) {
        expect(e.status).toBe(404);
        expect(e.code).toBe('NOT_FOUND');
      }
    });

    test('update throws 404 HttpError when id does not exist', async () => {
      await expect(
        merchantSvc.update('00000000-0000-0000-0000-000000000000', { name: 'X' }),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('remove throws 404 HttpError when id does not exist', async () => {
      await expect(
        merchantSvc.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });
  });

  describe('HTTP', () => {
    const validBody = () => ({
      name: 'Pizza Hub',
      address: '5 Demo Street',
      latitude: 41.0082,
      longitude: 28.9784,
      phone: '+905001112233',
    });

    test('POST /api/merchants -> 201 with created entity', async () => {
      const res = await request(app).post('/api/merchants').send(validBody());
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.name).toBe('Pizza Hub');
      expect(res.body.is_active).toBe(true);
    });

    test('POST /api/merchants -> 400 when name missing', async () => {
      const body = validBody();
      delete body.name;
      const res = await request(app).post('/api/merchants').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.path.includes('name'))).toBe(true);
    });

    test('POST /api/merchants -> 400 when latitude out of range', async () => {
      const res = await request(app).post('/api/merchants').send({ ...validBody(), latitude: 200 });
      expect(res.status).toBe(400);
    });

    test('GET /api/merchants -> 200 with array', async () => {
      await request(app).post('/api/merchants').send(validBody());
      await request(app).post('/api/merchants').send({ ...validBody(), name: 'Second' });
      const res = await request(app).get('/api/merchants');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    test('GET /api/merchants -> 200 with empty array when none', async () => {
      const res = await request(app).get('/api/merchants');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('GET /api/merchants/:id -> 200 with entity', async () => {
      const created = await request(app).post('/api/merchants').send(validBody());
      const res = await request(app).get(`/api/merchants/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    test('GET /api/merchants/:id -> 404 when not found', async () => {
      const res = await request(app).get('/api/merchants/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('GET /api/merchants/:id -> 400 when id not a uuid', async () => {
      const res = await request(app).get('/api/merchants/not-a-uuid');
      expect(res.status).toBe(400);
    });

    test('PATCH /api/merchants/:id -> 200 with updated entity', async () => {
      const created = await request(app).post('/api/merchants').send(validBody());
      const res = await request(app)
        .patch(`/api/merchants/${created.body.id}`)
        .send({ name: 'Renamed', is_active: false });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Renamed');
      expect(res.body.is_active).toBe(false);
    });

    test('PATCH /api/merchants/:id -> 400 when body empty', async () => {
      const created = await request(app).post('/api/merchants').send(validBody());
      const res = await request(app).patch(`/api/merchants/${created.body.id}`).send({});
      expect(res.status).toBe(400);
    });

    test('PATCH /api/merchants/:id -> 404 when not found', async () => {
      const res = await request(app)
        .patch('/api/merchants/00000000-0000-0000-0000-000000000000')
        .send({ name: 'X' });
      expect(res.status).toBe(404);
    });

    test('DELETE /api/merchants/:id -> 204 then 404 on second delete', async () => {
      const created = await request(app).post('/api/merchants').send(validBody());
      const del = await request(app).delete(`/api/merchants/${created.body.id}`);
      expect(del.status).toBe(204);

      const second = await request(app).delete(`/api/merchants/${created.body.id}`);
      expect(second.status).toBe(404);
    });
  });
});
