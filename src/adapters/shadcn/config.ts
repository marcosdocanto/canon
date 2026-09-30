// shadcn/ui config: components.json + tsconfig/jsconfig alias resolution.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Resolved shadcn/ui project configuration. */
export interface ShadcnConfig { cssFile: string /* abs */; uiDir: string /* abs */; uiImportBase: string /* e.g. "~/ui" */; }

type TsPaths = Record<string, string[]>;

function readJson(path: string): any | undefined {
  if (!existsSync(path)) return undefined;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return undefined; }
}

function readPaths(root: string): TsPaths {
  const config = readJson(join(root, 'tsconfig.json')) ?? readJson(join(root, 'jsconfig.json'));
  const paths = config?.compilerOptions?.paths;
  return paths && typeof paths === 'object' ? paths : {};
}

/**
 * Resolve an import alias (e.g. "~/ui") to an absolute directory.
 * Tries tsconfig/jsconfig `compilerOptions.paths` first (the `"prefix/*": ["./dir/*"]` form,
 * taking the first mapping). Falls back to shadcn's two standard "@/x" layouts
 * (root-level and src/), picking whichever exists on disk.
 */
function resolveAliasDir(root: string, importBase: string, paths: TsPaths): string | undefined {
  for (const [key, mapping] of Object.entries(paths)) {
    if (!key.endsWith('/*') || !Array.isArray(mapping) || typeof mapping[0] !== 'string' || !mapping[0].endsWith('/*')) continue;
    const prefix = key.slice(0, -2);
    if (importBase !== prefix && !importBase.startsWith(`${prefix}/`)) continue;
    const dir = mapping[0].slice(0, -2);
    const rest = importBase.slice(prefix.length);
    return resolve(root, dir + rest);
  }
  const atMatch = /^@\/(.*)$/.exec(importBase);
  if (atMatch) {
    const rest = atMatch[1];
    const atRoot = join(root, rest);
    const atSrc = join(root, 'src', rest);
    if (existsSync(atRoot)) return atRoot;
    if (existsSync(atSrc)) return atSrc;
    return atRoot;
  }
  return undefined;
}

/**
 * Read a project's shadcn/ui `components.json` and resolve its aliases to absolute paths.
 * Returns undefined when the project has no `components.json` (not a shadcn project).
 */
export function readConfig(root: string): ShadcnConfig | undefined {
  const componentsPath = join(root, 'components.json');
  if (!existsSync(componentsPath)) return undefined;
  const config = JSON.parse(readFileSync(componentsPath, 'utf8'));
  const aliases = config?.aliases ?? {};
  const uiImportBase: string = aliases.ui ?? (aliases.components ? `${aliases.components}/ui` : '@/components/ui');
  const uiDir = resolveAliasDir(root, uiImportBase, readPaths(root));
  if (!uiDir) throw new Error(`shadcn adapter: cannot resolve ui alias "${uiImportBase}" to a directory (${componentsPath})`);
  const cssPath = config?.tailwind?.css;
  if (typeof cssPath !== 'string' || !cssPath) throw new Error(`shadcn adapter: components.json is missing tailwind.css (${componentsPath})`);
  return { cssFile: resolve(root, cssPath), uiDir, uiImportBase };
}
