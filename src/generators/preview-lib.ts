// Library-mode Studio preview: builds the iframe document that previews an adapted repo's real
// components — real Tailwind classes, resolved against the real theme — without booting the
// repo's own bundler and without executing any of its code.
//
// Pure string assembly: every input arrives as a parameter (`LibraryTheme`, `ComponentInfo` +
// `RenderExample[]`). The ONLY file this module reads is Canon's own vendored asset
// (`assets/tailwind-play.js`, the @tailwindcss/browser runtime) — never a repo file.
import { readFileSync } from 'node:fs';
import type { ComponentInfo, CvaSpec, LibraryTheme, RenderExample } from '../adapters/types.ts';

/** Pinned version of the vendored @tailwindcss/browser runtime in assets/tailwind-play.js. Keep in sync when bumping the asset. */
export const TAILWIND_RUNTIME_VERSION = '4.3.3';

const TAILWIND_RUNTIME = readFileSync(new URL('../../assets/tailwind-play.js', import.meta.url), 'utf8');

/** HTML-escape the five characters that matter for text nodes and quoted attribute values. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The classes a component would render for a given pick of variant values: `base` +, for every
 * variant axis, the classes of the picked value (falling back to `defaultVariants` when an axis
 * isn't in `picks`) +, for every `compoundVariants` entry whose `match` agrees with the resolved
 * picks on every key, its classes too. Deterministic and adapter-agnostic — mirrors what cva()
 * itself computes at runtime, without executing any component code.
 */
export function classesFor(cva: CvaSpec, picks: Record<string, string | boolean>): string {
  const resolved: Record<string, string | boolean> = { ...cva.defaultVariants, ...picks };
  const classes: string[] = [...cva.base];

  for (const [axis, options] of Object.entries(cva.variants)) {
    const picked = resolved[axis];
    if (picked === undefined) continue;
    const value = options[String(picked)];
    if (value) classes.push(...value);
  }

  for (const { match, classes: matchClasses } of cva.compoundVariants) {
    const applies = Object.entries(match).every(([key, value]) => {
      const picked = resolved[key];
      return picked !== undefined && String(picked) === String(value);
    });
    if (applies) classes.push(...matchClasses);
  }

  return classes.join(' ');
}

/** The HTML tag a preview should render a component's root as, chosen pragmatically per slug. */
function htmlTagFor(slug: string): string {
  if (slug === 'button') return 'button';
  if (slug === 'badge') return 'span';
  if (slug === 'input') return 'input';
  return 'div';
}

const VOID_TAGS = new Set(['input', 'img', 'br', 'hr']);

interface ParsedJsx { tag: string; attrs: Record<string, string>; text: string; }

/**
 * Parse a `RenderExample.jsx` string — always the simple shape renderSpec adapters emit,
 * `<Tag attr="value" …>children</Tag>` or a self-closing `<Tag attr="value" … />` — into its tag
 * name, string-valued attributes, and text content. Not a general JSX parser: adapters only ever
 * hand this module flat, single-element examples (see each adapter's own render.ts).
 */
