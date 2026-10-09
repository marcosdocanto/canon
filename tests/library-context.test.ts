import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, statSync, utimesSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { adopt } from '../src/adopt.ts';
import { buildLib, checkLib } from '../src/build-lib.ts';
import { runLint } from '../src/lint.ts';
import { libraryMcp } from '../src/mcp-library.ts';
import { loadDesignDir } from '../src/system.ts';
import { clone } from './fixtures/clone.ts';

async function fixture(t: any) {
  const root = clone(t);
  await adopt({ root, apply: true, hooks: false });
  return { root, design: join(root, 'design') };
}

test('file lint uses live installed tokens and the same library rules as MCP', async t => {
  const { root, design } = await fixture(t);
  const css = join(root, 'app/globals.css');
  writeFileSync(css, readFileSync(css, 'utf8').replace('--primary: oklch(0.205 0 0)', '--primary: #123456'));
  const code = '<button className="ds-not-installed" style={{color: "#123456"}} />';
  writeFileSync(join(root, 'app/lint-example.tsx'), code);
  const result = await runLint(loadDesignDir(design), design, { root, paths: ['app/lint-example.tsx'] });
  assert.equal(result.violations.some(v => v.rule === 'unknown-class'), false);
  assert.match(result.violations.find(v => v.rule === 'raw-color')!.suggestion!, /var\(--primary\)/);
  const response = await libraryMcp(design, root)!.call('lint_code', { code, filename: 'app/lint-example.tsx' });
  assert.deepEqual(result.violations, JSON.parse(response.content[0].text).violations);
});

for (const change of ['same-time source', 'deleted component', 'modified output', 'deleted story', 'metadata']) {
  test(`library check detects ${change} by content`, async t => {
    const { root, design } = await fixture(t);
    assert.equal(checkLib(root, design).ok, true);
    if (change === 'deleted component') rmSync(join(root, 'src/ui/button.tsx'));
    else if (change === 'deleted story') rmSync(join(root, 'stories/canon/button.stories.tsx'));
    else {
      const path = change === 'same-time source' ? join(root, 'app/globals.css') : change === 'metadata' ? join(design, 'system.json') : join(design, 'dist/DESIGN.md');
      const stat = statSync(path);
      const content = readFileSync(path, 'utf8');
      writeFileSync(path, change === 'metadata' ? JSON.stringify({ ...JSON.parse(content), description: 'Updated direction' }) : content + '\n/* changed */\n');
      utimesSync(path, stat.atime, stat.mtime);
    }
    assert.equal(checkLib(root, design).ok, false, 'changed content must invalidate the build');
    await buildLib(root, design);
    assert.equal(checkLib(root, design).ok, true);
  });
}

for (const field of ['canon', 'generators']) {
  test(`library check requires the current ${field} build contract`, async t => {
    const { root, design } = await fixture(t);
    const path = join(design, 'dist/canon.library.lock.json');
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    manifest[field] = field === 'canon' ? '0.0.0' : [];
    writeFileSync(path, JSON.stringify(manifest));
    assert.equal(checkLib(root, design).ok, false);
    await buildLib(root, design);
    assert.equal(checkLib(root, design).ok, true);
  });
}

for (const change of ['edited document', 'deleted document', 'edited managed block']) {
  test(`library check detects installed reference drift: ${change}`, async t => {
    const { root, design } = await fixture(t);
    const path = join(root, change === 'edited managed block' ? 'AGENTS.md' : 'DESIGN.md');
    if (change === 'deleted document') rmSync(path);
    else writeFileSync(path, change === 'edited managed block' ? readFileSync(path, 'utf8').replace('<!-- canon:start -->', '<!-- canon:start -->\nInvented design rules') : 'Outdated design context');
    const result = checkLib(root, design);
    assert.equal(result.ok, false);
    assert.match(result.issues.join('\n'), /reference|DESIGN|AGENTS/);
    await buildLib(root, design);
    assert.equal(checkLib(root, design).ok, true);
  });
}

test('library check preserves unrelated team prose outside installed managed blocks', async t => {
  const { root, design } = await fixture(t);
  const path = join(root, 'AGENTS.md');
  writeFileSync(path, 'Team header\n' + readFileSync(path, 'utf8') + '\nTeam footer\n');
  assert.equal(checkLib(root, design).ok, true);
  await buildLib(root, design);
  assert.ok(readFileSync(path, 'utf8').startsWith('Team header\n'));
  assert.ok(readFileSync(path, 'utf8').endsWith('\nTeam footer\n'));
});

test('a standalone library build does not install root references', async t => {
  const { root, design } = await fixture(t);
  for (const path of ['DESIGN.md', 'DESIGN.compact.md', 'AGENTS.md', 'CLAUDE.md', '.claude', '.cursor']) rmSync(join(root, path), { recursive: true, force: true });
  await buildLib(root, design);
  assert.equal(checkLib(root, design).ok, true);
  assert.throws(() => readFileSync(join(root, 'DESIGN.md')), /ENOENT/);
});
