import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adopt } from '../src/adopt.ts';
import { findProject, projectWrite } from '../src/project.ts';
import { installFiles } from '../src/design-files.ts';
import { clone, FIXTURE } from './fixtures/clone.ts';

/** Sorted, recursive listing of every entry under `dir`, for before/after "nothing touched" checks. */
function snapshot(dir: string): string[] {
  return readdirSync(dir, { recursive: true }).map(String).sort();
}

test('no supported library detected: throws and leaves the directory untouched', async (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon adopt none-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  await assert.rejects(
    () => adopt({ root, apply: false, hooks: true }),
    /No supported component library detected/,
  );
  assert.deepEqual(readdirSync(root), [], 'plan-phase throw must not create anything');

  await assert.rejects(
    () => adopt({ root, apply: true, hooks: true }),
    /No supported component library detected/,
  );
  assert.deepEqual(readdirSync(root), [], 'apply-phase throw must not create anything either');
});

test('plan only (apply: false): lists the key targets and per-component notes, touches nothing', async (t) => {
  const root = clone(t);
  const before = snapshot(root);

  const result = await adopt({ root, apply: false, hooks: true });

  assert.equal(result.applied, false);
  assert.ok(result.plan.some((line) => line.includes('.canon/project.json')), 'plan mentions the project config');
  assert.ok(result.plan.some((line) => line.includes('stories/canon/button.stories.tsx')), 'plan mentions the button story');
  assert.ok(result.plan.some((line) => line.includes('stories/canon/badge.stories.tsx')), 'plan mentions the badge story');
  assert.ok(result.plan.some((line) => line.includes('design/system.json')), 'plan mentions the design dir');
  assert.ok(result.plan.some((line) => line.includes('DESIGN.md')), 'plan mentions DESIGN.md');
  assert.ok(result.plan.some((line) => line.includes('AGENTS.md')), 'plan mentions AGENTS.md');
  assert.ok(result.plan.some((line) => line === 'button: 2 axes, 10 variants'), 'per-component note for button');
  assert.ok(result.plan.some((line) => line === 'badge: read-only (template interpolation)'), 'per-component note for badge');
  for (const line of result.plan) assert.match(line, /^(create|update) |: /, `plan line has an unexpected shape: "${line}"`);

  // Library mode has no Canon-authored catalog: the plan must never carry Canon's native
  // component/pattern JSONs (the target library's own code is the catalog).
  assert.ok(!result.plan.some((line) => line.includes('design/components/')), 'plan must not list native catalog components');
  assert.ok(!result.plan.some((line) => line.includes('design/patterns/')), 'plan must not list native catalog patterns');

  const after = snapshot(root);
  assert.deepEqual(after, before, 'plan phase must not touch the filesystem');
});

test('apply: true adopts the fixture end to end without touching the theme file', async (t) => {
  const root = clone(t);

  const result = await adopt({ root, apply: true, hooks: true });
  assert.equal(result.applied, true);
  assert.ok(result.plan.length > 0);

  const project = findProject(root);
  assert.equal(project?.adapter, 'shadcn');
  assert.ok(existsSync(join(root, 'design', 'system.json')), 'design dir was written');
  assert.ok(existsSync(join(root, 'design', 'tokens.json')));

  const designmd = readFileSync(join(root, 'DESIGN.md'), 'utf8');
  assert.ok(designmd.includes('~/ui/button'), 'DESIGN.md documents the real import path');

  const globalsBefore = readFileSync(join(FIXTURE, 'app', 'globals.css'));
  const globalsAfter = readFileSync(join(root, 'app', 'globals.css'));
  assert.ok(globalsAfter.equals(globalsBefore), 'adopt must never touch the theme file (no writeTheme call)');

  // Task 3's deferred coverage: themeToOverrides exercised through the full round trip — the
  // fixture's --background light value must land on the created system's bg-canvas token.
  const tokens = JSON.parse(readFileSync(join(root, 'design', 'tokens.json'), 'utf8'));
  assert.equal(tokens.color.semantic['bg-canvas'].light, 'oklch(1 0 0)');
  assert.equal(tokens.color.semantic['bg-canvas'].dark, 'oklch(0.145 0 0)');

  assert.ok(existsSync(join(root, 'stories', 'canon', 'button.stories.tsx')));
  assert.ok(existsSync(join(root, '.mcp.json')));

  // Library mode: the design dir on disk must carry no native component/pattern JSONs.
  assert.ok(!existsSync(join(root, 'design', 'components')), 'no native components dir in adapter mode');
  assert.ok(!existsSync(join(root, 'design', 'patterns')), 'no native patterns dir in adapter mode');
});

test('refusal guard is root-local: a nested app under an unrelated adapter-mode ancestor still protects its own native design', async (t) => {
  // Parent directory happens to be an (unrelated) adapter-mode Canon project.
  const parent = realpathSync(mkdtempSync(join(tmpdir(), 'canon adopt ancestor-')));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  mkdirSync(join(parent, 'design'), { recursive: true });
  installFiles(parent, [projectWrite(parent, join(parent, 'design'), 'shadcn')]);

  // A nested shadcn app, with its own pre-existing NATIVE design/system.json, and no
  // `.canon/project.json` of its own — `findProject` walking up must not make this look
  // adapter-mode.
  const nested = join(parent, 'apps', 'nested-app');
  cpSync(FIXTURE, nested, { recursive: true });
  mkdirSync(join(nested, 'design'), { recursive: true });
  const nativeSystemJson = JSON.stringify({ marker: 'this nested app\'s own native design' });
  writeFileSync(join(nested, 'design', 'system.json'), nativeSystemJson);

  await assert.rejects(
    () => adopt({ root: nested, apply: true, hooks: true }),
    /already exists/,
  );

  assert.equal(
    readFileSync(join(nested, 'design', 'system.json'), 'utf8'),
    nativeSystemJson,
    "the nested app's own native design/system.json must be untouched",
  );
  assert.equal(findProject(nested)?.root, parent, 'sanity check: findProject really does walk up to the ancestor');
});
