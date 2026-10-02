// shadcn/ui inventory: enumerate ui components, parse their cva() specs, and splice writes back.
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { Write } from '../../design-files.ts';
import type { ComponentInfo, CvaSpec, PartInfo } from '../types.ts';
import { readConfig } from './config.ts';
import { CvaParseError, findCva, parseCva, spliceCva } from './cva.ts';
import { cvaOwner, parseParts, splicePart } from './parts.ts';

const LIST_EXPORT = /export\s*\{([^}]*)\}/g;
const DECL_EXPORT = /export\s+(?:function\*?|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
// Strict PascalCase: an initial capital, then only lowercase/digit/$ until (optionally) the next
// capital starts a new word — this excludes SCREAMING_SNAKE_CASE and other all-caps identifiers
// (e.g. `TOAST_LIMIT`) that would otherwise look "capitalized" but aren't a component name.
const PASCAL = /^[A-Z][a-z0-9$]*(?:[A-Z][a-z0-9$]*)*$/;
// cva() keys may be quoted string literals with arbitrary characters (see cva.ts's parseKey), but
// every variant axis name and value key ends up interpolated unescaped into a JSX attribute by
// the render path (shadcn/render.ts's attrString: `${name}="${value}"`). A key outside the safe
// grammar for its position would produce syntactically invalid — or worse, injected — TSX, so it
// disqualifies the component's cva from being exposed at all (see unsafeVariantKey below). The
// grammar is split by position: an axis name becomes a bare JSX attribute name (so it must start
// with a letter, same as any JSX/HTML attribute), while an option value only ever lands inside the
// attribute's quotes (`="${value}"`), so a leading digit is harmless there — and shadcn/Tailwind
// scales commonly use digit-leading values like `2xl`/`3xl`, which must not be flagged unsafe.
const SAFE_VARIANT_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;
const SAFE_VARIANT_VALUE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/;

/**
 * First variant axis name or value key in `spec` that isn't safe to interpolate unescaped into a
 * JSX attribute (`name="value"`), or undefined when every key is safe. cva's grammar allows
 * quoted keys with arbitrary characters, so a legal-but-exotic source (e.g. a variant option named
 * `'has"quote'`) must never reach the render path.
 *
 * Only `spec.variants` is checked: `renderSpec` (shadcn/render.ts) only ever reads `variants` when
 * building JSX attributes. If it's ever extended to also honor `defaultVariants` or
 * `compoundVariants` in rendered output, validation here must be extended to those fields too.
 */
function unsafeVariantKey(spec: CvaSpec): string | undefined {
  for (const [axisName, options] of Object.entries(spec.variants)) {
    if (!SAFE_VARIANT_NAME.test(axisName)) return axisName;
    for (const value of Object.keys(options)) {
      if (!SAFE_VARIANT_VALUE.test(value)) return value;
    }
  }
  return undefined;
}

// New class tokens use a restricted grammar. Opaque selectors may only be retained from
// the same scope in freshly parsed source; client metadata never authorizes unsafe tokens.
// CVA prints escaped strings; part writes preserve their original delimiter and verify the
// parsed literal after splicing. Existing opposite-delimiter quotes are therefore safe to keep.
const SAFE_CLASS_LIST = /^[^\s"'`{}\\]+(?: [^\s"'`{}\\]+)*$/;

function validateClassList(classes: string[], where: string, original: string[] = []): void {
  // CVA strings are JSON-escaped when printed. Existing opaque selector tokens may survive a
  // neighboring safe edit, but must come from the same scope in freshly parsed source, not the
  // client's inventory. Parts additionally require a safely parsed, delimiter-preserving literal.
  const preserved = new Set(original.flatMap((value) => value.split(' ')).filter((token) => token && !SAFE_CLASS_LIST.test(token)));
  for (const cls of classes) {
    if (cls !== "" && !SAFE_CLASS_LIST.test(cls) && !cls.split(' ').every((token) => SAFE_CLASS_LIST.test(token) || preserved.has(token))) throw new Error(`shadcn adapter: ${where} has an unsafe class string: ${JSON.stringify(cls)}`);
  }
}

/** Parsed literals may preserve their existing quotes; other unsupported punctuation and
 * whitespace remain read-only. parseParts already refuses escapes/interpolation, and the
 * writer accepts opaque tokens only from this freshly parsed literal. */
function withWriteGrammar(part: PartInfo): PartInfo {
  if (part.classes === undefined || part.classes.trim() === '' || /^[^\s`{}\\]+(?: [^\s`{}\\]+)*$/.test(part.classes)) return part;
  const { span, ...rest } = part;
  return { ...rest, readOnlyReason: 'contains characters the editor cannot write back' };
}

/**
 * Full pre-splice validation of a `CvaSpec` about to be written to disk by `writeVariants`: every
 * class string in `base`, each variant's classes, and each `compoundVariants` entry's classes must
 * be a safe token list (`SAFE_CLASS_LIST`); every variant axis name and value key must be safe to
 * interpolate unescaped into a rendered/story JSX attribute (`renderSpec`, shadcn/render.ts) — the
 * same grammar `inventory()` already applies when READING a cva() back (`unsafeVariantKey`), now
 * also enforced on write: without this, a hostile axis value such as `sm" onClick={...} x="` would
 * happily parse and splice, then reach a generated `.stories.tsx` file as executable JSX. Finally,
 * `defaultVariants`' own keys and string values are held to the same two grammars defensively, even
 * though nothing renders them unescaped today (see `unsafeVariantKey`'s docstring on that scope).
 */
function validateSpec(spec: CvaSpec, slug: string, original: CvaSpec): void {
  validateClassList(spec.base, `"${slug}" base`, original.base);
  for (const [axis, options] of Object.entries(spec.variants)) {
    for (const [value, classes] of Object.entries(options)) validateClassList(classes, `"${slug}" variants.${axis}.${value}`, original.variants[axis]?.[value]);
  }
  spec.compoundVariants.forEach(({ classes }, index) => validateClassList(classes, `"${slug}" compoundVariants[${index}]`, original.compoundVariants[index]?.classes));

  const unsafeKey = unsafeVariantKey(spec);
  if (unsafeKey !== undefined) throw new Error(`shadcn adapter: "${slug}" has an unsafe variant key: ${JSON.stringify(unsafeKey)}`);

  for (const [key, value] of Object.entries(spec.defaultVariants)) {
    if (!SAFE_VARIANT_NAME.test(key)) throw new Error(`shadcn adapter: "${slug}" has an unsafe defaultVariants key: ${JSON.stringify(key)}`);
    if (typeof value === 'string' && !SAFE_VARIANT_VALUE.test(value)) throw new Error(`shadcn adapter: "${slug}" has an unsafe defaultVariants value: ${JSON.stringify(value)}`);
  }
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
 *
 * Every entry also gets `parts` (`parseParts(source)`, see shadcn/parts.ts): one `PartInfo` per
 * exported PascalCase subcomponent in the SAME file, parsed from the SAME source read used for
 * `cva()` above. This is entirely independent of the `cva()` outcome — a read-only component
 * (its `cva()` failed to parse, or had an unsafe variant key) still gets its parts, since parts
 * and cva are unrelated axes of a component's styling and a file can carry both, either, or
 * neither. Each part is then run through `withWriteGrammar`, which downgrades one that `parseParts`
 * resolved as editable but that `writePart`'s own grammar could never actually write back (see its
 * docstring) — so nothing this function returns is ever "editable" by a definition stricter code
 * downstream doesn't share.
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
    const info: ComponentInfo = { slug, file, exportName, importPath: `${uiImportBase}/${slug}`, parts: parseParts(source).map(withWriteGrammar) };

    // Only the first cva() call in the file is read; multiple cva() calls per file are unsupported in v1.
    const span = findCva(source);
    if (span) {
      info.cvaSpan = span;
      info.cvaOwner = cvaOwner(source, span);
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
 * Splice an updated `CvaSpec` back into a component's source file. Validates `spec` first
 * (`validateSpec` — safe class strings, safe variant/defaultVariants keys) and refuses, naming the
 * offending value, before touching the file at all. Re-reads the file and re-locates the `cva()`
 * call fresh — its span may have moved since `inventory` ran — and refuses, naming the component,
 * if the call has disappeared or no longer parses under the supported grammar (someone may have
 * hand-edited the file in the meantime). Finally, before returning the `Write`, re-locates and
 * re-parses the JUST-SPLICED `cva()` call and checks it deep-equals `spec` — a `printCva` →
 * `parseCva` fixed point, the same property `tests/shadcn-cva.test.ts` pins directly — refusing,
 * naming the construct, if the printer and parser ever disagree on this spec (the class-string and
 * key validation above should make that unreachable, but this is the backstop that would catch it
 * rather than silently writing a file whose cva() reads back differently than intended).
 *
 * `stagedSource`, when given, is parsed/spliced INSTEAD OF re-reading `component.file` from disk —
 * see the `Adapter.writeVariants` docstring (types.ts) for why (same-file cva+parts composition).
 * The realpath resolution and disk read are BOTH skipped in that case — not because staging implies
 * the path was resolved somewhere upstream, but because `component.file` is ALREADY canonical by
 * construction regardless of staging: `inventory()` (the only place a `ComponentInfo` is built)
 * realpaths its `root` argument first and joins every component's `file` under that canonical root
 * (see its own `realpathSync(root)` call), so re-resolving it again here would only cost a syscall,
 * never change the answer. The `cva()` span is always re-located inside whatever source is in play
 * (disk or staged) via a fresh `findCva`, never trusted from a prior parse.
 */
export function writeVariants(component: ComponentInfo, spec: CvaSpec, stagedSource?: string): Write {
  // never trust the caller's path to already be canonical on a fresh disk read (see connect.ts,
  // install.ts) — but `component.file` is canonical by construction either way (inventory() builds
  // it under an already-realpath'd root), so re-resolving it again when staging is unnecessary.
  const file = stagedSource === undefined ? realpathSync(component.file) : component.file;
  const source = stagedSource ?? readFileSync(file, 'utf8');
  const span = findCva(source); // first cva() call only, same as inventory()
  if (!span) throw new Error(`shadcn adapter: "${component.slug}" no longer has a cva() call (${file})`);
  let original: CvaSpec;
  try {
    original = parseCva(source, span);
  } catch (error) {
    if (!(error instanceof CvaParseError)) throw error;
    throw new Error(`shadcn adapter: "${component.slug}"'s cva() is no longer parseable: ${error.message}`);
  }
  validateSpec(spec, component.slug, original);
  const content = spliceCva(source, span, spec);

  const roundTripSpan = findCva(content);
  if (!roundTripSpan) throw new Error(`shadcn adapter: "${component.slug}"'s just-spliced cva() could not be re-located (round-trip check failed)`);
  let roundTripped: CvaSpec;
  try {
    roundTripped = parseCva(content, roundTripSpan);
  } catch (error) {
    if (!(error instanceof CvaParseError)) throw error;
    throw new Error(`shadcn adapter: "${component.slug}"'s just-spliced cva() failed to round-trip: unsupported ${error.construct}`);
  }
  if (!isDeepStrictEqual(roundTripped, spec)) throw new Error(`shadcn adapter: "${component.slug}"'s just-spliced cva() did not round-trip to the same spec`);

  return { root: findProjectRoot(dirname(file)), path: file, content: Buffer.from(content, 'utf8') };
}

/** True when two byte-offset spans (each end-exclusive) overlap at all. */
function spansOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Splice a part using freshly parsed source (or the prior staged write). Preserve only
 * existing opaque tokens from that same literal; reject newly introduced unsafe tokens.
 * The overlap guard and parse/splice fixed point protect the original quote delimiter. */
export function writePart(component: ComponentInfo, partName: string, classes: string, stagedSource?: string): Write {
  // Emptying a part is valid; normalize whitespace-only input to the empty literal.
  const isEmpty = classes.trim() === '';
  const normalizedClasses = isEmpty ? '' : classes;

  // never trust the caller's path to already be canonical on a fresh disk read (see connect.ts,
  // install.ts) — but `component.file` is canonical by construction either way (inventory() builds
  // it under an already-realpath'd root), so re-resolving it again when staging is unnecessary.
  const file = stagedSource === undefined ? realpathSync(component.file) : component.file;
  const source = stagedSource ?? readFileSync(file, 'utf8');
  const parts = parseParts(source).map(withWriteGrammar);
  const part = parts.find((p) => p.name === partName);
  if (!part) throw new Error(`shadcn adapter: "${component.slug}" has no part named "${partName}"`);
  if (!part.span) throw new Error(`shadcn adapter: "${component.slug}"'s part "${partName}" is read-only${part.readOnlyReason ? ` (${part.readOnlyReason})` : ''}`);

  if (!isEmpty) validateClassList([classes], `"${component.slug}" part "${partName}"`, [part.classes!]);

  const cvaSpan = findCva(source);
  if (cvaSpan && spansOverlap(part.span, cvaSpan)) {
    throw new Error(`shadcn adapter: "${component.slug}"'s part "${partName}" span overlaps its cva() call — refusing to splice`);
  }

  const content = splicePart(source, part, normalizedClasses);

  const roundTripped = parseParts(content).find((p) => p.name === partName);
  if (!roundTripped || roundTripped.classes !== normalizedClasses) {
    throw new Error(`shadcn adapter: "${component.slug}"'s part "${partName}" did not round-trip to the same classes`);
  }

  return { root: findProjectRoot(dirname(file)), path: file, content: Buffer.from(content, 'utf8') };
}
