import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, realpathSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from '../src/adapters/shadcn/config.ts';
import { readTheme, writeTheme } from '../src/adapters/shadcn/theme.ts';
import { systemToTheme } from '../src/adapters/shadcn/mapping.ts';
import { installFiles } from '../src/design-files.ts';
import { createSystem } from '../src/system.ts';

const FIXTURE = new URL('./fixtures/shadcn-app', import.meta.url).pathname;
const clone = (t: any) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon shadcn-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
};

test('readConfig resolves custom aliases through tsconfig paths', (t) => {
  const root = clone(t);
  const config = readConfig(root)!;
  assert.equal(config.uiDir, join(root, 'src/ui'));
  assert.equal(config.uiImportBase, '~/ui');
  assert.equal(config.cssFile, join(root, 'app/globals.css'));
});

test('readConfig returns undefined without components.json', (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon plain-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(readConfig(root), undefined);
});

test('readTheme reads :root and .dark vars, pairing dark values', (t) => {
  const theme = readTheme(clone(t));
  assert.equal(theme.vars.background.light, 'oklch(1 0 0)');
  assert.equal(theme.vars.background.dark, 'oklch(0.145 0 0)');
  assert.equal(theme.vars.radius.light, '0.625rem');
  assert.equal(theme.vars.radius.dark, undefined); // radius only set in :root
});

test('writeTheme rewrites only managed var lines and preserves unrelated css', (t) => {
  const root = clone(t);
  const theme = readTheme(root);
  theme.vars.primary = { light: '#7c3aed', dark: '#a78bfa' };
  const writes = writeTheme(root, theme);
  installFiles(root, writes);
  const css = readFileSync(join(root, 'app/globals.css'), 'utf8');
  assert.match(css, /--primary: #7c3aed;/);
  assert.match(css, /team notes: do not touch/);          // comment preserved
  assert.match(css, /@keyframes spin-slow/);              // unrelated rule preserved
  assert.match(css, /@import "tailwindcss";/);            // header preserved
  // idempotent round trip
  const again = writeTheme(root, readTheme(root));
  installFiles(root, again);
  assert.equal(readFileSync(join(root, 'app/globals.css'), 'utf8'), css);
});

test('systemToTheme maps canon semantics onto shadcn vars', async (t) => {
  const system = await createSystem({ name: 'Map fixture', prefix: 'mx', brand: '#7c3aed' });
  const mapped = systemToTheme(system, readTheme(clone(t)));
  assert.notEqual(mapped.vars.primary.light, 'oklch(0.205 0 0)'); // replaced
  assert.equal(typeof mapped.vars.radius.light, 'string');
  assert.ok(mapped.vars.ring.light);
});
