import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir, networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { createSystem, writeDesignDir, loadDesignDir } from '../src/system.ts';
import { checkBuild } from '../src/build-manifest.ts';
import { buildSystem } from '../src/build.ts';
import { install } from '../src/install.ts';
import type { Pattern } from '../src/types.ts';

const template = await createSystem({ name: 'Studio test', prefix: 'test' });
template.components = template.components.filter((component) => component.slug === 'button');
template.components[0].related = [];
template.patterns = [];
const marker: Pattern = { name: 'Marker', slug: 'marker', category: 'app-page', description: 'Safe fixture', rules: [], html: '<main>Marker</main>' };

async function fixture(t: TestContext, out = 'dist', bound = false) {
  const root = mkdtempSync(join(tmpdir(), 'canon-server-test-'));
  const design = join(root, 'design');
  const dist = join(design, out);
  const system = structuredClone(template);
  system.meta.out = out;
  writeDesignDir(system, design);
  mkdirSync(join(design, 'patterns'), { recursive: true });
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'preview.html'), '<!doctype html><title>Initial preview</title>');
  writeFileSync(join(dist, 'tokens.css'), '/* initial output */');
  if (bound) {
    await buildSystem(system, design);
    writeFileSync(join(root, 'AGENTS.md'), 'Existing project instructions\n');
    install(system, design, { root, hooks: false });
  }
  let port = 0;
  const child = spawn(process.execPath, ['--input-type=module', '-e', `import { serve } from ${JSON.stringify(new URL('../src/serve.ts', import.meta.url).href)}; await serve(process.argv[1], 0, process.argv[2], { projectRoot: process.argv[3] || undefined });`, dist, design, bound ? root : ''], { stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (data) => { logs += data; });
  child.stderr.on('data', (data) => { logs += data; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
    rmSync(root, { recursive: true, force: true });
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Studio did not start: ${logs}`)), 10_000);
    const ready = () => {
      const address = logs.match(/canon studio → http:\/\/127\.0\.0\.1:(\d+)\//);
      if (address) { port = Number(address[1]); clearTimeout(timer); child.stdout.off('data', ready); resolve(); }
    };
    child.stdout.on('data', ready);
    child.once('exit', () => { clearTimeout(timer); reject(new Error(`Studio exited: ${logs}`)); });
  });
  const host = `127.0.0.1:${port}`;
  const request = (path: string, options: { method?: string; body?: string; chunks?: string[]; headers?: Record<string, string>; hostname?: string } = {}) => new Promise<{ status: number; text: string; json: () => any }>((resolve, reject) => {
    let responded = false;
    const req = httpRequest({ hostname: options.hostname ?? '127.0.0.1', port, path, method: options.method ?? 'GET', headers: { host, ...options.headers } }, (res) => {
      responded = true;
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode!, text, json: () => JSON.parse(text) });
      });
      res.on('error', reject);
    });
    // An early rejection can stop an in-flight write. Once response headers arrive,
    // require that response to finish; its own error handler still rejects truncation.
    req.on('error', (error) => {
      const code = (error as NodeJS.ErrnoException).code;
      if (!responded || (code !== 'ECONNRESET' && code !== 'EPIPE')) reject(error);
    });
    req.setTimeout(5_000, () => req.destroy(new Error('Studio request timed out')));
    for (const chunk of options.chunks ?? []) req.write(chunk);
    req.end(options.body);
  });
  const save = (body: unknown, headers: Record<string, string> = {}) => request('/api/save', { method: 'POST', headers: { 'content-type': 'application/json', origin: `http://${host}`, ...headers }, body: JSON.stringify(body) });
  return { root, design, dist, system, host, request, save };
}

function rejected(response: { status: number; json: () => any }, status: number) {
  assert.equal(response.status, status);
  assert.equal(response.json().ok, false);
  assert.equal(typeof response.json().error, 'string');
}

test('Studio saves same-origin JSON and rebuilds usable files', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('/')).status, 200);
  assert.equal((await f.request('/api/system')).json().meta.name, 'Studio test');
  const tokens = structuredClone(f.system.tokens);
  tokens.space['4'] = '19px';
  const component = { ...f.system.components[0], description: 'Updated button' };
  const response = await f.save({ meta: { ...f.system.meta, name: 'Saved Studio' }, tokens, components: { button: component }, patterns: { marker } });
  assert.equal(response.status, 200);
  assert.equal(response.json().ok, true);
  assert.ok(response.json().built > 10);
  assert.ok(Array.isArray(response.json().warnings));
  const saved = loadDesignDir(f.design);
  assert.equal(saved.meta.name, 'Saved Studio');
  assert.equal(saved.tokens.space['4'], '19px');
  assert.equal(saved.components[0].description, 'Updated button');
  assert.equal(saved.patterns[0].slug, 'marker');
  assert.match((await f.request('/preview.html')).text, /Saved Studio/);
  assert.match(readFileSync(join(f.dist, 'tokens.css'), 'utf8'), /--test-space-4: 19px/);
});

