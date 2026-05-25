require('dotenv').config();

const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { createApp } = require('./src/app');
const { closePool } = require('./src/config/database');
const { closeRedis } = require('./src/config/redis');

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`, {
    env: env.NODE_ENV,
  });
});

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(async () => {
    await closePool();
    await closeRedis();
    logger.info('Shutdown complete');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Force exit after 10s timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
