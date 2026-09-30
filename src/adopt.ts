// canon adopt: plan-first, non-destructive import of an existing repo that already uses a
// supported component library (shadcn/ui today). Reads the repo's own theme and component
// inventory through its adapter and — only with `apply: true` — seeds a Canon design from that
// theme, builds the library-mode dist and installs the agent-facing references into the repo.
// Core module: never imports from `./adapters/shadcn/**` — everything library-specific comes
// through the `Adapter` contract (see `src/adapters/types.ts`), the same boundary `describeVar`
// established for `buildLib`'s DESIGN.md generation.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import type { System } from './types.ts';
import type { ComponentInfo, ExecFn } from './adapters/types.ts';
import { detectAdapter } from './adapters/index.ts';
import { createSystem, writeDesignDir } from './system.ts';
import { buildLib } from './build-lib.ts';
import { install } from './install.ts';
import { findLocalProject, projectWrite } from './project.ts';
import { installFiles } from './design-files.ts';

export interface AdoptOptions {
  root: string;
  apply: boolean;
  hooks: boolean;
  /** Accepted for interface parity with `init-lib`'s shared apply tail; adopt itself never shells out. */
  exec?: ExecFn;
  /** Design source directory. Defaults to `<root>/design`. */
  design?: string;
}

export interface AdoptResult { plan: string[]; applied: boolean }

