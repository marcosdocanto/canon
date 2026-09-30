import { createServer } from 'node:http';
import { readFileSync, realpathSync, mkdtempSync, rmSync } from 'node:fs';
import { basename, join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { validateSystem } from './system.ts';
import { HttpError, requireValue, record, identifier, validateMeta, contained, sourcePath, loadSource, installFiles, type Write } from './design-files.ts';
import { buildSystem } from './build.ts';
import { compareSpecs } from './components/index.ts';
import { comparePatterns } from './patterns/index.ts';
import { getCanonPackage } from './distribution.ts';
import { referenceWrites } from './install.ts';
import { findProject, type Project } from './project.ts';
import type { System, SystemMeta, Tokens, ComponentSpec, Pattern } from './types.ts';
import { checkRequest, decodePath, json, listen, readBody, reportError, serveStatic } from './serve-shared.ts';
import { libHandler } from './serve-lib.ts';

interface SaveBody { meta?: SystemMeta; tokens?: Tokens; components?: Record<string, ComponentSpec>; patterns?: Record<string, Pattern> }

function validateBody(value: unknown): SaveBody {
  const body = record(value, 'Save body');
  for (const key of Object.keys(body)) requireValue(['meta', 'tokens', 'components', 'patterns'].includes(key), `Unknown save field: ${key}`);
  for (const field of ['meta', 'tokens']) if (field in body) record(body[field], field);
  for (const collection of ['components', 'patterns']) {
    if (!(collection in body)) continue;
    for (const [slug, value] of Object.entries(record(body[collection], collection))) {
      identifier(slug, `${collection} key`);
      const spec = record(value, `${collection}.${slug}`);
      requireValue(spec.slug === slug, `${collection}.${slug}.slug must match its key`);
    }
  }
  return body as SaveBody;
}

async function saveSource(body: SaveBody, designRoot: string, outputRoot: string, projectRoot?: string) {
  const trial = loadSource(designRoot);
  if (body.meta !== undefined) trial.meta = body.meta;
  if (body.tokens !== undefined) trial.tokens = body.tokens;
  for (const [slug, spec] of Object.entries(body.components ?? {})) {
    const index = trial.components.findIndex((component) => component.slug === slug);
    if (index === -1) trial.components.push(spec); else trial.components[index] = spec;
  }
  for (const [slug, pattern] of Object.entries(body.patterns ?? {})) {
    const index = trial.patterns.findIndex((item) => item.slug === slug);
    if (index === -1) trial.patterns.push(pattern); else trial.patterns[index] = pattern;
  }
  validateMeta(trial.meta, designRoot, outputRoot);
  for (const item of [...trial.components, ...trial.patterns]) identifier(item.slug, 'Design slug');
  trial.components.sort(compareSpecs);
  trial.patterns.sort(comparePatterns);
  sourcePath(designRoot, outputRoot, 'directory');
  try {
    const validation = validateSystem(trial);
    if (validation.errors.length) throw new Error(validation.errors.slice(0, 5).join('; '));
  } catch (error) { throw new HttpError(422, (error as Error).message); }
  const stage = mkdtempSync(join(tmpdir(), 'canon-studio-save-'));
  try {
    // Generation can fail after producing files; build away from the live source/output.
    let result;
    try { result = await buildSystem(trial, stage); }
    catch (error) { throw new HttpError(422, (error as Error).message); }
    const writes: Write[] = result.files.map((file) => {
      contained(result.outDir, file);
      contained(realpathSync(result.outDir), realpathSync(file));
      return { path: join(outputRoot, relative(result.outDir, file)), content: readFileSync(file) };
    });
    const sourceWrite = (rel: string, value: unknown) => writes.push({ path: join(designRoot, rel), content: Buffer.from(JSON.stringify(value, null, 2) + '\n') });
    if (body.meta !== undefined) sourceWrite('system.json', body.meta);
    if (body.tokens !== undefined) sourceWrite('tokens.json', body.tokens);
    for (const [slug, spec] of Object.entries(body.components ?? {})) sourceWrite(`components/${slug}.json`, spec);
    for (const [slug, pattern] of Object.entries(body.patterns ?? {})) sourceWrite(`patterns/${slug}.json`, pattern);
    if (projectRoot) writes.push(...referenceWrites(trial, designRoot, projectRoot, result.outDir));
    // Publish the revision after source and references so MCP can load a complete save.
    const manifest = writes.findIndex(write => write.path === join(outputRoot, 'canon.lock.json'));
    if (manifest >= 0) writes.push(...writes.splice(manifest, 1));
    // Recheck after the asynchronous build before committing to the project.
    loadSource(designRoot);
    sourcePath(designRoot, outputRoot, 'directory');
    installFiles(designRoot, writes);
    return { ok: true, built: result.files.length, referencesUpdated: Boolean(projectRoot), warnings: result.warnings };
  } finally { rmSync(stage, { recursive: true, force: true }); }
}

export function serve(dir: string, port = 4600, designDir?: string, opts: { projectRoot?: string; open?: boolean } = {}): Promise<void> {
  return new Promise((resolveServe, reject) => {
    const outputRoot = realpathSync(resolve(dir));
    const designRoot = designDir ? realpathSync(resolve(designDir)) : undefined;
    const projectRoot = opts.projectRoot ? realpathSync(resolve(opts.projectRoot)) : undefined;
    const checkProject = (): Project | undefined => {
      if (!projectRoot) return undefined;
      const project = findProject(projectRoot);
      requireValue(project?.root === projectRoot && project.design === designRoot, 'This project no longer points to this Studio design; reopen its Studio');
      return project;
    };
    const project = checkProject();
    // Adapter-mode project (`canon adopt` / `canon init --lib`): the target repo owns its own
    // component library, so an entirely different request handler serves theme/inventory state
    // and the library-studio editor instead of Canon's native design/preview. Delegated in full —
    // native routes below (`/api/system`, `/api/save`, the design dist static files, …) never run.
    if (project?.adapter && projectRoot) {
      const handler = libHandler(projectRoot, project.adapter, project.design);
      const server = createServer(async (req, res) => { await handler(req, res); });
      listen(server, port, (p) => `canon studio → http://127.0.0.1:${p}/  (library mode: ${project.adapter} adapter, ${projectRoot})`, opts).then(resolveServe, reject);
      return;
    }
    if (designRoot) { contained(designRoot, outputRoot); requireValue(designRoot !== outputRoot, 'Studio output must be a separate directory within the design directory'); }
    let saving = false;
    const server = createServer(async (req, res) => {
      res.setHeader('x-content-type-options', 'nosniff');
      try {
        checkRequest(req);
        const url = decodePath(req);
        if (url === '/api/project') {
          if (req.method !== 'GET') throw new HttpError(405, 'Use GET for /api/project');
          checkProject();
          json(res, 200, { connected: Boolean(projectRoot), name: projectRoot ? basename(projectRoot) : undefined });
          return;
        }
        if (designRoot && url === '/api/system') {
          if (req.method !== 'GET') throw new HttpError(405, 'Use GET for /api/system');
          json(res, 200, loadSource(designRoot));
          return;
        }
        if (designRoot && url === '/api/save') {
          if (req.method !== 'POST') throw new HttpError(405, 'Use POST for /api/save');
          checkProject();
          const body = validateBody(await readBody(req));
          if (saving) throw new HttpError(409, 'A save is already in progress; retry when it finishes');
          saving = true;
          try {
            const result = await saveSource(body, designRoot, outputRoot, projectRoot);
            json(res, 200, result);
            console.log(`saved → rebuilt ${result.built} files`);
          } finally { saving = false; }
          return;
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Use GET or HEAD for static files');
        if (url === '/setup') {
          res.writeHead(302, { location: '/docs.html#primeiro-projeto', 'cache-control': 'no-store', 'content-length': '0' });
          res.end();
          return;
        }
        if (url === '/canon-package.tgz') {
          const content = await getCanonPackage();
          res.writeHead(200, {
            'content-type': 'application/gzip', 'content-disposition': 'attachment; filename="canon-package.tgz"',
            'content-length': content.byteLength, 'cache-control': 'no-store',
          });
          res.end(req.method === 'HEAD' ? undefined : content);
          return;
        }
        serveStatic(outputRoot, url, req, res, 'preview.html');
      } catch (error) { reportError(req, res, error); }
    });
    listen(server, port, (p) => `canon studio → http://127.0.0.1:${p}/  (serving ${dir}${designDir ? ', saving to ' + designDir : ''})`, opts).then(resolveServe, reject);
  });
}
