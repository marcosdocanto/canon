// Library-mode Studio preview: pure string assembly from LibraryTheme + ComponentInfo +
// RenderExample into a complete, offline-renderable HTML document. No repo file is read except
// the vendored Tailwind runtime asset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { previewHtml, escapeHtml, classesFor } from '../src/generators/preview-lib.ts';
import type { LibraryTheme, ComponentInfo, RenderExample, CvaSpec, PartInfo } from '../src/adapters/types.ts';
import { parseParts } from '../src/adapters/shadcn/parts.ts';

const DIALOG = readFileSync(new URL('./fixtures/shadcn-app/src/ui/dialog.tsx', import.meta.url), 'utf8');
const dialogParts = parseParts(DIALOG);
function dialogPart(name: string): PartInfo {
  const part = dialogParts.find((p) => p.name === name);
  assert.ok(part, `no dialog part named "${name}"`);
  return part!;
}

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

test('previewHtml escapes a theme VALUE that attempts a <style> breakout, while legitimate CSS values stay byte-identical', () => {
  const hostile: LibraryTheme = {
    file: '/fake/project/app/globals.css',
    vars: {
      background: { light: '0 0 0</style><script>alert(6)</script>', dark: 'oklch(0.145 0 0)' },
      primary: { light: 'oklch(0.205 0 0)', dark: 'oklch(0.922 0 0)' },
      radius: { light: '0.625rem' },
      accent: { light: '#7c3aed' },
    },
  };
  const html = previewHtml(hostile, [{ info: buttonInfo, examples: buttonExamples }]);

  // No literal breakout sequence anywhere in the document.
  assert.doesNotMatch(html, /<\/style><script>alert\(6\)<\/script>/);
  assert.doesNotMatch(html, /<\/style>\s*<script>\s*alert\(6\)/);
  // Exactly one <script> element exists in the whole document: the vendored runtime's own.
  assert.equal((html.match(/<script/g) ?? []).length, 1);
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1);
  // The hostile value is present only in its escaped form.
  assert.match(html, /--background:\s*0 0 0&lt;\/style&gt;&lt;script&gt;alert\(6\)&lt;\/script&gt;;/);

  // Legitimate CSS values (oklch, rem, hex) contain none of &<>"' and pass through byte-identical.
  assert.match(html, /--primary:\s*oklch\(0\.205 0 0\);/);
  assert.match(html, /--radius:\s*0\.625rem;/);
  assert.match(html, /--accent:\s*#7c3aed;/);
  const darkBlock = /\.dark\s*\{([^}]*)\}/.exec(html)?.[1] ?? '';
  assert.match(darkBlock, /--primary:\s*oklch\(0\.922 0 0\);/);
  assert.match(darkBlock, /--background:\s*oklch\(0\.145 0 0\);/);
});

