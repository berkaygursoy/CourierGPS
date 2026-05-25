const { getPool } = require('../config/database');
const { getRedis } = require('../config/redis');

async function checkDatabase() {
  try {
    await getPool().query('SELECT 1');
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function checkRedis() {
  try {
    const reply = await getRedis().ping();
    return reply === 'PONG' ? { status: 'ok' } : { status: 'error', message: `Unexpected: ${reply}` };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function getHealth(_req, res) {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const overall = database.status === 'ok' && redis.status === 'ok' ? 'ok' : 'degraded';
  const httpStatus = overall === 'ok' ? 200 : 503;

  res.status(httpStatus).json({
    status: overall,
    checks: { database, redis },
  });
}

module.exports = { getHealth };
