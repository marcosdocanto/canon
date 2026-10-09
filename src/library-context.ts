import { parseCssColor, oklchToHex } from './color.js';
import type { Adapter, LibraryTheme } from './adapters/types.ts';
import type { Known } from './lint.ts';

export function libraryColor(value: string): string | null {
  const parsed = parseCssColor(value);
  if (parsed) return parsed;
  const m = value.match(/^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)\s*\)$/i);
  return m ? oklchToHex({ L: +m[1] / (m[2] ? 100 : 1), C: +m[3], H: +m[4] }) : null;
}

export function libraryTokens(theme: LibraryTheme, adapter: Adapter) {
  const variables: Record<string, { light: string; dark?: string }> = { ...Object.fromEntries(Object.entries(theme.utilityTheme ?? {}).map(([name, light]) => [name.replace(/^--/, ''), { light }])), ...theme.vars };
  return Object.entries(variables).map(([name, value]) => ({
    name, cssVar: `--${name}`, ...value,
    group: /^font-/.test(name) ? 'font' : /^text-/.test(name) ? 'type' : /^radius/.test(name) ? 'radius' : /^spacing/.test(name) ? 'space' : /^shadow/.test(name) ? 'shadow' : libraryColor(value.light) || adapter.describeVar(name) || /^(chart-|sidebar|color-)/.test(name) ? 'color' : 'other',
  }));
}

/** Only declared installed tokens apply in library mode; native classes/props do not. */
export function knownFromLibrary(theme: LibraryTheme, adapter: Adapter, prefix: string): Known {
  const known: Known = { classes: new Set(), props: new Map(), colors: [], dims: [], prefix };
  for (const token of libraryTokens(theme, adapter)) {
    const hex = libraryColor(token.light);
    if (hex) known.colors.push({ name: token.name, hex, ref: token.cssVar });
    const length = token.light.match(/^([\d.]+)(px|rem)$/);
    if (length) known.dims.push({ ref: token.cssVar, px: +length[1] * (length[2] === 'rem' ? 16 : 1), group: token.group });
  }
  return known;
}
