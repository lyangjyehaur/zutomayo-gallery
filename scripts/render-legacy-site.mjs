import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function normalizeMigrationTarget(rawTarget) {
  const target = new URL(String(rawTarget || '').trim());
  if (!['http:', 'https:'].includes(target.protocol)) {
    throw new Error('Migration target must use http or https');
  }
  target.hash = '';
  return target.toString().replace(/\/$/, '');
}

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

export function renderLegacySite(template, rawTarget) {
  const target = normalizeMigrationTarget(rawTarget);
  const escapedTarget = escapeHtml(target);
  const rendered = template
    .replaceAll('__MIGRATION_TARGET_URL__', escapedTarget)
    .replaceAll('__MIGRATION_TARGET_LABEL__', escapedTarget);

  if (rendered.includes('__MIGRATION_TARGET_')) {
    throw new Error('Migration template contains an unresolved target placeholder');
  }
  return rendered;
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('Invalid render arguments');
    values[key.slice(2)] = value;
  }
  return values;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.template || !args.output || !args.target) {
    throw new Error('Usage: render-legacy-site --template <path> --output <path> --target <url>');
  }
  const template = fs.readFileSync(args.template, 'utf8');
  fs.writeFileSync(args.output, renderLegacySite(template, args.target), 'utf8');
}
