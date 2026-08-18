import assert from 'node:assert/strict';
import test from 'node:test';

import { updateAnnotationSchema } from './annotation.validator.js';

test('updateAnnotationSchema accepts an explicit empty translation map', () => {
  assert.deepEqual(updateAnnotationSchema.parse({ label_i18n: {} }), { label_i18n: {} });
});
