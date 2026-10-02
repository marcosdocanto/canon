// shadcn/ui cva() parsing: a restricted-grammar scanner + recursive-descent parser for
// class-variance-authority calls, used to read a component's variant classes without a bundler
// or a real JS/TS parser. Anything outside the supported grammar throws CvaParseError naming the
// construct that broke it (see `Construct` below).
import type { CvaSpec } from '../types.ts';

type Construct = 'template interpolation' | 'spread' | 'identifier reference' | 'function call' | 'computed key' | 'unknown option' | 'unexpected token';

/** Thrown when a `cva()` call uses a construct outside the supported grammar. */
export class CvaParseError extends Error {
  construct: string;
  constructor(construct: Construct, at?: number) {
    super(at === undefined ? `cva: unsupported ${construct}` : `cva: unsupported ${construct} at offset ${at}`);
    this.name = 'CvaParseError';
    this.construct = construct;
  }
}

// Exported so other scanners in this adapter (parts.ts's JSX/className walker) can reuse the same
// comment/string/template/regex-skipping discipline instead of re-implementing it.
export const IDENT_CHAR = /[A-Za-z0-9_$]/;

// ---- Scanner: locate the first `cva( … )` call span without a real parser --------------------
// Walks the source once, skipping line/block comments, string/template literals (template
// literals recurse into `${ … }` interpolations so nested braces/strings/templates inside them
// don't confuse the scan), and regex literals (so a stray quote or `cva(`-looking text inside one
// can't desync the scan either) so that a `cva(` occurring inside any of those is never mistaken
// for a real call. Once a real `cva(` is found, the same skip logic is reused to walk forward
// with a paren-depth counter to the matching `)`.

function skipLineComment(source: string, i: number): number {
  const nl = source.indexOf('\n', i);
  return nl === -1 ? source.length : nl + 1;
}

function skipBlockComment(source: string, i: number): number {
  const end = source.indexOf('*/', i + 2);
  return end === -1 ? source.length : end + 2;
}

/** Skip a single- or double-quoted string starting at its opening quote, honoring `\`-escapes. */
function skipQuoted(source: string, i: number): number {
  const quote = source[i];
  const n = source.length;
  let j = i + 1;
  while (j < n && source[j] !== quote) { if (source[j] === '\\') j++; j++; }
  return j + 1;
}

// Regex-literal disambiguation: a bare `/` is ambiguous between "start of a regex literal" and
// "division operator". We use the standard lexer heuristic — a `/` starts a regex when the last
// non-whitespace code character before it is one of the listed punctuation marks, or the last
// word before it is one of the listed keywords, or it's the start of the file; otherwise it's
// division and left alone (falls through to a normal, un-skipped character).
const REGEX_PRECEDING_PUNCT = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';']);
const REGEX_PRECEDING_KEYWORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'yield', 'do', 'else']);

/** Find the code token immediately preceding `i`, skipping whitespace, to disambiguate `/`. */
function precedingToken(source: string, i: number): { kind: 'start' } | { kind: 'word'; word: string } | { kind: 'punct'; char: string } {
  let j = i - 1;
  while (j >= 0 && /\s/.test(source[j])) j--;
  if (j < 0) return { kind: 'start' };
  if (IDENT_CHAR.test(source[j])) {
    let start = j;
    while (start > 0 && IDENT_CHAR.test(source[start - 1])) start--;
    return { kind: 'word', word: source.slice(start, j + 1) };
  }
  return { kind: 'punct', char: source[j] };
}

function isRegexStart(source: string, i: number): boolean {
  const token = precedingToken(source, i);
  if (token.kind === 'start') return true;
  if (token.kind === 'punct') return REGEX_PRECEDING_PUNCT.has(token.char);
  return REGEX_PRECEDING_KEYWORDS.has(token.word);
}

