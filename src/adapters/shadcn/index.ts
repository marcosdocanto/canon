// shadcn/ui adapter: assembles config/theme/inventory/render into the Adapter contract.
import type { Adapter } from '../types.ts';
import { readConfig } from './config.ts';
import { readTheme, writeTheme } from './theme.ts';
import { inventory, writeVariants, writePart } from './inventory.ts';
import { renderSpec } from './render.ts';
import { SEMANTIC_MAP, systemToTheme, themeToOverrides } from './mapping.ts';
import { resetDefaults } from './reset.ts';

export const shadcnAdapter: Adapter = {
  id: 'shadcn',
  detect: (root) => readConfig(root) !== undefined,
  readTheme,
  writeTheme,
  inventory,
  resetDefaults,
  writeVariants,
  writePart,
  async install(root, slugs, exec) {
    const result = await exec('npx', ['shadcn@latest', 'add', '--yes', ...slugs], { cwd: root });
    if (result.status !== 0) throw new Error(`shadcn adapter: install failed (exit ${result.status}): ${result.stderr}`);
  },
  async initProject(root, exec) {
    // shadcn ≥4.21: -b selects the component library (radix = classic shadcn); base color prompts are skipped by --yes.
    const result = await exec('npx', ['shadcn@latest', 'init', '--yes', '-b', 'radix', '-p', 'nova'], { cwd: root });
    if (result.status !== 0) throw new Error(`shadcn adapter: init failed (exit ${result.status}): ${result.stderr}`);
  },
  renderSpec,
  describeVar: (name) => SEMANTIC_MAP[name],
  themeOverrides: themeToOverrides,
  applyTheme: (root, system) => writeTheme(root, systemToTheme(system, readTheme(root))),
};
