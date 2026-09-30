import type { Write } from '../design-files.ts';
import type { DeepPartial, System, Tokens } from '../types.ts';

/** CSS custom property theme configuration for a library. */
export interface LibraryTheme { file: string; vars: Record<string, { light: string; dark?: string }>; }

/** Class-based variant specification from a component. */
export interface CvaSpec { base: string[]; variants: Record<string, Record<string, string[]>>; compoundVariants: { match: Record<string, string | boolean>; classes: string[] }[]; defaultVariants: Record<string, string | boolean>; }

/** One exported subcomponent's editable className literal, or the reason it can't be edited (see shadcn/parts.ts). */
export interface PartInfo { name: string; classes?: string; span?: { start: number; end: number } /* byte offsets of the literal, INCLUDING its quotes */; dynamicTail?: string; readOnlyReason?: string; note?: string /* non-blocking context, e.g. multiple conditional render branches each yield a literal and only the first is being edited */; }

/** Inventory entry for a component from a library. */
export interface ComponentInfo { slug: string; file: string; exportName: string; importPath: string; cva?: CvaSpec; cvaSpan?: { start: number; end: number }; readOnlyReason?: string; parts?: PartInfo[]; }

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
  /**
   * `source`, when given, is a staged in-memory buffer to parse/splice INSTEAD OF re-reading
   * `component.file` from disk — the same file's `cva()` span is re-located inside it fresh, never
   * assumed to still sit at `component.cvaSpan`. This is how a save composes a cva edit with one or
   * more part edits to the SAME file into one final buffer: the caller (serve-lib.ts's save
   * endpoint) feeds each successive adapter call the PRIOR call's returned `Write.content`, so
   * offsets are always re-derived from the actual bytes about to be spliced, never from a stale
   * pre-save span. Omitted (the common case — no other edit to this file in this save), it reads
   * the file fresh, exactly as before.
   */
  writeVariants(component: ComponentInfo, spec: CvaSpec, source?: string): Write;
  /**
   * Splice an edited class string into one of `component`'s "parts" (an exported subcomponent's
   * own static `className` literal — see `ComponentInfo.parts` / `PartInfo`), returning the file
   * `Write` — not yet applied; pass to `installFiles`. Re-reads and re-parses the component's file
   * fresh (or re-parses `source`, when given — see `writeVariants`'s docstring on why) rather than
   * trusting a possibly-stale `parts` array, and throws, naming `component.slug` and `partName`,
   * when the part doesn't exist or is read-only (`PartInfo.readOnlyReason`), or when `classes`
   * fails the adapter's safe class-token grammar (no quotes, backtick, braces or backslash) — in
   * every failure case, nothing is written to disk.
   */
  writePart(component: ComponentInfo, partName: string, classes: string, source?: string): Write;
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
