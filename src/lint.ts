import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import type { System, ResolvedToken } from './types.ts';
import { indexTokens } from './tokens/resolve.ts';
import { parseCssColor, distance } from './color.js';

export type Severity = 'error' | 'warn';
export interface Violation { file: string; line: number; col: number; rule: string; severity: Severity; message: string; snippet: string; suggestion?: string }
export interface LintResult { files: number; violations: Violation[]; summary: { errors: number; warnings: number } }

const EXT = new Set(['.css', '.scss', '.less', '.tsx', '.jsx', '.ts', '.js', '.mjs', '.html', '.vue', '.svelte', '.astro', '.mdx']);
const TW_PALETTES = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const SIZE_PROPS = 'font-size|line-height|letter-spacing|padding(?:-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?|margin(?:-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?|gap|row-gap|column-gap|border-radius|border-(?:top|bottom)-(?:left|right)-radius|border-(?:start|end)-(?:start|end)-radius|inset(?:-[a-z-]+)?|top|right|bottom|left';
const LAYOUT_PROPS = 'width|height|min-width|max-width|min-height|max-height|flex-basis';

function globToRe(g: string): RegExp {
  const re = g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '(?:.*/)?').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.');
  return new RegExp(`(^|/)${re}$`);
}

function walk(dir: string, exclude: RegExp[], out: string[]) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (exclude.some((r) => r.test(name) || r.test(p))) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exclude, out);
    else if (EXT.has(extname(name))) out.push(p);
  }
}

/** Strip comments but keep line structure so positions stay right. */
function stripComments(src: string, ext: string): string {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.vue', '.svelte', '.astro'].includes(ext)) s = s.replace(/(^|[^:'"\\])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
  if (['.html', '.vue', '.svelte', '.astro', '.mdx'].includes(ext)) s = s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  return s;
}

export interface Known { classes: Set<string>; props: Map<string, Record<string, Set<string>>>; colors: { name: string; hex: string; ref: string }[]; dims: { ref: string; px: number; group: string }[]; prefix: string }

export function knownFromSystem(system: System, idx: Map<string, ResolvedToken>): Known {
  const p = system.meta.prefix;
  const classes = new Set<string>();
  const props = new Map<string, Record<string, Set<string>>>();
  for (const c of system.components) {
    classes.add(`${p}-${c.slug}`);
    for (const a of c.anatomy) if (a.part !== 'root') classes.add(`${p}-${c.slug}__${a.part}`);
    props.set(`${p}-${c.slug}`, Object.fromEntries(Object.entries(c.props).map(([k, v]) => [k, new Set(v.values)])));
    for (const m of (c.extraCss ?? '').matchAll(/\.cn-([a-z0-9-]+(?:__[a-z0-9-]+)?)/g)) classes.add(`${p}-${m[1]}`);
  }
  for (const k of Object.keys(system.tokens.type)) classes.add(`${p}-text-${k}`);
  for (const u of ['icon', 'sr-only', 'tabular', 'truncate', 'container', 'prose', 'section', 'stack', 'row', 'grid', 'split', 'center', 'measure', 'mx-auto', 'flex-1', 'hide-mobile', 'show-mobile', 'placeholder']) classes.add(`${p}-${u}`);
  for (const pt of system.patterns) {
    for (const m of (pt.css ?? '').matchAll(/\.cn-([a-z0-9-]+(?:__[a-z0-9-]+)?)/g)) classes.add(`${p}-${m[1]}`);
    for (const m of (pt.html + (pt.variants ?? []).map((v) => v.html).join('')).matchAll(/\bcn-([a-z0-9-]+(?:__[a-z0-9-]+)?)/g)) classes.add(`${p}-${m[1]}`);
  }
  const colors: Known['colors'] = [];
  const dims: Known['dims'] = [];
  for (const t of idx.values()) {
    if (t.group === 'color') {
      const hex = parseCssColor(t.light);
      if (hex) colors.push({ name: t.path, hex, ref: t.cssVar });
    }
    if (['space', 'radius'].includes(t.group) || (t.group === 'font' && t.path.startsWith('size')) || (t.group === 'size' && !t.path.startsWith('container'))) {
      const m = t.light.match(/^([\d.]+)px$/);
      if (m) dims.push({ ref: t.cssVar, px: +m[1], group: t.group });
    }
  }
  return { classes, props, colors, dims, prefix: p };
}

