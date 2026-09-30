// shadcn/ui inventory: enumerate ui components, parse their cva() specs, and splice writes back.
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Write } from '../../design-files.ts';
import type { ComponentInfo, CvaSpec } from '../types.ts';
import { readConfig } from './config.ts';
import { CvaParseError, findCva, parseCva, spliceCva } from './cva.ts';

const LIST_EXPORT = /export\s*\{([^}]*)\}/g;
const DECL_EXPORT = /export\s+(?:function\*?|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
// Strict PascalCase: an initial capital, then only lowercase/digit/$ until (optionally) the next
// capital starts a new word — this excludes SCREAMING_SNAKE_CASE and other all-caps identifiers
// (e.g. `TOAST_LIMIT`) that would otherwise look "capitalized" but aren't a component name.
const PASCAL = /^[A-Z][a-z0-9$]*(?:[A-Z][a-z0-9$]*)*$/;
// cva() keys may be quoted string literals with arbitrary characters (see cva.ts's parseKey), but
// every variant axis name and value key ends up interpolated unescaped into a JSX attribute by
// the render path (shadcn/render.ts's attrString: `${name}="${value}"`). A key outside this safe
// grammar would produce syntactically invalid — or worse, injected — TSX, so it disqualifies the
// component's cva from being exposed at all (see unsafeVariantKey below).
const SAFE_VARIANT_KEY = /^[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * First variant axis name or value key in `spec` that isn't safe to interpolate unescaped into a
 * JSX attribute (`name="value"`), or undefined when every key is safe. cva's grammar allows
 * quoted keys with arbitrary characters, so a legal-but-exotic source (e.g. a variant option named
 * `'has"quote'`) must never reach the render path.
 */
function unsafeVariantKey(spec: CvaSpec): string | undefined {
  for (const [axisName, options] of Object.entries(spec.variants)) {
    if (!SAFE_VARIANT_KEY.test(axisName)) return axisName;
    for (const value of Object.keys(options)) {
      if (!SAFE_VARIANT_KEY.test(value)) return value;
    }
  }
  return undefined;
}

/** Find the first PascalCase named export in `source` — `export { Foo, bar }` or `export function Foo` — in source order. */
function firstPascalExport(source: string): string | undefined {
  const candidates: { index: number; name: string }[] = [];
  for (const match of source.matchAll(DECL_EXPORT)) candidates.push({ index: match.index!, name: match[1] });
  for (const match of source.matchAll(LIST_EXPORT)) {
    for (const raw of match[1].split(',')) {
      const item = raw.trim();
      if (!item || /^type\s/.test(item)) continue; // skip inline type-only re-exports
      const parts = item.split(/\s+as\s+/);
      candidates.push({ index: match.index!, name: (parts.length > 1 ? parts[1] : parts[0]).trim() });
    }
  }
  candidates.sort((a, b) => a.index - b.index);
  return candidates.find((c) => PASCAL.test(c.name))?.name;
}

/** Walk up from `dir` to the nearest ancestor holding `components.json` (the shadcn project root). */
function findProjectRoot(dir: string): string {
  let current = dir;
  for (;;) {
    if (existsSync(join(current, 'components.json'))) return current;
    const parent = dirname(current);
    if (parent === current) return dir; // reached the filesystem root without finding one
    current = parent;
  }
}

/**
 * Inventory every `.tsx` file directly under the project's ui directory (non-recursive) into a
 * `ComponentInfo`: `slug` from the filename, `exportName` the first PascalCase named export,
 * `importPath` built from the configured ui import alias, and — when the file has a `cva()` call —
 * its parsed `CvaSpec`. A `cva()` call outside the supported grammar doesn't drop the component
 * from the inventory: it's still listed, with `readOnlyReason` set to the parser's error message
 * and no `cva`/`cvaSpan`. The same applies when the call parses fine but a variant axis name or
 * value key isn't safe to interpolate into a JSX attribute unescaped (see `unsafeVariantKey`
 * above) — `readOnlyReason` names the offending key and `cva` is withheld even though parsing
 * succeeded. A file with no `cva()` call at all also has neither field set, and no
 * `readOnlyReason` (that's not an error — it's just a component without variants). A file with no
 * genuine PascalCase named export at all — e.g. a barrel `index.tsx` holding only
 * `export * from './button'` — isn't a component and is skipped from the inventory entirely,
 * rather than being listed under a fabricated name.
 */
export function inventory(root: string): ComponentInfo[] {
  root = realpathSync(root); // never trust the caller's path to already be canonical (see connect.ts, install.ts)
  const config = readConfig(root);
  if (!config) throw new Error(`shadcn adapter: no components.json found in ${root}`);
  const { uiDir, uiImportBase } = config;

  const filenames = readdirSync(uiDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => entry.name)
    .sort();

  const items: ComponentInfo[] = [];
  for (const filename of filenames) {
    const slug = filename.slice(0, -'.tsx'.length);
    const file = join(uiDir, filename);
    const source = readFileSync(file, 'utf8');
    const exportName = firstPascalExport(source);
    if (!exportName) continue; // no real component export (e.g. a re-export-only barrel file)
    const info: ComponentInfo = { slug, file, exportName, importPath: `${uiImportBase}/${slug}` };

    // Only the first cva() call in the file is read; multiple cva() calls per file are unsupported in v1.
    const span = findCva(source);
    if (span) {
      info.cvaSpan = span;
      try {
        const spec = parseCva(source, span);
        const unsafeKey = unsafeVariantKey(spec);
        if (unsafeKey !== undefined) info.readOnlyReason = `unsafe variant key: ${unsafeKey}`;
        else info.cva = spec;
      }
      catch (error) {
        if (!(error instanceof CvaParseError)) throw error;
        info.readOnlyReason = error.message;
      }
    }
    items.push(info);
  }
  return items;
}

/**
 * Splice an updated `CvaSpec` back into a component's source file. Re-reads the file and re-locates
 * the `cva()` call fresh — its span may have moved since `inventory` ran — and refuses, naming the
 * component, if the call has disappeared or no longer parses under the supported grammar (someone
 * may have hand-edited the file in the meantime).
 */
export function writeVariants(component: ComponentInfo, spec: CvaSpec): Write {
  const file = realpathSync(component.file); // never trust the caller's path to already be canonical (see connect.ts, install.ts)
  const source = readFileSync(file, 'utf8');
  const span = findCva(source); // first cva() call only, same as inventory()
  if (!span) throw new Error(`shadcn adapter: "${component.slug}" no longer has a cva() call (${file})`);
  try {
    parseCva(source, span);
  } catch (error) {
    if (!(error instanceof CvaParseError)) throw error;
    throw new Error(`shadcn adapter: "${component.slug}"'s cva() is no longer parseable: ${error.message}`);
  }
  const content = spliceCva(source, span, spec);
  return { root: findProjectRoot(dirname(file)), path: file, content: Buffer.from(content, 'utf8') };
}
