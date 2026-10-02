import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inventory } from '../src/adapters/shadcn/inventory.ts';
import { shadcnAdapter } from '../src/adapters/shadcn/index.ts';
import { installFiles } from '../src/design-files.ts';
import { GENERATED_MARK, ensureStorybook, storyWrites } from '../src/generators/stories.ts';
import { exclusionReason } from '../src/generators/story-catalog.ts';
import { clone } from './fixtures/clone.ts';

test('generated stories typecheck in an app without Storybook, including the Sonner theme union', (t) => {
  const root = clone(t);
  symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), join(root, 'node_modules'), 'dir');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { sonner: '2.0.0' } }));
  writeFileSync(join(root, 'src/ui/sonner.tsx'), `export function Toaster(props: { theme?: 'light' | 'dark' | 'system'; position?: 'bottom-right' }) { return <div data-theme={props.theme} />; }`);
  writeFileSync(join(root, 'sonner-api.d.ts'), `declare function toast(message: string, options?: {description?: string}): void; declare namespace toast { const success: typeof toast; const error: typeof toast; } export { toast };`);
  const components = inventory(root).filter(c => c.slug === 'sonner');
  assert.equal(components.length, 1);
  const writes = storyWrites(root, shadcnAdapter, components);
  installFiles(root, writes);
  const program = ts.createProgram(writes.map(w => w.path), {
    noEmit: true, strict: true, skipLibCheck: true, esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022, baseUrl: root,
    paths: { '~/*': ['src/*'], sonner: ['sonner-api.d.ts'] },
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: f => f, getNewLine: () => '\n',
  }));
});

test('storyWrites generates a marked story per component, one element per render example', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const writes = storyWrites(root, shadcnAdapter, components);

  const button = writes.find((w) => w.path === join(root, 'stories', 'canon', 'button.stories.tsx'))!;
  assert.ok(button, 'button story is written');
  const content = button.content.toString('utf8');
  assert.ok(content.startsWith(GENERATED_MARK), 'marker must be the first line');
  assert.match(content, /import \{ Button \} from '~\/ui\/button';/);
  assert.match(content, /title: 'Canon\/Button'/);

  const buttonComponent = components.find((c) => c.slug === 'button')!;
  const examples = shadcnAdapter.renderSpec(buttonComponent);
  assert.ok(examples.length > 1, 'fixture button has multiple variant examples');
  for (const example of examples) assert.ok(content.includes(example.jsx), `missing element for "${example.title}"`);
  // one element per example: same number of Button JSX tags as examples
  const tagCount = (content.match(/<Button[ >]/g) ?? []).length;
  assert.equal(tagCount, examples.length);
});

test('read-only components get a single default example plus a docs note with the reason', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const badge = components.find((c) => c.slug === 'badge')!;
  assert.ok(badge.readOnlyReason, 'fixture badge is read-only');
  assert.equal(badge.cva, undefined);

  const writes = storyWrites(root, shadcnAdapter, components);
  const badgeWrite = writes.find((w) => w.path === join(root, 'stories', 'canon', 'badge.stories.tsx'))!;
  const content = badgeWrite.content.toString('utf8');
  assert.ok(content.startsWith(GENERATED_MARK));
  assert.match(content, /import \{ Badge \} from '~\/ui\/badge';/);

  const tagCount = (content.match(/<Badge[ >]/g) ?? []).length;
  assert.equal(tagCount, 1, 'read-only component gets a single default example');
  assert.ok(content.includes('Style block is read-only for Canon:'), 'docs note present');
  assert.ok(content.includes(badge.readOnlyReason!), 'docs note includes the actual reason');
});

