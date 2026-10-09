import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as core from '../src/harness/runner.ts';
import * as configApi from '../src/harness/config.ts';
import * as reports from '../src/harness/report.ts';
const base = () => ({ schemaVersion: 1, context: { documents: [], skills: [] }, checks: [], scenarios: [], completion: { requiredChecks: [], requiredScenarios: [] } });
async function fixture(t: any, config: any = base()) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'canon-harness-core-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'canon.config.json'), JSON.stringify(config));
  await writeFile(join(root, 'package.json'), '{}');
  await writeFile(join(root, 'source.txt'), 'one');
  return root;
}

test('config discovers nearest config inside project boundary and rejects unsupported schema properties', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'src', 'nested'), { recursive: true });
  assert.equal((await configApi.loadHarnessConfig(join(root, 'src', 'nested'))).root, root);
  await writeFile(join(root, 'canon.config.json'), JSON.stringify({ ...base(), typo: true }));
  await assert.rejects(configApi.loadHarnessConfig(root), /typo/);
  await mkdir(join(root, 'child'));
  await writeFile(join(root, 'child', 'package.json'), '{}');
  await assert.rejects(configApi.loadHarnessConfig(join(root, 'child')), /canon.config.json/);
});

test('config rejects duplicate IDs, unknown completion IDs, invalid argv and unsafe paths', async t => {
  const root = await fixture(t);
  const cases = [
    { checks: [{ id: 'x', command: ['echo'] }, { id: 'x', command: ['echo'] }], match: /duplicate/i },
    { completion: { requiredChecks: ['missing'], requiredScenarios: [] }, match: /missing/ },
    { checks: [{ id: 'x', command: 'echo yes' }], match: /command/ },
    { checks: [{ id: 'x', command: ['echo'], cwd: '../outside' }], match: /cwd/ },
    { scenarios: [{ id: 'x', path: 'https://example.com', viewports: [{ name: 'phone', width: 0, height: 100 }] }], match: /path|width/ },
  ];
  for (const { match, ...values } of cases) {
    await writeFile(join(root, 'canon.config.json'), JSON.stringify({ ...base(), ...values }));
    await assert.rejects(configApi.loadHarnessConfig(root), match);
  }
});

test('doctor reports missing context without requiring a Canon design binding', async t => {
  const config = base(); config.context.documents = ['missing.md'] as never[];
  const root = await fixture(t, config);
  const bad = await configApi.doctorHarness(root);
  assert.equal(bad.ok, false); assert.match(bad.errors.join(' '), /missing.md/);
  await writeFile(join(root, 'missing.md'), '# Context');
  assert.equal((await configApi.doctorHarness(root)).ok, true);
});

test('verify records real argv subprocess exit, missing command, timeout, bounded logs and report artifacts', async t => {
  const config: any = base();
  config.checks = [
    { id: 'ok', command: [process.execPath, '-e', 'console.log(process.argv[1])', 'hello;$(echo bad)'] },
    { id: 'bad', command: [process.execPath, '-e', 'process.exit(7)'] },
    { id: 'missing', command: ['canon-not-a-real-executable-456'] },
    { id: 'slow', command: [process.execPath, '-e', 'setInterval(()=>{},1000)'], timeoutMs: 80 },
    { id: 'loud', command: [process.execPath, '-e', 'process.stdout.write("x".repeat(200000))'] },
  ];
  config.completion.requiredChecks = ['ok', 'bad', 'missing', 'slow'];
  const root = await fixture(t, config);
  const report = await core.verifyHarness(root);
  assert.deepEqual(report.checks.map((x: any) => x.status), ['passed', 'failed', 'error', 'timeout', 'passed']);
  assert.equal(report.checks[1].exitCode, 7);
  assert.match(report.checks[0].stdout, /hello;\$\(echo bad\)/);
  assert.ok(report.checks[4].stdout.length < 70000);
  assert.equal(report.ready, false); assert.equal(report.stale, false);
  for (const name of ['manifest.json', 'report.json', 'report.html', 'report.md']) assert.ok((await readFile(join(report.runDir, name), 'utf8')).length);
});

test('fresh report becomes stale after file mutation, deletion, or config change', async t => {
  const config: any = base(); config.checks = [{ id: 'ok', command: [process.execPath, '-e', 'process.exit(0)'] }]; config.completion.requiredChecks = ['ok'];
  for (const change of ['edit', 'delete', 'config']) {
    const root = await fixture(t, config);
    const result = await core.verifyHarness(root);
    assert.equal(result.ready, true);
    assert.equal((await reports.readHarnessReport(root)).ready, true);
    if (change === 'edit') await writeFile(join(root, 'source.txt'), 'two');
    if (change === 'delete') await rm(join(root, 'source.txt'));
    if (change === 'config') await writeFile(join(root, 'canon.config.json'), JSON.stringify({ ...config, context: { documents: ['source.txt'], skills: [] } }));
    const stale = await reports.readHarnessReport(root);
    assert.equal(stale.stale, true, change); assert.equal(stale.ready, false, change);
  }
});

