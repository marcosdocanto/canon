// Library-mode Studio HTTP: read endpoints (`/api/lib/state`, `/api/lib/preview`) and the
// adapter-mode routing in serve.ts. Boots the real `serve()` (src/serve.ts) as a child process,
// exactly like tests/server.test.ts, so the adapter-mode branch is exercised through the same
// public entry point a real `canon studio` invocation uses.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once, EventEmitter } from 'node:events';
import { request as httpRequest } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { adopt } from '../src/adopt.ts';
import { createSystem, writeDesignDir } from '../src/system.ts';
import { buildSystem } from '../src/build.ts';
import { libHandler } from '../src/serve-lib.ts';
import { findProject } from '../src/project.ts';
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

/**
 * A single component file with BOTH a `cva()` (`toolbarVariants`, on `Toolbar`) and a plain,
 * editable sibling part (`ToolbarSeparator`'s own `cn("literal", className)` className) — for the
 * same-file cva+parts composition tests below. `Toolbar` itself is dynamic-only (its className is
 * `cn(toolbarVariants({ variant }), className)`, same non-literal-first-arg shape as the fixture's
 * own button.tsx/badge.tsx), so only `ToolbarSeparator` is an editable part in this file.
 */
const TOOLBAR_TSX = `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const toolbarVariants = cva(
  "flex items-center gap-2 rounded-md border p-2",
  {
    variants: {
      variant: {
        default: "bg-background",
        ghost: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToolbarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toolbarVariants> {}

function Toolbar({ className, variant, ...props }: ToolbarProps) {
  return <div className={cn(toolbarVariants({ variant }), className)} {...props} />
}

function ToolbarSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-1 h-4 w-px bg-border", className)} {...props} />
}

export { Toolbar, toolbarVariants, ToolbarSeparator }
`;

/** Clone the shadcn-app fixture, adopt it (apply: true), and boot the resulting adapter-mode project's Studio. */
async function libFixture(t: TestContext, opts: { v3?: boolean; extraFiles?: Record<string, string> } = {}) {
  const root = clone(t);
  if (opts.v3) writeFileSync(join(root, 'app', 'globals.css'), V3_CSS);
  for (const [rel, content] of Object.entries(opts.extraFiles ?? {})) writeFileSync(join(root, rel), content);
  await adopt({ root, apply: true, hooks: false });
  const design = join(root, 'design');
  const dist = join(design, 'dist');
  const { request } = await bootServe(t, dist, design, root);
  return { root, design, dist, request };
}

/**
 * A minimal `IncomingMessage`/`ServerResponse` stand-in for driving `libHandler`'s returned
 * request listener directly, in-process — used only by the save-mutex test below. Real concurrent
 * sockets DO exercise the save-lock guard, but whether two independent connections' bytes actually
 * land in the same Node microtask window is a timing accident (flaky at best, since `handleSave`'s
 * only genuine yield around the critical section is a same-tick microtask, not real I/O). Driving
 * two calls to the same in-process handler lets the test resolve both requests' bodies before
 * either's continuation runs, which deterministically reproduces the interleave the lock guards
 * against: same request-handling code path, same validation, same lock object, no network timing.
 */
function mockReq(opts: { method: string; url: string; body?: string; port?: number }): IncomingMessage {
  const port = opts.port ?? 4600;
  const headers: Record<string, string> = { host: `127.0.0.1:${port}` };
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    headers['content-length'] = String(Buffer.byteLength(opts.body));
  }
  const req = new EventEmitter() as unknown as IncomingMessage;
  Object.assign(req, {
    method: opts.method,
    url: opts.url,
    headers,
    rawHeaders: Object.entries(headers).flatMap(([name, value]) => [name, value]),
    socket: { localPort: port },
    complete: true,
    resume() { return req; },
  });
  return req;
}

