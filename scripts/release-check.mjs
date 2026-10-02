import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert.equal(pkg.private, undefined, 'The public package cannot be private');
assert.equal(pkg.publishConfig?.access, 'public');
assert.ok(pkg.repository?.url && pkg.homepage && pkg.bugs?.url, 'Public package links are required');
assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ['esbuild'], 'Only the browser preview compiler is a runtime dependency');
const temporary = mkdtempSync(join(tmpdir(), 'canon-release-check-'));
try {
  const result = spawnSync('npm', ['pack', '--json', '--pack-destination', temporary], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const [archive] = JSON.parse(result.stdout);
  const files = archive.files.map(file => file.path);
  for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'assets/tailwind-play.js', 'bin/canon.js', 'lib/cli.mjs', 'lib/editor.js', 'lib/lib-editor/app.js', 'lib/lib-editor/app.css', 'lib/lib-editor/bundled-licenses.txt', 'lib/lib-editor/app.js.LEGAL.txt', 'lib/generators/documentation.html', 'skills/canon/SKILL.md', 'skills/canon/agents/openai.yaml']) {
    assert.ok(files.includes(name), `Missing published file: ${name}`);
  }
  for (const name of files) {
    assert.ok(/^(?:bin\/|lib\/|assets\/|skills\/|package\.json$|README\.md$|LICENSE$|THIRD_PARTY_NOTICES\.md$)/.test(name), `Unexpected published file: ${name}`);
  }
  const unpack = spawnSync('tar', ['-xzf', join(temporary, archive.filename), '-C', temporary], { encoding: 'utf8' });
  assert.equal(unpack.status, 0, unpack.stderr);
  const version = spawnSync(process.execPath, ['bin/canon.js', '--version'], { cwd: join(temporary, 'package'), encoding: 'utf8' });
  assert.equal(version.status, 0, version.stderr);
  assert.ok(version.stdout.includes(pkg.version), 'CLI and package versions must match');
  console.log(`${archive.name}@${archive.version}: ${files.length} files, ${archive.size} bytes; public metadata, licenses and runtime verified.`);
} finally { rmSync(temporary, { recursive: true, force: true }); }
