// Library-mode DESIGN.md: documents the target repo's own component library instead of Canon's
// native components. Same "full + compact" split as the native generator (see designmd.ts), but
// the content describes reality read off the repo: the theme file's actual CSS variables, each
// component's real import path and variants from `inventory()`, and which components Canon could
// not parse (read-only, with the reason). No component/pattern catalog — there isn't one in
// library mode, the target library's own code is the catalog.
import type { System, Tokens } from '../types.ts';
import type { LibraryTheme, ComponentInfo } from '../adapters/types.ts';
import { VERSION } from '../version.ts';

/** Looks up the Canon semantic token name a theme var maps to (an `Adapter.describeVar`). */
export type DescribeVar = (name: string) => string | undefined;

/**
 * The core ownership split (also embedded verbatim in the agent rules block): style — the cva()
 * call and the theme file's CSS variables — is Canon's to rewrite; everything else in a component
 * file belongs to the application and Canon never touches it. Keep this sentence byte-identical
 * everywhere it's quoted; other code and tests pin it verbatim.
 */
export const OWNERSHIP_RULE = 'Style blocks (`cva()` calls in the ui directory and the CSS variables in the theme file) are Canon territory — change them through Canon (Studio or `canon` CLI), never by hand. Everything else in a component file is application territory — Canon never touches it.';

const code = (s: string) => `\`${s}\``;
const row = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`;
const table = (head: string[], rows: string[][]) => [row(head), `|${head.map(() => '---').join('|')}|`, ...rows.map(row)].join('\n');

/** var, light, dark, mapped Canon semantic (via the adapter's `describeVar`) and that semantic's description. */
function themeTable(semantic: Tokens['color']['semantic'], theme: LibraryTheme, describeVar: DescribeVar): string {
  const names = Object.keys(theme.vars).sort();
  const rows = names.map((name) => {
    const value = theme.vars[name];
    const canonToken = describeVar(name);
    const description = canonToken ? semantic[canonToken]?.description : undefined;
    return [
      code(`--${name}`),
      code(value.light),
      value.dark !== undefined ? code(value.dark) : '=',
      canonToken ? code(canonToken) : '—',
      description ?? '—',
    ];
  });
  return table(['variable', 'light', 'dark', 'canon semantic', 'description'], rows);
}

// Interpolates axis names/values straight into a markdown table cell; a hostile key (e.g. one
// holding `|` or a newline) could otherwise corrupt this table. Not re-guarded here: the write path
// (src/adapters/shadcn/inventory.ts's `writeVariants` / `validateSpec`) already refuses to persist
// an unsafe axis name or value key before a `CvaSpec` ever reaches this generator.
function variantSummary(c: ComponentInfo): string {
  if (!c.cva) return '—';
  const axes = Object.entries(c.cva.variants).map(([axis, values]) => `${axis}: ${Object.keys(values).join('/')}`);
  return axes.join('; ') || '—';
}

function defaultsSummary(c: ComponentInfo): string {
  if (!c.cva) return '—';
  const defaults = Object.entries(c.cva.defaultVariants).map(([k, v]) => `${k}=${v}`);
  return defaults.join(', ') || '—';
}

// UNLIKE `variantSummary` above, this inlines a part's actual class CONTENT — not just axis/value
// KEYS — and that content is not reliably constrained: `SAFE_CLASS_LIST` (inventory.ts) permits `|`
// (it only excludes whitespace, quotes, backtick, braces and backslash), and a READ-ONLY part keeps
// its `classes` from an unconstrained on-disk literal even though it never passed `writePart`'s
// grammar at all (`withWriteGrammar` drops `span`, not `classes` — see inventory.ts). So a part's
// classes reaching here CAN legitimately contain a `|` or an embedded newline, from either an
// editable or a read-only part. What actually keeps this table well-formed is `row()`'s own
// generic per-cell escaping below (backslash-escaping every `|`, collapsing every `\n` to a space) —
// applied to this whole cell string like any other, not a guarantee specific to this function.
function partsSummary(c: ComponentInfo): string {
  const styled = (c.parts ?? []).filter((part) => part.classes !== undefined);
  if (!styled.length) return '—';
  return styled.map((part) => `${part.name}: ${code(part.classes!)}`).join('; ');
}

/** slug, import path, variant axes and values, defaults, editable parts' classes, read-only reasons. */
function componentTable(components: ComponentInfo[]): string {
  const rows = components.map((c) => [
    code(c.slug),
    code(c.importPath),
    variantSummary(c),
    defaultsSummary(c),
    partsSummary(c),
    c.readOnlyReason ? `read-only: ${c.readOnlyReason}` : '—',
  ]);
  return table(['component', 'import', 'variants', 'defaults', 'parts', 'notes'], rows);
}

export function designMdLib(system: System, theme: LibraryTheme, components: ComponentInfo[], describeVar: DescribeVar): string {
  const out: string[] = [];
  out.push(`# ${system.meta.name} — Design System Specification for AI agents (library mode)`);
  out.push(`> Generated by canon ${VERSION} on ${new Date().toISOString().slice(0, 10)} · ${components.length} component${components.length === 1 ? '' : 's'} read from this project's own component library · theme file ${code(theme.file)}.  \n> This project's components live in its own code, not in a Canon-authored catalog. Canon governs their theme variables and style blocks; everything else stays application code.`);
  out.push(`## 1. Art direction`);
  out.push(system.meta.direction.summary);
  out.push(`### Principles\n${system.meta.direction.principles.map((x) => `- ${x}`).join('\n')}`);
  out.push(`### Never (the slop list)\n${system.meta.direction.never.map((x) => `- ${x}`).join('\n')}`);
  out.push(`## 2. Theme (CSS variables)`);
  out.push(`Every variable below lives in ${code(theme.file)}. A variable mapped to a Canon semantic token is themed by this system; an unmapped variable (chart colors, sidebar colors, …) is left exactly as the library shipped it.`);
  out.push(themeTable(system.tokens.color.semantic, theme, describeVar));
  out.push(`## 3. Ownership`);
  out.push(OWNERSHIP_RULE);
  out.push(`## 4. Components`);
  out.push(`Import each component from the path in the table below — never recreate one Canon already tracks here. The "parts" column lists each editable exported subcomponent's own static className (a "part") alongside its current classes; a subcomponent with no styled part, or whose className is dynamic, is omitted from it. A "read-only" note names why Canon couldn't parse that component's style block; the component still works, but its variants can only be edited by hand until the block is simplified back into the supported grammar (then Canon picks it back up on the next build).`);
  out.push(componentTable(components));
  out.push(`## 5. Verification`);
  out.push(`Run ${code('canon lint')} and ${code('canon check')} after any change touching these components or the theme file.`);
  return out.filter(Boolean).join('\n\n') + '\n';
}