test('bound Studio identifies its project and refreshes references on Save', async t => {
  const f = await fixture(t, 'generated/web', true);
  const response = await f.save({ meta: { ...f.system.meta, direction: { ...f.system.meta.direction, summary: 'Updated project direction' } } });
  assert.equal(response.status, 200);
  assert.equal(response.json().referencesUpdated, true);
  for (const name of ['DESIGN.md', 'DESIGN.compact.md', 'AGENTS.md', 'CLAUDE.md', '.claude/skills/design-system/SKILL.md', '.cursor/rules/design-system.mdc']) {
    assert.match(readFileSync(join(f.root, name), 'utf8'), /Updated project direction/, name);
  }
  assert.match(readFileSync(join(f.root, 'AGENTS.md'), 'utf8'), /^Existing project instructions/);
  assert.equal((await f.request('/api/project')).json().connected, true);
  assert.equal(checkBuild(loadDesignDir(f.design), f.design).ok, true);
});

test('bound Studio rejects a failed reference write without changing design or styles', async t => {
  const f = await fixture(t, 'dist', true);
  const tokensBefore = readFileSync(join(f.design, 'tokens.json'), 'utf8');
  const cssBefore = readFileSync(join(f.dist, 'tokens.css'), 'utf8');
  const referenceBefore = readFileSync(join(f.root, 'DESIGN.compact.md'), 'utf8');
  const outside = join(f.root, 'outside-reference.md');
  writeFileSync(outside, 'Unrelated content');
  rmSync(join(f.root, 'CLAUDE.md'));
  symlinkSync(outside, join(f.root, 'CLAUDE.md'));
  const tokens = structuredClone(f.system.tokens);
  tokens.space['4'] = '29px';
  const response = await f.save({ tokens });
  rejected(response, 403);
  assert.equal(readFileSync(join(f.design, 'tokens.json'), 'utf8'), tokensBefore);
  assert.equal(readFileSync(join(f.dist, 'tokens.css'), 'utf8'), cssBefore);
  assert.equal(readFileSync(join(f.root, 'DESIGN.compact.md'), 'utf8'), referenceBefore);
  assert.equal(readFileSync(outside, 'utf8'), 'Unrelated content');
});

test('Studio does not listen on a non-loopback interface', async (t) => {
  const address = Object.values(networkInterfaces()).flat().find((entry) => entry && entry.family === 'IPv4' && !entry.internal)?.address;
  if (!address) { t.skip('No non-loopback IPv4 interface'); return; }
  const f = await fixture(t);
  await assert.rejects(f.request('/', { hostname: address }), /ECONNREFUSED/);
});

for (const collection of ['components', 'patterns'] as const) {
  test(`Studio rejects traversal keys in ${collection} before writing a sibling marker`, async (t) => {
    const f = await fixture(t);
    const spec = collection === 'patterns' ? marker : f.system.components[0];
    const response = await f.save({ [collection]: { '../../marker': spec } });
    assert.equal(existsSync(join(f.root, 'marker.json')), false, 'request wrote outside design/');
    rejected(response, 400);
  });
  test(`Studio rejects mismatched ${collection} slugs`, async (t) => {
    const f = await fixture(t);
    const spec = collection === 'patterns' ? marker : f.system.components[0];
    const response = await f.save({ [collection]: { safe: { ...spec, slug: '../../marker' } } });
    assert.equal(existsSync(join(f.design, collection, 'safe.json')), false);
    rejected(response, 400);
  });
}

test('Studio rejects a static sibling whose name starts with dist', async (t) => {
  const f = await fixture(t);
  mkdirSync(join(f.design, 'dist-private'));
  writeFileSync(join(f.design, 'dist-private', 'marker'), 'private fixture');
  const response = await f.request('/..%2Fdist-private/marker');
  assert.equal(response.status, 403);
  assert.ok(!response.text.includes('private fixture'));
});

