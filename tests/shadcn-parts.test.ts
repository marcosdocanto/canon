import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseParts, splicePart } from '../src/adapters/shadcn/parts.ts';
import { findCva } from '../src/adapters/shadcn/cva.ts';
import { inventory, writePart } from '../src/adapters/shadcn/inventory.ts';
import { installFiles } from '../src/design-files.ts';
import { clone } from './fixtures/clone.ts';
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

test('CRITICAL fix: a closure\'s own return (.map callback) is never mistaken for the component\'s own — resolves to the outer literal, not the inner one', () => {
  // The reviewer's exact repro: a nested `.map(item => { return <li className="item-class"> })`
  // appears, in source, BEFORE the component's own `return <ul className="list-class">`. The old
  // flat `return`-scan picked the closure's `return` first and silently misattributed "item-class"
  // as List's own part — exactly the failure the spec forbids (a Studio edit would touch the wrong
  // element). The fix must resolve to "list-class".
  const source = [
    'function List({ items }: { items: string[] }) {',
    '  return (',
    '    <ul className="list-class">',
    '      {items.map(item => {',
    '        return <li className="item-class">{item}</li>',
    '      })}',
    '    </ul>',
    '  )',
    '}',
    'export { List }',
  ].join('\n');
  const list = byName(parseParts(source), 'List');
  assert.equal(list.classes, 'list-class');
  assert.notEqual(list.classes, 'item-class');
  assert.equal(list.readOnlyReason, undefined);
  assert.equal(list.note, undefined);
  assert.equal(source.slice(list.span!.start, list.span!.end), '"list-class"');
});

test('a closure passed as a plain callback (arrow with expression body, no block) still doesn\'t confuse the outer return', () => {
  const source = [
    'function List({ items }: { items: string[] }) {',
    '  return (',
    '    <ul className="list-class">',
    '      {items.map(item => <li className="item-class">{item}</li>)}',
    '    </ul>',
    '  )',
    '}',
    'export { List }',
  ].join('\n');
  const list = byName(parseParts(source), 'List');
  assert.equal(list.classes, 'list-class');
});

test('IMPORTANT 1: a guard clause (non-JSX return first, literal second) resolves to the literal, editable, no note', () => {
  const source = [
    'function Panel({ open, className }: { open: boolean; className?: string }) {',
    '  if (!open) return null',
    '  return <div className={cn("panel-class", className)} />',
    '}',
    'export { Panel }',
  ].join('\n');
  const panel = byName(parseParts(source), 'Panel');
  assert.equal(panel.classes, 'panel-class');
  assert.equal(panel.dynamicTail, 'className');
  assert.equal(panel.readOnlyReason, undefined);
  assert.equal(panel.note, undefined, 'only one branch has ANY literal — no multi-branch note');
});

