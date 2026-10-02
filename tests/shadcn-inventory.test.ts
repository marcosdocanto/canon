import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inventory, writeVariants, writePart } from '../src/adapters/shadcn/inventory.ts';
import { shadcnAdapter } from '../src/adapters/shadcn/index.ts';
import { installFiles } from '../src/design-files.ts';
import { clone, FIXTURE } from './fixtures/clone.ts';

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

test('writeVariants rejects a class string with a quote, writing nothing', (t) => {
  const root = clone(t);
  const button = inventory(root).find((i) => i.slug === 'button')!;
  const before = readFileSync(button.file, 'utf8');
  const spec = structuredClone(button.cva!);
  spec.variants.variant.brand = ['bg-primary" onClick={alert(1)} x="'];
  assert.throws(() => writeVariants(button, spec), /unsafe class string/);
  assert.equal(readFileSync(button.file, 'utf8'), before, 'a rejected writeVariants call must never touch the file');
});

test('writeVariants rejects a class string with braces or a backtick, writing nothing', (t) => {
  const root = clone(t);
  const button = inventory(root).find((i) => i.slug === 'button')!;
  const spec = structuredClone(button.cva!);
  spec.variants.variant.brand = ['bg-primary}`evil`{'];
  assert.throws(() => writeVariants(button, spec), /unsafe class string/);
});

test('writeVariants rejects a hostile variant axis value (unescaped JSX attribute breakout), writing nothing', (t) => {
  // Mirrors the "unsafe variant key" guard `inventory()` already applies on read (see
  // `unsafeVariantKey` in inventory.ts) — CRITICAL from Task 3's review: `writeVariants` never
  // called it, so a spec like this one would parse and splice fine, then reach a generated
  // `.stories.tsx` file as executable JSX via shadcn/render.ts's `attrString`.
  const root = clone(t);
  const button = inventory(root).find((i) => i.slug === 'button')!;
  const before = readFileSync(button.file, 'utf8');
  const spec = structuredClone(button.cva!);
  spec.variants.size['sm" onClick={alert(1)} x="'] = ['h-8'];
  assert.throws(() => writeVariants(button, spec), /unsafe variant key/);
  assert.equal(readFileSync(button.file, 'utf8'), before, 'a rejected writeVariants call must never touch the file');
});

test('writeVariants rejects a hostile variant axis name, writing nothing', (t) => {
  const root = clone(t);
  const button = inventory(root).find((i) => i.slug === 'button')!;
  const spec = structuredClone(button.cva!);
  spec.variants['size" onClick={alert(1)} x="'] = { sm: ['h-8'] };
  assert.throws(() => writeVariants(button, spec), /unsafe variant key/);
});

test('writeVariants rejects an unsafe defaultVariants value, writing nothing', (t) => {
  const root = clone(t);
  const button = inventory(root).find((i) => i.slug === 'button')!;
  const spec = structuredClone(button.cva!);
  spec.defaultVariants.variant = 'default" onClick={alert(1)} x="';
  assert.throws(() => writeVariants(button, spec), /unsafe defaultVariants value/);
});

test('adapter install shells out through the injected exec', async () => {
  const calls: any[] = [];
  await shadcnAdapter.install('/tmp/x', ['button'], async (cmd, args, opts) => {
    calls.push([cmd, args, opts]); return { status: 0, stdout: '', stderr: '' };
  });
  assert.deepEqual(calls[0][1], ['shadcn@latest', 'add', '--yes', 'button']);
});

test('adapter install surfaces a failed shadcn CLI invocation', async () => {
  await assert.rejects(
    () => shadcnAdapter.install('/tmp/x', ['button'], async () => ({ status: 1, stdout: '', stderr: 'network unreachable' })),
    /shadcn adapter: install failed \(exit 1\): network unreachable/,
  );
});

test('adapter initProject shells out the library\'s own init through the injected exec', async () => {
  const calls: any[] = [];
  await shadcnAdapter.initProject('/tmp/x', async (cmd, args, opts) => {
    calls.push([cmd, args, opts]); return { status: 0, stdout: '', stderr: '' };
  });
  assert.deepEqual(calls[0], ['npx', ['shadcn@latest', 'init', '--yes', '-b', 'radix', '-p', 'nova'], { cwd: '/tmp/x' }]);
});

