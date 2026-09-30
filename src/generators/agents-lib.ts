// Library-mode agent rules: same managed-block structure and file set as agents.ts's native
// generate(), but the rules describe the target repo's real component library instead of Canon's
// own generated CSS/React output — import from the repo's real paths, use existing variants,
// extend variants through Canon (never by hand), semantic Tailwind classes only, `canon add
// <slug>` for a missing component, `canon lint`/`canon check` to verify.
import type { System } from '../types.ts';
import type { LibraryTheme, ComponentInfo } from '../adapters/types.ts';
import { OWNERSHIP_RULE } from './designmd-lib.ts';

const code = (s: string) => `\`${s}\``;

/**
 * Semantic Tailwind classes derived from the theme's own CSS variables — never a static list, so
 * a project with different variable names (or extra ones like `chart-1`, `sidebar-*`) gets its own
 * accurate set. `radius` isn't a color and is skipped; a `*-foreground` variable is a text color;
 * `border`/`input` are border colors; `ring` is a ring color; everything else is a fill.
 */
export function semanticClasses(theme: LibraryTheme): string[] {
  const classes: string[] = [];
  for (const name of Object.keys(theme.vars).sort()) {
    if (name === 'radius') continue;
    if (name === 'foreground' || name.endsWith('-foreground')) classes.push(`text-${name}`);
    else if (name === 'border' || name === 'input') classes.push(`border-${name}`);
    else if (name === 'ring') classes.push(`ring-${name}`);
    else classes.push(`bg-${name}`);
  }
  return classes;
}

function rulesBlock(system: System, theme: LibraryTheme, components: ComponentInfo[]): string {
  const classes = semanticClasses(theme);
  const firstImport = components[0]?.importPath;
  return `## ${system.meta.name} — UI implementation contract (library mode)

This project's UI components live in the repository's own code, not in a Canon-authored package. Canon manages only the shared theme (the CSS variables above) and each component's style block (its \`cva()\` variants); everything else in a component file — props, handlers, logic, JSX structure — is application code Canon never touches.

1. **Use the existing components, at their real paths.** Import from the path shown by the component index (for example ${firstImport ? code(firstImport) : 'the path in DESIGN.md'}). Never hand-author a component that duplicates one already tracked here.
2. **Use existing variants only.** Choose from the variant axes and values already defined on each component (see the index and DESIGN.md); don't invent a new variant, size or class combination by hand.
3. **Extend variants through Canon.** To add a variant, a size, or change a default, use Canon (Studio or the ${code('canon')} CLI) so the change is parsed, validated and regenerated consistently — never hand-edit a \`cva()\` call or the theme file's CSS variables.
4. **Semantic Tailwind classes only.** Use the classes generated from this project's theme variables${classes.length ? `: ${classes.map(code).join(', ')}` : ''}. Never use a raw palette class (${code('bg-blue-500')}) or an arbitrary value (${code('bg-[#1a1a1a]')}) for anything the theme already covers.
5. **Missing component.** If a component isn't in the index, run ${code('canon add <slug>')} to install it through the adapter — it delegates to the library's own installer. Don't hand-roll a replacement.
6. **Verify.** Run ${code('canon lint')} and ${code('canon check')} after any change touching these components or the theme file; fix violations introduced by the change.

${OWNERSHIP_RULE}

Art direction: ${system.meta.direction.summary}
Avoid: ${system.meta.direction.never.slice(0, 6).join(' · ')}`;
}

export function agentsLibBlock(system: System, theme: LibraryTheme, components: ComponentInfo[]): string {
  return `<!-- canon:start -->\n${rulesBlock(system, theme, components)}\n<!-- canon:end -->\n`;
}

export function skillMdLib(system: System, theme: LibraryTheme, components: ComponentInfo[]): string {
  return `---
name: design-system
description: ${system.meta.name} design system rules for this project's own component library. Use BEFORE writing or editing any UI (components, pages, CSS, Tailwind, React/HTML markup, styling) in this project, and when asked about colors, spacing, typography, buttons, forms, layouts or "how should this look".
---

# ${system.meta.name} design system (library mode)

${rulesBlock(system, theme, components)}
`;
}

export function cursorMdcLib(system: System, theme: LibraryTheme, components: ComponentInfo[]): string {
  return `---
description: ${system.meta.name} design system — mandatory rules for UI code (library mode)
globs: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.html", "**/*.css", "**/*.scss"]
alwaysApply: true
---
${rulesBlock(system, theme, components)}
`;
}

export function promptMdLib(system: System, theme: LibraryTheme, components: ComponentInfo[]): string {
  return `# System prompt block — ${system.meta.name} design system, library mode (paste into any LLM)

Use this project's own component library through Canon's rules. Start with DESIGN.compact.md and retrieve the component and theme details needed for the current task. Preserve work in progress and adopt these rules within the requested scope.

${rulesBlock(system, theme, components)}

When outputting code, import the real components at their real paths, use only their documented variants and semantic theme classes, and state any fixture data and unverified assumptions.
`;
}

export function generate(system: System, theme: LibraryTheme, components: ComponentInfo[], write: (rel: string, content: string) => void) {
  write('agents/AGENTS.md', agentsLibBlock(system, theme, components));
  write('agents/CLAUDE.md', agentsLibBlock(system, theme, components));
  write('agents/SKILL.md', skillMdLib(system, theme, components));
  write('agents/design-system.mdc', cursorMdcLib(system, theme, components));
  write('agents/PROMPT.md', promptMdLib(system, theme, components));
}
