// The canon engine: pure functions shared by the Node build and the browser
// editor. No Node APIs here. Everything that turns a System (tokens +
// component specs) into CSS lives in this file so the two never disagree.

export const REF_RE = /\{([a-zA-Z0-9_.-]+)\}/g;

/**
 * Index every token as a resolved record keyed by its short reference
 * ("space.3", "color.bg-canvas", "neutral.500", "font.size.sm", …).
 * @returns {Map<string, {ref:string, cssVar:string, light:string, dark:string, themed:boolean, group:string, path:string, description?:string}>}
 */
export function indexTokens(tokens, prefix) {
  const idx = new Map();
  const v = (path) => `--${prefix}-${path.replace(/\./g, '-')}`;
  const add = (ref, group, path, light, dark, themed, description, cssVar) =>
    idx.set(ref, { ref: `{${ref}}`, cssVar: cssVar ?? v(`${group}.${path}`), light, dark, themed, group, path, description });

  for (const [name, val] of Object.entries(tokens.color.primitive)) {
    if (typeof val === 'string') add(name, 'color', name, val, val, false, undefined, v(name));
    else for (const [step, hex] of Object.entries(val)) add(`${name}.${step}`, 'color', `${name}.${step}`, hex, hex, false, undefined, v(`${name}.${step}`));
  }
  for (const [name, val] of Object.entries(tokens.color.semantic)) add(`color.${name}`, 'color', name, val.light, val.dark, true, val.description);
  const FONT_PATH = { family: 'family', size: 'size', weight: 'weight', lineHeight: 'leading', letterSpacing: 'tracking', control: 'control' };
  for (const [sub, map] of Object.entries(tokens.font)) {
    for (const [k, val] of Object.entries(map)) add(`font.${sub}.${k}`, 'font', `${FONT_PATH[sub] ?? sub}.${k}`, val, val, false);
  }
  for (const [k, val] of Object.entries(tokens.space)) add(`space.${k}`, 'space', k, val, val, false);
  for (const [k, val] of Object.entries(tokens.radius)) add(`radius.${k}`, 'radius', k, val, val, false);
  for (const [k, val] of Object.entries(tokens.border.width)) add(`border.width.${k}`, 'border', `width.${k}`, val, val, false);
  for (const [k, val] of Object.entries(tokens.shadow)) add(`shadow.${k}`, 'shadow', k, val.light, val.dark, true, val.description);
  for (const [sub, map] of Object.entries(tokens.size)) {
    for (const [k, val] of Object.entries(map)) add(`size.${sub}.${k}`, 'size', `${sub}.${k}`, val, val, false);
  }
  for (const [k, val] of Object.entries(tokens.z)) add(`z.${k}`, 'z', k, val, val, false);
  for (const [k, val] of Object.entries(tokens.motion.duration)) add(`motion.duration.${k}`, 'motion', `duration.${k}`, val, val, false);
  for (const [k, val] of Object.entries(tokens.motion.easing)) add(`motion.easing.${k}`, 'motion', `easing.${k}`, val, val, false);
  for (const [k, val] of Object.entries(tokens.breakpoint)) add(`breakpoint.${k}`, 'breakpoint', k, val, val, false);
  for (const [k, val] of Object.entries(tokens.opacity)) add(`opacity.${k}`, 'opacity', k, val, val, false);
  for (const [k, ts] of Object.entries(tokens.type)) {
    add(`type.${k}.family`, 'type', `${k}.family`, ts.family, ts.family, false);
    add(`type.${k}.size`, 'type', `${k}.size`, ts.size, ts.size, false);
    add(`type.${k}.weight`, 'type', `${k}.weight`, ts.weight, ts.weight, false);
    add(`type.${k}.lineHeight`, 'type', `${k}.leading`, ts.lineHeight, ts.lineHeight, false);
    add(`type.${k}.letterSpacing`, 'type', `${k}.tracking`, ts.letterSpacing, ts.letterSpacing, false);
    add(`type.${k}.transform`, 'type', `${k}.transform`, ts.transform ?? 'none', ts.transform ?? 'none', false);
  }
  const resolveLiteral = (value, theme, depth = 0) => {
    if (depth > 12) throw new Error(`Token reference cycle in "${value}"`);
    return value.replace(REF_RE, (_m, ref) => {
      const t = idx.get(ref);
      if (!t) throw new Error(`Unknown token reference {${ref}}`);
      return resolveLiteral(theme === 'light' ? t.light : t.dark, theme, depth + 1);
    });
  };
  for (const t of idx.values()) {
    const l = resolveLiteral(t.light, 'light');
    const d = resolveLiteral(t.dark, 'dark');
    t.themed = t.themed || l !== d;
    t.light = l; t.dark = d;
  }
  return idx;
}

