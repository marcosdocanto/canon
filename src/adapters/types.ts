import type { Write } from '../design-files.ts';

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
  renderSpec(component: ComponentInfo): RenderExample[];
}
