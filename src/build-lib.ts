// Library-mode build: read the target repo's theme + component inventory through its recorded
// adapter, and write the dist artifacts `install()` expects (see `referenceWrites` in
// `src/install.ts`) plus generated Storybook stories. No CSS/Tailwind/React generation here — in
// library mode the component library owns its own styles; Canon only reads/writes the theme file
// and each component's style block (the adapter contract) and documents them.
import { realpathSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadDesignDir } from './system.ts';
import { findProject } from './project.ts';
import { getAdapter } from './adapters/index.ts';
import { installFiles, type Write } from './design-files.ts';
import { designmdLib } from './generators/designmd-lib.ts';
import { generate as generateAgentsLib } from './generators/agents-lib.ts';
import { storyWrites } from './generators/stories.ts';

/** Every file `buildLib` writes into the design dist (relative to it) — see the two `write()` calls below. */
const LIB_DIST_FILES = ['DESIGN.md', 'DESIGN.compact.md', 'agents/AGENTS.md', 'agents/CLAUDE.md', 'agents/SKILL.md', 'agents/design-system.mdc', 'agents/PROMPT.md'];

/**
 * Build the library-mode dist: `design/<out>/DESIGN.md`, `DESIGN.compact.md` and
 * `agents/{AGENTS,CLAUDE,SKILL,PROMPT}.md` + `agents/design-system.mdc`, plus one Storybook story
 * file per inventoried component under `<root>/stories/canon/`. `root` is the target repo (holding
 * the recorded adapter and the library's own code); `designDir` is where the design source
 * (`system.json`, …) lives — only `meta` is read from it. Two `installFiles` batches, dist then
 * stories, each all-or-nothing.
 */
export async function buildLib(root: string, designDir: string): Promise<void> {
  root = realpathSync(root); // never trust the caller's path to already be canonical (see inventory.ts, install.ts)
  designDir = realpathSync(designDir);
  const system = loadDesignDir(designDir);
  const project = findProject(root);
  if (!project?.adapter) throw new Error(`No adapter configured for ${root}. Run \`canon adopt\` or \`canon init --lib <id>\` first.`);
  const adapter = getAdapter(project.adapter);
  const theme = adapter.readTheme(root);
  const components = adapter.inventory(root);

  const dist = join(designDir, system.meta.out || 'dist');
  const distWrites: Write[] = [];
  const write = (rel: string, content: string) => distWrites.push({ root: designDir, path: join(dist, rel), content: Buffer.from(content) });

  const { full, compact } = designmdLib(system, theme, components, (name) => adapter.describeVar(name));
  write('DESIGN.md', full);
  write('DESIGN.compact.md', compact);
  generateAgentsLib(system, theme, components, write);
  installFiles(designDir, distWrites);

  const stories = storyWrites(root, adapter, components);
  if (stories.length) installFiles(root, stories);
}

/**
 * Library-mode staleness check for `canon check`. `buildLib` never writes a `canon.lock.json` (there
 * is no generated CSS/React output to content-hash — the library owns its own styles), so
 * `checkBuild` (build-manifest.ts) can't apply here. Staleness instead means: the target repo's
 * theme file, or one of its inventoried component files, changed more recently than the dist files
 * `buildLib` last wrote. A pragmatic mtime comparison, not a content hash — exactly enough for
 * `canon check` to tell an agent "run `canon build` again."
 */
export function checkLib(root: string, designDir: string): { ok: boolean; issues: string[] } {
  root = realpathSync(root);
  designDir = realpathSync(designDir);
  const system = loadDesignDir(designDir);
  const project = findProject(root);
  if (!project?.adapter) throw new Error(`No adapter configured for ${root}. Run \`canon adopt\` or \`canon init --lib <id>\` first.`);
  const adapter = getAdapter(project.adapter);
  const dist = join(designDir, system.meta.out || 'dist');

  const missing: string[] = [];
  let oldestOutput = Infinity;
  for (const rel of LIB_DIST_FILES) {
    const path = join(dist, rel);
    if (!existsSync(path)) { missing.push(rel); continue; }
    oldestOutput = Math.min(oldestOutput, statSync(path).mtimeMs);
  }
  if (missing.length) return { ok: false, issues: [`dist not built (missing: ${missing.join(', ')}).`] };

  let theme: ReturnType<typeof adapter.readTheme>;
  let components: ReturnType<typeof adapter.inventory>;
  try {
    theme = adapter.readTheme(root);
    components = adapter.inventory(root);
  } catch (error) {
    return { ok: false, issues: [`Cannot verify dist: ${(error as Error).message}`] };
  }

  let newestInput = -Infinity;
  let newestInputPath = '';
  for (const path of [theme.file, ...components.map((c) => c.file)]) {
    if (!existsSync(path)) continue;
    const mtime = statSync(path).mtimeMs;
    if (mtime > newestInput) { newestInput = mtime; newestInputPath = path; }
  }
  if (newestInput > oldestOutput) {
    return { ok: false, issues: [`dist is stale (${relative(root, newestInputPath)} changed since last build).`] };
  }
  return { ok: true, issues: [] };
}
