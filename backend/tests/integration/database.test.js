const { getPool, closePool } = require('../../src/config/database');

describe('database pool', () => {
  afterAll(async () => {
    await closePool();
  });

  test('getPool() returns a singleton pool', () => {
    const a = getPool();
    const b = getPool();
    expect(a).toBe(b);
  });

  test('pool can execute SELECT 1', async () => {
    const pool = getPool();
    const result = await pool.query('SELECT 1 AS one');
    expect(result.rows[0].one).toBe(1);
  });

  test('pool can fetch postgres version', async () => {
    const pool = getPool();
    const result = await pool.query('SELECT version()');
    expect(result.rows[0].version).toMatch(/PostgreSQL/);
  });
});
