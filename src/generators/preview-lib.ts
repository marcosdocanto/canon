// Library-mode Studio preview: builds the iframe document that previews an adapted repo's real
// components — real Tailwind classes, resolved against the real theme — without booting the
// repo's own bundler and without executing any of its code.
//
// Pure string assembly: every input arrives as a parameter (`LibraryTheme`, `ComponentInfo` +
// `RenderExample[]`). The ONLY file this module reads is Canon's own vendored asset
// (`assets/tailwind-play.js`, the @tailwindcss/browser runtime) — never a repo file.
import { readFileSync } from 'node:fs';
import type { ComponentInfo, CvaSpec, LibraryTheme, PartInfo, RenderExample } from '../adapters/types.ts';

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
 * A small, name-only heuristic for the semantic HTML tag a styled part's preview element should
 * use — never inspects the part's classes or any other data, just its own name (case-insensitive
 * substring match): "…Title…" reads as a heading-ish element, "…Description…" as a paragraph,
 * everything else falls back to a plain `div`. Deliberately tiny and data-free (no per-slug table)
 * — this is a cosmetic nicety for the preview, not a claim about the part's real DOM role.
 */
function partTagFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('title')) return 'h3';
  if (lower.includes('description')) return 'p';
  return 'div';
}

/**
 * One `<figure>` for a part WITH classes: its own semantic tag (`partTagFor`), the part's real
 * classes applied, its name as both the caption and the element's own text (so there's something
 * visible to look at even for an empty-ish class string), and — when `parseParts` found more than
 * one render branch yielding a literal (see `PartInfo.note` in shadcn/parts.ts) — a muted note
 * underneath naming that honestly, rather than silently hiding it.
 */
function styledPartMarkup(part: PartInfo): string {
  const tag = partTagFor(part.name);
  const noteHtml = part.note ? `<p class="cn-lib-part-note">${escapeHtml(part.note)}</p>` : '';
  return `<figure class="cn-lib-part" data-part="${escapeHtml(part.name)}"><figcaption>${escapeHtml(part.name)}</figcaption><${tag} class="${escapeHtml(part.classes!)}">${escapeHtml(part.name)}</${tag}>${noteHtml}</figure>`;
}

/**
 * One muted summary line for ALL of a component's read-only parts at once ("3 behavior parts
 * without static styles") instead of one noisy "<Name>: <reason>" line per part — a component like
 * AlertDialog can have five-plus parts that are nothing but a Radix primitive alias, and a designer
 * scanning the gallery cares that those exist, not each one's individual non-reason. Every part's
 * name (never its reason — the reasons are near-identical boilerplate, e.g. "dynamic classes only")
 * still reaches the user, escaped, via the `title` tooltip, comma-separated in original order.
 */
function readOnlyPartsSummaryMarkup(parts: PartInfo[]): string {
  if (!parts.length) return '';
  const names = parts.map((part) => part.name).join(', ');
  const label = `${parts.length} behavior part${parts.length === 1 ? '' : 's'} without static styles`;
  return `<p class="cn-lib-part-readonly-summary" title="${escapeHtml(names)}">${escapeHtml(label)}</p>`;
}

/**
 * Semantic shadcn token names many components reference (`bg-card`, `bg-muted`, `bg-popover`, …)
 * that a project's theme file may never define — especially a trimmed or partially-customized
 * theme that only sets `background`/`foreground`/`primary`. Tailwind only generates a utility when
 * its backing `--color-*` variable exists in the `@theme` block (see `themeBridge` below), so an
 * undefined one silently vanishes — not an error, just a missing/transparent style. That's exactly
 * what made a real Card preview before this: a ring-only outline with no fill, because `bg-card`
 * and `bg-muted/50` had nothing to resolve against. For each of these, when the project's OWN theme
 * doesn't define the var, bridge it to a plausible fallback expression derived from
 * `background`/`foreground` (which every theme this preview renders is expected to have), so every
 * component still looks like a real, finished surface on a partial theme — never silently blank.
 * Inert whenever the project's theme already defines the var itself (the normal case for a full
 * shadcn globals.css): `name in theme.vars` wins and this fallback is never emitted for it.
 */
