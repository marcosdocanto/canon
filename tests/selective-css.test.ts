import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { buildSystem } from '../src/build.ts';
import { checkBuild, contentHash, type BuildManifest } from '../src/build-manifest.ts';
import { createSystem } from '../src/system.ts';

function designDir(t: { after: (cleanup: () => void) => void }): string {
  const root = mkdtempSync(join(tmpdir(), 'canon-selective-css-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return join(root, 'design');
}

for (const prefix of ['cn', 'acme']) {
  test(`selective CSS preserves the complete catalog output with prefix ${prefix}`, async (t) => {
    const system = await createSystem({ name: 'Selective CSS', prefix });
    system.meta.out = 'generated';
    system.tokens.space['4'] = '19px';
    system.tokens.breakpoint.md = '713px';
    const result = await buildSystem(system, designDir(t), { only: ['css'] });
    const read = (path: string) => readFileSync(join(result.outDir, path), 'utf8');
    const componentFiles = system.components.map((c) => `css/components/${c.slug}.css`);
    const patternFiles = system.patterns.map((p) => `css/patterns/${p.slug}.css`);
    const components = componentFiles.map(read).join('\n');
    const patterns = patternFiles.map(read).filter(Boolean).join('\n');
    const tokens = read('tokens.css');
    const base = read('base.css');

    // Importing every selective file in source order must reproduce the combined styles.
    assert.equal(read('components.css'), `${components}\n${patterns}`);
    assert.equal(read(`${prefix}.css`), `${tokens}\n${base}\n/* ================= components ================= */\n${components}\n${patterns}`);
    assert.ok(tokens.includes(`--${prefix}-space-4: 19px;`));

    const button = read('css/components/button.css');
    assert.ok(button.includes(`.${prefix}-button[data-variant="primary"]`));
    assert.ok(button.includes(`@keyframes ${prefix}-spin`));
    assert.ok(button.includes(`animation: ${prefix}-spin`));
    assert.ok(button.includes(`var(--${prefix}-color-bg-action)`));
    assert.ok(!button.includes(`.${prefix}-card`));
    assert.ok(!button.includes(':root'));
    assert.ok(!read('css/components/avatar-group.css').includes(`.${prefix}-avatar {`), 'composite CSS must not silently bundle its child component');

    const dashboard = read('css/patterns/dashboard-page.css');
    assert.ok(dashboard.includes(`.${prefix}-app__main {`), 'shared application styles must be retained');
    assert.ok(dashboard.includes(`gap: var(--${prefix}-space-4)`));
    assert.ok(dashboard.includes('@media (max-width: 713px)'));
    assert.ok(dashboard.includes('@container (max-width: 713px)'));
    assert.ok(!dashboard.includes(`.${prefix}-button[data-variant="primary"]`), 'patterns must not silently bundle component styles');
    assert.ok(!dashboard.includes('pattern: Settings'));
    for (const path of [...componentFiles, ...patternFiles]) {
      const css = read(path);
      assert.ok(!css.includes('@import'), `${path} should keep dependency imports explicit`);
      assert.doesNotMatch(css, /\{[a-zA-Z][a-zA-Z0-9_.-]*\}/, `${path} has unresolved token references`);
      if (prefix !== 'cn') assert.doesNotMatch(css, /\bcn-/, `${path} has an unnormalized prefix`);
    }

    const selectiveBytes = Buffer.byteLength(tokens + base + button + read('css/components/input.css'));
    assert.ok(selectiveBytes < Buffer.byteLength(read(`${prefix}.css`)) / 4, 'a two-component product should avoid the full catalog payload');

    const manifest = JSON.parse(read('canon.lock.json')) as BuildManifest;
    const expected = ['tokens.css', 'base.css', 'components.css', `${prefix}.css`, ...componentFiles, ...patternFiles];
    assert.deepEqual(Object.keys(manifest.files).sort(), [...expected].sort());
    assert.deepEqual(result.files.map((path) => relative(result.outDir, path)).sort(), [...expected, 'canon.lock.json'].sort());
    for (const path of expected) assert.equal(manifest.files[path], contentHash(read(path)), `incorrect manifest hash for ${path}`);
  });
}

test('patterns without own styles still have an importable, tracked CSS file', async (t) => {
  const system = await createSystem({ name: 'Empty pattern', prefix: 'fx' });
  system.components = system.components.filter((c) => c.slug === 'button');
  system.patterns = [{ name: 'Simple action', slug: 'simple-action', category: 'app-section', description: '', rules: [], html: '<button class="cn-button">Continue</button>' }];
  const result = await buildSystem(system, designDir(t), { only: ['css'] });
  const patternPath = 'css/patterns/simple-action.css';
  assert.equal(readFileSync(join(result.outDir, patternPath), 'utf8'), '');
  assert.deepEqual(readdirSync(join(result.outDir, 'css/components')), ['button.css']);
  assert.deepEqual(readdirSync(join(result.outDir, 'css/patterns')), ['simple-action.css']);
  const manifest = JSON.parse(readFileSync(join(result.outDir, 'canon.lock.json'), 'utf8')) as BuildManifest;
  assert.equal(manifest.files[patternPath], contentHash(''));
});

test('build verification rejects missing or edited selective CSS', async (t) => {
  const system = await createSystem({ name: 'Verified selective CSS', prefix: 'fx' });
  system.components = system.components.filter((c) => c.slug === 'button');
  system.patterns = system.patterns.filter((p) => p.slug === 'app-shell');
  const design = designDir(t);
  const result = await buildSystem(system, design);
  assert.deepEqual(checkBuild(system, design), { ok: true, issues: [] });

  const buttonPath = join(result.outDir, 'css/components/button.css');
  const original = readFileSync(buttonPath, 'utf8');
  writeFileSync(buttonPath, '/* edited */');
  assert.ok(checkBuild(system, design).issues.includes('Generated file changed: css/components/button.css.'));
  writeFileSync(buttonPath, original);
  rmSync(join(result.outDir, 'css/patterns/app-shell.css'));
  assert.ok(checkBuild(system, design).issues.includes('Generated file missing: css/patterns/app-shell.css.'));
});