for (const target of ['file', 'directory', 'index']) {
  test(`Studio rejects static ${target} symlinks leaving its root`, async (t) => {
    const f = await fixture(t);
    const outside = join(f.root, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, 'marker'), 'private fixture');
    let path = '/marker';
    if (target === 'file') symlinkSync(join(outside, 'marker'), join(f.dist, 'marker'));
    if (target === 'directory') { symlinkSync(outside, join(f.dist, 'linked')); path = '/linked/marker'; }
    if (target === 'index') { mkdirSync(join(f.dist, 'linked')); symlinkSync(join(outside, 'marker'), join(f.dist, 'linked', 'index.html')); path = '/linked/'; }
    const response = await f.request(path);
    assert.equal(response.status, 403);
    assert.ok(!response.text.includes('private fixture'));
  });
}

for (const [name, headers, status] of [
  ['foreign Origin', { origin: 'https://foreign.example' }, 403],
  ['opaque Origin', { origin: 'null' }, 403],
  ['foreign Host', { host: 'foreign.example' }, 403],
  ['wrong Host port', { host: 'localhost:1' }, 403],
  ['text/plain content', { 'content-type': 'text/plain' }, 415],
] as const) {
  test(`Studio rejects ${name} before source writes`, async (t) => {
    const f = await fixture(t);
    const before = readFileSync(join(f.design, 'system.json'), 'utf8');
    const response = await f.save({ meta: { ...f.system.meta, name: 'Unauthorized' } }, headers);
    assert.equal(readFileSync(join(f.design, 'system.json'), 'utf8'), before);
    rejected(response, status);
  });
}

test('Studio requires JSON content type', async (t) => {
  const f = await fixture(t);
  rejected(await f.request('/api/save', { method: 'POST', body: '{}' }), 415);
});

for (const [name, patch] of [
  ['prefix traversal', { prefix: '../../marker' }],
  ['output traversal', { out: '../outside' }],
  ['output overlap with source', { out: 'components' }],
  ['output at source root', { out: '.' }],
  ['invalid direction', { direction: { summary: '', principles: [], never: 42 } }],
  ['invalid seeds', { seeds: null }],
  ['invalid theme', { defaultTheme: 'other' }],
] as const) {
  test(`Studio rejects metadata ${name} without touching source or output`, async (t) => {
    const f = await fixture(t);
    const before = readFileSync(join(f.design, 'system.json'), 'utf8');
    const response = await f.save({ meta: { ...f.system.meta, ...patch } });
    assert.equal(readFileSync(join(f.design, 'system.json'), 'utf8'), before);
    assert.equal(readFileSync(join(f.dist, 'tokens.css'), 'utf8'), '/* initial output */');
    rejected(response, 400);
    assert.equal(existsSync(join(f.root, 'marker.css')), false);
    assert.equal(existsSync(join(f.root, 'outside')), false);
  });
}

for (const body of [null, { tokens: null }, { components: [] }, { patterns: { marker: null } }]) {
  test(`Studio rejects malformed save shape ${JSON.stringify(body)}`, async (t) => {
    const f = await fixture(t);
    rejected(await f.save(body), 400);
  });
}

