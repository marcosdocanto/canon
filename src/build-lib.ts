// Library-mode build: read the target repo's theme + component inventory through its recorded
// adapter, and write the dist artifacts `install()` expects (see `referenceWrites` in
// `src/install.ts`) plus generated Storybook stories. No CSS/Tailwind/React generation here — in
// library mode the component library owns its own styles; Canon only reads/writes the theme file
// and each component's style block (the adapter contract) and documents them.
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { loadDesignDir } from './system.ts';
import { findProject } from './project.ts';
import { getAdapter } from './adapters/index.ts';
import { installFiles, type Write } from './design-files.ts';
import { designmdLib } from './generators/designmd-lib.ts';
import { generate as generateAgentsLib } from './generators/agents-lib.ts';
import { storyWrites } from './generators/stories.ts';

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

  const { full, compact } = designmdLib(system, theme, components);
  write('DESIGN.md', full);
  write('DESIGN.compact.md', compact);
  generateAgentsLib(system, theme, components, write);
  installFiles(designDir, distWrites);

  const stories = storyWrites(root, adapter, components);
  if (stories.length) installFiles(root, stories);
}
