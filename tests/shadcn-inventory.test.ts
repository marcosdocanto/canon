import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inventory, writeVariants } from '../src/adapters/shadcn/inventory.ts';
import { shadcnAdapter } from '../src/adapters/shadcn/index.ts';
import { installFiles } from '../src/design-files.ts';
import { clone } from './fixtures/clone.ts';

test('inventory lists parseable and read-only components alike', (t) => {
  const root = clone(t); // same clone helper as shadcn-theme tests; extracted to tests/fixtures/clone.ts
  const items = inventory(root);
  const button = items.find((i) => i.slug === 'button')!;
  assert.equal(button.exportName, 'Button');
  assert.equal(button.importPath, '~/ui/button');
  assert.ok(button.cva);
  const badge = items.find((i) => i.slug === 'badge')!;
  assert.equal(badge.cva, undefined);
  assert.match(badge.readOnlyReason!, /template interpolation/);
});

test('writeVariants preserves hand-added behavior code', (t) => {
  const root = clone(t);
  const button = inventory(root).find((i) => i.slug === 'button')!;
  const spec = structuredClone(button.cva!);
  spec.variants.variant.brand = ['bg-primary/90 text-primary-foreground shadow-lg'];
  installFiles(root, [writeVariants(button, spec)]);
  const file = readFileSync(button.file, 'utf8');
  assert.ok(file.includes('pressedCount'));            // hand-added state survived
  assert.ok(file.includes('brand:'));
  assert.ok(file.includes('export { Button, buttonVariants }'));
});

test('adapter install shells out through the injected exec', async () => {
  const calls: any[] = [];
  await shadcnAdapter.install('/tmp/x', ['button'], async (cmd, args, opts) => {
    calls.push([cmd, args, opts]); return { status: 0, stdout: '', stderr: '' };
  });
  assert.deepEqual(calls[0][1], ['shadcn@latest', 'add', '--yes', 'button']);
});