const SEMANTIC_FALLBACKS: Record<string, string> = {
  card: 'var(--background)',
  'card-foreground': 'var(--foreground)',
  popover: 'var(--background)',
  'popover-foreground': 'var(--foreground)',
  muted: 'color-mix(in oklab, var(--foreground) 6%, var(--background))',
  'muted-foreground': 'color-mix(in oklab, var(--foreground) 55%, var(--background))',
  accent: 'color-mix(in oklab, var(--foreground) 6%, var(--background))',
  'accent-foreground': 'var(--foreground)',
  secondary: 'color-mix(in oklab, var(--foreground) 6%, var(--background))',
  'secondary-foreground': 'var(--foreground)',
  border: 'color-mix(in oklab, var(--foreground) 15%, var(--background))',
  input: 'color-mix(in oklab, var(--foreground) 15%, var(--background))',
  ring: 'color-mix(in oklab, var(--foreground) 35%, var(--background))',
  destructive: '#e7000b',
  'destructive-foreground': '#ffffff',
};

/**
 * Compound-component composition: when a component's parts follow the Root/Header/Title/
 * Description/Content/Footer naming convention (Card, AlertDialog, Dialog…), render ONE assembled
 * example — the real nested structure with each part's real classes and plausible text — instead
 * of a loose grid of fragments. A designer looking at "Card" must see a card.
 */
const COMPOSE_ROLES = ['Header', 'Title', 'Description', 'Action', 'Content', 'Footer'] as const;
const ROLE_TEXT: Record<string, string> = {
  Title: '', // filled per component: "<Name> title"
  Description: 'Supporting description text for this component.',
  Content: 'Body content goes here — the real classes of every part are applied.',
  Footer: 'Footer', Action: 'Action',
};

/**
 * shadcn's own convention for a part's `data-slot` attribute is the kebab-case of its export name
 * ("CardFooter" -> "card-footer", "AlertDialogContent" -> "alert-dialog-content") — verified against
 * every part in this project's own shadcn adapter fixtures. A real rendered component carries that
 * attribute, and quite a few of its OWN classes key off it (`has-data-[slot=card-footer]:pb-0`,
 * `has-data-[slot=card-action]:grid-cols-[1fr_auto]`): without it, those selectors silently never
 * match in a synthetic composition, leaving stray padding or a collapsed grid column that isn't
 * there in the real component. Reproducing the real attribute (not just the classes) is what makes
 * a composed example actually read as "a real card" instead of an approximation of one.
 */
function slotNameOf(exportName: string): string {
  return exportName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function composedMarkup(componentName: string, parts: PartInfo[]): string | undefined {
  const byRole = new Map<string, PartInfo>();
  let root: PartInfo | undefined;
  for (const part of parts) {
    if (part.classes === undefined) continue;
    if (part.name === componentName) { root = part; continue; }
    const role = COMPOSE_ROLES.find((r) => part.name === componentName + r);
    if (role && !byRole.has(role)) byRole.set(role, part);
  }
  // Overlay-style components (Dialog, Drawer, AlertDialog…) have no styled root — their panel IS
  // the Content part. Promote it to root so they still compose into one readable example.
  if (!root && byRole.has('Content')) {
    root = byRole.get('Content');
    byRole.delete('Content');
  }
  // A composition is only clearer than tiles when there's a styled root AND ≥2 styled roles.
  if (!root || byRole.size < 2) return undefined;
  // Only the parts ACTUALLY absorbed leave the tile/read-only list — never assume the component's
  // own name was one of them (a read-only root alias must keep its place in the summary line).
  const consumedNames = [root.name, ...[...byRole.values()].map((p) => p.name)];

  const div = (part: PartInfo, text: string, children = '') =>
    `<div data-slot="${escapeHtml(slotNameOf(part.name))}" class="${escapeHtml(part.classes!)}">${children || escapeHtml(text)}</div>`;

  const header = byRole.get('Header');
  const headerChildren = [byRole.get('Title'), byRole.get('Description'), byRole.get('Action')]
    .filter((p): p is PartInfo => Boolean(p))
    .map((p) => {
      const role = p.name.replace(componentName, '');
      const text = role === 'Title' ? `${componentName} title` : (ROLE_TEXT[role] || p.name);
      return div(p, text);
    })
    .join('');
  const pieces = [
    header ? div(header, '', headerChildren || escapeHtml('Header')) : '',
    byRole.has('Content') ? div(byRole.get('Content')!, ROLE_TEXT.Content) : '',
    byRole.has('Footer') ? div(byRole.get('Footer')!, ROLE_TEXT.Footer) : '',
  ].join('');
  return `<figure class="cn-lib-composed" data-composed="${escapeHtml(consumedNames.join(' '))}"><figcaption>${escapeHtml(componentName)} — assembled</figcaption>${div(root, '', pieces)}</figure>`;
}

/**
 * One block holding every part of a component: a single assembled example when the parts compose
 * (Card-like naming), then any remaining styled parts, then one muted summary line for every
 * read-only part. When there's a composed figure AND leftover styled tiles, those tiles move into
 * a collapsed `<details>` ("All parts") below the composition — the assembled example is the thing
 * a designer looking at "Card" should see first, not a tile grid competing with it for attention.
 * Without a composed figure (most components), the tiles stay a normal, always-visible grid, same
 * as before.
 */
function partsBlock(componentName: string, parts: PartInfo[]): string {
  const composed = composedMarkup(componentName, parts);
  const composedNames = new Set(
    composed ? /data-composed="([^"]*)"/.exec(composed)![1].split(' ') : [],
  );
  const remaining = parts.filter((part) => !composedNames.has(part.name));
  const styled = remaining.filter((part) => part.classes !== undefined);
  const readOnly = remaining.filter((part) => part.classes === undefined);

  const tiles = styled.map(styledPartMarkup).join('\n');
  const tilesGrid = tiles ? `<div class="cn-lib-parts">${tiles}</div>` : '';
  const tilesHtml = composed && tiles
    ? `<details class="cn-lib-all-parts"><summary>All parts</summary>${tilesGrid}</details>`
    : tilesGrid;
  const summary = readOnlyPartsSummaryMarkup(readOnly);
  return `${composed ?? ''}${tilesHtml}${summary}`;
}

