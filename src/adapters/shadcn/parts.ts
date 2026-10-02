// shadcn/ui "parts" parsing: for components with no cva() (or for a cva component's plain sibling
// exports), each exported PascalCase subcomponent's JSX carries its own static className literal.
// This module extracts that literal (the "safe subset" from the design doc —
// docs/superpowers/specs/2026-09-30-part-styles-editing-design.md, as amended by the controller
// ruling below) and splices an edited value back.
//
// Ruling (amends the design doc's "root-only v1" text): a part's editable element is the FIRST JSX
// element in DOCUMENT ORDER within the subcomponent's return that carries a static className
// literal — not necessarily the root. A wrapper element with no className (e.g. shadcn's
// `<DialogContent>` returning `<DialogPortal><DialogOverlay /><DialogPrimitive.Content
// className={...}>`, where the root `<DialogPortal>` has none) is skipped and the walk descends
// into its DIRECT JSX children, in source order, until it finds one. An element whose className IS
// present but doesn't resolve under the safe subset (dynamic, escaped-quote, interpolated) does not
// qualify either — the walk keeps descending — but its resolution is kept as a last-resort
// `readOnlyReason` fallback (the EARLIEST one encountered) in case no element in the whole return
// ever qualifies. `{expression}` children are opaque: never descended into looking for embedded
// JSX, since that would mean evaluating arbitrary JS rather than staying a scanner.
//
// Ruling (review amendment): the outer function's own top-level `return` statements are found by a
// function/arrow-SCOPE-aware scan (see `findTopLevelReturnStarts`) — a nested function expression or
// arrow's own body (e.g. an `.map(item => { return <li .../> })` callback) is skipped as a unit, so
// its `return` is never mistaken for the component's own. ALL of the outer function's own top-level
// returns are collected (guard clauses like shadcn's Sidebar routinely have several); each is walked
// independently, and the FIRST one whose JSX yields a static literal wins. When more than one branch
// yields a (possibly different) literal, the part still resolves to the first one's literal, plus a
// non-blocking `note` saying how many branches did and that branch 1 is the one being edited — an
// honest signal rather than a silent pick or a spurious read-only.
//
// Reuses cva.ts's comment/string/template/regex-aware scanner (`skipNonCode`, `IDENT_CHAR`) so this
// walker never mistakes a `<` or a quote inside a string/comment/template for real code — the same
// discipline that makes `findCva` safe to run over arbitrary source. Still a scanner (a bounded,
// source-order walk), not a full JSX AST: it understands just enough tag/attribute/children/function
// structure to recurse and to skip nested scopes, not general JS/JSX semantics.
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

/**
 * Find every OUTER-function top-level `return` statement's expression start within a block body
 * `[blockStart, blockEnd)`, in source order (peeling one wrapping `(` per return, as before).
 * `return;` (or a `return` with nothing after it) contributes no entry.
 *
 * Scope-aware (fixes the CRITICAL misattribution a closure could cause): a nested `function`
 * declaration/expression's body, or an arrow function's `{ … }` body, is skipped as a whole unit via
 * brace matching before this scan ever looks for `return` inside it — so `items.map(item => { return
 * <li className="item-class"> })` never has its closure's own return mistaken for the enclosing
 * component's. An expression-bodied arrow (`=> expr`, no `{`) is NOT itself a scope boundary here —
 * it can't syntactically hold a bare `return` statement — but anything nested inside `expr` (another
 * function, another arrow-with-block) is still caught by these same two checks as the scan continues
 * through it, so nothing inside is missed.
 */
function findTopLevelReturnStarts(source: string, blockStart: number, blockEnd: number): number[] {
  const starts: number[] = [];
  let i = blockStart;
  while (i < blockEnd) {
    const skipped = skipNonCode(source, i);
    if (skipped !== undefined) { i = skipped; continue; }

    // Nested function declaration/expression: skip its entire body as one unit.
    if (source.startsWith('function', i) && !IDENT_CHAR.test(source[i - 1] ?? '') && !IDENT_CHAR.test(source[i + 8] ?? '')) {
      let j = skipWsAndComments(source, i + 8, blockEnd);
      if (source[j] === '*') j = skipWsAndComments(source, j + 1, blockEnd);
      j = skipIdentSimple(source, j, blockEnd); // optional name
      j = skipWsAndComments(source, j, blockEnd);
      if (source[j] === '(') {
        j = skipParens(source, j);
        while (j < blockEnd && source[j] !== '{') {
          const s = skipNonCode(source, j);
          j = s !== undefined ? s : j + 1;
        }
        if (j < blockEnd && source[j] === '{') { i = Math.min(skipBraces(source, j), blockEnd); continue; }
      }
      i = Math.max(j, i + 8); // malformed/unexpected shape — bail forward defensively, never backward
      continue;
    }

    // Arrow function with a BLOCK body (`=> { … }`): skip the whole block as one unit. An
    // expression-bodied arrow (`=> expr`) isn't a scope boundary — see the docstring above.
    if (source[i] === '=' && source[i + 1] === '>') {
      const j = skipWsAndComments(source, i + 2, blockEnd);
      if (j < blockEnd && source[j] === '{') { i = Math.min(skipBraces(source, j), blockEnd); continue; }
      i += 2;
      continue;
    }

    if (source.startsWith('return', i) && !IDENT_CHAR.test(source[i - 1] ?? '') && !IDENT_CHAR.test(source[i + 6] ?? '')) {
      const j = skipWsAndComments(source, i + 6, blockEnd);
      if (j < blockEnd && source[j] !== ';' && source[j] !== '}') {
        starts.push(source[j] === '(' ? skipWsAndComments(source, j + 1, blockEnd) : j);
      }
      i += 6; // past the word "return" only — the rest of its expression is still scanned normally
      // (for nested closures inside it, e.g. an event handler) by the same rules, from here on.
      continue;
    }

    i++;
  }
  return starts;
}