test('a 3-branch Sidebar-like shape: the first literal-yielding branch wins, with a multi-branch note', () => {
  const source = [
    'function Sidebar({ collapsible, isMobile }: { collapsible: string; isMobile: boolean }) {',
    '  if (collapsible === "none") {',
    '    return <div className="flex h-full flex-col bg-sidebar">{null}</div>',
    '  }',
    '  if (isMobile) {',
    '    return <div className="mobile-sidebar-class">{null}</div>',
    '  }',
    '  return <div className="desktop-sidebar-class">{null}</div>',
    '}',
    'export { Sidebar }',
  ].join('\n');
  const sidebar = byName(parseParts(source), 'Sidebar');
  assert.equal(sidebar.classes, 'flex h-full flex-col bg-sidebar', 'first literal-yielding branch (source order) wins');
  assert.equal(sidebar.readOnlyReason, undefined);
  assert.equal(sidebar.note, '3 render branches; editing branch 1');
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

test('splice preserves a single-quote literal\'s quote character (pinned)', () => {
  const source = [
    "function Foo({ className }: { className?: string }) {",
    "  return <div className={cn('single-quoted', className)} />",
    "}",
    "export { Foo }",
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, 'single-quoted');
  assert.equal(source[foo.span!.start], "'");
  const spliced = splicePart(source, foo, 'new-single-quoted');
  assert.equal(spliced.slice(foo.span!.start, foo.span!.start + 1), "'", 'opening delimiter stays a single quote');
  assert.match(spliced, /cn\('new-single-quoted', className\)/);
  assert.doesNotMatch(spliced, /"new-single-quoted"/, 'must not have switched to double quotes');
  const reparsed = byName(parseParts(spliced), 'Foo');
  assert.equal(reparsed.classes, 'new-single-quoted');
});

test('splice preserves a template-literal\'s backtick delimiters (pinned)', () => {
  const source = [
    'function Foo({ className }: { className?: string }) {',
    '  return <div className={cn(`block text-sm`, className)} />',
    '}',
    'export { Foo }',
  ].join('\n');
  const foo = byName(parseParts(source), 'Foo');
  assert.equal(foo.classes, 'block text-sm');
  assert.equal(source[foo.span!.start], '`');
  const spliced = splicePart(source, foo, 'block text-lg');
  assert.equal(spliced.slice(foo.span!.start, foo.span!.start + 1), '`', 'opening delimiter stays a backtick');
  assert.match(spliced, /cn\(`block text-lg`, className\)/);
  const reparsed = byName(parseParts(spliced), 'Foo');
  assert.equal(reparsed.classes, 'block text-lg');
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

// ---- inventory() attaches parts; writePart (Task 2) ------------------------------------------

test('inventory() attaches parts to every component, independently of cva validity', (t) => {
  const root = clone(t);
  const items = inventory(root);

  const dialog = items.find((i) => i.slug === 'dialog')!;
  assert.ok(dialog.parts, 'dialog.tsx has no cva() at all and must still get parts');
  assert.deepEqual(dialog.parts!.map((p) => p.name), [
    'Dialog', 'DialogTrigger', 'DialogPortal', 'DialogClose',
    'DialogOverlay', 'DialogContent', 'DialogHeader', 'DialogFooter',
    'DialogTitle', 'DialogDescription',
  ]);
  assert.equal(dialog.cva, undefined);

  const button = items.find((i) => i.slug === 'button')!;
  assert.ok(button.cva, 'button.tsx has a valid cva()');
  assert.equal(button.parts!.length, 1);
  assert.equal(button.parts![0].name, 'Button');
  assert.equal(button.parts![0].readOnlyReason, 'dynamic classes only');

  const badge = items.find((i) => i.slug === 'badge')!;
  assert.equal(badge.cva, undefined);
  assert.match(badge.readOnlyReason!, /template interpolation/, 'badge is read-only at the cva level (its cva() failed to parse)');
  assert.ok(badge.parts, 'a read-only (cva parse failed) component still gets parts — parts are independent of cva validity');
  assert.equal(badge.parts!.length, 1);
  assert.equal(badge.parts![0].name, 'Badge');
});

test('writePart: happy path on DialogContent — byte-identical elsewhere, fixed point, installable', (t) => {
  const root = clone(t);
  const dialog = inventory(root).find((i) => i.slug === 'dialog')!;
  const before = readFileSync(dialog.file, 'utf8');
  const contentBefore = dialog.parts!.find((p) => p.name === 'DialogContent')!;
  assert.ok(contentBefore.span);

  const newClasses = 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-md gap-4 border bg-background p-6 shadow-lg sm:rounded-lg';
  const write = writePart(dialog, 'DialogContent', newClasses);
  assert.equal(write.path, dialog.file);
  assert.ok(write.root);

  installFiles(root, [write]);
  const after = readFileSync(dialog.file, 'utf8');

  // Byte-identical outside the spliced span.
  assert.equal(after.slice(0, contentBefore.span!.start), before.slice(0, contentBefore.span!.start), 'prefix byte-identical');
  const beforeSuffix = before.slice(contentBefore.span!.end);
  assert.equal(after.slice(after.length - beforeSuffix.length), beforeSuffix, 'suffix byte-identical');
  assert.ok(after.includes(`"${newClasses}"`));

  // Fixed point: re-inventorying the written file reads the part back as exactly what was written.
  const reInventoried = inventory(root).find((i) => i.slug === 'dialog')!;
  const contentAfter = reInventoried.parts!.find((p) => p.name === 'DialogContent')!;
  assert.equal(contentAfter.classes, newClasses);

  // Hand-authored siblings (e.g. DialogHeader) are untouched.
  const headerAfter = reInventoried.parts!.find((p) => p.name === 'DialogHeader')!;
  assert.equal(headerAfter.classes, 'flex flex-col space-y-1.5 text-center sm:text-left');
});

test('writePart throws naming the component and part when the part does not exist', (t) => {
  const root = clone(t);
  const dialog = inventory(root).find((i) => i.slug === 'dialog')!;
  const before = readFileSync(dialog.file, 'utf8');
  assert.throws(() => writePart(dialog, 'NoSuchPart', 'x'), /"dialog" has no part named "NoSuchPart"/);
  assert.equal(readFileSync(dialog.file, 'utf8'), before, 'a rejected writePart call must never touch the file');
});

test('writePart throws naming the part when it is read-only, writing nothing', (t) => {
  const root = clone(t);
  const dialog = inventory(root).find((i) => i.slug === 'dialog')!;
  const before = readFileSync(dialog.file, 'utf8');
  const portal = dialog.parts!.find((p) => p.name === 'DialogPortal')!;
  assert.equal(portal.span, undefined, 'DialogPortal is a plain alias with no static className: read-only');
  assert.throws(() => writePart(dialog, 'DialogPortal', 'x'), /"dialog"'s part "DialogPortal" is read-only/);
  assert.equal(readFileSync(dialog.file, 'utf8'), before, 'a rejected writePart call must never touch the file');
});

test('writePart accepts an emptied class list ("" — every chip removed in the editor), splicing "" into the literal', (t) => {
  // Final-review fix (Finding 1): removing every chip in the editor sets the draft to '', and the
  // cva editor already allows emptying a class list the same way (validateClassList([]) on an
  // empty array trivially passes) — so a part's classes must be allowed to go empty too, not 422
  // as if '' were a hostile string.
  const root = clone(t);
  const dialog = inventory(root).find((i) => i.slug === 'dialog')!;
  const before = readFileSync(dialog.file, 'utf8');
  const footerBefore = dialog.parts!.find((p) => p.name === 'DialogFooter')!;
  assert.ok(footerBefore.span);

  const write = writePart(dialog, 'DialogFooter', '');
  installFiles(root, [write]);
  const after = readFileSync(dialog.file, 'utf8');

  // Byte-identical outside the spliced span; the literal becomes exactly `""` (quote style
  // preserved), nothing deleted or substituted.
  assert.equal(after.slice(0, footerBefore.span!.start), before.slice(0, footerBefore.span!.start), 'prefix byte-identical');
  const beforeSuffix = before.slice(footerBefore.span!.end);
  assert.equal(after.slice(after.length - beforeSuffix.length), beforeSuffix, 'suffix byte-identical');
  assert.equal(after.slice(footerBefore.span!.start, footerBefore.span!.start + 2), '""', 'literal spliced to the empty string, quote style preserved');
  assert.equal(after.length, before.length - (footerBefore.span!.end - footerBefore.span!.start) + 2);

  // Fixed point: re-inventorying reads DialogFooter back as editable, classes === ''.
  const reInventoried = inventory(root).find((i) => i.slug === 'dialog')!;
  const footerAfter = reInventoried.parts!.find((p) => p.name === 'DialogFooter')!;
  assert.equal(footerAfter.classes, '');
  assert.ok(footerAfter.span, 'still editable — the part can be filled back in later');

  // A sibling part in the same file is untouched.
  const headerAfter = reInventoried.parts!.find((p) => p.name === 'DialogHeader')!;
  assert.equal(headerAfter.classes, 'flex flex-col space-y-1.5 text-center sm:text-left');
});

test('writePart treats a whitespace-only class string the same as fully empty, normalizing the spliced literal to ""', (t) => {
  const root = clone(t);
  const dialog = inventory(root).find((i) => i.slug === 'dialog')!;
  const write = writePart(dialog, 'DialogFooter', '   ');
  installFiles(root, [write]);
  const reInventoried = inventory(root).find((i) => i.slug === 'dialog')!;
  assert.equal(reInventoried.parts!.find((p) => p.name === 'DialogFooter')!.classes, '', 'whitespace-only input normalizes to the canonical empty string, not preserved verbatim');
});

test('writePart rejects an injection attempt in classes (quote breakout), writing nothing', (t) => {
  const root = clone(t);
  const dialog = inventory(root).find((i) => i.slug === 'dialog')!;
  const before = readFileSync(dialog.file, 'utf8');
  assert.throws(() => writePart(dialog, 'DialogHeader', 'bg-primary" onClick={alert(1)} x="'), /unsafe class string/);
  assert.equal(readFileSync(dialog.file, 'utf8'), before, 'a rejected writePart call must never touch the file');
});

test('writePart rejects classes containing braces or a backtick, writing nothing', (t) => {
  const root = clone(t);
  const dialog = inventory(root).find((i) => i.slug === 'dialog')!;
  assert.throws(() => writePart(dialog, 'DialogFooter', 'bg-primary}`evil`{'), /unsafe class string/);
});

test('writePart is exposed on the shadcn adapter object', async () => {
  const { shadcnAdapter } = await import('../src/adapters/shadcn/index.ts');
  assert.equal(typeof shadcnAdapter.writePart, 'function');
});

test('a static native wrapper records its direct styled child for preview without changing the editable span', () => {
  const source = 'export function Table({ className }) { return <div className="relative w-full overflow-x-auto"><table className={cn("w-full text-sm", className)} /></div> }';
  const [part] = parseParts(source);
  assert.equal(part.classes, 'relative w-full overflow-x-auto');
  assert.deepEqual(part.previewChild, { wrapperTag: 'div', tag: 'table', classes: 'w-full text-sm' });
  assert.equal(source.slice(part.span!.start, part.span!.end), '"relative w-full overflow-x-auto"');
});