test('previewHtml escapes theme var NAMES defensively in :root/.dark and the @theme inline bridge', () => {
  const hostileName = 'primary</style><script>alert(7)</script>';
  const hostile: LibraryTheme = {
    file: '/fake/project/app/globals.css',
    vars: { [hostileName]: { light: 'oklch(0.205 0 0)' } },
  };
  const html = previewHtml(hostile, [{ info: buttonInfo, examples: buttonExamples }]);
  assert.doesNotMatch(html, /<\/style><script>alert\(7\)<\/script>/);
  assert.equal((html.match(/<script/g) ?? []).length, 1); // still only the vendored runtime's
  assert.match(html, /--primary&lt;\/style&gt;&lt;script&gt;alert\(7\)&lt;\/script&gt;:\s*oklch\(0\.205 0 0\);/);
  assert.match(html, /--color-primary&lt;\/style&gt;&lt;script&gt;alert\(7\)&lt;\/script&gt;:\s*var\(--primary&lt;\/style&gt;&lt;script&gt;alert\(7\)&lt;\/script&gt;\);/);
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

test('previewHtml renders a section per component keyed by slug', () => {
  const html = previewHtml(theme, [
    { info: buttonInfo, examples: buttonExamples },
    { info: badgeInfo, examples: badgeExamples },
    { info: inputInfo, examples: inputExamples },
  ]);
  assert.match(html, /<section[^>]*data-slug="button"/);
  assert.match(html, /<section[^>]*data-slug="badge"/);
  assert.match(html, /<section[^>]*data-slug="input"/);
});

test('previewHtml picks a sensible HTML tag per slug for a component that actually has cva (badge -> span, input -> self-closed void element)', () => {
  const cvaBadge: ComponentInfo = { slug: 'badge', file: '/fake/project/src/ui/badge.tsx', exportName: 'Badge', importPath: '~/ui/badge', cva: { base: ['inline-flex'], variants: {}, compoundVariants: [], defaultVariants: {} } };
  const cvaInput: ComponentInfo = { slug: 'input', file: '/fake/project/src/ui/input.tsx', exportName: 'Input', importPath: '~/ui/input', cva: { base: ['border'], variants: {}, compoundVariants: [], defaultVariants: {} } };
  const html = previewHtml(theme, [
    { info: cvaBadge, examples: [{ title: 'Badge', jsx: '<Badge>Badge</Badge>' }] },
    { info: cvaInput, examples: [{ title: 'Input', jsx: '<Input placeholder="Email">…</Input>' }] },
  ]);
  assert.match(html, /<span[^>]*>Badge<\/span>/); // badge -> span
  assert.match(html, /<input[^>]*\/>/); // input -> self-closed void element
});

test('previewHtml renders a compact muted placeholder for a cva-less component with no per-slug render template, instead of the old bare-tag text soup', () => {
  const accordionInfo: ComponentInfo = { slug: 'accordion', file: '/fake/project/src/ui/accordion.tsx', exportName: 'Accordion', importPath: '~/ui/accordion' };
  const accordionExamples: RenderExample[] = [{ title: 'Accordion', jsx: '<Accordion>…</Accordion>' }];
  const html = previewHtml(theme, [{ info: accordionInfo, examples: accordionExamples }]);
  const section = /<section[^>]*data-slug="accordion"[\s\S]*?<\/section>/.exec(html)?.[0];
  assert.ok(section, 'expected an accordion section');
  assert.match(section!, /<h2>Accordion<\/h2>/);
  assert.match(section!, /no static styles found/);
  assert.doesNotMatch(section!, /behavior component/, 'the old "behavior component" phrasing must be gone');
  assert.doesNotMatch(section!, /<figcaption>/, 'no per-example markup for a component with no cva to preview');
  assert.doesNotMatch(section!, /…/, 'the generic ellipsis filler must never leak into the placeholder');
  // The component's name appears exactly once (the heading) — never duplicated into a caption too.
  assert.equal((section!.match(/Accordion/g) ?? []).length, 1);
});

test('previewHtml gives the document real structural CSS: bordered component cards, a muted small-caps heading, and a muted example caption', () => {
  const html = previewHtml(theme, [{ info: buttonInfo, examples: buttonExamples }]);
  assert.match(html, /\.cn-lib-component\s*\{[^}]*border:[^}]*\}/s);
  assert.match(html, /\.cn-lib-component\s*>\s*h2\s*\{[^}]*font-variant:\s*small-caps[^}]*\}/s);
  assert.match(html, /\.cn-lib-example\s*>\s*figcaption\s*\{[^}]*\}/s);
  // The preview canvas stays on the theme's own vars (this preview's whole purpose is showing the
  // user's edited theme), never a Canon-branded background/foreground pair.
  assert.match(html, /body\s*\{[^}]*background:\s*var\(--background/s);
  assert.match(html, /body\s*\{[^}]*color:\s*var\(--foreground/s);
});

test('previewHtml contains fixed/absolute-positioned part and example children inside their own card: a transform establishes a containing block, overflow is clipped, and a min-height gives an inset-0 child a real box', () => {
  const html = previewHtml(theme, [{ info: buttonInfo, examples: buttonExamples }]);
  // `.cn-lib-example` (cva examples) and `.cn-lib-part` (styled parts) each render a component's or
  // part's REAL classes verbatim — including shadcn/Radix overlay classes like `fixed inset-0 z-50
  // bg-black/80` (DialogOverlay/DrawerOverlay). Per the CSS Transforms spec, a `transform` value
  // other than `none` makes the element the containing block for `position: fixed` (and `absolute`)
  // descendants, trapping them instead of letting them escape to cover the whole preview viewport.
  const exampleRule = /\.cn-lib-example\s*\{([^}]*)\}/s.exec(html)?.[1] ?? '';
  const partRule = /\.cn-lib-part\s*\{([^}]*)\}/s.exec(html)?.[1] ?? '';
  for (const rule of [exampleRule, partRule]) {
    assert.match(rule, /position:\s*relative;/);
    assert.match(rule, /overflow:\s*hidden;/);
    assert.match(rule, /transform:\s*translateZ\(0\);/); // establishes the containing block for fixed/absolute children
    assert.match(rule, /min-height:\s*3rem;/); // so an inset-0 child still has a visible box to fill
  }
});

