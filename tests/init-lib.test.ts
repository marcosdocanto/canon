import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initLib, CORE_SLUGS } from '../src/init-lib.ts';
import { findProject } from '../src/project.ts';
import { shadcnAdapter } from '../src/adapters/shadcn/index.ts';
import type { ExecFn } from '../src/adapters/types.ts';
import { FIXTURE, clone } from './fixtures/clone.ts';

const BIN = fileURLToPath(new URL('../bin/canon.js', import.meta.url));

function primaryValue(css: string): string | undefined {
  return /--primary:\s*([^;]+);/.exec(css)?.[1];
}

test('initLib: not detected -> runs shadcn init + core-slug add via exec, writes the preset theme, builds stories/DESIGN.md, records the adapter', async (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon init-lib-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const calls: { cmd: string; args: string[]; cwd: string }[] = [];
  const fakeExec: ExecFn = async (cmd, args, opts) => {
    calls.push({ cmd, args, cwd: opts.cwd });
    // Fake shadcn's own CLI: materialize the fixture files, as `shadcn init`/`shadcn add` would.
    cpSync(FIXTURE, opts.cwd, { recursive: true });
    return { status: 0, stdout: '', stderr: '' };
  };

  const originalPrimary = primaryValue(readFileSync(join(FIXTURE, 'app', 'globals.css'), 'utf8'));
  assert.ok(originalPrimary, 'sanity: fixture has a --primary value');

  await initLib({ root, lib: 'shadcn', preset: 'vera', name: 'Test Lib', exec: fakeExec, hooks: true });

  assert.equal(calls.length, 2, 'expected exactly one init call and one add call');
  assert.equal(calls[0].cmd, 'npx');
  assert.deepEqual(calls[0].args, ['shadcn@latest', 'init', '--yes', '-b', 'radix']);
  assert.equal(calls[0].cwd, root);
  assert.equal(calls[1].cmd, 'npx');
  assert.deepEqual(calls[1].args.slice(0, 2), ['shadcn@latest', 'add']);
  assert.ok(calls[1].args.includes('--yes'));
  for (const slug of CORE_SLUGS) assert.ok(calls[1].args.includes(slug), `add call installs core slug "${slug}"`);
  assert.equal(calls[1].cwd, root);

  const cssAfter = readFileSync(join(root, 'app', 'globals.css'), 'utf8');
  const newPrimary = primaryValue(cssAfter);
  assert.ok(newPrimary, '--primary is still present after the theme write');
  assert.notEqual(newPrimary, originalPrimary, '--primary must be rewritten from the chosen preset (init writes the theme)');

  assert.ok(existsSync(join(root, 'stories', 'canon', 'button.stories.tsx')), 'a story was generated from the library\'s real inventory');
  assert.ok(existsSync(join(root, 'DESIGN.md')), 'DESIGN.md was installed at the project root');
  assert.ok(existsSync(join(root, 'design', 'system.json')), 'lean design dir was written');
  assert.ok(!existsSync(join(root, 'design', 'components')), 'no native catalog in library mode');

  const project = findProject(root);
  assert.equal(project?.adapter, 'shadcn', 'the adapter is recorded in .canon/project.json');
});

test('initLib: already detected -> skips the library\'s own init/add, still seeds the theme and builds', async (t) => {
  const root = clone(t); // fixture is already a shadcn project (components.json present)

  let called = false;
  const fakeExec: ExecFn = async () => { called = true; return { status: 0, stdout: '', stderr: '' }; };

  const originalPrimary = primaryValue(readFileSync(join(root, 'app', 'globals.css'), 'utf8'));

  await initLib({ root, lib: 'shadcn', name: 'Already Adopted', exec: fakeExec, hooks: true });

  assert.equal(called, false, 'must not shell out when the library is already present');
  const newPrimary = primaryValue(readFileSync(join(root, 'app', 'globals.css'), 'utf8'));
  assert.notEqual(newPrimary, originalPrimary, 'theme is still seeded from the preset even when already detected');
  assert.equal(findProject(root)?.adapter, 'shadcn');
});

