// Library-mode Studio HTTP: read endpoints for an adopted/`--lib` project — the target repo's own
// theme file and component inventory, always re-read live off disk through its recorded adapter.
// Core module: never imports `./adapters/shadcn/**` directly, only the `Adapter` contract via
// `getAdapter` (same boundary adopt.ts and build-lib.ts hold).
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAdapter } from './adapters/index.ts';
import type { ComponentInfo, LibraryTheme } from './adapters/types.ts';
import { HttpError, record, requireValue } from './design-files.ts';
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

/**
 * Request handler for an adapter-mode Studio: read-only theme/component state
 * (`GET /api/lib/state`), a live preview built from either the repo's current disk state
 * (`GET /api/lib/preview`) or an editor-supplied draft theme (`POST /api/lib/preview`, read-only —
 * zero disk writes either way), and the static lib-editor app for everything else. `root` is the
 * target repo (holding the library's own code and, at its own path, the theme file); `adapterId`
 * is its recorded adapter (`.canon/project.json`'s `adapter` field).
 */
export function libHandler(root: string, adapterId: string): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const adapter = getAdapter(adapterId);
  const editorRoot = realpathSync(LIB_EDITOR_ROOT);

  return async (req, res) => {
    res.setHeader('x-content-type-options', 'nosniff');
    try {
      checkRequest(req);
      const url = decodePath(req);

      if (url === '/api/lib/state') {
        if (req.method !== 'GET') throw new HttpError(405, 'Use GET for /api/lib/state');
        const theme = adapter.readTheme(root);
        const components = adapter.inventory(root);
        json(res, 200, {
          theme,
          components: components.map(publicComponent),
          vocabulary: vocabulary(theme),
          hashes: stateHashes(theme, components),
        });
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

      serveStatic(editorRoot, url, req, res, 'index.html');
    } catch (error) { reportError(req, res, error); }
  };
}