/** The muted, escaped "Read-only: <reason>" line for a component whose own `cva()` exists but couldn't be read (see `ComponentInfo.readOnlyReason`). */
function readOnlyReasonBody(info: ComponentInfo): string {
  return `<p class="cn-lib-readonly" data-readonly-reason="${escapeHtml(info.readOnlyReason!)}">Read-only: ${escapeHtml(info.readOnlyReason!)}</p>`;
}

/**
 * The body for a component with truly nothing stylable to show: no `cva()`, no `cva()` parse
 * failure to explain, and not one of its parts has an editable literal either. Never the old bare
 * `<Tag>…</Tag>` fallback — that fallback rendered with zero classes (nothing but `className`,
 * which a generic example never sets) and, for a component with no per-slug render template,
 * literally duplicated the component's own name (its example's title defaults to `exportName`)
 * right under an `<h2>` already showing that same name, above a lone "…" placeholder. It's also
 * never the old "behavior component" wording, which presumed a JS/behavior-only component when
 * really this just means the scanner found no static literal anywhere.
 */
function placeholderBody(): string {
  return `<p class="cn-lib-placeholder">no static styles found</p>`;
}

/**
 * A component's card body, combining its `cva()` examples (if any) with its parts (if any):
 * - `cva()` present: the real per-variant examples, plus a parts block if the file has parts too
 *   (e.g. a helper subcomponent alongside the cva'd one).
 * - no `cva()`, but at least one part has an editable literal: just the parts block — every part
 *   is shown, styled ones as elements and read-only ones as muted name+reason lines.
 * - no `cva()`, no styled part, but the component's OWN `cva()` failed to parse: the existing
 *   `readOnlyReasonBody` (unchanged — a `readOnlyReason` at this level is a stronger, more
 *   specific signal than the generic placeholder and must not be replaced by it).
 * - otherwise (zero `cva()`, zero parts-with-classes, no `readOnlyReason`): the one-line
 *   `placeholderBody` — the ONLY case that gets it.
 */
function componentBody(info: ComponentInfo, examples: RenderExample[]): string {
  const parts = info.parts ?? [];
  const hasStyledPart = parts.some((part) => part.classes !== undefined);

  if (info.cva) {
    const examplesHtml = `<div class="cn-lib-examples">${examples.map((example) => exampleMarkup(info, example)).join('\n')}</div>`;
    return parts.length > 0 ? examplesHtml + partsBlock(info.exportName, parts) : examplesHtml;
  }
  if (hasStyledPart) return partsBlock(info.exportName, parts);
  if (info.readOnlyReason) return readOnlyReasonBody(info);
  return placeholderBody();
}

/**
 * One `<section data-slug>` per component: `componentBody` decides, per component, whether that's
 * real `cva()` examples, a parts breakdown, a read-only reason, or the muted zero-style placeholder.
 */
