import { readFileSync } from 'node:fs';
import type { System, ComponentSpec, ResolvedToken, Pattern } from '../types.ts';
import { tokensCss, baseCss, componentCss, patternsCss, rePrefix } from './css.ts';
import { CATEGORY_ORDER, CATEGORY_LABEL } from '../components/index.ts';
import { legacyPresetDefaults } from '../tokens/canon-preset.ts';
import { documentationHtml } from './documentation.ts';

type Idx = Map<string, ResolvedToken>;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/^export /gm, '').replace(/^import .*$/gm, '');

const PATTERN_CATS: Record<string, string> = { 'app-layout': 'Application layouts', 'app-section': 'Application sections', 'app-page': 'Application pages', 'marketing-section': 'Marketing sections', 'marketing-page': 'Marketing pages', 'shared-page': 'Shared pages', email: 'Email' };

// These examples change their anatomy, not just a root attribute. Keep their
// authored markup intact instead of manufacturing a misleading variant matrix.
const STRUCTURAL_COMPONENTS = new Set(['sidebar', 'sidebar-nav', 'topbar', 'header-navigation', 'mobile-header', 'filter-bar', 'table', 'kanban', 'metric-group', 'rich-text-editor']);
const HEADER_COMPONENTS = new Set(['topbar', 'header-navigation', 'page-header', 'section-header', 'card-header']);
const isStructural = (spec: ComponentSpec) => spec.category === 'layout' || STRUCTURAL_COMPONENTS.has(spec.slug);

function examplePicker(examples: { title: string }[], id: string, label = 'Example'): string {
  return examples.length > 1 ? `<label class="pv-example-picker">${label}<select data-example-picker aria-label="${label}" aria-controls="${id}">${examples.map((example, i) => `<option value="${i}">${esc(example.title)}</option>`).join('')}</select><span class="pv-muted" aria-hidden="true">${examples.length} examples</span></label>` : '';
}

function viewportControls(viewport: string, height = 760): string {
  return `<div class="pv-pattern__controls"><output class="pv-pattern__metrics" data-preview-metrics>${viewport === 'mobile' ? '375' : '1280'} × ${height}</output><button type="button" class="pv-btn pv-btn--sm" data-preview-zoom="actual" aria-label="Preview at 100%" title="Preview at 100%">100%</button><span class="pv-pattern__vp" role="group" aria-label="Preview viewport"><button type="button" class="pv-btn pv-btn--sm" data-viewport="desktop" aria-pressed="${viewport === 'desktop'}">Desktop</button><button type="button" class="pv-btn pv-btn--sm" data-viewport="mobile" aria-pressed="${viewport === 'mobile'}">Mobile · 375</button></span></div>`;
}

function previewCanvas(html: string, label: string, viewport: string, height = 760, component = false): string {
  return `<div class="pv-canvas" data-preview-canvas><div class="pv-canvas__bounds"><div class="pv-frame${component ? ' pv-example__stage' : ''}" data-vp="${viewport}" style="--pv-viewport-height:${height}px" tabindex="0" role="region" aria-label="${esc(label)}">${html}</div></div></div>`;
}