function parseJsxExample(jsx: string): ParsedJsx {
  const trimmed = jsx.trim();
  const openTag = /^<([A-Za-z][\w.-]*)((?:\s+[^\s"'=<>/]+(?:=(?:"[^"]*"|'[^']*'))?)*)\s*(\/)?>/.exec(trimmed);
  if (!openTag) return { tag: 'div', attrs: {}, text: trimmed.replace(/[{}]/g, '').trim() };

  const [whole, tag, attrsSource, selfClosingMark] = openTag;
  const attrs: Record<string, string> = {};
  const attrRe = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(attrsSource))) attrs[match[1]] = match[2] ?? match[3] ?? '';

  let text = '';
  if (!selfClosingMark) {
    const rest = trimmed.slice(whole.length);
    const closeTag = `</${tag}>`;
    const closeIdx = rest.lastIndexOf(closeTag);
    text = closeIdx === -1 ? rest : rest.slice(0, closeIdx);
  }
  return { tag, attrs, text: text.replace(/[{}]/g, '').trim() };
}

/** Render one `RenderExample` as a faithful, self-contained HTML fragment for a component. */
function exampleMarkup(info: ComponentInfo, example: RenderExample): string {
  const parsed = parseJsxExample(example.jsx);
  const axisNames = info.cva ? new Set(Object.keys(info.cva.variants)) : new Set<string>();
  const picks: Record<string, string | boolean> = {};
  const extraAttrs: Record<string, string> = {};

  for (const [key, value] of Object.entries(parsed.attrs)) {
    if (key === 'className') continue; // folded into `classes` below, not re-emitted as an HTML attribute
    if (axisNames.has(key)) picks[key] = value;
    else extraAttrs[key] = value;
  }

  const classes = info.cva ? classesFor(info.cva, picks) : (parsed.attrs.className ?? '');
  const tag = htmlTagFor(info.slug);
  const classAttr = classes ? ` class="${escapeHtml(classes)}"` : '';
  const otherAttrs = Object.entries(extraAttrs).map(([key, value]) => ` ${escapeHtml(key)}="${escapeHtml(value)}"`).join('');
  const openTag = `<${tag}${classAttr}${otherAttrs}`;
  const body = VOID_TAGS.has(tag) ? ' />' : `>${escapeHtml(parsed.text)}</${tag}>`;

  return `<figure class="cn-lib-example" data-title="${escapeHtml(example.title)}"><figcaption>${escapeHtml(example.title)}</figcaption>${openTag}${body}</figure>`;
}

/** One `<section data-slug>` per component: its examples, and — when read-only — a note why. */
function componentSection(entry: { info: ComponentInfo; examples: RenderExample[] }): string {
  const { info, examples } = entry;
  const readOnlyNote = info.readOnlyReason
    ? `<p class="cn-lib-readonly" data-readonly-reason="${escapeHtml(info.readOnlyReason)}">Read-only: ${escapeHtml(info.readOnlyReason)}</p>`
    : '';
  const examplesHtml = examples.map((example) => exampleMarkup(info, example)).join('\n');
  return `<section data-slug="${escapeHtml(info.slug)}" class="cn-lib-component">
  <h2>${escapeHtml(info.exportName)}</h2>
  ${readOnlyNote}
  <div class="cn-lib-examples">${examplesHtml}</div>
</section>`;
}

/** `--name: value;` lines for every theme var that has a value for `key` (`light` or `dark`). */
function varLines(theme: LibraryTheme, key: 'light' | 'dark'): string {
  return Object.entries(theme.vars)
    .filter(([, value]) => value[key] !== undefined)
    .map(([name, value]) => `  --${name}: ${value[key]};`)
    .join('\n');
}

/**
 * Build the complete library-mode preview HTML document: a raw `:root`/`.dark` block with the
 * theme's own CSS variables, a Tailwind v4 `@theme inline` bridge so utilities like `bg-primary`
 * resolve against those variables, the vendored @tailwindcss/browser runtime inlined so the whole
 * document compiles offline, and one `<section data-slug>` per component rendering its examples
 * with their real computed classes.
 */
export function previewHtml(theme: LibraryTheme, components: { info: ComponentInfo; examples: RenderExample[] }[]): string {
  const rootVars = varLines(theme, 'light');
  const darkVars = varLines(theme, 'dark');
  const themeBridge = Object.keys(theme.vars).map((name) => `  --color-${name}: var(--${name});`).join('\n');
  const sections = components.map(componentSection).join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Canon library preview</title>
<style type="text/tailwindcss">
@theme inline {
${themeBridge}
}
</style>
<style>
:root {
${rootVars}
}
${darkVars ? `.dark {\n${darkVars}\n}` : ''}
</style>
<!-- canon:tailwind-runtime @tailwindcss/browser@${TAILWIND_RUNTIME_VERSION} -->
<script>
${TAILWIND_RUNTIME}
</script>
</head>
<body>
${sections}
</body>
</html>
`;
}
