// canon init --lib: bootstrap a new project directly onto an external component library (shadcn/ui
// today) instead of Canon's native catalog. When the library isn't already present in the repo,
// runs the library's own init/add commands through the injected `exec`, then seeds a Canon System
// from the chosen preset and writes it onto the library's own theme file — the one library-mode
// flow that overwrites the theme (`canon adopt` never does; it only ever reads the existing theme).
// From there it reuses the exact same design-dir/project-config/build/install tail as
// `adopt --apply`.
// Core module: never imports from `./adapters/shadcn/**` — everything library-specific comes
// through the `Adapter` contract (see `src/adapters/types.ts`), the same boundary `adopt.ts` and
// `build-lib.ts` established.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { ExecFn } from './adapters/types.ts';
import { getAdapter } from './adapters/index.ts';
import { createSystem, writeDesignDir } from './system.ts';
import { stripNativeCatalog } from './adopt.ts';
import { buildLib } from './build-lib.ts';
import { install } from './install.ts';
import { projectWrite } from './project.ts';
import { installFiles } from './design-files.ts';

/**
 * Components installed on a fresh library init, covering the surface most repos reach for
 * immediately. Only used when the library wasn't already detected at `root` — an already-adopted
 * repo keeps whatever components it already has.
 */
export const CORE_SLUGS = [
  'button', 'badge', 'card', 'input', 'label', 'select', 'dialog', 'dropdown-menu',
  'tabs', 'table', 'textarea', 'checkbox', 'switch', 'tooltip', 'sonner',
];

export interface InitLibOptions {
  root: string;
  lib: string;
  preset?: string;
  name?: string;
  exec: ExecFn;
  hooks: boolean;
}

/**
 * `package.json`'s `name` (scope stripped) when present and valid, else the root directory's
 * basename. Mirrors `adopt.ts`'s `packageName` — same fallback, for the same reason: a name has to
 * come from somewhere when the caller doesn't supply one.
 */
function packageName(root: string): string {
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: unknown };
      if (typeof pkg.name === 'string' && pkg.name.trim()) {
        const name = pkg.name.trim();
        const slash = name.indexOf('/');
        return name.startsWith('@') && slash !== -1 ? name.slice(slash + 1) : name;
      }
    } catch { /* invalid package.json: fall through to basename */ }
  }
  return basename(root);
}

/**
 * Bootstrap `root` directly onto external component library `lib`. When the library isn't already
 * detected there, runs its own init (`npx shadcn@latest init --yes -b neutral`) through `exec`,
 * then installs `CORE_SLUGS` through `adapter.install`. Either way: creates a Canon System from
 * `preset`, writes it onto the library's own theme file via `adapter.applyTheme` (init is the one
 * flow that overwrites the theme), then runs the same design-dir/project-config/build/install tail
 * `adopt --apply` uses — a lean design dir (native catalog stripped), `.canon/project.json`
 * recording the adapter, `buildLib`, then `install`.
 */
export async function initLib(opts: InitLibOptions): Promise<void> {
  const root = realpathSync(resolve(opts.root));
  const adapter = getAdapter(opts.lib);

  if (!adapter.detect(root)) {
    const result = await opts.exec('npx', ['shadcn@latest', 'init', '--yes', '-b', 'neutral'], { cwd: root });
    if (result.status !== 0) throw new Error(`init --lib ${opts.lib}: library init failed (exit ${result.status}): ${result.stderr}`);
    await adapter.install(root, CORE_SLUGS, opts.exec);
  }

  const designDir = resolve(root, 'design');
  const system = stripNativeCatalog(await createSystem({
    name: opts.name ?? packageName(root),
    preset: opts.preset,
  }));

  installFiles(root, adapter.applyTheme(root, system));

  writeDesignDir(system, designDir);
  installFiles(root, [projectWrite(root, designDir, adapter.id)]);
  await buildLib(root, designDir);
  install(system, designDir, { root, hooks: opts.hooks });
}
