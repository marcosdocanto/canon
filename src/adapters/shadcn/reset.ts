// Restore the editable design surface from the official registry, without replacing
// component implementations, imports, application code or project-owned font loading.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LibraryResetDefaults, LibraryTheme } from '../types.ts';
import { HttpError, sourcePath } from '../../design-files.ts';
import { inventory } from './inventory.ts';
import { readTheme, writeTheme } from './theme.ts';
import { findCva, parseCva, spliceCva } from './cva.ts';
import { parseParts } from './parts.ts';

export type RegistryReader = (path: string) => Promise<any>;

/** The registry's icon placeholders are transformed by shadcn on installation.
 * In LTR projects it removes cn-rtl-flip, which can change which descendant owns
 * the first editable literal (SidebarTrigger's icon versus its sr-only label). */
function installedSource(source: string, config: any): string {
  const library = config.iconLibrary ?? 'lucide';
  // Match shadcn's default / inverted menu transform before selecting style literals.
  source = source.replace(/\bcn-menu-target\b/g, config.menuColor === 'inverted' ? 'dark' : '').replace(/\bcn-menu-translucent\b/g, '');
  return source.replace(/<IconPlaceholder\b([\s\S]*?)\/>/g, (_element, attributes: string) => {
    if (library !== 'lucide') throw new HttpError(422, `Reset needs matching ${library} icon transforms. Nothing was changed.`);
    const icon = /\blucide="([A-Za-z][A-Za-z0-9]*)"/.exec(attributes)?.[1];
    if (!icon) throw new HttpError(422, 'Unknown registry icon placeholder. Nothing was changed.');
    let attrs = attributes.replace(/\s+(?:lucide|tabler|hugeicons|phosphor|remixicon)="[^"]*"/g, '');
    if (!config.rtl) attrs = attrs.replace(/\s+className="([^"]*)"/g, (_match, value: string) => {
      const classes = value.split(/\s+/).filter(token => token !== 'cn-rtl-flip').join(' ');
      return classes ? ` className="${classes}"` : '';
    });
    return `<${icon}${attrs}/>`;
  });
}