/**
 * Find every "candidate" return-expression start for the subcomponent declared in `[start, end)`:
 * for a block-bodied function/arrow, one entry per top-level `return` (see
 * `findTopLevelReturnStarts`); for an implicit-return arrow (`=> (<JSX/>)` or `=> <JSX/>`), the
 * single expression it returns (as one candidate). Empty for a plain value alias (`const Dialog =
 * DialogPrimitive.Root`) or an unsupported shape. Handles `function Name(...) { ... }`, `const Name =
 * (...) => (<JSX/>)`, `const Name = (...) => { ...; return (<JSX/>) }`, and one level of wrapping
 * call (`React.forwardRef`). Does not filter by "is this JSX" — the caller does that.
 */
function findCandidateStarts(source: string, start: number, end: number): number[] {
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

  let blockContent: { start: number; end: number } | undefined;
  let exprStart: number | undefined;

  if (isFunction) {
    let j = skipWsAndComments(source, i, end);
    if (source[j] === '*') j++;
    j = skipWsAndComments(source, j, end);
    j = skipIdentSimple(source, j, end); // function name
    j = skipWsAndComments(source, j, end);
    if (source[j] === '<') j = skipWsAndComments(source, Math.min(skipGenerics(source, j), end), end);
    if (source[j] !== '(') return [];
    j = skipParens(source, j);
    while (j < end && source[j] !== '{') {
      const skipped = skipNonCode(source, j);
      j = skipped !== undefined ? skipped : j + 1;
    }
    if (j >= end || source[j] !== '{') return [];
    const blockEnd = Math.min(skipBraces(source, j), end);
    blockContent = { start: j + 1, end: blockEnd - 1 };
  } else if (assignPos !== undefined) {
    const afterArrow = findArrowBodyStart(source, assignPos, end);
    if (afterArrow === undefined) return [];
    const j = skipWsAndComments(source, afterArrow, end);
    if (source[j] === '{') {
      const blockEnd = Math.min(skipBraces(source, j), end);
      blockContent = { start: j + 1, end: blockEnd - 1 };
    } else if (source[j] === '(') {
      exprStart = skipWsAndComments(source, j + 1, end);
    } else {
      exprStart = j;
    }
  } else {
    return []; // no `function` and no top-level `=` in this window: not a locally-defined component
  }

  if (blockContent) return findTopLevelReturnStarts(source, blockContent.start, blockContent.end);
  return exprStart !== undefined ? [exprStart] : [];
}

/**
 * Resolve one subcomponent's `PartInfo` from its candidate return-expression starts (see
 * `findCandidateStarts`): walk each candidate that's actually JSX (`source[start] === '<'`; a
 * non-JSX branch like `return null` contributes nothing) and collect every literal found. The FIRST
 * literal-yielding branch, in source order, wins. When more than one branch yields a literal (an
 * honest, non-blocking signal — not a reason to refuse), the winning part also carries a `note`
 * naming how many branches did and that branch 1 is the one being edited. When no branch yields a
 * literal, the EARLIEST non-qualifying reason across all JSX-bearing branches is used; when no
 * candidate is JSX at all (or there are none), it's `'no static className found'`.
 */
function resolveFromCandidates(name: string, source: string, candidates: number[], limit: number): PartInfo {
  const literalParts: PartInfo[] = [];
  let fallback: PartInfo | undefined;
  for (const candidateStart of candidates) {
    if (candidateStart >= limit || source[candidateStart] !== '<') continue; // not JSX in this branch
    const result = walkJsxElement(name, source, candidateStart, limit);
    if (result.part) literalParts.push(result.part);
    else if (!fallback) fallback = result.fallback;
  }
  if (literalParts.length > 0) {
    return literalParts.length > 1
      ? { ...literalParts[0], note: `${literalParts.length} render branches; editing branch 1` }
      : literalParts[0];
  }
  return fallback ?? { name, readOnlyReason: 'no static className found' };
}

