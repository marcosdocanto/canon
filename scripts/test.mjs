import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const browser = process.argv.includes('--browser');
const browserFiles = new Set(['studio.test.ts', 'studio-preview.test.ts']);
const files = readdirSync(new URL('../tests/', import.meta.url)).sort()
  .filter((file) => file.endsWith('.test.ts') && (browser ? browserFiles.has(file) : !browserFiles.has(file)))
  .map((file) => `tests/${file}`);
if (!files.length) throw new Error('No matching test files found');
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
