const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

let pool = null;

function getPool() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL pool error', { message: err.message });
  });

  return pool;
}

async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

module.exports = { getPool, closePool };