// ---- JSX tag / className attribute scanning, and the document-order descent ----------------------

interface AttrValue { kind: 'string' | 'template' | 'expr'; start: number; end: number; }

/**
 * Scan a JSX opening tag starting at `tagStart` (index of its `<`) for a `className` attribute,
 * returning its raw value span (including the delimiters — quotes, backticks, or `{ }`) if present,
 * plus where THIS tag's own opening-tag markup ends and whether it was self-closing. Spread
 * attributes (`{...props}`) and other attributes' expression values are skipped as balanced `{ … }`
 * so a stray `>` or quote inside one can never end the tag early.
 */
function scanOpenTag(source: string, tagStart: number, limit: number): { attr?: AttrValue; end: number; selfClosing: boolean } {
  let i = tagStart + 1;
  while (i < limit && (IDENT_CHAR.test(source[i] ?? '') || source[i] === '.')) i++; // tag name (empty for a fragment `<>`)
  let attr: AttrValue | undefined;
  while (i < limit) {
    i = skipWsAndComments(source, i, limit);
    if (i >= limit) break;
    if (source[i] === '/' && source[i + 1] === '>') return { attr, end: i + 2, selfClosing: true };
    if (source[i] === '>') return { attr, end: i + 1, selfClosing: false };
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
    if (attrName === 'className' && attr === undefined) attr = { kind, start: i, end: valueEnd };
    i = valueEnd;
  }
  return { attr, end: i, selfClosing: false }; // ran off the end (malformed/truncated input): treat as closed here
}

interface JsxWalkResult { end: number; part?: PartInfo; fallback?: PartInfo; }

/**
 * Walk one JSX element — starting at `tagStart` (index of its `<`) — looking for the first
 * className that resolves to a static literal, per the ruling above: this element's own className
 * first, then its DIRECT JSX children in source order (never descending into a `{expression}`
 * child). Returns the index right after this element's own markup ends (its `/>`, or its matching
 * closing tag), plus either `part` (a fully-resolved literal — the caller's search is over) or
 * `fallback` (the EARLIEST non-qualifying className resolution found anywhere in this element's own
 * subtree, kept only as a last-resort reason if nothing qualifies in the whole return).
 */
function walkJsxElement(name: string, source: string, tagStart: number, limit: number): JsxWalkResult {
  const { attr, end: openEnd, selfClosing } = scanOpenTag(source, tagStart, limit);

  let fallback: PartInfo | undefined;
  if (attr) {
    const resolved = resolveAttrValue(name, source, attr);
    if (resolved.classes !== undefined) {
      resolved.targetTag = /^<([\w.-]+)/.exec(source.slice(tagStart, openEnd))?.[1];
      // Read-only structure for a native wrapper around one self-closing native element (Table).
      // The editable span remains the first literal; never evaluate expressions or child exports.
      const wrapperTag = /^<([a-z][a-z0-9-]*)\b/.exec(source.slice(tagStart, openEnd))?.[1];
      const childStart = skipWsAndComments(source, openEnd, limit);
      const childTag = /^<([a-z][a-z0-9-]*)\b/.exec(source.slice(childStart, limit))?.[1];
      if (!selfClosing && wrapperTag && childTag) {
        const child = scanOpenTag(source, childStart, limit);
        const afterChild = skipWsAndComments(source, child.end, limit);
        if (child.selfClosing && child.attr && source.startsWith(`</${wrapperTag}`, afterChild)) {
          const childPart = resolveAttrValue(name, source, child.attr);
          if (childPart.classes !== undefined) resolved.previewChild = { wrapperTag, tag: childTag, classes: childPart.classes };
        }
      }
      return { end: openEnd, part: resolved };
    }
    fallback = resolved; // dynamic/escaped/interpolated — a candidate reason, not a match
  }
  if (selfClosing) return { end: openEnd, fallback };

  // Open tag with children: scan for direct JSX children (recursing into each), until OUR closing
  // tag. Any `</…>` this loop sees directly (not already consumed by a recursive call) must be ours
  // — every nested element's own closing tag is fully consumed by its own recursive call first.
  let i = openEnd;
  while (i < limit) {
    const skipped = skipNonCode(source, i);
    if (skipped !== undefined) { i = skipped; continue; }
    if (source[i] === '{') { i = skipBraces(source, i); continue; } // opaque expression child
    if (source[i] === '<' && source[i + 1] === '/') {
      const closeGt = source.indexOf('>', i);
      return { end: closeGt === -1 ? limit : closeGt + 1, fallback };
    }
    if (source[i] === '<') {
      const child = walkJsxElement(name, source, i, limit);
      if (child.part) return { end: child.end, part: child.part };
      if (!fallback) fallback = child.fallback;
      i = child.end;
      continue;
    }
    i++; // plain JSX text content
  }
  return { end: limit, fallback }; // ran off the end without finding our own closing tag
}

