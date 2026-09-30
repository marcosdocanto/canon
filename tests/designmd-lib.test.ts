import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSystem } from '../src/system.ts';
import { readTheme } from '../src/adapters/shadcn/theme.ts';
import { inventory } from '../src/adapters/shadcn/inventory.ts';
import { getAdapter } from '../src/adapters/index.ts';
import { designmdLib } from '../src/generators/designmd-lib.ts';
import { agentsLibBlock } from '../src/generators/agents-lib.ts';
import { clone } from './fixtures/clone.ts';

const describeVar = getAdapter('shadcn').describeVar;

// Verbatim per the plan's ownership rule (must appear byte-for-byte in generated docs).
const OWNERSHIP_RULE = 'Style blocks (`cva()` calls in the ui directory and the CSS variables in the theme file) are Canon territory — change them through Canon (Studio or `canon` CLI), never by hand. Everything else in a component file is application territory — Canon never touches it.';

test('designmdLib documents the real import path, theme vars, read-only components and the ownership rule', async (t) => {
  const root = clone(t);
  const system = await createSystem({ name: 'Lib fixture', prefix: 'lf' });
  const theme = readTheme(root);
  const components = inventory(root);

  const { full, compact } = designmdLib(system, theme, components, describeVar);

  // Real import path from the inventory, not a Canon-invented one.
  assert.match(full, /~\/ui\/button/);

  // Theme table: the --primary row carries both modes and its mapped Canon semantic + description.
  assert.match(full, /--primary/);
  assert.match(full, /oklch\(0\.205 0 0\)/); // light
  assert.match(full, /oklch\(0\.922 0 0\)/); // dark
  assert.match(full, /bg-action/);
  assert.match(full, /Primary action fill/); // bg-action's description

  // Badge's cva() has a template interpolation the parser can't handle — read-only, reason surfaced.
  assert.match(full, /template interpolation/);

  // The ownership rule sentence, verbatim.
  assert.ok(full.includes(OWNERSHIP_RULE), 'full DESIGN.md must include the ownership rule verbatim');

  // Compact stays small enough to be a cheap "read this first" file.
  const compactBytes = Buffer.byteLength(compact, 'utf8');
  assert.ok(compactBytes <= 6 * 1024, `compact.md is ${compactBytes} bytes, expected <= 6KB`);
});

test('partsSummary: a part class string containing "|" does not corrupt the Markdown table row (final-review Finding 2)', async (t) => {
  // A part's `classes` comes straight off disk (parseParts) and isn't reliably constrained the way
  // a variant axis/value key is: SAFE_CLASS_LIST (inventory.ts) permits `|`, and a read-only part
  // keeps its `classes` from an unconstrained literal that never even reached writePart's grammar.
  // Inject one directly into an inventoried part (rather than hand-authoring a fixture file) to
  // exercise the real designMdLib table-building path end to end.
  const root = clone(t);
  const system = await createSystem({ name: 'Lib fixture', prefix: 'lf' });
  const theme = readTheme(root);
  const components = inventory(root);
  const dialog = components.find((c) => c.slug === 'dialog')!;
  const withPipe = components.map((c) => (c !== dialog ? c : {
    ...c,
    parts: c.parts!.map((p) => (p.name === 'DialogFooter' ? { ...p, classes: 'a|b text-sm' } : p)),
  }));

  const { full } = designmdLib(system, theme, withPipe, describeVar);
  const lines = full.split('\n');
  const matching = lines.filter((l) => l.includes('DialogFooter'));
  assert.equal(matching.length, 1, 'the pipe must not split the row onto more than one physical line');
  const row = matching[0];
  assert.match(row, /a\\\|b text-sm/, 'the pipe is backslash-escaped in the rendered cell, not left raw');

  // Cell count matches the header: an unescaped `|` would add a phantom column.
  const header = lines.find((l) => l.startsWith('| component |'))!;
  assert.ok(header, 'component table header must be present');
  const cellCount = (line: string) => line.split(/(?<!\\)\|/).length;
  assert.equal(cellCount(row), cellCount(header), 'an unescaped pipe would have added an extra cell to the row');
});

test('agentsLibBlock is a canon-managed block naming semantic classes derived from the theme', async (t) => {
  const root = clone(t);
  const system = await createSystem({ name: 'Lib fixture', prefix: 'lf' });
  const theme = readTheme(root);
  const components = inventory(root);

  const block = agentsLibBlock(system, theme, components);

  assert.match(block, /<!-- canon:start -->/);
  assert.match(block, /<!-- canon:end -->/);
  // Derived from theme.vars.primary, not a hardcoded list.
  assert.match(block, /bg-primary/);
  assert.ok(block.includes(OWNERSHIP_RULE), 'agents block must include the ownership rule verbatim');
});
