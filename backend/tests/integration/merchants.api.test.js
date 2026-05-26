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
});
