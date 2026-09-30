// Library-mode Studio preview: pure string assembly from LibraryTheme + ComponentInfo +
// RenderExample into a complete, offline-renderable HTML document. No repo file is read except
// the vendored Tailwind runtime asset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { previewHtml, escapeHtml, classesFor } from '../src/generators/preview-lib.ts';
import type { LibraryTheme, ComponentInfo, RenderExample, CvaSpec } from '../src/adapters/types.ts';

const theme: LibraryTheme = {
  file: '/fake/project/app/globals.css',
  vars: {
    background: { light: 'oklch(1 0 0)', dark: 'oklch(0.145 0 0)' },
    primary: { light: 'oklch(0.205 0 0)', dark: 'oklch(0.922 0 0)' },
    radius: { light: '0.625rem' }, // no dark value: light-only var
  },
};

const buttonCva: CvaSpec = {
  base: ['inline-flex', 'items-center'],
  variants: {
    variant: {
      default: ['bg-primary', 'text-primary-foreground'],
      destructive: ['bg-destructive', 'text-destructive-foreground'],
    },
    size: {
      default: ['h-9', 'px-4'],
      sm: ['h-8', 'px-3'],
    },
  },
  compoundVariants: [
    { match: { variant: 'destructive', size: 'sm' }, classes: ['ring-1', 'ring-destructive'] },
  ],
  defaultVariants: { variant: 'default', size: 'default' },
};

const buttonInfo: ComponentInfo = { slug: 'button', file: '/fake/project/src/ui/button.tsx', exportName: 'Button', importPath: '~/ui/button', cva: buttonCva };
const buttonExamples: RenderExample[] = [
  { title: 'variant: destructive', jsx: '<Button variant="destructive">Delete</Button>' },
  { title: 'Button', jsx: '<Button>Delete</Button>' },
];

const badgeInfo: ComponentInfo = {
  slug: 'badge',
  file: '/fake/project/src/ui/badge.tsx',
  exportName: 'Badge',
  importPath: '~/ui/badge',
  readOnlyReason: 'template interpolation <script>alert(1)</script>',
};
const badgeExamples: RenderExample[] = [{ title: 'Badge', jsx: '<Badge>Badge</Badge>' }];

const inputInfo: ComponentInfo = { slug: 'input', file: '/fake/project/src/ui/input.tsx', exportName: 'Input', importPath: '~/ui/input' };
const inputExamples: RenderExample[] = [{ title: 'Input', jsx: '<Input placeholder="Email">…</Input>' }];

test('previewHtml inlines theme var values verbatim into :root and .dark', () => {
  const html = previewHtml(theme, [{ info: buttonInfo, examples: buttonExamples }]);
  assert.match(html, /--background:\s*oklch\(1 0 0\);/);
  assert.match(html, /--primary:\s*oklch\(0\.205 0 0\);/);
  assert.match(html, /--radius:\s*0\.625rem;/);
  const darkBlock = /\.dark\s*\{([^}]*)\}/.exec(html)?.[1] ?? '';
  assert.match(darkBlock, /--background:\s*oklch\(0\.145 0 0\);/);
  assert.match(darkBlock, /--primary:\s*oklch\(0\.922 0 0\);/);
  assert.doesNotMatch(darkBlock, /--radius:/); // light-only var never appears in .dark
});

test('previewHtml bridges theme vars into an @theme inline block for Tailwind v4', () => {
  const html = previewHtml(theme, [{ info: buttonInfo, examples: buttonExamples }]);
  assert.match(html, /<style type="text\/tailwindcss">/);
  assert.match(html, /@theme inline\s*\{[^}]*--color-background:\s*var\(--background\);[^}]*\}/s);
  assert.match(html, /--color-primary:\s*var\(--primary\);/);
});

test('previewHtml converts JSX-ish examples into real HTML with computed classes, never className', () => {
  const html = previewHtml(theme, [{ info: buttonInfo, examples: buttonExamples }]);
  assert.doesNotMatch(html, /className/);
  assert.match(html, /<button[^>]*class="[^"]*bg-destructive[^"]*text-destructive-foreground[^"]*"/);
  // the destructive + default-size example does NOT get the sm-only compound
  assert.doesNotMatch(html, /ring-destructive/);
  // second example (no variant attr) falls back to defaultVariants: default/default
  assert.match(html, /<button[^>]*class="[^"]*bg-primary[^"]*h-9[^"]*"/);
});

