const request = require('supertest');
const { createApp } = require('../../src/app');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/redis');
const { truncateAll } = require('../helpers/db');
const merchantRepo = require('../../src/repositories/merchant.repository');
const courierRepo = require('../../src/repositories/courier.repository');
const orderRepo = require('../../src/repositories/order.repository');

describe('Orders', () => {
  let app;
  let merchant;
  let courier;

  beforeAll(() => { app = createApp(); });

  beforeEach(async () => {
    await truncateAll();
    merchant = await merchantRepo.create({
      name: 'M1', address: 'addr', latitude: 41, longitude: 28,
    });
    courier = await courierRepo.create({
      name: 'C1', phone: '+905551112233', vehicle_type: 'bike',
    });
  });

  afterAll(async () => {
    await closePool();
    await closeRedis();
  });

  describe('repository', () => {
    const baseOrder = () => ({
      merchant_id: merchant.id,
      customer_name: 'Ali',
      delivery_address: '1 Customer St',
      delivery_lat: 41.01,
      delivery_lng: 28.98,
    });

    test('create then findById returns same row with defaults applied', async () => {
      const created = await orderRepo.create(baseOrder());
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(created.status).toBe('pending');
      expect(created.courier_id).toBeNull();
      const fetched = await orderRepo.findById(created.id);
      expect(fetched).toEqual(created);
    });

    test('findAll returns rows in newest-first order', async () => {
      const a = await orderRepo.create(baseOrder());
      const b = await orderRepo.create(baseOrder());
      const list = await orderRepo.findAll({});
      expect(list.map((o) => o.id)).toEqual([b.id, a.id]);
    });

    test('findAll filters by status', async () => {
      const a = await orderRepo.create(baseOrder());
      await orderRepo.create(baseOrder());
      await orderRepo.update(a.id, { status: 'delivered' });
      const delivered = await orderRepo.findAll({ status: 'delivered' });
      expect(delivered).toHaveLength(1);
      expect(delivered[0].id).toBe(a.id);
    });

    test('findAll filters by courier_id', async () => {
      const a = await orderRepo.create(baseOrder());
      await orderRepo.create(baseOrder());
      await orderRepo.update(a.id, { courier_id: courier.id });
      const filtered = await orderRepo.findAll({ courier_id: courier.id });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(a.id);
    });

    test('update sets courier_id and assigned_at when assigning', async () => {
      const o = await orderRepo.create(baseOrder());
      const updated = await orderRepo.update(o.id, {
        courier_id: courier.id,
        status: 'assigned',
        assigned_at: new Date(),
      });
      expect(updated.courier_id).toBe(courier.id);
      expect(updated.status).toBe('assigned');
      expect(updated.assigned_at).toBeInstanceOf(Date);
    });

    test('update returns null when id does not exist', async () => {
      expect(await orderRepo.update(
        '00000000-0000-0000-0000-000000000000',
        { status: 'delivered' },
      )).toBeNull();
    });

    test('delete returns true when row existed, false otherwise', async () => {
      const o = await orderRepo.create(baseOrder());
      expect(await orderRepo.deleteById(o.id)).toBe(true);
      expect(await orderRepo.deleteById(o.id)).toBe(false);
    });

    test('create fails when merchant_id does not exist', async () => {
      await expect(
        orderRepo.create({ ...baseOrder(), merchant_id: '00000000-0000-0000-0000-000000000000' }),
      ).rejects.toThrow(/foreign key/i);
    });
  });

  describe('service', () => {
    const orderSvc = require('../../src/services/order.service');

    const baseOrder = () => ({
      merchant_id: merchant.id,
      customer_name: 'Ali',
      delivery_address: '1 St',
      delivery_lat: 41.01,
      delivery_lng: 28.98,
    });

    test('create surfaces missing merchant as 400 INVALID_REFERENCE', async () => {
      await expect(
        orderSvc.create({ ...baseOrder(), merchant_id: '00000000-0000-0000-0000-000000000000' }),
      ).rejects.toMatchObject({ status: 400, code: 'INVALID_REFERENCE' });
    });

    test('getById throws 404 when not found', async () => {
      await expect(
        orderSvc.getById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('assigning a courier auto-sets status=assigned and assigned_at', async () => {
      const o = await orderSvc.create(baseOrder());
      const updated = await orderSvc.update(o.id, { courier_id: courier.id });
      expect(updated.status).toBe('assigned');
      expect(updated.courier_id).toBe(courier.id);
      expect(updated.assigned_at).not.toBeNull();
    });

    test('clearing courier_id sets status back to pending', async () => {
      const o = await orderSvc.create(baseOrder());
      await orderSvc.update(o.id, { courier_id: courier.id });
      const updated = await orderSvc.update(o.id, { courier_id: null });
      expect(updated.courier_id).toBeNull();
      expect(updated.status).toBe('pending');
    });

    test('setting status=picked_up stamps picked_up_at', async () => {
      const o = await orderSvc.create(baseOrder());
      await orderSvc.update(o.id, { courier_id: courier.id });
      const updated = await orderSvc.update(o.id, { status: 'picked_up' });
      expect(updated.status).toBe('picked_up');
      expect(updated.picked_up_at).not.toBeNull();
    });

    test('setting status=delivered stamps delivered_at', async () => {
      const o = await orderSvc.create(baseOrder());
      await orderSvc.update(o.id, { courier_id: courier.id });
      const updated = await orderSvc.update(o.id, { status: 'delivered' });
      expect(updated.delivered_at).not.toBeNull();
    });

    test('update surfaces missing courier_id as 400 INVALID_REFERENCE', async () => {
      const o = await orderSvc.create(baseOrder());
      await expect(
        orderSvc.update(o.id, { courier_id: '00000000-0000-0000-0000-000000000000' }),
      ).rejects.toMatchObject({ status: 400, code: 'INVALID_REFERENCE' });
    });

    test('remove throws 404 when id does not exist', async () => {
      await expect(
        orderSvc.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });
  });

  describe('HTTP', () => {
    const baseBody = () => ({
      merchant_id: merchant.id,
      customer_name: 'Ali',
      delivery_address: '1 Customer St',
      delivery_lat: 41.01,
      delivery_lng: 28.98,
    });

    test('POST /api/orders -> 201 with created entity', async () => {
      const res = await request(app).post('/api/orders').send(baseBody());
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.status).toBe('pending');
      expect(res.body.courier_id).toBeNull();
    });

    test('POST /api/orders -> 400 INVALID_REFERENCE when merchant_id unknown', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ ...baseBody(), merchant_id: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_REFERENCE');
    });

    test('POST /api/orders -> 400 VALIDATION_ERROR when latitude missing', async () => {
      const body = baseBody();
      delete body.delivery_lat;
      const res = await request(app).post('/api/orders').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('GET /api/orders -> 200 with all orders', async () => {
      await request(app).post('/api/orders').send(baseBody());
      await request(app).post('/api/orders').send(baseBody());
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('GET /api/orders?status=delivered -> filters list', async () => {
      const a = await request(app).post('/api/orders').send(baseBody());
      await request(app).post('/api/orders').send(baseBody());
      await request(app)
        .patch(`/api/orders/${a.body.id}`)
        .send({ courier_id: courier.id });
      await request(app)
        .patch(`/api/orders/${a.body.id}`)
        .send({ status: 'delivered' });

      const res = await request(app).get('/api/orders?status=delivered');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(a.body.id);
    });

    test('GET /api/orders/:id -> 200 with entity', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const res = await request(app).get(`/api/orders/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    test('GET /api/orders/:id -> 404 when not found', async () => {
      const res = await request(app).get('/api/orders/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });

    test('PATCH /api/orders/:id -> assigns courier and auto-sets status=assigned', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const res = await request(app)
        .patch(`/api/orders/${created.body.id}`)
        .send({ courier_id: courier.id });
      expect(res.status).toBe(200);
      expect(res.body.courier_id).toBe(courier.id);
      expect(res.body.status).toBe('assigned');
      expect(res.body.assigned_at).not.toBeNull();
    });

    test('PATCH /api/orders/:id -> 400 INVALID_REFERENCE for missing courier_id', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const res = await request(app)
        .patch(`/api/orders/${created.body.id}`)
        .send({ courier_id: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_REFERENCE');
    });

    test('PATCH /api/orders/:id -> status=delivered stamps delivered_at', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      await request(app)
        .patch(`/api/orders/${created.body.id}`)
        .send({ courier_id: courier.id });
      const res = await request(app)
        .patch(`/api/orders/${created.body.id}`)
        .send({ status: 'delivered' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('delivered');
      expect(res.body.delivered_at).not.toBeNull();
    });

    test('PATCH /api/orders/:id -> 400 when body empty', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const res = await request(app).patch(`/api/orders/${created.body.id}`).send({});
      expect(res.status).toBe(400);
    });

    test('PATCH /api/orders/:id -> 404 when not found', async () => {
      const res = await request(app)
        .patch('/api/orders/00000000-0000-0000-0000-000000000000')
        .send({ status: 'cancelled' });
      expect(res.status).toBe(404);
    });

    test('DELETE /api/orders/:id -> 204 then 404', async () => {
      const created = await request(app).post('/api/orders').send(baseBody());
      const del = await request(app).delete(`/api/orders/${created.body.id}`);
      expect(del.status).toBe(204);
      const second = await request(app).delete(`/api/orders/${created.body.id}`);
      expect(second.status).toBe(404);
    });
  });
});
