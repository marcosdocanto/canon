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
    assert.equal(part.readOnlyReason, 'no static className found');
  }
});

test('DialogContent: root <DialogPortal> has no className, so the descent finds the real literal on the nested <DialogPrimitive.Content>', () => {
  const content = byName(parseParts(DIALOG), 'DialogContent');
  assert.equal(content.classes, 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg');
  assert.equal(content.dynamicTail, 'className');
  assert.ok(content.span, 'DialogContent has a span once it descends to the real literal');
  assert.equal(DIALOG.slice(content.span!.start, content.span!.end), `"${content.classes}"`, 'span is the nested literal, quote-inclusive, byte-identical to the source');
  // <DialogOverlay /> (the first child, self-closing, no className passed at this usage site) is
  // correctly passed over — the descent doesn't stop there, nor does it ever reach into it (it has
  // no attributes at all) before finding <DialogPrimitive.Content>'s real className.
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

test('no className attribute anywhere in the return is read-only, honestly (descends past a childless wrapper too)', () => {
  const source = [
    'function Foo({ children }: { children?: unknown }) {',
    '  return <div><span>{children}</span></div>',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, undefined);
  assert.equal(foo.readOnlyReason, 'no static className found');
});

test('a wrapper element with no className is skipped and the descent finds the FIRST child that does have one', () => {
  const source = [
    'function Foo() {',
    '  return (',
    '    <Wrapper>',
    '      <First />',
    '      <Second className="block text-sm" />',
    '      <Third className="ignored because Second already won" />',
    '    </Wrapper>',
    '  )',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, 'block text-sm');
  assert.equal(foo.dynamicTail, undefined);
});

test('a className that fails to resolve (dynamic) is skipped in favor of a LATER element that does resolve', () => {
  const source = [
    'const helper = "x"',
    'function Foo() {',
    '  return (',
    '    <Outer className={helper}>',
    '      <Inner className="block text-sm" />',
    '    </Outer>',
    '  )',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, 'block text-sm', 'Outer\'s unresolvable className must not win over Inner\'s real literal');
  assert.equal(foo.readOnlyReason, undefined);
});

test('when NOTHING in the return resolves, the EARLIEST non-qualifying reason wins (document order)', () => {
  const source = [
    'const helper = "x"',
    'function Foo() {',
    '  return (',
    '    <Outer className={helper}>',
    '      <Inner className={cn(`a ${helper}`)} />',
    '    </Outer>',
    '  )',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, undefined);
  assert.equal(foo.readOnlyReason, 'dynamic classes only', 'Outer\'s failure (earlier in document order) wins over Inner\'s');
});

test('the walk is bounded to one subcomponent\'s own return: a literal in the SECOND subcomponent is never attributed to the FIRST', () => {
  const source = [
    'function Foo({ children }: { children?: unknown }) {',
    '  return <div><span>{children}</span></div>', // no className anywhere in Foo's whole return
    '}',
    'function Bar() {',
    '  return <div className="block text-sm" />',
    '}',
    'export { Foo, Bar }',
  ].join('\n');
  const parts = parseParts(source);
  assert.equal(parts.length, 2);

  const foo = byName(parts, 'Foo');
  assert.equal(foo.classes, undefined, "Foo must not pick up Bar's literal");
  assert.equal(foo.readOnlyReason, 'no static className found');

  const bar = byName(parts, 'Bar');
  assert.equal(bar.classes, 'block text-sm');
  assert.ok(bar.span);
  // Bar's span points into Bar's own text, well past where Foo's declaration/return live.
  assert.ok(bar.span!.start > source.indexOf('function Bar'));
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