function mockRes(): { res: ServerResponse; done: Promise<{ status: number; text: string }> } {
  let settle!: (result: { status: number; text: string }) => void;
  const done = new Promise<{ status: number; text: string }>((resolve) => { settle = resolve; });
  let status = 0;
  const chunks: Buffer[] = [];
  const res = {
    destroyed: false,
    setHeader() {},
    writeHead(code: number) { status = code; },
    end(content?: unknown) {
      if (content !== undefined) chunks.push(Buffer.isBuffer(content) ? content : Buffer.from(String(content)));
      settle({ status, text: Buffer.concat(chunks).toString('utf8') });
    },
  } as unknown as ServerResponse;
  return { res, done };
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

test('GET /api/lib/state exposes each component\'s parts (client-safe subset), and hashes a file with an editable part even without a cva()', async (t) => {
  const f = await libFixture(t);
  const body = (await f.request('/api/lib/state')).json();

  const dialog = body.components.find((c: any) => c.slug === 'dialog');
  assert.ok(dialog, 'dialog is inventoried');
  assert.equal(dialog.cva, undefined, 'dialog.tsx has no cva() at all');
  assert.ok(Array.isArray(dialog.parts), 'dialog exposes a parts array');
  assert.deepEqual(dialog.parts.map((p: any) => p.name), [
    'Dialog', 'DialogTrigger', 'DialogPortal', 'DialogClose',
    'DialogOverlay', 'DialogContent', 'DialogHeader', 'DialogFooter',
    'DialogTitle', 'DialogDescription',
  ]);

  const overlay = dialog.parts.find((p: any) => p.name === 'DialogOverlay');
  assert.equal(overlay.classes, 'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0');
  assert.equal(overlay.dynamicTail, 'className');
  assert.equal(overlay.span, undefined, 'the internal byte-offset span is never exposed to the client');

  const trigger = dialog.parts.find((p: any) => p.name === 'DialogTrigger');
  assert.equal(trigger.classes, undefined);
  assert.equal(trigger.readOnlyReason, 'no static className found');

  const dialogFile = join(f.root, 'src', 'ui', 'dialog.tsx');
  assert.equal(body.hashes[dialogFile], sha256(dialogFile), 'dialog.tsx joins the hash allowlist because it has editable parts, even with zero cva()');
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

test('POST /api/lib/save rejects a non-POST method', async (t) => {
  const f = await libFixture(t);
  const res = await f.request('/api/lib/save', { method: 'GET' });
  assert.equal(res.status, 405);
});

test('POST /api/lib/save writes theme + variant changes in one atomic transaction and returns fresh state', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const button = state.components.find((c: any) => c.slug === 'button');
  const themeFile = join(f.root, 'app', 'globals.css');
  const buttonFile = join(f.root, 'src', 'ui', 'button.tsx');

  const draftTheme = { ...state.theme, vars: { ...state.theme.vars, primary: { light: '#123456', dark: '#abcdef' } } };
  const draftButton = JSON.parse(JSON.stringify(button.cva));
  draftButton.variants.size.sm = ['h-8', 'rounded-md', 'px-5', 'text-xs'];

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ theme: draftTheme, components: { button: draftButton }, hashes: state.hashes }),
  });
  assert.equal(res.status, 200);
  const body = res.json();

  // Response is the same shape as GET /api/lib/state, reflecting the just-saved changes.
  assert.equal(body.theme.vars.primary.light, '#123456');
  assert.equal(body.theme.vars.primary.dark, '#abcdef');
  const updatedButton = body.components.find((c: any) => c.slug === 'button');
  assert.deepEqual(updatedButton.cva.variants.size.sm, ['h-8', 'rounded-md', 'px-5', 'text-xs']);

  // Files actually changed on disk.
  assert.match(readFileSync(themeFile, 'utf8'), /--primary:\s*#123456;/);
  const buttonSource = readFileSync(buttonFile, 'utf8');
  assert.match(buttonSource, /px-5/);
  // Hand-added behavior code, outside the cva() span, survives byte-identically.
  assert.ok(buttonSource.includes('pressedCount'), 'hand-added useState survives the splice');
  assert.ok(buttonSource.includes('export { Button, buttonVariants }'), 'export line survives the splice');

  // Response carries NEW hashes matching the just-written files, not the pre-save ones.
  assert.equal(body.hashes[themeFile], sha256(themeFile));
  assert.equal(body.hashes[buttonFile], sha256(buttonFile));
  assert.notEqual(body.hashes[themeFile], state.hashes[themeFile]);
  assert.notEqual(body.hashes[buttonFile], state.hashes[buttonFile]);

  // Dist regenerated to describe the state just committed, not the pre-save one (DESIGN.md's theme
  // table documents each var's value; it does not list variant class strings, only axis/value names).
  const designMd = readFileSync(join(f.design, 'dist', 'DESIGN.md'), 'utf8');
  assert.match(designMd, /#123456/);
  assert.match(designMd, /#abcdef/);
});

test('POST /api/lib/save applies a part edit (dialog, no cva at all), byte-identical everywhere except the spliced literal', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const dialogFile = join(f.root, 'src', 'ui', 'dialog.tsx');
  const before = readFileSync(dialogFile, 'utf8');
  const footerBefore = state.components.find((c: any) => c.slug === 'dialog').parts.find((p: any) => p.name === 'DialogFooter');
  assert.equal(footerBefore.classes, 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2');

  const newClasses = 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end';
  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parts: { dialog: { DialogFooter: newClasses } }, hashes: state.hashes }),
  });
  assert.equal(res.status, 200);
  const body = res.json();

  const dialogAfter = body.components.find((c: any) => c.slug === 'dialog');
  assert.equal(dialogAfter.parts.find((p: any) => p.name === 'DialogFooter').classes, newClasses);
  // Sibling parts in the same file are untouched.
  assert.equal(dialogAfter.parts.find((p: any) => p.name === 'DialogHeader').classes, 'flex flex-col space-y-1.5 text-center sm:text-left');

  const after = readFileSync(dialogFile, 'utf8');
  assert.ok(after.includes(`"${newClasses}"`));
  const spliceStart = before.indexOf(`"${footerBefore.classes}"`);
  assert.ok(spliceStart >= 0);
  const spliceEnd = spliceStart + `"${footerBefore.classes}"`.length;
  assert.equal(after.slice(0, spliceStart), before.slice(0, spliceStart), 'prefix byte-identical');
  assert.equal(after.slice(after.length - (before.length - spliceEnd)), before.slice(spliceEnd), 'suffix byte-identical');

  assert.equal(body.hashes[dialogFile], sha256(dialogFile));
  assert.notEqual(body.hashes[dialogFile], state.hashes[dialogFile]);

  // Dist regenerated to describe the state just committed, not the pre-save one — the same
  // `nextComponents` override mechanism the cva save test above pins for DESIGN.md's theme table,
  // now also covering a part's classes (componentTable's "parts" column, designmd-lib.ts).
  const designMd = readFileSync(join(f.design, 'dist', 'DESIGN.md'), 'utf8');
  assert.ok(designMd.includes(newClasses), 'DESIGN.md documents the just-saved part classes, not the stale pre-save ones');
});

