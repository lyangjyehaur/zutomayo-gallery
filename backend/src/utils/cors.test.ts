import assert from 'node:assert/strict';
import test from 'node:test';
import { isCorsOriginAllowed, resolveCorsOrigin } from './cors.js';

const withCorsEnv = (values: Record<string, string | undefined>, run: () => void) => {
  const previous = {
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    DEV_ALLOWED_ORIGINS: process.env.DEV_ALLOWED_ORIGINS,
    NODE_ENV: process.env.NODE_ENV,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });

  try {
    run();
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
};

test('allows requests without Origin and configured production origins', () => {
  withCorsEnv({
    NODE_ENV: 'production',
    ALLOWED_ORIGINS: 'https://gallery.example, https://review.example',
    DEV_ALLOWED_ORIGINS: 'http://localhost:5173',
  }, () => {
    assert.equal(isCorsOriginAllowed(undefined), true);
    assert.equal(isCorsOriginAllowed('https://gallery.example'), true);
    assert.equal(resolveCorsOrigin('https://review.example'), 'https://review.example');
  });
});

test('refuses an unconfigured Origin without turning the decision into an error', () => {
  withCorsEnv({
    NODE_ENV: 'production',
    ALLOWED_ORIGINS: 'https://gallery.example',
    DEV_ALLOWED_ORIGINS: 'http://localhost:5173',
  }, () => {
    assert.equal(isCorsOriginAllowed('https://attacker.example'), false);
    assert.equal(isCorsOriginAllowed('http://localhost:5173'), false);
    assert.equal(resolveCorsOrigin('https://attacker.example'), undefined);
  });
});

test('supports wildcard configuration explicitly', () => {
  withCorsEnv({ NODE_ENV: 'production', ALLOWED_ORIGINS: '*' }, () => {
    assert.equal(isCorsOriginAllowed('https://any.example'), true);
  });
});
