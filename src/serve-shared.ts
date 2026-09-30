// Shared HTTP conventions for Canon's local Studio servers — native (serve.ts) and library mode
// (serve-lib.ts): same-origin request checks, JSON body reading with size limits, path decoding,
// static file serving with symlink/traversal containment, error reporting, and the listen/bootstrap
// sequence (timeouts, SIGINT, ready message, optional browser open). Extracted so both servers stay
// byte-identical in these conventions rather than drifting copies.
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { readFileSync, statSync, realpathSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { HttpError, contained } from './design-files.ts';

export const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.tsx': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' };
export const MAX_BODY_BYTES = 8 * 1024 * 1024;

/** Reject any request that doesn't address this local Studio server by a loopback host/port it's actually listening on, and any cross-origin request. */
export function checkRequest(req: IncomingMessage) {
  const port = req.socket.localPort;
  const hosts = ['localhost', '127.0.0.1', '[::1]'].map((hostname) => `${hostname}:${port}`);
  if (port === 80) hosts.push('localhost', '127.0.0.1', '[::1]');
  const host = req.headers.host?.toLowerCase();
  const hostCount = req.rawHeaders.filter((_, index) => index % 2 === 0 && req.rawHeaders[index].toLowerCase() === 'host').length;
  if (!host || hostCount !== 1 || !hosts.includes(host)) throw new HttpError(403, 'Host must address this local Studio server');
  if (req.headers.origin !== undefined && req.headers.origin !== `http://${host}`) throw new HttpError(403, 'Origin must match this Studio server');
}

/** Read and JSON-parse a request body, enforcing an 8 MiB cap by both Content-Length and actual received bytes. */
export function readBody(req: IncomingMessage): Promise<unknown> {
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

/** Write a JSON response with the conventions every Studio endpoint uses (charset, no-store). */
export function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

/**
 * Decode and validate a request's path portion the same way every Studio server does: reject a
 * URL that fails `decodeURIComponent`, a protocol-relative `//`, a NUL byte, or a backslash.
 */
export function decodePath(req: IncomingMessage): string {
  let url: string;
  try { url = decodeURIComponent((req.url ?? '/').split('?')[0]); }
  catch { throw new HttpError(400, 'Malformed request URL'); }
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('\0') || url.includes('\\')) throw new HttpError(400, 'Malformed request URL');
  return url;
}

/**
 * Serve `url` as a static file rooted at `root` (already realpath'd): `/` resolves to `indexFile`,
 * any other path is joined onto `root`; every resolved path — including after following a
 * directory to its own `index.html` — is re-checked to still be contained in `root`, so a symlink
 * (file, directory, or index) can never serve content from outside it. GET/HEAD only.
 */
export function serveStatic(root: string, url: string, req: IncomingMessage, res: ServerResponse, indexFile: string) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Use GET or HEAD for static files');
  let file = resolve(root, url === '/' ? indexFile : `.${url}`);
  contained(root, file);
  file = realpathSync(file);
  contained(root, file);
  if (statSync(file).isDirectory()) { file = realpathSync(join(file, 'index.html')); contained(root, file); }
  if (!statSync(file).isFile()) throw new HttpError(404, 'File not found');
  const content = readFileSync(file);
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : content);
}

/** Convert a thrown error into the JSON error response every Studio server sends, mapping filesystem error codes to sensible HTTP statuses. */
export function reportError(req: IncomingMessage, res: ServerResponse, error: unknown) {
  const code = (error as NodeJS.ErrnoException).code;
  const status = error instanceof HttpError ? error.status : code === 'ENOENT' || code === 'ENOTDIR' ? 404 : code === 'EACCES' || code === 'EPERM' ? 403 : 500;
  if (!req.complete) { res.setHeader('connection', 'close'); req.resume(); }
  if (!res.destroyed) json(res, status, { ok: false, error: error instanceof Error ? error.message : 'Studio request failed' });
}

/**
 * The listen/bootstrap sequence every Studio server uses: request/header timeouts, a SIGINT
 * handler that closes the server, and a promise that resolves only once the server actually closes
 * (mirroring `serve()`'s original contract — this is a long-running process, not a one-shot
 * request). Logs `message(port)` once listening and optionally opens a browser to it.
 */
export function listen(server: Server, port: number, message: (port: number) => string, opts: { open?: boolean } = {}): Promise<void> {
  return new Promise((resolveServe, reject) => {
    server.requestTimeout = 30_000;
    server.headersTimeout = 10_000;
    const stop = () => server.close();
    const cleanup = () => process.off('SIGINT', stop);
    server.once('error', (error) => { cleanup(); reject(error); });
    server.once('close', () => { cleanup(); resolveServe(); });
    process.once('SIGINT', stop);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      console.log(message(address.port));
      if (opts.open) {
        import('./open.ts').then(({ openBrowser }) => openBrowser(`http://127.0.0.1:${address.port}/`))
          .catch(error => console.error(`Studio is ready; could not open a browser: ${error.message}`));
      }
    });
  });
}