function nearestColor(known: Known, value: string): string | undefined {
  const hex = parseCssColor(value);
  if (!hex) return undefined;
  let best: { d: number; c: Known['colors'][number] } | null = null;
  for (const c of known.colors) {
    if (!/^(color|)/.test(c.name)) continue;
    const d = distance(hex, c.hex);
    if (!best || d < best.d) best = { d, c };
  }
  if (!best) return undefined;
  const semantic = known.colors.filter((c) => c.ref.includes('-color-')).map((c) => ({ c, d: distance(hex, c.hex) })).sort((a, b) => a.d - b.d)[0];
  const parts = [`nearest: var(${best.c.ref}) ${best.c.hex}`];
  if (semantic && semantic.c.ref !== best.c.ref && semantic.d < 0.08) parts.push(`semantic: var(${semantic.c.ref}) ${semantic.c.hex}`);
  return parts.join(' · ');
}

function nearestDim(known: Known, px: number, prop: string): string | undefined {
  const group = /radius/.test(prop) ? 'radius' : /font-size/.test(prop) ? 'font' : 'space';
  const cands = known.dims.filter((d) => d.group === group);
  if (!cands.length) return undefined;
  const exact = cands.find((d) => d.px === px);
  if (exact) return `use var(${exact.ref})`;
  const near = [...cands].sort((a, b) => Math.abs(a.px - px) - Math.abs(b.px - px))[0];
  return `nearest: var(${near.ref}) = ${near.px}px`;
}

interface SourceSpan { text: string; start: number }
interface Attribute { name: string; start: number; value?: SourceSpan; expression: boolean }

/** Skip delimiters inside strings and nested expressions without evaluating code. */
function quotedEnd(src: string, start: number): number {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (quote === '\x60' && src[i] === '$' && src[i + 1] === '{') { i = groupEnd(src, i + 1); continue; }
    if (src[i++] === quote) return i;
  }
  return i;
}