/** `package.json`'s `name` (scope stripped) when present and valid, else the root directory's basename. */
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
 * Library mode has no Canon-authored component/pattern catalog — the target library's own code
 * (read through the adapter's `inventory`) is the catalog; `buildLib`'s DESIGN.md/agents
 * generation and `storyWrites` only ever read `adapter.inventory(root)`, never
 * `system.components`/`system.patterns` (see build-lib.ts). Left un-stripped, `writeDesignDir`
 * would dump Canon's full native catalog (~90 components, ~19 patterns) into the adopted repo as
 * dead weight and bloat the plan with misleading create-lines. Strips both collections from a
 * freshly created `System` before it's planned or written. Exported so `init-lib`'s apply tail
 * (Task 11) can reuse it.
 */
export function stripNativeCatalog(system: System): System {
  system.components = [];
  system.patterns = [];
  return system;
}

function relDisplay(root: string, path: string): string {
  return relative(root, path).split(sep).join('/');
}

function planLine(root: string, path: string): string {
  return `${existsSync(path) ? 'update' : 'create'} ${relDisplay(root, path)}`;
}

/**
 * One summary line per inventoried component: `"button: 2 axes, 10 variants"` for a component
 * Canon can edit, `"badge: read-only (template interpolation)"` when its `cva()` fell outside the
 * supported grammar (or a variant key was unsafe to interpolate), `"x: no variants"` for a
 * component with no `cva()` call at all.
 */
function componentNote(c: ComponentInfo): string {
  if (c.readOnlyReason) {
    const match = /^cva: unsupported (.+?)(?: at offset \d+)?$/.exec(c.readOnlyReason);
    return `${c.slug}: read-only (${match ? match[1] : c.readOnlyReason})`;
  }
  if (!c.cva) return `${c.slug}: no variants`;
  const axes = Object.entries(c.cva.variants);
  const total = axes.reduce((sum, [, values]) => sum + Object.keys(values).length, 0);
  return `${c.slug}: ${axes.length} ${axes.length === 1 ? 'axis' : 'axes'}, ${total} ${total === 1 ? 'variant' : 'variants'}`;
}

/** Every path adopt would create or modify, plus a trailing per-component note for each inventoried component. */
function buildPlan(root: string, designDir: string, system: System, components: ComponentInfo[], hooks: boolean): string[] {
  const lines: string[] = [];
  const dist = join(designDir, system.meta.out || 'dist');

  lines.push(planLine(root, join(designDir, 'system.json')));
  lines.push(planLine(root, join(designDir, 'tokens.json')));
  // `system` is always `stripNativeCatalog`'d by the caller before reaching here, so these are
  // no-ops in practice — kept so the plan stays accurate if that ever changes.
  for (const c of system.components) lines.push(planLine(root, join(designDir, 'components', `${c.slug}.json`)));
  for (const p of system.patterns) lines.push(planLine(root, join(designDir, 'patterns', `${p.slug}.json`)));
  // writeDesignDir only ever creates README.md (never overwrites an existing one), so it's only
  // ever a "create" line, and only listed when it would actually be written.
  const readme = join(designDir, 'README.md');
  if (!existsSync(readme)) lines.push(`create ${relDisplay(root, readme)}`);

  lines.push(planLine(root, join(root, '.canon', 'project.json')));

  for (const rel of ['DESIGN.md', 'DESIGN.compact.md', join('agents', 'AGENTS.md'), join('agents', 'CLAUDE.md'), join('agents', 'SKILL.md'), join('agents', 'design-system.mdc'), join('agents', 'PROMPT.md')]) {
    lines.push(planLine(root, join(dist, rel)));
  }

  for (const c of components) lines.push(planLine(root, join(root, 'stories', 'canon', `${c.slug}.stories.tsx`)));

  lines.push(planLine(root, join(root, 'DESIGN.md')));
  lines.push(planLine(root, join(root, 'DESIGN.compact.md')));
  lines.push(planLine(root, join(root, '.claude', 'skills', 'design-system', 'SKILL.md')));
  lines.push(planLine(root, join(root, '.cursor', 'rules', 'design-system.mdc')));
  lines.push(planLine(root, join(root, 'AGENTS.md')));
  lines.push(planLine(root, join(root, 'CLAUDE.md')));
  lines.push(planLine(root, join(root, '.mcp.json')));
  if (hooks) lines.push(planLine(root, join(root, '.claude', 'settings.json')));
  lines.push(planLine(root, join(root, '.codex', 'config.toml')));

  for (const c of components) lines.push(componentNote(c));

  return lines;
}

/**
 * Plan-first adoption of an existing repo already using a supported component library.
 *
 * Without `apply`, only detects the adapter, reads the theme and inventory, and returns the plan
 * — nothing on disk is touched (not even a directory is created). With `apply: true`, seeds a new
 * Canon design from the repo's own theme (via the adapter's `themeOverrides`), records the
 * adapter in `.canon/project.json`, builds the library-mode dist and installs the agent-facing
 * references. `writeTheme` is never called: the repo's existing theme file is adopt's starting
 * point, not something it overwrites.
 */
export async function adopt(opts: AdoptOptions): Promise<AdoptResult> {
  const root = realpathSync(opts.root);
  const adapter = detectAdapter(root);
  if (!adapter) throw new Error(`No supported component library detected in ${root}. Looked for: shadcn (components.json).`);

  const designDir = resolve(root, opts.design ?? 'design');

  const theme = adapter.readTheme(root);
  const components = adapter.inventory(root);
  const system = stripNativeCatalog(await createSystem({
    name: packageName(root),
    prefix: 'ds',
    seeds: { overrides: adapter.themeOverrides(theme) },
  }));

  const plan = buildPlan(root, designDir, system, components, opts.hooks);
  if (!opts.apply) return { plan, applied: false };

  // Root-local only: an ancestor directory's adapter-mode project must never waive this repo's
  // own refusal check for a nested root that has no `.canon/project.json` of its own.
  const isAdapterMode = findLocalProject(root)?.adapter !== undefined;
  if (existsSync(join(designDir, 'system.json')) && !isAdapterMode) {
    throw new Error(`${join(designDir, 'system.json')} already exists and isn't an adapter-managed design. Pass --design to adopt into a different directory.`);
  }

  writeDesignDir(system, designDir);
  installFiles(root, [projectWrite(root, designDir, adapter.id)]);
  await buildLib(root, designDir);
  install(system, designDir, { root, hooks: opts.hooks });

  return { plan, applied: true };
}
