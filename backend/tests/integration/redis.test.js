const { getRedis, getSubscriber, getPublisher, closeRedis } = require('../../src/config/redis');

describe('redis clients', () => {
  afterAll(async () => {
    await closeRedis();
  });

  test('getRedis() returns a singleton command client', () => {
    expect(getRedis()).toBe(getRedis());
  });

  test('getPublisher() and getSubscriber() return distinct clients', () => {
    const pub = getPublisher();
    const sub = getSubscriber();
    expect(pub).not.toBe(sub);
    expect(pub).not.toBe(getRedis());
  });

  test('command client responds to PING', async () => {
    const redis = getRedis();
    const reply = await redis.ping();
    expect(reply).toBe('PONG');
  });

  test('publisher can publish and subscriber can receive', async () => {
    const pub = getPublisher();
    const sub = getSubscriber();
    const channel = 'test:channel:' + Date.now();

    const received = new Promise((resolve) => {
      sub.subscribe(channel, () => {
        sub.on('message', (ch, msg) => {
          if (ch === channel) resolve(msg);
        });
        pub.publish(channel, 'hello');
      });
    });

    await expect(received).resolves.toBe('hello');
  });
});
