import { existsSync } from 'fs';
import { execSync } from 'child_process';

const workspaces = [
  { dir: 'frontend', args: '--legacy-peer-deps' },
  { dir: 'backend', args: '' },
  { dir: 'review-app', args: '' },
];

for (const { dir, args } of workspaces) {
  if (!existsSync(`${dir}/node_modules`)) {
    console.log(`[preflight] Installing dependencies for ${dir}...`);
    execSync(`npm --prefix ${dir} install ${args}`.trim(), { stdio: 'inherit' });
  }
}

console.log('[preflight] All dependencies ready.');
