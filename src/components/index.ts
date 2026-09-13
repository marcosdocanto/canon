import { readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ComponentSpec } from '../types.ts';

export const CATEGORY_ORDER: ComponentSpec['category'][] = ['typography', 'actions', 'forms', 'navigation', 'data-display', 'feedback', 'overlays', 'layout', 'media'];
export const CATEGORY_LABEL: Record<ComponentSpec['category'], string> = {
  typography: 'Typography', actions: 'Actions', forms: 'Forms', navigation: 'Navigation', 'data-display': 'Data display', feedback: 'Feedback', overlays: 'Overlays', layout: 'Layout', media: 'Media',
};

/** Preferred documentation order inside each category; unknown slugs go after, alphabetically. */
export const DOC_ORDER = [
  'kicker', 'prose', 'link', 'code', 'kbd',
  'button', 'icon-button', 'button-group', 'segmented-control',
  'field', 'input', 'textarea', 'select', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'file-dropzone',
  'topbar', 'tabs', 'sidebar-nav', 'breadcrumb', 'pagination', 'menu', 'command-palette', 'stepper',
  'badge', 'tag', 'counter', 'avatar', 'avatar-group', 'agent-presence', 'stat', 'table', 'list', 'description-list', 'accordion', 'timeline', 'kanban', 'chart-frame',
  'alert', 'banner', 'toast', 'progress', 'spinner', 'skeleton', 'empty-state',
  'tooltip', 'popover', 'dialog', 'drawer',
  'card', 'divider',
  'media-frame',
];

let cache: ComponentSpec[] | null = null;

/** Discover source or compiled modules exporting a ComponentSpec. */
export async function loadCatalog(): Promise<ComponentSpec[]> {
  if (cache) return cache;
  const dir = dirname(fileURLToPath(import.meta.url));
  const extension = extname(fileURLToPath(import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith(extension) && !f.startsWith('_') && f !== `index${extension}`).sort();
  const specs: ComponentSpec[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const v of Object.values(mod)) {
      if (v && typeof v === 'object' && 'slug' in (v as object) && 'anatomy' in (v as object)) specs.push(v as ComponentSpec);
    }
  }
  specs.sort(compareSpecs);
  cache = specs;
  return specs;
}

export function compareSpecs(a: ComponentSpec, b: ComponentSpec): number {
  const ca = CATEGORY_ORDER.indexOf(a.category), cb = CATEGORY_ORDER.indexOf(b.category);
  if (ca !== cb) return ca - cb;
  const oa = DOC_ORDER.indexOf(a.slug), ob = DOC_ORDER.indexOf(b.slug);
  if (oa !== -1 && ob !== -1) return oa - ob;
  if (oa !== -1) return -1;
  if (ob !== -1) return 1;
  return a.slug.localeCompare(b.slug);
}
