describe('logger', () => {
  let logger;

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'info';
    logger = require('../../src/utils/logger');
  });

  test('exposes info, warn, error, debug methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('does not throw when called', () => {
    expect(() => logger.info('test message', { ctx: 1 })).not.toThrow();
    expect(() => logger.error('err', new Error('boom'))).not.toThrow();
  });

  test('respects configured level (LOG_LEVEL=info hides debug)', () => {
    expect(logger.isDebugEnabled()).toBe(false);
    expect(logger.isLevelEnabled('info')).toBe(true);
  });
});