test('POST /api/lib/save composes a cva edit and a part edit to the SAME file in one transaction', async (t) => {
  const f = await libFixture(t, { extraFiles: { 'src/ui/toolbar.tsx': TOOLBAR_TSX } });
  const state = (await f.request('/api/lib/state')).json();
  const toolbarFile = join(f.root, 'src', 'ui', 'toolbar.tsx');
  const toolbar = state.components.find((c: any) => c.slug === 'toolbar');
  assert.ok(toolbar, 'toolbar.tsx is inventoried');
  assert.ok(toolbar.cva, 'toolbar has a parsed cva spec');
  const separatorBefore = toolbar.parts.find((p: any) => p.name === 'ToolbarSeparator');
  assert.equal(separatorBefore.classes, 'mx-1 h-4 w-px bg-border');
  assert.equal(toolbar.parts.find((p: any) => p.name === 'Toolbar').readOnlyReason, 'dynamic classes only');
  assert.equal(state.hashes[toolbarFile], sha256(toolbarFile), 'toolbar.tsx is hashed: it has both a cva() and an editable part');

  const draftCva = JSON.parse(JSON.stringify(toolbar.cva));
  draftCva.variants.variant.ghost = ['bg-transparent', 'border-dashed'];
  const newSeparatorClasses = 'mx-2 h-6 w-px bg-border/50';

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      components: { toolbar: draftCva },
      parts: { toolbar: { ToolbarSeparator: newSeparatorClasses } },
      hashes: state.hashes,
    }),
  });
  assert.equal(res.status, 200);
  const body = res.json();

  const toolbarAfter = body.components.find((c: any) => c.slug === 'toolbar');
  assert.deepEqual(toolbarAfter.cva.variants.variant.ghost, ['bg-transparent', 'border-dashed']);
  assert.equal(toolbarAfter.parts.find((p: any) => p.name === 'ToolbarSeparator').classes, newSeparatorClasses);

  // Both the cva() call AND the part literal actually parse correctly from the same final file —
  // exactly the "same-file composition" acceptance criterion: cva fixed-point AND part fixed-point.
  const finalSource = readFileSync(toolbarFile, 'utf8');
  assert.match(finalSource, /border-dashed/);
  assert.ok(finalSource.includes(`"${newSeparatorClasses}"`));
  assert.ok(finalSource.includes('export interface ToolbarProps'), 'hand-authored code outside cva/parts spans survives byte-identically');
  assert.ok(finalSource.includes('export { Toolbar, toolbarVariants, ToolbarSeparator }'));

  assert.equal(body.hashes[toolbarFile], sha256(toolbarFile));
  assert.notEqual(body.hashes[toolbarFile], state.hashes[toolbarFile]);
});

