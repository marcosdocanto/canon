import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findCva, parseCva, CvaParseError } from '../src/adapters/shadcn/cva.ts';

const BUTTON = readFileSync(new URL('./fixtures/shadcn-app/src/ui/button.tsx', import.meta.url), 'utf8');

test('parses the real shadcn button cva', () => {
  const span = findCva(BUTTON)!;
  const spec = parseCva(BUTTON, span);
  assert.ok(spec.base.join(' ').includes('inline-flex'));
  assert.deepEqual(Object.keys(spec.variants).sort(), ['size', 'variant']);
  assert.ok(spec.variants.variant.destructive.join(' ').includes('bg-destructive'));
  assert.equal(spec.defaultVariants.variant, 'default');
});

test('rejects dynamic constructs with the construct named', () => {
  const BADGE = readFileSync(new URL('./fixtures/shadcn-app/src/ui/badge.tsx', import.meta.url), 'utf8');
  const span = findCva(BADGE)!;
  assert.throws(() => parseCva(BADGE, span), (e: CvaParseError) =>
    e instanceof CvaParseError && /template interpolation/.test(e.construct));
  const spread = `const v = cva("x", { variants: { ...shared } })`;
  assert.throws(() => parseCva(spread, findCva(spread)!), (e: CvaParseError) => /spread/.test(e.construct));
});

test('findCva skips cva mentions inside strings and comments', () => {
  const source = `// cva("not this")\nconst s = "cva(nope)";\nconst real = cva("a b", { variants: {} });`;
  const span = findCva(source)!;
  assert.equal(source.slice(span.start, span.start + 4), 'cva(');
  assert.ok(source.slice(span.start, span.end).includes('"a b"'));
});
