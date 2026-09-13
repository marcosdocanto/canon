import type { System, ComponentSpec, ResolvedToken, Declarations, StyleBlock } from '../types.ts';
import { componentRules, renderRules, rePrefix } from './css.ts';
import { toCssVars, toLiteral } from '../tokens/resolve.ts';
import { CATEGORY_ORDER, CATEGORY_LABEL } from '../components/index.ts';
import { VERSION } from '../version.ts';

type Idx = Map<string, ResolvedToken>;

const pascal = (s: string) => s.replace(/(^|[-_])(\w)/g, (_m, _p, c) => c.toUpperCase());
const code = (s: string) => `\`${s}\``;
const fence = (lang: string, s: string) => `\`\`\`${lang}\n${s.trim()}\n\`\`\``;
const row = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`;
const table = (head: string[], rows: string[][]) => [row(head), `|${head.map(() => '---').join('|')}|`, ...rows.map(row)].join('\n');

/** "var(--p-space-3) → 12px" style annotation for a declaration value. */
function annotate(value: string, idx: Idx): string {
  const css = toCssVars(value, idx);
  if (css === value) return code(value);
  const l = toLiteral(value, idx, 'light'), d = toLiteral(value, idx, 'dark');
  return `${code(css)} → ${code(l)}${d !== l ? ` (dark ${code(d)})` : ''}`;
}

function declTable(decls: Declarations, idx: Idx): string {
  const rows = Object.entries(decls).map(([k, v]) => [code(k), annotate(v, idx)]);
  return rows.length ? table(['property', 'value → resolved'], rows) : '_no declarations_';
}

function blockSection(title: string, block: StyleBlock | undefined, spec: ComponentSpec, idx: Idx, depth: string): string {
  if (!block) return '';
  const out: string[] = [];
  const parts = Object.entries(block).filter(([k, v]) => k !== '@states' && v && Object.keys(v as object).length);
  const states = Object.entries(block['@states'] ?? {});
  if (!parts.length && !states.length) return '';
  out.push(`${depth} ${title}`);
  for (const [part, decls] of parts) {
    out.push(`**${part}** (${code(partSelector(spec, part))})`);
    out.push(declTable(decls as Declarations, idx));
  }
  for (const [state, sparts] of states) {
    for (const [part, decls] of Object.entries(sparts)) {
      if (!Object.keys(decls).length) continue;
      out.push(`**${part}** on **${state}** (${code(spec.states[state]?.selector ?? state)})`);
      out.push(declTable(decls, idx));
    }
  }
  return out.join('\n\n');
}

let PREFIX = 'cn';
const partSelector = (spec: ComponentSpec, part: string) => (part === 'root' ? `.${PREFIX}-${spec.slug}` : `.${PREFIX}-${spec.slug}__${part}`);

function componentDoc(spec: ComponentSpec, idx: Idx, n: string): string {
  const p = PREFIX;
  const Name = pascal(spec.slug);
  const out: string[] = [];
  out.push(`### ${n} ${spec.name} — ${code(`.${p}-${spec.slug}`)}`);
  out.push(`${spec.description}`);
  out.push(`**When to use:** ${spec.usage}`);
  out.push(`**Category:** ${CATEGORY_LABEL[spec.category]} · **Related:** ${spec.related.map((r) => `[${pascal(r)}](#${r})`).join(', ') || '—'}`);
  // anatomy
  out.push(`#### Anatomy`);
  out.push(table(['part', 'selector', 'element', 'role'], spec.anatomy.map((a) => [a.part + (a.optional ? ' _(optional)_' : ''), code(partSelector(spec, a.part)), code(`<${a.element}>`), a.description])));
  // props
  const props = Object.entries(spec.props);
  if (props.length) {
    out.push(`#### Props (data attributes)`);
    out.push(table(['prop', 'attribute', 'values', 'default', 'meaning'], props.map(([k, v]) => [code(k), code(`data-${k}`), v.values.map(code).join(' '), code(v.default), v.description])));
  } else out.push(`#### Props\nNone. One shape only.`);
  // states
  const states = Object.entries(spec.states);
  if (states.length) {
    out.push(`#### States`);
    out.push(table(['state', 'how to trigger', 'selector', 'behavior'], states.map(([k, v]) => [code(k), v.markup ?? '—', code(v.selector), v.description])));
  }
  // markup
  out.push(`#### Markup examples`);
  for (const ex of spec.examples) {
    out.push(`**${ex.title}**${ex.description ? ` — ${ex.description}` : ''}`);
    out.push(fence('html', rePrefix(ex.html, p)));
  }
  if (spec.recipes?.length) {
    out.push(`#### Recipes`);
    for (const ex of spec.recipes) {
      out.push(`**${ex.title}**${ex.description ? ` — ${ex.description}` : ''}`);
      out.push(fence('html', rePrefix(ex.html, p)));
    }
  }
  // react
  const propsUsage = props.map(([k, v]) => `${k}="${v.default}"`).join(' ');
  out.push(`#### React`);
  out.push(fence('tsx', `import { ${Name}${spec.anatomy.filter((a) => a.part !== 'root').slice(0, 3).map((a) => `, ${Name}${pascal(a.part)}`).join('')} } from '@/ui';\n\n<${Name} ${propsUsage}>…</${Name}>`));
  // specs
  out.push(`#### Specification (every value)`);
  out.push(blockSection('Base', spec.base, spec, idx, '#####'));
  for (const [axis, values] of Object.entries(spec.variants ?? {})) {
    for (const [value, block] of Object.entries(values)) {
      const s = blockSection(`${axis} = ${value}`, block as StyleBlock, spec, idx, '#####');
      if (s) out.push(s);
    }
  }
  for (const c of spec.compound ?? []) {
    const s = blockSection(`when ${Object.entries(c.when).map(([a, v]) => `${a}=${v}`).join(' + ')}`, c.block, spec, idx, '#####');
    if (s) out.push(s);
  }
  // css
  out.push(`#### Generated CSS (verbatim, annotated)`);
  const css = renderRules(componentRules(spec, p), idx, true, p) + (spec.extraCss ? '\n' + toCssVars(rePrefix(spec.extraCss.trim(), p), idx) : '');
  out.push(fence('css', css));
  // rules
  out.push(`#### Rules`);
  out.push(spec.rules.map((r) => `- ${r}`).join('\n'));
  out.push(`#### Accessibility`);
  out.push(spec.a11y.map((r) => `- ${r}`).join('\n'));
  return out.filter(Boolean).join('\n\n');
}

function foundations(system: System, idx: Idx): string {
  const p = PREFIX;
  const t = system.tokens;
  const out: string[] = [];
  out.push(`## 2. Foundations (tokens)`);
  out.push(`Every value below exists as a CSS custom property (${code(`--${p}-…`)}) and as a Tailwind utility (via ${code('tailwind.theme.css')}). Use the **semantic** tokens in UI code. Primitives are for defining semantics, charts and illustrations only.`);
  // colors
  out.push(`### 2.1 Color`);
  out.push(`#### Primitive scales`);
  for (const [name, val] of Object.entries(t.color.primitive)) {
    if (typeof val === 'string') { out.push(`- ${code(name)} ${code(`--${p}-${name}`)} = ${code(val)}`); continue; }
    out.push(`**${name}** — ${code(`--${p}-${name}-{step}`)}`);
    out.push(table(['step', ...Object.keys(val)], [['hex', ...Object.values(val).map(code)]]));
  }
  out.push(`#### Semantic colors (use these)`);
  out.push(table(['token', 'CSS variable', 'light', 'dark', 'Tailwind', 'use for'], Object.entries(t.color.semantic).map(([k, v]) => {
    const r = idx.get(`color.${k}`)!;
    const tw = k.startsWith('bg-') ? `bg-${k}` : k.startsWith('fg-') ? `text-${k}` : k.startsWith('border-') ? `border-${k}` : `ring-${k}`;
    return [code(k), code(r.cssVar), code(r.light), code(r.dark), code(tw), v.description ?? ''];
  })));
  out.push(`Rules: text uses ${code('fg-*')}, fills use ${code('bg-*')}, lines use ${code('border-*')}. Never pick a primitive for UI (${code('neutral-500')}) when a semantic token exists (${code('fg-subtle')}). Never write a hex.`);
  // typography
  out.push(`### 2.2 Typography`);
  out.push(table(['family', 'CSS variable', 'stack'], Object.entries(t.font.family).map(([k, v]) => [code(k), code(`--${p}-font-family-${k}`), code(v)])));
  out.push(`**Font sizes** ${code(`--${p}-font-size-{name}`)}: ` + Object.entries(t.font.size).map(([k, v]) => `${code(k)} ${v}`).join(' · '));
  out.push(`**Weights**: ` + Object.entries(t.font.weight).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `  \n**Line heights**: ` + Object.entries(t.font.lineHeight).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `  \n**Letter spacing**: ` + Object.entries(t.font.letterSpacing).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `  \n**Control text** (buttons/inputs by size): ` + Object.entries(t.font.control).map(([k, v]) => `${code(k)} ${v}`).join(' · '));
  out.push(`#### Composite text styles — use the class or the five properties together, never a size alone`);
  out.push(table(['style', 'class', 'size / line-height', 'weight', 'tracking', 'family', 'transform', 'use for'], Object.entries(t.type).map(([k, ts]) => [code(k), code(`.${p}-text-${k}`), `${idx.get(`type.${k}.size`)!.light} / ${idx.get(`type.${k}.lineHeight`)!.light}`, idx.get(`type.${k}.weight`)!.light, idx.get(`type.${k}.letterSpacing`)!.light, idx.get(`type.${k}.family`)!.light.split(',')[0].replace(/"/g, ''), ts.transform ?? '—', ts.description ?? ''])));
  out.push(`Heading levels map: h1 = heading-xl (page title), h2 = heading-lg, h3 = heading-md (card/dialog titles), h4 = heading-sm, h5 = heading-xs. Marketing heroes use display-*. Body copy is body-md in the product and body-lg on marketing pages. Helper/meta text is body-sm in fg-muted.`);
  // spacing
  out.push(`### 2.3 Spacing`);
  out.push(`4px grid. ${code(`--${p}-space-{n}`)}: ` + Object.entries(t.space).map(([k, v]) => `${code(k)}=${v}`).join(' · '));
  out.push(`Rhythm: inside a control 8–12px; between related items 8px (space.2); between fields 16px (space.4); between groups 24px (space.6); between sections 32px (space.8); page padding 24px (space.6) desktop / 16px (space.4) mobile; between page header and body 32px; hero sections 64–96px vertical (space.16–24).`);
  // radius
  out.push(`### 2.4 Radius`);
  out.push(table(['token', 'value', 'use'], Object.entries(t.radius).map(([k, v]) => [code(`radius.${k}`), v, ({ control: 'buttons, inputs, selects, menu items', card: 'cards, table wrappers, list wrappers', panel: 'menus, popovers, tooltips', overlay: 'dialogs, drawers, command palette', full: 'pills, avatars, dots, switches', none: 'flush edges (banner, topbar)' } as Record<string, string>)[k] ?? '—'])));
  // shadows
  out.push(`### 2.5 Shadows`);
  out.push(table(['token', 'light', 'dark', 'use'], Object.entries(t.shadow).map(([k, v]) => { const r = idx.get(`shadow.${k}`)!; return [code(`shadow.${k}`), code(r.light), code(r.dark), v.description ?? '']; })));
  out.push(`### 2.6 Borders`);
  out.push(Object.entries(t.border.width).map(([k, v]) => `${code(`border.width.${k}`)} ${v}`).join(' · ') + `. Default border is ${code('1px solid {color.border-default}')}; controls use ${code('border-control')}; focused controls use ${code('border-action')}; invalid use ${code('border-danger')}.`);
  out.push(`### 2.7 Sizes`);
  out.push(`**Control heights** ` + Object.entries(t.size.control).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `  \n**Control horizontal padding** ` + Object.entries(t.size.controlPadding).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `  \n**Control icon size** ` + Object.entries(t.size.controlIcon).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `  \n**Icon sizes** ` + Object.entries(t.size.icon).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `  \n**Containers** ` + Object.entries(t.size.container).map(([k, v]) => `${code(k)} ${v}`).join(' · '));
  out.push(`### 2.8 Z-index`);
  out.push(Object.entries(t.z).map(([k, v]) => `${code(`z.${k}`)} ${v}`).join(' · '));
  out.push(`### 2.9 Motion`);
  out.push(`Durations: ` + Object.entries(t.motion.duration).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `  \nEasings: ` + Object.entries(t.motion.easing).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `  \nOnly color/opacity/transform/box-shadow transition. Enter animations ≤ 200ms, exit ≤ 150ms. Always honored: ${code('prefers-reduced-motion')} (base.css neutralizes animations).`);
  out.push(`### 2.10 Breakpoints`);
  out.push(Object.entries(t.breakpoint).map(([k, v]) => `${code(k)} ${v}`).join(' · ') + `. Mobile first. Layout collapses: multi-column → single column below ${code('md')}; page padding shrinks to 16px; topbar tabs become a menu; drawers become bottom sheets.`);
  out.push(`### 2.11 Opacity`);
  out.push(Object.entries(t.opacity).map(([k, v]) => `${code(`opacity.${k}`)} ${v}`).join(' · '));
  out.push(`### 2.12 Layout primitives (in ${code(`${p}.css`)})`);
  out.push(table(['class', 'attributes', 'what it does'], [
    [code(`.${p}-section`), code('data-padding="none|sm|md"') + ' ' + code('data-bg="subtle|surface|inverse|brand|brand-subtle"'), 'Full-width band. Default vertical padding 96px (64 on mobile).'],
    [code(`.${p}-container`), code('data-size="sm|md|lg|2xl"'), 'Centered max-width column (default 1280px) with 32px side padding (16 on mobile).'],
    [code(`.${p}-stack`), code('data-gap="0…16"') + ' ' + code('data-align'), 'Vertical flex column. Default gap 16px.'],
    [code(`.${p}-row`), code('data-gap data-align data-justify="between|center|end" data-wrap data-stack'), 'Horizontal flex row. data-stack collapses to a column on mobile.'],
    [code(`.${p}-grid`), code('data-cols="1…6" data-gap data-keep'), 'Equal-column grid. Collapses to 2 cols below lg (for 4–6) and 1 col below md; data-keep keeps 2.'],
    [code(`.${p}-split`), code('data-ratio="1:2|2:1|1:3" data-align="start"'), 'Two-column media/text layout; stacks on mobile.'],
    [code(`.${p}-center`) + ' / ' + code(`.${p}-measure`) + ' / ' + code(`.${p}-mx-auto`) + ' / ' + code(`.${p}-flex-1`), code('data-size="sm|md|lg"') + ' on measure', 'Text centering, reading width (65ch / 480 / 640 / 768), centering, flex fill.'],
    [code(`.${p}-hide-mobile`) + ' / ' + code(`.${p}-show-mobile`), '', 'Responsive visibility below md.'],
  ]));
  out.push(`Use these for page and section structure. Any other layout CSS must use tokens.`);
  out.push(`### 2.13 Icons`);
  out.push(`${system.meta.icons.set}, stroke ${system.meta.icons.strokeWidth}. ${system.meta.icons.note} Inline SVG with ${code('aria-hidden="true"')} when decorative; sized with the ${code('size.icon.*')} / ${code('size.controlIcon.*')} tokens; color ${code('currentColor')}.`);
  return out.join('\n\n');
}

export function designMd(system: System, idx: Idx): string {
  PREFIX = system.meta.prefix;
  const p = PREFIX;
  const dist = `design/${system.meta.out || 'dist'}`;
  const out: string[] = [];
  const byCat = CATEGORY_ORDER.map((cat) => ({ cat, items: system.components.filter((c) => c.category === cat) })).filter((g) => g.items.length);
  out.push(`# ${system.meta.name} — Design System Specification for AI agents`);
  out.push(`> Generated by canon ${VERSION} on ${new Date().toISOString().slice(0, 10)} from ${code('design/')} · ${system.components.length} components · ${system.patterns.length} patterns · ${idx.size} tokens · class prefix ${code(`${p}-`)}.  \n> This is the visual contract and reference catalog for UI work. Start with ${code('DESIGN.compact.md')} and read only relevant sections here. Edit design source to change the system; ${code('canon sync')} rebuilds outputs and refreshes installed documents.`);
  out.push(`## 0. How to use this document`);
  out.push(`### Connecting to an existing project\nPreserve the existing stack, routes, behavior, data and design definitions. Reuse an existing Canon setup and install its references before UI work. Adopt Canon incrementally within the requested scope. A connection-only request ends with verified integration and readiness; do not recreate the app, migrate all screens or invent a product task. Continue an active task using these instructions without requiring the user to repeat them.`);
  out.push(`### Implementation rules
1. **Use semantic tokens in UI.** Colors, type, spacing, radii and shadows use ${code(`var(--${p}-…)`)} or generated Tailwind utilities. In design specs use ${code('{token}')} references; define new values in ${code('design/tokens.json')} when the system needs them.
2. **Reuse stable components.** Start with shared application UI and this catalog. Preserve semantic elements, required anatomy, root/part classes (${code(`.${p}-<component>`)}, ${code(`.${p}-<component>__<part>`)}) and allowed ${code('data-*')} values. Adapt examples to content, framework bindings, events and routing; optional parts remain optional.
3. **Extend through source.** Compose screens in application files. If a reusable visual component or variant is missing, extend a spec or add ${code('design/components/<slug>.json')} with anatomy, props, states, token styles, examples and accessibility rules. Add reusable page patterns in ${code('design/patterns/')}. Regenerate instead of scattering overrides or patching generated files.
4. **Wire real behavior.** States use the documented native or data attributes. React wrappers map props to styled markup; the application implements interactions, keyboard behavior and focus management. Cover relevant loading, error, empty, success and disabled states.
5. **Use complete typography and spacing.** Use composite text styles (${code(`.${p}-text-body-md`)} etc.) and the spacing scale (§2.3). Group related content and keep at most one primary action per region.
6. **Respect themes and access.** Semantic tokens switch via ${code('data-theme')} or the OS. Verify supported themes, readable contrast, semantic headings, labels, accessible names, visible focus, keyboard operation and ${code('prefers-reduced-motion')}.
7. **Design for the task.** Choose hierarchy, density and composition from the user's goal, content and visual references. Use supplied facts and clearly identified fixtures; never present invented testimonials or metrics as evidence.`);
  out.push(`### Workflow for every UI task
1. Inspect repository instructions, framework, routes, shared UI, data flow and checks. The user sets product intent; own routine technical decisions, dependency installation with the project's package manager, configuration and CSS/wrapper integration. Follow the user's scope: a prototype can use a small working flow and separate fixtures; production features need useful domain/data/presentation boundaries and requested persistence, validation and failure handling. Add complexity only when needed.
2. Re-read the current ${code('DESIGN.compact.md')} at the beginning of UI work. With Canon MCP, call ${code('design_rules')} once and retrieve only relevant ${code('get_component')}, ${code('get_pattern')} and token groups. Without MCP, read matching source JSON or sections here. MCP supplies context and lint; execute setup, commands and preview processes through terminal tools. Choose variants by their stated meaning.
3. Compose a working flow using the documented structure and token-based layout CSS. Keep product logic in application files and reusable design changes in ${code('design/')}. Save in the project's bound Studio updates the design, generated styles and installed references together. For source edits outside Studio, run ${code('canon sync')}. MCP refreshes automatically on its next data request after a build. ${code('canon build')} only regenerates outputs.
4. Preserve the framework's rendering model. Keep client code local to interactions; avoid gratuitous dependencies, all-icons imports, repeated CSS imports and oversized unoptimized media. Measure significant pages with bundle, load and interaction tooling before claiming performance gains.
5. Run ${code('canon lint <changed files>')}, ${code('canon check')} and applicable repository type checks/tests. Inspect changed screens in a browser at narrow and wide widths, exercising keyboard and relevant states. For runnable UI work, start or reuse the application's dev server, verify the affected route and leave the preview running. Use the project's dev command; ${code('canon serve')} is the catalog gallery. Return the preview URL, checks run and remaining limitations.`);
  out.push(`### Self-check before finishing
- [ ] The requested flow works; fixtures and production data are distinguishable.
- [ ] Shared components preserve their contract; any new reusable visual behavior is specified in design source.
- [ ] Hierarchy, copy, density and actions fit the task at supported viewport sizes and themes.
- [ ] Relevant states, labels, keyboard interaction and focus behavior have been exercised.
- [ ] Token/class/prop lint and generated freshness checks passed, or existing failures are reported accurately.
- [ ] Browser review, accessibility and performance conclusions have their own evidence; Canon lint does not measure them.`);
  out.push(`### Where things live
- Source of truth: ${code('design/system.json')}, ${code('design/tokens.json')}, ${code('design/components/*.json')}, ${code('design/patterns/*.json')}.
- Compiled CSS: import ${code(`${dist}/${p}.css`)} once for a quick prototype. For a smaller product bundle, explicitly select ${code(`${dist}/tokens.css`)} + ${code(`${dist}/base.css`)} + used ${code(`${dist}/css/components/<slug>.css`)} and ${code(`${dist}/css/patterns/<slug>.css`)}. Include referenced component/pattern dependencies. Use one strategy to avoid duplicate CSS; selection is explicit.
- Tailwind: ${code(`${dist}/tailwind.theme.css`)} (v4) or ${code(`${dist}/tailwind.preset.cjs`)} (v3).
- React: ${code(`${dist}/react/`)} — thin typed wrappers; props → data attributes. Use the repository's import path; ${code('@/ui')} in examples is illustrative.
- Gallery (see everything rendered): ${code(`${dist}/preview.html`)} (or ${code('canon serve')}).
- Machine access: ${code('canon mcp')} exposes rules, individual specs, tokens and snippet linting. ${code('canon add <slug>')} restores an existing catalog component; it does not author a new spec.
- Paths assume ${code('design/')}; use the project's configured ${code('--design')} and installation ${code('--root')} when different.`);
  // 1 direction
  out.push(`## 1. Art direction`);
  out.push(system.meta.direction.summary);
  out.push(`### Principles\n${system.meta.direction.principles.map((x) => `- ${x}`).join('\n')}`);
  out.push(`### Never (the slop list)\n${system.meta.direction.never.map((x) => `- ${x}`).join('\n')}`);
  // 2 foundations
  out.push(foundations(system, idx));
  // 3 components
  out.push(`## 3. Components`);
  out.push(`### Index`);
  out.push(table(['component', 'class', 'category', 'props', 'use for'], system.components.map((c) => [`[${c.name}](#${c.slug})`, code(`.${p}-${c.slug}`), CATEGORY_LABEL[c.category], Object.entries(c.props).map(([k, v]) => `${k}: ${v.values.join('/')}`).join('; ') || '—', c.usage.split(/(?<=\.)\s/)[0]])));
  let i = 0;
  for (const g of byCat) {
    out.push(`## 3.${CATEGORY_ORDER.indexOf(g.cat) + 1} ${CATEGORY_LABEL[g.cat]}`);
    for (const c of g.items) {
      i++;
      out.push(`<a id="${c.slug}"></a>`);
      out.push(componentDoc(c, idx, `3.${CATEGORY_ORDER.indexOf(g.cat) + 1}.${i}`));
    }
  }
  // 4 patterns
  out.push(`## 4. Patterns — application layouts and pages`);
  out.push(`Patterns provide starting structures composed from the components above, with a primary layout and, where listed, alternatives. Choose and adapt them to the task, content and navigation. Wire application behavior and verify the composed screen at its supported viewport sizes.`);
  const pcats: Record<string, string> = { 'app-layout': 'Application layouts', 'app-section': 'Application sections', 'app-page': 'Application pages', 'marketing-section': 'Marketing sections', 'marketing-page': 'Marketing pages', 'shared-page': 'Shared pages (auth, errors)', email: 'Email' };
  for (const [cat, label] of Object.entries(pcats)) {
    const items = system.patterns.filter((pt) => pt.category === cat);
    if (!items.length) continue;
    out.push(`### ${label}`);
    for (const pt of items) {
      out.push(`<a id="pattern-${pt.slug}"></a>\n#### ${pt.name}`);
      out.push(pt.description);
      out.push(pt.rules.map((r) => `- ${r}`).join('\n'));
      out.push(`**Primary layout**\n\n${fence('html', rePrefix(pt.html, p))}`);
      for (const v of pt.variants ?? []) out.push(`**${v.title}**${v.description ? ` — ${v.description}` : ''}\n\n${fence('html', rePrefix(v.html, p))}`);
      if (pt.css) out.push(`**Pattern CSS** (already in ${code(`${p}.css`)})\n\n${fence('css', toCssVars(rePrefix(pt.css.trim(), p), idx))}`);
    }
  }
  // 5 anti patterns
  out.push(`## 5. Anti-patterns — what "AI slop" looks like and what to do instead`);
  out.push(table(['never', 'instead'], [
    ['A grid of identical cards with an icon in a colored circle and a title', 'A list or table for collections; a card only for one self-contained thing; icons plain, 20px, fg-muted'],
    ['Decorative gradients, glass blur or glow unrelated to the content', 'Semantic surfaces with clear hierarchy and purposeful emphasis'],
    ['The same centered headline and three feature cards for every product', 'Choose composition from the task, supplied content and visual references'],
    ['Buttons with different radii or heights next to each other', 'Same size and radius.control for every control in a row'],
    ['Shadow on every card', 'shadow only on floating layers; resting cards use border-default'],
    ['Colored text for emphasis, colored headings', 'Weight and size; color only for status/action'],
    ['Emoji icons, mixed icon sets', 'One icon set, one stroke width'],
    ['Invented metrics, testimonials or sample records presented as fact', 'Supplied product facts or clearly identified, realistic fixtures'],
    ['Navigation that simply mirrors database tables', 'Navigation organized around user tasks with deliberate grouping'],
    ['Automatically choosing a detail page or drawer for every entity', 'Choose from task complexity, navigation context and deep-link needs'],
    ['`outline: none` without a replacement', 'The focus ring token on :focus-visible'],
    ['Ad-hoc `style=""` with px values', 'Layout utilities or pattern CSS with tokens'],
  ]));
  // 6 token index
  out.push(`## 6. Token index (every CSS variable)`);
  out.push(table(['variable', 'light', 'dark'], [...idx.values()].map((t) => [code(t.cssVar), code(t.light), t.themed ? code(t.dark) : '='])));
  // 7 lint
  out.push(`## 7. Linting`);
  out.push(`${code('canon lint [paths]')} scans supported source files for raw design values, Tailwind palette/arbitrary values, unknown ${code(`${p}-`)} classes and unsupported component ${code('data-*')} props. Where possible, violations suggest tokens. ${code('canon check')} runs configured lint and verifies generated file hashes, source freshness and complete build coverage. These checks do not prove visual quality, accessibility, application correctness or runtime performance; use relevant repository tests, browser review and measurements for those.`);
  return out.join('\n\n') + '\n';
}

export function compactMd(system: System, idx: Idx): string {
  PREFIX = system.meta.prefix;
  const p = PREFIX;
  const dist = `design/${system.meta.out || 'dist'}`;
  const out: string[] = [];
  out.push(`# ${system.meta.name} — design rules and index`);
  out.push(`Re-read this current file at the beginning of UI work. Use semantic tokens for colors, type, spacing, radius and shadows, and documented classes and ${code('data-*')} props. Reuse stable components and compose the screen for the user's task.`);
  out.push(`## Connect within the existing project\nPreserve its stack, routes, behavior, data and design definitions. Reuse the existing Canon setup and install its references. Adopt Canon incrementally in the areas requested. For a connection-only request, verify integration and report readiness; do not recreate the app, migrate all screens or invent a product task. Continue an active task using these instructions without asking the user to repeat them.`);
  out.push(`## Own setup; match the scope\nInspect repository instructions, framework, routes, shared UI, data flow and checks. The user sets product intent; own routine technical decisions, install needed dependencies with the project's package manager, configure integration and wire CSS/wrappers into the app. A quick prototype needs a small working flow and separate, clearly identified fixtures; production features need useful domain/data/presentation boundaries and requested persistence, validation and failure handling. Follow existing conventions and add complexity only when needed.`);
  out.push(`## Retrieve only what you need\nWith Canon MCP, call ${code('design_rules')} once, then ${code('get_component')} or ${code('get_pattern')} with a ${code('slug')} from the indexes below. ${code('list_tokens({"group":"space"})')} and ${code('get_token({"name":"color.bg-action"})')} provide exact values. Without MCP, read ${code('design/components/<slug>.json')}, ${code('design/patterns/<slug>.json')} or the linked section of DESIGN.md. Retrieve a working set of specs; the full catalog is a reference. MCP supplies context and lint; execute setup, commands and preview processes through terminal tools.`);
  out.push(`## Build the product flow
- Preserve semantic elements, required anatomy and allowed props while adapting content, framework bindings, routes and events. React wrappers provide styled markup and typed attributes; application code supplies behavior.
- Choose hierarchy, density and grouping from the task, supplied content and visual references. Keep at most one primary action per region. Clearly identify fixtures; never invent testimonials or metrics as evidence.
- Implement relevant loading, error, empty, success and disabled states. Provide labels, accessible names, visible focus, keyboard operation and focus management; respect reduced motion and supported themes.
- Preserve the framework's rendering model and keep client code local to interactions. Avoid gratuitous dependencies, all-icons imports and oversized unoptimized media. Measure significant pages with bundle, load and interaction tooling before claiming performance gains.`);
  out.push(`## CSS integration\nA prototype can import ${code(`${dist}/${p}.css`)} once. For a smaller product bundle, explicitly select ${code(`${dist}/tokens.css`)} + ${code(`${dist}/base.css`)} + used ${code(`${dist}/css/components/<slug>.css`)} and ${code(`${dist}/css/patterns/<slug>.css`)}. Include every component/pattern dependency referenced by that UI. Use one strategy to avoid duplicate CSS; selection is explicit.`);
  out.push(`## Direction\n${system.meta.direction.summary}\n${system.meta.direction.principles.map((x) => `- ${x}`).join('\n')}\n\nNever: ${system.meta.direction.never.join(' · ')}`);
  out.push(`## Common semantic colors (variable → light / dark)`);
  out.push(['bg-canvas', 'bg-surface', 'bg-subtle', 'bg-action', 'bg-action-hover', 'fg-default', 'fg-muted', 'fg-on-action', 'fg-danger', 'fg-success', 'border-default', 'ring-focus'].flatMap((k) => { const r = idx.get(`color.${k}`); return r ? [`- ${code(r.cssVar)} ${r.light} / ${r.dark}`] : []; }).join('\n'));
  out.push(`## Text styles`);
  out.push(`Use ${code(`.${p}-text-<name>`)} to apply a complete style. Available: ${Object.keys(system.tokens.type).map(code).join(', ')}. Retrieve the type token group for sizes, weights and leading.`);
  out.push(`## Scales\nspace ${Object.entries(system.tokens.space).map(([k, v]) => `${k}=${v}`).join(' ')}\nradius ${Object.entries(system.tokens.radius).map(([k, v]) => `${k}=${v}`).join(' ')}\nshadow ${Object.keys(system.tokens.shadow).join(' ')}\ncontrol heights ${Object.entries(system.tokens.size.control).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  out.push(`## Component index\nRoot class: ${code(`.${p}-<slug>`)}. Part class: ${code(`.${p}-<slug>__<part>`)}. Retrieve the spec before choosing parts, variants or states.`);
  for (const category of CATEGORY_ORDER) {
    const items = system.components.filter((c) => c.category === category);
    if (items.length) out.push(`- **${CATEGORY_LABEL[category]}:** ${items.map((c) => `[${c.slug}](DESIGN.md#${c.slug})`).join(', ')}`);
  }
  out.push(`## Pattern index\n${system.patterns.map((pt) => `- [${pt.slug}](DESIGN.md#pattern-${pt.slug}) — ${pt.name} (${pt.category})`).join('\n')}`);
  out.push(`## Change the right source\nProduct routes, domain logic, data access and screen composition belong in application files. Shared tokens and reusable visual behavior belong in ${code('design/')}: extend a spec or add ${code('design/components/<slug>.json')} (and a pattern when useful), then regenerate instead of scattering overrides. ${code('canon add <slug>')} restores an existing catalog component. Save in the project's bound Studio updates the design, generated styles and installed references together. For source edits outside Studio, run ${code('canon sync')}. MCP refreshes automatically on its next data request after a build. ${code('canon build')} only regenerates outputs. Never patch generated files. Paths assume ${code('design/')}; use configured ${code('--design')} and installation ${code('--root')} when different.`);
  out.push(`## Verify and deliver\nRun ${code('canon lint <changed files>')}, ${code('canon check')} and applicable repository type checks/tests; fix violations introduced by the change. Inspect changed screens in a browser at narrow and wide widths, exercising keyboard and relevant states. Canon lint checks token/class/prop usage; check also verifies generated output freshness. Neither measures visual quality, accessibility or performance. For runnable UI work, start or reuse the application's dev server, verify the affected route and leave the preview running. Use the project's dev command; ${code('canon serve')} is the catalog gallery. Return the preview URL, checks actually run and remaining limitations.`);
  return out.join('\n\n') + '\n';
}

export function generate(system: System, idx: Idx, write: (rel: string, content: string) => void) {
  write('DESIGN.md', designMd(system, idx));
  write('DESIGN.compact.md', compactMd(system, idx));
}
