// shadcn/ui theme reading and writing: CSS custom properties in :root / .dark blocks.
import { existsSync, readFileSync } from 'node:fs';
import type { Write } from '../../design-files.ts';
import type { LibraryTheme } from '../types.ts';
import { readConfig } from './config.ts';

interface CssBlock { selector: string; body: string; bodyStart: number; bodyEnd: number; }

// CSS-injection guard for `writeTheme`, which splices `theme.vars` values raw into the theme file
// with no further escaping (unlike `preview-lib.ts`'s HTML-context rendering, which HTML-escapes
// everything). A var name becomes `--<name>` in the custom-property declaration, so it must be a
// bare identifier-ish token; a value lands between `: ` and `;`, so any of `;`, `{`, `}` or a
// newline would let it close the declaration (or the enclosing `:root`/`.dark` block) early and
// splice attacker-controlled CSS in after it — e.g. a var named `primary;}body{background:red` or
// a value of `red;}body{background:red`.
const SAFE_THEME_VAR_NAME = /^[A-Za-z0-9-]+$/;
const UNSAFE_THEME_VALUE_CHARS = /[;{}\r\n]/;

/** Throw naming the offending var/value if any entry in `vars` isn't safe to splice raw into CSS. */
function validateThemeVars(vars: LibraryTheme['vars']): void {
  for (const [name, value] of Object.entries(vars)) {
    if (!SAFE_THEME_VAR_NAME.test(name)) throw new Error(`shadcn adapter: theme var name is not safe to write: ${JSON.stringify(name)}`);
    for (const side of ['light', 'dark'] as const) {
      const v = value[side];
      if (v !== undefined && UNSAFE_THEME_VALUE_CHARS.test(v)) throw new Error(`shadcn adapter: theme var "${name}" ${side} value contains a disallowed character (; { } or a newline): ${JSON.stringify(v)}`);
    }
  }
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Walk the CSS once, yielding each top-level (non-nested) selector block: `selector { body }`. */
function topLevelBlocks(css: string): CssBlock[] {
  const blocks: CssBlock[] = [];
  const n = css.length;
  let i = 0;
  let selectorStart = 0;

  const skipStringOrComment = (from: number): number | undefined => {
    if (css[from] === '/' && css[from + 1] === '*') {
      const end = css.indexOf('*/', from + 2);
      return end === -1 ? n : end + 2;
    }
    if (css[from] === '"' || css[from] === "'") {
      const quote = css[from];
      let j = from + 1;
      while (j < n && css[j] !== quote) { if (css[j] === '\\') j++; j++; }
      return j + 1;
    }
    return undefined;
  };

  while (i < n) {
    const skipped = skipStringOrComment(i);
    if (skipped !== undefined) { i = skipped; continue; }
    const ch = css[i];
    if (ch === ';') {
      i++;
      selectorStart = i;
      continue;
    }
    if (ch === '{') {
      const selector = stripComments(css.slice(selectorStart, i)).trim();
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        const skippedInner = skipStringOrComment(j);
        if (skippedInner !== undefined) { j = skippedInner; continue; }
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      const bodyEnd = j - 1; // position of the matching '}'
      blocks.push({ selector, body: css.slice(i + 1, bodyEnd), bodyStart: i + 1, bodyEnd });
      i = j;
      selectorStart = i;
      continue;
    }
    i++;
  }
  return blocks;
}

/**
 * The blocks that may hold managed theme vars: every top-level block plus, one level deep,
 * the blocks inside `@layer …` — Tailwind v3-era shadcn wraps `:root`/`.dark` in `@layer base`.
 * Nested block offsets are absolute within the original css text. Other `@`-rules
 * (`@theme`, `@media`, `@keyframes`) are never expanded.
 */
function candidateBlocks(css: string): CssBlock[] {
  const blocks: CssBlock[] = [];
  for (const block of topLevelBlocks(css)) {
    blocks.push(block);
    if (!/^@layer\b/.test(block.selector)) continue;
    for (const inner of topLevelBlocks(block.body)) {
      blocks.push({
        selector: inner.selector,
        body: inner.body,
        bodyStart: block.bodyStart + inner.bodyStart,
        bodyEnd: block.bodyStart + inner.bodyEnd,
      });
    }
  }
  return blocks;
}

const VAR_DECL = /--([A-Za-z0-9-]+)\s*:\s*([^;]+);/g;

type ManagedKind = 'root' | 'dark';

/**
 * Classify a top-level selector as the managed light (`:root`) or dark (`.dark`, `:root.dark`,
 * `.dark:root`, …) theme block, or `undefined` when it isn't one (including any `@`-rule, which
 * is never managed).
 */
function managedKind(selector: string): ManagedKind | undefined {
  if (selector.startsWith('@')) return undefined;
  if (selector === ':root') return 'root';
  if (selector.includes('.dark')) return 'dark';
  return undefined;
}

/**
 * Scan CSS text for `:root` and `.dark` (also `:root.dark`, `.dark:root`) selector blocks and
 * collect their `--var: value;` declarations. Blocks whose selector starts with `@` (e.g.
 * `@theme`, `@keyframes`, `@media`) are ignored entirely, including their nested content.
 */
export function parseVarBlocks(css: string): { root: Map<string, string>; dark: Map<string, string> } {
  const root = new Map<string, string>();
  const dark = new Map<string, string>();
  for (const block of candidateBlocks(css)) {
    const kind = managedKind(block.selector);
    if (!kind) continue;
    const target = kind === 'root' ? root : dark;
    VAR_DECL.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = VAR_DECL.exec(block.body))) target.set(match[1], match[2].trim());
  }
  return { root, dark };
}