test('initLib delegates the library\'s own project init to adapter.initProject — no hardcoded library literal in core', async (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon init-lib-delegate-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  // Monkeypatch the shadcn adapter singleton itself (restored in t.after): if `initLib` ever went
  // back to shelling out directly with a literal `npx shadcn@latest init …` instead of calling
  // through the adapter, these spies would never fire and this test would fail — the same way a
  // second adapter's `initProject` would never be reached by a hardcoded shadcn literal in core.
  const originalInitProject = shadcnAdapter.initProject;
  const originalInstall = shadcnAdapter.install;
  let initProjectRoot: string | undefined;
  let installCalledWithCoreSlugs: string[] | undefined;
  shadcnAdapter.initProject = async (r) => { initProjectRoot = r; cpSync(FIXTURE, r, { recursive: true }); };
  shadcnAdapter.install = async (r, slugs) => { installCalledWithCoreSlugs = slugs; };
  t.after(() => { shadcnAdapter.initProject = originalInitProject; shadcnAdapter.install = originalInstall; });

  const neverCalled: ExecFn = async () => { throw new Error('initLib must not call exec directly; it must go through the adapter'); };

  await initLib({ root, lib: 'shadcn', name: 'Delegate Test', exec: neverCalled, hooks: true });

  assert.equal(initProjectRoot, root, 'initLib calls adapter.initProject(root, exec), not a literal exec call');
  assert.deepEqual(installCalledWithCoreSlugs, CORE_SLUGS, 'initLib calls adapter.install(root, CORE_SLUGS, exec) via the adapter, unchanged');
});

test('initLib refuses to clobber an existing native design/system.json without --force', async (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon init-lib-guard-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'design'), { recursive: true });
  const marker = JSON.stringify({ marker: "this repo's own native design" });
  writeFileSync(join(root, 'design', 'system.json'), marker);

  let execCalled = false;
  const fakeExec: ExecFn = async () => { execCalled = true; return { status: 0, stdout: '', stderr: '' }; };

  await assert.rejects(
    () => initLib({ root, lib: 'shadcn', name: 'Guard Test', exec: fakeExec, hooks: true }),
    /design[\\/]system\.json already exists.*--force/s,
  );

  assert.equal(readFileSync(join(root, 'design', 'system.json'), 'utf8'), marker, "the repo's own native design/system.json must be untouched");
  assert.equal(execCalled, false, "must fail fast, before ever shelling out to the library's own init");
  assert.equal(existsSync(join(root, '.canon', 'project.json')), false, 'no project config must be written on refusal');
});

test('initLib overwrites an existing native design/system.json when force is set', async (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon init-lib-force-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'design'), { recursive: true });
  writeFileSync(join(root, 'design', 'system.json'), JSON.stringify({ marker: 'stale native design' }));

  const fakeExec: ExecFn = async (cmd, args, opts) => { cpSync(FIXTURE, opts.cwd, { recursive: true }); return { status: 0, stdout: '', stderr: '' }; };

  await initLib({ root, lib: 'shadcn', name: 'Force Test', exec: fakeExec, hooks: true, force: true });

  assert.equal(findProject(root)?.adapter, 'shadcn');
  const system = JSON.parse(readFileSync(join(root, 'design', 'system.json'), 'utf8'));
  assert.notEqual(system.marker, 'stale native design', 'the stale native design/system.json must have been overwritten');
});

