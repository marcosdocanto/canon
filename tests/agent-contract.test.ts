import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSystem } from '../src/system.ts';
import { PRESETS } from '../src/tokens/presets.ts';
import { indexTokens } from '../src/tokens/resolve.ts';
import { generate as generateAgents } from '../src/generators/agents.ts';
import { compactMd, designMd } from '../src/generators/designmd.ts';
import type { System } from '../src/types.ts';

function agentFiles(system: System) {
  const files = new Map<string, string>();
  generateAgents(system, indexTokens(system.tokens, system.meta.prefix), (path, content) => files.set(path, content));
  return files;
}

test('agent formats preserve the managed installation block and share one standalone contract', async () => {
  const system = await createSystem({ name: 'Contract fixture', prefix: 'acme' });
  system.meta.out = 'generated';
  const files = agentFiles(system);
  assert.deepEqual([...files.keys()].sort(), [
    'agents/AGENTS.md', 'agents/CLAUDE.md', 'agents/PROMPT.md',
    'agents/SKILL.md', 'agents/design-system.mdc', 'agents/mcp.json',
  ]);
  const managed = files.get('agents/AGENTS.md')!;
  const contract = managed.match(/^<!-- canon:start -->\n([\s\S]+)\n<!-- canon:end -->\n$/)?.[1];
  assert.ok(contract, 'install must be able to replace its managed block');
  assert.equal(files.get('agents/CLAUDE.md'), managed);
  for (const [path, content] of files) {
    if (path.endsWith('.json')) continue;
    assert.ok(content.includes(contract), `${path} must contain the same complete contract`);
    assert.equal(content.split(contract).length, 2, `${path} should include the contract only once`);
    assert.ok(content.includes('design/generated/acme.css'), `${path} ignores the configured output directory`);
    assert.doesNotMatch(content, /design\/dist\//, path);
  }
  assert.deepEqual(JSON.parse(files.get('agents/mcp.json')!), {
    mcpServers: { canon: { command: 'canon', args: ['mcp', '--design', 'design'] } },
  });
});

test('compact lookup links resolve to the generated reference without embedding the catalog', async () => {
  const system = await createSystem({ name: 'Lookup fixture', prefix: 'acme' });
  system.meta.out = 'generated';
  const idx = indexTokens(system.tokens, 'acme');
  const compact = compactMd(system, idx);
  const full = designMd(system, idx);
  const anchors = [...compact.matchAll(/\]\(DESIGN\.md#([^)]+)\)/g)].map((match) => match[1]);
  const expected = [...system.components.map((c) => c.slug), ...system.patterns.map((p) => `pattern-${p.slug}`)];
  assert.deepEqual(anchors.sort(), expected.sort());
  for (const anchor of anchors) assert.ok(full.includes(`<a id="${anchor}"></a>`), `missing reference target ${anchor}`);
  assert.doesNotMatch(compact, /```(?:html|css|tsx)/, 'the quick reference should retrieve examples on demand');
  for (const doc of [compact, full]) {
    assert.ok(doc.includes('design/generated/acme.css'));
    assert.doesNotMatch(doc, /design\/dist\//);
  }
});

test('built-in presets keep agent context and the compact index bounded', async () => {
  for (const preset of Object.keys(PRESETS)) {
    const system = await createSystem({ name: 'Context fixture', prefix: 'acme', preset });
    for (const [path, content] of agentFiles(system)) {
      assert.ok(content.length < 8_000, `${preset} ${path}: ${content.length} characters`);
    }
    const compact = compactMd(system, indexTokens(system.tokens, 'acme'));
    assert.ok(compact.length < 16_000, `${preset} compact: ${compact.length} characters`);
  }
});
