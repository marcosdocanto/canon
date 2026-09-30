// Library-mode Studio editor: theme tab, components tab, save flow.
//
// Vanilla JS, no framework — mirrors src/editor.js's idioms (a tiny `el()` DOM-builder, a plain
// IIFE, a local "draft" reconciled against the last-known server state) but talks to the
// /api/lib/* endpoints (src/serve-lib.ts) instead of the native /api/* ones, and edits a target
// repo's own theme + cva() variants instead of a Canon-authored design/ source.
//
// This file is served as a static asset from its own root (src/lib-editor/) — it cannot import
// src/color.js (a request for a path outside that root is rejected by serve-shared.ts's
// containment check) — so color parsing below uses the browser's own CSS engine (via a scratch
// <canvas> 2D context) instead of duplicating that module's OKLCH math. That also means this file
// recognizes anything the browser's CSS parser accepts as a color (hex, rgb(), hsl(), oklch(),
// color(), …), a superset of the hex/rgb/hsl/oklch the brief calls out by name.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
    return n;
  }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  const clone = (value) => JSON.parse(JSON.stringify(value));

  // ---------------------------------------------------------------- color detection
  let colorCtx = null;
  function getColorCtx() { if (!colorCtx) colorCtx = document.createElement('canvas').getContext('2d'); return colorCtx; }
  const COLOR_SENTINEL = 'rgba(0, 0, 0, 0)';
  /** Normalize `value` through the canvas fillStyle parser, or null when the browser rejects it as a color. Invalid input leaves fillStyle unchanged, which is why every call resets to a known sentinel first. */
  function normalizeCssColor(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const trimmed = value.trim();
    const ctx = getColorCtx();
    ctx.fillStyle = COLOR_SENTINEL;
    try { ctx.fillStyle = trimmed; } catch { return null; }
    const out = ctx.fillStyle;
    if (out === COLOR_SENTINEL && trimmed !== COLOR_SENTINEL && trimmed.toLowerCase() !== 'transparent') return null;
    return out;
  }
  function isCssColor(value) { return normalizeCssColor(value) !== null; }
  /** hex-representable = opaque and parseable — anything with an alpha channel serializes as rgba(...)/hsla(...), never #rrggbb. */
  function cssColorToHex(value) {
    const out = normalizeCssColor(value);
    return out && /^#[0-9a-f]{6}$/i.test(out) ? out : null;
  }
  /** A bare length like "0.625rem" or "8px" — radius/spacing vars get a slider alongside the text input; anything else (font stacks, keywords) doesn't. */
  function parseSimpleLength(value) {
    const m = /^(-?[\d.]+)(rem|px|em)$/.exec(String(value ?? '').trim());
    return m ? { num: Number(m[1]), unit: m[2] } : null;
  }

  // ---------------------------------------------------------------- state
  let state = null; // last-known-good server state: { theme, components, vocabulary, hashes }
  let draftTheme = null; // { file, vars } — cloned from state.theme, mutated by the Theme tab
  const draftComponents = new Map(); // slug -> CvaSpec, populated lazily the first time a component is opened
  // slug -> { [partName]: classes } — EDITABLE parts only (those with a `classes` string in state;
  // a read-only part has none to draft), populated lazily the first time a component's Parts
  // section is rendered. Shape matches the save payload's `parts[slug]` exactly, so no
  // transformation is needed when building it (see save()).
  const draftParts = new Map();
  let activeView = 'theme'; // 'theme' | a component slug
  let conflictFile = null; // set on a 409 save response
  let saveIssue = null; // { scope: 'theme' | 'component' | 'part' | null, slug?, partName?, message } from a 422 (or other) save failure
  let saving = false;
  let previewBlobUrl = null;
  let vocabReady = false;

  const specOf = (slug) => state.components.find((c) => c.slug === slug);
  function ensureDraft(slug) {
    if (draftComponents.has(slug)) return;
    const info = specOf(slug);
    if (info?.cva) draftComponents.set(slug, clone(info.cva));
  }
  /** The editable subset of `specOf(slug)?.parts` as a `{ [partName]: classes }` map — the same shape `draftParts` holds — used both to seed a fresh draft and to diff the current draft against last-known-good state. */
  function specPartsOf(slug) {
    const editable = {};
    for (const part of specOf(slug)?.parts ?? []) if (part.classes !== undefined) editable[part.name] = part.classes;
    return editable;
  }
  function ensureDraftParts(slug) {
    if (draftParts.has(slug)) return;
    draftParts.set(slug, specPartsOf(slug));
  }
  function isCvaDirty(slug) {
    const draft = draftComponents.get(slug);
    if (!draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(specOf(slug)?.cva);
  }
  function isPartsDirty(slug) {
    const draft = draftParts.get(slug);
    if (!draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(specPartsOf(slug));
  }
  function isComponentDirty(slug) { return isCvaDirty(slug) || isPartsDirty(slug); }
  function isThemeDirty() { return JSON.stringify(draftTheme?.vars) !== JSON.stringify(state?.theme?.vars); }
  function dirtySlugs() { return [...new Set([...draftComponents.keys(), ...draftParts.keys()])].filter(isComponentDirty); }
  function isDirty() { return isThemeDirty() || dirtySlugs().length > 0; }
  const axisValueFromKey = (key) => (key === 'true' ? true : key === 'false' ? false : key);

  // ---------------------------------------------------------------- status / chrome
  let statusTimer;
  function status(msg, isError) {
    const bar = $('#le-status');
    bar.textContent = msg;
    bar.dataset.error = isError ? '1' : '';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { bar.textContent = ''; }, 4000);
  }
  /** Cheap DOM updates only — no re-render — so this can run after every keystroke without stealing focus from an open input. */
  function refreshChrome() {
    const save = $('#le-save');
    save.disabled = saving || !isDirty();
    save.textContent = saving ? 'Saving…' : 'Save';
    const themeTab = $('#le-tab-theme');
    themeTab.dataset.active = activeView === 'theme' ? '1' : '';
    themeTab.dataset.dirty = isThemeDirty() ? '1' : '';
    for (const item of $$('.le-comp-item')) {
      item.dataset.active = activeView === item.dataset.slug ? '1' : '';
      item.dataset.dirty = isComponentDirty(item.dataset.slug) ? '1' : '';
    }
  }
  function renderBanner() {
    const banner = $('#le-banner');
    banner.innerHTML = '';
    if (!conflictFile) { banner.hidden = true; return; }
    banner.hidden = false;
    banner.append(
      el('span', {}, `"${conflictFile}" changed on disk since this Studio loaded it. Reload to see the latest version (your unsaved edits will be dropped).`),
      el('button', { type: 'button', class: 'le-btn', onclick: reloadFromConflict }, 'Reload'),
    );
  }

  // ---------------------------------------------------------------- data loading
  async function loadState() {
    const res = await fetch('/api/lib/state');
    if (!res.ok) throw new Error(`Failed to load state (${res.status})`);
    state = await res.json();
    draftTheme = clone(state.theme);
    draftComponents.clear();
    draftParts.clear();
    if (activeView !== 'theme' && !specOf(activeView)) activeView = 'theme';
    conflictFile = null;
    saveIssue = null;
    vocabReady = false;
    $('#le-vocab')?.remove();
    renderAll();
    loadFullPreview();
  }
  async function reloadFromConflict() {
    try { await loadState(); status('reloaded'); }
    catch (e) { status(`Reload failed: ${e.message}`, true); }
  }
  function loadFullPreview() {
    // The server's own disk state (not the draft) — used on first load and right after a save,
    // when disk and draft agree. Cache-busted defensively even though the endpoint sends no-store.
    $('#le-preview-frame').src = `/api/lib/preview?t=${Date.now()}`;
  }
  function showPreviewHtml(html) {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const old = previewBlobUrl;
    $('#le-preview-frame').src = url;
    previewBlobUrl = url;
    if (old) setTimeout(() => URL.revokeObjectURL(old), 1000);
  }
  const schedulePreview = debounce(() => {
    fetch('/api/lib/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ theme: draftTheme }) })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`Preview failed (${res.status})`))))
      .then(showPreviewHtml)
      .catch((e) => status(e.message, true));
  }, 150);

  // ---------------------------------------------------------------- save
  async function save() {
    if (saving || !isDirty()) return;
    // Clear both failure categories up front: a fresh attempt must never leave a stale banner
    // (from an earlier 409) showing alongside — or instead of — this attempt's own result.
    conflictFile = null; saveIssue = null;
    saving = true; refreshChrome();
    const payload = { hashes: state.hashes };
    if (isThemeDirty()) payload.theme = draftTheme;
    const dirty = dirtySlugs();
    const cvaDirty = dirty.filter(isCvaDirty);
    if (cvaDirty.length) payload.components = Object.fromEntries(cvaDirty.map((slug) => [slug, draftComponents.get(slug)]));
    const partsDirty = dirty.filter(isPartsDirty);
    if (partsDirty.length) payload.parts = Object.fromEntries(partsDirty.map((slug) => [slug, draftParts.get(slug)]));
    try {
      const res = await fetch('/api/lib/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.status === 200) {
        state = await res.json();
        draftTheme = clone(state.theme);
        draftComponents.clear();
        draftParts.clear();
        status('saved');
        renderAll();
        loadFullPreview();
        return;
      }
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        conflictFile = body.file ?? 'a project file';
        status('save conflict', true);
      } else if (res.status === 422) {
        // Three distinct shapes from serve-lib.ts's handleSave: a theme-level failure (the
        // adapter's writeTheme threw, e.g. the CSS-injection guard) responds { field: 'theme',
        // message }; a component (cva) failure (unknown/read-only slug, or writeVariants threw)
        // responds { slug, message }; a part failure (unknown/read-only part, or writePart threw)
        // responds { slug, partName, message }. Each needs its own persistent, in-panel rendering
        // — see renderThemePanel/renderComponentPanel/renderPartRow — not just the 4s transient
        // status() line.
        const body = await res.json().catch(() => ({}));
        if (body.field === 'theme') {
          saveIssue = { scope: 'theme', message: body.message ?? 'Save failed' };
          activeView = 'theme';
        } else if (body.partName !== undefined) {
          saveIssue = { scope: 'part', slug: body.slug, partName: body.partName, message: body.message ?? 'Save failed' };
          if (body.slug && specOf(body.slug)) activeView = body.slug;
        } else {
          saveIssue = { scope: 'component', slug: body.slug, message: body.message ?? 'Save failed' };
          if (body.slug && specOf(body.slug)) activeView = body.slug;
        }
        status('save failed', true);
      } else {
        const body = await res.json().catch(() => ({}));
        saveIssue = { scope: null, message: body.error ?? body.message ?? `Save failed (${res.status})` };
        status('save failed', true);
      }
    } catch (e) {
      saveIssue = { scope: null, message: e.message };
      status('save failed', true);
    } finally {
      saving = false;
      renderRail(); renderBanner(); renderEditorBody(); refreshChrome();
    }
  }

  // ---------------------------------------------------------------- rail
  function renderRail() {
    const list = $('#le-component-list');
    list.innerHTML = '';
    for (const c of state.components) {
      list.append(el('button', {
        type: 'button',
        class: 'le-nav-item le-comp-item',
        'data-slug': c.slug,
        'data-active': activeView === c.slug ? '1' : null,
        'data-readonly': c.readOnlyReason ? '1' : null,
        'data-dirty': isComponentDirty(c.slug) ? '1' : null,
        title: c.readOnlyReason ?? '',
        onclick: () => selectView(c.slug),
      },
      el('span', { class: 'le-nav-item__name' }, c.exportName),
      c.readOnlyReason ? el('span', { class: 'le-badge' }, 'read-only') : null));
    }
  }
  function selectView(view) {
    activeView = view;
    saveIssue = null;
    renderRail(); renderEditorBody(); refreshChrome();
  }

  // ---------------------------------------------------------------- editor body
  function renderEditorBody() {
    $('#le-editor-title').textContent = activeView === 'theme' ? 'Theme' : (specOf(activeView)?.exportName ?? activeView);
    const body = $('#le-editor-body');
    body.innerHTML = '';
    body.append(activeView === 'theme' ? renderThemePanel() : renderComponentPanel(activeView));
  }

  // ================================================================ Theme tab
  function onThemeChange() { refreshChrome(); schedulePreview(); }
  function renderThemePanel() {
    const wrap = el('div', { class: 'le-stack' });
    if (saveIssue && saveIssue.scope === 'theme') wrap.append(el('div', { class: 'le-issue' }, saveIssue.message));
    wrap.append(el('p', { class: 'le-theme-file' }, draftTheme.file));
    const entries = Object.entries(draftTheme.vars);
    const isColorVar = ([, v]) => isCssColor(v.light) || (v.dark !== undefined && isCssColor(v.dark));
    const colorVars = entries.filter(isColorVar);
    const otherVars = entries.filter((entry) => !isColorVar(entry));
    if (colorVars.length) wrap.append(el('section', { class: 'le-section' }, el('h3', { class: 'le-group-title' }, 'Colors'), el('div', { class: 'le-var-list' }, ...colorVars.map(([name, value]) => renderVarRow(name, value)))));
    if (otherVars.length) wrap.append(el('section', { class: 'le-section' }, el('h3', { class: 'le-group-title' }, 'Other'), el('div', { class: 'le-var-list' }, ...otherVars.map(([name, value]) => renderVarRow(name, value)))));
    if (!entries.length) wrap.append(el('p', { class: 'le-hint' }, 'This theme has no CSS variables.'));
    return wrap;
  }
  function renderVarRow(name, value) {
    return el('div', { class: 'le-var-row', 'data-var': name },
      el('code', { class: 'le-var-name', title: name }, name),
      renderVarValueInput(name, 'light', value.light, undefined),
      renderVarValueInput(name, 'dark', value.dark, value.light));
  }
  function renderVarValueInput(name, key, value, fallback) {
    const effective = () => (input.value || fallback || '');
    const wrap = el('div', { class: 'le-var-value' });
    const input = el('input', { type: 'text', class: 'le-in', 'data-var-key': key, spellcheck: 'false', value: value ?? '', placeholder: key === 'dark' ? 'same as light' : '' });
    let swatchEl = null;
    let picker = null; // set below when this value is colorish; kept in sync from the text input too, so typing a hex doesn't get reverted the next time the picker is touched
    const updateSwatch = () => {
      const hex = normalizeCssColor(effective());
      if (hex) {
        const next = el('span', { class: 'le-swatch', style: `background:${hex}` });
        if (swatchEl) swatchEl.replaceWith(next); else wrap.prepend(next);
        swatchEl = next;
      } else if (swatchEl) { swatchEl.remove(); swatchEl = null; }
    };
    const commit = (next) => {
      const entry = draftTheme.vars[name];
      if (key === 'light') entry.light = next;
      else if (!next) delete entry.dark;
      else entry.dark = next;
      onThemeChange();
    };
    input.addEventListener('input', () => {
      commit(input.value); updateSwatch();
      const hex = cssColorToHex(input.value);
      if (picker && hex) picker.value = hex; // keep the picker in sync so touching it afterward doesn't revert a typed hex value
    });
    wrap.append(input);
    if (isCssColor(value ?? fallback ?? '')) {
      picker = el('input', { type: 'color', class: 'le-color', value: cssColorToHex(value ?? fallback ?? '') ?? '#000000', 'aria-label': `${name} ${key}` });
      picker.addEventListener('input', () => { input.value = picker.value; commit(picker.value); updateSwatch(); });
      wrap.append(picker);
    } else {
      const length = parseSimpleLength(value ?? fallback ?? '');
      if (length) {
        const range = el('input', { type: 'range', class: 'le-range', min: 0, max: Math.max(length.num * 3, 2), step: 0.05, value: length.num, 'aria-label': `${name} ${key} (slider)` });
        range.addEventListener('input', () => { input.value = `${range.value}${length.unit}`; commit(input.value); updateSwatch(); });
        wrap.append(range);
      }
    }
    updateSwatch();
    return wrap;
  }

  // ================================================================ Components tab
  function ensureVocabDatalist() {
    if (vocabReady) return;
    document.body.append(el('datalist', { id: 'le-vocab' }, ...state.vocabulary.map((v) => el('option', { value: v }))));
    vocabReady = true;
  }
  function onComponentChange(slug) {
    refreshChrome();
    if (activeView === slug) {
      const body = $('#le-editor-body');
      body.innerHTML = '';
      body.append(renderComponentPanel(slug));
    }
    for (const item of $$('.le-comp-item')) if (item.dataset.slug === slug) item.dataset.dirty = isComponentDirty(slug) ? '1' : null;
  }
  // A "class" here is whatever the source's cva() literal held for this slot — often a single,
  // very long, space-separated Tailwind utility string (a real shadcn base class routinely runs
  // 300+ characters), not one short token. `.le-chip__label` truncates that text to a single line
  // with an ellipsis so a long value can never grow the chip's box past its intrinsic line height
  // and bleed into neighboring rows/labels; `title` always carries the untruncated text so it's
  // still fully readable on hover regardless of length.
  function chipEl(text, { warn = false, extraTitle = '', child } = {}) {
    const title = extraTitle ? `${text}\n${extraTitle}` : text;
    return el('span', { class: 'le-chip', 'data-warn': warn ? '1' : null, title },
      el('span', { class: 'le-chip__label' }, text),
      child ?? null);
  }
  function renderChipList(classes, { onRemove, onAdd }) {
    ensureVocabDatalist();
    const box = el('div', { class: 'le-chips' });
    for (const cls of classes) {
      const known = state.vocabulary.includes(cls);
      box.append(chipEl(cls, {
        warn: !known,
        extraTitle: known ? '' : 'Not in the known class vocabulary — still allowed',
        child: el('button', { type: 'button', class: 'le-chip__x', 'aria-label': `Remove ${cls}`, onclick: () => onRemove(cls) }, '×'),
      }));
    }
    const add = el('input', { type: 'text', class: 'le-in le-in--sm', placeholder: '+ class ⏎', list: 'le-vocab', spellcheck: 'false' });
    add.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const v = add.value.trim();
      if (!v) return;
      onAdd(v);
      add.value = '';
    });
    box.append(add);
    return box;
  }
  function renderComponentPanel(slug) {
    const info = specOf(slug);
    const wrap = el('div', { class: 'le-stack' });
    if (!info) { wrap.append(el('p', { class: 'le-hint le-hint--error' }, 'This component is no longer in the inventory — try Reload.')); return wrap; }
    if (saveIssue && saveIssue.scope === 'component' && saveIssue.slug === slug) wrap.append(el('div', { class: 'le-issue' }, saveIssue.message));
    wrap.append(el('div', { class: 'le-comp-meta' }, el('code', {}, info.importPath), el('span', { class: 'le-muted' }, info.exportName)));

    const hasCva = Boolean(info.cva);
    const hasParts = Boolean(info.parts && info.parts.length);

    if (!hasCva) {
      // A cva()-level readOnlyReason (the call existed but failed to parse, or had an unsafe key)
      // is always worth surfacing even when this component also has parts below; the "no editable
      // variants" filler only applies when there's truly nothing else on this panel either.
      if (info.readOnlyReason) wrap.append(el('p', { class: 'le-hint' }, `Read-only: ${info.readOnlyReason}`));
      else if (!hasParts) wrap.append(el('p', { class: 'le-hint' }, 'This component has no editable variants.'));
    } else {
      ensureDraft(slug);
      const spec = draftComponents.get(slug);

      wrap.append(el('section', { class: 'le-section' },
        el('h3', { class: 'le-group-title' }, 'Base classes'),
        renderChipList(spec.base, {
          onRemove: (cls) => { spec.base = spec.base.filter((c) => c !== cls); onComponentChange(slug); },
          onAdd: (cls) => { if (!spec.base.includes(cls)) spec.base.push(cls); onComponentChange(slug); },
        })));

      for (const [axis, values] of Object.entries(spec.variants)) wrap.append(renderAxisSection(slug, values, axis));

      if (Object.keys(spec.variants).length) wrap.append(renderDefaultsSection(slug, spec));
      if (spec.compoundVariants.length) wrap.append(renderCompoundVariantsSection(spec));
    }

    // Below Variants (when present): one row per exported subcomponent's own className literal —
    // entirely independent of the cva() above (a file can carry both, either, or neither; see
    // shadcn/parts.ts).
    if (hasParts) wrap.append(renderPartsSection(slug, info.parts));

    return wrap;
  }

  // ---- Parts section: one row per exported subcomponent (shadcn/parts.ts's PartInfo) -----------
  function renderPartsSection(slug, parts) {
    ensureDraftParts(slug);
    return el('section', { class: 'le-section', 'data-parts': '1' },
      el('h3', { class: 'le-group-title' }, 'Parts'),
      el('div', { class: 'le-parts-list' }, ...parts.map((part) => renderPartRow(slug, part))));
  }
  function renderPartRow(slug, part) {
    const row = el('div', { class: 'le-part-row', 'data-part': part.name });
    row.append(el('code', { class: 'le-part-name' }, part.name));
    if (part.classes === undefined) {
      // Read-only: name + reason only, never an input — same rule the rail/Components panel apply
      // to a read-only component as a whole.
      row.append(el('span', { class: 'le-hint' }, part.readOnlyReason ? `Read-only: ${part.readOnlyReason}` : 'Read-only'));
      return row;
    }
    const draft = draftParts.get(slug);
    if (saveIssue && saveIssue.scope === 'part' && saveIssue.slug === slug && saveIssue.partName === part.name) {
      row.append(el('div', { class: 'le-issue' }, saveIssue.message));
    }
    // The draft model is a single space-separated string (the same shape the save payload and
    // PartInfo.classes both use) — split into chips for editing, same as a cva class LIST, and
    // rejoined back into that string on every add/remove.
    const classes = draft[part.name].split(/\s+/).filter(Boolean);
    const line = el('div', { class: 'le-part-chips' },
      renderChipList(classes, {
        onRemove: (cls) => { draft[part.name] = classes.filter((c) => c !== cls).join(' '); onComponentChange(slug); },
        onAdd: (cls) => { if (!classes.includes(cls)) classes.push(cls); draft[part.name] = classes.join(' '); onComponentChange(slug); },
      }));
    if (part.dynamicTail) line.append(el('code', { class: 'le-part-tail', title: part.dynamicTail }, `+ ${part.dynamicTail}`));
    row.append(line);
    if (part.note) row.append(el('p', { class: 'le-hint le-part-note' }, part.note));
    return row;
  }
  function renderAxisSection(slug, values, axis) {
    const section = el('section', { class: 'le-section', 'data-axis': axis });
    const table = el('div', { class: 'le-axis-table' });
    for (const [value, classes] of Object.entries(values)) {
      table.append(el('div', { class: 'le-axis-row', 'data-value': value },
        el('code', { class: 'le-axis-value' }, value),
        renderChipList(classes, {
          onRemove: (cls) => { values[value] = classes.filter((c) => c !== cls); onComponentChange(slug); },
          onAdd: (cls) => { if (!classes.includes(cls)) classes.push(cls); onComponentChange(slug); },
        })));
    }
    const addValue = el('button', {
      type: 'button', class: 'le-add',
      onclick: () => {
        const name = window.prompt(`New value name for "${axis}":`);
        const trimmed = name?.trim();
        if (!trimmed || values[trimmed]) return;
        const sibling = Object.values(values).at(-1) ?? [];
        values[trimmed] = [...sibling];
        onComponentChange(slug);
      },
    }, '+ add value');
    section.append(el('h3', { class: 'le-group-title' }, axis), table, addValue);
    return section;
  }
  function renderDefaultsSection(slug, spec) {
    const section = el('section', { class: 'le-section' }, el('h3', { class: 'le-group-title' }, 'Defaults'));
    for (const axis of Object.keys(spec.variants)) {
      const options = Object.keys(spec.variants[axis]);
      const current = String(spec.defaultVariants[axis]);
      const select = el('select', { class: 'le-in' }, ...options.map((v) => el('option', { value: v, selected: v === current ? true : null }, v)));
      select.addEventListener('change', () => { spec.defaultVariants[axis] = axisValueFromKey(select.value); onComponentChange(slug); });
      section.append(el('label', { class: 'le-field' }, el('span', { class: 'le-label' }, axis), select));
    }
    return section;
  }
  function renderCompoundVariantsSection(spec) {
    const section = el('section', { class: 'le-section' },
      el('h3', { class: 'le-group-title' }, 'Compound variants'),
      el('p', { class: 'le-hint' }, 'Shown for reference; edit the values above or the source file directly.'));
    for (const cv of spec.compoundVariants) {
      const when = Object.entries(cv.match).map(([k, v]) => `${k}=${v}`).join(' & ');
      section.append(el('div', { class: 'le-compound-row' }, el('code', {}, when), el('div', { class: 'le-chips' }, ...cv.classes.map((c) => chipEl(c)))));
    }
    return section;
  }

  // ---------------------------------------------------------------- bootstrap
  function renderAll() { renderRail(); renderBanner(); renderEditorBody(); refreshChrome(); }

  $('#le-tab-theme').addEventListener('click', () => selectView('theme'));
  $('#le-save').addEventListener('click', save);
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); }
  });
  window.addEventListener('beforeunload', (e) => {
    if (!isDirty()) return;
    e.preventDefault();
    e.returnValue = '';
  });

  loadState().catch((e) => {
    const body = $('#le-editor-body');
    body.innerHTML = '';
    body.append(el('p', { class: 'le-hint le-hint--error' }, `Failed to load: ${e.message}`));
  });
})();