test('POST /api/lib/save rejects an unsafe class string in a PART payload (quote breakout), 422, zero writes', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const dialogFile = join(f.root, 'src', 'ui', 'dialog.tsx');
  const before = readFileSync(dialogFile, 'utf8');

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parts: { dialog: { DialogFooter: 'bg-primary" onClick={alert(1)} x="' } }, hashes: state.hashes }),
  });
  assert.equal(res.status, 422);
  const json = res.json();
  assert.equal(json.slug, 'dialog');
  assert.equal(json.partName, 'DialogFooter');
  assert.equal(readFileSync(dialogFile, 'utf8'), before, 'dialog.tsx must be untouched');
});

test('POST /api/lib/save refuses a read-only part in the payload, naming the slug and part, zero writes', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const dialogFile = join(f.root, 'src', 'ui', 'dialog.tsx');
  const before = readFileSync(dialogFile, 'utf8');
  const dialog = state.components.find((c: any) => c.slug === 'dialog');
  const trigger = dialog.parts.find((p: any) => p.name === 'DialogTrigger');
  assert.ok(trigger.readOnlyReason, 'DialogTrigger is a plain alias with no static className: read-only');

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parts: { dialog: { DialogTrigger: 'block' } }, hashes: state.hashes }),
  });
  assert.equal(res.status, 422);
  const json = res.json();
  assert.equal(json.slug, 'dialog');
  assert.equal(json.partName, 'DialogTrigger');
  assert.equal(readFileSync(dialogFile, 'utf8'), before, 'dialog.tsx must be untouched');
});

test('POST /api/lib/save rejects an unknown part name, naming the slug and part, zero writes', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const dialogFile = join(f.root, 'src', 'ui', 'dialog.tsx');
  const before = readFileSync(dialogFile, 'utf8');

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parts: { dialog: { NoSuchPart: 'block' } }, hashes: state.hashes }),
  });
  assert.equal(res.status, 422);
  const json = res.json();
  assert.equal(json.slug, 'dialog');
  assert.equal(json.partName, 'NoSuchPart');
  assert.equal(readFileSync(dialogFile, 'utf8'), before, 'dialog.tsx must be untouched');
});

