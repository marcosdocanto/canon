import { readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Pattern, PatternCategory } from '../types.ts';

export const PATTERN_ORDER: PatternCategory[] = ['app-layout', 'app-section', 'app-page', 'marketing-section', 'marketing-page', 'shared-page', 'email'];

let cache: Pattern[] | null = null;
/** Discover source or compiled modules exporting Pattern objects. */
export async function loadPatterns(): Promise<Pattern[]> {
  if (cache) return cache;
  const dir = dirname(fileURLToPath(import.meta.url));
  const extension = extname(fileURLToPath(import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith(extension) && !f.startsWith('_') && f !== `index${extension}`).sort();
  const out: Pattern[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const v of Object.values(mod)) if (v && typeof v === 'object' && 'slug' in (v as object) && 'html' in (v as object)) out.push(v as Pattern);
  }
  out.sort(comparePatterns);
  cache = out;
  return out;
}
export function comparePatterns(a: Pattern, b: Pattern): number {
  const ca = PATTERN_ORDER.indexOf(a.category), cb = PATTERN_ORDER.indexOf(b.category);
  if (ca !== cb) return ca - cb;
  return a.slug.localeCompare(b.slug);
}
