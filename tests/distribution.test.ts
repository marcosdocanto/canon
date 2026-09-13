import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

async function studio(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'canon-distribution-test-'));
  const output = join(root, 'user-design', 'dist');
  const scratch = join(root, 'scratch');
  mkdirSync(output, { recursive: true });
  mkdirSync(scratch);
  writeFileSync(join(output, 'preview.html'), '<title>Distribution fixture</title>');
  writeFileSync(join(root, 'private.env'), 'CANON_PRIVATE_PROJECT_FIXTURE');
  writeFileSync(join(output, 'private.json'), '{"private":"CANON_PRIVATE_PROJECT_FIXTURE"}');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'private-user-project', private: true }));
  const entry = `import { serve } from ${JSON.stringify(new URL('../src/serve.ts', import.meta.url).href)}; await serve(process.argv[1], 0);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', entry, output], {
    cwd: root, env: { ...process.env, TMPDIR: scratch }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
    rmSync(root, { recursive: true, force: true });
  });
  const port = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Studio did not start: ${logs}`)), 10_000);
    const ready = () => {
      const match = logs.match(/canon studio → http:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) { clearTimeout(timer); child.stdout.off('data', ready); resolve(Number(match[1])); }
    };
    child.stdout.on('data', ready);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error(`Studio exited: ${logs}`)); });
  });
  const request = (path: string, method = 'GET', headers: Record<string, string> = {}) => new Promise<{ status: number; headers: IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port, path, method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60_000, () => req.destroy(new Error('Distribution request timed out')));
    req.end();
  });
  return { root, scratch, request, url: `http://127.0.0.1:${port}` };
}