test('POST /api/lib/save with an empty parts map for an otherwise-valid slug is a graceful no-op (does not crash), file untouched', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const dialogFile = join(f.root, 'src', 'ui', 'dialog.tsx');
  const before = readFileSync(dialogFile, 'utf8');

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parts: { dialog: {} }, hashes: state.hashes }),
  });
  assert.equal(res.status, 200);
  assert.equal(readFileSync(dialogFile, 'utf8'), before, 'dialog.tsx must be untouched: nothing was actually spliced');
});

test('POST /api/lib/save serializes concurrent saves: the second gets 409 "already in progress", first wins, second never writes', async (t) => {
  // In-process, not the spawned-child-process `libFixture` — see mockReq/mockRes above for why.
  const root = clone(t);
  await adopt({ root, apply: true, hooks: false });
  const design = join(root, 'design');
  const project = findProject(root);
  assert.ok(project?.adapter, 'fixture must adopt into an adapter-mode project');
  const handler = libHandler(root, project!.adapter!, design);

  const stateReq = mockReq({ method: 'GET', url: '/api/lib/state' });
  const stateRes = mockRes();
  await handler(stateReq, stateRes.res);
  const state = JSON.parse((await stateRes.done).text);

  const themeFile = join(root, 'app', 'globals.css');
  const buttonFile = join(root, 'src', 'ui', 'button.tsx');
  const button = state.components.find((c: any) => c.slug === 'button');

  const draftTheme = { ...state.theme, vars: { ...state.theme.vars, primary: { light: '#111111', dark: '#222222' } } };
  const bodyA = JSON.stringify({ theme: draftTheme, hashes: state.hashes });

  const draftButton = JSON.parse(JSON.stringify(button.cva));
  draftButton.variants.size.sm = ['h-8', 'rounded-md', 'px-5', 'text-xs'];
  const bodyB = JSON.stringify({ components: { button: draftButton }, hashes: state.hashes });

  const reqA = mockReq({ method: 'POST', url: '/api/lib/save', body: bodyA });
  const resA = mockRes();
  const reqB = mockReq({ method: 'POST', url: '/api/lib/save', body: bodyB });
  const resB = mockRes();

  // Start both requests — each suspends at its own `await readBody(req)`, having done nothing else
  // yet (no disk reads, no lock check). Then resolve A's body before B's, synchronously and back to
  // back: this queues A's post-body continuation ahead of B's on the microtask queue. A's
  // continuation runs first, sets the save lock, and itself suspends at `await buildLibWrites(...)`
  // — only then does B's (already-queued) continuation run and observe the lock held, deterministically
  // exercising the busy-response path instead of racing real socket timing.
  const pA = handler(reqA, resA.res);
  const pB = handler(reqB, resB.res);
  reqA.emit('data', Buffer.from(bodyA));
  reqA.emit('end');
  reqB.emit('data', Buffer.from(bodyB));
  reqB.emit('end');
  await Promise.all([pA, pB]);

  const [resultA, resultB] = await Promise.all([resA.done, resB.done]);
  assert.equal(resultA.status, 200, 'the first save proceeds');
  assert.equal(resultB.status, 409, 'the second save is refused while the first is in flight');
  const busy = JSON.parse(resultB.text);
  assert.equal(busy.ok, false);
  assert.match(busy.error, /already in progress/);

  assert.match(readFileSync(themeFile, 'utf8'), /--primary:\s*#111111;/, "A's theme change landed");
  assert.ok(!readFileSync(buttonFile, 'utf8').includes('px-5'), "B's rejected variant change never touched disk");
});

test('POST /api/lib/save refuses on a conflicting hash: names the stale file, writes nothing', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const themeFile = join(f.root, 'app', 'globals.css');
  const buttonFile = join(f.root, 'src', 'ui', 'button.tsx');
  const cssBefore = readFileSync(themeFile, 'utf8');
  const buttonBefore = readFileSync(buttonFile, 'utf8');

  // Simulate a concurrent edit to a file the client isn't even touching in this save: its stale
  // hash (still part of the client's last-known `hashes` snapshot) must still block the save.
  writeFileSync(buttonFile, buttonBefore + '\n// concurrent edit\n');

  const draft = { ...state.theme, vars: { ...state.theme.vars, primary: { light: '#000000', dark: '#ffffff' } } };
  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ theme: draft, hashes: state.hashes }),
  });
  assert.equal(res.status, 409);
  assert.equal(res.json().file, buttonFile);
  assert.equal(readFileSync(themeFile, 'utf8'), cssBefore, 'globals.css must be untouched when the save is refused');
});

