import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findCva, parseCva, printCva, spliceCva, CvaParseError } from '../src/adapters/shadcn/cva.ts';

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

test('rejects unknown top-level keys on the options object', () => {
  const source = `const v = cva("x", { variants: {}, compoundSlots: [] })`;
  const span = findCva(source)!;
  assert.throws(() => parseCva(source, span), (e: CvaParseError) =>
    e instanceof CvaParseError && e.construct === 'unknown option');
});

test('findCva is not desynced by a regex literal containing a quote', () => {
  const source = `const re = /"/;\nconst v = cva("real", {});`;
  const span = findCva(source)!;
  assert.equal(source.slice(span.start, span.start + 4), 'cva(');
  const spec = parseCva(source, span);
  assert.deepEqual(spec.base, ['real']);
});

test('findCva does not misread a division as a regex literal', () => {
  const source = `const half = a / 2; const v = cva("x", {});`;
  const span = findCva(source)!;
  assert.equal(source.slice(span.start, span.start + 4), 'cva(');
  const spec = parseCva(source, span);
  assert.deepEqual(spec.base, ['x']);
});

test('findCva handles a regex literal with a character class before the real call', () => {
  const source = `/["']/;\nconst v = cva("real", {});`;
  const span = findCva(source)!;
  assert.equal(source.slice(span.start, span.start + 4), 'cva(');
  const spec = parseCva(source, span);
  assert.deepEqual(spec.base, ['real']);
});

test('splice is byte-identical outside the span, CRLF preserved', () => {
  const crlf = BUTTON.replace(/\n/g, '\r\n');
  const span = findCva(crlf)!;
  const spec = parseCva(crlf, span);
  spec.variants.size.sm = ['h-8 rounded-md px-3 text-xs'];
  const next = spliceCva(crlf, span, spec);
  assert.equal(next.slice(0, span.start), crlf.slice(0, span.start));
  assert.equal(next.slice(next.length - (crlf.length - span.end)), crlf.slice(span.end));
  assert.ok(next.includes('px-3 text-xs'));
  // Controller ruling: replaces the brief's `assert.ok(!next.includes('\n' && next.split('\r\n').length > 3))`
  // (a JS truthiness bug) with a real assertion that no bare `\n` exists — every `\n` is preceded by `\r`.
  assert.equal(next.split('\n').every((part, i, arr) => i === arr.length - 1 || part.endsWith('\r')), true);
});

test('parse → print → parse is a fixed point', () => {
  const span = findCva(BUTTON)!;
  const spec = parseCva(BUTTON, span);
  const printed = 'const buttonVariants = ' + printCva(spec, '');
  const spec2 = parseCva(printed, findCva(printed)!);
  assert.deepEqual(spec2, spec);
});