function groupEnd(src: string, start: number): number {
  const close = ({ '{': '}', '[': ']', '(': ')' } as Record<string, string>)[src[start]];
  let i = start + 1;
  while (i < src.length) {
    if (/['"\x60]/.test(src[i])) { i = quotedEnd(src, i); continue; }
    if ('{[('.includes(src[i])) { i = groupEnd(src, i); continue; }
    if (src[i++] === close) return i;
  }
  return i;
}

/** Literal fragments inside class expressions, including template interpolations. */
function literalSpans(span: SourceSpan): SourceSpan[] {
  const out: SourceSpan[] = [];
  const src = span.text;
  for (let i = 0; i < src.length; i++) {
    if (!/['"\x60]/.test(src[i])) continue;
    const end = quotedEnd(src, i);
    if (src[i] !== '\x60') out.push({ text: src.slice(i + 1, end - 1), start: span.start + i + 1 });
    else {
      let part = i + 1;
      for (let j = part; j < end - 1; j++) {
        if (src[j] === '\\') { j++; continue; }
        if (src[j] !== '$' || src[j + 1] !== '{') continue;
        out.push({ text: src.slice(part, j), start: span.start + part });
        const next = groupEnd(src, j + 1);
        out.push(...literalSpans({ text: src.slice(j + 2, next - 1), start: span.start + j + 2 }));
        part = next;
        j = next - 1;
      }
      out.push({ text: src.slice(part, end - 1), start: span.start + part });
    }
    i = end - 1;
  }
  return out;
}

function staticValue(attr: Attribute): string | undefined {
  if (!attr.value) return undefined;
  if (!attr.expression) return attr.value.text;
  const text = attr.value.text.trim();
  if (/^['"\x60]/.test(text) && quotedEnd(text, 0) === text.length && !text.includes('$' + '{')) return text.slice(1, -1);
  if (/^(?:true|false|-?\d+(?:\.\d+)?)$/.test(text)) return text;
  return undefined;
}

/** Read complete opening tags; quoted > and JSX expressions never end a tag. */
function markupContexts(src: string, script: boolean): { tags: Attribute[][]; code: string } {
  const tags: Attribute[][] = [];
  const code = src.split('');
  const blank = (start: number, end: number) => { for (let i = start; i < end; i++) if (code[i] !== '\n') code[i] = ' '; };
  let depth = 0;
  let expressions = 0;
  for (let i = 0; i < src.length;) {
    if (script && (!depth || expressions) && /['"\x60]/.test(src[i])) { i = quotedEnd(src, i); continue; }
    if (src[i] === '{' && depth) { expressions++; i++; continue; }
    if (src[i] === '}' && expressions) { expressions--; i++; continue; }
    const closing = src.slice(i).match(/^<\/[A-Za-z][\w:.-]*\s*>/);
    if (closing) { blank(i, i + closing[0].length); depth = Math.max(0, depth - 1); i += closing[0].length; continue; }
    const tag = src.slice(i).match(/^<[A-Za-z][\w:.-]*(?=[\s/>])/);
    if (!tag) { if (depth && !expressions) blank(i, i + 1); i++; continue; }
    const start = i;
    i += tag[0].length;
    const attrs: Attribute[] = [];
    while (i < src.length && src[i] !== '>') {
      if (/[\s/]/.test(src[i])) { i++; continue; }
      if (src[i] === '{') { i = groupEnd(src, i); continue; }
      const name = src.slice(i).match(/^[\w:@.-]+/);
      if (!name) { i++; continue; }
      const attr: Attribute = { name: name[0], start: i, expression: false };
      i += name[0].length;
      while (/\s/.test(src[i] ?? '')) i++;
      if (src[i] === '=') {
        i++;
        while (/\s/.test(src[i] ?? '')) i++;
        if (/['"]/.test(src[i] ?? '')) {
          const end = quotedEnd(src, i);
          attr.value = { text: src.slice(i + 1, end - 1), start: i + 1 };
          i = end;
        } else if (src[i] === '{') {
          const end = groupEnd(src, i);
          attr.value = { text: src.slice(i + 1, end - 1), start: i + 1 };
          attr.expression = true;
          i = end;
        } else {
          const value = src.slice(i).match(/^[^\s>]+/)?.[0] ?? '';
          attr.value = { text: value, start: i };
          i += value.length;
        }
      }
      attrs.push(attr);
    }
    if (i >= src.length) break;
    if (src[i - 1] !== '/' && !/^<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tag[0])) depth++;
    tags.push(attrs);
    blank(start, ++i);
  }
  return { tags, code: code.join('') };
}

function declarationValues(span: SourceSpan, js: boolean, visit: (prop: string, value: SourceSpan, start: number, js: boolean) => void, template?: (span: SourceSpan) => void): void {
  const src = span.text;
  for (let i = 0; i < src.length;) {
    const start = i;
    let name: string;
    if (/['"\x60]/.test(src[i])) {
      const end = quotedEnd(src, i);
      name = src.slice(i + 1, end - 1);
      if (template && src[i] === '\x60' && /\b(?:css|keyframes|createGlobalStyle|styled(?:\.[\w$]+|\([^;{}]*\)))\s*$/.test(src.slice(0, i))) {
        template({ text: name, start: span.start + i + 1 });
      }
      i = end;
    } else {
      const word = src.slice(i).match(/^[A-Za-z_-][\w-]*/);
      if (!word) { i++; continue; }
      name = word[0];
      i += name.length;
    }
    let before = start - 1;
    while (before >= 0 && /\s/.test(src[before])) before--;
    if (before >= 0 && !(js ? '{,' : '{;}').includes(src[before])) continue;
    let colon = i;
    while (/\s/.test(src[colon] ?? '')) colon++;
    if (src[colon] !== ':') continue;
    let begin = colon + 1;
    while (/\s/.test(src[begin] ?? '')) begin++;
    let end = begin;
    while (end < src.length && !(js ? ',;}' : ';}').includes(src[end])) {
      if (/['"\x60]/.test(src[end])) end = quotedEnd(src, end);
      else if ('(['.includes(src[end]) || (js && src[end] === '{')) end = groupEnd(src, end);
      else if (src[end] === '{') break;
      else end++;
    }
    if (src[begin] !== '{') visit(name, { text: src.slice(begin, end), start: span.start + begin }, span.start + start, js);
  }
}

function withoutFunctions(src: string, names: string[]): string {
  let text = src;
  for (const match of src.matchAll(/\b([\w-]+)\s*\(/g)) {
    if (!names.includes(match[1])) continue;
    const end = groupEnd(src, match.index! + match[0].lastIndexOf('('));
    text = text.slice(0, match.index) + src.slice(match.index, end).replace(/[^\n]/g, ' ') + text.slice(end);
  }
  return text;
}

/** Lint syntax that carries styles or classes, retaining source offsets. */
export function lintSource(known: Known, file: string, content: string, opts: { tailwind: boolean } = { tailwind: true }): Violation[] {
  const ext = extname(file) || '.css';
  const src = stripComments(content, ext);
  const rawLines = content.split('\n');
  const lineStarts = [0];
  for (let i = 0; i < content.length; i++) if (content[i] === '\n') lineStarts.push(i + 1);
  const out: Violation[] = [];
  const push = (offset: number, rule: string, severity: Severity, message: string, suggestion?: string) => {
    let low = 0, high = lineStarts.length;
    while (low + 1 < high) { const mid = (low + high) >>> 1; if (lineStarts[mid] <= offset) low = mid; else high = mid; }
    const raw = rawLines[low] ?? '';
    if (/canon-(allow|ignore)/.test(raw) || /canon-(allow|ignore)/.test(rawLines[low - 1] ?? '')) return;
    out.push({ file, line: low + 1, col: offset - lineStarts[low] + 1, rule, severity, message, snippet: raw.trim().slice(0, 160), suggestion });
  };
  const p = known.prefix;
  const sizeProps = new RegExp('^(' + SIZE_PROPS + '|' + LAYOUT_PROPS + ')$');
  const layoutProps = new RegExp('^(' + LAYOUT_PROPS + ')$');
  const colorProps = /^(?:color|background(?:-[a-z-]+)?|border(?:-[a-z-]+)?|outline(?:-color)?|fill|stroke|text-decoration(?:-color)?|text-shadow|caret-color|accent-color|stop-color|flood-color|lighting-color|column-rule(?:-color)?|filter)$/;
  const style = (name: string, value: SourceSpan, offset: number, js: boolean) => {
    const prop = name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
    const val = value.text.trim();
    const safe = withoutFunctions(value.text, ['url', 'var']);
    if (colorProps.test(prop)) {
      for (const m of safe.matchAll(/(?<![\w&/.-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|oklch|oklab|color-mix)\(\s*[^)]*\)/g)) {
        if (/var\(/.test(value.text.slice(m.index!, m.index! + m[0].length))) continue;
        push(value.start + m.index!, 'raw-color', 'error', 'Raw color ' + m[0].slice(0, 40), nearestColor(known, m[0]));
      }
    }
    if (sizeProps.test(prop)) {
      const nums = [...safe.matchAll(/(-?\d+(?:\.\d+)?)(px|rem|em)\b/g)].map((m) => (m[2] === 'px' ? +m[1] : +m[1] * 16));
      if (js && /^-?\d+(?:\.\d+)?$/.test(val)) nums.push(Number(val));
      if (nums.some((n) => n !== 0 && Math.abs(n) !== 1)) {
        const layout = layoutProps.test(prop);
        push(offset, 'raw-size', layout ? 'warn' : 'error', 'Raw ' + name + ': ' + val, layout ? 'use a container/size token or a token-based calc()' : nearestDim(known, Math.abs(nums.find((n) => n !== 0 && Math.abs(n) !== 1)!), prop));
      }
    }
    if (prop === 'font-family' && !/var\(|\binherit\b/.test(val) && (!js || /^['"\x60]/.test(val))) {
      push(offset, 'raw-font', 'error', 'Raw ' + name + ' ' + val.slice(0, 60), 'use var(--' + p + '-font-family-sans|mono|display)');
    }
    if (prop === 'box-shadow' && !/var\(|\b(?:none|inherit)\b/.test(val) && (!js || /^['"\x60]/.test(val))) {
      push(offset, 'raw-shadow', 'error', 'Raw ' + name, 'use var(--' + p + '-shadow-xs|sm|md|lg|xl|focus)');
    }
    const stylingProperty = colorProps.test(prop) || sizeProps.test(prop) || prop === 'font-family' || prop === 'box-shadow';
    const important = !js || stylingProperty ? safe.indexOf('!important') : -1;
    if (important >= 0) push(value.start + important, 'important', 'warn', '!important hides a specificity problem', 'use the component variant/state instead');
  };
  const classes = (span: SourceSpan): string[] => {
    const roots: string[] = [];
    if (opts.tailwind) {
      const palette = new RegExp('(?<![\\w-])(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|divide|placeholder|accent|caret|shadow)-(' + TW_PALETTES.join('|') + ')-(25|50|100|200|300|400|500|600|700|800|900|950)(?:/\\d+)?\\b', 'g');
      for (const m of span.text.matchAll(palette)) {
        const primitive = known.colors.some((c) => c.name === m[2] + '.' + m[3]);
        push(span.start + m.index!, 'tailwind-palette', primitive ? 'warn' : 'error', (primitive ? 'Primitive color utility ' : 'Tailwind palette class ') + m[0], 'use a semantic color utility');
      }
      for (const m of span.text.matchAll(/(?<![\w-])[a-z-]+-\[(#[0-9a-fA-F]{3,8}|-?\d+(?:\.\d+)?(?:px|rem|em)|rgba?\([^\]]*\)|hsla?\([^\]]*\))\]/g)) {
        push(span.start + m.index!, 'tailwind-arbitrary', 'error', 'Arbitrary value ' + m[0], /#|rgb|hsl/.test(m[1]) ? nearestColor(known, m[1]) : 'use a scale utility (p-3, gap-4, text-sm…)');
      }
      for (const m of span.text.matchAll(/(?<![\w-])(text|leading|tracking|p[xytrbl]?|m[xytrbl]?|gap|rounded|w|h|top|left|right|bottom|inset|space-[xy])-\[[^\]]+\]/g)) {
        if (!/#|rgb|hsl|px|rem|em/.test(m[0])) push(span.start + m.index!, 'tailwind-arbitrary', 'error', 'Arbitrary value ' + m[0], 'use a scale utility');
      }
    }
    const classRe = new RegExp('(?<![\\w-])' + p + '-[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?', 'g');
    for (const m of span.text.matchAll(classRe)) {
      const cls = m[0];
      if (known.props.has(cls)) roots.push(cls);
      if (known.classes.has(cls)) continue;
      const base = cls.split('__')[0];
      push(span.start + m.index!, 'unknown-class', 'error', 'Unknown class ' + cls, known.classes.has(base) ? 'parts of ' + base + ': ' + [...known.classes].filter((k) => k.startsWith(base + '__')).map((k) => k.slice(base.length + 2)).join(', ') : 'known components: ' + [...known.props.keys()].slice(0, 12).join(', ') + '…');
    }
    return roots;
  };
  const css = (span: SourceSpan) => {
    declarationValues(span, false, style);
    for (const m of span.text.matchAll(/@apply\s+([^;{}]+)/g)) classes({ text: m[1], start: span.start + m.index! + m[0].indexOf(m[1]) });
  };
  const isCss = ['.css', '.scss', '.less'].includes(ext);
  if (isCss) css({ text: src, start: 0 });
  else {
    const isScript = ['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext);
    const contexts = markupContexts(src, isScript);
    if (isScript) declarationValues({ text: contexts.code, start: 0 }, true, style, css);
    else for (const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) declarationValues({ text: m[1], start: m.index! + m[0].indexOf(m[1]) }, true, style, css);
    for (const m of src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) css({ text: m[1], start: m.index! + m[0].indexOf(m[1]) });
    for (const attrs of contexts.tags) {
      const roots = new Set<string>();
      for (const attr of attrs) {
        if (!attr.value) continue;
        if (['class', 'className', ':class'].includes(attr.name)) {
          const spans = attr.expression || attr.name === ':class' ? literalSpans(attr.value) : [attr.value];
          for (const span of spans) for (const root of classes(span)) roots.add(root);
        } else if (['style', 'sx', ':style'].includes(attr.name)) {
          if (attr.expression || attr.name !== 'style') declarationValues(attr.value, true, style);
          else css(attr.value);
        } else if (colorProps.test(attr.name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()))) {
          style(attr.name, attr.value, attr.start, attr.expression);
        }
      }
      for (const attr of attrs) {
        if (!attr.name.startsWith('data-')) continue;
        const value = staticValue(attr);
        if (value === undefined) continue;
        const prop = attr.name.slice(5);
        const applicable = [...roots].filter((root) => known.props.get(root)?.[prop]);
        if (!applicable.length || applicable.some((root) => known.props.get(root)![prop].has(value))) continue;
        const allowed = [...new Set(applicable.flatMap((root) => [...known.props.get(root)![prop]]))];
        push(attr.start, 'unknown-prop-value', 'error', applicable.join(', ') + ': ' + attr.name + '="' + value + '" is not allowed', 'allowed: ' + allowed.join(', '));
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((v) => { const k = v.line + ':' + v.col + ':' + v.rule; if (seen.has(k)) return false; seen.add(k); return true; });
}

export async function runLint(system: System, designDir: string, opts: { paths?: string[]; root: string; changed?: boolean }): Promise<LintResult> {
  const idx = indexTokens(system.tokens, system.meta.prefix);
  const known = knownFromSystem(system, idx);
  const exclude = [...system.meta.lint.exclude, 'node_modules', '.git'].map((e) => new RegExp(`(^|/)${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)`));
  const allow = system.meta.lint.allow.map(globToRe);
  const designAbs = resolve(designDir);
  let files: string[] = [];
  if (opts.changed) {
    try {
      const outp = execSync('git diff --name-only HEAD; git ls-files --others --exclude-standard', { cwd: opts.root, encoding: 'utf8' });
      files = [...new Set(outp.split('\n').filter(Boolean))].map((f) => resolve(opts.root, f)).filter((f) => existsSync(f) && EXT.has(extname(f)));
    } catch { files = []; }
  } else if (opts.paths?.length) {
    for (const pth of opts.paths) {
      const abs = resolve(opts.root, pth);
      if (!existsSync(abs)) continue;
      if (statSync(abs).isDirectory()) walk(abs, exclude, files); else files.push(abs);
    }
  } else {
    for (const d of system.meta.lint.include) walk(resolve(opts.root, d), exclude, files);
    if (!files.length) walk(opts.root, exclude, files);
  }
  files = files.filter((f) => !f.startsWith(designAbs + '/') && !allow.some((r) => r.test(f)) && !exclude.some((r) => r.test(relative(opts.root, f))));
  const violations: Violation[] = [];
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    for (const v of lintSource(known, f, content, { tailwind: system.meta.lint.tailwind })) violations.push({ ...v, file: relative(opts.root, f) || f });
  }
  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col);
  return { files: files.length, violations, summary: { errors: violations.filter((v) => v.severity === 'error').length, warnings: violations.filter((v) => v.severity === 'warn').length } };
}

export function formatReport(res: LintResult): string {
  if (!res.violations.length) return `✓ canon lint: ${res.files} file(s), no violations`;
  const lines: string[] = [];
  let cur = '';
  for (const v of res.violations) {
    if (v.file !== cur) { cur = v.file; lines.push(`\n${cur}`); }
    lines.push(`  ${String(v.line).padStart(4)}:${String(v.col).padEnd(3)} ${v.severity === 'error' ? '✗' : '!'} ${v.rule.padEnd(18)} ${v.message}${v.suggestion ? `\n           → ${v.suggestion}` : ''}`);
  }
  lines.push(`\n${res.summary.errors} error(s), ${res.summary.warnings} warning(s) in ${res.files} file(s). Rules: DESIGN.md §7. Silence a line with /* canon-allow */.`);
  return lines.join('\n');
}