test('POST /api/lib/save refuses a PARTS-only save on a conflicting hash: names the stale file, writes nothing', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const dialogFile = join(f.root, 'src', 'ui', 'dialog.tsx');
  const dialogBefore = readFileSync(dialogFile, 'utf8');

  // Simulate a concurrent edit to the very file this save's part targets.
  writeFileSync(dialogFile, dialogBefore + '\n// concurrent edit\n');

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parts: { dialog: { DialogFooter: 'flex gap-2' } }, hashes: state.hashes }),
  });
  assert.equal(res.status, 409);
  assert.equal(res.json().file, dialogFile);
  assert.equal(readFileSync(dialogFile, 'utf8'), dialogBefore + '\n// concurrent edit\n', 'dialog.tsx must be untouched (still holding only the concurrent edit) when the save is refused');
});

test('POST /api/lib/save rejects an unknown top-level field', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hashes: state.hashes, extra: 1 }),
  });
  assert.equal(res.status, 400);
});

test('POST /api/lib/save refuses a read-only component slug (badge), naming it', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ components: { badge: { base: ['x'], variants: {}, compoundVariants: [], defaultVariants: {} } }, hashes: state.hashes }),
  });
  assert.equal(res.status, 422);
  assert.equal(res.json().slug, 'badge');
  assert.equal(readFileSync(join(f.root, 'src', 'ui', 'badge.tsx'), 'utf8'), readFileSync(new URL('./fixtures/shadcn-app/src/ui/badge.tsx', import.meta.url), 'utf8'), 'badge.tsx must be untouched');
});

test('POST /api/lib/save refuses an unknown component slug, naming it', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ components: { nope: { base: ['x'], variants: {}, compoundVariants: [], defaultVariants: {} } }, hashes: state.hashes }),
  });
  assert.equal(res.status, 422);
  assert.equal(res.json().slug, 'nope');
});

test('POST /api/lib/save requires a hash for every file it is about to touch (missing hash is a client bug -> 400)', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const button = state.components.find((c: any) => c.slug === 'button');
  const buttonFile = join(f.root, 'src', 'ui', 'button.tsx');
  const buttonBefore = readFileSync(buttonFile, 'utf8');

  // hashes omits the button file entirely, even though `components.button` is being saved.
  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ components: { button: button.cva }, hashes: {} }),
  });
  assert.equal(res.status, 400);
  assert.equal(readFileSync(buttonFile, 'utf8'), buttonBefore, 'button.tsx must be untouched');
});

// `writeTheme` splices a theme var's NAME (for a var not already present in the CSS block) and
// VALUE into the theme file. A name like `primary;}body{background:red` would close the
// custom-property declaration and the `:root` block early, then open an attacker-controlled rule.
// `draftTheme`'s own docstring already flags this as out of scope for shape validation ("not the
// CSS-injection guard ... that belongs to the write path, Task 4") — Task 4 adds that guard to
// `writeTheme` (`validateThemeVars`) and wires its throw to a 422 here.
test('POST /api/lib/save rejects a CSS-injecting theme var name', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const hostileName = 'primary;}body{background:red';
  const draft = { ...state.theme, vars: { ...state.theme.vars, [hostileName]: { light: 'red' } } };

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ theme: draft, hashes: state.hashes }),
  });
  assert.ok(res.status === 400 || res.status === 422, `expected 400/422 rejecting the hostile var name, got ${res.status}`);
  const css = readFileSync(join(f.root, 'app', 'globals.css'), 'utf8');
  assert.ok(!css.includes('body{background:red'), 'hostile CSS must never be spliced into the theme file');
});

