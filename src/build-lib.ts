// Library-mode build: read the target repo's theme + component inventory through its recorded
// adapter, and write the dist artifacts `install()` expects (see `referenceWrites` in
// `src/install.ts`) plus generated Storybook stories. No CSS/Tailwind/React generation here — in
// library mode the component library owns its own styles; Canon only reads/writes the theme file
// and each component's style block (the adapter contract) and documents them.
import { realpathSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { VERSION } from './version.ts';
import { referenceWrites } from './install.ts';
import { loadDesignDir } from './system.ts';
import { findProject } from './project.ts';
import { getAdapter } from './adapters/index.ts';
import { installFiles, sourcePath, type Write } from './design-files.ts';
import { designmdLib } from './generators/designmd-lib.ts';
import { generate as generateAgentsLib } from './generators/agents-lib.ts';
import { storyWrites } from './generators/stories.ts';
import type { ComponentInfo, LibraryTheme } from './adapters/types.ts';

/** Kept separate from the native build manifest. */
const MANIFEST = 'canon.library.lock.json';
// VERSION tracks released generator changes; this list tracks the required output families.
const GENERATORS = ['designmd-lib', 'agents-lib', 'stories'];
const hash = (content: Buffer | string) => createHash('sha256').update(content).digest('hex');
/** Documentation emitted by a library build, relative to dist. */
const LIB_DIST_FILES = ['DESIGN.md', 'DESIGN.compact.md', 'agents/AGENTS.md', 'agents/CLAUDE.md', 'agents/SKILL.md', 'agents/design-system.mdc', 'agents/PROMPT.md'];

/**
 * Pure staging for the library-mode dist: `design/<out>/DESIGN.md`, `DESIGN.compact.md` and
 * `agents/{AGENTS,CLAUDE,SKILL,PROMPT}.md` + `agents/design-system.mdc`, plus one Storybook story
 * file per inventoried component under `<root>/stories/canon/` — returned as `Write`s, nothing
 * touches disk (`storyWrites` only *reads* existing story files, to refuse clobbering a hand-edited
 * one). `root` is the target repo (holding the recorded adapter and the library's own code);
 * `designDir` is where the design source (`system.json`, …) lives — only `meta` is read from it.
 *
 * `overrides`, when given, supplies the theme/component snapshot to document instead of reading it
 * fresh via the adapter — for a caller (the save endpoint, `serve-lib.ts`) that has already computed
 * the *next* theme/components in memory but hasn't written them yet: composing this function's
 * output with the not-yet-applied theme/variant `Write`s into one `installFiles` batch means the
 * regenerated DESIGN.md/stories describe the state the save is about to commit, not the state
 * mid-transaction disk still holds.
 */
export async function buildLibWrites(root: string, designDir: string, overrides?: { theme: LibraryTheme; components: ComponentInfo[]; sourceWrites?: Write[] }): Promise<Write[]> {
  root = realpathSync(root); // never trust the caller's path to already be canonical (see inventory.ts, install.ts)
  designDir = realpathSync(designDir);
  const system = loadDesignDir(designDir);
  const project = findProject(root);
  if (!project?.adapter) throw new Error(`No adapter configured for ${root}. Run \`canon adopt\` or \`canon init --lib <id>\` first.`);
  const adapter = getAdapter(project.adapter);
  const theme = overrides?.theme ?? adapter.readTheme(root);
  const components = overrides?.components ?? adapter.inventory(root);

  const dist = join(designDir, system.meta.out || 'dist');
  const distWrites: Write[] = [];
  const write = (rel: string, content: string) => distWrites.push({ root: designDir, path: join(dist, rel), content: Buffer.from(content) });

  const { full, compact } = designmdLib(system, theme, components, (name) => adapter.describeVar(name));
  write('DESIGN.md', full);
  write('DESIGN.compact.md', compact);
  generateAgentsLib(system, theme, components, write);

  const stories = storyWrites(root, adapter, components);
  const writes = [...distWrites, ...stories];
  const manifest = {
    version: 1,
    canon: VERSION,
    generators: GENERATORS,
    ...libraryInputs(root, designDir, project.adapter, theme, components, overrides?.sourceWrites),
    outputs: writes.map(write => ({ scope: write.root === designDir ? 'design' : 'project', path: relative(write.root ?? root, write.path), hash: hash(write.content) })),
  };
  write(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  return [...distWrites, ...stories];
}

/**
 * Build the library-mode dist and install it: `installFiles` over `buildLibWrites`' staged
 * output, as a single atomic batch (dist files and stories together) — no test pins the previous
 * implementation's two separate `installFiles` calls (dist, then stories) as an observable
 * behavior, and one batch is strictly safer: a story-generation failure (e.g. a hand-edited,
 * unmarked story file) can no longer leave DESIGN.md rewritten while stories are not.
 */
export async function buildLib(root: string, designDir: string): Promise<void> {
  const writes = await buildLibWrites(root, designDir);
  root = realpathSync(root);
  designDir = realpathSync(designDir);
  if (hasInstalledReferences(root)) writes.push(...referenceWrites(loadDesignDir(designDir), designDir, root, undefined, writes));
  installFiles(designDir, writes); // every Write carries its own `root`; this is only installFiles' fallback
}

/** Preserve standalone builds: only refresh references when an existing Canon install is visible.
 * Removing every identifying reference makes a project indistinguishable from an uninstalled build. */
function hasInstalledReferences(root: string): boolean {
  return ['AGENTS.md', 'CLAUDE.md', 'DESIGN.md', '.claude/skills/design-system/SKILL.md', '.cursor/rules/design-system.mdc'].some(file => {
    const path = sourcePath(root, join(root, file), 'file');
    return existsSync(path) && /<!-- canon:start -->|> Generated by canon /.test(readFileSync(path, 'utf8'));
  });
}

/** Hash the actual source bytes, including Save's staged edits, plus inventory identities. */
function libraryInputs(root: string, designDir: string, adapter: string, theme: LibraryTheme, components: ComponentInfo[], staged: Write[] = []) {
  const paths = [...new Set([join(designDir, 'system.json'), join(root, '.canon/project.json'), theme.file, ...components.map(c => c.file)])].sort();
  const inputs = Object.fromEntries(paths.map(path => [relative(root, path), hash(staged.find(write => write.path === path)?.content ?? readFileSync(path))]));
  const inventory = components.map(c => ({ slug: c.slug, file: relative(root, c.file), importPath: c.importPath, exportName: c.exportName })).sort((a, b) => a.slug.localeCompare(b.slug));
  return { adapter, inputs, inventory };
}

/** Library freshness tracks source bytes, installed inventory, and generated output bytes. */
export function checkLib(root: string, designDir: string): { ok: boolean; issues: string[] } {
  root = realpathSync(root);
  designDir = realpathSync(designDir);
  const system = loadDesignDir(designDir);
  const project = findProject(root);
  if (!project?.adapter) throw new Error(`No adapter configured for ${root}. Run \`canon adopt\` or \`canon init --lib <id>\` first.`);
  const adapter = getAdapter(project.adapter);
  const dist = join(designDir, system.meta.out || 'dist');
  const missing = [...LIB_DIST_FILES, MANIFEST].filter(file => !existsSync(join(dist, file)));
  if (missing.length) return { ok: false, issues: [`dist not built (missing: ${missing.join(', ')}).`] };
  try {
    const manifest = JSON.parse(readFileSync(join(dist, MANIFEST), 'utf8'));
    if (manifest.version !== 1 || !Array.isArray(manifest.outputs) || !manifest.outputs.length) throw new Error('Invalid library build manifest; run canon build.');
    const current = libraryInputs(root, designDir, project.adapter, adapter.readTheme(root), adapter.inventory(root));
    const issues: string[] = [];
    if (manifest.canon !== VERSION) issues.push(`Canon version changed (built with ${manifest.canon}, current ${VERSION}).`);
    if (JSON.stringify(manifest.generators) !== JSON.stringify(GENERATORS)) issues.push('Library generator contract changed; run canon build.');
    if (manifest.adapter !== current.adapter || JSON.stringify(manifest.inventory) !== JSON.stringify(current.inventory)) issues.push('dist is stale (installed component inventory changed since last build).');
    if (!manifest.inputs || typeof manifest.inputs !== 'object') throw new Error('Invalid library input manifest; run canon build.');
    for (const path of new Set([...Object.keys(manifest.inputs), ...Object.keys(current.inputs)])) {
      if (manifest.inputs[path] !== current.inputs[path]) issues.push(`dist is stale (${path} changed since last build).`);
    }
    for (const output of manifest.outputs) {
      if (!['design', 'project'].includes(output.scope) || typeof output.path !== 'string' || typeof output.hash !== 'string') throw new Error('Invalid library output manifest; run canon build.');
      const base = output.scope === 'design' ? designDir : root;
      const path = sourcePath(base, join(base, output.path), 'file');
      if (!existsSync(path) || hash(readFileSync(path)) !== output.hash) issues.push(`dist is stale (generated output changed or missing: ${output.path}).`);
    }
    if (hasInstalledReferences(root)) {
      for (const write of referenceWrites(system, designDir, root)) {
        if (!existsSync(write.path) || !readFileSync(write.path).equals(write.content)) issues.push(`Installed reference changed or missing: ${relative(root, write.path)}. Run canon sync.`);
      }
    }
    return { ok: !issues.length, issues };
  } catch (error) {
    return { ok: false, issues: [`Cannot verify dist: ${(error as Error).message}`] };
  }
}