test('source mutations during verify invalidate executed passes', async t => {
  const config: any = base(); config.checks = [{ id: 'mutates', command: [process.execPath, '-e', 'require("fs").writeFileSync("source.txt","changed")'] }]; config.completion.requiredChecks = ['mutates'];
  const result = await core.verifyHarness(await fixture(t, config));
  assert.equal(result.checks[0].status, 'passed'); assert.equal(result.stale, true); assert.equal(result.ready, false);
});

test('capture evidence must cover required viewports and content tampering invalidates readiness', async t => {
  const config: any = base(); config.app = { url: 'http://127.0.0.1:3456' }; config.scenarios = [{ id: 'home', path: '/', viewports: [{ name: 'phone', width: 390, height: 844 }] }]; config.completion.requiredScenarios = ['home'];
  const root = await fixture(t, config);
  const absent = await core.verifyHarness(root);
  assert.equal(absent.ready, false);
  const result = await core.verifyHarness(root, { capture: async ({ runDir }: any) => {
    await writeFile(join(runDir, 'home.png'), 'screenshot-bytes');
    return [{ scenarioId: 'home', viewport: 'phone', status: 'captured', path: 'home.png' }];
  }});
  assert.equal(result.ready, true); assert.ok(result.captures[0].sha256);
  await writeFile(join(result.runDir, 'home.png'), 'altered');
  const stale = await reports.readHarnessReport(root, result.runId);
  assert.equal(stale.ready, false); assert.equal(stale.stale, true);
});

test('git snapshot includes untracked and deleted files but ignores generated runtime outputs', async t => {
  const root = await fixture(t);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  await writeFile(join(root, '.gitignore'), 'dist/\n');
  const result = await core.verifyHarness(root);
  await mkdir(join(root, 'dist')); await writeFile(join(root, 'dist', 'bundle.js'), 'built');
  assert.equal((await reports.readHarnessReport(root)).stale, false);
  await writeFile(join(root, 'new.ts'), 'new source');
  assert.equal((await reports.readHarnessReport(root)).stale, true);
  assert.equal(result.stale, false);
});

test('reports escape command output and do not treat capture as visual or accessibility approval', async t => {
  const config: any = base(); config.checks = [{ id: 'ok', command: [process.execPath, '-e', 'console.log("<script>alert(1)</script>\\n```\\n![evil](https://evil.invalid)")'] }]; config.completion.requiredChecks = ['ok'];
  const result = await core.verifyHarness(await fixture(t, config));
  const html = await readFile(join(result.runDir, 'report.html'), 'utf8');
  assert.ok(!html.includes('<script>alert(1)</script>')); assert.match(html, /&lt;script&gt;/);
  const md = await readFile(join(result.runDir, 'report.md'), 'utf8');
  assert.ok(!md.includes('\n![evil]'));
  assert.match(html, /not.*visual|does not.*visual/i);
  assert.match(html, /at run completion/); assert.match(html, /canon report/);
});

test('empty completion and cancelled checks cannot establish readiness', async t => {
  const root = await fixture(t);
  assert.equal((await core.verifyHarness(root)).ready, false);
  const config: any = base(); config.checks = [{ id: 'slow', command: [process.execPath, '-e', 'setInterval(()=>{},1000)'] }]; config.completion.requiredChecks = ['slow'];
  await writeFile(join(root, 'canon.config.json'), JSON.stringify(config));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 100);
  const result = await core.verifyHarness(root, { signal: controller.signal });
  clearTimeout(timer);
  assert.equal(result.ready, false); assert.equal(result.checks[0].status, 'cancelled');
  assert.equal((await reports.readHarnessReport(root)).ready, false);
});

test('capture cannot alias the generated report or reuse one artifact for two viewports', async t => {
  const config: any = base(); config.app = { url: 'http://localhost:3456' }; config.scenarios = [{ id: 'home', path: '/', viewports: [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1200, height: 800 }] }]; config.completion.requiredScenarios = ['home'];
  const root = await fixture(t, config);
  const alias = await core.verifyHarness(root, { capture: async ({ runDir }: any) => {
    await writeFile(join(runDir, 'report.json'), 'bytes');
    await writeFile(join(runDir, 'desktop.png'), 'bytes');
    return [{ scenarioId: 'home', viewport: 'phone', status: 'captured', path: './report.json' }, { scenarioId: 'home', viewport: 'desktop', status: 'captured', path: 'desktop.png' }];
  }});
  assert.equal(alias.ready, false);
  const reused = await core.verifyHarness(root, { capture: async ({ runDir }: any) => {
    await writeFile(join(runDir, 'home.png'), 'bytes');
    return ['phone', 'desktop'].map(viewport => ({ scenarioId: 'home', viewport, status: 'captured', path: 'home.png' }));
  }});
  assert.equal(reused.ready, false);
});