/** Replace {refs} in a CSS value with var(--prefix-…). Unknown refs throw. */
export function toCssVars(value, idx) {
  return value.replace(REF_RE, (_m, ref) => {
    const t = idx.get(ref);
    if (!t) throw new Error(`Unknown token reference {${ref}}`);
    // Breakpoints are used inside @media/@container, where var() is not allowed.
    if (t.group === 'breakpoint') return t.light;
    return `var(${t.cssVar})`;
  });
}

/** Replace {refs} with literal values for a theme. */
export function toLiteral(value, idx, theme = 'light') {
  return value.replace(REF_RE, (_m, ref) => {
    const t = idx.get(ref);
    if (!t) throw new Error(`Unknown token reference {${ref}}`);
    return theme === 'light' ? t.light : t.dark;
  });
}

export function isThemed(value, idx) {
  let themed = false;
  value.replace(REF_RE, (_m, ref) => { if (idx.get(ref)?.themed) themed = true; return ''; });
  return themed;
}

export function refsIn(value) {
  const out = [];
  value.replace(REF_RE, (_m, ref) => { out.push(ref); return ''; });
  return out;
}

/** Substitute the canonical "cn-" class prefix used inside specs with the system prefix. */
export function rePrefix(s, prefix) {
  return prefix === 'cn' ? s : s.replace(/\bcn-/g, `${prefix}-`);
}

function applyState(base, stateSelector) {
  return stateSelector
    .split(/,\s*/)
    .map((piece) => (piece.startsWith('&') ? base + piece.slice(1) : base + piece))
    .join(', ');
}

/**
 * Flatten a component spec into ordered CSS rules (selectors + raw declarations with {refs}).
 * Each rule carries `origin` so the editor can map a rule back to the spec location.
 * @returns {{selector:string, declarations:Record<string,string>, origin:{scope:string, part:string, state?:string}}[]}
 */
export function componentRules(spec, prefix) {
  const root = `.${prefix}-${spec.slug}`;
  const partSel = (part) => (part === 'root' ? '' : ` .${prefix}-${spec.slug}__${part}`);
  const rules = [];
  const emit = (base, block, scope) => {
    if (!block) return;
    for (const [part, decls] of Object.entries(block)) {
      if (part === '@states' || !decls) continue;
      const sel = base.split(/,\s*/).map((b) => b + partSel(part)).join(', ');
      rules.push({ selector: sel, declarations: decls, origin: { scope, part } });
    }
    const states = block['@states'] ?? {};
    for (const [state, parts] of Object.entries(states)) {
      const st = spec.states[state];
      if (!st) throw new Error(`${spec.name}: block references unknown state "${state}"`);
      const stateSel = rePrefix(st.selector, prefix);
      const stateBase = applyState(base, stateSel);
      for (const [part, decls] of Object.entries(parts)) {
        // A state selector that already names the part (" .p-x__item:hover") targets it directly.
        const targetsPart = part !== 'root' && stateSel.includes(`__${part}`);
        const sel = stateBase.split(/,\s*/).map((b) => b + (targetsPart ? '' : partSel(part))).join(', ');
        rules.push({ selector: sel, declarations: decls, origin: { scope, part, state } });
      }
    }
  };
  emit(root, spec.base, 'base');
  for (const [axis, values] of Object.entries(spec.variants ?? {})) {
    for (const [value, block] of Object.entries(values)) emit(`${root}[data-${axis}="${value}"]`, block, `variants.${axis}.${value}`);
  }
  (spec.compound ?? []).forEach((c, i) => {
    const sel = root + Object.entries(c.when).map(([a, v]) => `[data-${a}="${v}"]`).join('');
    emit(sel, c.block, `compound.${i}`);
  });
  return rules;
}

function renderDecls(decls, idx, annotate, prefix = 'cn') {
  return Object.entries(decls)
    .map(([prop, value]) => {
      value = rePrefix(value, prefix);
      const css = toCssVars(value, idx);
      if (!annotate || css === value) return `  ${prop}: ${css};`;
      const l = toLiteral(value, idx, 'light');
      const d = toLiteral(value, idx, 'dark');
      return `  ${prop}: ${css}; /* ${l}${d !== l ? ` · dark: ${d}` : ''} */`;
    })
    .join('\n');
}