/** Fixed upstream, timeout, size limit and no redirects. No project-provided URLs or code execution. */
export const readResetRegistry: RegistryReader = async (path) => {
  const response = await fetch(`https://ui.shadcn.com/r/${path}`, {
    signal: AbortSignal.timeout(15_000), redirect: 'error',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new HttpError(502, `Could not load shadcn defaults (${response.status}). Nothing was changed.`);
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2 * 1024 * 1024) throw new HttpError(502, 'The shadcn registry response is too large. Nothing was changed.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(502, 'Invalid shadcn registry response. Nothing was changed.'); }
};

export async function resetDefaults(root: string, readRegistry: RegistryReader = readResetRegistry): Promise<LibraryResetDefaults> {
  const { transform } = await import('esbuild');
  const config = JSON.parse(readFileSync(sourcePath(root, join(root, 'components.json'), 'file'), 'utf8'));
  const style = config.style;
  const baseColor = config.tailwind?.baseColor;
  if (!/^[a-z][a-z0-9-]*$/.test(style ?? '') || !/^[a-z][a-z0-9-]*$/.test(baseColor ?? '')) {
    throw new HttpError(422, 'Full reset requires a shadcn style and baseColor in components.json.');
  }
  if (config.tailwind?.cssVariables === false || config.tailwind?.prefix) {
    throw new HttpError(422, 'Full reset requires unprefixed shadcn components with CSS variables. Nothing was changed.');
  }
  if (config.rtl || config.menuColor?.includes('translucent')) {
    throw new HttpError(422, 'Full reset needs matching RTL or translucent-menu transforms for this project. Nothing was changed.');
  }
  const theme = readTheme(root);
  const components = inventory(root);
  const [registryStyle, palette] = await Promise.all([
    readRegistry(`styles/${style}/index.json`), readRegistry(`colors/${baseColor}.json`),
  ]);
  if (!registryStyle || !palette?.cssVars?.light || !palette?.cssVars?.dark) {
    throw new HttpError(422, `No official defaults were found for ${style} / ${baseColor}. Nothing was changed.`);
  }
  // Older Tailwind projects use channel-only hsl() variables; don't replace these with
  // modern oklch() values and leave hsl(var(--primary)) invalid.
  if (/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%/.test(theme.vars.primary?.light ?? '')) {
    throw new HttpError(422, 'This project uses legacy HSL theme variables. Full reset needs matching legacy defaults; no files were changed.');
  }
  const defaults = palette.cssVarsV4 ?? palette.cssVars;
  const vars: LibraryTheme['vars'] = structuredClone(theme.vars);
  const tokens: string[] = [];
  for (const [name, current] of Object.entries(vars)) {
    const light = defaults.light[name];
    if (typeof light !== 'string') continue; // Fonts and custom tokens belong to the project.
    const dark = defaults.dark[name];
    vars[name] = { light, ...(current.dark !== undefined || typeof dark === 'string' ? { dark: dark ?? light } : {}) };
    tokens.push(name);
  }
  const nextTheme = { ...theme, vars };
  const writes = writeTheme(root, nextTheme);
  const restored: string[] = [], preserved: string[] = [];
  const nextComponents = components.slice();
  // Bound parallel downloads even for projects containing the entire library.
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(5, components.length) }, async () => {
    while (cursor < components.length) {
      const index = cursor++;
      const component = components[index];
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(component.slug)) { preserved.push(component.slug); continue; }
      const item = await readRegistry(`styles/${style}/${component.slug}.json`);
      if (!item) { preserved.push(component.slug); continue; }
      const raw = item.files?.find((file: any) => file.path?.endsWith(`/ui/${component.slug}.tsx`))?.content;
      if (typeof raw !== 'string') throw new HttpError(422, `No matching shadcn source for ${component.slug}. Nothing was changed.`);
      const canonical = installedSource(raw, config);
      let source = readFileSync(sourcePath(root, component.file, 'file'), 'utf8');
      const next = { ...component };
      let matched = false;
      if (component.cva) {
        const originalSpan = findCva(source), defaultSpan = findCva(canonical);
        if (!originalSpan || !defaultSpan) throw new HttpError(422, `The ${component.slug} variants no longer match shadcn. Nothing was changed.`);
        const spec = parseCva(canonical, defaultSpan);
        // The trusted registry value is encoded by the literal printer, never interpolated as code.
        source = spliceCva(source, originalSpan, spec);
        next.cva = spec;
        matched = true;
      }
      const canonicalParts = parseParts(canonical, true);
      for (const part of component.parts ?? []) {
        if (!part.span || part.readOnlyReason) continue;
        const original = parseParts(source, true).find(p => p.name === part.name);
        const standard = canonicalParts.find(p => p.name === part.name);
        if (!original?.span || !standard?.span || standard.classes === undefined) {
          throw new HttpError(422, `The ${component.slug}.${part.name} styles no longer match shadcn. Nothing was changed.`);
        }
        if (original.targetTag !== standard.targetTag) throw new HttpError(422, `The ${component.slug}.${part.name} element no longer matches shadcn. Nothing was changed.`);
        // Copy the parsed literal including its own quotes, avoiding quote-delimiter
        // mismatches with a locally reformatted component.
        source = source.slice(0, original.span.start) + canonical.slice(standard.span.start, standard.span.end) + source.slice(original.span.end);
        matched = true;
      }
      if (!matched) { preserved.push(component.slug); continue; }
      // A syntax error must never reach disk, even if the source/parser grammar changes.
      await transform(source, { loader: 'tsx', logLevel: 'silent' });
      next.parts = parseParts(source);
      nextComponents[index] = next;
      writes.push({ path: component.file, content: Buffer.from(source) });
      restored.push(component.slug);
    }
  }));
  return { label: `${style} / ${baseColor}`, theme: nextTheme, components: nextComponents,
    writes: writes.sort((a, b) => a.path.localeCompare(b.path)), restored: restored.sort(), preserved: preserved.sort(), tokens: tokens.sort() };
}