test('timeout terminates descendants even if direct child exits while descendant ignores TERM', { skip: process.platform === 'win32' }, async t => {
  const config: any = base();
  const child = 'process.on("SIGTERM",()=>{});setTimeout(()=>{require("fs").writeFileSync("leaked.txt","leaked");process.exit(0)},800)';
  config.checks = [{ id: 'tree', timeoutMs: 250, command: [process.execPath, '-e', `require('child_process').spawn(process.execPath,['-e',${JSON.stringify(child)}],{stdio:'ignore'});setInterval(()=>{},1000)`] }];
  config.completion.requiredChecks = ['tree'];
  const root = await fixture(t, config);
  const result = await core.verifyHarness(root);
  assert.equal(result.checks[0].status, 'timeout');
  await new Promise(resolve => setTimeout(resolve, 900));
  await assert.rejects(readFile(join(root, 'leaked.txt')), /ENOENT/);
});

test('rendered captures disclose external-server provenance and their URL', async t => {
  const config: any = base(); config.app = { url: 'http://localhost:3456' }; config.scenarios = [{ id: 'home', path: '/', viewports: [{ name: 'phone', width: 390, height: 844 }] }]; config.completion.requiredScenarios = ['home'];
  const result = await core.verifyHarness(await fixture(t, config), { capture: async ({ runDir }: any) => {
    await writeFile(join(runDir, 'home.png'), 'bytes');
    return [{ scenarioId: 'home', viewport: 'phone', status: 'captured', path: 'home.png', server: 'external', url: 'http://localhost:3456/' }];
  }});
  for (const filename of ['report.html', 'report.md']) {
    const contents = await readFile(join(result.runDir, filename), 'utf8');
    if (filename === 'report.html') assert.match(contents, /<img[^>]+src="home.png"/);
    assert.match(contents, /external/); assert.match(contents, /http:\/\/localhost:3456\//); assert.match(contents, /not.*source revision/);
  }
});

test('config and run output symlinks cannot escape the selected project root', async t => {
  const { symlink } = await import('node:fs/promises');
  const root = await fixture(t); const outside = await fixture(t);
  await rm(join(root, 'canon.config.json'));
  await symlink(join(outside, 'canon.config.json'), join(root, 'canon.config.json'));
  await assert.rejects(configApi.loadHarnessConfig(root), /symlink|outside|escapes/);
  await rm(join(root, 'canon.config.json'));
  await writeFile(join(root, 'canon.config.json'), JSON.stringify(base()));
  await mkdir(join(root, '.canon')); await symlink(outside, join(root, '.canon', 'runs'));
  await assert.rejects(core.verifyHarness(root), /symlink|outside|escapes/);
});

test('configured context symlinks fingerprint dereferenced Git-ignored content', async t => {
  const { symlink } = await import('node:fs/promises');
  const config: any = base(); config.context.documents = ['DESIGN.md']; config.checks = [{ id: 'ok', command: [process.execPath, '-e', 'process.exit(0)'] }]; config.completion.requiredChecks = ['ok'];
  const root = await fixture(t, config);
  execFileSync('git', ['init', '-q'], { cwd: root });
  await mkdir(join(root, 'private-context')); await writeFile(join(root, 'private-context', 'design.md'), '# Before');
  await writeFile(join(root, '.gitignore'), 'private-context/\n');
  await symlink('private-context/design.md', join(root, 'DESIGN.md'));
  const result = await core.verifyHarness(root);
  assert.equal(result.ready, true);
  await writeFile(join(root, 'private-context', 'design.md'), '# After');
  const stale = await reports.readHarnessReport(root);
  assert.equal(stale.stale, true); assert.equal(stale.ready, false);
});

for (const change of ['corrupt', 'delete']) test(`nested report discovery returns stale evidence after ${change} config`, async t => {
  const config: any = base(); config.checks = [{ id: 'ok', command: [process.execPath, '-e', 'process.exit(0)'] }]; config.completion.requiredChecks = ['ok'];
  const root = await fixture(t, config);
  await mkdir(join(root, 'src'));
  const result = await core.verifyHarness(root);
  assert.equal(result.ready, true);
  if (change === 'corrupt') await writeFile(join(root, 'canon.config.json'), '{broken');
  else await rm(join(root, 'canon.config.json'));
  const stale = await reports.readHarnessReport(join(root, 'src'));
  assert.equal(stale.runId, result.runId); assert.equal(stale.root, root);
  assert.equal(stale.stale, true); assert.equal(stale.ready, false);
  assert.match(stale.errors.join(' '), /configuration/);
});

test('report discovery cannot borrow a parent run across a nested project boundary', async t => {
  const root = await fixture(t);
  await core.verifyHarness(root);
  await mkdir(join(root, 'child')); await writeFile(join(root, 'child', 'package.json'), '{}');
  await assert.rejects(reports.readHarnessReport(join(root, 'child')), /No .*found/);
});
