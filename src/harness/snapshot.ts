import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, readFile, readdir, readlink } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { checkedPath } from './config.ts';
import type { HarnessConfig, SourceSnapshot } from './types.ts';
const exec = promisify(execFile);
export const hash = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');
const runtime = (path: string) => path === '.canon/runs' || path.startsWith('.canon/runs/');
const excluded = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache', 'out']);
async function fallback(root: string, prefix = ''): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (runtime(path) || (entry.isDirectory() && excluded.has(entry.name))) continue;
    if (entry.isDirectory()) paths.push(...await fallback(root, path));
    else paths.push(path);
  }
  return paths;
}
export async function snapshotSource(root: string, config: HarnessConfig): Promise<SourceSnapshot> {
  let paths: string[]; let revision: string | null = null;
  try {
    const result = await exec('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '.'], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
    paths = result.stdout.split('\0').filter(Boolean);
    try { revision = (await exec('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim(); } catch { /* Unborn Git repository. */ }
  } catch { paths = await fallback(root); }
  const configuredFiles = ['canon.config.json', ...config.context.documents, ...config.context.skills, ...(config.app?.storageState ? [config.app.storageState] : [])];
  paths.push(...configuredFiles);
  const files: Record<string, string> = {};
  for (const path of [...new Set(paths)].filter(p => !runtime(p)).sort()) {
    const full = resolve(root, path); const rel = relative(root, full);
    if (rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`Source path escapes root: ${path}`);
    try {
      const info = await lstat(full);
      if (info.isSymbolicLink()) files[path] = `symlink:${hash(await readlink(full))}`;
      else if (info.isFile()) files[path] = `${info.mode & 0o111 ? 'executable:' : ''}${hash(await readFile(full))}`;
      else if (info.isDirectory()) {
        // Git submodules are tracked directory entries; include their source contents.
        for (const child of await fallback(full)) files[`${path}/${child}`] = hash(await readFile(resolve(full, child)));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') files[path] = 'deleted';
      else throw error;
    }
  }
  // Configured context and session bytes matter even when Git ignores a symlink's target.
  for (const path of configuredFiles) {
    try {
      const full = await checkedPath(root, path);
      files[path] = `${files[path] ?? ''}:content:${hash(await readFile(full))}`;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') files[path] = 'deleted';
      else throw error;
    }
  }
  return { fingerprint: hash(JSON.stringify({ revision, files })), revision, files };
}