function matrix(spec: ComponentSpec, prefix: string): string {
  if (isStructural(spec)) return '';
  const axes = Object.keys(spec.variants ?? {}).filter((a) => spec.props[a]);
  if (!axes.length || !spec.examples.length) return '';
  const rowAxis = axes.includes('variant') ? 'variant' : axes.includes('tone') ? 'tone' : axes[0];
  const colAxis = axes.includes('size') && rowAxis !== 'size' ? 'size' : axes.find((a) => a !== rowAxis);
  const base = rePrefix(spec.examples[0].html, prefix);
  const swap = (html: string, axis: string, value: string) => {
    const re = new RegExp(`data-${axis}="[^"]*"`);
    return re.test(html) ? html.replace(re, `data-${axis}="${value}"`) : html.replace(/^(<[a-z0-9-]+)/i, `$1 data-${axis}="${value}"`);
  };
  const rows = spec.props[rowAxis].values;
  const cols = colAxis ? spec.props[colAxis].values : [''];
  if (rows.length * cols.length > 60) return '';
  let out = `<div class="pv-matrix-wrap" data-matrix><table class="pv-matrix"><thead><tr><th>${rowAxis}${colAxis ? ` ↓ / ${colAxis} →` : ''}</th>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
  for (const r of rows) {
    out += `<tr><th>${r}</th>`;
    for (const c of cols) {
      let html = swap(base, rowAxis, r);
      if (colAxis) html = swap(html, colAxis, c);
      out += `<td>${html}</td>`;
    }
    out += '</tr>';
  }
  return out + '</tbody></table></div>';
}

function exampleFig(e: { title: string; html: string; description?: string }, prefix: string, kind: string, i: number, block = false, option?: number, framed = false): string {
  const html = rePrefix(e.html, prefix);
  const stage = framed ? previewCanvas(html, e.title + ' component preview', 'desktop', 384, true) : `<div class="pv-example__stage"${block ? ' data-block' : ''}>${html}</div>`;
  return `<figure class="pv-example" data-${kind}="${i}"${option === undefined ? '' : ` data-example-option="${option}"${option ? ' hidden' : ''}`}><figcaption class="pv-example__title">${esc(e.title)}${option === undefined ? '' : '<span class="pv-pattern__context">Component preview</span>'}${e.description ? `<span class="pv-example__desc">${esc(e.description)}</span>` : ''}${framed ? viewportControls('desktop', 384) : ''}</figcaption>${stage}<details class="pv-code"><summary>HTML</summary><pre><code>${esc(html)}</code></pre></details></figure>`;
}

function componentSection(spec: ComponentSpec, prefix: string): string {
  const props = Object.entries(spec.props).map(([k, p]) => `<tr><td><code>${k}</code></td><td>${p.values.map((v) => `<code${v === p.default ? ' class="pv-default"' : ''}>${v}</code>`).join(' ')}</td><td>${esc(p.description)}</td></tr>`).join('');
  const states = Object.entries(spec.states).map(([k, s]) => `<tr><td><code>${k}</code></td><td><code>${esc(s.selector)}</code></td><td>${esc(s.description)}${s.markup ? ` <span class="pv-muted">(${esc(s.markup)})</span>` : ''}</td></tr>`).join('');
  const anatomy = spec.anatomy.map((a) => `<li><code>.${prefix}-${spec.slug}${a.part === 'root' ? '' : '__' + a.part}</code> <span class="pv-muted">&lt;${a.element}&gt;${a.optional ? ' · optional' : ''}</span> — ${esc(a.description)}</li>`).join('');
  const m = matrix(spec, prefix);
  const structural = isStructural(spec);
  const examplesId = `c-${spec.slug}-examples`;
  const recipesId = `c-${spec.slug}-recipes`;
  const html = `<section class="pv-section" id="c-${spec.slug}" data-slug="${spec.slug}" data-category="${spec.category}">
  <div class="pv-section__head"><div class="pv-kicker">${CATEGORY_LABEL[spec.category]}</div><h2 class="pv-h2" title="Open in editor">${esc(spec.name)} <code class="pv-slug">.${prefix}-${spec.slug}</code><span class="pv-editlink">edit</span></h2><p class="pv-lead">${esc(spec.description)}</p><p class="pv-usage"><strong>Use:</strong> ${esc(spec.usage)}</p></div>
  ${structural ? examplePicker(spec.examples, examplesId) : ''}<div class="pv-examples" id="${examplesId}"${structural ? ' data-example-set data-structural' : ''}>${spec.examples.map((e, i) => exampleFig(e, prefix, 'example', i, false, structural ? i : undefined, HEADER_COMPONENTS.has(spec.slug))).join('')}</div>
  ${spec.recipes?.length ? `<h3 class="pv-h3">Recipes</h3>${structural ? examplePicker(spec.recipes, recipesId, 'Recipe') : ''}<div class="pv-examples" id="${recipesId}"${structural ? ' data-example-set data-structural' : ''}>${spec.recipes.map((e, i) => exampleFig(e, prefix, 'recipe', i, false, structural ? i : undefined, HEADER_COMPONENTS.has(spec.slug))).join('')}</div>` : ''}
  ${m ? `<h3 class="pv-h3">Matrix</h3>${m}` : ''}
  <details class="pv-details"><summary>Anatomy, props, states, rules</summary>
    <h4 class="pv-h4">Anatomy</h4><ul class="pv-list">${anatomy}</ul>
    ${props ? `<h4 class="pv-h4">Props</h4><table class="pv-table"><thead><tr><th>prop</th><th>values (default outlined)</th><th>meaning</th></tr></thead><tbody>${props}</tbody></table>` : ''}
    ${states ? `<h4 class="pv-h4">States</h4><table class="pv-table"><thead><tr><th>state</th><th>selector</th><th>meaning</th></tr></thead><tbody>${states}</tbody></table>` : ''}
    <h4 class="pv-h4">Rules</h4><ul class="pv-list">${spec.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <h4 class="pv-h4">Accessibility</h4><ul class="pv-list">${spec.a11y.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  </details>
</section>`;
  return rePrefix(html, prefix);
}

function patternSection(pt: Pattern, prefix: string): string {
  const viewport = pt.viewport === 'mobile' ? 'mobile' : 'desktop';
  const examplesId = `p-${pt.slug}-examples`;
  const examples = [{ title: 'Primary layout', html: pt.html }, ...(pt.variants ?? [])];
  const frame = (html: string, title: string, description?: string, i = -1) => `<div class="pv-pattern" data-variant="${i}" data-example-option="${i + 1}"${i >= 0 ? ' hidden' : ''}><div class="pv-pattern__bar"><div class="pv-pattern__title"><span class="pv-pattern__context">Product preview</span><span>${esc(title)}</span>${description ? `<span class="pv-example__desc">${esc(description)}</span>` : ''}</div>${viewportControls(viewport)}</div>${previewCanvas(rePrefix(html, prefix), pt.name + ' — ' + title + ' preview', viewport)}<details class="pv-code"><summary>HTML</summary><pre><code>${esc(rePrefix(html, prefix))}</code></pre></details></div>`;
  return `<section class="pv-section" id="p-${pt.slug}" data-pattern="${pt.slug}" data-category="${pt.category}"><div class="pv-kicker">${PATTERN_CATS[pt.category] ?? pt.category}</div><h2 class="pv-h2">${esc(pt.name)}</h2><p class="pv-lead">${esc(pt.description)}</p>${examplePicker(examples, examplesId)}<div id="${examplesId}" data-example-set>${frame(pt.html, 'Primary layout')}${(pt.variants ?? []).map((v, i) => frame(v.html, v.title, v.description, i)).join('')}</div><details class="pv-details"><summary>Layout guidelines</summary><ul class="pv-list">${pt.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></details></section>`;
}

function overview(system: System): string {
  const p = system.meta.prefix;
  const sample = (slug: string) => {
    const spec = system.components.find((c) => c.slug === slug);
    return spec?.examples[0] ? rePrefix(spec.examples[0].html, p) : '';
  };
  const badge = system.components.some((c) => c.slug === 'badge') ? `<span class="${p}-badge" data-tone="success" data-variant="soft" data-size="sm" data-shape="square">Active</span>` : '';
  return `<section class="pv-section pv-overview" id="f-overview">
    <div class="pv-kicker">Canon / Build with your agent</div>
    <h2 class="pv-h2">${esc(system.meta.name)}</h2>
    <p class="pv-lead">Conecte este design system ao seu agente de código no projeto. O Canon entrega as referências e instruções para o agente seguir nas próximas alterações de interface.</p>
    <a class="pv-start" href="./docs.html#primeiro-projeto">Conectar ao meu projeto <span aria-hidden="true">→</span></a>
    <div class="pv-overview__tokens">
      <a href="#f-color"><span class="pv-overview__color" aria-hidden="true"></span><span>Brand<span class="pv-overview__value" data-token="brand.600">${esc(system.tokens.color.primitive.brand['600'])}</span></span></a>
      <a href="#f-type"><span class="pv-overview__letter" aria-hidden="true">Aa</span><span>Typography<span class="pv-overview__value" data-font-label>${esc(system.tokens.font.family.sans.split(',')[0].replace(/"/g, ''))}</span></span></a>
      <a href="#f-radius"><span class="pv-overview__shape" aria-hidden="true"></span><span>Shape<span class="pv-overview__value" data-token="radius.control">${esc(system.tokens.radius.control)}</span></span></a>
      <a href="#f-size"><span class="pv-overview__density" aria-hidden="true"></span><span>Density<span class="pv-overview__value" data-token="size.control.md">${esc(system.tokens.size.control.md)}</span></span></a>
    </div>
    <div class="pv-overview__surface pv-frame">
      <div class="pv-overview__heading"><div><div class="${p}-text-heading-md">Workspace overview</div><p class="${p}-text-body-md pv-muted">A few everyday elements, with your design decisions applied.</p></div>${badge}</div>
      <div class="pv-overview__controls">${sample('input')}${sample('button').replace('Save changes', 'Invite member')}</div>
      <div class="pv-overview__examples">${sample('card')}${sample('stat')}</div>
    </div>
    <p class="pv-small pv-muted pv-overview__caption">Live component samples · Use the theme toggle to compare light and dark.</p>
  </section>`;
}

function foundations(system: System, idx: Idx): string {
  const p = system.meta.prefix;
  const t = system.tokens;
  const prim = Object.entries(t.color.primitive).filter(([, v]) => typeof v !== 'string') as [string, Record<string, string>][];
  const scales = prim.map(([name, scale]) => `<div class="pv-scale"><div class="pv-scale__name">${name}</div><div class="pv-scale__row">${Object.entries(scale).map(([step, hex]) => `<div class="pv-swatch" style="background:var(--${p}-${name}-${step})" title="${name}.${step}"><span class="pv-swatch__step">${step}</span><span class="pv-swatch__hex" data-token="${name}.${step}">${hex}</span></div>`).join('')}</div></div>`).join('');
  const sem = Object.entries(t.color.semantic).map(([name, v]) => {
    const r = idx.get(`color.${name}`)!;
    return `<div class="pv-sem"><div class="pv-sem__chip" style="background:var(--${p}-color-${name})"></div><div><code>--${p}-color-${name}</code><div class="pv-muted pv-small"><span data-token="color.${name}">${r.light}</span> · dark ${r.dark}</div><div class="pv-small">${esc(v.description ?? '')}</div></div></div>`;
  }).join('');
  const type = Object.entries(t.type).map(([name, ts]) => {
    const size = idx.get(`type.${name}.size`)!.light, lh = idx.get(`type.${name}.lineHeight`)!.light, w = idx.get(`type.${name}.weight`)!.light, ls = idx.get(`type.${name}.letterSpacing`)!.light;
    const specimen = name.startsWith('display') || name.startsWith('heading') ? 'A place for work to take shape' : name === 'kicker' ? 'Field notes / 01' : name.startsWith('code') ? 'const total = items.reduce((a, b) => a + b, 0);' : name.startsWith('numeric') ? '1,234,567.89 · 42% · $12,400' : name.startsWith('label') ? 'Save changes' : 'Every decision leaves a trace. Bring the next task, the people involved and the context you need into one clear view.';
    return `<div class="pv-type"><div class="pv-type__meta"><code>.${p}-text-${name}</code><span class="pv-muted pv-small"><span data-token="type.${name}.size">${size}</span> / ${lh} · ${w} · ${ls}${ts.transform ? ' · ' + ts.transform : ''}</span><span class="pv-small">${esc(ts.description ?? '')}</span></div><div class="${p}-text-${name} pv-type__specimen">${specimen}</div></div>`;
  }).join('');
  const space = Object.entries(t.space).map(([k, v]) => `<div class="pv-space"><code>space.${k}</code><div class="pv-space__bar" style="width:var(--${p}-space-${k.replace('.', '-')})"></div><span class="pv-muted pv-small" data-token="space.${k}">${v}</span></div>`).join('');
  const radius = Object.entries(t.radius).map(([k, v]) => `<div class="pv-radius"><div class="pv-radius__box" style="border-radius:var(--${p}-radius-${k})"></div><code>radius.${k}</code><span class="pv-muted pv-small" data-token="radius.${k}">${v}</span></div>`).join('');
  const shadow = Object.entries(t.shadow).map(([k, v]) => `<div class="pv-shadow"><div class="pv-shadow__box" style="box-shadow:var(--${p}-shadow-${k})"></div><code>shadow.${k}</code><span class="pv-small">${esc(v.description ?? '')}</span></div>`).join('');
  const sizes = Object.entries(t.size.control).map(([k, v]) => `<div class="pv-ctrl"><div class="pv-ctrl__box" style="height:var(--${p}-size-control-${k})"></div><code>control.${k}</code><span class="pv-muted pv-small" data-token="size.control.${k}">${v}</span></div>`).join('');
  const motion = Object.entries(t.motion.duration).map(([k, v]) => `<code>duration.${k}</code> ${v}`).join(' · ') + '<br>' + Object.entries(t.motion.easing).map(([k, v]) => `<code>easing.${k}</code> ${v}`).join(' · ');
  return `
<section class="pv-section" id="f-direction"><div class="pv-kicker">Direction</div><h2 class="pv-h2">${esc(system.meta.name)}</h2><p class="pv-lead">${esc(system.meta.direction.summary)}</p><ul class="pv-list">${system.meta.direction.principles.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><h4 class="pv-h4">Never</h4><ul class="pv-list pv-never">${system.meta.direction.never.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
<section class="pv-section" id="f-color"><div class="pv-kicker">Foundations</div><h2 class="pv-h2">Color</h2><h3 class="pv-h3">Primitives</h3>${scales}<h3 class="pv-h3">Semantic (use these, not primitives)</h3><div class="pv-sem-grid">${sem}</div></section>
<section class="pv-section" id="f-type"><div class="pv-kicker">Foundations</div><h2 class="pv-h2">Typography</h2><p class="pv-lead">Sans: <code>${esc(t.font.family.sans)}</code><br>Mono: <code>${esc(t.font.family.mono)}</code></p>${type}</section>
<section class="pv-section" id="f-space"><div class="pv-kicker">Foundations</div><h2 class="pv-h2">Spacing</h2><div class="pv-space-grid">${space}</div></section>
<section class="pv-section" id="f-radius"><div class="pv-kicker">Foundations</div><h2 class="pv-h2">Radius</h2><div class="pv-row">${radius}</div></section>
<section class="pv-section" id="f-shadow"><div class="pv-kicker">Foundations</div><h2 class="pv-h2">Shadow</h2><div class="pv-row">${shadow}</div></section>
<section class="pv-section" id="f-size"><div class="pv-kicker">Foundations</div><h2 class="pv-h2">Control sizes</h2><div class="pv-row">${sizes}</div><h3 class="pv-h3">Motion</h3><p class="pv-small">${motion}</p></section>`;
}

const PREVIEW_CSS = readFileSync(new URL('./preview.css', import.meta.url), 'utf8');

export function previewHtml(system: System, idx: Idx, options: { publicSite?: boolean } = {}): string {
  const p = system.meta.prefix;
  const byCat = CATEGORY_ORDER.map((cat) => ({ cat, items: system.components.filter((c) => c.category === cat) })).filter((g) => g.items.length);
  const nav = byCat.map((g) => `<details class="pv-nav-group"><summary>${CATEGORY_LABEL[g.cat]}</summary>${g.items.map((c) => `<a href="#c-${c.slug}">${esc(c.name)}</a>`).join('')}</details>`).join('');
  const pcats = Object.keys(PATTERN_CATS).map((cat) => ({ cat, items: system.patterns.filter((pt) => pt.category === cat) })).filter((g) => g.items.length);
  const pnav = pcats.map((g) => `<details class="pv-nav-group"><summary>${PATTERN_CATS[g.cat]}</summary>${g.items.map((pt) => `<a href="#p-${pt.slug}">${esc(pt.name)}</a>`).join('')}</details>`).join('');
  const comps = system.components.map((c) => componentSection(c, p)).join('\n');
  const patterns = pcats.map((g) => g.items.map((pt) => patternSection(pt, p)).join('\n')).join('\n');
  const fontLink = fontsLink(system.tokens.font.family.sans + ' ' + system.tokens.font.family.mono + ' ' + system.tokens.font.family.display);
  const styles = [
    `<style id="cn-css-tokens">${tokensCss(system, idx)}</style>`,
    `<style id="cn-css-base">${baseCss(system, idx)}</style>`,
    ...system.components.map((c) => `<style data-component="${c.slug}">${componentCss(c, idx, p)}</style>`),
    `<style id="cn-css-patterns">${patternsCss(system, idx)}</style>`,
    `<style id="pv-css">${PREVIEW_CSS.replace(/--P-/g, `--${p}-`)}</style>`,
  ].join('\n');
  const systemJson = JSON.stringify(system).replace(/<\/script/g, '<\\/script');
  const legacyDefaults = JSON.stringify(Object.hasOwn(system.meta.seeds, 'presetOverrides') ? {} : legacyPresetDefaults(system.meta.seeds)).replace(/<\/script/g, '<\\/script');
  return `<!doctype html>
<html lang="en" data-theme="${system.meta.defaultTheme}"${options.publicSite ? ' data-public-studio' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(system.meta.name)} — design system</title>
${fontLink}
${styles}
</head>
<body>
<div class="pv-app" id="pv-app">
  <nav class="pv-nav">
    <div class="pv-nav__brand"><span class="pv-nav__mark" aria-hidden="true"></span><span>Canon</span><span class="pv-nav__studio">Studio</span></div>
    <a class="pv-nav__start" href="./docs.html#primeiro-projeto">Get started <span aria-hidden="true">→</span></a>
    <a class="pv-nav__docs" href="./docs.html">Documentação<span aria-hidden="true">↗</span></a>
    <button class="pv-btn pv-nav__toggle" id="pv-nav-toggle" aria-expanded="false" aria-controls="pv-nav-content">Browse catalog</button>
    <div id="pv-nav-content">
    <div class="pv-nav__sub"><strong>${esc(system.meta.name)}</strong><br>${system.components.length} components · ${system.patterns.length} patterns · ${idx.size} tokens</div>
    <label class="pv-nav__search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg><input type="search" id="pv-search" placeholder="Search catalog…" aria-label="Search"></label>
    <p class="pv-nav-empty" id="pv-nav-empty" role="status" hidden>No matching components or pages.</p>
    <details class="pv-nav-group" open><summary>Foundations</summary>
    <a href="#f-overview">Overview</a><a href="#f-direction">Direction</a><a href="#f-color">Color</a><a href="#f-type">Typography</a><a href="#f-space">Spacing</a><a href="#f-radius">Radius</a><a href="#f-shadow">Shadow</a><a href="#f-size">Sizes &amp; motion</a>
    </details>
    <div class="pv-nav__group">Components</div>
    ${nav}
    <div class="pv-nav__group">Layouts &amp; pages</div>
    ${pnav}
    </div>
  </nav>
  <main class="pv-main">
    <div class="pv-top"><div class="pv-top__title"><span class="pv-top__crumb" id="pv-crumb">Foundations</span><span id="pv-project" class="pv-project" hidden></span><span id="pv-status" class="pv-status"></span></div><div class="pv-top__actions"><button class="pv-btn pv-btn--icon" id="pv-theme" type="button" aria-label="Switch theme"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="pv-theme-moon" d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/><g class="pv-theme-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m-14.2 0 1.4-1.4M17.7 6.3l1.4-1.4"/></g></svg><span id="pv-theme-label" class="pv-sr">Switch theme</span></button>${options.publicSite ? '<a class="pv-btn pv-btn--primary" id="pv-edit" href="./docs.html#primeiro-projeto">Use in my project</a>' : '<button class="pv-btn pv-btn--primary" id="pv-edit">Customize</button>'}</div></div>
    <p class="pv-sync-hint pv-small" id="pv-sync-hint" hidden></p>
    ${overview(system)}
    ${foundations(system, idx)}
    ${comps}
    ${patterns}
  </main>
  <aside class="pv-editor" id="pv-editor" hidden aria-label="Design system editor"></aside>
</div>
<script>window.__CANON__ = ${systemJson}; window.__CANON_PRESET_DEFAULTS__ = ${legacyDefaults};</script>
<script>
${inline('../color.js')}
${inline('../engine.js')}
${inline('../tokens/base.js')}
</script>
<script>
${readFileSync(new URL('../editor.js', import.meta.url), 'utf8')}
</script>
</body>
</html>
`;
}

export function fontsLink(families: string): string {
  const known: Record<string, string> = { Geist: 'Geist:wght@400..700', 'Geist Mono': 'Geist+Mono:wght@400..700', Inter: 'Inter:wght@400..700', 'Inter Tight': 'Inter+Tight:wght@400..700', 'JetBrains Mono': 'JetBrains+Mono:wght@400..700', Fraunces: 'Fraunces:opsz,wght@9..144,300..700', 'IBM Plex Sans': 'IBM+Plex+Sans:wght@400..700', 'IBM Plex Mono': 'IBM+Plex+Mono:wght@400..700', Manrope: 'Manrope:wght@400..700', 'DM Sans': 'DM+Sans:wght@400..700', 'Space Grotesk': 'Space+Grotesk:wght@400..700', 'Roboto Mono': 'Roboto+Mono:wght@400..700' };
  const wanted = Object.entries(known).filter(([name]) => new RegExp(`"${name}"`).test(families)).map(([, q]) => `family=${q}`);
  if (!wanted.length) return '';
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${wanted.join('&')}&display=swap">`;
}

export function generate(system: System, idx: Idx, write: (rel: string, content: string) => void) {
  write('preview.html', previewHtml(system, idx));
  const fonts = fontsLink(system.tokens.font.family.sans + ' ' + system.tokens.font.family.mono + ' ' + system.tokens.font.family.display);
  write('docs.html', documentationHtml(system, idx, fonts));
  write('CONNECT.md', readFileSync(new URL('./connection.md', import.meta.url), 'utf8'));
}
