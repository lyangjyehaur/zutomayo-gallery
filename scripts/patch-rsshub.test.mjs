import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'patch-rsshub.mjs');

test('patches the current minified Twitter GraphQL fetch and stays idempotent', () => {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsshub-patch-'));
  const bundlePath = path.join(distDir, 'twitter-api-current.mjs');

  try {
    fs.writeFileSync(
      bundlePath,
      'const marker="Twitter API error";let response=await l.fetch(g,{headers:{authority:`x.com`,accept:`*/*`}});',
      'utf8',
    );

    const env = { ...process.env, RSSHUB_DIST_DIR: distDir };
    const firstRun = execFileSync(process.execPath, [scriptPath], { env, encoding: 'utf8' });
    assert.match(firstRun, /Patched Twitter GraphQL GET -> POST/);
    assert.match(fs.readFileSync(bundlePath, 'utf8'), /fetch\(g,\{method:"POST",headers:\{authority:`x\.com`/);

    const secondRun = execFileSync(process.execPath, [scriptPath], { env, encoding: 'utf8' });
    assert.match(secondRun, /already patched/);
  } finally {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
});
