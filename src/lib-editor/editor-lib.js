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
import { reconcileSavedDraft, createPreviewVersion } from './draft-state.js';
import { parseClassList, composeClassList, SCALES } from './classmap.js';
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

  // ---------------------------------------------------------------- popover (shared by the Theme
  // wells and the component color control's named swatch grid — a single small floating panel,
  // anchored to whatever trigger opened it, closed by Escape, an outside click, or scrolling the
  // editor body out from under it.
  let activePopover = null; // { el, anchor } | null
  function closeActivePopover() {
    if (!activePopover) return;
    activePopover.el.remove();
    document.removeEventListener('pointerdown', onPopoverOutside, true);
    document.removeEventListener('keydown', onPopoverKeydown, true);
    document.removeEventListener('scroll', closeActivePopover, true);
    activePopover = null;
  }
  function onPopoverOutside(e) {
    if (activePopover && !activePopover.el.contains(e.target) && e.target !== activePopover.anchor && !activePopover.anchor.contains(e.target)) closeActivePopover();
  }
  function onPopoverKeydown(e) { if (e.key === 'Escape') closeActivePopover(); }
  /**
   * Open a small floating panel anchored below `anchor`, built by `buildBody(close)`. Only one
   * popover is ever open at a time — opening a new one closes whatever was open first. Positioned
   * with `position: fixed` (so `getBoundingClientRect()`'s viewport-relative coordinates need no
   * scroll offset) and clamped to stay on-screen.
   */
  function openPopover(anchor, buildBody) {
    closeActivePopover();
    const pop = el('div', { class: 'le-popover', role: 'dialog' });
    pop.append(buildBody(closeActivePopover));
    document.body.append(pop);
    const r = anchor.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - pop.offsetWidth - 8);
    pop.style.left = `${Math.min(Math.max(8, r.left), maxLeft)}px`;
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < pop.offsetHeight + 12 && r.top > pop.offsetHeight + 12) pop.style.top = `${r.top - pop.offsetHeight - 6}px`;
    else pop.style.top = `${r.bottom + 6}px`;
    activePopover = { el: pop, anchor };
    // Deferred one tick so the click that opened this popover doesn't immediately close it again.
    setTimeout(() => {
      document.addEventListener('pointerdown', onPopoverOutside, true);
      document.addEventListener('keydown', onPopoverKeydown, true);
      document.addEventListener('scroll', closeActivePopover, true);
    }, 0);
    return pop;
  }

  // ---------------------------------------------------------------- state
  let state = null; // last-known-good server state: { theme, components, vocabulary, hashes }
  let draftTheme = null; // { file, vars } — cloned from state.theme, mutated by the Theme tab
  const draftComponents = new Map(); // slug -> CvaSpec, populated lazily the first time a component is opened
  // slug -> { [partName]: classes } — EDITABLE parts only (a `classes` string AND no
  // `readOnlyReason` in state — see `specPartsOf`; a read-only part has nothing to draft, whether
  // or not it still shows a `classes` value for display), populated lazily the first time a
  // component's Parts section is rendered. Shape matches the save payload's `parts[slug]` (once
  // filtered down to just what changed — see `changedParts`/`save()`), so no transformation is
  // needed when building it.
  const draftParts = new Map();
  let activeView = 'theme'; // 'theme' | a component slug
  let conflictFile = null; // set on a 409 save response
  let saveIssue = null; // { scope: 'theme' | 'component' | 'part' | null, slug?, partName?, message } from a 422 (or other) save failure
  let saving = false;
  let previewBlobUrl = null;
  let vocabReady = false;
  let previewPage = 'dashboard';
  let previewMode = 'draft';
  let inspectedScope = 'base';
  const previewVersion = createPreviewVersion();
  let previewController = null;
  let previewScroll = 0;
  let resetPreviewScroll = false;

  const specOf = (slug) => state.components.find((c) => c.slug === slug);
  function ensureDraft(slug) {
    if (draftComponents.has(slug)) return;
    const info = specOf(slug);
    if (info?.cva) draftComponents.set(slug, clone(info.cva));
  }
  /**
   * The editable subset of `specOf(slug)?.parts` as a `{ [partName]: classes }` map — the same
   * shape `draftParts` holds — used both to seed a fresh draft and to diff the current draft
   * against last-known-good state. A part counts as editable only when it has BOTH `classes` and no
   * `readOnlyReason`: those two used to be mutually exclusive on every `PartInfo`, but inventory.ts's
   * `withWriteGrammar` can now set both at once (a real literal the editor can display but can never
   * write back, e.g. `after:content-['']`) — `classes` alone is no longer a safe editability signal.
   */
  function specPartsOf(slug) {
    const editable = {};
    for (const part of specOf(slug)?.parts ?? []) if (part.classes !== undefined && !part.readOnlyReason) editable[part.name] = part.classes;
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
  /**
   * For one part-dirty slug, only the `{ [partName]: classes }` entries whose draft value actually
   * DIFFERS from last-known-good state — the exact shape `save()`'s `parts[slug]` payload sends.
   * Defense in depth + UX fix (read/write grammar asymmetry): the whole-map resend this used to be
   * meant an untouched sibling always rode along with a dirty one, so if that sibling ever turned
   * out to be unwritable (e.g. inventory.ts's `withWriteGrammar` downgrading a quote-bearing
   * literal), the WHOLE slug's save would 422 — even parts nobody touched. Filtering to only what
   * changed means a future asymmetry like that can block just the part actually being edited, never
   * its siblings.
   */
  function changedParts(slug) {
    const draft = draftParts.get(slug) ?? {};
    const loaded = specPartsOf(slug);
    const changed = {};
    for (const [name, classes] of Object.entries(draft)) if (loaded[name] !== classes) changed[name] = classes;
    return changed;
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
    if ($('#le-reset')) $('#le-reset').disabled = saving || !isDirty();
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
    closeActivePopover();
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
  // ---- Storybook integration: when the project's Storybook dev server is running, it IS the
  // preview — real React components, not the static class-sample gallery. The static preview
  // remains the instant fallback. Detection is a cheap probe of the conventional port; story ids
  // follow `canon storybook`'s generated naming (Canon/<Export> → canon-<slug>--variants).
  let storybookUrl = null;
  let storybookIds = new Set();
  async function detectStorybook() {
    for (const url of ['http://localhost:6006']) {
      try {
        const res = await fetch(url + '/index.json', { mode: 'cors', signal: AbortSignal.timeout(1200) });
        if (!res.ok) continue;
        const index = await res.json();
        storybookUrl = url;
        storybookIds = new Set(Object.keys(index.entries ?? {}));
        return;
      } catch { /* not running — fall back to static preview */ }
    }
    storybookUrl = null;
    storybookIds = new Set();
  }
  function storyUrlFor(view) {
    const base = `${storybookUrl}/iframe.html?globals=&viewMode=story`;
    if (view === 'theme' || !view) return `${base}&id=canon-button--variants`;
    // Storybook ids derive from the story TITLE (Canon/<ExportName>), not the file slug —
    // bubble.tsx exports BubbleGroup, so its id is canon-bubblegroup--variants. A component
    // whose story doesn't exist in the live index (excluded, or Storybook stale) falls back
    // to the static preview instead of Storybook's "couldn't find story" error page.
    const exportName = specOf(view)?.exportName ?? view;
    const id = `canon-${exportName.toLowerCase()}--variants`;
    if (storybookIds.size && !storybookIds.has(id)) return null;
    return `${base}&id=${id}`;
  }
  function previewStatus(message, error = false) {
    const label = $('#le-preview-status');
    if (label) { label.textContent = message; label.dataset.error = error ? '1' : ''; }
  }
  function snapshotDraft() {
    return clone({ theme: draftTheme, components: Object.fromEntries(draftComponents), parts: Object.fromEntries(draftParts) });
  }
  function loadFullPreview() {
    if (!state) return;
    if (previewMode === 'storybook') {
      previewVersion.next(); previewController?.abort();
      const storyUrl = storybookUrl ? storyUrlFor(activeView) : null;
      if (storyUrl) {
        $('#le-preview-frame').src = storyUrl;
        previewStatus('Saved React components · Save to apply edits');
      } else {
        $('#le-preview-frame').src = 'about:blank';
        previewStatus('No saved React story for this component. Choose Live draft to preview its styles.', true);
      }
      return;
    }
    schedulePreview();
  }
  function showPreviewHtml(html) {
    const frame = $('#le-preview-frame');
    try { previewScroll = resetPreviewScroll ? 0 : frame.contentWindow.scrollY; } catch { previewScroll = 0; }
    resetPreviewScroll = false;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const old = previewBlobUrl;
    frame.src = url;
    previewBlobUrl = url;
    if (old) setTimeout(() => URL.revokeObjectURL(old), 1000);
  }
  const fetchPreview = debounce(async (version) => {
    if (!previewVersion.isCurrent(version) || previewMode !== 'draft' || !state) return;
    previewController = new AbortController();
    try {
      const res = await fetch('/api/lib/preview', { method: 'POST', headers: { 'content-type': 'application/json' },
        signal: previewController.signal, body: JSON.stringify({ ...snapshotDraft(), page: previewPage }) });
      if (!res.ok) throw new Error((await res.json()).error ?? `Preview failed (${res.status})`);
      const html = await res.text();
      if (!previewVersion.isCurrent(version) || previewMode !== 'draft') return;
      showPreviewHtml(html);
      previewStatus('Live draft · Click an element to edit shared styles');
    } catch (error) {
      if (error.name !== 'AbortError' && previewVersion.isCurrent(version)) previewStatus(`Preview unavailable: ${error.message}`, true);
    }
  }, 100);
  function schedulePreview() {
    const version = previewVersion.next();
    previewController?.abort();
    if (previewMode !== 'draft') { previewStatus('Saved React components · Save to apply edits'); return; }
    previewStatus('Updating draft…');
    fetchPreview(version);
  }
  $('#le-preview-frame').addEventListener('load', () => {
    if (previewMode !== 'draft') return;
    try {
      const frame = $('#le-preview-frame');
      const doc = frame.contentDocument;
      if (!doc) return;
      frame.contentWindow.scrollTo(0, previewScroll);
      doc.addEventListener('click', (event) => {
        const target = event.target.closest('[data-inspect], [data-part], [data-slug]');
        if (!target) return;
        const slug = target.dataset.inspect ?? target.closest('[data-slug]')?.dataset.slug;
        if (!slug || !specOf(slug)) return;
        event.preventDefault();
        let scope = target.dataset.part ? `part:${target.dataset.part}` : 'base';
        if (target.dataset.picks) {
          try {
            const picks = JSON.parse(target.dataset.picks);
            const axis = Object.keys(picks).find((key) => key === 'variant') ?? Object.keys(picks)[0];
            if (axis) scope = `variant:${axis}:${picks[axis]}`;
          } catch { /* malformed instance metadata is ignored */ }
        }
        selectView(slug, scope);
      });
    } catch { /* saved React is cross-origin; never inspect its document */ }
  });

  // ---------------------------------------------------------------- save
  async function save() {
    if (saving || !isDirty()) return;
    closeActivePopover();
    // Clear both failure categories up front: a fresh attempt must never leave a stale banner
    // (from an earlier 409) showing alongside — or instead of — this attempt's own result.
    conflictFile = null; saveIssue = null;
    saving = true; refreshChrome();
    const payload = { hashes: state.hashes };
    if (isThemeDirty()) payload.theme = draftTheme;
    const dirty = dirtySlugs();
    const cvaDirty = dirty.filter(isCvaDirty);
    if (cvaDirty.length) payload.components = Object.fromEntries(cvaDirty.map((slug) => [slug, draftComponents.get(slug)]));
    // Per-slug, per-part: only entries whose draft value actually differs from last-known-good
    // state (`changedParts`) — never the whole draft map, even for a slug that IS part-dirty. An
    // untouched sibling must never ride along just because another part on the same slug changed.
    const partsDirty = dirty.filter(isPartsDirty);
    if (partsDirty.length) {
      const changedBySlug = Object.fromEntries(partsDirty.map((slug) => [slug, changedParts(slug)]).filter(([, changed]) => Object.keys(changed).length > 0));
      if (Object.keys(changedBySlug).length) payload.parts = changedBySlug;
    }
    const submitted = snapshotDraft();
    try {
      const res = await fetch('/api/lib/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.status === 200) {
        const nextState = await res.json();
        if (nextState.stateError || !nextState.theme) {
          conflictFile = 'Saved, but state could not be refreshed';
          status('Files saved. Reload before editing again.', true);
          return;
        }
        const current = snapshotDraft();
        state = nextState;
        const next = reconcileSavedDraft(submitted, current, {
          theme: clone(state.theme),
          components: Object.fromEntries(state.components.filter((c) => c.cva).map((c) => [c.slug, c.cva])),
          parts: Object.fromEntries(state.components.map((c) => [c.slug, specPartsOf(c.slug)])),
        });
        draftTheme = next.theme;
        draftComponents.clear(); for (const [slug, spec] of Object.entries(next.components)) draftComponents.set(slug, spec);
        draftParts.clear(); for (const [slug, parts] of Object.entries(next.parts)) draftParts.set(slug, parts);
        status(isDirty() ? 'Saved · newer edits remain unsaved' : 'saved');
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
          inspectedScope = `part:${body.partName}`;
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
    const search = ($('#le-search')?.value ?? '').trim().toLowerCase();
    for (const c of state.components.filter((c) => `${c.exportName} ${c.slug}`.toLowerCase().includes(search))) {
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
  function selectView(view, scope) {
    if (activeView !== view) inspectedScope = 'base';
    if (scope) inspectedScope = scope;
    closeActivePopover();
    activeView = view;
    saveIssue = null;
    renderRail(); renderEditorBody(); refreshChrome();
    if (previewMode === 'storybook') loadFullPreview();
    else scrollPreviewTo(view);
    if (window.innerWidth <= 820 && $('#le-library-navigation')) $('#le-library-navigation').open = false;
  }

  // Clicking a component must SHOW that component: every preview section carries
  // data-slug (preview-lib.ts), so scroll the iframe to it and flash a highlight.
  function scrollPreviewTo(view) {
    if (previewMode !== 'draft' || previewPage !== 'components') return;
    if (view === 'theme') return;
    try {
      const doc = $('#le-preview-frame').contentDocument;
      const section = doc?.querySelector(`[data-slug="${CSS.escape(view)}"]`);
      if (!section) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.style.outline = '2px solid #e8b34c';
      section.style.outlineOffset = '4px';
      setTimeout(() => { section.style.outline = ''; section.style.outlineOffset = ''; }, 1600);
    } catch { /* cross-origin or not yet loaded — harmless */ }
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
    const secondaryColors = colorVars.filter(([name]) => /^(chart-|sidebar)/.test(name));
    const primaryColors = colorVars.filter(([name]) => !/^(chart-|sidebar)/.test(name));
    if (primaryColors.length) wrap.append(el('section', { class: 'le-section' }, el('h3', { class: 'le-group-title' }, 'Colors'), el('div', { class: 'le-var-list' }, ...primaryColors.map(([name, value]) => renderVarRow(name, value)))));
    if (secondaryColors.length) wrap.append(el('details', { class: 'le-advanced' }, el('summary', {}, 'Chart & sidebar colors'), el('div', { class: 'le-var-list' }, ...secondaryColors.map(([name, value]) => renderVarRow(name, value)))));
    if (otherVars.length) wrap.append(el('section', { class: 'le-section' }, el('h3', { class: 'le-group-title' }, 'Other'), el('div', { class: 'le-var-list' }, ...otherVars.map(([name, value]) => renderVarRow(name, value)))));
    if (!entries.length) wrap.append(el('p', { class: 'le-hint' }, 'This theme has no CSS variables.'));
    return wrap;
  }
  function renderVarRow(name, value) {
    const isColor = isCssColor(value.light) || (value.dark !== undefined && isCssColor(value.dark));
    const row = el('div', { class: 'le-var-row', 'data-var': name, 'data-kind': isColor ? 'color' : 'text' },
      el('code', { class: 'le-var-name', title: name }, name));
    row.append(isColor
      ? el('div', { class: 'le-var-wells' }, renderVarWell(name, 'light', value.light, undefined), renderVarWell(name, 'dark', value.dark, value.light))
      : el('div', { class: 'le-var-text-pair' }, renderVarTextInput(name, 'light', value.light, undefined), renderVarTextInput(name, 'dark', value.dark, value.light)));
    return row;
  }
  /** A 24x24 color well for one theme var's light/dark value — the value lives in its `title` tooltip, never as inline text (the design brief's whole complaint about the old 6-box-per-row layout). Click opens a small popover to edit it. */
  function renderVarWell(name, key, value, fallback) {
    const well = el('button', { type: 'button', class: 'le-well', 'data-var-key': key });
    const paint = () => {
      const effective = value || fallback || '';
      const hex = normalizeCssColor(effective);
      well.style.background = hex || '';
      well.dataset.empty = hex ? null : '1';
      well.title = value ? `${key}: ${value}` : (key === 'dark' ? `dark: same as light (${fallback || ''})` : `${key}: (empty)`);
    };
    paint();
    well.addEventListener('click', () => openVarPopover(well, name, key, value, fallback, (next) => { value = next; paint(); }));
    return well;
  }
  /** The popover body for one well: a hex/value text field + Apply, plus a native color picker when the current (or inherited) value is hex-representable. Stays open across edits (the Theme tab never re-renders on a draft change) so the native picker can commit live. */
  function openVarPopover(anchor, name, key, value, fallback, onCommitted) {
    openPopover(anchor, (close) => {
      const effective = value || fallback || '';
      const input = el('input', { type: 'text', class: 'le-in', 'data-var-key': key, spellcheck: 'false', value: value ?? '', placeholder: key === 'dark' ? 'same as light' : '' });
      const hex = cssColorToHex(effective);
      const picker = hex ? el('input', { type: 'color', class: 'le-color', value: hex, 'aria-label': `${name} ${key}` }) : null;
      const commit = (next) => {
        const entry = draftTheme.vars[name];
        if (key === 'light') entry.light = next;
        else if (!next) delete entry.dark;
        else entry.dark = next;
        value = next;
        onThemeChange();
        onCommitted(next);
      };
      input.addEventListener('input', () => { const h = cssColorToHex(input.value); if (picker && h) picker.value = h; });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(input.value); close(); } });
      if (picker) picker.addEventListener('input', () => { input.value = picker.value; commit(picker.value); }); // live — keeps the popover open so dragging the OS picker updates the swatch continuously
      const apply = el('button', { type: 'button', class: 'le-btn le-btn--primary le-btn--sm', onclick: () => { commit(input.value); close(); } }, 'Apply');
      setTimeout(() => input.focus(), 0);
      return el('div', { class: 'le-popover__body' },
        el('div', { class: 'le-popover__row' }, input, picker),
        el('div', { class: 'le-popover__actions' }, apply));
    });
  }
  /** Non-color vars (radius, font stacks…) keep a plain text input — same row grid, no well/popover. */
  function renderVarTextInput(name, key, value, fallback) {
    const wrap = el('div', { class: 'le-var-text' });
    const input = el('input', { type: 'text', class: 'le-in', 'data-var-key': key, spellcheck: 'false', value: value ?? '', placeholder: key === 'dark' ? 'same as light' : '' });
    const commit = (next) => {
      const entry = draftTheme.vars[name];
      if (key === 'light') entry.light = next;
      else if (!next) delete entry.dark;
      else entry.dark = next;
      onThemeChange();
    };
    input.addEventListener('input', () => commit(input.value));
    wrap.append(input);
    const length = parseSimpleLength(value ?? fallback ?? '');
    if (length) {
      const range = el('input', { type: 'range', class: 'le-var-range', min: 0, max: Math.max(length.num * 3, 2), step: 0.05, value: length.num, 'aria-label': `${name} ${key} (slider)` });
      range.addEventListener('input', () => { input.value = `${range.value}${length.unit}`; commit(input.value); });
      wrap.append(range);
    }
    return wrap;
  }

  // ================================================================ Components tab
  function ensureVocabDatalist() {
    if (vocabReady) return;
    document.body.append(el('datalist', { id: 'le-vocab' }, ...state.vocabulary.map((v) => el('option', { value: v }))));
    vocabReady = true;
  }
  function onComponentChange(slug) {
    refreshChrome(); schedulePreview();
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

  // ---- Structured property editor: the designer-facing layer over a class list -----------------
  // Parses the list into typed properties (classmap.js) and renders controls — color pickers fed
  // by the project's own theme, radius slider, spacing steppers, typography selects. Everything
  // unrecognized stays in a collapsed Advanced chip editor. Edits recompose the class string
  // through composeClassList (order-preserving) and hand it to `onChange(classString)` — the same
  // draft/save flow the chips used, so the server contract is untouched.
  const FAMILY_LABELS = {
    background: 'Background', textColor: 'Text color', borderColor: 'Border color', ringColor: 'Ring color',
    fontSize: 'Font size', fontWeight: 'Weight', radius: 'Radius', spacing: 'Spacing', size: 'Size',
    borderWidth: 'Border', shadow: 'Shadow', opacity: 'Opacity',
  };
  /**
   * `state.vocab.colors` (serve-lib.ts) flags a var as a color with a loose heuristic (its light
   * value matches a color-function prefix OR merely contains a digit/%/deg) — good enough for most
   * real themes, but it also catches a plain length like "0.625rem" (radius: digits, no color
   * function). Re-checking each one through the browser's own CSS color parser (`isCssColor`,
   * already used for the Theme tab) here, once, keeps "radius" and friends out of every swatch grid
   * without touching the server response.
   */
  const themeColors = () => (state.vocab?.colors ?? []).filter((c) => isCssColor(c.light));
  const themeColorNames = () => themeColors().map((c) => c.name);

  /**
   * Compact color control: ONE 18px well + the color's theme name as text (e.g. "▪ primary"),
   * nothing else inline. Click opens a popover holding a named, scrollable swatch grid of the
   * project's theme colors (~6 per row) plus a custom-value field and an opacity number — the
   * inline select+custom+opacity stack this replaces made every color row three controls wide
   * before you'd even touched anything.
   */
  function colorControl(prop, apply) {
    const colors = themeColors();
    const currentOf = (p) => (p.kind === 'theme' ? colors.find((c) => c.name === p.value) : null);

    const well = el('span', { class: 'le-well le-well--sm' });
    const nameText = el('span', { class: 'le-prop-color-name' });
    const paint = (p) => {
      const current = currentOf(p);
      well.style.background = current ? current.light : (p.kind === 'raw' ? (normalizeCssColor(p.value) || '') : '');
      well.dataset.empty = well.style.background ? null : '1';
      const label = p.kind === 'theme' ? p.value : (p.value || 'custom');
      nameText.textContent = label + (p.opacity ? `/${p.opacity}` : '');
      trigger.title = p.kind === 'theme' ? `theme: ${p.value}` : (p.value || 'custom color');
    };
    const trigger = el('button', { type: 'button', class: 'le-prop-color-trigger' }, well, nameText);
    paint(prop);
    trigger.addEventListener('click', () => openColorPropertyPopover(trigger, prop, (next) => { prop = next; paint(next); apply(next); }));
    return trigger;
  }

  /** The color control's popover: a named, scrollable swatch grid of theme colors, a custom-value field, and an opacity number — all three live inside the one popover rather than a stack of inline controls. */
  function openColorPropertyPopover(anchor, prop, apply) {
    const colors = themeColors();
    openPopover(anchor, () => {
      const grid = el('div', { class: 'le-popover-swatchgrid' }, ...colors.map((c) => {
        const btn = el('button', {
          type: 'button', class: 'le-popover-swatch',
          'data-selected': (prop.kind === 'theme' && prop.value === c.name) ? '1' : null,
          title: c.name,
          onclick: () => { apply({ ...prop, kind: 'theme', value: c.name }); closeActivePopover(); },
        });
        const sw = el('span', { class: 'le-well le-well--sm' });
        sw.style.background = c.light;
        btn.append(sw, el('span', { class: 'le-popover-swatch__name' }, c.name));
        return btn;
      }));
      const custom = el('input', {
        type: 'text', class: 'le-in le-in--sm', spellcheck: 'false',
        placeholder: '#hex / oklch(…)', value: prop.kind === 'raw' ? prop.value : '',
      });
      custom.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const v = custom.value.trim();
        if (v) apply({ ...prop, kind: 'raw', value: v });
      });
      const opacity = el('input', {
        type: 'number', class: 'le-in le-in--sm', min: '0', max: '100', step: '5',
        placeholder: '100', value: prop.opacity ?? '', title: 'Opacity %',
      });
      opacity.addEventListener('change', () => apply({ ...prop, opacity: opacity.value || undefined }));

      return el('div', { class: 'le-popover__body le-popover__body--color' },
        el('div', { class: 'le-popover__section-label' }, 'Theme colors'),
        el('div', { class: 'le-popover-swatchgrid-scroll' }, grid),
        el('div', { class: 'le-popover__row' }, el('span', { class: 'le-popover__label' }, 'Custom'), custom),
        el('div', { class: 'le-popover__row' }, el('span', { class: 'le-popover__label' }, 'Opacity'), opacity));
    });
  }

  function scaleControl(prop, scale, apply, { slider = false } = {}) {
    if (slider) {
      const idx = Math.max(0, scale.indexOf(prop.value));
      const input = el('input', { type: 'range', class: 'le-range', 'aria-label': propLabel(prop), min: '0', max: String(scale.length - 1), step: '1', value: String(idx) });
      const label = el('code', { class: 'le-range__val' }, prop.value || 'default');
      input.addEventListener('input', () => { label.textContent = scale[Number(input.value)] || 'default'; });
      input.addEventListener('input', () => apply({ ...prop, value: scale[Number(input.value)] }));
      return el('div', { class: 'le-prop-scale' }, input, label);
    }
    const select = el('select', { class: 'le-in le-in--sm', 'aria-label': propLabel(prop) },
      ...scale.map((v) => el('option', { value: v, selected: v === prop.value ? true : null }, v === '' ? 'default' : v)));
    select.addEventListener('change', () => apply({ ...prop, value: select.value }));
    return select;
  }

  function controlFor(prop, apply) {
    switch (prop.family) {
      case 'background': case 'textColor': case 'borderColor': case 'ringColor':
        return colorControl(prop, apply);
      case 'radius': return scaleControl(prop, SCALES.RADIUS_SCALE, apply, { slider: true });
      case 'opacity': {
        const input = el('input', { type: 'range', class: 'le-range', 'aria-label': propLabel(prop), min: '0', max: '100', step: '5', value: prop.value });
        input.addEventListener('input', () => apply({ ...prop, value: input.value }));
        return el('div', { class: 'le-prop-scale' }, input, el('code', { class: 'le-range__val' }, prop.value));
      }
      case 'spacing': case 'size': return scaleControl(prop, SCALES.SPACING_SCALE, apply);
      case 'fontSize': return scaleControl(prop, SCALES.FONT_SIZES, apply);
      case 'fontWeight': return scaleControl(prop, SCALES.FONT_WEIGHTS, apply);
      case 'borderWidth': return scaleControl(prop, SCALES.BORDER_WIDTHS, apply);
      case 'shadow': return scaleControl(prop, SCALES.SHADOWS, apply);
      default: return null;
    }
  }

  function propLabel(prop) {
    const base = FAMILY_LABELS[prop.family] ?? prop.family;
    if (prop.family === 'spacing' || prop.family === 'size') return `${base} · ${prop.axis}`;
    if ((prop.family === 'radius' || prop.family === 'borderWidth') && prop.side) return `${base} · ${prop.side}`;
    return base;
  }

  const ADDABLE = [
    { label: 'Background', prop: { family: 'background', kind: 'theme', value: 'primary' } },
    { label: 'Text color', prop: { family: 'textColor', kind: 'theme', value: 'foreground' } },
    { label: 'Border color', prop: { family: 'borderColor', kind: 'theme', value: 'border' } },
    { label: 'Radius', prop: { family: 'radius', side: '', value: 'md' } },
    { label: 'Padding x', prop: { family: 'spacing', axis: 'px', value: '4' } },
    { label: 'Padding y', prop: { family: 'spacing', axis: 'py', value: '2' } },
    { label: 'Gap', prop: { family: 'spacing', axis: 'gap', value: '2' } },
    { label: 'Font size', prop: { family: 'fontSize', value: 'sm' } },
    { label: 'Weight', prop: { family: 'fontWeight', value: 'medium' } },
    { label: 'Border', prop: { family: 'borderWidth', side: '', value: '' } },
    { label: 'Shadow', prop: { family: 'shadow', value: 'sm' } },
  ];

  // One shared flag is enough: the user edits one Advanced section at a time, and a re-render that
  // collapses the section mid-typing is the annoyance being prevented.
  let advancedOpen = false;
  function renderStyleEditor(classString, onChange) {
    let parsed = parseClassList(classString, themeColorNames());
    const wrap = el('div', { class: 'le-props' });

    const applyEdit = (slot, nextProp) => {
      const next = composeClassList(parsed, new Map([[slot, nextProp]]));
      onChange(next);
      parsed = parseClassList(next, themeColorNames());
      if (nextProp === null) { closeActivePopover(); renderEditorBody(); }
    };

    for (const prop of parsed.props) {
      const row = el('div', { class: 'le-prop-row', 'data-family': prop.family },
        el('span', { class: 'le-prop-label' }, propLabel(prop)),
        controlFor(prop, (next) => applyEdit(prop.slot, next)),
        el('button', {
          type: 'button', class: 'le-chip__x', 'aria-label': `Remove ${propLabel(prop)}`,
          title: 'Remove this property', onclick: () => applyEdit(prop.slot, null),
        }, '×'));
      wrap.append(row);
    }

    const present = new Set(parsed.props.map((p) => `${p.family}:${p.axis ?? p.side ?? ''}`));
    const addable = ADDABLE.filter((a) => !present.has(`${a.prop.family}:${a.prop.axis ?? a.prop.side ?? ''}`));
    if (addable.length) {
      const select = el('select', { class: 'le-in le-in--sm le-prop-add', 'aria-label': 'Add style property' },
        el('option', { value: '' }, '+ add property'),
        ...addable.map((a, i) => el('option', { value: String(i) }, a.label)));
      select.addEventListener('change', () => {
        const pick = addable[Number(select.value)];
        if (pick) onChange(composeClassList(parsed, new Map(), [pick.prop]));
        select.value = '';
        renderEditorBody();
      });
      wrap.append(select);
    }

    if (parsed.rest.length) {
      const details = el('details', { class: 'le-advanced', open: advancedOpen ? true : null },
        el('summary', { onclick: () => { advancedOpen = !details.open; } }, `Advanced (${parsed.rest.length})`),
        renderChipList(parsed.rest, {
          onRemove: (cls) => {
            const slot = parsed.slots.findIndex((s) => !s.prop && s.token === cls);
            if (slot !== -1) { onChange(composeClassList(parsed, new Map([[slot, null]]))); renderEditorBody(); }
          },
          onAdd: (cls) => { onChange(parsed.slots.length ? `${composeClassList(parsed)} ${cls}` : cls); renderEditorBody(); },
        }));
      wrap.append(details);
    }
    return wrap;
  }
  function renderComponentPanel(slug) {
    const info = specOf(slug);
    const wrap = el('div', { class: 'le-stack' });
    if (!info) { wrap.append(el('p', { class: 'le-hint le-hint--error' }, 'This component is no longer in the inventory — try Reload.')); return wrap; }
    if (saveIssue && saveIssue.scope === 'component' && saveIssue.slug === slug) wrap.append(el('div', { class: 'le-issue' }, saveIssue.message));
    wrap.append(el('details', { class: 'le-advanced le-preview-meta' }, el('summary', {}, 'Source'), el('code', {}, info.importPath), el('span', { class: 'le-muted' }, info.exportName)));

    if (info.readOnlyReason && info.parts?.length) wrap.append(el('p', { class: 'le-hint' }, `Read-only: ${info.readOnlyReason}`));
    const scopes = [];
    if (info.cva) {
      ensureDraft(slug);
      const spec = draftComponents.get(slug);
      scopes.push({ id: 'base', label: 'Base · all variants', render: () => renderStyleEditor(spec.base.join(' '), (next) => { spec.base = [next]; onComponentChange(slug); }) });
      for (const [axis, values] of Object.entries(spec.variants)) for (const [value, classes] of Object.entries(values)) {
        scopes.push({ id: `variant:${axis}:${value}`, label: `${axis} · ${value}`, render: () => el('div', { 'data-axis': axis }, el('div', { 'data-value': value }, renderStyleEditor(classes.join(' '), (next) => { values[value] = [next]; onComponentChange(slug); }))) });
      }
      if (Object.keys(spec.variants).length) scopes.push({ id: 'defaults', label: 'Default variants', render: () => renderDefaultsSection(slug, spec) });
      if (spec.compoundVariants.length) scopes.push({ id: 'compound', label: 'Compound variants', render: () => renderCompoundVariantsSection(spec) });
    }
    if (info.parts?.length) {
      ensureDraftParts(slug);
      for (const part of info.parts) scopes.push({ id: `part:${part.name}`, label: part.name + (part.readOnlyReason ? ' · read-only' : ''), render: () => renderPartRow(slug, part) });
    }
    if (!scopes.length) wrap.append(el('p', { class: 'le-hint' }, info.readOnlyReason ? `Read-only: ${info.readOnlyReason}` : 'This component has no editable styles.'));
    else {
      if (!scopes.some((scope) => scope.id === inspectedScope)) inspectedScope = scopes.find((scope) => !scope.label.includes('read-only'))?.id ?? scopes[0].id;
      const selector = el('select', { class: 'le-in le-scope-select', 'aria-label': 'Style scope' }, ...scopes.map((scope) => el('option', { value: scope.id, selected: scope.id === inspectedScope }, scope.label)));
      selector.addEventListener('change', () => { closeActivePopover(); inspectedScope = selector.value; renderEditorBody(); });
      wrap.append(el('label', { class: 'le-field' }, el('span', { class: 'le-label' }, 'Editing'), selector));
      wrap.append(el('p', { class: 'le-hint' }, inspectedScope === 'base' ? 'Changes apply to every instance. A variant may override a base property.' : 'Changes apply to every matching instance in your library.'));
      wrap.append(el('section', { class: 'le-section' }, scopes.find((scope) => scope.id === inspectedScope).render()));
      if (info.cva) wrap.append(renderVariantManager(slug, draftComponents.get(slug)));
    }

    return wrap;
  }

  // ---- Parts section: one row per exported subcomponent (shadcn/parts.ts's PartInfo) -----------
  function renderPartRow(slug, part) {
    const row = el('div', { class: 'le-part-row', 'data-part': part.name });
    row.append(el('code', { class: 'le-part-name' }, part.name));
    if (part.classes === undefined || part.readOnlyReason) {
      // Read-only: name + reason, never an input — same rule the rail/Components panel apply to a
      // read-only component as a whole. `readOnlyReason` alone decides this (not `classes ===
      // undefined`): a part can carry a real `classes` string AND be read-only at once (inventory.ts's
      // `withWriteGrammar` — a literal the write grammar can't round-trip, e.g. a quote inside
      // `after:content-['']`), in which case the current value is still shown, muted, for context.
      row.append(el('span', { class: 'le-hint' }, part.readOnlyReason ? `Read-only: ${part.readOnlyReason}` : 'Read-only'));
      if (part.classes !== undefined) row.append(el('code', { class: 'le-part-tail' }, part.classes));
      return row;
    }
    const draft = draftParts.get(slug);
    if (saveIssue && saveIssue.scope === 'part' && saveIssue.slug === slug && saveIssue.partName === part.name) {
      row.append(el('div', { class: 'le-issue' }, saveIssue.message));
    }
    // The draft model is a single space-separated string (the same shape the save payload and
    // PartInfo.classes both use) — rendered through the structured style editor.
    const line = el('div', { class: 'le-part-chips' },
      renderStyleEditor(draft[part.name], (next) => { draft[part.name] = next; onComponentChange(slug); }));
    if (part.dynamicTail) line.append(el('code', { class: 'le-part-tail', title: part.dynamicTail }, `+ ${part.dynamicTail}`));
    row.append(line);
    if (part.previewChild) row.append(el('p', { class: 'le-hint' }, `Editing the ${part.previewChild.wrapperTag} wrapper. Nested ${part.previewChild.tag} styles come from the source.`));
    if (part.note) row.append(el('p', { class: 'le-hint le-part-note' }, part.note));
    return row;
  }
  function renderVariantManager(slug, spec) {
    const wrap = el('details', { class: 'le-advanced' }, el('summary', {}, 'Manage variants'));
    for (const [axis, values] of Object.entries(spec.variants)) wrap.append(el('button', {
      type: 'button', class: 'le-add', onclick: () => {
        const name = window.prompt(`New value name for "${axis}":`)?.trim();
        if (!name || Object.hasOwn(values, name)) return;
        Object.defineProperty(values, name, { value: [...(Object.values(values).at(-1) ?? [])], enumerable: true, configurable: true, writable: true });
        inspectedScope = `variant:${axis}:${name}`;
        onComponentChange(slug); renderEditorBody();
      },
    }, `+ Add ${axis} value`));
    return wrap;
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

  const mobileRail = window.matchMedia('(max-width: 820px)');
  const syncRail = () => { if ($('#le-library-navigation')) $('#le-library-navigation').open = !mobileRail.matches; };
  mobileRail.addEventListener('change', syncRail); syncRail();
  $('#le-search')?.addEventListener('input', renderRail);
  $('#le-example')?.addEventListener('change', (event) => { previewPage = event.target.value; resetPreviewScroll = true; loadFullPreview(); });
  $('#le-preview-mode')?.addEventListener('change', (event) => { previewMode = event.target.value; loadFullPreview(); });
  $('#le-device')?.addEventListener('change', (event) => { $('#le-preview-frame').dataset.device = event.target.value; });
  $('#le-reset')?.addEventListener('click', () => {
    if (saving || !state) return;
    closeActivePopover(); draftTheme = clone(state.theme); draftComponents.clear(); draftParts.clear();
    saveIssue = null; renderAll(); loadFullPreview(); status('Draft reset');
  });
  detectStorybook().then(() => {
    const option = $('#le-preview-mode option[value="storybook"]');
    if (option) option.disabled = !storybookUrl;
  });
  loadState().catch((e) => {
    const body = $('#le-editor-body');
    body.innerHTML = '';
    body.append(el('p', { class: 'le-hint le-hint--error' }, `Failed to load: ${e.message}`));
  });
})();