/** Skip a regex literal starting at its leading `/`, honoring escapes and `[...]` character classes (where `/` doesn't close it), plus trailing flags. */
function skipRegex(source: string, i: number): number {
  const n = source.length;
  let j = i + 1;
  let inClass = false;
  while (j < n) {
    const c = source[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '\n') return j; // unterminated regex literal: bail without consuming the newline
    if (c === '[') { inClass = true; j++; continue; }
    if (c === ']') { inClass = false; j++; continue; }
    if (c === '/' && !inClass) {
      j++;
      while (j < n && /[A-Za-z]/.test(source[j])) j++; // flags
      return j;
    }
    j++;
  }
  return n;
}

/** Skip a template literal starting at its opening backtick, recursing into `${ … }` interpolations. */
function skipTemplate(source: string, i: number): number {
  const n = source.length;
  let j = i + 1;
  while (j < n) {
    const c = source[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '`') return j + 1;
    if (c === '$' && source[j + 1] === '{') { j = skipInterpolation(source, j + 2); continue; }
    j++;
  }
  return n;
}

/** Skip a `${ … }` interpolation body (`i` just past `${`), tracking nested braces/strings/comments/templates. */
function skipInterpolation(source: string, i: number): number {
  const n = source.length;
  let depth = 1;
  let j = i;
  while (j < n && depth > 0) {
    const skipped = skipNonCode(source, j);
    if (skipped !== undefined) { j = skipped; continue; }
    if (source[j] === '{') depth++;
    else if (source[j] === '}') depth--;
    j++;
  }
  return j;
}

/** If `i` starts a comment, a string/template literal, or a regex literal, return the index right after it; else undefined. */
export function skipNonCode(source: string, i: number): number | undefined {
  const c = source[i];
  if (c === '/' && source[i + 1] === '/') return skipLineComment(source, i);
  if (c === '/' && source[i + 1] === '*') return skipBlockComment(source, i);
  if (c === '"' || c === "'") return skipQuoted(source, i);
  if (c === '`') return skipTemplate(source, i);
  if (c === '/' && isRegexStart(source, i)) return skipRegex(source, i);
  return undefined;
}

/** Walk forward from just after `cva(` (paren depth already 1) to the matching `)`; returns the index after it. */
function findMatchingParen(source: string, start: number): number {
  const n = source.length;
  let depth = 1;
  let i = start;
  while (i < n && depth > 0) {
    const skipped = skipNonCode(source, i);
    if (skipped !== undefined) { i = skipped; continue; }
    if (source[i] === '(') depth++;
    else if (source[i] === ')') depth--;
    i++;
  }
  return i;
}

/**
 * Find the first `cva( … )` call expression in `source`: a `cva(` preceded by a non-identifier
 * character (or the start of file) at normal code state — never inside a comment or a
 * string/template literal. Returns the span from `cva(`'s `c` through the matching `)`, inclusive.
 */
export function findCva(source: string): { start: number; end: number } | undefined {
  const n = source.length;
  let i = 0;
  while (i < n) {
    const skipped = skipNonCode(source, i);
    if (skipped !== undefined) { i = skipped; continue; }
    if (source[i] === 'c' && source.startsWith('cva(', i) && !IDENT_CHAR.test(source[i - 1] ?? '')) {
      return { start: i, end: findMatchingParen(source, i + 4) };
    }
    i++;
  }
  return undefined;
}

// ---- Recursive-descent parser over the call's argument text ----------------------------------

/** A parsed JS literal value: the only shapes the restricted grammar allows. */
type Value = string | boolean | number | Value[] | { [key: string]: Value };

/**
 * Parse the `cva(...)` call at `span` (as found by `findCva`) into a `CvaSpec`.
 *
 * Grammar: first arg is a string literal or array of string literals (the base classes); second
 * arg (optional) is an object literal with `variants` (object of object of string | string[]),
 * `compoundVariants` (array of object literals matching variant keys to string/boolean/number
 * literals, with `class` or `className` holding the applied classes — real shadcn sources use
 * either key; both are accepted and normalized into `classes`), and `defaultVariants` (object of
 * string | boolean literals). String literals: single or double quotes. Template literals without
 * `${…}` interpolation are accepted as plain strings. Anything else — an interpolated template, a
 * spread, an identifier other than `true`/`false`, a function call, a computed key, an unknown
 * top-level key on the options object, or any other unrecognized token — throws `CvaParseError`
 * naming the construct.
 */