test('POST /api/lib/save rejects a CSS-injecting theme var value (`;}`), naming the theme field, writing nothing', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const cssBefore = readFileSync(join(f.root, 'app', 'globals.css'), 'utf8');
  const draft = { ...state.theme, vars: { ...state.theme.vars, primary: { light: 'red;}body{background:red' } } };

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ theme: draft, hashes: state.hashes }),
  });
  assert.equal(res.status, 422);
  assert.equal(res.json().field, 'theme');
  assert.equal(readFileSync(join(f.root, 'app', 'globals.css'), 'utf8'), cssBefore, 'hostile CSS must never be spliced into the theme file');
});

test('POST /api/lib/save rejects a hostile class string with quotes on a component, naming the slug, writing nothing', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const button = state.components.find((c: any) => c.slug === 'button');
  const buttonFile = join(f.root, 'src', 'ui', 'button.tsx');
  const buttonBefore = readFileSync(buttonFile, 'utf8');
  const draftButton = JSON.parse(JSON.stringify(button.cva));
  draftButton.variants.size.sm = ['h-8" onClick={alert(1)} x="'];

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ components: { button: draftButton }, hashes: state.hashes }),
  });
  assert.equal(res.status, 422);
  assert.equal(res.json().slug, 'button');
  assert.equal(readFileSync(buttonFile, 'utf8'), buttonBefore, 'button.tsx must be untouched');
});

test('POST /api/lib/save rejects a hostile variant axis value (JSX attribute breakout via `"`), naming the slug, writing nothing', async (t) => {
  // CRITICAL from Task 3's review: `unsafeVariantKey` existed but `writeVariants` never called it —
  // a crafted axis value like this one would reach a generated `.stories.tsx` file as executable
  // JSX (shadcn/render.ts's `attrString` interpolates the value unescaped into `name="value"`).
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const button = state.components.find((c: any) => c.slug === 'button');
  const buttonFile = join(f.root, 'src', 'ui', 'button.tsx');
  const buttonBefore = readFileSync(buttonFile, 'utf8');
  const draftButton = JSON.parse(JSON.stringify(button.cva));
  draftButton.variants.size['sm" onClick={alert(1)} x="'] = ['h-8'];

  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ components: { button: draftButton }, hashes: state.hashes }),
  });
  assert.equal(res.status, 422);
  assert.equal(res.json().slug, 'button');
  assert.equal(readFileSync(buttonFile, 'utf8'), buttonBefore, 'button.tsx must be untouched');
});

test('POST /api/lib/save rejects an unknown path in hashes (not the theme file or an inventoried cva component), 400, no hang', async (t) => {
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const bogusPath = join(f.root, 'definitely-not-a-tracked-file.css');
  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hashes: { ...state.hashes, [bogusPath]: 'deadbeef' } }),
  });
  assert.equal(res.status, 400);
});

test('POST /api/lib/save rejects a read-only component file (badge) listed in hashes, even with its real hash', async (t) => {
  // `stateHashes` never hands out a hash for a read-only component (see the state test above), so
  // that path is never a legitimate key of `hashes` — the same "known files" allowlist that blocks
  // an arbitrary path also blocks naming a real-but-unhashed repo file this way.
  const f = await libFixture(t);
  const state = (await f.request('/api/lib/state')).json();
  const badgeFile = join(f.root, 'src', 'ui', 'badge.tsx');
  const res = await f.request('/api/lib/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hashes: { ...state.hashes, [badgeFile]: createHash('sha256').update(readFileSync(badgeFile)).digest('hex') } }),
  });
  assert.equal(res.status, 400);
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
