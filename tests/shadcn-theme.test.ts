import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, realpathSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from '../src/adapters/shadcn/config.ts';
import { readTheme, writeTheme } from '../src/adapters/shadcn/theme.ts';
import { systemToTheme } from '../src/adapters/shadcn/mapping.ts';
import { installFiles } from '../src/design-files.ts';
import { createSystem } from '../src/system.ts';
import { clone } from './fixtures/clone.ts';

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

// Tailwind v3-era shadcn wraps :root/.dark in @layer base — the majority of pre-2025 repos.
const V3_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* team notes: keep the keyframes */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
  }
}
@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
@keyframes spin-slow { to { transform: rotate(360deg); } }
`;

test('readTheme reads @layer base wrapped :root/.dark (v3-style globals.css)', (t) => {
  const root = clone(t);
  writeFileSync(join(root, 'app/globals.css'), V3_CSS);
  const theme = readTheme(root);
  assert.equal(theme.vars.background.light, '0 0% 100%');
  assert.equal(theme.vars.background.dark, '240 10% 3.9%');
  assert.equal(theme.vars.radius.light, '0.5rem');
  assert.equal(theme.vars.radius.dark, undefined);
});

test('writeTheme splices inside @layer base preserving everything else', (t) => {
  const root = clone(t);
  const file = join(root, 'app/globals.css');
  writeFileSync(file, V3_CSS);
  const theme = readTheme(root);
  theme.vars.primary = { light: '262 83% 58%', dark: '263 70% 70%' };
  theme.vars.ring = { light: '262 83% 58%' }; // new var → appended inside the wrapped :root
  installFiles(root, writeTheme(root, theme));
  const css = readFileSync(file, 'utf8');
  assert.match(css, /--primary: 262 83% 58%;/);
  assert.match(css, /--ring: 262 83% 58%;/);
  assert.match(css, /@tailwind base;/);                    // header preserved
  assert.match(css, /team notes: keep the keyframes/);     // comment preserved
  assert.match(css, /@apply border-border;/);              // sibling @layer body preserved
  assert.match(css, /@keyframes spin-slow/);               // trailing rule preserved
  // the appended --ring landed INSIDE the @layer's :root, not at top level
  const layerStart = css.indexOf('@layer base');
  const layerEnd = css.indexOf('}', css.indexOf('.dark'));
  assert.ok(css.indexOf('--ring:') > layerStart && css.indexOf('--ring:') < layerEnd);
  // idempotent round trip
  const again = writeTheme(root, readTheme(root));
  installFiles(root, again);
  assert.equal(readFileSync(file, 'utf8'), css);
});
