// Library-mode Studio HTTP: read endpoints for an adopted/`--lib` project — the target repo's own
// theme file and component inventory, always re-read live off disk through its recorded adapter.
// Core module: never imports `./adapters/shadcn/**` directly, only the `Adapter` contract via
// `getAdapter` (same boundary adopt.ts and build-lib.ts hold).
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAdapter } from './adapters/index.ts';
import type { Adapter, ComponentInfo, CvaSpec, LibraryTheme, PartInfo } from './adapters/types.ts';
import { HttpError, installFiles, record, requireValue, type Write } from './design-files.ts';
import { buildLibWrites } from './build-lib.ts';
import { previewHtml } from './generators/preview-lib.ts';
import { semanticClasses } from './generators/agents-lib.ts';
import { checkRequest, decodePath, json, readBody, reportError, serveStatic } from './serve-shared.ts';

/** The bundled library-studio editor app (Task 5 fills this in; Task 2 only wires the route). */
const LIB_EDITOR_ROOT = fileURLToPath(new URL('./lib-editor/', import.meta.url));

// Pragmatic Tailwind utility scale for the editor's class-value autocomplete (Task 5), alongside
// the theme-derived semantic classes `semanticClasses()` returns. Not exhaustive — the scales a
// shadcn-style component actually varies across its cva(): spacing (padding/margin/gap), text
// size, radius, and fractional width/height. Kept as a simple flat constant, not generated, so
// it's obvious at a glance what an agent or the editor can offer.
const SPACING_SCALE = ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '52', '56', '60', '64', '72', '80', '96'];
const SIZE_FRACTIONS = ['1/2', '1/3', '2/3', '1/4', '2/4', '3/4', '1/5', '2/5', '3/5', '4/5', 'full', 'screen'];

export const SCALE_VOCABULARY: string[] = [
  ...SPACING_SCALE.flatMap((n) => ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'gap', 'gap-x', 'gap-y'].map((prefix) => `${prefix}-${n}`)),
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl',
  'rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
  ...SIZE_FRACTIONS.flatMap((f) => [`w-${f}`, `h-${f}`]),
];