function componentSection(entry: { info: ComponentInfo; examples: RenderExample[] }): string {
  const { info, examples } = entry;
  const body = componentBody(info, examples);
  return `<section data-slug="${escapeHtml(info.slug)}" class="cn-lib-component">
  <h2>${escapeHtml(info.exportName)}</h2>
  ${body}
</section>`;
}

/**
 * True for a component with truly nothing to show — the exact condition `componentBody` falls
 * through to `placeholderBody()` for (see its own docstring). Used to pull these out of the main
 * gallery flow entirely: a bordered, padded card whose only content is the single line "no static
 * styles found" is noise repeated once per empty component, not useful information repeated N
 * times — see `unstyledSection` below.
 */
function isUnstyledPlaceholder(info: ComponentInfo): boolean {
  const hasStyledPart = (info.parts ?? []).some((part) => part.classes !== undefined);
  return !info.cva && !hasStyledPart && !info.readOnlyReason;
}

/**
 * One compact section for every component with nothing stylable to show (see
 * `isUnstyledPlaceholder`): a name list, not a full bordered card each — rendered once at the
 * BOTTOM of the gallery so the components with something real to look at aren't pushed down the
 * page by a wall of empty cards. Each name keeps its own `data-slug` (on the `<li>`, since there's
 * no per-component `<section>` anymore) so the rail's `scrollPreviewTo` can still find and
 * highlight it like any other component.
 */