export function parseCva(source: string, span: { start: number; end: number }): CvaSpec {
  let pos = span.start;

  function fail(construct: Construct): never {
    throw new CvaParseError(construct, pos);
  }

  function at(offset = 0): string {
    const p = pos + offset;
    return p < span.end ? source[p] : '';
  }

  function skipTrivia(): void {
    while (pos < span.end) {
      const c = source[pos];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { pos++; continue; }
      if (c === '/' && source[pos + 1] === '/') { pos = Math.min(skipLineComment(source, pos), span.end); continue; }
      if (c === '/' && source[pos + 1] === '*') { pos = Math.min(skipBlockComment(source, pos), span.end); continue; }
      break;
    }
  }

  function unescape(escaped: string): string {
    switch (escaped) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'v': return '\v';
      case '0': return '\0';
      default: return escaped; // \\  \'  \"  \`  \$  and any other unnecessary escape: literal char
    }
  }

  function parseStringLiteral(): string {
    const quote = source[pos];
    pos++;
    let out = '';
    while (pos < span.end && source[pos] !== quote) {
      if (source[pos] === '\\') { out += unescape(at(1)); pos += 2; continue; }
      out += source[pos];
      pos++;
    }
    if (pos >= span.end || source[pos] !== quote) fail('unexpected token');
    pos++;
    return out;
  }

  function parseTemplateLiteral(): string {
    pos++; // consume opening backtick
    let out = '';
    while (pos < span.end && source[pos] !== '`') {
      if (source[pos] === '\\') { out += unescape(at(1)); pos += 2; continue; }
      if (source[pos] === '$' && at(1) === '{') fail('template interpolation');
      out += source[pos];
      pos++;
    }
    if (pos >= span.end || source[pos] !== '`') fail('unexpected token');
    pos++;
    return out;
  }

  function parseNumber(): number {
    const start = pos;
    if (at() === '-') pos++;
    while (pos < span.end && /[0-9]/.test(source[pos])) pos++;
    if (at() === '.') { pos++; while (pos < span.end && /[0-9]/.test(source[pos])) pos++; }
    return Number(source.slice(start, pos));
  }

  function parseArray(): Value[] {
    pos++; // consume '['
    const items: Value[] = [];
    skipTrivia();
    if (at() === ']') { pos++; return items; }
    for (;;) {
      items.push(parseValue());
      skipTrivia();
      if (at() === ',') { pos++; skipTrivia(); if (at() === ']') { pos++; break; } continue; }
      if (at() === ']') { pos++; break; }
      fail('unexpected token');
    }
    return items;
  }

  function parseKey(): string {
    skipTrivia();
    const c = at();
    if (c === '"' || c === "'") return parseStringLiteral();
    if (c === '.' && at(1) === '.' && at(2) === '.') fail('spread');
    if (c === '[') fail('computed key');
    if (IDENT_CHAR.test(c) && !/[0-9]/.test(c)) {
      const start = pos;
      while (pos < span.end && IDENT_CHAR.test(source[pos])) pos++;
      return source.slice(start, pos);
    }
    fail('unexpected token');
  }

  function parseObject(): Record<string, Value> {
    pos++; // consume '{'
    const obj: Record<string, Value> = {};
    skipTrivia();
    if (at() === '}') { pos++; return obj; }
    for (;;) {
      skipTrivia();
      if (at() === '.' && at(1) === '.' && at(2) === '.') fail('spread');
      const key = parseKey();
      skipTrivia();
      if (at() !== ':') fail('unexpected token');
      pos++;
      const value = parseValue();
      obj[key] = value;
      skipTrivia();
      if (at() === ',') { pos++; skipTrivia(); if (at() === '}') { pos++; break; } continue; }
      if (at() === '}') { pos++; break; }
      fail('unexpected token');
    }
    return obj;
  }

  function parseValue(): Value {
    skipTrivia();
    const c = at();
    if (c === '"' || c === "'") return parseStringLiteral();
    if (c === '`') return parseTemplateLiteral();
    if (c === '[') return parseArray();
    if (c === '{') return parseObject();
    if (c === '.' && at(1) === '.' && at(2) === '.') fail('spread');
    if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(at(1)))) return parseNumber();
    if (IDENT_CHAR.test(c)) {
      const start = pos;
      while (pos < span.end && IDENT_CHAR.test(source[pos])) pos++;
      const word = source.slice(start, pos);
      if (word === 'true') return true;
      if (word === 'false') return false;
      skipTrivia();
      if (at() === '(') fail('function call');
      fail('identifier reference');
    }
    fail('unexpected token');
  }

  /** Normalize a class value to `string[]`: a string is one entry, an array flattens to its literals. */
  function toClassArray(value: Value): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : fail('unexpected token')));
    return fail('unexpected token');
  }

  function asVariants(value: Value): Record<string, Record<string, string[]>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail('unexpected token');
    const out: Record<string, Record<string, string[]>> = {};
    for (const [variantName, options] of Object.entries(value)) {
      if (typeof options !== 'object' || options === null || Array.isArray(options)) fail('unexpected token');
      const inner: Record<string, string[]> = {};
      for (const [optionName, classes] of Object.entries(options)) inner[optionName] = toClassArray(classes);
      out[variantName] = inner;
    }
    return out;
  }

  function asCompoundVariants(value: Value): CvaSpec['compoundVariants'] {
    if (!Array.isArray(value)) return fail('unexpected token');
    return value.map((entry) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return fail('unexpected token');
      const match: Record<string, string | boolean> = {};
      let classes: string[] | undefined;
      for (const [key, v] of Object.entries(entry)) {
        if (key === 'class' || key === 'className') { classes = toClassArray(v); continue; }
        // CvaSpec['match'] is typed string | boolean; a numeric literal is normalized to its string form.
        if (typeof v === 'number') { match[key] = String(v); continue; }
        if (typeof v === 'string' || typeof v === 'boolean') { match[key] = v; continue; }
        fail('unexpected token');
      }
      if (classes === undefined) fail('unexpected token'); // compoundVariants entry missing class/className
      return { match, classes };
    });
  }

  function asDefaultVariants(value: Value): Record<string, string | boolean> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail('unexpected token');
    const out: Record<string, string | boolean> = {};
    for (const [key, v] of Object.entries(value)) {
      if (typeof v === 'string' || typeof v === 'boolean') { out[key] = v; continue; }
      fail('unexpected token');
    }
    return out;
  }

  if (source.slice(pos, pos + 4) !== 'cva(') fail('unexpected token');
  pos += 4;

  const base = toClassArray(parseValue());

  skipTrivia();
  let options: Record<string, Value> = {};
  if (at() === ',') {
    pos++;
    skipTrivia();
    if (at() !== ')') {
      if (at() !== '{') fail('unexpected token');
      options = parseObject();
      for (const key of Object.keys(options)) {
        if (key !== 'variants' && key !== 'compoundVariants' && key !== 'defaultVariants') fail('unknown option');
      }
      skipTrivia();
      if (at() === ',') { pos++; skipTrivia(); }
    }
  }

  if (at() !== ')') fail('unexpected token');
  pos++;
  if (pos !== span.end) fail('unexpected token');

  return {
    base,
    variants: 'variants' in options ? asVariants(options.variants) : {},
    compoundVariants: 'compoundVariants' in options ? asCompoundVariants(options.compoundVariants) : [],
    defaultVariants: 'defaultVariants' in options ? asDefaultVariants(options.defaultVariants) : {},
  };
}

