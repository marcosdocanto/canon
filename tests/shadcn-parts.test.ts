import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseParts, splicePart } from '../src/adapters/shadcn/parts.ts';
import { findCva } from '../src/adapters/shadcn/cva.ts';
import type { PartInfo } from '../src/adapters/types.ts';

const DIALOG = readFileSync(new URL('./fixtures/shadcn-app/src/ui/dialog.tsx', import.meta.url), 'utf8');
const BUTTON = readFileSync(new URL('./fixtures/shadcn-app/src/ui/button.tsx', import.meta.url), 'utf8');

function byName(parts: PartInfo[], name: string): PartInfo {
  const part = parts.find((p) => p.name === name);
  assert.ok(part, `no part named "${name}"`);
  return part!;
}

test('parses the real shadcn dialog: one part per exported subcomponent, in declaration order', () => {
  const parts = parseParts(DIALOG);
  assert.deepEqual(parts.map((p) => p.name), [
    'Dialog', 'DialogTrigger', 'DialogPortal', 'DialogClose',
    'DialogOverlay', 'DialogContent', 'DialogHeader', 'DialogFooter',
    'DialogTitle', 'DialogDescription',
  ]);
});

test('the cn("literal", className) shape: real literal, byte-exact quote-inclusive span, dynamicTail', () => {
  const parts = parseParts(DIALOG);

  const overlay = byName(parts, 'DialogOverlay');
  assert.equal(overlay.classes, 'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0');
  assert.equal(overlay.dynamicTail, 'className');
  assert.ok(overlay.span, 'DialogOverlay has a span');
  assert.equal(DIALOG.slice(overlay.span!.start, overlay.span!.end), `"${overlay.classes}"`, 'span includes the quotes, byte-identical to the source');

  const header = byName(parts, 'DialogHeader');
  assert.equal(header.classes, 'flex flex-col space-y-1.5 text-center sm:text-left');
  assert.equal(header.dynamicTail, 'className');

  const footer = byName(parts, 'DialogFooter');
  assert.equal(footer.classes, 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2');
  assert.equal(footer.dynamicTail, 'className');

  const title = byName(parts, 'DialogTitle');
  assert.equal(title.classes, 'text-lg font-semibold leading-none tracking-tight');
  assert.equal(title.dynamicTail, 'className');

  const description = byName(parts, 'DialogDescription');
  assert.equal(description.classes, 'text-sm text-muted-foreground');
  assert.equal(description.dynamicTail, 'className');
  assert.equal(DIALOG.slice(description.span!.start, description.span!.end), `"${description.classes}"`);
});

test('pure-behavior aliases (Dialog/DialogTrigger/DialogPortal/DialogClose) have no JSX — honestly read-only', () => {
  const parts = parseParts(DIALOG);
  for (const name of ['Dialog', 'DialogTrigger', 'DialogPortal', 'DialogClose']) {
    const part = byName(parts, name);
    assert.equal(part.classes, undefined, `${name} must not have classes`);
    assert.equal(part.span, undefined);
    assert.equal(part.readOnlyReason, 'root element has no static className');
  }
});

test('DialogContent is nested-only (root is <DialogPortal>, which carries no className) — root-only v1, same reason', () => {
  const content = byName(parseParts(DIALOG), 'DialogContent');
  assert.equal(content.classes, undefined);
  assert.equal(content.readOnlyReason, 'root element has no static className');
});

test('escaped quotes in a literal refuse rather than decode', () => {
  const source = [
    'function Foo({ className }: { className?: string }) {',
    '  return <div className={cn("a \\"b\\" c", className)} />',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, undefined);
  assert.equal(foo.span, undefined);
  assert.match(foo.readOnlyReason!, /escap/i);
});

test('helper-const indirection is read-only: dynamic classes only', () => {
  const source = [
    'const baseClasses = "block text-sm"',
    'function Foo({ className }: { className?: string }) {',
    '  return <div className={baseClasses} />',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, undefined);
  assert.equal(foo.readOnlyReason, 'dynamic classes only');
});

test('an interpolation-free template literal is a plain literal (inside cn() and bare)', () => {
  const viaCn = [
    'function Foo({ className }: { className?: string }) {',
    '  return <div className={cn(`block text-sm`, className)} />',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(viaCn), 'Foo');
  assert.equal(foo.classes, 'block text-sm');
  assert.equal(foo.dynamicTail, 'className');

  const bare = [
    'function Bar() {',
    '  return <div className={`block text-sm`} />',
    '}',
    'export { Bar }',
  ].join('\n');
  const bar = byName(parseParts(bare), 'Bar');
  assert.equal(bar.classes, 'block text-sm');
  assert.equal(bar.dynamicTail, undefined);
});

test('a template literal WITH interpolation is read-only, named', () => {
  const source = [
    'function Foo({ className }: { className?: string }) {',
    '  return <div className={cn(`block ${"text-sm"}`, className)} />',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, undefined);
  assert.equal(foo.readOnlyReason, 'template interpolation');
});

test('a direct string literal with no cn() wrapper is editable, with no dynamicTail', () => {
  const source = [
    'function Foo() {',
    '  return <div className="block text-sm" />',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, 'block text-sm');
  assert.equal(foo.dynamicTail, undefined);
});

test('no className attribute at all on the root element is read-only, honestly', () => {
  const source = [
    'function Foo({ children }: { children?: unknown }) {',
    '  return <div>{children}</div>',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, undefined);
  assert.equal(foo.readOnlyReason, 'root element has no static className');
});

test('splice is byte-identical outside the span, CRLF preserved', () => {
  const crlf = DIALOG.replace(/\n/g, '\r\n');
  const overlay = byName(parseParts(crlf), 'DialogOverlay');
  assert.ok(overlay.span);
  const next = splicePart(crlf, overlay, 'bg-black/50');
  assert.equal(next.slice(0, overlay.span!.start), crlf.slice(0, overlay.span!.start), 'prefix byte-identical');
  assert.equal(next.slice(next.length - (crlf.length - overlay.span!.end)), crlf.slice(overlay.span!.end), 'suffix byte-identical');
  assert.ok(next.includes('"bg-black/50"'));
  // No bare `\n` was introduced: every `\n` is still preceded by `\r`.
  assert.equal(next.split('\n').every((part, i, arr) => i === arr.length - 1 || part.endsWith('\r')), true);
});

test('splice -> parse is a fixed point', () => {
  const header = byName(parseParts(DIALOG), 'DialogHeader');
  const spliced = splicePart(DIALOG, header, 'flex flex-col gap-2 text-center sm:text-left');
  assert.equal(spliced.slice(0, header.span!.start), DIALOG.slice(0, header.span!.start));
  assert.equal(spliced.slice(spliced.length - (DIALOG.length - header.span!.end)), DIALOG.slice(header.span!.end));
  const reparsed = byName(parseParts(spliced), 'DialogHeader');
  assert.equal(reparsed.classes, 'flex flex-col gap-2 text-center sm:text-left');
  assert.equal(reparsed.dynamicTail, 'className');

  // Splicing a plain-quote part (no dynamicTail) round-trips too.
  const description = byName(parseParts(DIALOG), 'DialogDescription');
  const splicedDescription = splicePart(DIALOG, description, 'text-sm text-muted-foreground/80');
  const reparsedDescription = byName(parseParts(splicedDescription), 'DialogDescription');
  assert.equal(reparsedDescription.classes, 'text-sm text-muted-foreground/80');
});

test('splicePart throws for a read-only part instead of corrupting the file', () => {
  const portal = byName(parseParts(DIALOG), 'DialogPortal');
  assert.throws(() => splicePart(DIALOG, portal, 'x'), /read-only/);
});

test('a cva component file (button.tsx) still parses parts: Button is dynamic-only (buttonVariants(...) call); cvaSpan and parts coexist', () => {
  const cvaSpan = findCva(BUTTON);
  assert.ok(cvaSpan, 'button.tsx still has its cva() span, independently of parts parsing');

  const parts = parseParts(BUTTON);
  assert.equal(parts.length, 1, 'buttonVariants is not PascalCase and is not a part');
  const button = parts[0];
  assert.equal(button.name, 'Button');
  assert.equal(button.classes, undefined);
  assert.equal(button.span, undefined);
  assert.equal(button.readOnlyReason, 'dynamic classes only');
});