test('initLib re-running on an already adapter-managed design proceeds without --force', async (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon init-lib-readopt-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const fakeExec: ExecFn = async (cmd, args, opts) => { cpSync(FIXTURE, opts.cwd, { recursive: true }); return { status: 0, stdout: '', stderr: '' }; };

  // First run bootstraps the adapter-managed design.
  await initLib({ root, lib: 'shadcn', preset: 'canon', name: 'Readopt Test', exec: fakeExec, hooks: true });
  assert.equal(findProject(root)?.adapter, 'shadcn');

  // Second run: design/system.json now exists AND is adapter-managed -> must proceed without --force.
  await assert.doesNotReject(() => initLib({ root, lib: 'shadcn', preset: 'vera', name: 'Readopt Test', exec: fakeExec, hooks: true }));
  assert.equal(findProject(root)?.adapter, 'shadcn');
});

test('CLI: `canon adopt` (plan only) exits 0 and prints plan lines without writing anything', (t) => {
  const root = clone(t);
  const result = spawnSync(process.execPath, [BIN, 'adopt'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /design\/system\.json/);
  assert.match(result.stdout, /\.canon\/project\.json/);
  assert.equal(existsSync(join(root, '.canon')), false, 'plan-only must not write anything');
});

test('CLI: `canon adopt --apply` then `canon build` both exit 0 (build routes to buildLib)', (t) => {
  const root = clone(t);
  const apply = spawnSync(process.execPath, [BIN, 'adopt', '--apply'], { cwd: root, encoding: 'utf8' });
  assert.equal(apply.status, 0, apply.stderr || apply.stdout);
  assert.equal(findProject(root)?.adapter, 'shadcn');

  const build = spawnSync(process.execPath, [BIN, 'build'], { cwd: root, encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  assert.match(build.stdout, /library-mode dist/);
});

test('CLI: `canon check` exits 0 in a freshly adopted+built library-mode project, and nonzero once the theme file changes', (t) => {
  const root = clone(t);
  const apply = spawnSync(process.execPath, [BIN, 'adopt', '--apply'], { cwd: root, encoding: 'utf8' });
  assert.equal(apply.status, 0, apply.stderr || apply.stdout);
  const build = spawnSync(process.execPath, [BIN, 'build'], { cwd: root, encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr || build.stdout);

  const fresh = spawnSync(process.execPath, [BIN, 'check'], { cwd: root, encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
  assert.match(fresh.stdout, /up to date/);

  // Touch the theme file the adapter reads and bump its mtime well into the future, so the
  // comparison against the dist files' mtimes can never be flaky on a coarse filesystem clock.
  const css = join(root, 'app', 'globals.css');
  writeFileSync(css, readFileSync(css, 'utf8') + '\n/* touched */\n');
  const future = new Date(Date.now() + 60_000);
  utimesSync(css, future, future);

  const stale = spawnSync(process.execPath, [BIN, 'check'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(stale.status, 0, stale.stdout);
  assert.match(stale.stdout, /stale/i);
  assert.match(stale.stdout, /globals\.css/);
});

test('CLI: `canon add <slug>` routes to the adapter in an adopted (library-mode) project', (t) => {
  const root = clone(t);
  const apply = spawnSync(process.execPath, [BIN, 'adopt', '--apply'], { cwd: root, encoding: 'utf8' });
  assert.equal(apply.status, 0, apply.stderr || apply.stdout);

  // Fake `npx` on PATH so the routing is provable without any network access: a real npx install
  // would need the network, but all we need to prove here is that `add` reached the shadcn adapter
  // (`adapter.install` -> `exec('npx', ['shadcn@latest', 'add', ...])`) instead of the native
  // catalog path (which never shells out at all).
  const fakeBin = mkdtempSync(join(tmpdir(), 'canon fake-npx-'));
  t.after(() => rmSync(fakeBin, { recursive: true, force: true }));
  const npxPath = join(fakeBin, 'npx');
  writeFileSync(npxPath, '#!/bin/sh\necho "FAKE_NPX $@" 1>&2\nexit 7\n');
  chmodSync(npxPath, 0o755);

  const result = spawnSync(process.execPath, [BIN, 'add', 'button'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` },
  });

  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /shadcn adapter: install failed \(exit 7\)/);
  assert.match(result.stderr, /FAKE_NPX shadcn@latest add --yes button/);
});
