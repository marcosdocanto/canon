// shadcn/ui inventory: enumerate ui components, parse their cva() specs, and splice writes back.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Write } from '../../design-files.ts';
import type { ComponentInfo, CvaSpec } from '../types.ts';
import { readConfig } from './config.ts';
import { CvaParseError, findCva, parseCva, spliceCva } from './cva.ts';

const LIST_EXPORT = /export\s*\{([^}]*)\}/g;
const DECL_EXPORT = /export\s+(?:function\*?|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
const PASCAL = /^[A-Z][A-Za-z0-9_$]*$/;

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

/** Last-resort guess when no export matches: "alert-dialog" -> "AlertDialog". */
function pascalFromSlug(slug: string): string {
  return slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
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
 * and no `cva`/`cvaSpan`. A file with no `cva()` call at all also has neither field set, and no
 * `readOnlyReason` (that's not an error — it's just a component without variants).
 */
export function inventory(root: string): ComponentInfo[] {
  const config = readConfig(root);
  if (!config) throw new Error(`shadcn adapter: no components.json found in ${root}`);
  const { uiDir, uiImportBase } = config;

  const filenames = readdirSync(uiDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => entry.name)
    .sort();

  return filenames.map((filename) => {
    const slug = filename.slice(0, -'.tsx'.length);
    const file = join(uiDir, filename);
    const source = readFileSync(file, 'utf8');
    const exportName = firstPascalExport(source) ?? pascalFromSlug(slug);
    const info: ComponentInfo = { slug, file, exportName, importPath: `${uiImportBase}/${slug}` };

    const span = findCva(source);
    if (span) {
      info.cvaSpan = span;
      try { info.cva = parseCva(source, span); }
      catch (error) {
        if (!(error instanceof CvaParseError)) throw error;
        info.readOnlyReason = error.message;
      }
    }
    return info;
  });
}

/**
 * Splice an updated `CvaSpec` back into a component's source file. Re-reads the file and re-locates
 * the `cva()` call fresh — its span may have moved since `inventory` ran — and refuses, naming the
 * component, if the call has disappeared or no longer parses under the supported grammar (someone
 * may have hand-edited the file in the meantime).
 */
export function writeVariants(component: ComponentInfo, spec: CvaSpec): Write {
  const source = readFileSync(component.file, 'utf8');
  const span = findCva(source);
  if (!span) throw new Error(`shadcn adapter: "${component.slug}" no longer has a cva() call (${component.file})`);
  try {
    parseCva(source, span);
  } catch (error) {
    if (!(error instanceof CvaParseError)) throw error;
    throw new Error(`shadcn adapter: "${component.slug}"'s cva() is no longer parseable: ${error.message}`);
  }
  const content = spliceCva(source, span, spec);
  return { root: findProjectRoot(dirname(component.file)), path: component.file, content: Buffer.from(content, 'utf8') };
}
