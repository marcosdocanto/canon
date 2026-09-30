import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from '../src/adapters/shadcn/config.ts';
import { readTheme } from '../src/adapters/shadcn/theme.ts';

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
