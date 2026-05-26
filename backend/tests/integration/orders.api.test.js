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
});
