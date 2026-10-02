import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, realpathSync, readFileSync, writeFileSync } from 'node:fs';
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

test('writeTheme rejects a CSS-injecting var name, writing nothing', (t) => {
  const root = clone(t);
  const cssFile = join(root, 'app/globals.css');
  const before = readFileSync(cssFile, 'utf8');
  const theme = readTheme(root);
  const hostileName = 'primary;}body{background:red';
  theme.vars[hostileName] = { light: 'red' };
  assert.throws(() => writeTheme(root, theme), /theme var name is not safe to write/);
  assert.equal(readFileSync(cssFile, 'utf8'), before, 'a rejected writeTheme call must never touch the file');
});

test('writeTheme rejects a var value containing `;` `{` or `}`, writing nothing', (t) => {
  const root = clone(t);
  const cssFile = join(root, 'app/globals.css');
  const before = readFileSync(cssFile, 'utf8');
  const theme = readTheme(root);
  theme.vars.primary = { light: 'red;}body{background:red' };
  assert.throws(() => writeTheme(root, theme), /disallowed character/);
  assert.equal(readFileSync(cssFile, 'utf8'), before, 'a rejected writeTheme call must never touch the file');
});

test('writeTheme rejects a var value containing a newline, writing nothing', (t) => {
  const root = clone(t);
  const theme = readTheme(root);
  theme.vars.primary = { light: 'red', dark: 'blue\n} .evil { color: red' };
  assert.throws(() => writeTheme(root, theme), /disallowed character/);
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

test('font mappings round-trip in @theme with quoted stacks and no duplicate root declarations', t => {
  const root = clone(t), file = join(root, 'app/globals.css');
  const original = readFileSync(file, 'utf8') + '\n@theme inline {\n  --font-sans: "Original Font", sans-serif;\n  --font-heading: var(--font-sans);\n  --font-mono: ui-monospace, monospace;\n}\n';
  writeFileSync(file, original);
  const theme = readTheme(root);
  assert.equal(theme.vars['font-sans'].light, '"Original Font", sans-serif');
  assert.equal(writeTheme(root, theme)[0].content.toString(), original);
  theme.vars['font-sans'].light = '"New Font", system-ui, sans-serif';
  const expected = original.replace('"Original Font", sans-serif', '"New Font", system-ui, sans-serif');
  installFiles(root, writeTheme(root, theme));
  assert.equal(readFileSync(file, 'utf8'), expected);
  assert.equal(readTheme(root).vars['font-sans'].light, '"New Font", system-ui, sans-serif');
  assert.equal(writeTheme(root, readTheme(root))[0].content.toString(), expected);
  theme.vars['font-sans'].light = 'serif;}body{color:red';
  assert.throws(() => writeTheme(root, theme), /disallowed character/);
  assert.equal(readFileSync(file, 'utf8'), expected);
});

test('root and dark font values remain authoritative over utility mappings', t => {
  const root = clone(t), file = join(root, 'app/globals.css');
  const original = readFileSync(file, 'utf8') + '\n:root { --font-sans: Arial; }\n.dark { --font-sans: Georgia; }\n@theme inline { --font-sans: var(--font-sans); }\n';
  writeFileSync(file, original);
  const theme = readTheme(root);
  assert.deepEqual(theme.vars['font-sans'], { light: 'Arial', dark: 'Georgia' });
  theme.vars['font-sans'] = { light: 'Verdana', dark: 'serif' };
  installFiles(root, writeTheme(root, theme));
  const css = readFileSync(file, 'utf8');
  assert.match(css, /@theme inline \{ --font-sans: var\(--font-sans\); \}/);
  assert.deepEqual(readTheme(root).vars['font-sans'], { light: 'Verdana', dark: 'serif' });
});

test('preview CSS retains actual imported variants, keyframes and global styles without leaking managed values', t => {
  const root=clone(t), file=join(root,'app/globals.css');
  writeFileSync(join(root,'app/shared.css'),'@custom-variant project-active (&[data-active="yes"]);\n@theme inline { @keyframes project-spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } } }\n.project-source { font-weight: 321; }\n');
  writeFileSync(file,readFileSync(file,'utf8')+'\n@import "./shared.css";\n:root { color-scheme:light; }\n@layer utilities { .project-utility { letter-spacing:.03em; } }\n');
  const theme=readTheme(root);
  assert.match(theme.projectCss!,/@custom-variant project-active/);
  assert.match(theme.projectCss!,/@keyframes project-spin/);
  assert.match(theme.projectCss!,/font-weight: 321/);
  assert.match(theme.projectCss!,/color-scheme:light/);
  assert.match(theme.projectCss!,/letter-spacing:.03em/);
  assert.doesNotMatch(theme.projectCss!,/--primary:\s*oklch/);
  assert.doesNotMatch(theme.projectCss!,/@import/);
  assert.doesNotMatch(theme.projectCss!,/@custom-variant data-open/,'a library that does not import shadcn styles gets no Canon substitute');
});

test('unsupported CSS sources are surfaced and comment imports are not followed', t=>{
  const root=clone(t),file=join(root,'app/globals.css');
  writeFileSync(file,readFileSync(file,'utf8')+'\n/* @import "comment-only.css"; */\n@import "./missing.css";\n@import "https://example.test/fonts.css";\n');
  const theme=readTheme(root);
  assert.ok(theme.previewWarnings!.some(warning=>warning.includes('missing.css')));
  assert.ok(theme.previewWarnings!.some(warning=>warning.includes('example.test')));
  assert.ok(!theme.previewWarnings!.some(warning=>warning.includes('comment-only')));
});


test('CSS package imports honor style-only exports',t=>{
  const root=clone(t),file=join(root,'app/globals.css'),pkg=join(root,'node_modules/project-style');
  mkdirSync(pkg,{recursive:true});
  writeFileSync(join(pkg,'package.json'),JSON.stringify({name:'project-style',exports:{'.':{style:'./actual.css'}}}));
  writeFileSync(join(pkg,'actual.css'),'@utility actual-project { opacity:.75; }');
  writeFileSync(file,readFileSync(file,'utf8')+'\n@import "project-style";');
  const theme=readTheme(root);
  assert.match(theme.projectCss!,/@utility actual-project/);
  assert.ok(!theme.previewWarnings!.some(warning=>warning.includes('project-style')));
});
