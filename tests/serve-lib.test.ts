// Library-mode Studio HTTP: read endpoints (`/api/lib/state`, `/api/lib/preview`) and the
// adapter-mode routing in serve.ts. Boots the real `serve()` (src/serve.ts) as a child process,
// exactly like tests/server.test.ts, so the adapter-mode branch is exercised through the same
// public entry point a real `canon studio` invocation uses.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { adopt } from '../src/adopt.ts';
import { createSystem, writeDesignDir } from '../src/system.ts';
import { buildSystem } from '../src/build.ts';
import { clone } from './fixtures/clone.ts';

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

// Tailwind v3-era shadcn wraps :root/.dark in @layer base — the majority of pre-2025 repos (same
// fixture text as tests/shadcn-theme.test.ts's V3_CSS, for the state endpoint's own @layer test).
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

/** Boot `serve()` (src/serve.ts) as a child process on port 0, exactly like tests/server.test.ts, and return an HTTP request helper. */
async function bootServe(t: TestContext, dist: string, design: string, projectRoot: string) {
  let port = 0;
  const child = spawn(process.execPath, ['--input-type=module', '-e', `import { serve } from ${JSON.stringify(new URL('../src/serve.ts', import.meta.url).href)}; await serve(process.argv[1], 0, process.argv[2], { projectRoot: process.argv[3] || undefined });`, dist, design, projectRoot], { stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (data) => { logs += data; });
  child.stderr.on('data', (data) => { logs += data; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
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
  const request = (path: string, options: { method?: string; body?: string; headers?: Record<string, string> } = {}) => new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; text: string; json: () => any }>((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port, path, method: options.method ?? 'GET', headers: { host, ...options.headers } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode!, headers: res.headers, text, json: () => JSON.parse(text) });
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(5_000, () => req.destroy(new Error('Studio request timed out')));
    req.end(options.body);
  });
  return { request };
}

/** Clone the shadcn-app fixture, adopt it (apply: true), and boot the resulting adapter-mode project's Studio. */
async function libFixture(t: TestContext, opts: { v3?: boolean } = {}) {
  const root = clone(t);
  if (opts.v3) writeFileSync(join(root, 'app', 'globals.css'), V3_CSS);
  await adopt({ root, apply: true, hooks: false });
  const design = join(root, 'design');
  const dist = join(design, 'dist');
  const { request } = await bootServe(t, dist, design, root);
  return { root, design, dist, request };
}

test('GET /api/lib/state returns the theme, component inventory (button cva, badge read-only) and file hashes', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/api/lib/state');
  assert.equal(res.status, 200);
  const body = res.json();

  assert.equal(body.theme.vars.background.light, 'oklch(1 0 0)');
  assert.equal(body.theme.vars.background.dark, 'oklch(0.145 0 0)');

  const button = body.components.find((c: any) => c.slug === 'button');
  const badge = body.components.find((c: any) => c.slug === 'badge');
  assert.ok(button, 'button is inventoried');
  assert.ok(button.cva, 'button has a parsed cva spec');
  assert.equal(button.cva.defaultVariants.variant, 'default');
  assert.equal(button.importPath, '~/ui/button');
  assert.equal(button.exportName, 'Button');
  assert.equal(button.file, undefined, 'the absolute file path is never exposed on a component entry');
  assert.ok(badge, 'badge is inventoried');
  assert.equal(badge.cva, undefined, 'read-only components carry no cva');
  assert.match(badge.readOnlyReason, /template interpolation/);

  const themeFile = join(f.root, 'app', 'globals.css');
  const buttonFile = join(f.root, 'src', 'ui', 'button.tsx');
  const badgeFile = join(f.root, 'src', 'ui', 'badge.tsx');
  assert.equal(body.hashes[themeFile], sha256(themeFile));
  assert.equal(body.hashes[buttonFile], sha256(buttonFile));
  assert.equal(body.hashes[badgeFile], undefined, 'read-only components are never hashed');

  assert.ok(body.vocabulary.includes('bg-primary'), 'semantic classes come from the theme');
  assert.ok(body.vocabulary.includes('text-primary-foreground'));
  assert.ok(body.vocabulary.includes('p-4'), 'pragmatic spacing scale is included');
  assert.ok(body.vocabulary.includes('rounded-md'));
  assert.ok(body.vocabulary.includes('w-1/2'));
  assert.ok(body.vocabulary.includes('text-sm'));
});

