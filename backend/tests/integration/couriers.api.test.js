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
});
