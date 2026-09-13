import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSystem } from './build.ts';
import { installFiles, loadSource, sourcePath, validateSnapshot } from './design-files.ts';
import { install } from './install.ts';
import { findProject } from './project.ts';
import { writeDesignDir } from './system.ts';
import { compareSpecs } from './components/index.ts';
import { comparePatterns } from './patterns/index.ts';

const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;

async function readSnapshot(source: string): Promise<unknown> {
  if (!/^https?:\/\//i.test(source)) {
    if (statSync(source).size > MAX_SNAPSHOT_BYTES) throw new Error('Design snapshot exceeds 8 MiB');
    return JSON.parse(readFileSync(source, 'utf8'));
  }
  const base = new URL(source);
  base.search = ''; base.hash = '';
  // Public catalogs can live at /canon/ on a static host. Keep that directory
  // for both the document URL and a site address copied from the browser.
  if (!base.pathname.endsWith('/') && !base.pathname.split('/').at(-1)!.includes('.')) base.pathname += '/';
  const url = new URL('./api/system', base);
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Could not read the saved Studio design (HTTP ${response.status})`);
  if (Number(response.headers.get('content-length') ?? 0) > MAX_SNAPSHOT_BYTES) {
    await response.body?.cancel();
    throw new Error('Design snapshot exceeds 8 MiB');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Studio returned no design snapshot');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SNAPSHOT_BYTES) throw new Error('Design snapshot exceeds 8 MiB');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function connect(source: string | undefined, opts: { root: string; design?: string; hooks?: boolean }) {
  mkdirSync(opts.root, { recursive: true });
  const root = realpathSync(resolve(opts.root));
  const project = findProject(root);
  const design = opts.design ? resolve(root, opts.design) : project?.root === root ? project.design : join(root, 'design');
  // New sources must be inside the selected project; explicitly configured existing
  // sources may live elsewhere, but are still checked against their own boundary.
  const existing = existsSync(join(design, 'system.json'));
  const rel = relative(root, design);
  const inside = !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`);
  if (!existing || inside) sourcePath(root, design, 'directory');
  else if (realpathSync(design) !== design) throw new Error('Canon does not connect through linked design directories');
  let reused = false;
  if (existing) {
    const system = validateSnapshot(loadSource(realpathSync(design)));
    const stage = mkdtempSync(join(tmpdir(), 'canon-reconnect-'));
    try {
      const result = await buildSystem(system, stage);
      installFiles(design, result.files.map(file => ({
        path: join(design, system.meta.out, relative(result.outDir, file)), content: readFileSync(file),
      })));
    } finally { rmSync(stage, { recursive: true, force: true }); }
    reused = true;
  } else {
    if (existsSync(design) && readdirSync(design).length) throw new Error(`Design destination is not empty: ${design}`);
    if (!source) throw new Error('Provide the Studio URL or a saved design snapshot to connect this project');
    const system = validateSnapshot(await readSnapshot(source));
    system.components.sort(compareSpecs);
    system.patterns.sort(comparePatterns);
    mkdirSync(dirname(design), { recursive: true });
    const stage = mkdtempSync(join(dirname(design), '.canon-connect-'));
    try {
      writeDesignDir(system, stage);
      await buildSystem(system, stage);
      sourcePath(root, design, 'directory');
      if (existsSync(design)) {
        if (readdirSync(design).length) throw new Error(`Design destination is not empty: ${design}`);
        rmSync(design, { recursive: true });
      }
      renameSync(stage, design);
    } finally { rmSync(stage, { recursive: true, force: true }); }
  }
  const { log } = install(loadSource(realpathSync(design)), design, { root, hooks: opts.hooks !== false });
  return { design, reused, log };
}
