// shadcn/ui "parts" parsing: for components with no cva() (or for a cva component's plain sibling
// exports), each exported PascalCase subcomponent's ROOT JSX element carries its own static
// className literal. This module extracts that literal (the "safe subset" from the design doc —
// docs/superpowers/specs/2026-09-30-part-styles-editing-design.md) and splices an edited value back.
// Reuses cva.ts's comment/string/template/regex-aware scanner (`skipNonCode`, `IDENT_CHAR`) so this
// walker never mistakes a `<` or a quote inside a string/comment/template for real code — the same
// discipline that makes `findCva` safe to run over arbitrary source.
import type { PartInfo } from '../types.ts';
import { IDENT_CHAR, skipNonCode } from './cva.ts';

// ---- Export scanning (mirrors inventory.ts's firstPascalExport, but collects every PascalCase
// export instead of just the first) --------------------------------------------------------------

const LIST_EXPORT = /export\s*\{([^}]*)\}/g;
const DECL_EXPORT = /export\s+(?:function\*?|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
const PASCAL = /^[A-Z][a-z0-9$]*(?:[A-Z][a-z0-9$]*)*$/;

/** Every exported PascalCase name in `source` (declaration or list-export form), deduped, in the order their export statement appears. */
function pascalExportNames(source: string): string[] {
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
  const seen = new Set<string>();
  const names: string[] = [];
  for (const { name } of candidates) {
    if (!PASCAL.test(name) || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

/** If `i` (a word-boundary position) starts a `function`/`function*`/`const`/`let`/`var` declaration of a simple identifier, return its name and the index just past the name. */
function matchDeclKeyword(source: string, i: number): { name: string; next: number } | undefined {
  const n = source.length;
  let j: number;
  if (source.startsWith('function', i) && !IDENT_CHAR.test(source[i + 8] ?? '')) {
    j = i + 8;
    if (source[j] === '*') j++;
  } else {
    const keyword = (['const', 'let', 'var'] as const).find((k) => source.startsWith(k, i) && !IDENT_CHAR.test(source[i + k.length] ?? ''));
    if (!keyword) return undefined;
    j = i + keyword.length;
  }
  while (j < n && /\s/.test(source[j])) j++;
  if (!IDENT_CHAR.test(source[j] ?? '')) return undefined;
  const nameStart = j;
  while (j < n && IDENT_CHAR.test(source[j])) j++;
  return { name: source.slice(nameStart, j), next: j };
}

/**
 * First-seen declaration position of every top-level (and nested — position is all that matters)
 * `function NAME`, `function* NAME`, `const NAME`, `let NAME` or `var NAME` in `source`, scanned
 * once with the same comment/string/template-aware walk as `findCva` so a declaration-looking
 * token inside a string or comment is never mistaken for a real one.
 */
function declarationSites(source: string): Map<string, number> {
  const sites = new Map<string, number>();
  const n = source.length;
  let i = 0;
  while (i < n) {
    const skipped = skipNonCode(source, i);
    if (skipped !== undefined) { i = skipped; continue; }
    if (!IDENT_CHAR.test(source[i - 1] ?? '')) {
      const decl = matchDeclKeyword(source, i);
      if (decl) {
        if (!sites.has(decl.name)) sites.set(decl.name, i);
        i = decl.next;
        continue;
      }
    }
    i++;
  }
  return sites;
}

/** One exported subcomponent's source window: from its declaration to the next component's declaration (or EOF). */
interface Window { name: string; start: number; end: number; }

/** Every exported PascalCase subcomponent in `source`, windowed from its own declaration to the next one's (source order). Names with no locally-found declaration (e.g. a re-exported import) are skipped. */
function componentWindows(source: string): Window[] {
  const sites = declarationSites(source);
  const found = pascalExportNames(source)
    .map((name) => ({ name, start: sites.get(name) }))
    .filter((entry): entry is { name: string; start: number } => entry.start !== undefined)
    .sort((a, b) => a.start - b.start);
  return found.map((entry, index) => ({ name: entry.name, start: entry.start, end: index + 1 < found.length ? found[index + 1].start : source.length }));
}

// ---- Low-level scanners (paren/brace/generic depth, all comment/string/template-aware via skipNonCode) ----

function skipWsAndComments(source: string, i: number, limit: number): number {
  let j = i;
  for (;;) {
    while (j < limit && /\s/.test(source[j])) j++;
    if (j < limit && source[j] === '/' && (source[j + 1] === '/' || source[j + 1] === '*')) {
      const skipped = skipNonCode(source, j);
      if (skipped !== undefined) { j = Math.min(skipped, limit); continue; }
    }
    break;
  }
  return j;
}

function skipIdentSimple(source: string, i: number, limit: number): number {
  let j = i;
  while (j < limit && IDENT_CHAR.test(source[j] ?? '')) j++;
  return j;
}

/** Skip balanced `( … )` starting at `i` (the opening paren); returns the index right after the matching `)`. */
function skipParens(source: string, i: number): number {
  const n = source.length;
  let depth = 0, j = i;
  while (j < n) {
    const skipped = skipNonCode(source, j);
    if (skipped !== undefined) { j = skipped; continue; }
    if (source[j] === '(') depth++;
    else if (source[j] === ')') { depth--; j++; if (depth === 0) return j; continue; }
    j++;
  }
  return j;
}

/** Skip balanced `{ … }` starting at `i` (the opening brace); returns the index right after the matching `}`. */
function skipBraces(source: string, i: number): number {
  const n = source.length;
  let depth = 0, j = i;
  while (j < n) {
    const skipped = skipNonCode(source, j);
    if (skipped !== undefined) { j = skipped; continue; }
    if (source[j] === '{') depth++;
    else if (source[j] === '}') { depth--; j++; if (depth === 0) return j; continue; }
    j++;
  }
  return j;
}

/** Skip a `< … >` generic argument list starting at `i` (the opening `<`), depth-counting nested `<>`; returns the index right after the matching `>`. */
function skipGenerics(source: string, i: number): number {
  const n = source.length;
  let depth = 0, j = i;
  while (j < n) {
    const skipped = skipNonCode(source, j);
    if (skipped !== undefined) { j = skipped; continue; }
    if (source[j] === '<') depth++;
    else if (source[j] === '>') { depth--; j++; if (depth === 0) return j; continue; }
    j++;
  }
  return j;
}

/** `=` at `i` is a real assignment operator, not part of `==`, `===`, `=>`, `<=`, `>=` or `!=`. */
function isAssignmentEquals(source: string, i: number): boolean {
  if (source[i + 1] === '=' || source[i + 1] === '>') return false;
  const prev = source[i - 1];
  return prev !== '=' && prev !== '!' && prev !== '<' && prev !== '>';
}

/**
 * From just after a declaration's `=`, descend through at most a handful of wrapping calls (e.g.
 * `React.forwardRef<...>(`) to find the render arrow's own `(params) =>` or `param =>`, returning
 * the index right after `=>`. Returns undefined when nothing arrow-shaped is found (a plain value
 * alias like `const Dialog = DialogPrimitive.Root`, or an unsupported shape).
 */
function findArrowBodyStart(source: string, pos: number, limit: number): number | undefined {
  for (let depth = 0; depth < 6; depth++) {
    pos = skipWsAndComments(source, pos, limit);
    if (pos >= limit) return undefined;
    if (source[pos] === '(') {
      const afterParams = skipParens(source, pos);
      const afterWs = skipWsAndComments(source, afterParams, limit);
      if (source.startsWith('=>', afterWs)) return afterWs + 2;
      return undefined; // a parenthesized non-arrow expression; not traceable under the safe subset
    }
    if (IDENT_CHAR.test(source[pos] ?? '')) {
      const identEnd = skipIdentSimple(source, pos, limit);
      const afterWs = skipWsAndComments(source, identEnd, limit);
      if (source.startsWith('=>', afterWs)) return afterWs + 2; // bare single-param arrow
      // Not a bare-param arrow: try `Ident(.Ident)*<generics>?(` as a wrapper call and descend into it.
      let j = identEnd;
      while (j < limit && (IDENT_CHAR.test(source[j] ?? '') || source[j] === '.')) j++;
      j = skipWsAndComments(source, j, limit);
      if (source[j] === '<') j = skipWsAndComments(source, Math.min(skipGenerics(source, j), limit), limit);
      if (source[j] === '(') { pos = j + 1; continue; }
      return undefined; // some other value (e.g. a plain alias) — no arrow found
    }
    return undefined;
  }
  return undefined;
}

/** Find the first `return` keyword's expression start within a block body `[blockStart, blockEnd)`, peeling one wrapping `(`. Undefined for `return;`/no return found. */
function findReturnExprStart(source: string, blockStart: number, blockEnd: number): number | undefined {
  let i = blockStart;
  while (i < blockEnd) {
    const skipped = skipNonCode(source, i);
    if (skipped !== undefined) { i = skipped; continue; }
    if (source.startsWith('return', i) && !IDENT_CHAR.test(source[i - 1] ?? '') && !IDENT_CHAR.test(source[i + 6] ?? '')) {
      const j = skipWsAndComments(source, i + 6, blockEnd);
      if (j >= blockEnd || source[j] === ';') return undefined;
      return source[j] === '(' ? skipWsAndComments(source, j + 1, blockEnd) : j;
    }
    i++;
  }
  return undefined;
}

/**
 * Locate the root JSX element's leading `<` for the subcomponent declared in `[start, end)`, or
 * undefined when — under the safe subset — its return value isn't traceably a JSX element: a plain
 * value alias (`const Dialog = DialogPrimitive.Root`), a non-JSX return, or a shape this walker
 * doesn't understand. Handles `function Name(...) { ... }`, `const Name = (...) => (<JSX/>)`,
 * `const Name = (...) => { ...; return (<JSX/>) }`, and one level of wrapping call (`React.forwardRef`).
 */
function locateJsxStart(source: string, start: number, end: number): number | undefined {
  let i = start;
  let isFunction = false;
  let assignPos: number | undefined;
  while (i < end) {
    const skipped = skipNonCode(source, i);
    if (skipped !== undefined) { i = skipped; continue; }
    if (source.startsWith('function', i) && !IDENT_CHAR.test(source[i - 1] ?? '') && !IDENT_CHAR.test(source[i + 8] ?? '')) {
      isFunction = true; i += 8; break;
    }
    if (source[i] === '=' && isAssignmentEquals(source, i)) { assignPos = i + 1; break; }
    i++;
  }

  let bodyStart: number | undefined;
  if (isFunction) {
    let j = skipWsAndComments(source, i, end);
    if (source[j] === '*') j++;
    j = skipWsAndComments(source, j, end);
    j = skipIdentSimple(source, j, end); // function name
    j = skipWsAndComments(source, j, end);
    if (source[j] === '<') j = skipWsAndComments(source, Math.min(skipGenerics(source, j), end), end);
    if (source[j] !== '(') return undefined;
    j = skipParens(source, j);
    while (j < end && source[j] !== '{') {
      const skipped = skipNonCode(source, j);
      j = skipped !== undefined ? skipped : j + 1;
    }
    if (j >= end || source[j] !== '{') return undefined;
    const blockEnd = Math.min(skipBraces(source, j), end);
    bodyStart = findReturnExprStart(source, j + 1, blockEnd - 1);
  } else if (assignPos !== undefined) {
    const afterArrow = findArrowBodyStart(source, assignPos, end);
    if (afterArrow === undefined) return undefined;
    const j = skipWsAndComments(source, afterArrow, end);
    if (source[j] === '{') {
      const blockEnd = Math.min(skipBraces(source, j), end);
      bodyStart = findReturnExprStart(source, j + 1, blockEnd - 1);
    } else if (source[j] === '(') {
      bodyStart = skipWsAndComments(source, j + 1, end);
    } else {
      bodyStart = j;
    }
  } else {
    return undefined; // no `function` and no top-level `=` in this window: not a locally-defined component
  }

  if (bodyStart === undefined) return undefined;
  const jsxStart = skipWsAndComments(source, bodyStart, end);
  return jsxStart < end && source[jsxStart] === '<' ? jsxStart : undefined;
}

// ---- Root tag / className attribute scanning ----------------------------------------------------

interface AttrValue { kind: 'string' | 'template' | 'expr'; start: number; end: number; }

/**
 * Scan the JSX opening tag starting at `tagStart` (index of its `<`) for a `className` attribute,
 * returning its raw value span (including the delimiters — quotes, backticks, or `{ }`) if present.
 * Only the root tag's OWN attribute list is scanned (stops at the tag's `>`/`/>`); nested elements
 * are never visited. Spread attributes (`{...props}`) and other attributes' expression values are
 * skipped as balanced `{ … }` so a stray `>` or quote inside one can never end the tag early.
 */
function findRootClassNameAttr(source: string, tagStart: number, limit: number): AttrValue | undefined {
  let i = tagStart + 1;
  while (i < limit && (IDENT_CHAR.test(source[i] ?? '') || source[i] === '.')) i++; // tag name
  let found: AttrValue | undefined;
  while (i < limit) {
    i = skipWsAndComments(source, i, limit);
    if (i >= limit) break;
    if (source[i] === '/' && source[i + 1] === '>') return found; // self-closing
    if (source[i] === '>') return found; // open tag ends (has children)
    if (source[i] === '{') { i = skipBraces(source, i); continue; } // {...spread}
    const nameStart = i;
    while (i < limit && (IDENT_CHAR.test(source[i] ?? '') || source[i] === '-')) i++;
    if (i === nameStart) { i++; continue; } // defensive: avoid getting stuck on an unexpected char
    const attrName = source.slice(nameStart, i);
    i = skipWsAndComments(source, i, limit);
    if (source[i] !== '=') continue; // boolean attribute, no value
    i++;
    i = skipWsAndComments(source, i, limit);
    const c = source[i];
    let valueEnd: number;
    let kind: AttrValue['kind'];
    if (c === '"' || c === "'") { valueEnd = skipNonCode(source, i)!; kind = 'string'; }
    else if (c === '`') { valueEnd = skipNonCode(source, i)!; kind = 'template'; }
    else if (c === '{') { valueEnd = skipBraces(source, i); kind = 'expr'; }
    else { i++; continue; } // unexpected attribute-value shape; skip defensively
    if (attrName === 'className' && found === undefined) found = { kind, start: i, end: valueEnd };
    i = valueEnd;
  }
  return found;
}

// ---- className value -> PartInfo resolution -------------------------------------------------------

function trimEnd(source: string, start: number, limit: number): number {
  let j = limit;
  while (j > start && /\s/.test(source[j - 1])) j--;
  return j;
}

function trimStart(source: string, start: number, limit: number): number {
  let j = start;
  while (j < limit && /\s/.test(source[j])) j++;
  return j;
}

/** A direct `"..."`/`'...'`/interpolation-free `` `...` `` literal: `start`/`end` include the delimiters. */
function literalPart(name: string, source: string, start: number, end: number): PartInfo {
  const isTemplate = source[start] === '`';
  const content = source.slice(start + 1, end - 1);
  if (isTemplate && /\$\{/.test(content)) return { name, readOnlyReason: 'template interpolation' };
  if (content.includes('\\')) return { name, readOnlyReason: 'escaped quote in literal' };
  return { name, classes: content, span: { start, end } };
}

/** True when `source[start, end)` is EXACTLY one string or template literal (nothing before or after it). */
function wholeLiteral(source: string, start: number, end: number): { start: number; end: number } | undefined {
  const c = source[start];
  if (c !== '"' && c !== "'" && c !== '`') return undefined;
  const literalEnd = skipNonCode(source, start);
  return literalEnd === end ? { start, end } : undefined;
}

/** True when `source[start, end)` is EXACTLY one call expression `ident( … )` (nothing before or after it). */
function matchWholeCall(source: string, start: number, end: number): { argsStart: number; argsEnd: number } | undefined {
  let j = start;
  if (!IDENT_CHAR.test(source[j] ?? '')) return undefined;
  while (j < end && IDENT_CHAR.test(source[j] ?? '')) j++;
  j = skipWsAndComments(source, j, end);
  if (j >= end || source[j] !== '(') return undefined;
  const argsStart = j + 1;
  const afterCall = skipParens(source, j);
  return afterCall === end ? { argsStart, argsEnd: afterCall - 1 } : undefined;
}

/** Split `source[start, end)` at top-level commas (depth over `(`/`{`/`[`), trimmed, comment/string/template-aware. */
function splitTopLevelArgs(source: string, start: number, end: number): { start: number; end: number }[] {
  const args: { start: number; end: number }[] = [];
  let depth = 0, segStart = start, i = start;
  const push = (from: number, to: number): void => {
    const s = trimStart(source, from, to);
    const e = trimEnd(source, s, to);
    if (s < e) args.push({ start: s, end: e });
  };
  while (i < end) {
    const skipped = skipNonCode(source, i);
    if (skipped !== undefined) { i = Math.min(skipped, end); continue; }
    const c = source[i];
    if (c === '(' || c === '{' || c === '[') { depth++; i++; continue; }
    if (c === ')' || c === '}' || c === ']') { depth--; i++; continue; }
    if (c === ',' && depth === 0) { push(segStart, i); segStart = i + 1; i++; continue; }
    i++;
  }
  push(segStart, end);
  return args;
}

/**
 * Resolve a `className={ … }` expression's content (the byte range strictly between `{` and `}`,
 * exclusive) into a `PartInfo`: either the shadcn `cn("literal", ...tail)` shape (first argument a
 * plain literal — every other argument becomes `dynamicTail`, a display-only raw-text summary), a
 * bare literal with no call wrapper, or — for anything else (a helper-const reference, a non-literal
 * first argument such as `buttonVariants(...)`, a ternary, an interpolated template) —
 * `readOnlyReason: 'dynamic classes only'`, per the spec's safe subset.
 */
function exprPart(name: string, source: string, braceStart: number, braceEnd: number): PartInfo {
  const contentStart = trimStart(source, braceStart + 1, braceEnd - 1);
  const contentEnd = trimEnd(source, contentStart, braceEnd - 1);
  if (contentStart >= contentEnd) return { name, readOnlyReason: 'dynamic classes only' };

  const call = matchWholeCall(source, contentStart, contentEnd);
  if (call) {
    const args = splitTopLevelArgs(source, call.argsStart, call.argsEnd);
    if (args.length > 0) {
      const literal = wholeLiteral(source, args[0].start, args[0].end);
      if (literal) {
        const part = literalPart(name, source, literal.start, literal.end);
        if (part.classes !== undefined && args.length > 1) part.dynamicTail = source.slice(args[1].start, args[args.length - 1].end);
        return part;
      }
    }
    return { name, readOnlyReason: 'dynamic classes only' };
  }

  const literal = wholeLiteral(source, contentStart, contentEnd);
  if (literal) return literalPart(name, source, literal.start, literal.end);

  return { name, readOnlyReason: 'dynamic classes only' };
}

function resolveAttrValue(name: string, source: string, attr: AttrValue): PartInfo {
  if (attr.kind === 'expr') return exprPart(name, source, attr.start, attr.end);
  return literalPart(name, source, attr.start, attr.end);
}

// ---- Public API ------------------------------------------------------------------------------

/**
 * Parse `source` (one component file) into one `PartInfo` per exported PascalCase subcomponent, per
 * the design doc's safe subset: only the subcomponent's ROOT JSX element's `className` is
 * considered. A subcomponent with no traceable JSX (a plain alias like `const Dialog =
 * DialogPrimitive.Root`), or whose root element carries no `className` attribute at all (including
 * when only a NESTED element does — v1 is root-only), gets `readOnlyReason: 'root element has no
 * static className'`. A `className` expression with no leading string literal (a helper-const
 * reference, a `cva`-variants call, a ternary, …) gets `readOnlyReason: 'dynamic classes only'`. A
 * literal containing a backslash escape is refused rather than decoded: `readOnlyReason: 'escaped
 * quote in literal'`.
 */
export function parseParts(source: string): PartInfo[] {
  return componentWindows(source).map(({ name, start, end }) => {
    const jsxStart = locateJsxStart(source, start, end);
    if (jsxStart === undefined) return { name, readOnlyReason: 'root element has no static className' };
    const attr = findRootClassNameAttr(source, jsxStart, end);
    if (!attr) return { name, readOnlyReason: 'root element has no static className' };
    return resolveAttrValue(name, source, attr);
  });
}

/**
 * Replace a part's literal bytes (`part.span`, quotes included) with `classes`, wrapped in the SAME
 * quote character the original literal used — byte-identical everywhere else. Throws for a
 * read-only part (no `span`). Pure string transform, like `spliceCva`: the caller (a future
 * `writePart`) is responsible for validating `classes` first and re-running `parseParts` on the
 * result to verify the literal reads back as written (the fixed-point contract) before persisting.
 */
export function splicePart(source: string, part: PartInfo, classes: string): string {
  if (!part.span) throw new Error(`shadcn adapter: part "${part.name}" is read-only and has no literal to splice${part.readOnlyReason ? ` (${part.readOnlyReason})` : ''}`);
  const { start, end } = part.span;
  const quote = source[start];
  return source.slice(0, start) + quote + classes + quote + source.slice(end);
}