// ---- Printer + byte-exact splice write-back ---------------------------------------------------

/** A plain identifier prints bare; anything else (e.g. `"2xl"`) prints as a quoted string literal. */
function printKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

/** A single class-list entry prints as one double-quoted string; more than one prints as `[...]`. */
function printClassValue(classes: string[]): string {
  return classes.length === 1 ? JSON.stringify(classes[0]) : `[${classes.map((c) => JSON.stringify(c)).join(', ')}]`;
}

function printMatchValue(value: string | boolean): string {
  return typeof value === 'boolean' ? String(value) : JSON.stringify(value);
}

const step = (indent: string, depth: number): string => indent + '  '.repeat(depth);

/**
 * Print a `CvaSpec` back into a `cva(...)` call expression, deterministically: `cva(\n` then the
 * base classes (one double-quoted string, or `[...]` for more than one), then — only when any of
 * `variants` / `compoundVariants` / `defaultVariants` is non-empty — a multi-line options object,
 * each level stepping two spaces from `indent`. `compoundVariants` entries always print their
 * class list under `class:` (never `className:`), per the printer's normalization ruling — the
 * parser accepts either key on read, but the printer standardizes to one on write.
 */
export function printCva(spec: CvaSpec, indent: string): string {
  const variantNames = Object.keys(spec.variants);
  const defaultNames = Object.keys(spec.defaultVariants);
  const hasOptions = variantNames.length > 0 || spec.compoundVariants.length > 0 || defaultNames.length > 0;

  const lines: string[] = ['cva(', `${step(indent, 1)}${printClassValue(spec.base)},`];

  if (hasOptions) {
    lines.push(`${step(indent, 1)}{`);

    if (variantNames.length > 0) {
      lines.push(`${step(indent, 2)}variants: {`);
      for (const name of variantNames) {
        lines.push(`${step(indent, 3)}${printKey(name)}: {`);
        for (const [optionName, classes] of Object.entries(spec.variants[name])) {
          lines.push(`${step(indent, 4)}${printKey(optionName)}: ${printClassValue(classes)},`);
        }
        lines.push(`${step(indent, 3)}},`);
      }
      lines.push(`${step(indent, 2)}},`);
    }

    if (spec.compoundVariants.length > 0) {
      lines.push(`${step(indent, 2)}compoundVariants: [`);
      for (const { match, classes } of spec.compoundVariants) {
        lines.push(`${step(indent, 3)}{`);
        for (const [key, value] of Object.entries(match)) {
          lines.push(`${step(indent, 4)}${printKey(key)}: ${printMatchValue(value)},`);
        }
        lines.push(`${step(indent, 4)}class: ${printClassValue(classes)},`);
        lines.push(`${step(indent, 3)}},`);
      }
      lines.push(`${step(indent, 2)}],`);
    }

    if (defaultNames.length > 0) {
      lines.push(`${step(indent, 2)}defaultVariants: {`);
      for (const name of defaultNames) {
        lines.push(`${step(indent, 3)}${printKey(name)}: ${printMatchValue(spec.defaultVariants[name])},`);
      }
      lines.push(`${step(indent, 2)}},`);
    }

    lines.push(`${step(indent, 1)}}`);
  }

  lines.push(`${indent})`);
  return lines.join('\n');
}

/**
 * Replace the `cva( … )` call at `span` in `source` with `spec`, printed. The replacement indent
 * is the leading whitespace of the line containing `span.start` (not just the text immediately
 * before `cva(`, so a call nested after other code on its line still picks up the line's own
 * indentation). When `source` uses CRLF line endings (detected by the presence of any `\r\n`),
 * the printed text's `\n`s are rewritten to `\r\n` to match. Everything outside `[span.start,
 * span.end)` is passed through byte-for-byte.
 */
export function spliceCva(source: string, span: { start: number; end: number }, spec: CvaSpec): string {
  const lineStart = source.lastIndexOf('\n', span.start - 1) + 1;
  const indent = /^[ \t]*/.exec(source.slice(lineStart, span.start))![0];
  let printed = printCva(spec, indent);
  if (source.includes('\r\n')) printed = printed.replace(/\n/g, '\r\n');
  return source.slice(0, span.start) + printed + source.slice(span.end);
}
