// Canon <-> shadcn/ui token mapping: shared CSS custom property name <-> Canon
// semantic token name (`color.<name>` in tokens.json).
import type { System, Tokens, DeepPartial } from '../../types.ts';
import { indexTokens } from '../../tokens/resolve.ts';
import type { LibraryTheme } from '../types.ts';

/** shadcn CSS var (without `--`) -> Canon semantic color token name. */
export const SEMANTIC_MAP: Record<string, string> = {
  background: 'bg-canvas',
  foreground: 'fg-default',
  card: 'bg-surface',
  'card-foreground': 'fg-default',
  popover: 'bg-surface-raised',
  'popover-foreground': 'fg-default',
  primary: 'bg-action',
  'primary-foreground': 'fg-on-action',
  secondary: 'bg-subtle',
  'secondary-foreground': 'fg-default',
  muted: 'bg-subtle',
  'muted-foreground': 'fg-muted',
  accent: 'bg-subtle',
  'accent-foreground': 'fg-default',
  destructive: 'bg-danger',
  'destructive-foreground': 'fg-on-action',
  border: 'border-default',
  input: 'border-control',
  ring: 'ring-focus',
};

/**
 * Map a Canon System's resolved semantic tokens onto a shadcn theme's CSS vars.
 * Every `SEMANTIC_MAP` var is set (added if absent from `current`); `radius` is set from
 * `radius.md`; every other var (e.g. `chart-1`, `sidebar-*`) is left untouched.
 */
export function systemToTheme(system: System, current: LibraryTheme): LibraryTheme {
  const idx = indexTokens(system.tokens, system.meta.prefix);
  const next: LibraryTheme = structuredClone(current);
  for (const [cssVar, canonToken] of Object.entries(SEMANTIC_MAP)) {
    const resolved = idx.get(`color.${canonToken}`);
    if (!resolved) throw new Error(`shadcn adapter: unknown canon semantic token "${canonToken}" (mapped from --${cssVar})`);
    next.vars[cssVar] = { light: resolved.light, dark: resolved.dark };
  }
  const radius = system.tokens.radius.md;
  next.vars.radius = next.vars.radius?.dark !== undefined ? { light: radius, dark: radius } : { light: radius };
  return next;
}

/** Reverse mapping for adopt: shadcn theme CSS vars present in `SEMANTIC_MAP` become `color.semantic` overrides. */
export function themeToOverrides(theme: LibraryTheme): DeepPartial<Tokens> {
  const semantic: Record<string, { light: string; dark: string }> = {};
  for (const [cssVar, canonToken] of Object.entries(SEMANTIC_MAP)) {
    const value = theme.vars[cssVar];
    if (!value) continue;
    semantic[canonToken] = { light: value.light, dark: value.dark ?? value.light };
  }
  return { color: { semantic } };
}
