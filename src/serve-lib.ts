// Library-mode Studio HTTP: read endpoints for an adopted/`--lib` project — the target repo's own
// theme file and component inventory, always re-read live off disk through its recorded adapter.
// Core module: never imports `./adapters/shadcn/**` directly, only the `Adapter` contract via
// `getAdapter` (same boundary adopt.ts and build-lib.ts hold).
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAdapter } from './adapters/index.ts';
import type { Adapter, ComponentInfo, CvaSpec, LibraryTheme } from './adapters/types.ts';
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

/** sha256 of the theme css file and every component file that has a `cva()` — the set a save (Task 3) would touch and must re-verify unchanged. Read-only components are never hashed: there's nothing about them a save could conflict on. */
function stateHashes(theme: LibraryTheme, components: ComponentInfo[]): Record<string, string> {
  const hashes: Record<string, string> = { [theme.file]: sha256File(theme.file) };
  for (const component of components) if (component.cva) hashes[component.file] = sha256File(component.file);
  return hashes;
}

/** The subset of `ComponentInfo` the client ever sees — never the absolute `file` path (that only appears, keyed, inside `hashes`) or the internal `cvaSpan`. */
function publicComponent(c: ComponentInfo) {
  return { slug: c.slug, importPath: c.importPath, exportName: c.exportName, readOnlyReason: c.readOnlyReason, cva: c.cva };
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

/** Validate a `POST /api/lib/preview` body: a record whose only key is `theme`. */
function previewBody(value: unknown): LibraryTheme {
  const body = record(value, 'Preview body');
  for (const key of Object.keys(body)) requireValue(key === 'theme', `Unknown preview field: ${key}`);
  requireValue('theme' in body, 'Preview body requires a theme field');
  return draftTheme(body.theme);
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

interface SaveBody { theme?: LibraryTheme; components?: Record<string, CvaSpec>; hashes: Record<string, string> }

/** Validate a `POST /api/lib/save` body: only `theme` (optional), `components` (optional) and `hashes` (required) at the top level. */
function saveBody(value: unknown): SaveBody {
  const body = record(value, 'Save body');
  for (const key of Object.keys(body)) requireValue(key === 'theme' || key === 'components' || key === 'hashes', `Unknown save field: ${key}`);
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
  return { theme, components, hashes };
}

/** The `GET /api/lib/state` payload, built fresh off disk — also what a successful save responds with. */
function readState(root: string, adapter: Adapter) {
  const theme = adapter.readTheme(root);
  const components = adapter.inventory(root);
  return {
    theme,
    components: components.map(publicComponent),
    vocabulary: vocabulary(theme),
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
        const components = adapter.inventory(root);
        const theme = req.method === 'POST' ? previewBody(await readBody(req)) : adapter.readTheme(root);
        const html = previewHtml(theme, components.map((info) => ({ info, examples: adapter.renderSpec(info) })));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(html);
        return;
      }

      if (url === '/api/lib/save') {
        if (req.method !== 'POST') throw new HttpError(405, 'Use POST for /api/lib/save');
        await handleSave(req, res, root, designDir, adapter);
        return;
      }

      serveStatic(editorRoot, url, req, res, 'index.html');
    } catch (error) { reportError(req, res, error); }
  };
}

/**
 * `POST /api/lib/save`: the transactional library-studio save. Order, matching the brief:
 *   1. Shape-validate the body (unknown top-level field → 400) and every slug named in `components`
 *      against the CURRENT inventory (unknown or read-only → 422, naming the slug).
 *   2. Every file this save will touch (the theme file, when `theme` is present; each named
 *      component's file) must have a hash in the body's `hashes` — a missing one is a 400 (a client
 *      bug: saving over an unverified file defeats conflict safety). Every KEY in `hashes` must also
 *      be one of the files this Studio would itself hand out (the theme file or an inventoried
 *      cva() component's file) — an unknown path is a 400 before any hash is computed, so `hashes`
 *      can never be used to make the server `readFileSync`/hash an arbitrary path. Then re-hash
 *      EVERY file listed in `hashes` (not only the touched ones — the client's whole last-known
 *      snapshot) against disk — any mismatch is a 409 naming that file, before anything is written.
 *   3. Stage `adapter.writeTheme` (theme present) and `adapter.writeVariants` per named component —
 *      an adapter throw (shape-valid but hostile input the adapter's own guards reject, e.g. a
 *      CSS-injecting theme var or an unsafe variant key) is a 422, nothing written — plus the
 *      regenerated dist + stories (`buildLibWrites`, fed the in-memory next theme/components so
 *      DESIGN.md/stories describe what this save is about to commit, not stale disk).
 *   4. One `installFiles` batch — atomic, rolled back whole on any failure — then respond with the
 *      same payload shape as `GET /api/lib/state`, read fresh off disk. That re-read is best-effort:
 *      the save already committed by this point, so a throw while building the response body is
 *      reported as a 200 with `stateError` set, never a 500 (which would look like the save itself
 *      failed and invite a client retry that re-sends writes already on disk).
 */
async function handleSave(req: IncomingMessage, res: ServerResponse, root: string, designDir: string, adapter: Adapter): Promise<void> {
  const body = saveBody(await readBody(req));
  const currentTheme = adapter.readTheme(root);
  const currentComponents = adapter.inventory(root);
  const infoBySlug = new Map(currentComponents.map((c) => [c.slug, c]));

  if (body.theme) requireValue(body.theme.file === currentTheme.file, `theme.file must be this project's current theme file (${currentTheme.file})`);

  for (const slug of Object.keys(body.components ?? {})) {
    const info = infoBySlug.get(slug);
    if (!info) { json(res, 422, { slug, message: `unknown component slug: ${slug}` }); return; }
    if (!info.cva) { json(res, 422, { slug, message: info.readOnlyReason ? `read-only: ${info.readOnlyReason}` : `${slug} is read-only` }); return; }
  }

  const touched = new Set<string>();
  if (body.theme) touched.add(currentTheme.file);
  for (const slug of Object.keys(body.components ?? {})) touched.add(infoBySlug.get(slug)!.file);
  for (const file of touched) requireValue(file in body.hashes, `Missing hash for ${file}: every file this save touches must be covered by "hashes"`);

  // Every key in `hashes` must be a path this Studio would itself have handed out in `GET
  // /api/lib/state` — the theme file or an inventoried component's own file with a cva() (see
  // `stateHashes`). Without this check, `hashes` is an attacker-controlled map of arbitrary strings
  // read straight into `sha256File` -> `readFileSync`: a bogus path could hang the process reading a
  // FIFO, or leak whether some arbitrary filesystem path exists/is readable via the response's
  // status code. A 400 here, before any hash is computed, closes that off.
  const knownFiles = new Set<string>([currentTheme.file, ...currentComponents.filter((c) => c.cva).map((c) => c.file)]);
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
  for (const [slug, spec] of Object.entries(body.components ?? {})) {
    const info = infoBySlug.get(slug)!;
    let write: Write;
    try { write = adapter.writeVariants(info, spec); }
    catch (error) { json(res, 422, { slug, message: (error as Error).message }); return; }
    writes.push(write);
    nextComponents[nextComponents.findIndex((c) => c.slug === slug)] = { ...info, cva: spec, readOnlyReason: undefined };
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
}
