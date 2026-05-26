const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/redis');
const { truncateAll } = require('../helpers/db');
const courierRepo = require('../../src/repositories/courier.repository');

describe('Couriers', () => {
  let app;

  beforeAll(() => { app = createApp(); });
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => {
    await closePool();
    await closeRedis();
  });

  describe('repository', () => {
    test('create then findById returns same row', async () => {
      const created = await courierRepo.create({
        name: 'Mehmet',
        phone: '+905551112233',
        vehicle_type: 'motorcycle',
      });
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.name).toBe('Mehmet');
      expect(created.status).toBe('offline');
      const fetched = await courierRepo.findById(created.id);
      expect(fetched).toEqual(created);
    });

    test('findAll returns rows in newest-first order', async () => {
      const a = await courierRepo.create({ name: 'A', phone: '+901111111111' });
      const b = await courierRepo.create({ name: 'B', phone: '+902222222222' });
      const list = await courierRepo.findAll();
      expect(list.map((c) => c.id)).toEqual([b.id, a.id]);
    });

    test('update returns the updated row', async () => {
      const c = await courierRepo.create({ name: 'A', phone: '+901111111111' });
      const updated = await courierRepo.update(c.id, { status: 'idle' });
      expect(updated.status).toBe('idle');
      expect(updated.name).toBe('A');
    });

    test('update returns null when id does not exist', async () => {
      expect(await courierRepo.update(
        '00000000-0000-0000-0000-000000000000',
        { name: 'X' },
      )).toBeNull();
    });

    test('delete returns true when row existed, false otherwise', async () => {
      const c = await courierRepo.create({ name: 'A', phone: '+901111111111' });
      expect(await courierRepo.deleteById(c.id)).toBe(true);
      expect(await courierRepo.deleteById(c.id)).toBe(false);
    });

    test('findById returns null when id does not exist', async () => {
      expect(await courierRepo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });

    test('create fails when phone is duplicate', async () => {
      await courierRepo.create({ name: 'A', phone: '+905551112233' });
      await expect(
        courierRepo.create({ name: 'B', phone: '+905551112233' }),
      ).rejects.toThrow(/unique/i);
    });
  });

  describe('service', () => {
    const courierSvc = require('../../src/services/courier.service');

    test('getById throws 404 HttpError when not found', async () => {
      await expect(
        courierSvc.getById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('update throws 404 when id does not exist', async () => {
      await expect(
        courierSvc.update('00000000-0000-0000-0000-000000000000', { status: 'idle' }),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('remove throws 404 when id does not exist', async () => {
      await expect(
        courierSvc.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('create surfaces duplicate phone as 400 DUPLICATE_PHONE', async () => {
      await courierSvc.create({ name: 'A', phone: '+905551112233' });
      await expect(
        courierSvc.create({ name: 'B', phone: '+905551112233' }),
      ).rejects.toMatchObject({ status: 400, code: 'DUPLICATE_PHONE' });
    });
  });

  describe('HTTP', () => {
    const validBody = () => ({
      name: 'Mehmet',
      phone: '+905551112233',
      vehicle_type: 'motorcycle',
    });

    test('POST /api/couriers -> 201 with created entity', async () => {
      const res = await request(app).post('/api/couriers').send(validBody());
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.status).toBe('offline');
    });

    test('POST /api/couriers -> 400 when name missing', async () => {
      const body = validBody();
      delete body.name;
      const res = await request(app).post('/api/couriers').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('POST /api/couriers -> 400 when vehicle_type not in enum', async () => {
      const res = await request(app)
        .post('/api/couriers')
        .send({ ...validBody(), vehicle_type: 'spaceship' });
      expect(res.status).toBe(400);
    });

    test('POST /api/couriers -> 400 DUPLICATE_PHONE on second create with same phone', async () => {
      await request(app).post('/api/couriers').send(validBody());
      const res = await request(app)
        .post('/api/couriers')
        .send({ ...validBody(), name: 'Other' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_PHONE');
    });

    test('GET /api/couriers -> 200 with array', async () => {
      await request(app).post('/api/couriers').send(validBody());
      await request(app).post('/api/couriers').send({ ...validBody(), phone: '+905552223344' });
      const res = await request(app).get('/api/couriers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('GET /api/couriers/:id -> 200 with entity', async () => {
      const created = await request(app).post('/api/couriers').send(validBody());
      const res = await request(app).get(`/api/couriers/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    test('GET /api/couriers/:id -> 404 when not found', async () => {
      const res = await request(app).get('/api/couriers/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });

    test('PATCH /api/couriers/:id -> 200 with updated entity', async () => {
      const created = await request(app).post('/api/couriers').send(validBody());
      const res = await request(app)
        .patch(`/api/couriers/${created.body.id}`)
        .send({ status: 'idle' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('idle');
    });

    test('PATCH /api/couriers/:id -> 400 when body empty', async () => {
      const created = await request(app).post('/api/couriers').send(validBody());
      const res = await request(app).patch(`/api/couriers/${created.body.id}`).send({});
      expect(res.status).toBe(400);
    });

    test('DELETE /api/couriers/:id -> 204 then 404', async () => {
      const created = await request(app).post('/api/couriers').send(validBody());
      const del = await request(app).delete(`/api/couriers/${created.body.id}`);
      expect(del.status).toBe(204);
      const second = await request(app).delete(`/api/couriers/${created.body.id}`);
      expect(second.status).toBe(404);
    });
  });
});