function unstyledSection(infos: ComponentInfo[]): string {
  if (!infos.length) return '';
  const items = infos.map((info) => `<li data-slug="${escapeHtml(info.slug)}">${escapeHtml(info.exportName)}</li>`).join('');
  // Shares .cn-lib-component (the same bordered card, same small-caps muted h2 every other section
  // uses) so this reads as one more section in the same typographic system, not a bolted-on extra —
  // .cn-lib-unstyled only adds the dashed border that marks it as the "nothing styled" pool.
  return `<section class="cn-lib-component cn-lib-unstyled">
  <h2>Unstyled components</h2>
  <p class="cn-lib-unstyled-hint">no static styles found — nothing to preview yet</p>
  <ul class="cn-lib-unstyled-list">${items}</ul>
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

/**
 * Containment for a card that renders a component's or a part's REAL, unmodified classes
 * (`.cn-lib-example`, `.cn-lib-part`): shadcn/Radix overlays and panels (DialogOverlay,
 * DrawerOverlay, SheetContent, …) commonly carry `fixed inset-0 z-50 bg-black/…`, `absolute`,
 * `sticky`, or a translate-based centering idiom — classes that are completely correct on the
 * real component but, rendered verbatim as a preview swatch, escape the card and cover the whole
 * viewport (a `position: fixed` element's containing block is the viewport itself, unless some
 * ancestor intervenes). Per the CSS Transforms spec, any element with a `transform` value other
 * than `none` becomes the containing block for its `position: fixed` (and `absolute`) descendants
 * — so setting one here traps the classes in place without touching them, which is the point:
 * this is containment, not class-stripping, and the card must still show the component's honest
 * classes. `overflow: hidden` then clips anything that still tries to paint past the card's own
 * box (e.g. a `backdrop-blur` scrim or an oversized translated panel), and `position: relative` +
 * `min-height` give an `inset-0` child a real box to fill — without a height of its own, the card
 * would otherwise collapse to zero and the "trapped" overlay would render as nothing. None of this
 * affects normal in-flow content (Button/Badge variants, plain parts): those already have their
 * own size from their content, so the containment properties are inert for them.
 */
const CARD_CONTAINMENT_CSS = `position: relative;
  overflow: hidden;
  transform: translateZ(0);
  min-height: 3rem;`;

const STRUCTURAL_CSS = `html, body { margin: 0; }
body {
  min-height: 100%;
  background: var(--background, #fff);
  color: var(--foreground, #111);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  padding: 24px;
  display: grid;
  gap: 16px;
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
  gap: 16px;
  max-width: 100%;
}
.cn-lib-example {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  ${CARD_CONTAINMENT_CSS}
}
.cn-lib-example > figcaption { font-size: 11px; color: ${CHROME_MUTED}; }
.cn-lib-parts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  align-items: start;
  gap: 16px;
  max-width: 100%;
}
.cn-lib-part {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  border: 1px dashed color-mix(in oklab, currentColor 18%, transparent);
  border-radius: 8px;
  ${CARD_CONTAINMENT_CSS}
}
.cn-lib-part > figcaption { font-size: 11px; color: ${CHROME_MUTED}; }
/* The rendered sample keeps the part's REAL classes, but inside this tile it must behave:
   no escaping its box (containment above), no absolute stacking over the caption. Long names
   wrap at word boundaries only — never letter-by-letter (break-word, not anywhere). Tailwind v4
   compiles a single-axis utility like translate-x-[-50%] to the standalone CSS translate
   property, not transform — the shadcn dialog-centering idiom (translate-x-[-50%]
   translate-y-[-50%]) is exactly this shape, so transform: none alone left it still shifted
   half its own box off to one side inside its tile; scale/rotate are the same kind of
   standalone property and get the same treatment for the same reason. */
.cn-lib-part > :not(figcaption):not(.cn-lib-part-note) {
  position: relative !important;
  inset: auto !important;
  transform: none !important;
  translate: none !important;
  scale: none !important;
  rotate: none !important;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: normal;
}
.cn-lib-composed {
  margin: 0 0 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 480px;
  ${CARD_CONTAINMENT_CSS}
}
.cn-lib-composed > figcaption { font-size: 11px; color: ${CHROME_MUTED}; }
/* Overlay-panel roots (DialogContent etc.) carry fixed/centering/animation classes meant for a
   portal — inside the composition they must sit in normal flow at full visibility, or the whole
   assembled example collapses to slivers. Same neutralization as part tiles, one level deep. */
.cn-lib-composed > div, .cn-lib-composed > div * {
  position: static !important;
  inset: auto !important;
  transform: none !important;
  translate: none !important;
  scale: none !important;
  rotate: none !important;
  animation: none !important;
  opacity: 1 !important;
}
.cn-lib-composed > div { width: 100%; }
.cn-lib-part-readonly, .cn-lib-part-note { margin: 0; font-size: 12px; color: ${CHROME_MUTED}; overflow-wrap: anywhere; }
/* One muted summary line replacing a whole stack of per-part "Name: reason" lines (see
   readOnlyPartsSummaryMarkup) — every part's name still reaches the user via the native title
   tooltip, just never printed inline. */
.cn-lib-part-readonly-summary { margin: 0; font-size: 11px; font-style: italic; color: ${CHROME_MUTED}; cursor: default; }
/* Leftover styled tiles for a component that already got a composed, assembled example (Card):
   tucked away collapsed so the assembled figure is what a designer sees first, not a tile grid
   competing with it. */
.cn-lib-all-parts { margin-top: 4px; }
.cn-lib-all-parts > summary {
  font-size: 11px;
  color: ${CHROME_MUTED};
  cursor: pointer;
  user-select: none;
  list-style: none;
}
.cn-lib-all-parts > summary::-webkit-details-marker { display: none; }
.cn-lib-all-parts > summary::before { content: "▸ "; }
.cn-lib-all-parts[open] > summary::before { content: "▾ "; }
.cn-lib-all-parts[open] > summary { margin-bottom: 10px; }
/* Components with no static styles at all (see isUnstyledPlaceholder) never get their own
   bordered card — they're pooled into one compact name list at the bottom of the gallery instead,
   so a page full of real components isn't padded out with empty-looking ones. */
.cn-lib-unstyled { border-style: dashed; }
.cn-lib-unstyled-hint { margin: 0; font-size: 12px; color: ${CHROME_MUTED}; }
.cn-lib-unstyled-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cn-lib-unstyled-list > li {
  font-size: 12px;
  color: ${CHROME_MUTED};
  border: 1px solid ${CHROME_BORDER};
  border-radius: 999px;
  padding: 3px 10px;
}`;

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
  // Fallback bridge lines for the semantic names above a trimmed theme never defined — skipped
  // entirely for any name the project's own theme already has (that one's real line is above).
  const fallbackBridge = Object.entries(SEMANTIC_FALLBACKS)
    .filter(([name]) => !(name in theme.vars))
    .map(([name, fallback]) => `  --color-${name}: ${fallback};`)
    .join('\n');
  // Components with nothing stylable never get their own card — pulled out of the main flow and
  // pooled into one compact list at the very bottom (`unstyledSection`) instead.
  const normalComponents = components.filter(({ info }) => !isUnstyledPlaceholder(info));
  const unstyledComponents = components.filter(({ info }) => isUnstyledPlaceholder(info));
  const sections = normalComponents.map(componentSection).join('\n');
  const unstyled = unstyledSection(unstyledComponents.map(({ info }) => info));

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Canon library preview</title>
<style type="text/tailwindcss">
@theme inline {
${themeBridge}
${fallbackBridge}
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
${unstyled}
</body>
</html>
`;
}