test('previewHtml renders a real fixed/inset-0 overlay part (DialogOverlay) inside the SAME contained card selector as every other part — no separate escape hatch for overlay-ish classes', () => {
  const dialogInfo: ComponentInfo = { slug: 'dialog', file: '/fake/project/src/ui/dialog.tsx', exportName: 'Dialog', importPath: '~/ui/dialog', parts: dialogParts };
  const html = previewHtml(theme, [{ info: dialogInfo, examples: [] }]);
  const overlay = dialogPart('DialogOverlay');
  assert.match(overlay.classes!, /\bfixed\b/);
  assert.match(overlay.classes!, /\binset-0\b/);
  // The overlay renders as a `.cn-lib-part` figure, exactly like every other part — its real,
  // untouched classes (including `fixed inset-0`) are shown, not stripped, while the shared
  // `.cn-lib-part` rule (asserted above) is what keeps it from covering the preview.
  assert.ok(html.includes(`<figure class="cn-lib-part" data-part="DialogOverlay"><figcaption>DialogOverlay</figcaption>`));
  assert.match(html, new RegExp(`data-part="DialogOverlay"[\\s\\S]*?class="${escapeRegExp(overlay.classes!)}"`));
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

// ---- Part rendering (Task 2) --------------------------------------------------------------

test('previewHtml renders a pure-parts component (no cva): styled parts as real elements with their classes and a caption, no placeholder', () => {
  const dialogInfo: ComponentInfo = { slug: 'dialog', file: '/fake/project/src/ui/dialog.tsx', exportName: 'Dialog', importPath: '~/ui/dialog', parts: dialogParts };
  const html = previewHtml(theme, [{ info: dialogInfo, examples: [] }]);
  const section = /<section[^>]*data-slug="dialog"[\s\S]*?<\/section>/.exec(html)?.[0];
  assert.ok(section, 'expected a dialog section');

  const content = dialogPart('DialogContent');
  assert.ok(content.classes);
  assert.ok(section!.includes(`<figcaption>DialogContent</figcaption><div class="${content.classes}">DialogContent</div>`));

  assert.doesNotMatch(section!, /no static styles found/, 'a component with at least one styled part must never show the placeholder');
  assert.doesNotMatch(section!, /behavior component/);
});

test('previewHtml applies the small semantic-tag heuristic: Title -> h3-ish, Description -> p, everything else -> div', () => {
  const dialogInfo: ComponentInfo = { slug: 'dialog', file: '/fake/project/src/ui/dialog.tsx', exportName: 'Dialog', importPath: '~/ui/dialog', parts: dialogParts };
  const html = previewHtml(theme, [{ info: dialogInfo, examples: [] }]);

  const title = dialogPart('DialogTitle');
  assert.match(html, new RegExp(`<h3 class="${escapeRegExp(title.classes!)}">DialogTitle</h3>`));

  const description = dialogPart('DialogDescription');
  assert.match(html, new RegExp(`<p class="${escapeRegExp(description.classes!)}">DialogDescription</p>`));

  const footer = dialogPart('DialogFooter'); // no "title"/"description" in the name -> plain div
  assert.match(html, new RegExp(`<div class="${escapeRegExp(footer.classes!)}">DialogFooter</div>`));
});

test('previewHtml shows a read-only part as its name plus the muted reason, escaped', () => {
  const dialogInfo: ComponentInfo = { slug: 'dialog', file: '/fake/project/src/ui/dialog.tsx', exportName: 'Dialog', importPath: '~/ui/dialog', parts: dialogParts };
  const html = previewHtml(theme, [{ info: dialogInfo, examples: [] }]);
  const trigger = dialogPart('DialogTrigger');
  assert.equal(trigger.classes, undefined);
  assert.equal(trigger.readOnlyReason, 'no static className found');
  assert.match(html, /<p class="cn-lib-part-readonly" data-part="DialogTrigger">DialogTrigger: no static className found<\/p>/);
});

test('previewHtml shows a multi-branch part note, muted, only when present', () => {
  const notedPart: PartInfo = { name: 'Sidebar', classes: 'flex h-full flex-col bg-sidebar', span: { start: 0, end: 0 }, note: '3 render branches; editing branch 1' };
  const plainPart: PartInfo = { name: 'SidebarInset', classes: 'flex-1', span: { start: 0, end: 0 } };
  const info: ComponentInfo = { slug: 'sidebar', file: '/fake/project/src/ui/sidebar.tsx', exportName: 'Sidebar', importPath: '~/ui/sidebar', parts: [notedPart, plainPart] };
  const html = previewHtml(theme, [{ info, examples: [] }]);
  assert.match(html, /<p class="cn-lib-part-note">3 render branches; editing branch 1<\/p>/);
  // The note is scoped to its own part's figure, not duplicated onto a part with none.
  const insetFigure = /<figure[^>]*data-part="SidebarInset"[\s\S]*?<\/figure>/.exec(html)?.[0];
  assert.ok(insetFigure);
  assert.doesNotMatch(insetFigure!, /cn-lib-part-note/);
});

test('previewHtml keeps a cva component\'s real examples AND lists its dynamic-only part as read-only (Button)', () => {
  const button = readFileSync(new URL('./fixtures/shadcn-app/src/ui/button.tsx', import.meta.url), 'utf8');
  const buttonParts = parseParts(button);
  const infoWithParts: ComponentInfo = { ...buttonInfo, parts: buttonParts };
  const html = previewHtml(theme, [{ info: infoWithParts, examples: buttonExamples }]);
  const section = /<section[^>]*data-slug="button"[\s\S]*?<\/section>/.exec(html)?.[0];
  assert.ok(section);
  assert.match(section!, /<figcaption>variant: destructive<\/figcaption>/); // cva examples still render
  assert.match(section!, /<p class="cn-lib-part-readonly" data-part="Button">Button: dynamic classes only<\/p>/);
});

test('previewHtml falls back to the placeholder (not a wall of read-only lines) when a component has parts but NONE have classes and no cva', () => {
  const allReadOnly: PartInfo[] = [
    { name: 'Foo', readOnlyReason: 'no static className found' },
    { name: 'Bar', readOnlyReason: 'dynamic classes only' },
  ];
  const info: ComponentInfo = { slug: 'foo', file: '/fake/project/src/ui/foo.tsx', exportName: 'Foo', importPath: '~/ui/foo', parts: allReadOnly };
  const html = previewHtml(theme, [{ info, examples: [] }]);
  const section = /<section[^>]*data-slug="foo"[\s\S]*?<\/section>/.exec(html)?.[0];
  assert.ok(section);
  assert.match(section!, /no static styles found/);
  assert.doesNotMatch(section!, /Foo:|Bar:/, 'the quiet placeholder wins over a noisy per-part listing when nothing is stylable');
});

test('previewHtml escapes a hostile part name, reason, and classes string (XSS)', () => {
  const hostileStyled: PartInfo = { name: '<script>a</script>', classes: 'safe" onmouseover="alert(1)', span: { start: 0, end: 0 } };
  const hostileReadOnly: PartInfo = { name: '<script>b</script>', readOnlyReason: '<script>c</script>' };
  const info: ComponentInfo = { slug: 'hostile', file: '/fake/x', exportName: 'Hostile', importPath: '~/x', parts: [hostileStyled, hostileReadOnly] };
  const html = previewHtml(theme, [{ info, examples: [] }]);

  assert.doesNotMatch(html, /<script>a<\/script>/);
  assert.doesNotMatch(html, /<script>b<\/script>/);
  assert.doesNotMatch(html, /<script>c<\/script>/);
  assert.doesNotMatch(html, /safe" onmouseover="alert\(1\)/);
  assert.equal((html.match(/<script/g) ?? []).length, 1); // only the vendored runtime's own

  assert.match(html, /&lt;script&gt;a&lt;\/script&gt;/);
  assert.match(html, /&lt;script&gt;b&lt;\/script&gt;/);
  assert.match(html, /&lt;script&gt;c&lt;\/script&gt;/);
  assert.match(html, /safe&quot; onmouseover=&quot;alert\(1\)/);
});

/** Escape a string for embedding inside a `new RegExp(...)` literal test pattern. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
