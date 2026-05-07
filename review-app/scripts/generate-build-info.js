import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pkgPath = resolve(__dirname, '../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch {}

const buildTime = new Date().toISOString();

const content = `export const BUILD_INFO = {
  version: ${JSON.stringify(pkg.version)},
  buildNumber: ${JSON.stringify(commitHash)},
  buildTime: ${JSON.stringify(buildTime)},
} as const;
`;

const outPath = resolve(__dirname, '../src/build-info.ts');
writeFileSync(outPath, content, 'utf-8');
console.log(`Build info generated: version=${pkg.version} build=${commitHash} time=${buildTime}`);
