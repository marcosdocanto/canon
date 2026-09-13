import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { System } from './types.ts';
import { VERSION } from './version.ts';

export const BUILD_GENERATORS = ['css', 'tailwind', 'dtcg', 'react', 'preview', 'designmd', 'agents'] as const;
export type GeneratorName = typeof BUILD_GENERATORS[number];

export interface BuildManifest {
  manifestVersion: 1;
  canon: string;
  system: string;
  version: string;
  sourceHash: string;
  builtAt: string;
  components: number;
  tokens: number;
  generators: GeneratorName[];
  files: Record<string, string>;
}

export const contentHash = (content: string | Buffer): string => createHash('sha256').update(content).digest('hex');
export const sourceHash = (system: System): string => contentHash(JSON.stringify(system));

/** Manifest paths are portable, output-relative file names, never filesystem paths. */
export function outputPath(outDir: string, rel: string): string {
  const path = resolve(outDir, rel);
  const within = relative(resolve(outDir), path);
  if (!rel || rel.includes('\\') || isAbsolute(rel) || within === '' || within === '..' || within.startsWith(`..${sep}`) || isAbsolute(within)) {
    throw new Error(`Invalid generated file path: ${rel}`);
  }
  return path;
}

export function checkBuild(system: System, designDir: string): { ok: boolean; issues: string[] } {
  const outDir = join(designDir, system.meta.out || 'dist');
  let manifest: BuildManifest;
  try {
    manifest = JSON.parse(readFileSync(join(outDir, 'canon.lock.json'), 'utf8'));
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
    return { ok: false, issues: [missing ? 'dist not built (missing build manifest).' : 'Build manifest cannot be read.'] };
  }
  if (!manifest || manifest.manifestVersion !== 1 || !Array.isArray(manifest.generators)
    || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)
    || Object.keys(manifest.files).length === 0) {
    return { ok: false, issues: ['Build manifest is incomplete or uses an older format.'] };
  }
  const issues: string[] = [];
  if (manifest.canon !== VERSION) issues.push(`Compiler version changed (built with ${manifest.canon}, current ${VERSION}).`);
  if (manifest.sourceHash !== sourceHash(system)) issues.push('dist is stale (design source changed since last build).');
  const missing = BUILD_GENERATORS.filter((name) => !manifest.generators.includes(name));
  if (missing.length) issues.push(`Build is incomplete; missing generators: ${missing.join(', ')}.`);
  for (const [rel, expected] of Object.entries(manifest.files)) {
    try {
      if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) throw new Error('invalid content hash');
      const actual = contentHash(readFileSync(outputPath(outDir, rel)));
      if (actual !== expected) issues.push(`Generated file changed: ${rel}.`);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      issues.push(code === 'ENOENT' ? `Generated file missing: ${rel}.` : `Generated file cannot be verified: ${rel}.`);
    }
  }
  return { ok: issues.length === 0, issues };
}