test('Studio distributes its own installable Canon runtime from a local URL', async (t) => {
  const f = await studio(t);

  await t.test('setup redirects without preparing an archive', async () => {
    for (const method of ['GET', 'HEAD']) {
      const response = await f.request('/setup', method);
      assert.equal(response.status, 302);
      assert.equal(response.headers.location, '/docs.html#primeiro-projeto');
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.body.byteLength, 0);
    }
    assert.deepEqual(readdirSync(f.scratch), [], 'startup and setup must not build a package');
  });

  await t.test('download and setup retain local Host, Origin and method restrictions', async () => {
    for (const path of ['/canon-package.tgz', '/setup']) {
      assert.equal((await f.request(path, 'GET', { host: 'foreign.example' })).status, 403);
      assert.equal((await f.request(path, 'GET', { origin: 'https://foreign.example' })).status, 403);
      assert.equal((await f.request(path, 'POST')).status, 405);
    }
    assert.deepEqual(readdirSync(f.scratch), [], 'rejected requests must not start package preparation');
  });

  await t.test('GET and HEAD share the archive, with download headers and no caller files', async () => {
    const [get, head] = await Promise.all([f.request('/canon-package.tgz'), f.request('/canon-package.tgz', 'HEAD')]);
    for (const response of [get, head]) {
      assert.equal(response.status, 200, response.body.toString());
      assert.equal(response.headers['content-type'], 'application/gzip');
      assert.equal(response.headers['content-disposition'], 'attachment; filename="canon-package.tgz"');
      assert.equal(response.headers['x-content-type-options'], 'nosniff');
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(Number(response.headers['content-length']), get.body.byteLength);
    }
    assert.equal(head.body.byteLength, 0);
    assert.equal(get.body.readUInt16BE(0), 0x1f8b);
    assert.doesNotMatch(gunzipSync(get.body).toString('utf8'), /CANON_PRIVATE_PROJECT_FIXTURE|private-user-project/);
    const again = await f.request('/canon-package.tgz?package=private-user-project&path=..%2Fprivate.env');
    assert.equal(again.status, 200);
    assert.deepEqual(again.body, get.body, 'request data cannot select another package or rebuild the cached archive');
    assert.deepEqual(readdirSync(f.scratch), [], 'download preparation must clean its temporary files');
  });

  await t.test('npm installs the URL and its local binary initializes and integrates a project', () => {
    const consumer = join(f.root, 'consumer app with spaces');
    mkdirSync(consumer);
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'download-consumer', private: true }));
    const installed = spawnSync('npm', [
      'install', '--save-dev', '--ignore-scripts', '--no-audit', '--no-fund',
      '--registry', 'http://127.0.0.1:1', `${f.url}/canon-package.tgz`,
    ], { cwd: consumer, encoding: 'utf8', timeout: 60_000 });
    assert.equal(installed.status, 0, installed.stderr || installed.stdout);
    const cli = join(consumer, 'node_modules', '.bin', 'canon');
    const run = (...args: string[]) => {
      const result = spawnSync(process.execPath, [cli, ...args], { cwd: consumer, encoding: 'utf8', timeout: 60_000 });
      assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr || result.stdout}`);
      return result.stdout;
    };
    assert.match(run('help'), /canon init/);
    run('init', 'Downloaded fixture', '--prefix', 'dl', '--preset', 'vera');
    run('install');
    for (const path of ['design/components/button.json', 'design/dist/dl.css', 'design/dist/docs.html', 'design/dist/CONNECT.md', 'design/dist/react/button.tsx', 'DESIGN.compact.md', '.mcp.json']) {
      assert.ok(existsSync(join(consumer, path)), `missing ${path}`);
    }
    const runtime = join(consumer, 'node_modules', 'canon-ds');
    const metadata = JSON.parse(readFileSync(join(runtime, 'package.json'), 'utf8'));
    assert.equal(metadata.devDependencies, undefined);
    assert.equal(metadata.scripts, undefined, 'the archive must not carry lifecycle hooks');
    assert.deepEqual(metadata.dependencies ?? {}, {});
    assert.deepEqual(readdirSync(runtime).sort(), ['LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md', 'bin', 'lib', 'package.json']);
    assert.match(readFileSync(join(runtime, 'LICENSE'), 'utf8'), /MIT License/);
    assert.match(readFileSync(join(runtime, 'THIRD_PARTY_NOTICES.md'), 'utf8'), /Lucide/);
    assert.match(metadata.repository.url, /github\.com/);
    assert.equal(existsSync(join(consumer, 'node_modules', 'typescript')), false);
    const settings = JSON.parse(readFileSync(join(consumer, '.claude', 'settings.json'), 'utf8'));
    const hook = settings.hooks.PostToolUse[0].hooks[0].command;
    const changed = join(consumer, 'src', 'fixture.css');
    mkdirSync(join(consumer, 'src'));
    writeFileSync(changed, '.fixture { color: #123456; }');
    const lint = spawnSync('/bin/sh', ['-c', hook], {
      cwd: consumer, encoding: 'utf8', timeout: 10_000,
      input: JSON.stringify({ tool_input: { file_path: changed } }),
    });
    assert.equal(lint.status, 2, lint.stderr || lint.stdout);
    assert.match(lint.stderr, /raw-color/, 'the installed hook must invoke Canon lint through paths with spaces');
    const script = `import { getCanonPackage } from ${JSON.stringify(pathToFileURL(join(runtime, 'lib', 'distribution.mjs')).href)}; const data = await getCanonPackage(); console.log(data.readUInt16BE(0));`;
    const redistributed = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: consumer, encoding: 'utf8', timeout: 60_000, env: { ...process.env, TMPDIR: f.scratch },
    });
    assert.equal(redistributed.status, 0, redistributed.stderr || redistributed.stdout);
    assert.equal(redistributed.stdout.trim(), String(0x1f8b), 'an installed runtime can prepare a download without the compiler');
    assert.deepEqual(readdirSync(f.scratch), []);
  });

  await t.test('the connection procedure can retain the package and reinstall without Studio or registry access', async () => {
    const consumer = join(f.root, 'portable app');
    mkdirSync(join(consumer, '.canon'), { recursive: true });
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'portable-consumer', private: true }));
    const download = await f.request('/canon-package.tgz');
    assert.equal(download.status, 200);
    writeFileSync(join(consumer, '.canon', 'canon-ds.tgz'), download.body);
    const install = spawnSync('npm', ['install', '--save-dev', '--ignore-scripts', '--no-audit', '--no-fund', '--offline', './.canon/canon-ds.tgz'], { cwd: consumer, encoding: 'utf8', timeout: 30_000 });
    assert.equal(install.status, 0, install.stderr || install.stdout);
    const lock = readFileSync(join(consumer, 'package-lock.json'), 'utf8');
    assert.ok(lock.includes('file:.canon/canon-ds.tgz'));
    assert.ok(!lock.includes(f.url), 'the project must not retain a localhost dependency');
    rmSync(join(consumer, 'node_modules'), { recursive: true, force: true });
    const reinstall = spawnSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--offline', '--cache', join(consumer, 'empty-cache')], { cwd: consumer, encoding: 'utf8', timeout: 30_000 });
    assert.equal(reinstall.status, 0, reinstall.stderr || reinstall.stdout);
    assert.ok(existsSync(join(consumer, 'node_modules', '.bin', 'canon')));
  });
});

test('failed package preparation cleans up and can be retried in the same process', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'canon-distribution-retry-'));
  try {
    const script = `
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { getCanonPackage } from ${JSON.stringify(new URL('../src/distribution.ts', import.meta.url).href)};
const originalPath = process.env.PATH;
process.env.PATH = '';
await assert.rejects(getCanonPackage(), /Canon package preparation failed/);
assert.deepEqual(readdirSync(process.env.TMPDIR), []);
process.env.PATH = originalPath;
const first = getCanonPackage();
assert.equal(getCanonPackage(), first);
const data = await first;
assert.equal(data.readUInt16BE(0), 0x1f8b);
assert.equal(await getCanonPackage(), data);
assert.deepEqual(readdirSync(process.env.TMPDIR), []);
`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8', timeout: 60_000, env: { ...process.env, TMPDIR: scratch },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.deepEqual(readdirSync(scratch), []);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