test('previewHtml renders a section per component keyed by slug, picking a sensible tag', () => {
  const html = previewHtml(theme, [
    { info: buttonInfo, examples: buttonExamples },
    { info: badgeInfo, examples: badgeExamples },
    { info: inputInfo, examples: inputExamples },
  ]);
  assert.match(html, /<section[^>]*data-slug="button"/);
  assert.match(html, /<section[^>]*data-slug="badge"/);
  assert.match(html, /<section[^>]*data-slug="input"/);
  assert.match(html, /<span[^>]*>Badge<\/span>/); // badge -> span
  assert.match(html, /<input[^>]*\/>/); // input -> self-closed void element
});

test('previewHtml notes a read-only component with its escaped reason', () => {
  const html = previewHtml(theme, [{ info: badgeInfo, examples: badgeExamples }]);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /template interpolation/);
});

test('previewHtml inlines the vendored tailwind runtime with a version marker comment', () => {
  const html = previewHtml(theme, [{ info: buttonInfo, examples: buttonExamples }]);
  assert.match(html, /<!--\s*canon:tailwind-runtime @tailwindcss\/browser@4\.3\.3\s*-->/);
  assert.match(html, /<script>[\s\S]*text\/tailwindcss[\s\S]*<\/script>/); // the runtime body is inlined
});

test('previewHtml escapes interpolated titles and slugs', () => {
  const hostile: ComponentInfo = { slug: 'x"><script>x</script>', file: '/f', exportName: 'X<script>', importPath: '~/x' };
  const html = previewHtml(theme, [{ info: hostile, examples: [{ title: '<script>y</script>', jsx: '<X>hi</X>' }] }]);
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.doesNotMatch(html, /<script>y<\/script>/);
});

test('escapeHtml escapes the five special characters', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('classesFor resolves base + picked variant classes + matching compound classes', () => {
  const classes = classesFor(buttonCva, { variant: 'destructive', size: 'sm' });
  assert.ok(classes.includes('inline-flex'));
  assert.ok(classes.includes('bg-destructive'));
  assert.ok(classes.includes('h-8'));
  assert.ok(classes.includes('ring-1'));
});

test('classesFor falls back to defaultVariants for axes not picked, and skips non-matching compounds', () => {
  const classes = classesFor(buttonCva, { variant: 'destructive' });
  assert.ok(classes.includes('h-9')); // default size
  assert.ok(!classes.includes('ring-1')); // compound needs size: sm too
});

test('classesFor with no picks uses only defaultVariants', () => {
  const classes = classesFor(buttonCva, {});
  assert.ok(classes.includes('bg-primary'));
  assert.ok(classes.includes('h-9'));
});

test('the vendored tailwind runtime asset carries a pinned-version header and MIT notice reference', () => {
  const asset = readFileSync(new URL('../assets/tailwind-play.js', import.meta.url), 'utf8');
  assert.match(asset.slice(0, 800), /@tailwindcss\/browser/);
  assert.match(asset.slice(0, 800), /4\.3\.3/);
  assert.match(asset.slice(0, 800), /MIT/);
  assert.match(asset, /text\/tailwindcss/); // the actual runtime body, not just the header
});

test('THIRD_PARTY_NOTICES.md documents the vendored Tailwind runtime license', () => {
  const notices = readFileSync(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8');
  assert.match(notices, /@tailwindcss\/browser/);
  assert.match(notices, /Tailwind Labs/);
  assert.match(notices, /MIT License/);
});

test('preview-lib module reads no repo file except the vendored runtime asset (pure string assembly otherwise)', () => {
  const source = readFileSync(new URL('../src/generators/preview-lib.ts', import.meta.url), 'utf8');
  const readCalls = [...source.matchAll(/readFileSync\(([^)]*)\)/g)].map((m) => m[1]);
  assert.ok(readCalls.length > 0, 'expected the vendored runtime asset to be read once');
  for (const call of readCalls) assert.match(call, /tailwind-play\.js/, `unexpected repo read: readFileSync(${call})`);
  assert.doesNotMatch(source, /\bimport\(/, 'must not dynamically import repo files');
  assert.doesNotMatch(source, /\breadFile\(/, 'must not async-read repo files either');
});