test('Studio rejects malformed JSON without crashing', async (t) => {
  const f = await fixture(t);
  rejected(await f.request('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }), 400);
  assert.equal((await f.request('/')).status, 200);
});

test('Studio rejects oversized Content-Length before reading the body', async (t) => {
  const f = await fixture(t);
  const before = loadDesignDir(f.design);
  // Advertise the oversized upload and wait for rejection without sending its body.
  // Actual received bytes are independently covered by the chunked request below.
  rejected(await f.request('/api/save', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': String(8 * 1024 * 1024 + 1) } }), 413);
  assert.deepEqual(loadDesignDir(f.design), before);
  assert.equal(readFileSync(join(f.dist, 'tokens.css'), 'utf8'), '/* initial output */');
  assert.equal((await f.request('/')).status, 200);
});

test('Studio also limits chunked JSON by bytes rather than characters', async (t) => {
  const f = await fixture(t);
  const before = loadDesignDir(f.design);
  const meta = { ...f.system.meta, name: 'Must not persist', description: '' };
  const paddingBytes = 8 * 1024 * 1024 + 1 - Buffer.byteLength(JSON.stringify({ meta }));
  meta.description = '£'.repeat(Math.floor(paddingBytes / 2)) + ' '.repeat(paddingBytes % 2);
  const upload = JSON.stringify({ meta });
  assert.ok(upload.length < 8 * 1024 * 1024);
  assert.equal(Buffer.byteLength(upload), 8 * 1024 * 1024 + 1);
  rejected(await f.request('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, chunks: [upload.slice(0, -1), upload.slice(-1)] }), 413);
  assert.deepEqual(loadDesignDir(f.design), before);
  assert.equal(readFileSync(join(f.dist, 'tokens.css'), 'utf8'), '/* initial output */');
  assert.equal((await f.request('/')).status, 200);
});

test('Studio catches malformed URL decoding without crashing', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('/%E0%A4%A')).status, 400);
  assert.equal((await f.request('/')).status, 200);
});

test('Studio catches unreadable source JSON without crashing', async (t) => {
  const f = await fixture(t);
  writeFileSync(join(f.design, 'system.json'), '{');
  rejected(await f.request('/api/system'), 500);
  assert.equal((await f.request('/')).status, 200);
});

test('Studio does not persist source changes when generation fails', async (t) => {
  const f = await fixture(t);
  const before = readFileSync(join(f.design, 'system.json'), 'utf8');
  // Pattern rules are consumed by preview/docs after basic token validation succeeds.
  const response = await f.save({ meta: { ...f.system.meta, name: 'Must not persist' }, patterns: { marker: { ...marker, rules: 42 } } });
  assert.equal(readFileSync(join(f.design, 'system.json'), 'utf8'), before);
  assert.equal(existsSync(join(f.design, 'patterns', 'marker.json')), false);
  assert.equal(readFileSync(join(f.dist, 'tokens.css'), 'utf8'), '/* initial output */');
  rejected(response, 422);
});

for (const target of ['system.json', 'tokens.json', 'components/button.json', 'patterns', 'dist', 'dist/tokens.css']) {
  test(`Studio refuses saves through a ${target} symlink`, async (t) => {
    const f = await fixture(t);
    const outside = join(f.root, 'outside');
    mkdirSync(outside);
    const sourcePath = join(f.design, target);
    const isDirectory = target === 'patterns' || target === 'dist';
    const destination = isDirectory ? outside : join(outside, 'marker');
    if (!isDirectory) writeFileSync(destination, readFileSync(sourcePath));
    rmSync(sourcePath, { recursive: true, force: true });
    symlinkSync(destination, sourcePath);
    const before = isDirectory ? undefined : readFileSync(destination, 'utf8');
    const response = await f.save({ meta: { ...f.system.meta, name: 'Must not persist' }, tokens: f.system.tokens, components: { button: f.system.components[0] }, patterns: { marker } });
    if (!isDirectory) assert.equal(readFileSync(destination, 'utf8'), before);
    else assert.equal(existsSync(join(outside, target === 'dist' ? 'tokens.css' : 'marker.json')), false);
    rejected(response, 403);
  });
}

test('Studio refuses reading design JSON through an escaping symlink', async (t) => {
  const f = await fixture(t);
  const outside = join(f.root, 'outside.json');
  writeFileSync(outside, JSON.stringify({ ...f.system.meta, name: 'Private fixture' }));
  rmSync(join(f.design, 'system.json'));
  symlinkSync(outside, join(f.design, 'system.json'));
  const response = await f.request('/api/system');
  rejected(response, 403);
  assert.ok(!response.text.includes('Private fixture'));
});

test('Studio rejects output configured inside a source collection', async (t) => {
  const f = await fixture(t, 'components/generated');
  const response = await f.save({ meta: { ...f.system.meta, name: 'Must not persist' } });
  rejected(response, 400);
  assert.equal(loadDesignDir(f.design).meta.name, 'Studio test');
});

test('Studio builds newly added specs in the same order as reloaded source', async (t) => {
  const f = await fixture(t, 'build/web');
  const earlier = { ...f.system.components[0], slug: 'earlier', name: 'Earlier', category: 'typography' };
  const response = await f.save({ components: { earlier }, patterns: { zebra: { ...marker, slug: 'zebra' }, apple: { ...marker, slug: 'apple' } } });
  assert.equal(response.json().ok, true, response.text);
  assert.deepEqual(checkBuild(loadDesignDir(f.design), f.design), { ok: true, issues: [] });
});

test('Studio detects an ancestor replaced by a symlink before saving', async (t) => {
  const f = await fixture(t);
  const movedRoot = `${f.root}-moved`;
  renameSync(f.root, movedRoot);
  symlinkSync(movedRoot, f.root);
  t.after(() => rmSync(movedRoot, { recursive: true, force: true }));
  const response = await f.save({ meta: { ...f.system.meta, name: 'Must not persist' } });
  rejected(response, 403);
  assert.equal(loadDesignDir(join(movedRoot, 'design')).meta.name, 'Studio test');
});

test('Studio validates preset override metadata before writing source', async (t) => {
  const f = await fixture(t);
  const before = readFileSync(join(f.design, 'system.json'), 'utf8');
  const response = await f.save({ meta: { ...f.system.meta, seeds: { ...f.system.meta.seeds, presetOverrides: [] } } });
  rejected(response, 400);
  assert.equal(readFileSync(join(f.design, 'system.json'), 'utf8'), before);
});
