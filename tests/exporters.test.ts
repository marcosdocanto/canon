import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createSystem } from '../src/system.ts';
import { indexTokens } from '../src/tokens/resolve.ts';
import { tokensCss } from '../src/generators/css.ts';
import { componentTsx, generate as generateReact } from '../src/generators/react.ts';
import { generate as generateTailwind } from '../src/generators/tailwind.ts';
import type { System } from '../src/types.ts';

const require = createRequire(import.meta.url);
let system: System;
let consumerDir: string;
let diagnostics: string[];
let nativeDiagnostics: string[];
let bindings: Record<string, React.ElementType>;
let nativeBindings: Record<string, React.ElementType>;

const compilerOptions: ts.CompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  jsx: ts.JsxEmit.ReactJSX,
  skipLibCheck: true,
  types: ['react'],
};

function compile(entry: string) {
  const program = ts.createProgram([join(consumerDir, 'react', entry)], {
    ...compilerOptions,
    rootDir: join(consumerDir, 'react'),
    outDir: join(consumerDir, 'compiled'),
  });
  const errors = ts.getPreEmitDiagnostics(program).map((d) => {
    const file = d.file?.fileName.replace(consumerDir, 'consumer');
    return `${file ?? ''} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
  });
  // Emitting even when compilation fails lets SSR independently catch incorrect state output.
  program.emit();
  return errors;
}

before(async () => {
  system = await createSystem({ name: 'Exporter consumer', prefix: 'acme' });
  consumerDir = mkdtempSync(join(tmpdir(), 'canon-exporters-'));
  symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), join(consumerDir, 'node_modules'), 'dir');
  writeFileSync(join(consumerDir, 'package.json'), '{"type":"commonjs"}');
  generateReact(system, indexTokens(system.tokens, 'acme'), (rel, content) => {
    const path = join(consumerDir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  });
  diagnostics = compile('index.ts');
  bindings = require(join(consumerDir, 'compiled/index.js'));

  const input = structuredClone(system.components.find((c) => c.slug === 'input')!);
  input.slug = 'native-input';
  input.anatomy = [{ part: 'root', element: 'input', description: 'Native input.' }];
  input.props.state = { values: ['ready', 'error'], default: 'ready', description: 'Validation state.' };
  input.states.error = { selector: '[data-state="error"]', description: 'Invalid input.' };
  input.states.pending = { selector: '[data-disabled]', description: 'Disabled while saving.' };
  const dialog = structuredClone(system.components.find((c) => c.slug === 'dialog')!);
  dialog.slug = 'native-dialog';
  dialog.anatomy = [{ part: 'root', element: 'dialog', description: 'Native dialog.' }];
  for (const spec of [input, dialog]) {
    writeFileSync(join(consumerDir, 'react', `${spec.slug}.tsx`), componentTsx(spec, 'acme'));
  }
  writeFileSync(join(consumerDir, 'react/consumer.tsx'), `
import * as React from 'react';
import { AccordionIconV, ActivityFeedTime, InputField, ProgressCircleTrack, SliderValue, VideoPlayerMedia } from './index';
import { NativeInput } from './native-input';
import { NativeDialog } from './native-dialog';
export { NativeInput, NativeDialog };
export const controls = <>
  <NativeInput size="sm" disabled defaultValue="Ada" state="error" ref={React.createRef<HTMLInputElement>()} />
  <NativeDialog open ref={React.createRef<HTMLDialogElement>()} />
  <AccordionIconV ref={React.createRef<SVGPathElement>()} />
  <ActivityFeedTime dateTime="2026-09-11" ref={React.createRef<HTMLTimeElement>()} />
  <ProgressCircleTrack ref={React.createRef<SVGCircleElement>()} />
  <SliderValue ref={React.createRef<HTMLOutputElement>()} />
  <VideoPlayerMedia ref={React.createRef<HTMLVideoElement>()} />
</>;
// @ts-expect-error Native inputs cannot contain children.
const invalidChildren = <NativeInput>Text</NativeInput>;
// @ts-expect-error Native input parts cannot contain children either.
const invalidPartChildren = <InputField>Text</InputField>;
// @ts-expect-error The state axis keeps the explicit design prop's values.
const invalidState = <NativeInput state="other" />;
// @ts-expect-error SVG circle parts require circle refs.
const invalidRef = <ProgressCircleTrack ref={React.createRef<HTMLInputElement>()} />;
`);
  nativeDiagnostics = compile('consumer.tsx');
  nativeBindings = require(join(consumerDir, 'compiled/consumer.js'));
});

after(() => {
  if (consumerDir) rmSync(consumerDir, { recursive: true, force: true });
});

test('React: the entire generated catalog compiles in a strict consumer', () => {
  assert.deepEqual(diagnostics, [], `${diagnostics.length} generated consumer errors:\n${diagnostics.join('\n')}`);
});

test('React: Dialog open renders an open state', () => {
  const html = renderToStaticMarkup(React.createElement(bindings.Dialog, { open: true }, 'Open dialog'));
  assert.match(html, /data-state="open"/);
  assert.equal([...html.matchAll(/data-state=/g)].length, 1);
});

test('React: state axes select a single value and omit inactive unrelated states', () => {
  for (const [name, props, expected] of [
    ['Dialog', {}, 'closed'],
    ['Dialog', { open: false }, 'closed'],
    ['Dialog', { open: true, closed: false }, 'open'],
    ['Dialog', { state: 'open' }, 'open'],
    ['Dialog', { state: 'closed', open: true }, 'closed'],
    ['VideoPlayer', { playing: true }, 'playing'],
    ['VideoPlayer', { paused: true }, 'paused'],
    ['VideoPlayer', {}, undefined],
    ['FileDropzone', { dragover: true }, 'dragover'],
    ['FileDropzone', { failed: true }, 'failed'],
    ['MediaFrame', { loading: true }, 'loading'],
    ['MediaFrame', { loading: false }, undefined],
  ] as const) {
    const html = renderToStaticMarkup(React.createElement(bindings[name], props));
    assert.equal(html.match(/data-state="([^"]*)"/)?.[1], expected, `${name} ${JSON.stringify(props)}: ${html}`);
    assert.equal([...html.matchAll(/data-state=/g)].length, expected === undefined ? 0 : 1);
  }
  const loading = renderToStaticMarkup(React.createElement(bindings.Button, { loading: true }, 'Save'));
  assert.match(loading, /data-loading=""/);
  assert.match(loading, /aria-busy="true"/);
});

test('React: catalog exports preserve roots and expose colliding parts under aliases', () => {
  for (const [name, className] of [
    ['CardHeader', 'acme-card-header'],
    ['CardHeaderPart', 'acme-card__header'],
    ['SidebarNav', 'acme-sidebar-nav'],
    ['SidebarNavPart', 'acme-sidebar__nav'],
    ['ButtonLabel', 'acme-button__label'],
  ]) {
    assert.ok(bindings[name], `missing export ${name}`);
    const html = renderToStaticMarkup(React.createElement(bindings[name]));
    assert.equal(html.match(/class="([^"]*)"/)?.[1], className, name);
  }
  const card = require(join(consumerDir, 'compiled/card.js'));
  assert.match(renderToStaticMarkup(React.createElement(card.CardHeader)), /class="acme-card__header"/);
});

test('React: native prop names, void children and intrinsic refs remain type safe', () => {
  assert.deepEqual(nativeDiagnostics, [], nativeDiagnostics.join('\n'));
});

test('React: native input states retain disabled and value semantics', () => {
  const html = renderToStaticMarkup(React.createElement(nativeBindings.NativeInput, {
    size: 'sm', disabled: true, defaultValue: 'Ada', state: 'error',
  }));
  assert.match(html, / disabled=""/);
  assert.match(html, / data-disabled=""/);
  assert.match(html, / value="Ada"/);
  assert.match(html, / data-size="sm"/);
  assert.match(html, / data-state="error"/);
  assert.equal([...html.matchAll(/data-disabled=/g)].length, 1);
  assert.equal([...html.matchAll(/data-state=/g)].length, 1);
});

test('React: native dialog open follows the resolved state', () => {
  for (const props of [{ open: true }, { state: 'open' }]) {
    const html = renderToStaticMarkup(React.createElement(nativeBindings.NativeDialog, props));
    assert.match(html, / open=""/);
    assert.match(html, / data-state="open"/);
  }
  const closed = renderToStaticMarkup(React.createElement(nativeBindings.NativeDialog, { state: 'closed', open: true }));
  assert.doesNotMatch(closed, / open=""/);
});

function tailwindFiles(index = indexTokens(system.tokens, 'acme')) {
  const files = new Map<string, string>();
  generateTailwind(system, index, (rel, content) => files.set(rel, content));
  const context = { module: { exports: {} as { theme: { spacing: Record<string, string> } } } };
  runInNewContext(files.get('tailwind.preset.cjs')!, context);
  return { files, preset: context.module.exports };
}

test('Tailwind: fractional spacing utilities reference the declared CSS properties', () => {
  const { preset } = tailwindFiles();
  const css = tokensCss(system, indexTokens(system.tokens, 'acme'));
  assert.match(css, /--acme-space-0-5: 2px;/);
  for (const [key, property] of [
    ['0.5', '--acme-space-0-5'],
    ['1.5', '--acme-space-1-5'],
    ['2.5', '--acme-space-2-5'],
    ['3.5', '--acme-space-3-5'],
  ]) assert.equal(preset.theme.spacing[key], `var(${property})`);
});

test('Tailwind: both exporters take every CSS variable name from the supplied token index', () => {
  const index = indexTokens(system.tokens, 'acme');
  for (const ref of ['color.bg-action', 'neutral.500', 'font.lineHeight.snug', 'type.body-md.lineHeight']) {
    index.get(ref)!.cssVar = `--consumer-${ref.replaceAll('.', '-')}`;
  }
  const { files, preset } = tailwindFiles(index);
  const css = tokensCss(system, index);
  const declared = new Set([...css.matchAll(/(--[\w-]+):/g)].map((m) => m[1]));
  for (const [name, content] of [
    ['v3', JSON.stringify(preset)],
    ['v4', files.get('tailwind.theme.css')!],
  ]) {
    const missing = [...content.matchAll(/var\((--[^)]+)\)/g)].map((m) => m[1]).filter((v) => !declared.has(v));
    assert.deepEqual(missing, [], `${name} references undeclared properties`);
  }
});
