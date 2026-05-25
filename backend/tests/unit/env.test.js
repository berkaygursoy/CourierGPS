describe('env config', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';

    expect(() => require('../../src/config/env')).toThrow(/DATABASE_URL/);
  });

  test('throws when REDIS_URL is missing', () => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    delete process.env.REDIS_URL;
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';

    expect(() => require('../../src/config/env')).toThrow(/REDIS_URL/);
  });

  test('defaults PORT to 3000 when not provided', () => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    process.env.REDIS_URL = 'redis://localhost:6379';
    delete process.env.PORT;
    process.env.NODE_ENV = 'test';

    const env = require('../../src/config/env');
    expect(env.PORT).toBe(3000);
  });

  test('parses PORT as integer', () => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.PORT = '4567';
    process.env.NODE_ENV = 'test';

    const env = require('../../src/config/env');
    expect(env.PORT).toBe(4567);
    expect(typeof env.PORT).toBe('number');
  });

  test('rejects invalid NODE_ENV', () => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.NODE_ENV = 'invalid';

    expect(() => require('../../src/config/env')).toThrow(/NODE_ENV/);
  });
});