export function renderRules(rules, idx, annotate = false, prefix = 'cn') {
  return rules.filter((r) => Object.keys(r.declarations).length).map((r) => `${r.selector} {\n${renderDecls(r.declarations, idx, annotate, prefix)}\n}`).join('\n');
}

export function componentCss(spec, idx, prefix, annotate = false) {
  const head = `/* ---- ${spec.name} (.${prefix}-${spec.slug}) ---- */`;
  const body = renderRules(componentRules(spec, prefix), idx, annotate, prefix);
  const extra = spec.extraCss ? '\n' + withContainerQueries(toCssVars(rePrefix(spec.extraCss.trim(), prefix), idx)) : '';
  return `${head}\n${body}${extra}\n`;
}

function groupBy(arr, key) {
  const out = {};
  for (const x of arr) (out[key(x)] ??= []).push(x);
  return out;
}

export function tokensCss(system, idx) {
  const def = system.meta.defaultTheme;
  const other = def === 'light' ? 'dark' : 'light';
  const all = [...idx.values()];
  const line = (t, theme) => `  ${t.cssVar}: ${theme === 'light' ? t.light : t.dark};`;
  const groups = groupBy(all, (t) => t.group);
  const defaultBlock = Object.entries(groups)
    .map(([g, ts]) => `  /* ${g} */\n` + ts.map((t) => line(t, def)).join('\n'))
    .join('\n');
  const themed = all.filter((t) => t.themed);
  const otherBlock = themed.map((t) => line(t, other)).join('\n');
  return [
    `/* ${system.meta.name} — design tokens. Generated by canon; edit design/tokens.json, not this file. */`,
    `:root {\n  color-scheme: ${def};\n${defaultBlock}\n}`,
    `:root[data-theme="${other}"] {\n  color-scheme: ${other};\n${otherBlock}\n}`,
    `@media (prefers-color-scheme: ${other}) {\n  :root:not([data-theme="${def}"]) {\n    color-scheme: ${other};\n${otherBlock.replace(/^/gm, '  ')}\n  }\n}`,
    '',
  ].join('\n\n');
}

