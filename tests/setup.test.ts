import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, lstatSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = fileURLToPath(new URL('../', import.meta.url));
const cli = join(project, 'bin/canon.js');
const run = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [cli, 'setup', ...args], {
  cwd, encoding: 'utf8', env: { ...process.env, DISABLE_TELEMETRY: '1', NO_COLOR: '1' }, timeout: 30_000,
});

test('setup installs durable skill copies for explicit agents without changing application source', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'canon setup spaces-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = join(root, 'existing app');
  mkdirSync(app);
  const theme = ':root { --primary: #18634b; }';
  const component = 'export const Button = () => "my button";';
  writeFileSync(join(app, 'globals.css'), theme);
  writeFileSync(join(app, 'button.tsx'), component);
  mkdirSync(join(app, '.claude/skills/unrelated'), { recursive: true });
  writeFileSync(join(app, '.claude/skills/unrelated/SKILL.md'), 'Keep this skill');
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = run(root, '--root', app, '--agent', 'codex', 'claude-code', '--yes');
    assert.equal(result.status, 0, result.stderr + result.stdout);
    for (const directory of ['.agents/skills/canon', '.claude/skills/canon']) {
      assert.equal(lstatSync(join(app, directory)).isSymbolicLink(), false, 'npm cache removal must not break the skill');
      for (const file of ['SKILL.md', 'agents/openai.yaml']) {
        assert.equal(readFileSync(join(app, directory, file), 'utf8'), readFileSync(join(project, 'skills/canon', file), 'utf8'));
      }
    }
    assert.equal(readFileSync(join(app, 'globals.css'), 'utf8'), theme);
    assert.equal(readFileSync(join(app, 'button.tsx'), 'utf8'), component);
    assert.equal(readFileSync(join(app, '.claude/skills/unrelated/SKILL.md'), 'utf8'), 'Keep this skill');
    assert.ok(!readdirSync(app).includes('.canon'), 'setup must not adopt or initialize the application');
  }
});

test('setup help, invalid targets and missing agent selection do not install anything', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'canon-setup-invalid-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.match(run(root, '--help').stdout, /Existing project:.*preserve/);
  for (const args of [['--yes'], ['--agent'], ['--unknown'], ['--global', '--root', root], ['--root', join(root, 'missing')], ['--agent', 'not-a-real-agent', '--yes']]) {
    const result = run(root, ...args);
    assert.notEqual(result.status, 0, `Invalid invocation succeeded: ${args.join(' ')}\n${result.stdout}`);
    assert.deepEqual(readdirSync(root), []);
  }
});