test('GET /api/lib/state reads a v3 @layer-wrapped globals.css', async (t) => {
  const f = await libFixture(t, { v3: true });
  const body = (await f.request('/api/lib/state')).json();
  assert.equal(body.theme.vars.background.light, '0 0% 100%');
  assert.equal(body.theme.vars.background.dark, '240 10% 3.9%');
  assert.equal(body.theme.vars.radius.light, '0.5rem');
  assert.equal(body.theme.vars.radius.dark, undefined);
});

test('GET /api/lib/state rejects a non-GET method', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/api/lib/state', { method: 'POST' });
  assert.equal(res.status, 405);
});

test('GET /api/lib/preview renders the current theme and inventory as HTML built from disk', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/api/lib/preview');
  assert.equal(res.status, 200);
  assert.match(String(res.headers['content-type']), /text\/html/);
  assert.match(res.text, /--primary:\s*oklch\(0\.205 0 0\);/);
  assert.match(res.text, /<section[^>]*data-slug="button"/);
  assert.match(res.text, /<section[^>]*data-slug="badge"/);
  assert.match(res.text, /Read-only: cva: unsupported template interpolation/);
});

test('POST /api/lib/preview builds a draft-theme preview without writing to disk', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const draft = { ...state.theme, vars: { ...state.theme.vars, primary: { light: '#123456', dark: '#abcdef' } } };
  const before = readFileSync(join(f.root, 'app', 'globals.css'), 'utf8');

  const res = await f.request('/api/lib/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ theme: draft }) });
  assert.equal(res.status, 200);
  assert.match(String(res.headers['content-type']), /text\/html/);
  assert.match(res.text, /--primary:\s*#123456;/);
  const darkBlock = /\.dark\s*\{([^}]*)\}/.exec(res.text)?.[1] ?? '';
  assert.match(darkBlock, /--primary:\s*#abcdef;/);

  assert.equal(readFileSync(join(f.root, 'app', 'globals.css'), 'utf8'), before, 'draft preview must not touch the theme file');
  assert.equal(readFileSync(join(f.root, 'src', 'ui', 'button.tsx'), 'utf8'), readFileSync(new URL('./fixtures/shadcn-app/src/ui/button.tsx', import.meta.url), 'utf8'), 'draft preview must not touch component files');
});

test('POST /api/lib/preview rejects an unknown top-level field', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/api/lib/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ theme: { file: '/x', vars: {} }, extra: 1 }) });
  assert.equal(res.status, 400);
  assert.equal(res.json().ok, false);
});

test('POST /api/lib/preview rejects a malformed draft theme shape', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/api/lib/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ theme: { vars: { primary: { light: 1 } } } }) });
  assert.equal(res.status, 400);
});

test('POST /api/lib/preview requires a theme field', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/api/lib/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
  assert.equal(res.status, 400);
});

test('/api/lib/preview rejects an unsupported method', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/api/lib/preview', { method: 'DELETE' });
  assert.equal(res.status, 405);
});

test('GET / serves the bundled library-studio editor shell', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/');
  assert.equal(res.status, 200);
  assert.match(String(res.headers['content-type']), /text\/html/);
  assert.match(res.text, /Canon library studio/);
});

test('same-origin/host checks still apply to the library-mode server', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/api/lib/state', { headers: { origin: 'https://foreign.example' } });
  assert.equal(res.status, 403);
});

test('a NATIVE (non-adapter) project still serves the native studio, unaffected by library-mode routing', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'canon-serve-lib-native-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const design = join(root, 'design');
  const system = await createSystem({ name: 'Native studio smoke test', prefix: 'nt' });
  writeDesignDir(system, design);
  await buildSystem(system, design);
  const { request } = await bootServe(t, join(design, 'dist'), design, '');

  const systemRes = await request('/api/system');
  assert.equal(systemRes.status, 200);
  assert.equal(systemRes.json().meta.name, 'Native studio smoke test');

  const previewRes = await request('/');
  assert.equal(previewRes.status, 200);
  assert.match(previewRes.text, /<!doctype html>/i);

  const libRes = await request('/api/lib/state');
  assert.equal(libRes.status, 404, 'native mode never exposes library-mode endpoints');
});
