import assert from 'node:assert/strict';
import test from 'node:test';

import { getUrlOriginForLog } from './sensitive-url.js';

test('getUrlOriginForLog removes credentials, device keys, paths, and query parameters', () => {
  const result = getUrlOriginForLog('https://user:password@push.example.test/device-key/title?token=secret');

  assert.equal(result, 'https://push.example.test');
  assert.equal(result?.includes('device-key'), false);
  assert.equal(result?.includes('secret'), false);
});

test('getUrlOriginForLog returns undefined for malformed URLs', () => {
  assert.equal(getUrlOriginForLog('not a URL/device-key'), undefined);
});