export function baseCss(system, idx) {
  return withContainerQueries(baseCssRaw(system, idx));
}
function baseCssRaw(system, idx) {
  const p = system.meta.prefix;
  const v = (ref) => toCssVars(`{${ref}}`, idx);
  const typeUtils = Object.entries(system.tokens.type)
    .map(([name, ts]) =>
      `.${p}-text-${name} {\n  font-family: ${v(`type.${name}.family`)};\n  font-size: ${v(`type.${name}.size`)};\n  font-weight: ${v(`type.${name}.weight`)};\n  line-height: ${v(`type.${name}.lineHeight`)};\n  letter-spacing: ${v(`type.${name}.letterSpacing`)};${ts.transform ? `\n  text-transform: ${ts.transform};` : ''}${name.startsWith('numeric') ? '\n  font-variant-numeric: tabular-nums;' : ''}\n}`,
    )
    .join('\n');
  return `/* ---- base: reset + primitives ---- */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; scrollbar-gutter: stable; }
body {
  margin: 0;
  background-color: ${v('color.bg-canvas')};
  color: ${v('color.fg-default')};
  font-family: ${v('font.family.sans')};
  font-size: ${v('font.size.md')};
  line-height: ${v('font.lineHeight.normal')};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: "cv11", "ss01";
}
h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd { margin: 0; }
ul, ol { margin: 0; padding: 0; list-style: none; }
img, svg, video, canvas { display: block; max-width: 100%; }
button, input, select, textarea { font: inherit; color: inherit; letter-spacing: inherit; }
a { color: inherit; text-decoration: none; }
hr { border: 0; border-top: 1px solid ${v('color.border-default')}; margin: 0; }
::selection { background-color: ${v('color.bg-inverse')}; color: ${v('color.fg-inverse')}; }
:focus-visible { outline: 2px solid ${v('color.border-action')}; outline-offset: 2px; }
.${p}-icon { width: 1em; height: 1em; flex-shrink: 0; }
.${p}-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.${p}-tabular { font-variant-numeric: tabular-nums; }
.${p}-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.${p}-container { width: 100%; max-width: ${v('size.container.xl')}; margin-inline: auto; padding-inline: ${v('space.8')}; }
.${p}-container[data-size="sm"] { max-width: ${v('size.container.sm')}; }
.${p}-container[data-size="md"] { max-width: ${v('size.container.md')}; }
.${p}-container[data-size="lg"] { max-width: ${v('size.container.lg')}; }
.${p}-container[data-size="2xl"] { max-width: ${v('size.container.2xl')}; }
.${p}-section { padding-block: ${v('space.24')}; background-color: ${v('color.bg-canvas')}; }
.${p}-section[data-padding="sm"] { padding-block: ${v('space.12')}; }
.${p}-section[data-padding="md"] { padding-block: ${v('space.16')}; }
.${p}-section[data-padding="none"] { padding-block: 0; }
.${p}-section[data-bg="subtle"] { background-color: ${v('color.bg-subtle')}; }
.${p}-section[data-bg="surface"] { background-color: ${v('color.bg-surface')}; }
.${p}-section[data-bg="inverse"] { background-color: ${v('color.bg-inverse')}; color: ${v('color.fg-inverse')}; }
.${p}-section[data-bg="brand"] { background-color: ${v('color.bg-action')}; color: ${v('color.fg-on-action')}; }
.${p}-section[data-bg="brand-subtle"] { background-color: ${v('color.bg-action-subtle')}; }
.${p}-stack { display: flex; flex-direction: column; gap: ${v('space.4')}; min-width: 0; }
.${p}-row { display: flex; flex-direction: row; align-items: center; gap: ${v('space.4')}; min-width: 0; }
.${p}-row[data-wrap] { flex-wrap: wrap; }
.${p}-row[data-align="start"], .${p}-stack[data-align="start"] { align-items: flex-start; }
.${p}-row[data-align="end"], .${p}-stack[data-align="end"] { align-items: flex-end; }
.${p}-row[data-align="stretch"], .${p}-stack[data-align="stretch"] { align-items: stretch; }
.${p}-row[data-align="center"], .${p}-stack[data-align="center"] { align-items: center; }
.${p}-row[data-justify="between"] { justify-content: space-between; }
.${p}-row[data-justify="center"], .${p}-stack[data-justify="center"] { justify-content: center; }
.${p}-row[data-justify="end"] { justify-content: flex-end; }
.${p}-grid { display: grid; gap: ${v('space.6')}; min-width: 0; grid-template-columns: repeat(var(--${p}-cols, 3), minmax(0, 1fr)); }
.${p}-grid[data-cols="1"] { --${p}-cols: 1; } .${p}-grid[data-cols="2"] { --${p}-cols: 2; } .${p}-grid[data-cols="3"] { --${p}-cols: 3; } .${p}-grid[data-cols="4"] { --${p}-cols: 4; } .${p}-grid[data-cols="5"] { --${p}-cols: 5; } .${p}-grid[data-cols="6"] { --${p}-cols: 6; }
.${p}-split { display: grid; grid-template-columns: 1fr 1fr; gap: ${v('space.16')}; align-items: center; min-width: 0; }
.${p}-split[data-ratio="1:2"] { grid-template-columns: 1fr 2fr; } .${p}-split[data-ratio="2:1"] { grid-template-columns: 2fr 1fr; } .${p}-split[data-ratio="1:3"] { grid-template-columns: 1fr 3fr; } .${p}-split[data-align="start"] { align-items: start; }
.${p}-stack[data-gap="0"], .${p}-row[data-gap="0"], .${p}-grid[data-gap="0"] { gap: 0; }
.${p}-stack[data-gap="1"], .${p}-row[data-gap="1"], .${p}-grid[data-gap="1"] { gap: ${v('space.1')}; }
.${p}-stack[data-gap="2"], .${p}-row[data-gap="2"], .${p}-grid[data-gap="2"] { gap: ${v('space.2')}; }
.${p}-stack[data-gap="3"], .${p}-row[data-gap="3"], .${p}-grid[data-gap="3"] { gap: ${v('space.3')}; }
.${p}-stack[data-gap="4"], .${p}-row[data-gap="4"], .${p}-grid[data-gap="4"] { gap: ${v('space.4')}; }
.${p}-stack[data-gap="5"], .${p}-row[data-gap="5"], .${p}-grid[data-gap="5"] { gap: ${v('space.5')}; }
.${p}-stack[data-gap="6"], .${p}-row[data-gap="6"], .${p}-grid[data-gap="6"] { gap: ${v('space.6')}; }
.${p}-stack[data-gap="8"], .${p}-row[data-gap="8"], .${p}-grid[data-gap="8"] { gap: ${v('space.8')}; }
.${p}-stack[data-gap="10"], .${p}-row[data-gap="10"], .${p}-grid[data-gap="10"] { gap: ${v('space.10')}; }
.${p}-stack[data-gap="12"], .${p}-row[data-gap="12"], .${p}-grid[data-gap="12"] { gap: ${v('space.12')}; }
.${p}-stack[data-gap="16"], .${p}-row[data-gap="16"], .${p}-grid[data-gap="16"] { gap: ${v('space.16')}; }
.${p}-center { text-align: center; align-items: center; }
.${p}-measure { max-width: ${v('size.container.prose')}; }
.${p}-measure[data-size="sm"] { max-width: 480px; }
.${p}-measure[data-size="md"] { max-width: 640px; }
.${p}-measure[data-size="lg"] { max-width: 768px; }
.${p}-mx-auto { margin-inline: auto; }
.${p}-flex-1 { flex: 1 1 0%; min-width: 0; }
.${p}-hide-mobile { display: initial; }
.${p}-show-mobile { display: none; }
.${p}-placeholder { display: block; width: 100%; background-color: ${v('color.bg-muted')}; border-radius: ${v('radius.card')}; overflow: hidden; position: relative; }
.${p}-placeholder > svg { display: block; width: 100%; height: 100%; }
.${p}-placeholder[data-radius="none"] { border-radius: 0; }
.${p}-placeholder[data-radius="full"] { border-radius: ${v('radius.full')}; }
.${p}-placeholder[data-shadow] { box-shadow: ${v('shadow.2xl')}; }
@media (max-width: ${v('breakpoint.lg')}) { .${p}-grid[data-cols="4"], .${p}-grid[data-cols="5"], .${p}-grid[data-cols="6"] { --${p}-cols: 2; } }
@media (max-width: ${v('breakpoint.md')}) {
  .${p}-container { padding-inline: ${v('space.4')}; }
  .${p}-section { padding-block: ${v('space.16')}; }
  .${p}-section[data-padding="md"] { padding-block: ${v('space.12')}; }
  .${p}-section[data-padding="sm"] { padding-block: ${v('space.8')}; }
  .${p}-grid { --${p}-cols: 1 !important; }
  .${p}-grid[data-cols="2"][data-keep], .${p}-grid[data-cols="4"][data-keep] { --${p}-cols: 2 !important; }
  .${p}-split, .${p}-split[data-ratio] { grid-template-columns: 1fr; gap: ${v('space.10')}; }
  .${p}-row[data-stack] { flex-direction: column; align-items: stretch; }
  .${p}-hide-mobile { display: none !important; }
  .${p}-show-mobile { display: initial; }
}
${typeUtils}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
`;
}


