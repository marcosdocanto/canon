import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adopt } from '../src/adopt.ts';
import { findProject } from '../src/project.ts';
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
});
