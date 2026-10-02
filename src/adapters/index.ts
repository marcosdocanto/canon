import type { Adapter } from './types.ts';
import { shadcnAdapter } from './shadcn/index.ts';

export type { Adapter, LibraryTheme, CvaSpec, ComponentInfo, RenderExample, ExecFn } from './types.ts';

export const ADAPTERS: Record<string, Adapter> = { shadcn: shadcnAdapter };

export function getAdapter(id: string): Adapter {
  const adapter = ADAPTERS[id];
  if (!adapter) throw new Error(`Unknown adapter: ${id}. Available: ${Object.keys(ADAPTERS).join(', ') || 'none'}`);
  return adapter;
}

export function detectAdapter(root: string): Adapter | undefined {
  return Object.values(ADAPTERS).find((adapter) => adapter.detect(root));
}
