import type { Write } from '../design-files.ts';
import type { DeepPartial, System, Tokens } from '../types.ts';

/** CSS custom property theme configuration for a library. */
export interface LibraryTheme { file: string; vars: Record<string, { light: string; dark?: string }>; }

/** Class-based variant specification from a component. */
export interface CvaSpec { base: string[]; variants: Record<string, Record<string, string[]>>; compoundVariants: { match: Record<string, string | boolean>; classes: string[] }[]; defaultVariants: Record<string, string | boolean>; }

/** Inventory entry for a component from a library. */
export interface ComponentInfo { slug: string; file: string; exportName: string; importPath: string; cva?: CvaSpec; cvaSpan?: { start: number; end: number }; readOnlyReason?: string; }

/** Example for rendering a component in the design system. */
export interface RenderExample { title: string; jsx: string; }

/** Executable function interface for running commands. */
export type ExecFn = (cmd: string, args: string[], opts: { cwd: string }) => Promise<{ status: number; stdout: string; stderr: string }>;

/** Adapter for external component libraries. */
export interface Adapter {
  id: string;
  detect(root: string): boolean;
  readTheme(root: string): LibraryTheme;
  writeTheme(root: string, theme: LibraryTheme): Write[];
  inventory(root: string): ComponentInfo[];
  writeVariants(component: ComponentInfo, spec: CvaSpec): Write;
  install(root: string, slugs: string[], exec: ExecFn): Promise<void>;
  /** Run the library's own project init (its first-run scaffolding command) through `exec`, for `canon init --lib` when `detect` finds nothing yet. */
  initProject(root: string, exec: ExecFn): Promise<void>;
  renderSpec(component: ComponentInfo): RenderExample[];
  /** Canon semantic token name a theme var maps to, or undefined when the var isn't mapped. */
  describeVar(name: string): string | undefined;
  /** Map a library theme's own values onto Canon token overrides (for `canon adopt`'s seeds.overrides). */
  themeOverrides(theme: LibraryTheme): DeepPartial<Tokens>;
  /**
   * Map a Canon System's resolved tokens onto the library's own theme file, as `Write`s (not yet
   * applied — pass to `installFiles`). The one place library mode overwrites the theme file: used
   * by `canon init --lib` to seed the library's theme from the chosen preset. `canon adopt` never
   * calls this — it only ever reads the existing theme via `readTheme`/`themeOverrides`. Kept on
   * the adapter contract (rather than a bare `systemToTheme` export) so core files never import
   * `./adapters/shadcn/**`.
   */
  applyTheme(root: string, system: System): Write[];
}
