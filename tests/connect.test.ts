import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSystem, loadDesignDir, writeDesignDir } from '../src/system.ts';

const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/canon.js', import.meta.url));
const template = await createSystem({ name: 'Customized studio', prefix: 'saved' });
template.components = template.components.filter(c => c.slug === 'button');
template.components[0].related = [];
template.components[0].description = 'Customized before connecting';
template.components[0].base.root['border-radius'] = '{radius.lg}';
template.patterns = [];
template.tokens.space['4'] = '19px';
template.meta.direction.summary = 'The saved direction';

function fixture(t: TestContext) {
  const temporary = mkdtempSync(join(tmpdir(), 'canon-connect-'));
  const root = join(temporary, 'existing app');
  mkdirSync(root);
  const snapshot = join(temporary, 'saved.json');
  writeFileSync(snapshot, JSON.stringify(template));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const run = (args: string[], cwd = root) => execute(process.execPath, [cli, ...args], { cwd, timeout: 20_000 });
  return { temporary, root, snapshot, run };
}

test('connect imports the saved design and preserves existing application files', async t => {
  const f = fixture(t);
  const route = '<main>Existing customer product</main>';
  writeFileSync(join(f.root, 'index.html'), route);
  writeFileSync(join(f.root, 'AGENTS.md'), 'Existing project instructions\n');
  await f.run(['connect', f.snapshot, '--no-hooks']);
  const design = join(f.root, 'design');
  const system = loadDesignDir(design);
  assert.equal(system.tokens.space['4'], '19px');
  assert.equal(system.meta.prefix, 'saved');
  assert.equal(system.meta.direction.summary, 'The saved direction');
  assert.equal(system.components[0].description, 'Customized before connecting');
  assert.equal(system.components[0].base.root['border-radius'], '{radius.lg}');
  assert.equal(readFileSync(join(f.root, 'index.html'), 'utf8'), route);
  assert.match(readFileSync(join(f.root, 'AGENTS.md'), 'utf8'), /^Existing project instructions/);
  assert.match(readFileSync(join(design, 'dist', 'tokens.css'), 'utf8'), /--saved-space-4: 19px/);
  assert.deepEqual(JSON.parse(readFileSync(join(f.root, '.canon', 'project.json'), 'utf8')), { version: 1, design: 'design' });
  await f.run(['check']);
});

test('connect downloads the saved snapshot from the supplied Studio origin', async t => {
  const f = fixture(t);
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(req.url!);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(template));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const { port } = server.address() as { port: number };
  await f.run(['connect', `http://127.0.0.1:${port}/CONNECT.md`, '--no-hooks']);
  assert.deepEqual(requests, ['/api/system']);
  assert.equal(loadDesignDir(join(f.root, 'design')).tokens.space['4'], '19px');
});

for (const sourcePath of ['/canon/CONNECT.md', '/canon/', '/canon']) {
  test(`connect keeps the public site's path when importing from ${sourcePath}`, async t => {
    const f = fixture(t);
    const requests: string[] = [];
    const server = createServer((req, res) => {
      requests.push(req.url!);
      if (req.url !== '/canon/api/system') { res.writeHead(404).end(); return; }
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(template));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
    const { port } = server.address() as { port: number };
    await f.run(['connect', `http://127.0.0.1:${port}${sourcePath}`, '--no-hooks']);
    assert.deepEqual(requests, ['/canon/api/system']);
    assert.equal(loadDesignDir(join(f.root, 'design')).tokens.space['4'], '19px');
  });
}

test('reconnecting reuses customized sources and their configured path without fetching a template', async t => {
  const f = fixture(t);
  const rel = 'ui design/custom';
  await f.run(['connect', f.snapshot, '--root', f.root, '--design', rel, '--no-hooks'], f.temporary);
  const design = join(f.root, rel);
  const custom = loadDesignDir(design);
  custom.tokens.space['4'] = '27px';
  custom.meta.prefix = custom.meta.seeds.prefix = 'kept';
  custom.components[0].description = 'Customized in the project';
  writeDesignDir(custom, design);
  await f.run(['connect', 'http://127.0.0.1:1/CONNECT.md', '--no-hooks']);
  const saved = loadDesignDir(design);
  assert.equal(saved.tokens.space['4'], '27px');
  assert.equal(saved.meta.prefix, 'kept');
  assert.equal(saved.components[0].description, 'Customized in the project');
  assert.equal(existsSync(join(f.root, 'design')), false);
  assert.match(readFileSync(join(f.root, 'DESIGN.compact.md'), 'utf8'), /ui design\/custom\/dist\/kept.css/);
  mkdirSync(join(f.root, 'src'));
  await f.run(['check'], join(f.root, 'src'));
});

test('failed imports do not initialize a default design or overwrite an occupied folder', async t => {
  const f = fixture(t);
  await assert.rejects(f.run(['connect', 'http://127.0.0.1:1/CONNECT.md', '--no-hooks']));
  assert.equal(existsSync(join(f.root, 'design')), false);
  mkdirSync(join(f.root, 'design'));
  writeFileSync(join(f.root, 'design', 'notes.txt'), 'Keep this file');
  await assert.rejects(f.run(['connect', f.snapshot, '--no-hooks']), /not empty|existing files|occupied/i);
  assert.equal(readFileSync(join(f.root, 'design', 'notes.txt'), 'utf8'), 'Keep this file');
  assert.equal(existsSync(join(f.root, 'design', 'system.json')), false);
});

for (const [name, patch] of [
  ['component path', (s: any) => { s.components[0].slug = '../../outside'; }],
  ['output path', (s: any) => { s.meta.out = '../../outside'; }],
  ['invalid token reference', (s: any) => { s.components[0].base.root.color = '{color.missing}'; }],
] as const) {
  test(`connect rejects a snapshot with ${name} before writing the project`, async t => {
    const f = fixture(t);
    const source = structuredClone(template);
    patch(source);
    writeFileSync(f.snapshot, JSON.stringify(source));
    await assert.rejects(f.run(['connect', f.snapshot, '--no-hooks']));
    assert.equal(existsSync(join(f.root, 'design')), false);
    assert.equal(existsSync(join(f.temporary, 'outside.json')), false);
    assert.equal(existsSync(join(f.root, 'AGENTS.md')), false);
  });
}

test('connect refuses a linked design destination', async t => {
  const f = fixture(t);
  const outside = join(f.temporary, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(f.root, 'design'));
  await assert.rejects(f.run(['connect', f.snapshot, '--no-hooks']), /symlink|linked/i);
  assert.equal(existsSync(join(outside, 'system.json')), false);
});

for (const target of ['directory', 'file']) {
  test(`reconnecting refuses a linked output ${target} without writing outside the design`, async t => {
    const f = fixture(t);
    await f.run(['connect', f.snapshot, '--no-hooks']);
    const outside = join(f.temporary, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, 'tokens.css'), 'Unrelated styles');
    const destination = join(f.root, 'design', 'dist', ...(target === 'file' ? ['tokens.css'] : []));
    rmSync(destination, { recursive: true });
    symlinkSync(target === 'directory' ? outside : join(outside, 'tokens.css'), destination);
    const referencesBefore = readFileSync(join(f.root, 'DESIGN.compact.md'), 'utf8');
    await assert.rejects(f.run(['connect', '--no-hooks']), /symlink|linked/i);
    assert.equal(readFileSync(join(outside, 'tokens.css'), 'utf8'), 'Unrelated styles');
    assert.equal(readFileSync(join(f.root, 'DESIGN.compact.md'), 'utf8'), referencesBefore);
  });
}