/** The full autocomplete vocabulary for a given theme: its own semantic classes first, then the pragmatic scale utilities above. */
function vocabulary(theme: LibraryTheme): string[] {
  return [...semanticClasses(theme), ...SCALE_VOCABULARY];
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * True when a save could actually change `c.file`'s bytes: it has a `cva()`, OR at least one part
 * with an editable literal (`PartInfo.span` set — see shadcn/parts.ts). A component that is
 * entirely read-only at both levels (no `cva`, every part either absent or `readOnlyReason`-only)
 * has nothing a save could conflict on, so its file is never hashed or added to the save's "known
 * files" allowlist (see `handleSave`).
 */
function hashableComponent(c: ComponentInfo): boolean {
  return Boolean(c.cva) || Boolean(c.parts?.some((part) => part.span !== undefined));
}

/** sha256 of the theme css file and every component file a save could touch — one with a `cva()`, an editable part, or both (see `hashableComponent`). A component with neither is never hashed: there's nothing about it a save could conflict on. */
function stateHashes(theme: LibraryTheme, components: ComponentInfo[]): Record<string, string> {
  const hashes: Record<string, string> = { [theme.file]: sha256File(theme.file) };
  for (const component of components) if (hashableComponent(component)) hashes[component.file] = sha256File(component.file);
  return hashes;
}

/** The subset of `PartInfo` the client ever sees — never the internal byte-offset `span` (same rule as `ComponentInfo.file`/`cvaSpan` below). */
function publicPart(p: PartInfo) {
  return { name: p.name, classes: p.classes, dynamicTail: p.dynamicTail, readOnlyReason: p.readOnlyReason, note: p.note, previewChild: p.previewChild };
}

/** The subset of `ComponentInfo` the client ever sees — never the absolute `file` path (that only appears, keyed, inside `hashes`), the internal `cvaSpan`, or any part's internal `span` (see `publicPart`). */
function publicComponent(c: ComponentInfo) {
  return { slug: c.slug, importPath: c.importPath, exportName: c.exportName, readOnlyReason: c.readOnlyReason, cva: c.cva, parts: c.parts?.map(publicPart) };
}

/**
 * Validate a `POST /api/lib/preview` draft theme defensively: a plausible `LibraryTheme` shape
 * (an object with a nonempty `file` string and a `vars` map of `{ light: string, dark?: string }`).
 * `previewHtml` itself HTML-escapes every value it interpolates, so this only needs to keep the
 * server from crashing on a malformed body — it is not the CSS-injection guard (that belongs to
 * the write path, Task 4, which actually persists a theme to disk).
 */
function draftTheme(value: unknown): LibraryTheme {
  const theme = record(value, 'theme');
  requireValue(typeof theme.file === 'string' && theme.file.length > 0, 'theme.file must be a nonempty string');
  const rawVars = record(theme.vars, 'theme.vars');
  const vars: LibraryTheme['vars'] = {};
  for (const [name, rawValue] of Object.entries(rawVars)) {
    const entry = record(rawValue, `theme.vars.${name}`);
    requireValue(typeof entry.light === 'string', `theme.vars.${name}.light must be a string`);
    requireValue(entry.dark === undefined || typeof entry.dark === 'string', `theme.vars.${name}.dark must be a string`);
    vars[name] = entry.dark === undefined ? { light: entry.light as string } : { light: entry.light as string, dark: entry.dark as string };
  }
  return { file: theme.file as string, vars };
}

/** Preview drafts use the same validated shapes as Save, but never install files. */
function previewBody(value: unknown) {
  const body = record(value, 'Preview body');
  for (const key of Object.keys(body)) requireValue(['theme', 'components', 'parts', 'page'].includes(key), `Unknown preview field: ${key}`);
  requireValue('theme' in body, 'Preview body requires a theme field');
  const page = body.page ?? 'components';
  requireValue(['dashboard', 'settings', 'components'].includes(page as string), 'Unknown preview page');
  const components: Record<string, CvaSpec> = Object.create(null);
  if (body.components !== undefined) for (const [slug, spec] of Object.entries(record(body.components, 'components'))) components[slug] = draftCvaSpec(spec, `components.${slug}`);
  return { theme: draftTheme(body.theme), components, parts: body.parts === undefined ? {} : draftParts(body.parts), page: page as 'dashboard' | 'settings' | 'components' };
}

function previewInventory(inventory: ComponentInfo[], draft: ReturnType<typeof previewBody>): ComponentInfo[] {
  const bySlug = new Map(inventory.map((info) => [info.slug, info]));
  for (const slug of new Set([...Object.keys(draft.components), ...Object.keys(draft.parts)])) {
    const info = bySlug.get(slug);
    if (!info) throw new HttpError(422, `Unknown component: ${slug}`);
    if (draft.components[slug] && !info.cva) throw new HttpError(422, `Read-only component: ${slug}`);
    for (const name of Object.keys(draft.parts[slug] ?? {})) {
      const part = info.parts?.find((p) => p.name === name);
      if (!part?.span || part.readOnlyReason) throw new HttpError(422, `Unknown or read-only part: ${slug}.${name}`);
    }
  }
  return inventory.map((info) => ({ ...info,
    cva: draft.components[info.slug] ?? info.cva,
    parts: info.parts?.map((part) => ({ ...part, classes: draft.parts[info.slug]?.[part.name] ?? part.classes })),
  }));
}

function classList(value: unknown, name: string): string[] {
  requireValue(Array.isArray(value) && value.every((item) => typeof item === 'string'), `${name} must be an array of strings`);
  return value as string[];
}

function matchValue(value: unknown, name: string): string | boolean {
  requireValue(typeof value === 'string' || typeof value === 'boolean', `${name} must be a string or boolean`);
  return value as string | boolean;
}

/**
 * Validate a `POST /api/lib/save` component entry into a `CvaSpec`: shape only (arrays of strings,
 * string/boolean match values) — deliberately NOT the safety guard `inventory()`'s
 * `unsafeVariantKey` applies when *reading* a cva() back (an axis/value unsafe to interpolate
 * unescaped into a rendered/story JSX attribute). `writeVariants` is the contract point for
 * rejecting a spec it can't faithfully or safely write (Task 4 hardens that); until then, a
 * shape-valid-but-hostile spec is accepted here and left to the adapter.
 */
function draftCvaSpec(value: unknown, name: string): CvaSpec {
  const spec = record(value, name);
  const base = classList(spec.base, `${name}.base`);
  const rawVariants = record(spec.variants, `${name}.variants`);
  const variants: CvaSpec['variants'] = {};
  for (const [axis, options] of Object.entries(rawVariants)) {
    const rawOptions = record(options, `${name}.variants.${axis}`);
    const inner: Record<string, string[]> = {};
    for (const [key, classes] of Object.entries(rawOptions)) inner[key] = classList(classes, `${name}.variants.${axis}.${key}`);
    variants[axis] = inner;
  }
  requireValue(Array.isArray(spec.compoundVariants), `${name}.compoundVariants must be an array`);
  const compoundVariants = (spec.compoundVariants as unknown[]).map((entry, index) => {
    const e = record(entry, `${name}.compoundVariants[${index}]`);
    const rawMatch = record(e.match, `${name}.compoundVariants[${index}].match`);
    const match: Record<string, string | boolean> = {};
    for (const [key, v] of Object.entries(rawMatch)) match[key] = matchValue(v, `${name}.compoundVariants[${index}].match.${key}`);
    return { match, classes: classList(e.classes, `${name}.compoundVariants[${index}].classes`) };
  });
  const rawDefaults = record(spec.defaultVariants, `${name}.defaultVariants`);
  const defaultVariants: Record<string, string | boolean> = {};
  for (const [key, v] of Object.entries(rawDefaults)) defaultVariants[key] = matchValue(v, `${name}.defaultVariants.${key}`);
  return { base, variants, compoundVariants, defaultVariants };
}

interface SaveBody { theme?: LibraryTheme; components?: Record<string, CvaSpec>; parts?: Record<string, Record<string, string>>; hashes: Record<string, string> }

/**
 * Validate a `POST /api/lib/save` body's `parts` field: `Record<slug, Record<partName, classes>>`,
 * shape only (`classes` a plain string) — the same "shape, not safety" split `draftCvaSpec` documents:
 * the adapter's own grammar guard (`writePart`'s `validateClassList`) is the contract point for
 * rejecting a hostile `classes` string, not this parser.
 */
function draftParts(value: unknown): Record<string, Record<string, string>> {
  const raw = record(value, 'parts');
  // Object.create(null) at BOTH levels — see the identical `__proto__`-key comment on `components`
  // below; a slug or part name of `__proto__` must become a real own property, never silently hit
  // Object.prototype's own `__proto__` setter and vanish from the save.
  const parts = Object.create(null) as Record<string, Record<string, string>>;
  for (const [slug, rawPartMap] of Object.entries(raw)) {
    const partMap = record(rawPartMap, `parts.${slug}`);
    const inner: Record<string, string> = Object.create(null);
    for (const [partName, classes] of Object.entries(partMap)) {
      requireValue(typeof classes === 'string', `parts.${slug}.${partName} must be a string`);
      inner[partName] = classes;
    }
    parts[slug] = inner;
  }
  return parts;
}

/** Validate a `POST /api/lib/save` body: only `theme` (optional), `components` (optional), `parts` (optional) and `hashes` (required) at the top level. */
function saveBody(value: unknown): SaveBody {
  const body = record(value, 'Save body');
  for (const key of Object.keys(body)) requireValue(key === 'theme' || key === 'components' || key === 'parts' || key === 'hashes', `Unknown save field: ${key}`);
  requireValue('hashes' in body, 'Save body requires a hashes field');
  const rawHashes = record(body.hashes, 'hashes');
  const hashes: Record<string, string> = {};
  for (const [file, hash] of Object.entries(rawHashes)) {
    requireValue(typeof hash === 'string' && hash.length > 0, `hashes.${file} must be a nonempty string`);
    hashes[file] = hash;
  }
  const theme = 'theme' in body ? draftTheme(body.theme) : undefined;
  let components: Record<string, CvaSpec> | undefined;
  if ('components' in body) {
    const rawComponents = record(body.components, 'components');
    // `Object.create(null)` rather than `{}`: a slug of `__proto__` assigned via `components[slug] =
    // …` on a plain object literal hits Object.prototype's `__proto__` SETTER instead of creating an
    // own property, silently dropping that component from the save instead of erroring or applying
    // it — a null-prototype object has no such setter, so the assignment always lands as a real key.
    components = Object.create(null) as Record<string, CvaSpec>;
    for (const [slug, spec] of Object.entries(rawComponents)) components[slug] = draftCvaSpec(spec, `components.${slug}`);
  }
  const parts = 'parts' in body ? draftParts(body.parts) : undefined;
  return { theme, components, parts, hashes };
}

/** The `GET /api/lib/state` payload, built fresh off disk — also what a successful save responds with. */
function readState(root: string, adapter: Adapter) {
  const theme = adapter.readTheme(root);
  const components = adapter.inventory(root);
  return {
    theme,
    components: components.map(publicComponent),
    vocabulary: vocabulary(theme),
    // Structured vocab for the property controls: the project's real theme colors with both
    // modes' values (picker swatches), keyed by the names Tailwind classes use (bg-<name>).
    vocab: {
      colors: Object.entries(theme.vars)
        .filter(([, v]) => /^(#|rgb|hsl|oklch|color\()/i.test(v.light) || /%|deg|\d/.test(v.light))
        .map(([name, v]) => ({ name, light: v.light, dark: v.dark })),
    },
    hashes: stateHashes(theme, components),
  };
}

/**
 * Request handler for an adapter-mode Studio: read-only theme/component state
 * (`GET /api/lib/state`), a live preview built from either the repo's current disk state
 * (`GET /api/lib/preview`) or an editor-supplied draft theme (`POST /api/lib/preview`, read-only —
 * zero disk writes either way), and the static lib-editor app for everything else. `root` is the
 * target repo (holding the library's own code and, at its own path, the theme file); `adapterId`
 * is its recorded adapter (`.canon/project.json`'s `adapter` field); `designDir` is where the
 * design source (`system.json`, …) lives, needed only by `POST /api/lib/save` to regenerate dist.
 */
export function libHandler(root: string, adapterId: string, designDir: string): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const adapter = getAdapter(adapterId);
  const editorRoot = realpathSync(LIB_EDITOR_ROOT);
  // Mirrors native Studio's own `saving` flag (serve.ts's `/api/save`): a single in-flight save at
  // a time. Without it, two concurrent `POST /api/lib/save` could both pass the hash check below,
  // then interleave across the `await buildLibWrites(...)` yield — last write wins, silently.
  const saveLock = { saving: false };

  return async (req, res) => {
    res.setHeader('x-content-type-options', 'nosniff');
    try {
      checkRequest(req);
      const url = decodePath(req);

      if (url === '/api/lib/state') {
        if (req.method !== 'GET') throw new HttpError(405, 'Use GET for /api/lib/state');
        json(res, 200, readState(root, adapter));
        return;
      }

      if (url === '/api/lib/preview') {
        if (req.method !== 'GET' && req.method !== 'POST') throw new HttpError(405, 'Use GET or POST for /api/lib/preview');
        const draft = req.method === 'POST' ? previewBody(await readBody(req)) : undefined;
        const inventory = adapter.inventory(root);
        const components = draft ? previewInventory(inventory, draft) : inventory;
        const diskTheme = adapter.readTheme(root);
        const theme = draft ? { ...draft.theme, utilityTheme: diskTheme.utilityTheme, baseCss: diskTheme.baseCss } : diskTheme;
        const html = previewHtml(theme, components.map((info) => ({ info, examples: adapter.renderSpec(info) })), draft?.page);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(html);
        return;
      }

      if (url === '/api/lib/save') {
        if (req.method !== 'POST') throw new HttpError(405, 'Use POST for /api/lib/save');
        await handleSave(req, res, root, designDir, adapter, saveLock);
        return;
      }

      serveStatic(editorRoot, url, req, res, 'index.html');
    } catch (error) { reportError(req, res, error); }
  };
}

/**
 * `POST /api/lib/save`: the transactional library-studio save. Order, matching the brief:
 *   0. Refuse a second save while one is already in flight: a 409 naming the conflict, checked and
 *      set right after the body is parsed (before anything reads current disk state) and cleared in
 *      a `finally` so a throw anywhere below never leaves the lock stuck — the exact `saving`-flag
 *      shape native Studio's own `/api/save` (serve.ts) uses, guarding the same
 *      read-current-state-then-write shape of race.
 *   1. Shape-validate the body (unknown top-level field → 400) and every slug named in `components`
 *      or `parts` against the CURRENT inventory (unknown slug → 422, naming it). A `components` slug
 *      with no `cva` is 422 as read-only; a `parts` slug's every named part must exist and be
 *      editable (`PartInfo.span` set) — an unknown or read-only part is 422, naming both the slug
 *      and the part.
 *   2. Every file this save will touch (the theme file, when `theme` is present; each file named in
 *      `components` or `parts` — the same file, when the same slug appears in both, since a part
 *      belongs to the component whose file it lives in) must have a hash in the body's `hashes` — a
 *      missing one is a 400 (a client bug: saving over an unverified file defeats conflict safety).
 *      Every KEY in `hashes` must also be one of the files this Studio would itself hand out (the
 *      theme file or a component file with a `cva()`, an editable part, or both — `hashableComponent`)
 *      — an unknown path is a 400 before any hash is computed, so `hashes` can never be used to make
 *      the server `readFileSync`/hash an arbitrary path. Then re-hash EVERY file listed in `hashes`
 *      (not only the touched ones — the client's whole last-known snapshot) against disk — any
 *      mismatch is a 409 naming that file, before anything is written.
 *   3. Stage `adapter.writeTheme` (theme present) and, per touched slug, `adapter.writeVariants` (its
 *      `components` entry, if any) THEN `adapter.writePart` for each of its `parts` entries in turn
 *      (controller ruling: same-file cva+parts composition, and multiple parts in one file, are
 *      repeated adapter calls on the PRIOR call's staged content — never span math here — since each
 *      call re-parses and re-locates its own span fresh; only the LAST call's `Write` for a slug is
 *      kept, so one file is written once even when several of its parts changed). An adapter throw
 *      (shape-valid but hostile input the adapter's own guards reject, e.g. a CSS-injecting theme
 *      var, an unsafe variant key, or a part's unsafe class string) is a 422, nothing written — plus
 *      the regenerated dist + stories (`buildLibWrites`, fed the in-memory next theme/components so
 *      DESIGN.md/stories describe what this save is about to commit, not stale disk).
 *   4. One `installFiles` batch — atomic, rolled back whole on any failure — then respond with the
 *      same payload shape as `GET /api/lib/state`, read fresh off disk. That re-read is best-effort:
 *      the save already committed by this point, so a throw while building the response body is
 *      reported as a 200 with `stateError` set, never a 500 (which would look like the save itself
 *      failed and invite a client retry that re-sends writes already on disk).
 */
async function handleSave(req: IncomingMessage, res: ServerResponse, root: string, designDir: string, adapter: Adapter, lock: { saving: boolean }): Promise<void> {
  const body = saveBody(await readBody(req));

  // Everything from here on reads "current" disk/inventory state and later commits writes built
  // from it — exactly the read-then-write shape a second concurrent save could race. Refuse it
  // outright rather than let it interleave (see the docstring above and native Studio's own
  // `saving` flag in serve.ts's `/api/save`); always cleared, even if a check below throws or a 422
  // return happens mid-validation.
  if (lock.saving) throw new HttpError(409, 'A save is already in progress; retry when it finishes');
  lock.saving = true;
  try {
    const currentTheme = adapter.readTheme(root);
    const currentComponents = adapter.inventory(root);
    const infoBySlug = new Map(currentComponents.map((c) => [c.slug, c]));

    if (body.theme) requireValue(body.theme.file === currentTheme.file, `theme.file must be this project's current theme file (${currentTheme.file})`);

    for (const slug of Object.keys(body.components ?? {})) {
      const info = infoBySlug.get(slug);
      if (!info) { json(res, 422, { slug, message: `unknown component slug: ${slug}` }); return; }
      if (!info.cva) { json(res, 422, { slug, message: info.readOnlyReason ? `read-only: ${info.readOnlyReason}` : `${slug} is read-only` }); return; }
    }

    for (const [slug, partMap] of Object.entries(body.parts ?? {})) {
      const info = infoBySlug.get(slug);
      if (!info) { json(res, 422, { slug, message: `unknown component slug: ${slug}` }); return; }
      for (const partName of Object.keys(partMap)) {
        const part = info.parts?.find((p) => p.name === partName);
        if (!part) { json(res, 422, { slug, partName, message: `unknown part: ${partName}` }); return; }
        if (part.span === undefined) { json(res, 422, { slug, partName, message: part.readOnlyReason ? `read-only: ${part.readOnlyReason}` : `${partName} is read-only` }); return; }
      }
    }

    const touched = new Set<string>();
    if (body.theme) touched.add(currentTheme.file);
    for (const slug of Object.keys(body.components ?? {})) touched.add(infoBySlug.get(slug)!.file);
    for (const slug of Object.keys(body.parts ?? {})) touched.add(infoBySlug.get(slug)!.file);
    for (const file of touched) requireValue(file in body.hashes, `Missing hash for ${file}: every file this save touches must be covered by "hashes"`);

    // Every key in `hashes` must be a path this Studio would itself have handed out in `GET
    // /api/lib/state` — the theme file or a component file `hashableComponent` would hash (a `cva()`,
    // an editable part, or both — see `stateHashes`). Without this check, `hashes` is an
    // attacker-controlled map of arbitrary strings read straight into `sha256File` -> `readFileSync`:
    // a bogus path could hang the process reading a FIFO, or leak whether some arbitrary filesystem
    // path exists/is readable via the response's status code. A 400 here, before any hash is
    // computed, closes that off.
    const knownFiles = new Set<string>([currentTheme.file, ...currentComponents.filter(hashableComponent).map((c) => c.file)]);
    for (const file of Object.keys(body.hashes)) requireValue(knownFiles.has(file), `Unknown path in hashes: ${file}`);

    for (const [file, expected] of Object.entries(body.hashes)) {
      let actual: string;
      try { actual = sha256File(file); }
      catch { json(res, 409, { file }); return; } // vanished/unreadable since the client last read state: a conflict, not a crash
      if (actual !== expected) { json(res, 409, { file }); return; }
    }

    // Nothing above touches disk. From here, every Write is staged in memory; the single
    // `installFiles` call below is the only place any of it is actually applied.
    const writes: Write[] = [];
    if (body.theme) {
      try { writes.push(...adapter.writeTheme(root, body.theme)); }
      catch (error) { json(res, 422, { field: 'theme', message: (error as Error).message }); return; } // e.g. a var name/value the CSS-injection guard rejects
    }

    const nextComponents = currentComponents.slice();
    // One touched slug can carry BOTH a `components` (cva) entry and a `parts` entry for the same
    // file. Per the controller ruling, compose them as repeated adapter calls on the PRIOR call's
    // staged content — cva first, then each part in turn — rather than any span math here: each
    // `writeVariants`/`writePart` call re-parses and re-locates its own span fresh inside whatever
    // source it's given, so this is safe even though a part's span (or the cva span) may have moved
    // after an earlier splice in this same loop iteration. Only the LAST call's `Write` for a slug is
    // kept — every intermediate one is a full-file buffer already folded into the next call's input,
    // so the file is written to disk exactly once even when several of its parts changed.
    const touchedSlugs = new Set<string>([...Object.keys(body.components ?? {}), ...Object.keys(body.parts ?? {})]);
    for (const slug of touchedSlugs) {
      const info = infoBySlug.get(slug)!;
      const componentIndex = nextComponents.findIndex((c) => c.slug === slug);
      let staged: string | undefined;
      let write: Write | undefined;

      if (body.components && slug in body.components) {
        const spec = body.components[slug];
        try { write = adapter.writeVariants(info, spec); }
        catch (error) { json(res, 422, { slug, message: (error as Error).message }); return; }
        staged = write.content.toString('utf8');
        nextComponents[componentIndex] = { ...nextComponents[componentIndex], cva: spec, readOnlyReason: undefined };
      }

      if (body.parts && slug in body.parts) {
        const partEdits = body.parts[slug];
        // Sorted by name: a deterministic splice order, independent of the request body's own JSON
        // key order — harmless to correctness either way (every call re-parses and re-locates its
        // own span fresh against the PRIOR call's staged content, so two different parts' disjoint
        // literals splice to the same final bytes regardless of order), but sorted keeps the byte-level
        // result reproducible across equivalent requests, matching `writeVariants`'s own determinism.
        for (const partName of Object.keys(partEdits).sort()) {
          const classes = partEdits[partName];
          try { write = adapter.writePart(info, partName, classes, staged); }
          catch (error) { json(res, 422, { slug, partName, message: (error as Error).message }); return; }
          staged = write.content.toString('utf8');
        }
        // Fold the just-applied classes into `nextComponents` too — not just the file `Write` — so
        // `buildLibWrites` below (fed `nextComponents`, not a fresh `adapter.inventory` re-read)
        // documents the about-to-commit part classes in DESIGN.md/stories/preview, the same way the
        // `components` branch above already does for `cva`. Only `classes` changes; a part's `span`
        // is left as-is (stale post-splice byte offsets) since nothing downstream of `nextComponents`
        // reads it — `publicComponent`/`publicPart` (the actual save response) always re-reads fresh
        // state off disk instead, where spans are correctly re-parsed.
        nextComponents[componentIndex] = {
          ...nextComponents[componentIndex],
          parts: nextComponents[componentIndex].parts?.map((part) => (part.name in partEdits ? { ...part, classes: partEdits[part.name] } : part)),
        };
      }

      // `write` is undefined only when this slug's own `parts` entry was an empty object (`{}`) and
      // it has no `components` entry either — a degenerate but not-hostile payload shape (nothing to
      // splice, so nothing to write) that must not crash `installFiles` below on an undefined Write.
      if (write) writes.push(write);
    }

    writes.push(...await buildLibWrites(root, designDir, { theme: body.theme ?? currentTheme, components: nextComponents }));

    installFiles(root, writes);
    // The save already committed at this point — installFiles either applied every write or rolled
    // all of them back, atomically. Re-reading fresh state off disk is a courtesy for the response
    // body, not part of the transaction: if it throws (e.g. a raced external change to the theme file
    // or a component between the commit above and this read), that must never be reported as the save
    // itself failing (a 500 the client would reasonably retry, re-sending writes that already landed).
    try {
      json(res, 200, readState(root, adapter));
    } catch (error) {
      json(res, 200, { saved: true, stateError: (error as Error).message });
    }
  } finally {
    lock.saving = false;
  }
}