/**
 * Duplicate every `@media (max-width: …)` block as an `@container (max-width: …)`
 * block so layouts also respond inside a sized container (the gallery's phone
 * frame, embedded previews). Real pages without a container keep the media rules.
 */
export function withContainerQueries(css) {
  const out = [];
  const re = /@media \((max-width|min-width):\s*([^)]+)\)\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex;
    while (i < css.length && depth) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    const body = css.slice(re.lastIndex, i - 1);
    out.push(`@container (${m[1]}: ${m[2]}) {${body}}`);
  }
  return out.length ? css + '\n' + out.join('\n') : css;
}

export function patternsCss(system, idx) {
  return system.patterns.filter((p) => p.css).map((p) => `/* ---- pattern: ${p.name} ---- */\n${withContainerQueries(toCssVars(rePrefix(p.css.trim(), system.meta.prefix), idx))}\n`).join('\n');
}

export function fullCss(system, idx) {
  const tokens = tokensCss(system, idx);
  const base = baseCss(system, idx);
  const components = system.components.map((c) => componentCss(c, idx, system.meta.prefix)).join('\n');
  const patterns = patternsCss(system, idx);
  const all = `${tokens}\n${base}\n/* ================= components ================= */\n${components}\n${patterns}`;
  return { tokens, base, components: components + '\n' + patterns, all };
}
