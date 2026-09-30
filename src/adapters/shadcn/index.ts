// shadcn/ui adapter: assembles config/theme/inventory/render into the Adapter contract.
import type { Adapter } from '../types.ts';
import { readConfig } from './config.ts';
import { readTheme, writeTheme } from './theme.ts';
import { inventory, writeVariants } from './inventory.ts';
import { renderSpec } from './render.ts';
import { SEMANTIC_MAP } from './mapping.ts';

export const shadcnAdapter: Adapter = {
  id: 'shadcn',
  detect: (root) => readConfig(root) !== undefined,
  readTheme,
  writeTheme,
  inventory,
  writeVariants,
  async install(root, slugs, exec) {
    const result = await exec('npx', ['shadcn@latest', 'add', '--yes', ...slugs], { cwd: root });
    if (result.status !== 0) throw new Error(`shadcn adapter: install failed (exit ${result.status}): ${result.stderr}`);
  },
  renderSpec,
  describeVar: (name) => SEMANTIC_MAP[name],
};
