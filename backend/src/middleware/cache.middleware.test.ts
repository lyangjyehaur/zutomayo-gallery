import assert from 'node:assert/strict';
import test from 'node:test';
import { cacheMiddleware } from './cache.middleware.js';
import { redisClient } from '../services/redis.service.js';

test('cacheMiddleware bypasses Redis for authenticated sessions', async () => {
  const originalIsOpen = Object.getOwnPropertyDescriptor(redisClient, 'isOpen');
  const originalGet = redisClient.get;
  const originalSetEx = redisClient.setEx;
  let getCalled = false;
  let setExCalled = false;

  Object.defineProperty(redisClient, 'isOpen', { configurable: true, value: true });
  (redisClient as any).get = async () => {
    getCalled = true;
    return null;
  };
  (redisClient as any).setEx = async () => {
    setExCalled = true;
    return 'OK';
  };

  try {
    const req = {
      method: 'GET',
      originalUrl: '/api/artist',
      headers: {},
      session: { userId: 'admin-user' },
    } as any;
    const res = {
      statusCode: 200,
      setHeader: () => undefined,
      json: () => res,
      send: () => res,
    } as any;
    let nextCalled = false;

    await cacheMiddleware(300)(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(getCalled, false);

    res.json({ success: true });
    assert.equal(setExCalled, false);
  } finally {
    if (originalIsOpen) {
      Object.defineProperty(redisClient, 'isOpen', originalIsOpen);
    } else {
      delete (redisClient as any).isOpen;
    }
    (redisClient as any).get = originalGet;
    (redisClient as any).setEx = originalSetEx;
  }
});
