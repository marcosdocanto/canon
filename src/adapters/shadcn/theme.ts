// shadcn/ui theme reading: CSS custom properties in :root / .dark blocks.
import { existsSync, readFileSync } from 'node:fs';
import type { LibraryTheme } from '../types.ts';
import { readConfig } from './config.ts';

interface CssBlock { selector: string; body: string; }

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
      blocks.push({ selector, body: css.slice(i + 1, bodyEnd) });
      i = j;
      selectorStart = i;
      continue;
    }
    i++;
  }
  return blocks;
}

const VAR_DECL = /--([A-Za-z0-9-]+)\s*:\s*([^;]+);/g;

/**
 * Scan CSS text for `:root` and `.dark` (also `:root.dark`, `.dark:root`) selector blocks and
 * collect their `--var: value;` declarations. Blocks whose selector starts with `@` (e.g.
 * `@theme`, `@keyframes`, `@media`) are ignored entirely, including their nested content.
 */
export function parseVarBlocks(css: string): { root: Map<string, string>; dark: Map<string, string> } {
  const root = new Map<string, string>();
  const dark = new Map<string, string>();
  for (const block of topLevelBlocks(css)) {
    if (block.selector.startsWith('@')) continue;
    const target = block.selector === ':root' ? root : block.selector.includes('.dark') ? dark : undefined;
    if (!target) continue;
    VAR_DECL.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = VAR_DECL.exec(block.body))) target.set(match[1], match[2].trim());
  }
  return { root, dark };
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
