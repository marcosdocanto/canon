import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { System } from './types.ts';
import { indexTokens } from './tokens/resolve.ts';
import { componentCss, fullCss, patternsCss } from './generators/css.ts';
import { validateSystem } from './system.ts';
import { VERSION } from './version.ts';
import { contentHash, outputPath, sourceHash, type BuildManifest, type GeneratorName } from './build-manifest.ts';

export interface BuildResult { outDir: string; files: string[]; hash: string; warnings: string[] }

type Generator = (system: System, idx: ReturnType<typeof indexTokens>, write: (rel: string, content: string) => void) => void | Promise<void>;

const optional: { name: GeneratorName; load: () => Promise<{ generate: Generator }> }[] = [
  { name: 'tailwind', load: () => import('./generators/tailwind.ts') },
  { name: 'dtcg', load: () => import('./generators/dtcg.ts') },
  { name: 'react', load: () => import('./generators/react.ts') },
  { name: 'preview', load: () => import('./generators/preview.ts') },
  { name: 'designmd', load: () => import('./generators/designmd.ts') },
  { name: 'agents', load: () => import('./generators/agents.ts') },
];

export async function buildSystem(system: System, designDir: string, opts: { only?: string[] } = {}): Promise<BuildResult> {
  const v = validateSystem(system);
  if (v.errors.length) throw new Error(`Design system is invalid:\n  - ${v.errors.join('\n  - ')}`);
  const idx = indexTokens(system.tokens, system.meta.prefix);
  const outDir = join(designDir, system.meta.out || 'dist');
  mkdirSync(outDir, { recursive: true });
  const files: string[] = [];
  const hashes: Record<string, string> = {};
  const generators: GeneratorName[] = [];
  const warnings: string[] = [...v.warnings];
  const write = (rel: string, content: string) => {
    const p = outputPath(outDir, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, content);
    files.push(p);
    hashes[rel] = contentHash(content);
  };
  const css = fullCss(system, idx);
  write('tokens.css', css.tokens);
  write('base.css', css.base);
  write('components.css', css.components);
  write(`${system.meta.prefix}.css`, css.all);
  // Selective imports keep dependencies explicit: tokens, base, components, then patterns.
  for (const component of system.components) {
    write(`css/components/${component.slug}.css`, componentCss(component, idx, system.meta.prefix));
  }
  for (const pattern of system.patterns) {
    write(`css/patterns/${pattern.slug}.css`, patternsCss({ ...system, patterns: [pattern] }, idx));
  }
  generators.push('css');
  for (const g of optional) {
    if (opts.only && !opts.only.includes(g.name)) continue;
    try {
      const mod = await g.load();
      await mod.generate(system, idx, write);
      generators.push(g.name);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === 'ERR_MODULE_NOT_FOUND') { warnings.push(`generator "${g.name}" not available yet`); continue; }
      throw new Error(`generator "${g.name}" failed: ${err.stack ?? err.message}`);
    }
  }
  const hash = sourceHash(system);
  // Certify only this invocation's generators, even if older files remain in dist.
  const manifest: BuildManifest = { manifestVersion: 1, canon: VERSION, system: system.meta.name, version: system.meta.version, sourceHash: hash, builtAt: new Date().toISOString(), components: system.components.length, tokens: idx.size, generators, files: { ...hashes } };
  write('canon.lock.json', JSON.stringify(manifest, null, 2) + '\n');
  return { outDir, files, hash, warnings };
}