// ---- className value -> PartInfo resolution -------------------------------------------------------

// Trailing trim is whitespace-only: a comment between a value and its following `,`/`)` is not a
// shape this adapter needs to support. Leading trim reuses `skipWsAndComments` (comment-aware) since
// a leading comment before an argument — e.g. `cn(\n  /* canon-allow */\n  "…", className)` — is
// real and must not be mistaken for the start of that argument's own text.
function trimEnd(source: string, start: number, limit: number): number {
  let j = limit;
  while (j > start && /\s/.test(source[j - 1])) j--;
  return j;
}

/** A direct `"..."`/`'...'`/interpolation-free `` `...` `` literal: `start`/`end` include the delimiters. */
function literalPart(name: string, source: string, start: number, end: number): PartInfo {
  const isTemplate = source[start] === '`';
  const content = source.slice(start + 1, end - 1);
  if (isTemplate && /\$\{/.test(content)) return { name, readOnlyReason: 'template interpolation' };
  if (content.includes('\\')) return { name, readOnlyReason: 'backslash escape in literal' };
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
    const s = skipWsAndComments(source, from, to);
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
  const contentStart = skipWsAndComments(source, braceStart + 1, braceEnd - 1);
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
 * the design doc's safe subset as amended by two controller rulings (see the file header): (1) the
 * part's editable element is the FIRST element in document order — within the subcomponent's own
 * return, bounded the same way the export scanner bounds a component's window, so this never crosses
 * into a sibling subcomponent — that carries a static className literal, descending through
 * className-less wrapper elements (and past elements whose className fails to resolve) to find it;
 * (2) ALL of the outer function's own top-level `return` statements are considered (guard clauses),
 * function/arrow-scope-aware so a nested closure's own `return` is never mistaken for one of them.
 *
 * A subcomponent with no traceable JSX at all (a plain alias like `const Dialog =
 * DialogPrimitive.Root`), or whose entire return (across every branch) has no element with a
 * className attribute anywhere, gets `readOnlyReason: 'no static className found'`. When at least one
 * element's className is present but doesn't resolve under the safe subset, the EARLIEST such
 * failure's own reason is used instead — `'dynamic classes only'` (a helper-const reference, a
 * `cva`-variants call, a ternary, no leading string literal, …), `'template interpolation'`, or
 * `'backslash escape in literal'` (refused rather than decoded) — even if a later, different failure
 * also occurred deeper in the tree or in a later branch. When more than one return branch yields a
 * literal, the first one's is used and `note` says so (see `resolveFromCandidates`).
 *
 * NOTE (deferred, tripwire only — no enforcement here): a `cva()` span and every part's span are
 * assumed structurally disjoint, because `cva()` calls live in a module-level `const xVariants = ...`
 * and this scanner only ever looks for a literal inside a JSX `className` attribute — never inside a
 * `cva()` call's own argument list. If a future change ever made a part's search enter a `cva()`
 * call's text (e.g. by broadening `exprPart`'s call-shape matching), that assumption would need an
 * explicit disjointness check against `findCva`'s span; T3's same-file cva+parts composition must not
 * violate it either.
 */
export function parseParts(source: string, includeTargets = false): PartInfo[] {
  return componentWindows(source).map(({ name, start, end }) => {
    const candidates = findCandidateStarts(source, start, end);
    const part = resolveFromCandidates(name, source, candidates, end);
    if (!includeTargets) delete part.targetTag;
    return part;
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

/** Locate the exported component that calls the first CVA binding. Ambiguous ownership is
 * left unknown rather than assigning a wrapper or a second CVA helper to the first spec. */
export function cvaOwner(source: string, span: {start:number;end:number}): string | undefined {
  const binding = source.slice(0,span.start).match(/\b(?:const|let|var)\s+([\w$]+)\s*=\s*$/)?.[1];
  if (!binding) return undefined;
  const owners = componentWindows(source).filter(({start,end}) => {
    for (let i=start;i<end;i++) {
      const skipped=skipNonCode(source,i);
      if(skipped!==undefined){i=skipped-1;continue;}
      if(i>=span.start && i<span.end){i=span.end-1;continue;}
      if(source.startsWith(binding,i) && !IDENT_CHAR.test(source[i-1]??'') && !IDENT_CHAR.test(source[i+binding.length]??'')) {
        const after=skipWsAndComments(source,i+binding.length,end);
        if(source[after]==='(') return true;
      }
    }
    return false;
  });
  return owners.length===1 ? owners[0].name : undefined;
}
