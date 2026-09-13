// Browser-side editor for the gallery. Runs against window.__CANON__ (the full
// system) using the same engine.js that the Node build uses, so what you see
// is exactly what `canon build` will emit. Saves through `canon serve`'s API.
/* global indexTokens, tokensCss, baseCss, componentCss, patternsCss, rePrefix, toLiteral, toCssVars, buildTokens, deepMerge, applySeedChanges, tokenDifferences, parseCssColor */
(() => {
  const S = window.__CANON__;
  const P = S.meta.prefix;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v; else if (k === 'style') n.style.cssText = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
    return n;
  };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const dirty = { meta: false, tokens: false, components: new Set(), patterns: new Set() };
  let idx = indexTokens(S.tokens, P);
  const history = [];
  const serialize = () => JSON.stringify({ meta: S.meta, tokens: S.tokens, components: S.components, patterns: S.patterns });
  let previousState = serialize();
  const acknowledged = JSON.parse(previousState);
  let editTarget = null, lastEditTarget = null, lastEditAt = 0;
  let saving = false, saveAgain = false;
  const specOf = (slug) => S.components.find((c) => c.slug === slug);

  // ---------------------------------------------------------------- chrome
  const root = document.documentElement;
  const publicCatalog = root.hasAttribute('data-public-studio');
  if (!publicCatalog && (location.protocol === 'http:' || location.protocol === 'https:')) {
    fetch('/api/project').then(response => response.ok ? response.json() : null).then(project => {
      const label = $('#pv-project');
      if (label && project?.connected) {
        label.textContent = `Project · ${project.name}`;
        label.title = `Changes are saved to ${project.name}`;
        label.hidden = false;
      }
    }).catch(() => {});
  }
  const themeButton = $('#pv-theme');
  function updateThemeButton() {
    const action = root.dataset.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    themeButton.setAttribute('aria-label', action); themeButton.title = action;
    $('#pv-theme-label').textContent = action;
  }
  updateThemeButton();
  themeButton.addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; updateThemeButton(); if (sel) renderInspector(); });
  const app = $('#pv-app'), panel = $('#pv-editor');
  for (const name of ['input', 'change']) panel.addEventListener(name, (e) => { editTarget = e.target; }, true);
  panel.addEventListener('click', () => { editTarget = null; }, true);
  function setEditor(open) { if (open) app.setAttribute('data-editor', ''); else app.removeAttribute('data-editor'); panel.hidden = !open; if (open && !panel.dataset.ready) { renderPanel(); panel.dataset.ready = '1'; } if (!open) clearSelection(); }
  if (!publicCatalog) $('#pv-edit').addEventListener('click', () => setEditor(!app.hasAttribute('data-editor')));
  document.addEventListener('keydown', (e) => {
    if (publicCatalog) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) { e.preventDefault(); undo(); }
    if (e.key === 'Escape' && sel) clearSelection();
  });

  // ---------------------------------------------------------------- rebuild
  function rebuildTokens() {
    try { idx = indexTokens(S.tokens, P); } catch (e) { status(e.message, true); return; }
    $('#cn-css-tokens').textContent = tokensCss(S, idx);
    $('#cn-css-base').textContent = baseCss(S, idx);
    for (const n of $$('[data-token]')) { const t = idx.get(n.dataset.token); if (t) n.textContent = t.light; }
    for (const n of $$('[data-font-label]')) n.textContent = S.tokens.font.family.sans.split(',')[0].replace(/"/g, '');
    status('tokens updated');
  }
  function rebuildComponent(slug) {
    const spec = specOf(slug);
    const style = $(`style[data-component="${slug}"]`);
    try { style.textContent = componentCss(spec, idx, P); status(`${spec.name} updated`); } catch (e) { status(e.message, true); }
    forceState();
  }
  function rerenderExample(slug, kind, i) {
    const spec = specOf(slug);
    const ex = (kind === 'recipe' ? spec.recipes : spec.examples)[i];
    const fig = $(`.pv-section[data-slug="${slug}"] [data-${kind}="${i}"]`);
    if (!fig) return;
    fig.querySelector('.pv-example__stage').innerHTML = rePrefix(ex.html, P);
    fig.querySelector('code').textContent = rePrefix(ex.html, P);
    fig.querySelector('.pv-example__title').firstChild.textContent = ex.title;
  }
  function rebuildAll() { rebuildTokens(); for (const c of S.components) rebuildComponent(c.slug); $('#cn-css-patterns').textContent = patternsCss(S, idx); }

  // ---------------------------------------------------------------- status / save / undo
  const bar = $('#pv-status');
  let statusT;
  function status(msg, isError) { bar.textContent = msg; bar.dataset.error = isError ? '1' : ''; clearTimeout(statusT); statusT = setTimeout(() => { bar.textContent = ''; }, 4000); }
  async function save() {
    if (publicCatalog) return;
    if (saving) { saveAgain = true; return; }
    refreshDirty();
    // The request and its acknowledgement must describe the same snapshot, even
    // while the user continues editing during the network request and build.
    const payload = structuredClone({ meta: dirty.meta ? S.meta : undefined, tokens: dirty.tokens ? S.tokens : undefined, components: Object.fromEntries([...dirty.components].map((s) => [s, specOf(s)])), patterns: Object.fromEntries([...dirty.patterns].map((s) => [s, S.patterns.find((c) => c.slug === s)])) });
    if (!payload.meta && !payload.tokens && !dirty.components.size && !dirty.patterns.size) { status('nothing to save'); return; }
    saving = true; lastEditTarget = null; updateDirtyBadge();
    try {
      const r = await fetch('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `Save failed (${r.status})`);
      if (payload.meta) acknowledged.meta = payload.meta;
      if (payload.tokens) acknowledged.tokens = payload.tokens;
      for (const kind of ['components', 'patterns']) for (const [slug, value] of Object.entries(payload[kind])) {
        const i = acknowledged[kind].findIndex((item) => item.slug === slug);
        if (i < 0) acknowledged[kind].push(value); else acknowledged[kind][i] = value;
      }
      status(j.referencesUpdated ? 'saved to project' : 'design saved');
      const hint = $('#pv-sync-hint');
      if (hint) {
        hint.textContent = j.referencesUpdated
          ? 'Saved to this project. Styles and agent references are up to date.'
          : 'Design saved. Use the connection prompt to bring this design into a project.';
        hint.hidden = false;
      }
    } catch (e) { saveAgain = false; exportDialog(payload, e.message); }
    finally {
      saving = false; refreshDirty(); updateDirtyBadge();
      if (saveAgain) { saveAgain = false; save(); }
    }
  }
  function exportDialog(payload, why) {
    const files = [];
    if (payload.tokens) files.push(['design/tokens.json', payload.tokens]);
    if (payload.meta) files.push(['design/system.json', payload.meta]);
    for (const [s, c] of Object.entries(payload.components)) files.push([`design/components/${s}.json`, c]);
    for (const [s, c] of Object.entries(payload.patterns)) files.push([`design/patterns/${s}.json`, c]);
    const box = el('div', { class: 'pv-modal' }, el('div', { class: 'pv-modal__panel' },
      el('h3', {}, 'Export changes'),
      el('p', { class: 'pv-small pv-muted' }, `Could not save to disk (${why}). Run \`canon serve\` from the project to save directly. Otherwise paste each file into design/ and run canon build.`),
      ...files.map(([name, obj]) => el('div', { class: 'pv-export' }, el('div', { class: 'pv-export__head' }, el('code', {}, name), el('button', { class: 'pv-btn', onclick: (e) => { navigator.clipboard?.writeText(JSON.stringify(obj, null, 2)); e.target.textContent = 'copied'; } }, 'copy')), el('textarea', { readonly: true, spellcheck: 'false' }, JSON.stringify(obj, null, 2)))),
      el('button', { class: 'pv-btn', onclick: () => box.remove() }, 'Close')));
    document.body.append(box);
  }
  function undo() {
    const snap = history.pop();
    if (!snap) { status('nothing to undo'); return; }
    const o = JSON.parse(snap);
    S.tokens = o.tokens; S.components.splice(0, S.components.length, ...o.components); S.patterns.splice(0, S.patterns.length, ...o.patterns); S.meta = o.meta;
    previousState = serialize(); lastEditTarget = null; editTarget = null;
    clearSelection(); rebuildAll();
    for (const c of S.components) {
      for (let i = 0; i < c.examples.length; i++) rerenderExample(c.slug, 'example', i);
      for (let i = 0; i < (c.recipes?.length ?? 0); i++) rerenderExample(c.slug, 'recipe', i);
    }
    refreshDirty(); renderPanel(); status('undone');
  }
  function refreshDirty() {
    const differs = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
    dirty.meta = differs(S.meta, acknowledged.meta); dirty.tokens = differs(S.tokens, acknowledged.tokens);
    for (const kind of ['components', 'patterns']) {
      const saved = new Map(acknowledged[kind].map((item) => [item.slug, item]));
      dirty[kind] = new Set(S[kind].filter((item) => differs(item, saved.get(item.slug))).map((item) => item.slug));
    }
  }
  function updateDirtyBadge() { const n = (dirty.tokens ? 1 : 0) + (dirty.meta ? 1 : 0) + dirty.components.size + dirty.patterns.size; const b = $('#pv-save'); if (b) { b.textContent = saving ? 'Saving…' : n ? `Save (${n})` : 'Save'; b.disabled = saving; } }
  function touch() {
    const current = serialize(), now = Date.now();
    if (current !== previousState) {
      // Coalesce typing in one field, recording the state before its first edit.
      if (!editTarget || editTarget !== lastEditTarget || now - lastEditAt > 400) {
        history.push(previousState); if (history.length > 80) history.shift();
      }
      previousState = current; lastEditTarget = editTarget; lastEditAt = now;
    }
    refreshDirty(); updateDirtyBadge();
  }

  // ---------------------------------------------------------------- helpers
  const setPath = (obj, path, value) => { let o = obj; for (const k of path.slice(0, -1)) o = o[k] ??= {}; o[path[path.length - 1]] = value; };
  const lit = (value, theme) => { try { return toLiteral(rePrefix(value, P), idx, theme ?? (root.dataset.theme === 'dark' ? 'dark' : 'light')); } catch { return value; } };
  const swatch = (value) => { const hex = parseCssColor(lit(value)); return el('span', { class: 'pv-sw', style: hex ? `background:${hex}` : 'background:transparent;border-style:dashed' }); };
  let datalist;
  function ensureDatalist() { if (datalist) return; datalist = el('datalist', { id: 'pv-refs' }, ...[...idx.keys()].map((k) => el('option', { value: `{${k}}` }))); document.body.append(datalist); }
  function valueInput(value, onChange, opts = {}) {
    ensureDatalist();
    const wrap = el('span', { class: 'pv-val' });
    let sw = null;
    const input = el('input', { type: 'text', value, list: 'pv-refs', spellcheck: 'false', class: 'pv-in' });
    const updateSwatch = () => {
      if (opts.color ?? !!parseCssColor(lit(input.value))) {
        const next = swatch(input.value);
        if (sw) sw.replaceWith(next); else wrap.prepend(next);
        sw = next;
      } else { sw?.remove(); sw = null; }
    };
    input.addEventListener('input', () => { onChange(input.value); updateSwatch(); });
    wrap.append(input); updateSwatch();
    if (opts.color) {
      const hex = parseCssColor(lit(value));
      const picker = el('input', { type: 'color', value: hex ?? '#000000', class: 'pv-color', 'aria-label': opts.label ?? 'Choose color' });
      picker.addEventListener('input', () => { input.value = picker.value.toUpperCase(); input.dispatchEvent(new Event('input')); });
      wrap.append(picker);
    }
    return wrap;
  }
  function textArea(value, onChange, rows = 3) { const t = el('textarea', { class: 'pv-ta', rows, spellcheck: 'false' }, value); t.addEventListener('input', () => onChange(t.value)); return t; }

  // ---------------------------------------------------------------- panel shell
  function renderPanel() {
    panel.innerHTML = '';
    const tabs = el('div', { class: 'pv-tabs' });
    const body = el('div', { class: 'pv-panel-body' });
    const views = { Style: renderStyle, Inspect: renderComponentTab, Direction: renderDirection };
    let current = panel.dataset.tab || 'Style';
    for (const name of Object.keys(views)) {
      const b = el('button', { class: 'pv-tab', 'data-active': name === current ? '1' : null, onclick: () => { current = name; panel.dataset.tab = name; $$('.pv-tab', tabs).forEach((x) => x.removeAttribute('data-active')); b.dataset.active = '1'; body.innerHTML = ''; body.append(views[name]()); } }, name);
      tabs.append(b);
    }
    const head = el('div', { class: 'pv-panel-head' },
      el('strong', {}, 'Editor'),
      el('span', { style: 'flex:1' }),
      el('button', { class: 'pv-btn', onclick: undo, title: '⌘Z' }, 'Undo'),
      el('button', { class: 'pv-btn pv-btn--primary', id: 'pv-save', onclick: save, title: '⌘S' }, 'Save'),
      el('button', { class: 'pv-btn', type: 'button', 'aria-label': 'Close editor', onclick: () => setEditor(false) }, '×'));
    panel.append(head, tabs, body);
    body.append(views[current]());
    updateDirtyBadge();
  }

  // ================================================================ Style tab: the four decisions
  const FONTS = ['"Inter", -apple-system, "Segoe UI", Roboto, Arial, sans-serif', '"Geist", "Inter", system-ui, sans-serif', '"DM Sans", system-ui, sans-serif', '"Manrope", system-ui, sans-serif', '"IBM Plex Sans", system-ui, sans-serif', '"Space Grotesk", system-ui, sans-serif', '"Inter Tight", system-ui, sans-serif', 'system-ui, -apple-system, "Segoe UI", sans-serif'];
  const MONOS = ['ui-monospace, "Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace', '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace', '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace', '"IBM Plex Mono", ui-monospace, Menlo, monospace', '"Roboto Mono", ui-monospace, Menlo, monospace'];
  const fontLabel = (f) => (f.match(/"([^"]+)"/)?.[1] ?? 'System');
  const renderSeedChanges = debounce(() => { rebuildTokens(); refreshStyleStrips(); }, 120);
  function replaceSeeds(next) {
    const seeds = S.meta.seeds;
    for (const key of Object.keys(seeds)) delete seeds[key];
    Object.assign(seeds, next);
  }
  function changeSeeds(changes) {
    try {
      // Preserve hand-edited tokens from disk as well as edits in this session.
      const manual = tokenDifferences(S.tokens, buildTokens(S.meta.seeds)) ?? {};
      const next = applySeedChanges(S.meta.seeds, changes, window.__CANON_PRESET_DEFAULTS__);
      next.overrides = deepMerge(next.overrides ?? {}, manual);
      const tokens = buildTokens(next);
      replaceSeeds(next); S.tokens = tokens;
      touch(); renderSeedChanges();
    } catch (e) { status(e.message, true); }
  }
  function refreshStyleStrips() {
    for (const strip of $$('[data-strip]')) { const scale = S.tokens.color.primitive[strip.dataset.strip]; if (!scale) continue; strip.innerHTML = ''; for (const [k, hex] of Object.entries(scale)) strip.append(el('span', { style: `background:${hex}`, title: `${strip.dataset.strip}.${k} ${hex}` })); }
    const big = $('#pv-brand-big'); if (big) big.style.background = S.meta.seeds.brand;
  }
  function renderStyle() {
    const seeds = S.meta.seeds;
    const box = el('div', { class: 'pv-stack' });
    const card = (title, hint, ...kids) => el('div', { class: 'pv-card' }, el('div', { class: 'pv-card__title' }, title), hint ? el('div', { class: 'pv-card__hint' }, hint) : null, ...kids);
    const strip = (name) => { const st = el('div', { class: 'pv-strip', 'data-strip': name }); return st; };
    // Brand
    const brandHex = el('input', { type: 'text', class: 'pv-in', value: seeds.brand, spellcheck: 'false', style: 'font-family:var(--' + P + '-font-family-mono)' });
    const brandPick = el('input', { type: 'color', class: 'pv-color', value: seeds.brand });
    const onBrand = (v) => { if (!/^#[0-9a-fA-F]{6}$/.test(v)) return; changeSeeds({ brand: v.toUpperCase() }); brandHex.value = seeds.brand; brandPick.value = seeds.brand; };
    brandHex.addEventListener('input', () => onBrand(brandHex.value)); brandPick.addEventListener('input', () => onBrand(brandPick.value));
    const actionOn = el('input', { type: 'checkbox', checked: seeds.action ? true : null });
    const actionPick = el('input', { type: 'color', class: 'pv-color', value: seeds.action ?? '#1F1F1F', disabled: seeds.action ? null : true });
    actionOn.addEventListener('change', () => { actionPick.disabled = !actionOn.checked; changeSeeds({ action: actionOn.checked ? actionPick.value.toUpperCase() : undefined }); });
    actionPick.addEventListener('input', () => changeSeeds({ action: actionPick.value.toUpperCase() }));
    box.append(card('Brand color', 'One color. The whole scale, the focus ring and the accents are derived from it.',
      el('div', { class: 'pv-swatch-big', id: 'pv-brand-big', style: `background:${seeds.brand}` }),
      el('div', { class: 'pv-row', style: 'display:flex;gap:6px' }, brandHex, brandPick),
      strip('brand'),
      el('label', { class: 'pv-inline' }, el('span', {}, 'Different color for buttons'), el('span', { style: 'display:flex;gap:6px;align-items:center' }, actionOn, actionPick))));
    // Neutrals
    const canvas = el('input', { type: 'color', class: 'pv-color', value: seeds.canvasLight ?? '#FAFAFA' });
    const ink = el('input', { type: 'color', class: 'pv-color', value: seeds.inkDark ?? '#171717' });
    const hue = el('input', { type: 'range', class: 'pv-range', min: 0, max: 360, step: 1, value: seeds.neutralHue ?? 0 });
    const chroma = el('input', { type: 'range', class: 'pv-range', min: 0, max: 0.03, step: 0.001, value: seeds.neutralChroma ?? 0 });
    const onNeutral = () => changeSeeds({ canvasLight: canvas.value.toUpperCase(), inkDark: ink.value.toUpperCase(), neutralHue: +hue.value, neutralChroma: +chroma.value });
    for (const i of [canvas, ink, hue, chroma]) i.addEventListener('input', onNeutral);
    box.append(card('Neutrals', 'Page background, text and borders come from one grey ramp between these two ends.',
      el('label', { class: 'pv-inline' }, el('span', {}, 'Lightest (page)'), canvas), el('label', { class: 'pv-inline' }, el('span', {}, 'Darkest (text)'), ink),
      el('label', { class: 'pv-inline' }, el('span', {}, 'Tint hue'), hue), el('label', { class: 'pv-inline' }, el('span', {}, 'Tint strength'), chroma),
      strip('neutral')));
    // Typography
    const sansSel = el('select', { class: 'pv-in' }, ...FONTS.map((f) => el('option', { value: f }, fontLabel(f))));
    const curSans = S.tokens.font.family.sans; if (!FONTS.includes(curSans)) sansSel.append(el('option', { value: curSans }, fontLabel(curSans) + ' (current)')); sansSel.value = curSans;
    const monoSel = el('select', { class: 'pv-in' }, ...MONOS.map((f) => el('option', { value: f }, fontLabel(f) === 'System' ? 'System mono' : fontLabel(f))));
    const curMono = S.tokens.font.family.mono; if (!MONOS.includes(curMono)) monoSel.append(el('option', { value: curMono }, 'current')); monoSel.value = curMono;
    const base = el('input', { type: 'number', class: 'pv-in', min: 12, max: 18, step: 0.5, value: seeds.baseFontSize ?? 14 });
    sansSel.addEventListener('change', () => { changeSeeds({ fontSans: sansSel.value, fontDisplay: sansSel.value }); loadFont(fontLabel(sansSel.value)); });
    monoSel.addEventListener('change', () => { changeSeeds({ fontMono: monoSel.value }); loadFont(fontLabel(monoSel.value)); });
    base.addEventListener('input', () => { if (base.value && base.validity.valid) changeSeeds({ baseFontSize: +base.value }); });
    box.append(card('Typography', 'The UI font, the code font and the base size (14 = dense product UI, 16 = editorial).',
      el('label', { class: 'pv-inline' }, el('span', {}, 'Sans'), sansSel), el('label', { class: 'pv-inline' }, el('span', {}, 'Mono'), monoSel), el('label', { class: 'pv-inline' }, el('span', {}, 'Base size (px)'), base),
      el('div', { class: 'pv-preview pv-specimen' }, el('div', {}, el('strong', {}, 'Beautiful analytics'), el('span', {}, 'The quick brown fox jumps over the lazy dog · 0123456789')))));
    // Shape
    const radius = el('input', { type: 'range', class: 'pv-range', min: 0, max: 2.5, step: 0.05, value: seeds.radiusScale ?? 1 });
    const radiusVal = el('span', { class: 'pv-muted pv-small' }, `×${seeds.radiusScale ?? 1}`);
    radius.addEventListener('input', () => { changeSeeds({ radiusScale: +radius.value }); radiusVal.textContent = `×${radius.value}`; });
    box.append(card('Shape', 'Corner radius of everything, from sharp (0) to soft (2.5). Controls 8px, cards 12px, dialogs 16px at ×1.',
      el('div', { class: 'pv-inline' }, el('span', {}, 'Roundness'), radiusVal), radius,
      el('div', { class: 'pv-preview' }, el('span', { class: 'pv-preview-box', style: `border-radius:var(--${P}-radius-control)`, title: 'control' }), el('span', { class: 'pv-preview-box', style: `border-radius:var(--${P}-radius-card)`, title: 'card' }), el('span', { class: 'pv-preview-box', style: `border-radius:var(--${P}-radius-overlay)`, title: 'dialog' }), el('span', { class: 'pv-preview-box', style: `border-radius:var(--${P}-radius-full)`, title: 'pill' }))));
    // Density
    const ctrl = el('input', { type: 'range', class: 'pv-range', min: 32, max: 48, step: 2, value: seeds.controlHeight ?? 40 });
    const ctrlVal = el('span', { class: 'pv-muted pv-small' }, `${seeds.controlHeight ?? 40}px`);
    ctrl.addEventListener('input', () => { changeSeeds({ controlHeight: +ctrl.value }); ctrlVal.textContent = `${ctrl.value}px`; });
    box.append(card('Density', 'Height of a default button or input. 36 is compact, 40 is the system, 44 is comfortable.',
      el('div', { class: 'pv-inline' }, el('span', {}, 'Control height'), ctrlVal), ctrl,
      el('div', { class: 'pv-preview' }, el('button', { type: 'button', class: `${P}-button`, 'data-variant': 'primary', 'data-size': 'md' }, el('span', { class: `${P}-button__label` }, 'Button')), el('button', { type: 'button', class: `${P}-button`, 'data-variant': 'outline', 'data-size': 'md' }, el('span', { class: `${P}-button__label` }, 'Secondary')), el('div', { class: `${P}-input`, 'data-variant': 'default', 'data-size': 'md', style: 'width:140px' }, el('input', { class: `${P}-input__field`, type: 'text', placeholder: 'Input', 'aria-label': 'Input' })))));
    // Shadows
    const tint = el('input', { type: 'color', class: 'pv-color', value: seeds.shadowTint ?? '#000000' });
    tint.addEventListener('input', () => changeSeeds({ shadowTint: tint.value.toUpperCase() }));
    box.append(card('Elevation', 'Shadows are tinted with this color (black is neutral; a dark brand tone feels warmer).',
      el('label', { class: 'pv-inline' }, el('span', {}, 'Shadow tint'), tint),
      el('div', { class: 'pv-preview' }, el('span', { class: 'pv-preview-box', style: `border-radius:var(--${P}-radius-card);box-shadow:var(--${P}-shadow-sm);border-color:var(--${P}-color-border-subtle)`, title: 'sm' }), el('span', { class: 'pv-preview-box', style: `border-radius:var(--${P}-radius-card);box-shadow:var(--${P}-shadow-md);border-color:var(--${P}-color-border-subtle)`, title: 'md' }), el('span', { class: 'pv-preview-box', style: `border-radius:var(--${P}-radius-card);box-shadow:var(--${P}-shadow-lg);border-color:var(--${P}-color-border-subtle)`, title: 'lg' }), el('span', { class: 'pv-preview-box', style: `border-radius:var(--${P}-radius-card);box-shadow:var(--${P}-shadow-xl);border-color:var(--${P}-color-border-subtle)`, title: 'xl' }))));
    // all tokens
    const all = el('details', { class: 'pv-group' }, el('summary', {}, 'All tokens (advanced)'));
    all.addEventListener('toggle', () => { if (all.open && !all.dataset.ready) { all.append(renderTokens()); all.dataset.ready = '1'; } });
    box.append(all);
    setTimeout(refreshStyleStrips, 0);
    return box;
  }
  function loadFont(name) {
    const known = { Geist: 'Geist:wght@400..700', 'Geist Mono': 'Geist+Mono:wght@400..700', Inter: 'Inter:wght@400..700', 'Inter Tight': 'Inter+Tight:wght@400..700', 'JetBrains Mono': 'JetBrains+Mono:wght@400..700', 'IBM Plex Sans': 'IBM+Plex+Sans:wght@400..700', 'IBM Plex Mono': 'IBM+Plex+Mono:wght@400..700', Manrope: 'Manrope:wght@400..700', 'DM Sans': 'DM+Sans:wght@400..700', 'Space Grotesk': 'Space+Grotesk:wght@400..700', 'Roboto Mono': 'Roboto+Mono:wght@400..700' };
    if (!known[name] || document.querySelector(`link[data-font="${name}"]`)) return;
    document.head.append(el('link', { rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?family=${known[name]}&display=swap`, 'data-font': name }));
  }

  // ================================================================ Tokens tab (advanced)
  const debouncedTokens = debounce(rebuildTokens, 150);
  function renderTokens() {
    const box = el('div');
    const seeds = S.meta.seeds;
    const seedRow = (label, key, type = 'text', extra = {}) => {
      const eff = key === 'fontSans' ? S.tokens.font.family.sans : key === 'fontMono' ? S.tokens.font.family.mono : key === 'action' ? 'same as brand' : key === 'shadowTint' ? '#000000' : '';
      const input = el('input', { type, value: seeds[key] ?? '', placeholder: eff, class: type === 'color' ? 'pv-color' : 'pv-in', ...extra });
      input.addEventListener('input', () => { if (type === 'number' && (!input.value || !input.validity.valid)) return; changeSeeds({ [key]: type === 'number' ? +input.value : input.value }); });
      return el('label', { class: 'pv-row' }, el('span', {}, label), input);
    };
    box.append(el('details', { class: 'pv-group' }, el('summary', {}, 'Seeds — regenerate the whole token set'),
      seedRow('Brand', 'brand', 'color'), seedRow('Action (optional)', 'action', 'text'), seedRow('Canvas light', 'canvasLight', 'color'), seedRow('Ink dark', 'inkDark', 'color'),
      seedRow('Neutral hue', 'neutralHue', 'number', { step: 1, min: 0, max: 360 }), seedRow('Neutral chroma', 'neutralChroma', 'number', { step: 0.001, min: 0, max: 0.05 }),
      seedRow('Radius scale', 'radiusScale', 'number', { step: 0.05, min: 0, max: 3 }), seedRow('Base font px', 'baseFontSize', 'number', { step: 0.5 }), seedRow('Control height md', 'controlHeight', 'number', { step: 1 }),
      seedRow('Sans', 'fontSans'), seedRow('Mono', 'fontMono'), seedRow('Shadow tint', 'shadowTint', 'text'),
      el('button', { class: 'pv-btn', onclick: () => { renderPanel(); } }, 'Refresh token fields'),
      el('p', { class: 'pv-small pv-muted' }, 'Manual edits below are kept on top of regenerated values.')));
    for (const g of ['color', 'font', 'type', 'space', 'radius', 'border', 'shadow', 'size', 'z', 'motion', 'breakpoint', 'opacity']) box.append(renderTokenGroup(g, S.tokens[g], [g]));
    return box;
  }
  function renderTokenGroup(label, obj, path) {
    const det = el('details', { class: 'pv-group' }, el('summary', {}, label));
    if (path.length === 1 && label === 'color') { det.append(renderTokenGroup('primitive', obj.primitive, [...path, 'primitive']), renderTokenGroup('semantic', obj.semantic, [...path, 'semantic'])); return det; }
    const isThemed = (v) => v && typeof v === 'object' && 'light' in v && 'dark' in v;
    const isTypeStyle = (v) => v && typeof v === 'object' && 'family' in v && 'size' in v;
    const table = el('div', { class: 'pv-tok' });
    for (const [k, v] of Object.entries(obj)) {
      const p2 = [...path, k];
      const commit = (sub, nv) => {
        const next = applySeedChanges(S.meta.seeds, {}, window.__CANON_PRESET_DEFAULTS__);
        setPath(next.overrides ??= {}, sub, nv); replaceSeeds(next);
        setPath(S.tokens, sub, nv); touch(); debouncedTokens();
      };
      if (typeof v === 'string') table.append(el('div', { class: 'pv-tok__row' }, el('code', {}, k), valueInput(v, (nv) => commit(p2, nv), { color: path.includes('primitive') || /^#/.test(v) })));
      else if (isThemed(v)) table.append(el('div', { class: 'pv-tok__row pv-tok__row--themed' }, el('code', { title: v.description ?? '' }, k), valueInput(v.light, (nv) => commit([...p2, 'light'], nv), { color: path[0] === 'color' }), valueInput(v.dark, (nv) => commit([...p2, 'dark'], nv), { color: path[0] === 'color' })));
      else if (isTypeStyle(v)) {
        const sub = el('details', { class: 'pv-group pv-group--sub' }, el('summary', {}, el('code', {}, k), ' ', el('span', { class: 'pv-muted pv-small' }, v.description ?? '')));
        for (const prop of ['family', 'size', 'weight', 'lineHeight', 'letterSpacing']) sub.append(el('div', { class: 'pv-tok__row' }, el('code', {}, prop), valueInput(v[prop], (nv) => commit([...p2, prop], nv))));
        const selT = el('select', { class: 'pv-in' }, el('option', { value: 'none' }, 'none'), el('option', { value: 'uppercase' }, 'uppercase'));
        selT.value = v.transform ?? 'none';
        selT.addEventListener('change', () => commit([...p2, 'transform'], selT.value));
        sub.append(el('div', { class: 'pv-tok__row' }, el('code', {}, 'transform'), selT));
        table.append(sub);
      } else if (v && typeof v === 'object') table.append(renderTokenGroup(k, v, p2));
    }
    det.append(table);
    return det;
  }

  // ================================================================ Component tab: inspector
  let sel = null; // { slug, part, ctx: {axis: value}, state: string|null, scope: string, el: HTMLElement|null }
  const GROUPS = {
    Layout: ['display', 'flex-direction', 'align-items', 'justify-content', 'flex-wrap', 'gap', 'row-gap', 'column-gap', 'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height', 'padding', 'padding-inline', 'padding-block', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-inline-start', 'padding-inline-end', 'margin', 'margin-inline', 'margin-block', 'margin-top', 'margin-bottom', 'margin-inline-start', 'margin-inline-end', 'position', 'inset', 'top', 'right', 'bottom', 'left', 'overflow', 'flex', 'flex-shrink', 'flex-grow', 'z-index', 'grid-template-columns'],
    Typography: ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-align', 'text-decoration', 'text-underline-offset', 'text-decoration-color', 'white-space', 'font-variant-numeric', 'text-overflow'],
    'Fill & border': ['background-color', 'background', 'border', 'border-color', 'border-width', 'border-style', 'border-radius', 'border-top', 'border-bottom', 'border-inline-start', 'border-inline-end', 'border-block-start', 'border-block-end', 'outline', 'outline-offset', 'outline-color'],
    Effects: ['box-shadow', 'opacity', 'transform', 'transition-property', 'transition-duration', 'transition-timing-function', 'animation', 'cursor', 'pointer-events', 'visibility', 'object-fit', 'aspect-ratio'],
  };
  const ENUMS = {
    display: ['flex', 'inline-flex', 'block', 'inline-block', 'grid', 'inline-grid', 'none', 'contents'],
    'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
    'align-items': ['center', 'flex-start', 'flex-end', 'stretch', 'baseline'],
    'justify-content': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
    'flex-wrap': ['nowrap', 'wrap'],
    position: ['static', 'relative', 'absolute', 'sticky', 'fixed'],
    overflow: ['visible', 'hidden', 'auto', 'scroll', 'clip'],
    cursor: ['pointer', 'default', 'not-allowed', 'text', 'grab', 'progress', 'wait'],
    'text-align': ['left', 'center', 'right', 'start', 'end'],
    'text-transform': ['none', 'uppercase', 'capitalize', 'lowercase'],
    'text-decoration': ['none', 'underline', 'line-through'],
    'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap'],
    'border-style': ['solid', 'dashed', 'dotted', 'none'],
    'pointer-events': ['auto', 'none'],
    visibility: ['visible', 'hidden'],
    'object-fit': ['cover', 'contain', 'fill'],
    'font-variant-numeric': ['normal', 'tabular-nums'],
  };
  const kindOf = (prop) => {
    if (/color$/.test(prop) || prop === 'color' || prop === 'background' || prop === 'outline-color') return 'color';
    if (/^(gap|row-gap|column-gap|padding|margin|inset|top|right|bottom|left)/.test(prop)) return 'space';
    if (/^(width|height|min-width|max-width|min-height|max-height|flex-basis)$/.test(prop)) return 'size';
    if (/radius/.test(prop)) return 'radius';
    if (prop === 'box-shadow') return 'shadow';
    if (prop === 'font-size') return 'font-size';
    if (prop === 'font-weight') return 'font-weight';
    if (prop === 'line-height') return 'line-height';
    if (prop === 'letter-spacing') return 'letter-spacing';
    if (prop === 'font-family') return 'font-family';
    if (prop === 'transition-duration') return 'duration';
    if (prop === 'transition-timing-function') return 'easing';
    if (prop === 'opacity') return 'opacity';
    if (prop === 'z-index') return 'z';
    if (/^(border|border-top|border-bottom|border-inline-start|border-inline-end|border-block-start|border-block-end|outline)$/.test(prop)) return 'border';
    if (ENUMS[prop]) return 'enum';
    return 'any';
  };
  const tokensOf = (prefixes) => [...idx.values()].filter((t) => prefixes.some((p) => t.ref.startsWith(`{${p}`)));
  const OPTIONS = {
    color: () => [...tokensOf(['color.']).map((t) => ({ v: t.ref, label: `${t.path} · ${t.light}` })), ...tokensOf(['neutral.', 'brand.', 'action.', 'red.', 'amber.', 'green.', 'blue.', 'white', 'black']).map((t) => ({ v: t.ref, label: `${t.ref.slice(1, -1)} · ${t.light}` })), { v: 'transparent', label: 'transparent' }, { v: 'currentColor', label: 'currentColor' }, { v: 'inherit', label: 'inherit' }],
    space: () => [...tokensOf(['space.']).map((t) => ({ v: t.ref, label: `space.${t.path} · ${t.light}` })), { v: '0', label: '0' }, { v: 'auto', label: 'auto' }],
    size: () => [...tokensOf(['size.']).map((t) => ({ v: t.ref, label: `${t.ref.slice(1, -1)} · ${t.light}` })), ...tokensOf(['space.']).map((t) => ({ v: t.ref, label: `space.${t.path} · ${t.light}` })), { v: '100%', label: '100%' }, { v: 'auto', label: 'auto' }, { v: 'max-content', label: 'max-content' }, { v: '1em', label: '1em' }],
    radius: () => [...tokensOf(['radius.']).map((t) => ({ v: t.ref, label: `radius.${t.path} · ${t.light}` })), { v: '0', label: '0' }],
    shadow: () => [...tokensOf(['shadow.']).map((t) => ({ v: t.ref, label: `shadow.${t.path}` })), { v: 'none', label: 'none' }],
    'font-size': () => [...tokensOf(['font.size.', 'font.control.']).map((t) => ({ v: t.ref, label: `${t.ref.slice(1, -1)} · ${t.light}` })), { v: '1em', label: '1em' }, { v: 'inherit', label: 'inherit' }],
    'font-weight': () => [...tokensOf(['font.weight.']).map((t) => ({ v: t.ref, label: `${t.path.split('.')[1]} · ${t.light}` })), { v: 'inherit', label: 'inherit' }],
    'line-height': () => [...tokensOf(['font.lineHeight.']).map((t) => ({ v: t.ref, label: `${t.path.split('.')[1]} · ${t.light}` })), { v: '1', label: '1' }, { v: 'inherit', label: 'inherit' }],
    'letter-spacing': () => [...tokensOf(['font.letterSpacing.']).map((t) => ({ v: t.ref, label: `${t.path.split('.')[1]} · ${t.light}` })), { v: '0', label: '0' }, { v: 'inherit', label: 'inherit' }],
    'font-family': () => [...tokensOf(['font.family.']).map((t) => ({ v: t.ref, label: `${t.path.split('.')[1]} · ${t.light.split(',')[0].replace(/"/g, '')}` })), { v: 'inherit', label: 'inherit' }],
    duration: () => tokensOf(['motion.duration.']).map((t) => ({ v: t.ref, label: `${t.path.split('.')[1]} · ${t.light}` })),
    easing: () => tokensOf(['motion.easing.']).map((t) => ({ v: t.ref, label: `${t.path.split('.')[1]} · ${t.light}` })),
    opacity: () => [...tokensOf(['opacity.']).map((t) => ({ v: t.ref, label: `${t.path} · ${t.light}` })), { v: '1', label: '1' }, { v: '0', label: '0' }],
    z: () => [...tokensOf(['z.']).map((t) => ({ v: t.ref, label: `${t.path} · ${t.light}` })), { v: 'auto', label: 'auto' }],
    border: () => [...tokensOf(['color.border-']).map((t) => ({ v: `{border.width.thin} solid ${t.ref}`, label: `1px solid ${t.path}` })), { v: '0', label: '0 (none)' }, { v: '{border.width.medium} solid {color.border-action}', label: '2px solid border-action' }],
  };

  function layers(spec, ctx) {
    const L = [{ scope: 'base', label: 'Base (all)', block: () => (spec.base ??= {}) }];
    for (const [axis, values] of Object.entries(spec.variants ?? {})) { const v = ctx[axis]; if (v && values[v] !== undefined) L.push({ scope: `variants.${axis}.${v}`, label: `${axis} = ${v}`, block: () => (values[v] ??= {}) }); }
    (spec.compound ?? []).forEach((c, i) => { if (Object.entries(c.when).every(([a, v]) => ctx[a] === v)) L.push({ scope: `compound.${i}`, label: `when ${Object.entries(c.when).map(([a, v]) => `${a}=${v}`).join(' + ')}`, block: () => (c.block ??= {}) }); });
    return L;
  }
  function effective(spec, part, ctx, state) {
    const out = {};
    for (const L of layers(spec, ctx)) {
      const b = L.block();
      for (const [k, v] of Object.entries(b?.[part] ?? {})) out[k] = { value: v, scope: L.scope, label: L.label, state: null };
      if (state) for (const [k, v] of Object.entries(b?.['@states']?.[state]?.[part] ?? {})) out[k] = { value: v, scope: L.scope, label: L.label, state };
    }
    return out;
  }
  function declsAt(spec, scope, part, state, create) {
    const L = layers(spec, sel.ctx).find((l) => l.scope === scope);
    if (!L) return null;
    const b = L.block();
    if (!state) return create ? (b[part] ??= {}) : b[part];
    if (create) return (((b['@states'] ??= {})[state] ??= {})[part] ??= {});
    return b['@states']?.[state]?.[part];
  }

  // ---- selection
  const forceStyle = () => $('#pv-force') ?? document.head.appendChild(el('style', { id: 'pv-force' }));
  const hlStyle = () => $('#pv-hl') ?? document.head.appendChild(el('style', { id: 'pv-hl' }));
  function clearSelection() { $$('[data-pv-selected]').forEach((n) => n.removeAttribute('data-pv-selected')); sel = null; hlStyle().textContent = ''; forceStyle().textContent = ''; if (panel.dataset.tab === 'Inspect' && !panel.hidden) renderPanel(); }
  function selectElement(node) {
    const slugs = S.components.map((c) => c.slug).sort((a, b) => b.length - a.length);
    let target = node, found = null;
    while (target && target !== document.body) {
      const classes = [...(target.classList ?? [])];
      for (const cls of classes) {
        if (!cls.startsWith(`${P}-`)) continue;
        const rest = cls.slice(P.length + 1);
        const [base, part] = rest.split('__');
        if (slugs.includes(base)) { found = { slug: base, part: part ?? 'root', node: target }; break; }
      }
      if (found) break;
      target = target.parentElement;
    }
    if (!found) return false;
    const spec = specOf(found.slug);
    const rootEl = found.part === 'root' ? found.node : found.node.closest(`.${P}-${found.slug}`) ?? found.node;
    const ctx = {};
    for (const [axis, pr] of Object.entries(spec.props)) ctx[axis] = rootEl.dataset[axis] ?? pr.default;
    $$('[data-pv-selected]').forEach((n) => n.removeAttribute('data-pv-selected'));
    rootEl.setAttribute('data-pv-selected', '');
    sel = { slug: found.slug, part: found.part, ctx, state: null, scope: null, el: rootEl };
    hlStyle().textContent = `[data-pv-selected] { outline: 2px solid var(--${P}-color-bg-accent) !important; outline-offset: 2px; }`;
    setEditor(true);
    panel.dataset.tab = 'Inspect';
    renderPanel();
    return true;
  }
  function selectPart(part) { if (!sel) return; sel.part = part; renderInspector(); }
  function highlightPart(part) {
    if (!sel) return;
    hlStyle().textContent = `[data-pv-selected] { outline: 2px solid var(--${P}-color-bg-accent) !important; outline-offset: 2px; }` + (part && part !== 'root' ? ` [data-pv-selected] .${P}-${sel.slug}__${part} { outline: 1px dashed var(--${P}-color-bg-accent) !important; outline-offset: 1px; }` : '');
  }
  function forceState() {
    const st = forceStyle();
    if (!sel || !sel.state) { st.textContent = ''; return; }
    const spec = specOf(sel.slug);
    const rules = [];
    for (const a of spec.anatomy) {
      const eff = effective(spec, a.part, sel.ctx, sel.state);
      const decls = Object.entries(eff).filter(([, v]) => v.state).map(([k, v]) => { try { return `${k}: ${toCssVars(rePrefix(v.value, P), idx)} !important`; } catch { return null; } }).filter(Boolean);
      if (decls.length) rules.push(`[data-pv-selected]${a.part === 'root' ? '' : ` .${P}-${sel.slug}__${a.part}`} { ${decls.join('; ')}; }`);
    }
    st.textContent = rules.join('\n');
  }
  // click-to-select inside the gallery when the editor is open
  $('.pv-main').addEventListener('click', (e) => {
    if (!app.hasAttribute('data-editor')) return;
    const stage = e.target.closest('.pv-example__stage, .pv-matrix td, .pv-frame');
    if (!stage) return;
    e.preventDefault(); e.stopPropagation();
    selectElement(e.target);
  }, true);

  // ---- inspector
  function visibleExample(slug) {
    return $$('.pv-section[data-slug="' + slug + '"] .pv-example__stage .' + P + '-' + slug).find((node) => node.getClientRects().length);
  }
  function renderComponentTab() {
    const box = el('div', { id: 'pv-inspector' });
    box.append(renderInspectorInto());
    return box;
  }
  const humanLabel = (name) => name.replace(/[-_]/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
  const sizeLabel = (value) => ({ xs: 'Extra small', sm: 'Small', md: 'Medium', lg: 'Large', xl: 'Extra large' }[value] ?? humanLabel(value));
  const partLabel = (part) => part.part === 'field' && part.element === 'input' ? 'Text input'
    : ({ root: 'Container', affix: 'Prefix / suffix', tooltip: 'Help icon' }[part.part] ?? humanLabel(part.part));
  const propertyLabel = (prop) => ({
    'min-width': 'Minimum width', 'max-width': 'Maximum width', 'min-height': 'Minimum height', 'max-height': 'Maximum height',
    'padding-inline': 'Horizontal padding', 'padding-block': 'Vertical padding',
    'margin-inline': 'Horizontal margin', 'margin-block': 'Vertical margin',
    'padding-inline-start': 'Start padding', 'padding-inline-end': 'End padding',
    'font-family': 'Font', 'font-size': 'Text size', 'font-weight': 'Weight',
    'line-height': 'Line height', 'letter-spacing': 'Letter spacing', 'text-transform': 'Capitalization',
    'background-color': 'Fill', 'border-radius': 'Corner radius', 'box-shadow': 'Shadow',
    'align-items': 'Align items', 'justify-content': 'Distribute items', 'flex-direction': 'Direction',
  }[prop] ?? humanLabel(prop));
  const scopeLabel = (layer) => {
    if (layer.scope === 'base') return 'All sizes and variants';
    if (layer.scope.startsWith('compound.')) return 'Only this combination';
    const [, axis, value] = layer.scope.split('.');
    return (axis === 'size' ? sizeLabel(value) : humanLabel(value)) + ' ' + axis;
  };
  function inspectorField(label, control, id) {
    control.id = id;
    return el('div', { class: 'pv-field' }, el('label', { class: 'pv-label', for: id }, label), control);
  }
  function renderInspector() {
    const box = $('#pv-inspector'); if (!box) return;
    const openGroups = Object.fromEntries($$('details[data-group]', box).map((group) => [group.dataset.group, group.open]));
    box.innerHTML = ''; box.append(renderInspectorInto(openGroups));
  }
  function renderInspectorInto(openGroups = {}) {
    const wrap = el('div', { class: 'pv-inspect-stack' });
    const picker = el('select', { class: 'pv-in pv-in--wide' },
      el('option', { value: '' }, 'Choose a component…'),
      ...S.components.map((c) => el('option', { value: c.slug }, c.name)));
    picker.value = sel?.slug ?? '';
    picker.addEventListener('change', () => {
      const spec = specOf(picker.value);
      if (!spec) { clearSelection(); return; }
      const first = visibleExample(spec.slug);
      if (first) { selectElement(first); first.scrollIntoView({ block: 'center' }); }
      else { sel = { slug: spec.slug, part: 'root', ctx: Object.fromEntries(Object.entries(spec.props).map(([k, v]) => [k, v.default])), state: null, scope: null, el: null }; renderInspector(); }
    });
    const selection = el('section', { class: 'pv-inspect-section' }, inspectorField('Component', picker, 'pv-component-picker'));
    wrap.append(selection);
    if (!sel) {
      selection.append(el('p', { class: 'pv-inspect-hint' }, 'Choose a component or click an example. Adjust its appearance here, then Save to update your design system.'));
      return wrap;
    }
    const spec = specOf(sel.slug);
    const commit = () => { touch('component', sel.slug); rebuildComponent(sel.slug); };
    const parts = el('div', { class: 'pv-chips', role: 'group', 'aria-label': 'Component part' }, ...spec.anatomy.map((part) =>
      el('button', { type: 'button', class: 'pv-chip pv-chip--btn', 'data-on': part.part === sel.part ? '1' : null, 'aria-pressed': String(part.part === sel.part),
        onclick: () => selectPart(part.part), onmouseenter: () => highlightPart(part.part), onmouseleave: () => highlightPart(sel.part), title: part.description }, partLabel(part))));
    selection.append(el('div', { class: 'pv-field' }, el('span', { class: 'pv-label' }, 'Part to edit'), parts));
    selection.append(el('code', { class: 'pv-inspect-selector' }, '.' + P + '-' + sel.slug + (sel.part === 'root' ? '' : '__' + sel.part)));

    const preview = el('section', { class: 'pv-inspect-section pv-inspect-preview' },
      el('div', { class: 'pv-inspect-heading' }, 'Preview'),
      el('p', { class: 'pv-inspect-hint' }, 'Choose the example to inspect.'));
    const context = el('div', { class: 'pv-ctx' });
    for (const [axis, prop] of Object.entries(spec.props)) {
      const control = el('select', { class: 'pv-in' }, ...prop.values.map((value) => el('option', { value }, axis === 'size' ? sizeLabel(value) : humanLabel(value))));
      control.value = sel.ctx[axis];
      control.addEventListener('change', () => { sel.ctx[axis] = control.value; if (sel.el) sel.el.setAttribute('data-' + axis, control.value); if (sel.scope && !layers(spec, sel.ctx).some((layer) => layer.scope === sel.scope)) sel.scope = null; renderInspector(); forceState(); });
      context.append(inspectorField(humanLabel(axis), control, 'pv-preview-' + axis));
    }
    if (Object.keys(spec.states).length) {
      const states = el('select', { class: 'pv-in' }, el('option', { value: '' }, 'Default'),
        ...Object.keys(spec.states).map((state) => el('option', { value: state }, humanLabel(state))));
      states.value = sel.state ?? '';
      states.addEventListener('change', () => { sel.state = states.value || null; renderInspector(); forceState(); });
      context.append(inspectorField('State', states, 'pv-preview-state'));
    }
    if (context.children.length) { preview.append(context); wrap.append(preview); }

    const L = layers(spec, sel.ctx);
    const eff = effective(spec, sel.part, sel.ctx, sel.state);
    const stateful = Object.values(eff).filter((value) => sel.state ? value.state === sel.state : !value.state);
    const owning = L.filter((layer) => Object.keys(layer.block()[sel.part] ?? {}).length || (sel.state && Object.keys(layer.block()['@states']?.[sel.state]?.[sel.part] ?? {}).length));
    const defaultScope = sel.scope ?? stateful.at(-1)?.scope ?? owning.at(-1)?.scope ?? 'base';
    const stateSuffix = sel.state ? ' · ' + humanLabel(sel.state) : '';
    const scopeControl = el('select', { class: 'pv-in' }, ...L.map((layer) => el('option', { value: layer.scope }, scopeLabel(layer) + stateSuffix)));
    if (Object.keys(sel.ctx).length > 1 && !L.some((layer) => layer.scope.startsWith('compound.'))) {
      scopeControl.append(el('option', { value: '__compound' }, '+ Only this combination' + stateSuffix));
    }
    scopeControl.value = defaultScope;
    scopeControl.addEventListener('change', () => {
      if (scopeControl.value === '__compound') {
        (spec.compound ??= []).push({ when: { ...sel.ctx }, block: { root: {} } });
        sel.scope = 'compound.' + (spec.compound.length - 1); commit();
      } else sel.scope = scopeControl.value;
      renderInspector();
    });
    const scope = scopeControl.value;
    const [, axis, value] = scope.split('.');
    const scopeHint = scope === 'base' ? 'Applies to every ' + spec.name + ', in all sizes and variants'
      : scope.startsWith('compound.') ? 'Applies wherever this combination is used'
      : 'Applies to every ' + spec.name + ' with ' + axis + ' ' + (axis === 'size' ? sizeLabel(value) : humanLabel(value));
    wrap.append(el('section', { class: 'pv-inspect-section pv-inspect-scope' },
      inspectorField('Apply changes to', scopeControl, 'pv-edit-scope'),
      el('p', { class: 'pv-inspect-hint' }, scopeHint + (sel.state ? ', in the ' + humanLabel(sel.state) + ' state.' : '.'))));
    const write = (prop, value) => { const declarations = declsAt(spec, scope, sel.part, sel.state, true); declarations[prop] = value; commit(); };
    const remove = (prop) => { const declarations = declsAt(spec, scope, sel.part, sel.state, false); if (declarations) { delete declarations[prop]; commit(); renderInspector(); } };
    const ownDeclarations = declsAt(spec, scope, sel.part, sel.state, false) ?? {};

    const groups = el('div', { class: 'pv-inspect-groups' });
    for (const [group, props] of Object.entries(GROUPS)) {
      const present = props.filter((prop) => eff[prop]);
      const extra = Object.keys(eff).filter((prop) => !Object.values(GROUPS).flat().includes(prop));
      const list = group === 'Effects' ? [...present, ...extra] : present;
      const details = el('details', { class: 'pv-group', 'data-group': group, open: openGroups[group] ?? (group === 'Layout') },
        el('summary', {}, group, el('span', { class: 'pv-group__count' }, String(list.length))));
      const content = el('div', { class: 'pv-inspect-properties' });
      if (group === 'Typography') {
        const names = Object.keys(S.tokens.type);
        const current = names.find((name) => (ownDeclarations['font-size'] ?? eff['font-size']?.value) === '{type.' + name + '.size}' && (ownDeclarations['font-weight'] ?? eff['font-weight']?.value) === '{type.' + name + '.weight}') ?? '';
        const textStyle = el('select', { class: 'pv-in' }, el('option', { value: '' }, 'Choose a text style…'),
          ...names.map((name) => el('option', { value: name }, name + ' · ' + idx.get('type.' + name + '.size')?.light)));
        textStyle.value = current;
        textStyle.addEventListener('change', () => {
          if (!textStyle.value) return;
          const name = textStyle.value, declarations = declsAt(spec, scope, sel.part, sel.state, true);
          for (const [prop, token] of Object.entries({ 'font-family': 'family', 'font-size': 'size', 'font-weight': 'weight', 'line-height': 'lineHeight', 'letter-spacing': 'letterSpacing', 'text-transform': 'transform' })) declarations[prop] = '{type.' + name + '.' + token + '}';
          commit(); renderInspector();
        });
        content.append(inspectorField('Text style', textStyle, 'pv-text-style'),
          el('p', { class: 'pv-inspect-hint' }, 'Sets the font, size, weight and text spacing together.'));
      }
      for (const prop of list) content.append(fieldRow(prop, eff[prop], scope, ownDeclarations[prop], write, remove));
      const add = el('select', { class: 'pv-in pv-add-prop', 'aria-label': 'Add ' + group.toLowerCase() + ' property' },
        el('option', { value: '' }, '+ Add property'), ...props.filter((prop) => !eff[prop]).map((prop) => el('option', { value: prop }, propertyLabel(prop))));
      add.addEventListener('change', () => {
        if (!add.value) return;
        const kind = kindOf(add.value), first = OPTIONS[kind]?.()[0]?.v ?? ENUMS[add.value]?.[0] ?? '';
        write(add.value, first); renderInspector();
      });
      content.append(add); details.append(content); groups.append(details);
    }
    const advanced = el('details', { class: 'pv-group pv-group--adv', 'data-group': 'Advanced', open: openGroups.Advanced ?? false }, el('summary', {}, 'Advanced'));
    advanced.append(el('p', { class: 'pv-inspect-hint' }, 'Edit the component definition, examples and rules for agents.'), renderAdvanced(spec));
    groups.append(advanced); wrap.append(groups);
    return wrap;
  }
  function fieldRow(prop, cur, scope, ownValue, write, remove) {
    const kind = kindOf(prop), label = propertyLabel(prop);
    const inherited = ownValue === undefined;
    const value = ownValue ?? cur.value;
    const row = el('div', { class: 'pv-prop-row', 'data-property': prop, 'data-inherited': inherited ? '1' : null });
    const id = 'pv-property-' + prop;
    const source = el('span', { class: 'pv-src', hidden: !inherited, title: 'From ' + cur.label + (cur.state ? ' · ' + cur.state : '') }, 'Inherited');
    const action = scope === 'base' && !sel.state ? 'Remove' : 'Reset';
    const reset = el('button', { type: 'button', class: 'pv-prop-reset', hidden: inherited, 'aria-label': action + ' ' + label.toLowerCase(), title: action + ' this property in the selected scope', onclick: () => remove(prop) }, action);
    row.append(el('div', { class: 'pv-prop-row__head' }, el('label', { class: 'pv-prop-row__name', for: id, title: prop }, label), source, reset));
    const previewNote = el('p', { class: 'pv-property-note', hidden: true });
    const updatePreviewNote = (written) => {
      const current = effective(specOf(sel.slug), sel.part, sel.ctx, sel.state)[prop];
      previewNote.hidden = written === undefined || !current || current.value === written;
      if (!previewNote.hidden) {
        const layer = layers(specOf(sel.slug), sel.ctx).find((entry) => entry.scope === current.scope);
        previewNote.textContent = 'Preview uses ' + lit(current.value) + ' from ' + scopeLabel(layer) + (current.state ? ' · ' + humanLabel(current.state) : '') + '.';
      }
    };
    const onChange = (next) => { write(prop, next); source.hidden = true; reset.hidden = false; row.removeAttribute('data-inherited'); updatePreviewNote(next); };
    const controls = el('div', { class: 'pv-prop-row__control' });
    if (kind === 'enum') {
      const control = el('select', { id, class: 'pv-in' }, ...ENUMS[prop].map((value) => el('option', { value }, humanLabel(value))),
        ...(ENUMS[prop].includes(value) ? [] : [el('option', { value }, value)]));
      control.value = value; control.addEventListener('change', () => onChange(control.value)); controls.append(control);
    } else if (kind === 'any') {
      const control = valueInput(value, onChange, { color: false });
      control.querySelector('input').id = id; controls.append(control);
    } else {
      const opts = OPTIONS[kind]();
      if (kind === 'size') opts.unshift({ v: '0', label: '0' });
      const token = idx.get(value.slice(1, -1));
      if (token && !opts.some((option) => option.v === value)) opts.unshift({ v: value, label: value.slice(1, -1) + ' · ' + lit(value) });
      const has = opts.some((option) => option.v === value);
      const select = el('select', { id, class: 'pv-in' }, ...opts.map((option) => el('option', { value: option.v }, option.label)), el('option', { value: '__custom' }, 'Custom value…'));
      select.value = has ? value : '__custom';
      const custom = valueInput(value, onChange, { color: kind === 'color', label: 'Custom ' + label.toLowerCase() + ' color' });
      custom.querySelector('input').setAttribute('aria-label', 'Custom ' + label.toLowerCase());
      const customRow = el('div', { class: 'pv-custom-value', hidden: has }, custom);
      let preview = kind === 'color' ? swatch(value) : null;
      const selected = el('div', { class: 'pv-val' }, preview, select);
      select.addEventListener('change', () => {
        customRow.hidden = select.value !== '__custom';
        if (select.value === '__custom') { custom.querySelector('input').focus(); return; }
        custom.querySelector('input').value = select.value;
        onChange(select.value);
        if (preview) { const next = swatch(select.value); preview.replaceWith(next); preview = next; }
      });
      controls.append(selected, customRow);
    }
    updatePreviewNote(ownValue); row.append(controls, previewNote);
    return row;
  }

  // ---- advanced (data editing)
  function renderAdvanced(spec) {
    const box = el('div');
    const commit = () => { touch('component', spec.slug); rebuildComponent(spec.slug); };
    box.append(el('label', { class: 'pv-field' }, 'Description', textArea(spec.description, (v) => { spec.description = v; commit(); }, 2)));
    box.append(el('label', { class: 'pv-field' }, 'When to use', textArea(spec.usage, (v) => { spec.usage = v; commit(); }, 3)));
    const props = el('details', { class: 'pv-group' }, el('summary', {}, 'Props (data attributes)'));
    for (const [k, pr] of Object.entries(spec.props)) {
      const chips = el('div', { class: 'pv-chips' });
      const renderChips = () => {
        chips.innerHTML = '';
        for (const v of pr.values) chips.append(el('span', { class: 'pv-chip', 'data-default': v === pr.default ? '1' : null }, v, el('button', { class: 'pv-x', title: 'remove value', onclick: () => { if (pr.values.length <= 1) return; pr.values = pr.values.filter((x) => x !== v); if (pr.default === v) pr.default = pr.values[0]; delete spec.variants?.[k]?.[v]; commit(); renderInspector(); } }, '×')));
        const add = el('input', { type: 'text', placeholder: '+ value ⏎', class: 'pv-in pv-in--sm' });
        add.addEventListener('keydown', (e) => { if (e.key === 'Enter' && add.value.trim()) { const v = add.value.trim(); if (!pr.values.includes(v)) { pr.values.push(v); ((spec.variants ??= {})[k] ??= {})[v] = { root: {} }; commit(); renderInspector(); } } });
        chips.append(add);
      };
      renderChips();
      const def = el('select', { class: 'pv-in pv-in--sm' }, ...pr.values.map((v) => el('option', { value: v }, v)));
      def.value = pr.default;
      def.addEventListener('change', () => { pr.default = def.value; commit(); renderChips(); });
      props.append(el('div', { class: 'pv-prop' }, el('div', { class: 'pv-prop__head' }, el('code', {}, `data-${k}`), el('span', { class: 'pv-small pv-muted' }, 'default'), def), chips, textArea(pr.description, (v) => { pr.description = v; commit(); }, 2)));
    }
    box.append(props);
    const states = el('details', { class: 'pv-group' }, el('summary', {}, 'States'));
    for (const [k, st] of Object.entries(spec.states)) states.append(el('div', { class: 'pv-prop' }, el('div', { class: 'pv-prop__head' }, el('code', {}, k)), el('label', { class: 'pv-field' }, 'selector', el('input', { type: 'text', value: st.selector, class: 'pv-in', spellcheck: 'false', oninput: (e) => { st.selector = e.target.value; commit(); } })), textArea(st.description, (v) => { st.description = v; commit(); }, 2)));
    box.append(states);
    box.append(el('details', { class: 'pv-group' }, el('summary', {}, 'Extra CSS'), textArea(spec.extraCss ?? '', (v) => { spec.extraCss = v; commit(); }, 8)));
    const exs = el('details', { class: 'pv-group' }, el('summary', {}, `Examples (${spec.examples.length})`));
    spec.examples.forEach((ex, i) => exs.append(el('div', { class: 'pv-prop' }, el('input', { type: 'text', value: ex.title, class: 'pv-in', oninput: (e) => { ex.title = e.target.value; touch('component', spec.slug); rerenderExample(spec.slug, 'example', i); } }), textArea(ex.html, (v) => { ex.html = v; touch('component', spec.slug); rerenderExample(spec.slug, 'example', i); }, 6))));
    exs.append(el('button', { class: 'pv-add', onclick: () => { spec.examples.push({ title: 'New example', html: spec.examples[0].html }); commit(); status('added — Save to render new examples'); } }, '+ example'));
    box.append(exs);
    if (spec.recipes?.length) {
      const rec = el('details', { class: 'pv-group' }, el('summary', {}, `Recipes (${spec.recipes.length})`));
      spec.recipes.forEach((ex, i) => rec.append(el('div', { class: 'pv-prop' }, el('input', { type: 'text', value: ex.title, class: 'pv-in', oninput: (e) => { ex.title = e.target.value; touch('component', spec.slug); rerenderExample(spec.slug, 'recipe', i); } }), textArea(ex.html, (v) => { ex.html = v; touch('component', spec.slug); rerenderExample(spec.slug, 'recipe', i); }, 6))));
      box.append(rec);
    }
    box.append(el('details', { class: 'pv-group' }, el('summary', {}, 'Rules (one per line)'), textArea(spec.rules.join('\n'), (v) => { spec.rules = v.split('\n').filter(Boolean); commit(); }, 8)));
    box.append(el('details', { class: 'pv-group' }, el('summary', {}, 'Accessibility (one per line)'), textArea(spec.a11y.join('\n'), (v) => { spec.a11y = v.split('\n').filter(Boolean); commit(); }, 5)));
    const an = el('details', { class: 'pv-group' }, el('summary', {}, 'Anatomy'));
    for (const a of spec.anatomy) an.append(el('div', { class: 'pv-prop' }, el('div', { class: 'pv-prop__head' }, el('code', {}, a.part), el('input', { type: 'text', value: a.element, class: 'pv-in pv-in--sm', oninput: (e) => { a.element = e.target.value; commit(); } })), textArea(a.description, (v) => { a.description = v; commit(); }, 2)));
    const newPart = el('input', { type: 'text', placeholder: '+ part name ⏎', class: 'pv-in' });
    newPart.addEventListener('keydown', (e) => { if (e.key === 'Enter' && newPart.value.trim()) { spec.anatomy.push({ part: newPart.value.trim(), element: 'div', description: '' }); commit(); renderInspector(); } });
    an.append(newPart);
    box.append(an);
    return box;
  }

  // ================================================================ Direction tab
  function renderDirection() {
    const box = el('div');
    const d = S.meta.direction;
    box.append(el('label', { class: 'pv-field' }, 'Name', el('input', { type: 'text', value: S.meta.name, class: 'pv-in', oninput: (e) => { S.meta.name = e.target.value; touch('meta'); } })));
    box.append(el('label', { class: 'pv-field' }, 'Summary', textArea(d.summary, (v) => { d.summary = v; touch('meta'); }, 4)));
    box.append(el('label', { class: 'pv-field' }, 'Principles (one per line)', textArea(d.principles.join('\n'), (v) => { d.principles = v.split('\n').filter(Boolean); touch('meta'); }, 8)));
    box.append(el('label', { class: 'pv-field' }, 'Never (one per line)', textArea(d.never.join('\n'), (v) => { d.never = v.split('\n').filter(Boolean); touch('meta'); }, 10)));
    box.append(el('label', { class: 'pv-field' }, 'Icons note', textArea(S.meta.icons.note, (v) => { S.meta.icons.note = v; touch('meta'); }, 3)));
    box.append(el('p', { class: 'pv-small pv-muted' }, 'Direction text feeds DESIGN.md §1 and every agent file. Save to regenerate them.'));
    return box;
  }

  // section title → open the component in the inspector
  // Product examples keep their own links and forms in exported HTML, but they
  // must not navigate or submit the Studio document during a demonstration.
  const inExample = (node) => node.closest('.pv-example__stage, .pv-matrix td, .pv-frame');
  $('.pv-main').addEventListener('click', (event) => {
    if (!inExample(event.target) || !event.target.closest('a[href]')) return;
    event.preventDefault();
    if (!app.hasAttribute('data-editor')) status('Example link · you are still in the Studio');
  });
  $('.pv-main').addEventListener('submit', (event) => {
    if (!inExample(event.target)) return;
    event.preventDefault(); status('Example form · no data was submitted');
  });
  for (const sec of publicCatalog ? [] : $$('.pv-section[data-slug]')) {
    sec.querySelector('.pv-h2')?.addEventListener('click', () => {
      const first = visibleExample(sec.dataset.slug);
      if (first) selectElement(first); else { setEditor(true); panel.dataset.tab = 'Inspect'; renderPanel(); }
    });
  }
  const search = $('#pv-search');
  const navToggle = $('#pv-nav-toggle');
  if (navToggle) {
    const collapse = () => { $('.pv-nav').removeAttribute('data-expanded'); navToggle.setAttribute('aria-expanded', 'false'); };
    navToggle.addEventListener('click', () => { const open = $('.pv-nav').toggleAttribute('data-expanded'); navToggle.setAttribute('aria-expanded', String(open)); });
    for (const link of $$('.pv-nav a')) link.addEventListener('click', collapse);
    $('.pv-nav').addEventListener('keydown', (e) => { if (e.key === 'Escape') { collapse(); navToggle.focus(); } });
  }
  const catalogLinks = $$('.pv-nav-group a[href^="#"]');
  let groupsBeforeSearch = null;
  if (search) search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    const groups = $$('.pv-nav-group');
    if (query && !groupsBeforeSearch) groupsBeforeSearch = new Map(groups.map((group) => [group, group.open]));
    for (const link of catalogLinks) link.hidden = !!query && !link.textContent.toLowerCase().includes(query);
    for (const group of groups) {
      group.hidden = !$$('a', group).some((link) => !link.hidden);
      if (query) group.open = !group.hidden;
      else if (groupsBeforeSearch) group.open = groupsBeforeSearch.get(group) ?? false;
    }
    if (!query) groupsBeforeSearch = null;
    for (const heading of $$('.pv-nav__group')) {
      let sibling = heading.nextElementSibling, any = false;
      while (sibling && !sibling.classList.contains('pv-nav__group')) { if (sibling.classList.contains('pv-nav-group') && !sibling.hidden) any = true; sibling = sibling.nextElementSibling; }
      heading.hidden = !!query && !any;
    }
    $('#pv-nav-empty').hidden = catalogLinks.some((link) => !link.hidden);
  });
  const crumb = $('#pv-crumb');
  function activeSection(id, reveal = false) {
    const link = catalogLinks.find((item) => item.getAttribute('href') === '#' + id);
    if (!link) return;
    for (const item of catalogLinks) { if (item === link) item.setAttribute('aria-current', 'location'); else item.removeAttribute('aria-current'); }
    const heading = document.getElementById(id)?.querySelector('.pv-h2');
    if (crumb) crumb.textContent = heading?.firstChild?.textContent.trim() || link.textContent;
    if (reveal) {
      link.closest('.pv-nav-group').open = true;
      if (matchMedia('(min-width: 901px)').matches) {
        const nav = $('.pv-nav'), bounds = nav.getBoundingClientRect(), item = link.getBoundingClientRect();
        if (item.top < bounds.top || item.bottom > bounds.bottom) nav.scrollTop += item.top - bounds.top - nav.clientHeight / 2;
      }
    }
  }
  const followHash = () => activeSection(location.hash.slice(1) || 'f-overview', true);
  addEventListener('hashchange', followHash); followHash();
  if (crumb && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => { for (const entry of entries) if (entry.isIntersecting) activeSection(entry.target.id); }, { rootMargin: '-10% 0px -80% 0px' });
    for (const sec of $$('.pv-section')) io.observe(sec);
  }
  // Product breakpoints belong to the preview canvas. The engine already emits
  // matching container queries; browser-width media rules would make a desktop
  // canvas switch to mobile when the Studio window itself becomes narrow.
  const previewStyleSources = new WeakMap();
  function preparePreviewStyle(node) {
    if (!node.sheet) return;
    const previous = previewStyleSources.get(node);
    const firstRule = node.sheet.cssRules[0];
    if (previous?.source === node.textContent && previous.firstRule === firstRule) return;
    previewStyleSources.set(node, { source: node.textContent, firstRule });
    const visit = (rules) => {
      for (const rule of rules) {
        if (rule.type === CSSRule.MEDIA_RULE && /^\((?:max|min)-width:\s*[^)]+\)$/.test(rule.conditionText)) rule.media.mediaText = 'not all';
        if (rule.style) for (const property of [...rule.style]) {
          const value = rule.style.getPropertyValue(property);
          if (!/\d(?:[dsl])?v[wh]\b/.test(value)) continue;
          const bounded = value.replace(/(-?(?:\d+(?:\.\d+)?|\.\d+))(?:[dsl])?v([wh])\b/g, (_, amount, axis) => `calc(var(--pv-viewport-${axis === 'w' ? 'width' : 'height'}, 100v${axis}) * ${Number(amount) / 100})`);
          rule.style.setProperty(property, bounded, rule.style.getPropertyPriority(property));
        }
        if (rule.cssRules) visit(rule.cssRules);
      }
    };
    visit(node.sheet.cssRules);
  }
  const previewStyleObserver = new MutationObserver((records) => {
    for (const node of new Set(records.map((record) => record.target.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target))) preparePreviewStyle(node);
  });
  for (const node of $$('#cn-css-base, #cn-css-patterns, style[data-component]')) {
    preparePreviewStyle(node);
    previewStyleObserver.observe(node, { childList: true, characterData: true, subtree: true });
  }

  function fitPreview(canvas) {
    const mode = canvas.closest('[data-example-set]').dataset.previewZoom || 'fit';
    canvas.dataset.previewZoom = mode;
    if (!canvas.clientWidth) return;
    const frame = $('.pv-frame', canvas);
    const bounds = $('.pv-canvas__bounds', canvas);
    const padding = getComputedStyle(canvas);
    const available = canvas.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
    const width = frame.offsetWidth, height = frame.offsetHeight;
    const fitScale = Math.min(1, Math.max(0, available) / width);
    const scale = mode === 'actual' ? 1 : fitScale;
    frame.style.setProperty('--pv-preview-scale', String(scale));
    bounds.style.width = `${width * scale}px`;
    bounds.style.height = `${height * scale}px`;
    canvas.style.justifyContent = mode === 'actual' && width > available ? 'flex-start' : 'center';
    if (mode === 'actual') canvas.style.height = `${height * fitScale + parseFloat(padding.paddingTop) + parseFloat(padding.paddingBottom)}px`;
    else canvas.style.removeProperty('height');
    $('[data-preview-metrics]', canvas.closest('.pv-pattern, .pv-example')).textContent = `${width} × ${height} · ${mode === 'actual' ? '100%' : `Fit ${Math.round(scale * 100)}%`}`;
  }
  const previewCanvases = $$('[data-preview-canvas]');
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver((entries) => { for (const entry of entries) fitPreview(entry.target); });
    for (const canvas of previewCanvases) observer.observe(canvas);
  }
  for (const canvas of previewCanvases) fitPreview(canvas);
  window.addEventListener('resize', () => { for (const canvas of previewCanvases) fitPreview(canvas); });
  for (const picker of $$('[data-example-picker]')) picker.addEventListener('change', () => {
    const examples = document.getElementById(picker.getAttribute('aria-controls'));
    if (examples.querySelector('[data-pv-selected]')) clearSelection();
    for (const option of $$(':scope > [data-example-option]', examples)) option.hidden = option.dataset.exampleOption !== picker.value;
    for (const canvas of $$('[data-preview-canvas]', examples)) fitPreview(canvas);
  });
  for (const button of $$('[data-viewport]')) button.addEventListener('click', () => {
    const examples = button.closest('[data-example-set]');
    for (const frame of $$('.pv-frame[data-vp]', examples)) frame.dataset.vp = button.dataset.viewport;
    for (const control of $$('[data-viewport]', examples)) control.setAttribute('aria-pressed', String(control.dataset.viewport === button.dataset.viewport));
    for (const canvas of $$('[data-preview-canvas]', examples)) fitPreview(canvas);
  });
  for (const button of $$('button[data-preview-zoom]')) button.addEventListener('click', () => {
    const examples = button.closest('[data-example-set]');
    const mode = button.dataset.previewZoom;
    examples.dataset.previewZoom = mode;
    for (const control of $$('button[data-preview-zoom]', examples)) {
      const label = mode === 'actual' ? 'Fit preview to available width' : 'Preview at 100%';
      control.dataset.previewZoom = mode === 'actual' ? 'fit' : 'actual';
      control.textContent = mode === 'actual' ? 'Fit' : '100%';
      control.setAttribute('aria-label', label); control.title = label;
    }
    for (const canvas of $$('[data-preview-canvas]', examples)) {
      fitPreview(canvas);
      if (mode === 'fit') { canvas.scrollLeft = 0; canvas.scrollTop = 0; }
    }
  });
})();
