import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findProject, projectWrite } from '../src/project.ts';
import { installFiles } from '../src/design-files.ts';
import { getAdapter, detectAdapter } from '../src/adapters/index.ts';

test('project config round-trips the adapter field and stays version 1', (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon adapter cfg-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'design'), { recursive: true });
  installFiles(root, [projectWrite(root, join(root, 'design'), 'shadcn')]);
  const project = findProject(root);
  assert.equal(project?.adapter, 'shadcn');
  // native projects keep working: no adapter field present
  installFiles(root, [projectWrite(root, join(root, 'design'))]);
  assert.equal(findProject(root)?.adapter, undefined);
});

test('an invalid adapter value in the config is rejected', (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon adapter bad-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.canon'), { recursive: true });
  writeFileSync(join(root, '.canon', 'project.json'),
    JSON.stringify({ version: 1, design: 'design', adapter: '../evil' }));
  assert.throws(() => findProject(root), /Invalid Canon project configuration/);
});

test('registry: unknown adapter throws, detect returns undefined on plain dirs', (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon adapter reg-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => getAdapter('nope'), /Unknown adapter/);
  assert.equal(detectAdapter(root), undefined);
});
