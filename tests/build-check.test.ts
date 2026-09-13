import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createSystem, loadDesignDir, writeDesignDir } from '../src/system.ts';
import { buildSystem } from '../src/build.ts';

const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url));

async function fixture(t: { after: (cleanup: () => void) => void }) {
  const root = mkdtempSync(join(tmpdir(), 'canon-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const design = join(root, 'design');
  const system = await createSystem({ name: 'Check fixture', prefix: 'fx' });
  system.components = system.components.filter((c) => c.slug === 'button');
  system.patterns = [];
  writeDesignDir(system, design);
  const result = await buildSystem(loadDesignDir(design), design);
  const check = () => spawnSync(process.execPath, [cli, 'check', '--design', design], { cwd: root, encoding: 'utf8' });
  return { root, design, dist: result.outDir, check };
}

test('check accepts a complete build and rejects missing generated files', async (t) => {
  const { dist, check } = await fixture(t);
  const complete = check();
  assert.equal(complete.status, 0, complete.stderr || complete.stdout);
  rmSync(join(dist, 'react', 'button.tsx'));
  const missing = check();
  assert.equal(missing.status, 1, missing.stdout);
  assert.match(missing.stdout, /react\/button\.tsx/);
});

test('check rejects changed generated file content', async (t) => {
  const { dist, check } = await fixture(t);
  writeFileSync(join(dist, 'tokens.css'), ':root { --tampered: 1; }\n');
  const result = check();
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /tokens\.css/);
});

test('check rejects a manifest written by a different compiler version', async (t) => {
  const { dist, check } = await fixture(t);
  const lock = join(dist, 'canon.lock.json');
  const manifest = JSON.parse(readFileSync(lock, 'utf8'));
  manifest.canon = '0.0.0';
  writeFileSync(lock, JSON.stringify(manifest));
  const result = check();
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /compiler|version/i);
});

test('check rejects changed design source', async (t) => {
  const { design, check } = await fixture(t);
  const source = join(design, 'system.json');
  const meta = JSON.parse(readFileSync(source, 'utf8'));
  meta.description = 'changed since build';
  writeFileSync(source, JSON.stringify(meta));
  const result = check();
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /stale|source|changed/i);
});

test('a partial build cannot certify old output from other generators', async (t) => {
  const { design, check } = await fixture(t);
  const system = loadDesignDir(design);
  system.meta.description = 'new source, only CSS rebuilt';
  writeDesignDir(system, design);
  await buildSystem(loadDesignDir(design), design, { only: ['css'] });
  const result = check();
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /incomplete|generator|coverage/i);
});

test('check rejects a legacy source-only lock even when its source hash matches', async (t) => {
  const { dist, check } = await fixture(t);
  const lock = join(dist, 'canon.lock.json');
  const manifest = JSON.parse(readFileSync(lock, 'utf8'));
  delete manifest.manifestVersion;
  delete manifest.generators;
  delete manifest.files;
  writeFileSync(lock, JSON.stringify(manifest));
  const result = check();
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /manifest|rebuild|build/i);
});
