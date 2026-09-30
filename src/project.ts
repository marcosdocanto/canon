import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { sourcePath, type Write } from './design-files.ts';

export interface Project { root: string; design: string; adapter?: string }
const CONFIG = '.canon/project.json';

/** Discover a project from any working directory below it. */
export function findProject(from: string): Project | undefined {
  let root = resolve(from);
  while (true) {
    const path = join(root, CONFIG);
    if (existsSync(path)) {
      const canonical = realpathSync(root);
      sourcePath(canonical, join(canonical, CONFIG), 'file');
      const config = JSON.parse(readFileSync(path, 'utf8'));
      if (config?.version !== 1 || typeof config.design !== 'string' || !config.design || isAbsolute(config.design) || config.design.includes('\\') || config.design.includes('\0')) {
        throw new Error(`Invalid Canon project configuration: ${path}`);
      }
      if (config.adapter !== undefined && (typeof config.adapter !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.adapter))) {
        throw new Error(`Invalid Canon project configuration: ${path}`);
      }
      return { root: canonical, design: resolve(canonical, config.design), adapter: config.adapter };
    }
    const parent = dirname(root);
    if (parent === root) return undefined;
    root = parent;
  }
}

/**
 * Like `findProject`, but only returns a result when `.canon/project.json` lives at `root` itself
 * — never one inherited from an ancestor directory. `findProject` deliberately walks up (so a
 * subdirectory of a project can run `canon build` without `--root`), but that's wrong for callers
 * that must never let an unrelated ancestor project's `adapter` leak into a nested root that has no
 * config of its own (adopt's design-dir refusal guard; install()'s adapter-preserving rewrite).
 */
export function findLocalProject(root: string): Project | undefined {
  const project = findProject(root);
  return project && project.root === realpathSync(resolve(root)) ? project : undefined;
}

export function projectWrite(root: string, design: string, adapter?: string): Write {
  const config = { version: 1, design: relative(root, design).split(sep).join('/') || '.', ...(adapter ? { adapter } : {}) };
  return { root, path: join(root, CONFIG), content: Buffer.from(JSON.stringify(config, null, 2) + '\n') };
}
