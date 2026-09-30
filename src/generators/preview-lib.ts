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

/**
 * The body for a component with no `cva()` to preview: a single muted line, never the old bare
 * `<Tag>…</Tag>` fallback. That fallback rendered with zero classes (nothing but `className`, which
 * a generic example never sets) and, for a component with no per-slug render template, literally
 * duplicated the component's own name (its example's title defaults to `exportName`) right under an
 * `<h2>` already showing that same name, above a lone "…" placeholder — e.g. a whole "Accordion"
 * section reading "Accordion" / "Accordion" / "…". None of that is a real preview of styling
 * (there isn't any to show), so it's replaced with one line: the parse failure reason when `cva()`
 * exists but couldn't be read, or a fixed explanatory note when the component simply has none.
 */
function noVariantsBody(info: ComponentInfo): string {
  if (info.readOnlyReason) {
    return `<p class="cn-lib-readonly" data-readonly-reason="${escapeHtml(info.readOnlyReason)}">Read-only: ${escapeHtml(info.readOnlyReason)}</p>`;
  }
  return `<p class="cn-lib-placeholder">no styled variants — behavior component</p>`;
}

/**
 * One `<section data-slug>` per component: its real per-variant examples when `cva()` gives it
 * something to show (Alert/Badge/Button-style components), or the single muted placeholder line
 * from `noVariantsBody` otherwise — a component with no `cva()` has no styled variants to preview
 * either way, whether that's because it never had one or because its `cva()` didn't parse.
 */
function componentSection(entry: { info: ComponentInfo; examples: RenderExample[] }): string {
  const { info, examples } = entry;
  const body = info.cva
    ? `<div class="cn-lib-examples">${examples.map((example) => exampleMarkup(info, example)).join('\n')}</div>`
    : noVariantsBody(info);
  return `<section data-slug="${escapeHtml(info.slug)}" class="cn-lib-component">
  <h2>${escapeHtml(info.exportName)}</h2>
  ${body}
</section>`;
}

/**
 * `--name: value;` lines for every theme var that has a value for `key` (`light` or `dark`).
 * Both name and value are HTML-escaped: this text lands inside a `<style>` element, and a
 * hostile or merely malformed theme value (e.g. one containing `</style><script>`) must never be
 * able to break out of it. Legitimate CSS values (oklch(...), hex, rem, hsl triplets) contain
 * none of `&<>"'` and so round-trip byte-identical.
 */
function varLines(theme: LibraryTheme, key: 'light' | 'dark'): string {
  return Object.entries(theme.vars)
    .filter(([, value]) => value[key] !== undefined)
    .map(([name, value]) => `  --${escapeHtml(name)}: ${escapeHtml(value[key]!)};`)
    .join('\n');
}

// Structural chrome — card borders, section headings, captions — for the preview document. Never
// themed: it derives entirely from `currentColor` (via `color-mix`, so it works with a `background`/
// `foreground` pair of ANY lightness — the whole point of this preview is showing the user's own
// edited theme, not a Canon-branded look) rather than assuming any particular theme var beyond the
// `background`/`foreground` pair the body itself is set from (falling back to a plain light theme
// when even those are absent, e.g. in a test fixture that doesn't define them).
const CHROME_BORDER = 'color-mix(in srgb, currentColor 14%, transparent)';
const CHROME_MUTED = 'color-mix(in srgb, currentColor 55%, transparent)';

const STRUCTURAL_CSS = `html, body { margin: 0; }
body {
  min-height: 100%;
  background: var(--background, #fff);
  color: var(--foreground, #111);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  padding: 24px;
  display: grid;
  gap: 20px;
  max-width: 1040px;
  margin: 0 auto;
}
.cn-lib-component {
  display: grid;
  gap: 12px;
  padding: 20px;
  max-width: 100%;
  border: 1px solid ${CHROME_BORDER};
  border-radius: 12px;
}
.cn-lib-component > h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  font-variant: small-caps;
  letter-spacing: .02em;
  color: ${CHROME_MUTED};
}
.cn-lib-readonly, .cn-lib-placeholder { margin: 0; font-size: 12px; color: ${CHROME_MUTED}; }
.cn-lib-examples {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  align-items: start;
  gap: 14px;
  max-width: 100%;
}
.cn-lib-example {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}
.cn-lib-example > figcaption { font-size: 11px; color: ${CHROME_MUTED}; }`;

/**
 * Build the complete library-mode preview HTML document: a raw `:root`/`.dark` block with the
 * theme's own CSS variables, a Tailwind v4 `@theme inline` bridge so utilities like `bg-primary`
 * resolve against those variables, the vendored @tailwindcss/browser runtime inlined so the whole
 * document compiles offline, and one `<section data-slug>` per component rendering its examples
 * with their real computed classes. Structural chrome (card borders, section headings, captions —
 * `STRUCTURAL_CSS`) gives every section real layout regardless of what the target repo's own classes
 * do; the canvas itself (`body`'s `background`/`color`) stays on the theme's own vars, since showing
 * the user's actual edited theme — not a Canon-styled wrapper around it — is this preview's whole
 * purpose.
 */
export function previewHtml(theme: LibraryTheme, components: { info: ComponentInfo; examples: RenderExample[] }[]): string {
  const rootVars = varLines(theme, 'light');
  const darkVars = varLines(theme, 'dark');
  // Var names are also escaped defensively: upstream (readTheme) constrains them to
  // [A-Za-z0-9-]+, but this module must not rely on a caller it doesn't control for CSS-context
  // safety — the same `<style>`-breakout hole applies to names as to values.
  const themeBridge = Object.keys(theme.vars).map((name) => `  --color-${escapeHtml(name)}: var(--${escapeHtml(name)});`).join('\n');
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
<style>
${STRUCTURAL_CSS}
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