interface VarPosition { name: string; valueStart: number; valueEnd: number; }

/** Locate each `--name: value;` declaration in `body`, with the value's char offsets within `body`. */
function findVarPositions(body: string): VarPosition[] {
  const positions: VarPosition[] = [];
  const prefixRe = /^--[A-Za-z0-9-]+\s*:\s*/;
  VAR_DECL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = VAR_DECL.exec(body))) {
    const prefix = prefixRe.exec(body.slice(match.index))![0];
    const valueStart = match.index + prefix.length;
    positions.push({ name: match[1], valueStart, valueEnd: valueStart + match[2].length });
  }
  return positions;
}

/**
 * Read a shadcn/ui project's theme: the CSS custom properties declared in `:root` (light) and
 * `.dark` (dark). A `.dark`-only variable is reported with the same value for light and dark.
 */
export function readTheme(root: string): LibraryTheme {
  const config = readConfig(root);
  if (!config) throw new Error(`shadcn adapter: no components.json found in ${root}`);
  const { cssFile } = config;
  if (!existsSync(cssFile)) throw new Error(`shadcn adapter: css file not found: ${cssFile}`);
  const css = readFileSync(cssFile, 'utf8');
  const { root: rootVars, dark: darkVars } = parseVarBlocks(css);
  if (rootVars.size === 0) throw new Error(`shadcn adapter: no :root block with CSS variables found in ${cssFile}`);

  const vars: Record<string, { light: string; dark?: string }> = {};
  for (const [name, light] of rootVars) {
    const darkValue = darkVars.get(name);
    vars[name] = darkValue === undefined ? { light } : { light, dark: darkValue };
  }
  for (const [name, value] of darkVars) {
    if (!(name in vars)) vars[name] = { light: value, dark: value };
  }
  return { file: cssFile, vars };
}

/** The indentation used by the block's existing declarations, or a two-space default. */
function blockIndent(body: string): string {
  return /\n([ \t]*)--/.exec(body)?.[1] ?? '  ';
}

/**
 * Write a theme back to its shadcn CSS file, touching only the managed `:root`/`.dark` blocks and,
 * within them, only the `--name: value;` lines for vars present in `theme.vars` (light values into
 * `:root`, dark values into `.dark`). Everything else — comments, imports, other rules, unmanaged
 * vars — is preserved byte-for-byte: the file is re-scanned with the same block scanner used by
 * `readTheme`, and the new content is built by splicing spans, never by re-serializing.
 *
 * Every var name and value is validated first (`validateThemeVars`) — they're spliced raw into
 * CSS text with no escaping, so a name or value outside the safe grammar could otherwise close the
 * declaration (or its enclosing block) early and inject attacker-controlled CSS.
 */
export function writeTheme(root: string, theme: LibraryTheme): Write[] {
  validateThemeVars(theme.vars);
  const { file } = theme;
  if (!existsSync(file)) throw new Error(`shadcn adapter: css file not found: ${file}`);
  const css = readFileSync(file, 'utf8');

  const spans: { start: number; end: number; text: string }[] = [];
  for (const block of candidateBlocks(css)) {
    const kind = managedKind(block.selector);
    if (!kind) continue;

    const positions = findVarPositions(block.body);
    const present = new Set(positions.map((p) => p.name));
    for (const { name, valueStart, valueEnd } of positions) {
      const value = theme.vars[name];
      if (!value) continue;
      const next = kind === 'root' ? value.light : value.dark;
      if (next === undefined) continue;
      spans.push({ start: block.bodyStart + valueStart, end: block.bodyStart + valueEnd, text: next });
    }

    const indent = blockIndent(block.body);
    let appended = '';
    for (const [name, value] of Object.entries(theme.vars)) {
      if (present.has(name)) continue;
      const next = kind === 'root' ? value.light : value.dark;
      if (next === undefined) continue;
      appended += `${indent}--${name}: ${next};\n`;
    }
    if (appended) spans.push({ start: block.bodyEnd, end: block.bodyEnd, text: appended });
  }
  spans.sort((a, b) => a.start - b.start);

  let out = '';
  let cursor = 0;
  for (const span of spans) {
    out += css.slice(cursor, span.start) + span.text;
    cursor = span.end;
  }
  out += css.slice(cursor);

  return [{ root, path: file, content: Buffer.from(out, 'utf8') }];
}
