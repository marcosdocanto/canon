import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadDesignDir } from '../src/system.ts';

const project = fileURLToPath(new URL('../', import.meta.url));

test('the installed npm tarball runs the CLI and builds all runtime assets without dependencies', () => {
  const temp = mkdtempSync(join(tmpdir(), 'canon-package-'));
  try {
    const pack = spawnSync('npm', ['pack', '--json', '--pack-destination', temp], { cwd: project, encoding: 'utf8' });
    assert.equal(pack.status, 0, pack.stderr || pack.stdout);
    const [{ filename }] = JSON.parse(pack.stdout);
    const consumer = join(temp, 'consumer');
    mkdirSync(consumer);
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'canon-consumer', private: true }));
    const install = spawnSync('npm', ['install', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', join(temp, filename)], { cwd: consumer, encoding: 'utf8' });
    assert.equal(install.status, 0, install.stderr || install.stdout);
    const cli = join(consumer, 'node_modules', '.bin', 'canon');
    const run = (...args: string[]) => {
      const result = spawnSync(process.execPath, [cli, ...args], { cwd: consumer, encoding: 'utf8' });
      assert.equal(result.status, 0, `canon ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
      return result.stdout;
    };
    assert.match(run('--help'), /canon init/);
    run('init', 'Packed fixture', '--prefix', 'pk');
    const design = join(consumer, 'design');
    assert.ok(readdirSync(join(design, 'components')).length >= 80, 'compiled component catalog must be discovered');
    assert.ok(readdirSync(join(design, 'patterns')).length >= 10, 'compiled pattern catalog must be discovered');
    for (const file of ['pk.css', 'react/button.tsx', 'react/index.ts', 'tailwind.theme.css', 'DESIGN.md', 'agents/AGENTS.md', 'preview.html', 'docs.html']) {
      assert.ok(existsSync(join(design, 'dist', file)), `missing packed runtime output ${file}`);
    }
    const preview = readFileSync(join(design, 'dist', 'preview.html'), 'utf8');
    assert.ok(/<style\b/.test(preview), 'preview must inline runtime CSS');
    assert.ok(/buildTokens/.test(preview), 'preview must inline the shared token engine');
    run('build');
    run('check');
    run('install', '--no-hooks');
    const mcp = JSON.parse(readFileSync(join(consumer, '.mcp.json'), 'utf8'));
    assert.ok(existsSync(mcp.mcpServers.canon.args[0]), 'installed integrations must reference the packaged CLI');
    const pkg = JSON.parse(readFileSync(join(consumer, 'node_modules', 'canon-ds', 'package.json'), 'utf8'));
    assert.deepEqual(pkg.dependencies ?? {}, {}, 'published runtime must remain dependency-free');
    const runtime = join(consumer, 'node_modules', 'canon-ds');
    assert.match(readFileSync(join(runtime, 'LICENSE'), 'utf8'), /MIT License/);
    assert.match(readFileSync(join(runtime, 'THIRD_PARTY_NOTICES.md'), 'utf8'), /Lucide/);
    assert.equal(pkg.publishConfig.access, 'public');
    const saved = loadDesignDir(design);
    saved.tokens.space['4'] = '31px';
    saved.components.find(component => component.slug === 'button')!.description = 'A saved packaged design';
    const snapshot = join(temp, 'saved.json');
    writeFileSync(snapshot, JSON.stringify(saved));
    const connected = join(temp, 'connected consumer');
    run('connect', snapshot, '--root', connected, '--design', 'ui/theme', '--no-hooks');
    const imported = loadDesignDir(join(connected, 'ui/theme'));
    assert.equal(imported.tokens.space['4'], '31px');
    assert.equal(imported.components.find(component => component.slug === 'button')!.description, 'A saved packaged design');
    run('connect', 'http://127.0.0.1:1/CONNECT.md', '--root', connected, '--no-hooks');
    run('check', '--root', connected);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