export function compactMdLib(system: System, theme: LibraryTheme, components: ComponentInfo[]): string {
  const out: string[] = [];
  out.push(`# ${system.meta.name} — design rules and index (library mode)`);
  out.push(`This project's components live in its own code. ${OWNERSHIP_RULE}`);
  out.push(`## Direction\n${system.meta.direction.summary}\nNever: ${system.meta.direction.never.slice(0, 6).join(' · ')}`);
  out.push(`## Component index\nRoot import shown per component; a "(read-only)" component's style block isn't Canon-editable right now.\n${components.map((c) => `- ${code(c.slug)} — ${code(c.importPath)}${c.readOnlyReason ? ' (read-only)' : ''}`).join('\n')}`);
  out.push(`## Theme variables\n${Object.keys(theme.vars).sort().map((n) => code(`--${n}`)).join(', ')}`);
  out.push(`## Verify\nRun ${code('canon lint')} and ${code('canon check')} after UI changes. See DESIGN.md for the full theme table and per-component variants/defaults.`);
  return out.join('\n\n') + '\n';
}

export function designmdLib(system: System, theme: LibraryTheme, components: ComponentInfo[], describeVar: DescribeVar): { full: string; compact: string } {
  return { full: designMdLib(system, theme, components, describeVar), compact: compactMdLib(system, theme, components) };
}
