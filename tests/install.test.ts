import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSystem, writeDesignDir } from '../src/system.ts';
import { buildSystem } from '../src/build.ts';
import { install } from '../src/install.ts';

test('install handles quoted paths, migrates its legacy hook and preserves unrelated hooks', async (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'canon install test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, 'app with spaces');
  const relDesign = 'design source\'s "ui"';
  const design = join(root, relDesign);
  const system = await createSystem({ name: 'Install fixture', prefix: 'fx' });
  system.meta.out = 'generated/web';
  system.components = system.components.filter((component) => component.slug === 'button');
  system.components[0].related = [];
  system.patterns = [];
  writeDesignDir(system, design);
  await buildSystem(system, design);
  mkdirSync(join(root, '.claude'), { recursive: true });
  const binPath = fileURLToPath(new URL('../bin/canon.js', import.meta.url));
  const unrelated = { matcher: 'Read', hooks: [{ type: 'command', command: 'personal-hook-command', timeout: 10 }] };
  const legacy = `node ${binPath} hook --design ${relDesign}`;
  writeFileSync(join(root, '.claude', 'settings.json'), JSON.stringify({
    hooks: { PostToolUse: [unrelated, { matcher: 'Edit|Write|MultiEdit', hooks: [{ type: 'command', command: legacy, timeout: 30 }] }] },
  }));
  const { log } = install(system, design, { root, hooks: true });
  install(system, design, { root, hooks: true });
  const settings = JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'));
  assert.equal(settings.hooks.PostToolUse.length, 2, 'reinstall must not duplicate the Canon hook');
  assert.deepEqual(settings.hooks.PostToolUse[0], unrelated);
  const hook = settings.hooks.PostToolUse[1].hooks[0];
  assert.notEqual(hook.command, legacy, 'the previous unquoted command must be migrated');
  assert.equal(hook.timeout, 30);

  const changed = join(root, 'src', 'changed.css');
  mkdirSync(join(root, 'src'));
  const runHook = () => spawnSync('/bin/sh', ['-c', hook.command], {
    cwd: root, encoding: 'utf8', timeout: 10_000,
    input: JSON.stringify({ tool_input: { file_path: changed } }),
  });
  writeFileSync(changed, '.fixture { color: var(--fx-color-fg-default); }');
  const valid = runHook();
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);
  writeFileSync(changed, '.fixture { color: #123456; }');
  const invalid = runHook();
  assert.equal(invalid.status, 2, invalid.stderr || invalid.stdout);
  assert.match(invalid.stderr, /raw-color/);

  const mcp = JSON.parse(readFileSync(join(root, '.mcp.json'), 'utf8'));
  const args = [binPath, 'mcp', '--design', relDesign];
  assert.deepEqual(mcp.mcpServers.canon.args, args);
  const codex = readFileSync(join(root, '.codex', 'config.toml'), 'utf8');
  assert.deepEqual(JSON.parse(codex.match(/^args = (.+)$/m)![1]), args);
  const instructions = log.join('\n');
  assert.ok(instructions.includes(JSON.stringify(`./${relDesign}/generated/web/fx.css`)));
  assert.ok(instructions.includes(JSON.stringify(`./${relDesign}/generated/web/tailwind.theme.css`)));
  assert.ok(instructions.includes('DESIGN.compact.md'));
  assert.doesNotMatch(instructions, /\/dist\//);
});
