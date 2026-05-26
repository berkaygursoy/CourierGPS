const { getPool } = require('../../src/config/database');

const TABLES_IN_DELETE_ORDER = [
  'location_snapshots',
  'orders',
  'couriers',
  'merchants',
  'users',
];

async function truncateAll() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const table of TABLES_IN_DELETE_ORDER) {
      await client.query(`DELETE FROM ${table}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { truncateAll };
