import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSystem } from '../src/build.ts';
import { createSystem, loadDesignDir, writeDesignDir } from '../src/system.ts';

type Json = Record<string, any>;

const cli = fileURLToPath(new URL('../bin/canon.js', import.meta.url));

async function fixture(t: TestContext, out = 'dist') {
  const root = mkdtempSync(join(tmpdir(), 'canon-mcp-test-'));
  const design = join(root, 'design');
  const system = await createSystem({ name: 'MCP fixture', prefix: 'fx' });
  system.meta.out = out;
  system.components = system.components.filter((component) => component.slug === 'button');
  system.components[0].related = [];
  system.patterns = [];
  writeDesignDir(system, design);
  await buildSystem(loadDesignDir(design), design);

  const child = spawn(process.execPath, [cli, 'mcp', '--design', design], {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const client = rpcClient(child);

  t.after(async () => {
    client.close();
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
    rmSync(root, { recursive: true, force: true });
  });

  await client.request('initialize', { protocolVersion: '2025-06-18' });
  const build = () => {
    const result = spawnSync(process.execPath, [cli, 'build', '--design', design], {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  };
  const call = async (name: string, args: Json = {}) => textOf(await client.request('tools/call', { name, arguments: args }));
  const resource = async (uri: string) => {
    const response = await client.request('resources/read', { uri });
    return response.contents[0].text as string;
  };
  return { root, design, child, stderr: () => stderr, client, build, call, resource };
}

function rpcClient(child: ChildProcessWithoutNullStreams) {
  let nextId = 1;
  const pending = new Map<number, { resolve: (value: Json) => void; reject: (error: Error) => void }>();
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  lines.on('line', (line) => {
    const message = JSON.parse(line) as Json;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(String(message.error.message)));
    else request.resolve(message.result as Json);
  });
  child.on('exit', (code, signal) => {
    for (const request of pending.values()) request.reject(new Error(`MCP exited (${code ?? signal})`));
    pending.clear();
  });
  return {
    request(method: string, params: Json): Promise<Json> {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    },
    close() { lines.close(); },
  };
}

function textOf(response: Json): string {
  return response.content[0].text as string;
}

test('a running MCP reloads token, component, and design-rule data after another process builds', async (t) => {
  const f = await fixture(t, 'generated/canon');
  assert.doesNotMatch(await f.call('get_token', { name: 'space.4' }), /19px/);
  assert.doesNotMatch(await f.call('get_component', { slug: 'button' }), /Updated component guidance/);
  assert.doesNotMatch(await f.call('design_rules'), /Keep the updated hierarchy/);

  const updated = loadDesignDir(f.design);
  updated.tokens.space['4'] = '19px';
  updated.components[0].description = 'Updated component guidance';
  updated.components[0].rules.push('Use the updated button rule.');
  updated.meta.direction.principles = ['Keep the updated hierarchy.'];
  writeDesignDir(updated, f.design);
  f.build();

  assert.match(await f.call('get_token', { name: 'space.4' }), /19px/);
  const component = await f.call('get_component', { slug: 'button' });
  assert.match(component, /Updated component guidance/);
  assert.match(component, /Use the updated button rule/);
  assert.match(await f.call('design_rules'), /Keep the updated hierarchy/);
  assert.match(await f.call('lint_code', { filename: 'Card.css', code: '.card { gap: 19px; }' }), /use var\(--fx-space-4\)/);
});

test('a resource read refreshes the MCP and follows a newly built custom output path', async (t) => {
  const f = await fixture(t, 'old-output');
  assert.doesNotMatch(await f.resource('canon://tokens.css'), /23px/);

  const updated = loadDesignDir(f.design);
  updated.tokens.space['4'] = '23px';
  updated.meta.out = 'artifacts/current-canon';
  writeDesignDir(updated, f.design);
  f.build();

  assert.match(await f.resource('canon://tokens.css'), /--fx-space-4:\s*23px/);
  assert.match(await f.call('get_token', { name: 'space.4' }), /23px/);
});

test('a failed automatic refresh returns an error and retries the unconsumed build revision', async (t) => {
  const f = await fixture(t);
  const updated = loadDesignDir(f.design);
  updated.tokens.space['4'] = '29px';
  updated.components[0].description = 'Recovered component definition';
  writeDesignDir(updated, f.design);
  f.build();

  const componentPath = join(f.design, 'components', 'button.json');
  const builtComponent = readFileSync(componentPath, 'utf8');
  writeFileSync(componentPath, '{ broken json');
  await assert.rejects(f.call('get_token', { name: 'space.4' }), /refresh|json|unexpected/i);

  writeFileSync(componentPath, builtComponent);
  assert.match(await f.call('get_token', { name: 'space.4' }), /29px/);
  assert.match(await f.call('get_component', { slug: 'button' }), /Recovered component definition/);
});

test('explicit reload still loads unbuilt source, including a changed output path', async (t) => {
  const f = await fixture(t);
  const updated = loadDesignDir(f.design);
  updated.tokens.space['4'] = '31px';
  updated.meta.out = 'unbuilt-custom-output';
  writeDesignDir(updated, f.design);

  assert.match(await f.call('reload'), /Reloaded MCP fixture/);
  assert.match(await f.call('get_token', { name: 'space.4' }), /31px/);
});