test('adapter initProject surfaces a failed shadcn CLI invocation', async () => {
  await assert.rejects(
    () => shadcnAdapter.initProject('/tmp/x', async () => ({ status: 1, stdout: '', stderr: 'boom' })),
    /shadcn adapter: init failed \(exit 1\): boom/,
  );
});

test('exportName skips SCREAMING_SNAKE_CASE exports and picks the real PascalCase one', (t) => {
  const root = clone(t);
  writeFileSync(join(root, 'src/ui/toast.tsx'), 'export const TOAST_LIMIT = 5;\nexport function Toast() { return null; }\n');
  const toast = inventory(root).find((i) => i.slug === 'toast')!;
  assert.equal(toast.exportName, 'Toast');
});

test('inventory and writeVariants work with a non-realpath\'d mkdtemp root', (t) => {
  // Deliberately NOT realpathSync-wrapped: on macOS the mkdtemp path (under /var or /tmp) differs
  // from its realpath (/private/var, /private/tmp), which previously tripped installFiles' "the
  // Studio design directory has moved" check because inventory/writeVariants trusted the caller's
  // path to already be canonical.
  const root = mkdtempSync(join(tmpdir(), 'canon shadcn-raw-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(FIXTURE, root, { recursive: true });

  const button = inventory(root).find((i) => i.slug === 'button')!;
  assert.ok(button.cva);
  const spec = structuredClone(button.cva!);
  spec.variants.variant.brand = ['bg-primary/90 text-primary-foreground shadow-lg'];
  assert.doesNotThrow(() => installFiles(root, [writeVariants(button, spec)]));
  assert.ok(readFileSync(button.file, 'utf8').includes('brand:'));
});

test('barrel files with no genuine PascalCase export are skipped from the inventory', (t) => {
  const root = clone(t);
  writeFileSync(join(root, 'src/ui/index.tsx'), "export * from './button';\nexport * from './badge';\n");
  const items = inventory(root);
  assert.equal(items.find((i) => i.slug === 'index'), undefined);
  assert.ok(items.find((i) => i.slug === 'button'));
  assert.ok(items.find((i) => i.slug === 'badge'));
});

test('a variant key unsafe for unescaped JSX interpolation makes the component read-only', (t) => {
  // cva()'s grammar allows quoted keys with arbitrary characters (see cva.ts's parseKey), but the
  // render path interpolates every variant axis name/value key unescaped into a JSX attribute
  // (shadcn/render.ts's attrString). A key like `has"quote` would otherwise produce broken —
  // or injected — TSX silently written to disk; inventory must refuse it and surface the
  // component as read-only instead of exposing the parsed cva.
  const root = clone(t);
  writeFileSync(join(root, 'src/ui/exotic.tsx'), [
    'import { cva } from "class-variance-authority"',
    '',
    'const exoticVariants = cva("base-class", {',
    '  variants: {',
    '    variant: {',
    '      \'has"quote\': "foo",',
    '    },',
    '  },',
    '})',
    '',
    'export function Exotic() {',
    '  return null',
    '}',
    '',
    'export { Exotic, exoticVariants }',
    '',
  ].join('\n'));

  const exotic = inventory(root).find((i) => i.slug === 'exotic')!;
  assert.equal(exotic.cva, undefined);
  assert.match(exotic.readOnlyReason!, /unsafe variant key/);
  assert.match(exotic.readOnlyReason!, /has"quote/);
});

test('a digit-leading variant value like "2xl" is safe and does not force read-only', (t) => {
  // Round 2 fix: a value key only ever lands inside the JSX attribute's quotes (`="${value}"`), so
  // a leading digit is harmless there — unlike an axis name, which becomes the bare attribute name
  // itself. shadcn/Tailwind scales commonly use digit-leading values like `2xl`/`3xl`; the original
  // single SAFE_VARIANT_KEY grammar wrongly rejected them and forced the component read-only.
  const root = clone(t);
  writeFileSync(join(root, 'src/ui/scale.tsx'), [
    'import { cva } from "class-variance-authority"',
    '',
    'const scaleVariants = cva("base-class", {',
    '  variants: {',
    '    size: {',
    '      sm: "text-sm",',
    '      "2xl": "text-2xl",',
    '    },',
    '  },',
    '})',
    '',
    'export function Scale() {',
    '  return null',
    '}',
    '',
    'export { Scale, scaleVariants }',
    '',
  ].join('\n'));

  const scale = inventory(root).find((i) => i.slug === 'scale')!;
  assert.equal(scale.readOnlyReason, undefined);
  assert.ok(scale.cva, 'a digit-leading value must not disqualify the component');
  assert.deepEqual(Object.keys(scale.cva!.variants.size), ['sm', '2xl']);
});

test('SelectTrigger allows a radius edit while preserving source selector quotes and rejecting new opaque tokens', (t) => {
  const root = clone(t);
  const selector = "[&_svg:not([class*='size-'])]:size-4";
  const file = join(root,'src/ui/select.tsx');
  const source = `export function SelectTrigger({className}) { return <button className={cn("rounded-md ${selector}",className)} /> }`;
  writeFileSync(file,source);
  const info=inventory(root).find(c=>c.slug==='select')!;
  const part=info.parts!.find(p=>p.name==='SelectTrigger')!;
  assert.ok(part.span);
  assert.equal(part.readOnlyReason,undefined);
  const write=writePart(info,'SelectTrigger',`rounded-none ${selector}`);
  assert.equal(write.content.toString(),source.replace('rounded-md','rounded-none'));
  assert.equal(readFileSync(file,'utf8'),source);
  assert.throws(()=>writePart(info,'SelectTrigger',`rounded-none ${selector} after:content-['new']`),/unsafe class string/);
  assert.throws(()=>writePart(info,'SelectTrigger','rounded-none ";alert(1);//'),/unsafe class string/);
  const forged={...info,parts:[{...part,classes:"after:content-['new']"}]};
  assert.throws(()=>writePart(forged,'SelectTrigger',"after:content-['new']"),/unsafe class string/);
  writeFileSync(file,source.replace(selector,'block'));
  assert.throws(()=>writePart(info,'SelectTrigger',`rounded-none ${selector}`),/unsafe class string/);
});

test('writeVariants preserves opaque source selectors while saving a safe base edit and rejects new opaque tokens', (t) => {
  const root = clone(t);
  const file = join(root, 'src/ui/button.tsx');
  const selector = "[&_svg:not([class*='size-'])]:size-4";
  writeFileSync(file, readFileSync(file, 'utf8').replace('inline-flex items-center', `${selector} inline-flex items-center`));
  const button = inventory(root).find((component) => component.slug === 'button')!;
  const spec = structuredClone(button.cva!);
  spec.base = spec.base.map((value) => value.replace('rounded-md', 'rounded-full'));
  const write = writeVariants(button, spec);
  assert.match(write.content.toString(), /rounded-full/);
  assert.ok(write.content.toString().includes(selector));
  spec.base.push("[&_svg:not([class*='new-'])]:size-8");
  assert.throws(() => writeVariants(button, spec), /unsafe class string/);
});

test('opaque selector preservation trusts fresh source, never client-supplied component metadata or a different scope', (t) => {
  const root = clone(t);
  const button = inventory(root).find((component) => component.slug === 'button')!;
  const spec = structuredClone(button.cva!);
  spec.base.push("after:content-['new']");
  assert.throws(() => writeVariants({ ...button, cva: spec }, spec), /unsafe class string/);
});

test('writeVariants preserves empty variant class strings while editing another property', (t) => {
  const root = clone(t);
  const file = join(root,'src/ui/button.tsx');
  writeFileSync(file, readFileSync(file,'utf8').replace('bg-primary text-primary-foreground shadow hover:bg-primary/90', ''));
  const button = inventory(root).find(c => c.slug === 'button')!;
  const spec = structuredClone(button.cva!);
  spec.base.push('rounded-none');
  const written = writeVariants(button,spec);
  assert.match(written.content.toString(),/rounded-none/);
  assert.match(written.content.toString(),/default:\s*""/);
});
