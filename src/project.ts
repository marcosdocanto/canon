import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { sourcePath, type Write } from './design-files.ts';

export interface Project { root: string; design: string }
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
      return { root: canonical, design: resolve(canonical, config.design) };
    }
    const parent = dirname(root);
    if (parent === root) return undefined;
    root = parent;
  }
}

export function projectWrite(root: string, design: string): Write {
  const config = { version: 1, design: relative(root, design).split(sep).join('/') || '.' };
  return { root, path: join(root, CONFIG), content: Buffer.from(JSON.stringify(config, null, 2) + '\n') };
}
