import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');

const versionTargets = [
  { file: 'package-lock.json', kind: 'lock' },
  { file: 'frontend/package.json', kind: 'package' },
  { file: 'frontend/package-lock.json', kind: 'lock' },
  { file: 'backend/package.json', kind: 'package' },
  { file: 'backend/package-lock.json', kind: 'lock' },
  { file: 'review-app/package.json', kind: 'package' },
  { file: 'review-app/package-lock.json', kind: 'lock' },
];

const readmeTargets = [
  'README.md',
  'README.en.md',
  'README.ja.md',
  'README.zh-Hans.md',
];

function readJson(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
}

function writeJson(relativePath, value) {
  const absolutePath = path.join(rootDir, relativePath);
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function syncJsonVersion(relativePath, version, kind, changedFiles, mismatches) {
  const json = readJson(relativePath);
  let changed = false;

  if (kind === 'package') {
    if (json.version !== version) {
      mismatches.push(`${relativePath}: ${json.version ?? 'missing'} -> ${version}`);
      json.version = version;
      changed = true;
    }
  } else {
    if (json.version !== version) {
      mismatches.push(`${relativePath}#version: ${json.version ?? 'missing'} -> ${version}`);
      json.version = version;
      changed = true;
    }

    if (json.packages?.[''] && json.packages[''].version !== version) {
      mismatches.push(`${relativePath}#packages[""].version: ${json.packages[''].version ?? 'missing'} -> ${version}`);
      json.packages[''].version = version;
      changed = true;
    }
  }

  if (changed) {
    if (checkOnly) {
      return;
    }
    writeJson(relativePath, json);
    changedFiles.push(relativePath);
  }
}

function syncReadmeBadge(relativePath, version, changedFiles, mismatches) {
  const absolutePath = path.join(rootDir, relativePath);
  const current = fs.readFileSync(absolutePath, 'utf-8');
  const next = current.replace(/version-[0-9A-Za-z.+-]+-blue/g, `version-${version}-blue`);

  if (next === current) {
    return;
  }

  mismatches.push(`${relativePath}: version badge -> ${version}`);

  if (checkOnly) {
    return;
  }

  fs.writeFileSync(absolutePath, next);
  changedFiles.push(relativePath);
}

function syncOptionalVersionJson(version, changedFiles, mismatches) {
  const relativePath = 'frontend/public/version.json';
  const absolutePath = path.join(rootDir, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return;
  }

  const json = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
  if (json.version === version) {
    return;
  }

  mismatches.push(`${relativePath}: ${json.version ?? 'missing'} -> ${version}`);
  json.version = version;

  if (checkOnly) {
    return;
  }

  fs.writeFileSync(absolutePath, `${JSON.stringify(json, null, 2)}\n`);
  changedFiles.push(relativePath);
}

const rootPackage = readJson('package.json');
const rootVersion = rootPackage.version;
const changedFiles = [];
const mismatches = [];

if (typeof rootVersion !== 'string' || rootVersion.length === 0) {
  console.error('Root package.json is missing a valid version field.');
  process.exit(1);
}

for (const target of versionTargets) {
  syncJsonVersion(target.file, rootVersion, target.kind, changedFiles, mismatches);
}

for (const relativePath of readmeTargets) {
  syncReadmeBadge(relativePath, rootVersion, changedFiles, mismatches);
}

syncOptionalVersionJson(rootVersion, changedFiles, mismatches);

if (checkOnly) {
  if (mismatches.length > 0) {
    console.error('Version drift detected:');
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch}`);
    }
    process.exit(1);
  }
  console.log(`Version metadata is consistent at ${rootVersion}.`);
  process.exit(0);
}

if (changedFiles.length === 0) {
  console.log(`Version metadata already matches ${rootVersion}.`);
  process.exit(0);
}

console.log(`Synced version ${rootVersion} to:`);
for (const changedFile of changedFiles) {
  console.log(`- ${changedFile}`);
}