test('a component with an unsafe variant key is read-only in its story and never reaches the JSX', (t) => {
  const root = clone(t);
  writeFileSync(join(root, 'src', 'ui', 'exotic.tsx'), [
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

  const components = inventory(root);
  const exotic = components.find((c) => c.slug === 'exotic')!;
  assert.equal(exotic.cva, undefined);
  assert.match(exotic.readOnlyReason!, /unsafe variant key: has"quote/);

  const writes = storyWrites(root, shadcnAdapter, components);

  const exoticWrite = writes.find((w) => w.path === join(root, 'stories', 'canon', 'exotic.stories.tsx'))!;
  const exoticContent = exoticWrite.content.toString('utf8');
  assert.ok(exoticContent.startsWith(GENERATED_MARK));

  // The unsafe key never reaches the rendered element itself — only the (safely escaped) docs note.
  const elementLine = exoticContent.split('\n').find((line) => line.trim().startsWith('<Exotic'));
  assert.equal(elementLine?.trim(), '<Exotic>…</Exotic>', 'no attribute is emitted for the unsafe axis');
  const tagCount = (exoticContent.match(/<Exotic[ >]/g) ?? []).length;
  assert.equal(tagCount, 1, 'read-only component gets a single default example');
  const expectedNote = JSON.stringify(`Style block is read-only for Canon: ${exotic.readOnlyReason}`);
  assert.ok(exoticContent.includes(expectedNote), 'docs note carries the reason, safely escaped');

  // The rest of the set is unaffected: button's story still has all its usual examples.
  const buttonWrite = writes.find((w) => w.path === join(root, 'stories', 'canon', 'button.stories.tsx'))!;
  const buttonContent = buttonWrite.content.toString('utf8');
  const buttonTagCount = (buttonContent.match(/<Button[ >]/g) ?? []).length;
  assert.equal(buttonTagCount, 10);
});

test('a digit-leading variant value like "2xl" is safe: not read-only, renders size="2xl"', (t) => {
  const root = clone(t);
  writeFileSync(join(root, 'src', 'ui', 'scale.tsx'), [
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

  const components = inventory(root);
  const scale = components.find((c) => c.slug === 'scale')!;
  assert.equal(scale.readOnlyReason, undefined);
  assert.ok(scale.cva, 'a digit-leading value must not disqualify the component');

  const writes = storyWrites(root, shadcnAdapter, components);
  const scaleWrite = writes.find((w) => w.path === join(root, 'stories', 'canon', 'scale.stories.tsx'))!;
  const content = scaleWrite.content.toString('utf8');
  assert.ok(content.startsWith(GENERATED_MARK));
  assert.ok(!content.includes('Style block is read-only for Canon:'), 'not treated as read-only');
  assert.match(content, /<Scale size="2xl">/);
  const tagCount = (content.match(/<Scale[ >]/g) ?? []).length;
  assert.equal(tagCount, 2, 'one element per variant value (sm, 2xl)');
});

test('never clobbers unmarked story', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const storiesDir = join(root, 'stories', 'canon');
  mkdirSync(storiesDir, { recursive: true });
  const target = join(storiesDir, 'button.stories.tsx');
  writeFileSync(target, '// hand-written story, not generated\nexport default {};\n');

  assert.throws(
    () => storyWrites(root, shadcnAdapter, components),
    (error: unknown) => error instanceof Error && error.message === `refusing to overwrite unmarked story: ${target}`,
  );

  // Nothing else was written either — the batch is validated before any Write is produced.
  const badgeTarget = join(storiesDir, 'badge.stories.tsx');
  assert.throws(() => readFileSync(badgeTarget));
});

test('regenerating a previously generated story succeeds', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const storiesDir = join(root, 'stories', 'canon');
  mkdirSync(storiesDir, { recursive: true });
  const target = join(storiesDir, 'button.stories.tsx');
  writeFileSync(target, `${GENERATED_MARK}\n// stale content from a previous build\n`);

  const writes = storyWrites(root, shadcnAdapter, components);
  assert.doesNotThrow(() => installFiles(root, writes));
  const content = readFileSync(target, 'utf8');
  assert.ok(content.startsWith(GENERATED_MARK));
  assert.match(content, /Button/);
});

test('ensureStorybook reports present without shelling out when .storybook exists', async (t) => {
  const root = clone(t);
  mkdirSync(join(root, '.storybook'), { recursive: true });
  let called = false;
  const result = await ensureStorybook(root, async () => { called = true; return { status: 0, stdout: '', stderr: '' }; });
  assert.equal(result, 'present');
  assert.equal(called, false, 'must not shell out when already installed');
});

test('ensureStorybook runs npx storybook init when missing, via the injected exec', async (t) => {
  const root = clone(t);
  const calls: any[] = [];
  const result = await ensureStorybook(root, async (cmd, args, opts) => {
    calls.push([cmd, args, opts]);
    return { status: 0, stdout: '', stderr: '' };
  });
  assert.equal(result, 'installed');
  assert.deepEqual(calls[0][0], 'npx');
  assert.deepEqual(calls[0][1], ['storybook@latest', 'init', '--yes']);
  assert.equal(calls[0][2].cwd, root);
});

test('ensureStorybook surfaces a failed init', async (t) => {
  const root = clone(t);
  await assert.rejects(
    () => ensureStorybook(root, async () => ({ status: 1, stdout: '', stderr: 'boom' })),
    /boom/,
  );
});

// --- Curated catalog ---------------------------------------------------------------------------

test('a cataloged slug (accordion) gets its curated two-item example, not a bare default element', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const writes = storyWrites(root, shadcnAdapter, components);

  const accordion = writes.find((w) => w.path === join(root, 'stories', 'canon', 'accordion.stories.tsx'))!;
  assert.ok(accordion, 'accordion story is written');
  const content = accordion.content.toString('utf8');
  assert.ok(content.startsWith(GENERATED_MARK));
  assert.match(content, /import \{ Accordion, AccordionItem, AccordionTrigger, AccordionContent \} from '~\/ui\/accordion';/);
  assert.match(content, /type="single" defaultValue="item-1"/);
  // two real items, not the generic single "…" placeholder the axis-based fallback would emit
  assert.equal((content.match(/<AccordionItem /g) ?? []).length, 2);
  assert.ok(content.includes('Is it accessible?'));
  assert.ok(!content.includes('>…<'), 'curated example never falls back to the generic ellipsis filler');
});

test('a labeled control (checkbox) imports the real Label from the sibling ui module when it exists', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const writes = storyWrites(root, shadcnAdapter, components);

  const checkbox = writes.find((w) => w.path === join(root, 'stories', 'canon', 'checkbox.stories.tsx'))!;
  const content = checkbox.content.toString('utf8');
  assert.match(content, /import \{ Checkbox \} from '~\/ui\/checkbox';/);
  assert.match(content, /import \{ Label \} from '~\/ui\/label';/);
  assert.match(content, /<Label htmlFor="story-checkbox">Accept terms and conditions<\/Label>/);
});

test('a labeled control (checkbox) falls back to a plain <label> — never a guessed import — when the project has no label component', (t) => {
  const root = clone(t);
  rmSync(join(root, 'src', 'ui', 'label.tsx')); // this project never adopted a `label` component
  const components = inventory(root);
  const writes = storyWrites(root, shadcnAdapter, components);

  const checkbox = writes.find((w) => w.path === join(root, 'stories', 'canon', 'checkbox.stories.tsx'))!;
  const content = checkbox.content.toString('utf8');
  assert.doesNotMatch(content, /from '~\/ui\/label'/, 'never imports a component that was verified absent from the inventory');
  assert.doesNotMatch(content, /<Label\b/);
  assert.match(content, /<label htmlFor="story-checkbox">Accept terms and conditions<\/label>/);
});

// --- Exclusion mechanism -----------------------------------------------------------------------

test('DirectionProvider gets an interactive LTR/RTL story', (t) => {
  const root = clone(t);
  const components = inventory(root);
  assert.ok(components.some((c) => c.slug === 'direction'));

  const writes = storyWrites(root, shadcnAdapter, components);
  const direction=writes.find((w) => w.path === join(root, 'stories', 'canon', 'direction.stories.tsx'));
  assert.ok(direction);
  assert.match(direction.content.toString(), /DirectionProvider dir=\{direction\}/);
  assert.match(direction.content.toString(), /setDirection\('rtl'\)/);
  // the rest of the batch is unaffected
  assert.ok(writes.some((w) => w.path === join(root, 'stories', 'canon', 'button.stories.tsx')));
});

test('storyWrites deletes a previously generated (GENERATED_MARK) story for a slug that is now excluded — stale cleanup', (t) => {
  const root = clone(t);
  const components = [...inventory(root), {slug:'chart',file:'/unused/chart.tsx',exportName:'ChartContainer',importPath:'~/ui/chart'}];
  const storiesDir = join(root, 'stories', 'canon');
  mkdirSync(storiesDir, { recursive: true });
  const target = join(storiesDir, 'chart.stories.tsx');
  writeFileSync(target, `${GENERATED_MARK}\n// stale: chart used to be generated before it was excluded\n`);

  storyWrites(root, shadcnAdapter, components); // side effect: deletes the stale excluded file
  assert.throws(() => readFileSync(target), /ENOENT/);
});

test('storyWrites never deletes a hand-edited (unmarked) story for an excluded slug', (t) => {
  const root = clone(t);
  const components = [...inventory(root), {slug:'chart',file:'/unused/chart.tsx',exportName:'ChartContainer',importPath:'~/ui/chart'}];
  const storiesDir = join(root, 'stories', 'canon');
  mkdirSync(storiesDir, { recursive: true });
  const target = join(storiesDir, 'chart.stories.tsx');
  writeFileSync(target, '// hand-written story for chart, not generated\nexport default {};\n');

  storyWrites(root, shadcnAdapter, components);
  assert.equal(readFileSync(target, 'utf8'), '// hand-written story for chart, not generated\nexport default {};\n');
});

test('exclusionReason: chart is excluded only when the target project has no recharts dependency', (t) => {
  const tmp = mkdtempSync(join(tmpdir(), 'canon chart-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const chart = { slug: 'chart', file: '/fake/chart.tsx', exportName: 'ChartContainer', importPath: '~/ui/chart' };

  writeFileSync(join(tmp, 'package.json'), JSON.stringify({ dependencies: {} }));
  assert.match(exclusionReason(chart, tmp)!, /recharts/);

  writeFileSync(join(tmp, 'package.json'), JSON.stringify({ dependencies: { recharts: '^3.0.0' } }));
  assert.equal(exclusionReason(chart, tmp), undefined);
});

// --- composedStory (compound fallback) bugfix ---------------------------------------------------

test('a compound family with Title/Description directly under its root (no Header wrapper, e.g. shadcn\'s own Alert) composes them unwrapped instead of silently dropping them', (t) => {
  const root = clone(t);
  writeFileSync(join(root, 'src', 'ui', 'callout.tsx'), [
    'import * as React from "react"',
    '',
    'function Callout({ className, ...props }: React.ComponentProps<"div">) {',
    '  return <div className={className} {...props} />',
    '}',
    'function CalloutTitle({ className, ...props }: React.ComponentProps<"div">) {',
    '  return <div className={className} {...props} />',
    '}',
    'function CalloutDescription({ className, ...props }: React.ComponentProps<"div">) {',
    '  return <div className={className} {...props} />',
    '}',
    '',
    'export { Callout, CalloutTitle, CalloutDescription }',
    '',
  ].join('\n'));

  const components = inventory(root);
  const writes = storyWrites(root, shadcnAdapter, components);
  const callout = writes.find((w) => w.path === join(root, 'stories', 'canon', 'callout.stories.tsx'))!;
  const content = callout.content.toString('utf8');

  assert.ok(content.includes('<CalloutTitle>Callout title</CalloutTitle>'), 'Title is rendered even with no CalloutHeader to wrap it');
  assert.ok(content.includes('Supporting description for this component.'), 'Description is rendered too');
  assert.doesNotMatch(content, /<Callout style=\{\{ width: 360 \}\}>\s*<\/Callout>/, 'never composes to an empty box');
});
