import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeMigrationTarget, renderLegacySite } from './render-legacy-site.mjs';

test('renders the migration target without leaving domain placeholders', () => {
  const rendered = renderLegacySite(
    '<a href="__MIGRATION_TARGET_URL__">__MIGRATION_TARGET_LABEL__</a>',
    'https://new.example/',
  );
  assert.equal(rendered, '<a href="https://new.example">https://new.example</a>');
});

test('rejects non-http migration targets', () => {
  assert.throws(() => normalizeMigrationTarget('javascript:alert(1)'), /http or https/);
});
