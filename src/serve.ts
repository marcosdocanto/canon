import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, statSync, realpathSync, mkdtempSync, rmSync } from 'node:fs';
import { basename, join, resolve, relative, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { validateSystem } from './system.ts';
import { HttpError, requireValue, record, identifier, validateMeta, contained, sourcePath, loadSource, installFiles, type Write } from './design-files.ts';
import { buildSystem } from './build.ts';
import { compareSpecs } from './components/index.ts';
import { comparePatterns } from './patterns/index.ts';
import { getCanonPackage } from './distribution.ts';
import { referenceWrites } from './install.ts';
import { findProject } from './project.ts';
import type { System, SystemMeta, Tokens, ComponentSpec, Pattern } from './types.ts';

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.tsx': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' };
const MAX_BODY_BYTES = 8 * 1024 * 1024;

function checkRequest(req: IncomingMessage) {
  const port = req.socket.localPort;
  const hosts = ['localhost', '127.0.0.1', '[::1]'].map((hostname) => `${hostname}:${port}`);
  if (port === 80) hosts.push('localhost', '127.0.0.1', '[::1]');
  const host = req.headers.host?.toLowerCase();
  const hostCount = req.rawHeaders.filter((_, index) => index % 2 === 0 && req.rawHeaders[index].toLowerCase() === 'host').length;
  if (!host || hostCount !== 1 || !hosts.includes(host)) throw new HttpError(403, 'Host must address this local Studio server');
  if (req.headers.origin !== undefined && req.headers.origin !== `http://${host}`) throw new HttpError(403, 'Origin must match this Studio server');
}

function readBody(req: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'Save requires application/json');
  if (Number(req.headers['content-length'] ?? 0) > MAX_BODY_BYTES) throw new HttpError(413, 'Save body exceeds 8 MiB');
  return new Promise((resolveBody, reject) => {
    let chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const fail = (error: Error) => { if (!done) { done = true; chunks = []; reject(error); } };
    req.on('error', fail);
    req.on('aborted', () => fail(new HttpError(400, 'Save request was interrupted')));
    req.on('data', (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { fail(new HttpError(413, 'Save body exceeds 8 MiB')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'Save body is not valid JSON')); }
    });
  });
}

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

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export function serve(dir: string, port = 4600, designDir?: string, opts: { projectRoot?: string; open?: boolean } = {}): Promise<void> {
  return new Promise((resolveServe, reject) => {
    const outputRoot = realpathSync(resolve(dir));
    const designRoot = designDir ? realpathSync(resolve(designDir)) : undefined;
    const projectRoot = opts.projectRoot ? realpathSync(resolve(opts.projectRoot)) : undefined;
    const checkProject = () => {
      if (!projectRoot) return;
      const project = findProject(projectRoot);
      requireValue(project?.root === projectRoot && project.design === designRoot, 'This project no longer points to this Studio design; reopen its Studio');
    };
    checkProject();
    if (designRoot) { contained(designRoot, outputRoot); requireValue(designRoot !== outputRoot, 'Studio output must be a separate directory within the design directory'); }
    let saving = false;
    const server = createServer(async (req, res) => {
      res.setHeader('x-content-type-options', 'nosniff');
      try {
        checkRequest(req);
        let url: string;
        try { url = decodeURIComponent((req.url ?? '/').split('?')[0]); }
        catch { throw new HttpError(400, 'Malformed request URL'); }
        requireValue(url.startsWith('/') && !url.startsWith('//') && !url.includes('\0') && !url.includes('\\'), 'Malformed request URL');
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
        let file = resolve(outputRoot, url === '/' ? 'preview.html' : `.${url}`);
        contained(outputRoot, file);
        file = realpathSync(file);
        contained(outputRoot, file);
        if (statSync(file).isDirectory()) { file = realpathSync(join(file, 'index.html')); contained(outputRoot, file); }
        if (!statSync(file).isFile()) throw new HttpError(404, 'File not found');
        const content = readFileSync(file);
        res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : content);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        const status = error instanceof HttpError ? error.status : code === 'ENOENT' || code === 'ENOTDIR' ? 404 : code === 'EACCES' || code === 'EPERM' ? 403 : 500;
        if (!req.complete) { res.setHeader('connection', 'close'); req.resume(); }
        if (!res.destroyed) json(res, status, { ok: false, error: error instanceof Error ? error.message : 'Studio request failed' });
      }
    });
    server.requestTimeout = 30_000;
    server.headersTimeout = 10_000;
    const stop = () => server.close();
    const cleanup = () => process.off('SIGINT', stop);
    server.once('error', (error) => { cleanup(); reject(error); });
    server.once('close', () => { cleanup(); resolveServe(); });
    process.once('SIGINT', stop);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      console.log(`canon studio → http://127.0.0.1:${address.port}/  (serving ${dir}${designDir ? ', saving to ' + designDir : ''})`);
      if (opts.open) {
        import('./open.ts').then(({ openBrowser }) => openBrowser(`http://127.0.0.1:${address.port}/`))
          .catch(error => console.error(`Studio is ready; could not open a browser: ${error.message}`));
      }
    });
  });
}
