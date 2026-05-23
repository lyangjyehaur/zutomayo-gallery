import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getR2DevKeyPrefix, getR2ObjectKey } from './r2.service.js';

const withEnv = (env: Record<string, string | undefined>, fn: () => void) => {
  const previous = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]])
  ) as Record<string, string | undefined>;

  try {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

describe('r2.service object key prefixing', () => {
  it('prefixes non-production R2 keys under dev by default', () => {
    withEnv({ NODE_ENV: 'development', R2_DEV_KEY_PREFIX: undefined }, () => {
      assert.equal(getR2DevKeyPrefix(), 'dev');
      assert.equal(getR2ObjectKey('fanart/a.jpg'), 'dev/fanart/a.jpg');
      assert.equal(getR2ObjectKey('/fanart/a.jpg'), 'dev/fanart/a.jpg');
    });
  });

  it('does not double-prefix existing dev keys', () => {
    withEnv({ NODE_ENV: 'test', R2_DEV_KEY_PREFIX: 'dev' }, () => {
      assert.equal(getR2ObjectKey('dev/fanart/a.jpg'), 'dev/fanart/a.jpg');
    });
  });

  it('allows custom non-production prefix for isolated smoke tests', () => {
    withEnv({ NODE_ENV: 'development', R2_DEV_KEY_PREFIX: 'dev/twitter-smoke' }, () => {
      assert.equal(getR2DevKeyPrefix(), 'dev/twitter-smoke');
      assert.equal(getR2ObjectKey('fanart/a.jpg'), 'dev/twitter-smoke/fanart/a.jpg');
    });
  });

  it('allows disabling the non-production prefix explicitly', () => {
    withEnv({ NODE_ENV: 'development', R2_DEV_KEY_PREFIX: '' }, () => {
      assert.equal(getR2DevKeyPrefix(), '');
      assert.equal(getR2ObjectKey('fanart/a.jpg'), 'fanart/a.jpg');
    });
  });

  it('leaves production object keys unchanged', () => {
    withEnv({ NODE_ENV: 'production', R2_DEV_KEY_PREFIX: 'dev' }, () => {
      assert.equal(getR2DevKeyPrefix(), '');
      assert.equal(getR2ObjectKey('fanart/a.jpg'), 'fanart/a.jpg');
    });
  });
});
