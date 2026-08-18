import assert from 'node:assert/strict';
import test from 'node:test';

import { loadAfterCommit } from './post-commit-cache.js';

test('loadAfterCommit captures a post-commit reload failure instead of rejecting', async () => {
  const expectedError = new Error('reload failed');
  const result = await loadAfterCommit(async () => { throw expectedError; });

  assert.deepEqual(result, { ok: false, error: expectedError });
});
