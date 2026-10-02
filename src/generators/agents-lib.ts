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
 * Examples from explicit Tailwind color mappings. A :root variable is not proof of a utility:
 * --font-sans is not bg-font-sans, and --primary may be mapped to --color-action. If the adapter
 * cannot read a mapping (for example a v3 JS config), omit examples rather than invent them.
 */
export function semanticClasses(theme: LibraryTheme): string[] {
  const classes: string[] = [];
  for (const key of Object.keys(theme.utilityTheme ?? {}).sort()) {
    const name = /^color-([a-zA-Z0-9][\w-]*)$/.exec(key)?.[1];
    if (!name || /^(initial|inherit|unset|revert(?:-layer)?)$/i.test(theme.utilityTheme![key].trim())) continue;
    if (name === 'foreground' || name.endsWith('-foreground')) classes.push(`text-${name}`);
    else if (name === 'border' || name === 'input' || name.endsWith('-border')) classes.push(`border-${name}`);
    else if (name === 'ring' || name.endsWith('-ring')) classes.push(`ring-${name}`);
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
4. **Semantic Tailwind classes only.** ${classes.length ? `Use the project's declared Tailwind color mappings, for example: ${classes.map(code).join(', ')}.` : 'Use the semantic utilities configured by this project; inspect its Tailwind configuration and installed components for the actual names.'} A CSS variable alone does not declare a utility. Never use a raw palette class (${code('bg-blue-500')}) or an arbitrary value (${code('bg-[#1a1a1a]')}) for anything the theme already covers.
5. **Missing component.** If a component isn't in the index, run ${code('canon add <slug>')} to install it through the adapter — it delegates to the library's own installer. Don't hand-roll a replacement.
6. **Build the finished thing, not a sketch.** Every screen ships as a demonstration of the real product, never a static mockup: controls do what they say (search filters, forms validate and create, selects change state), records open in their detail surface (drawer/dialog), and derived numbers recompute from the data on screen. Include loading, empty, error and hover/focus states. Use the library's composed blocks at full fidelity — icons on actions and metadata, avatars for people, badges for status, real formatted values (currency, dates) and plausible domain fixtures clearly separated from verified facts. No dead buttons, no lorem ipsum, no bare unstyled fragments.
7. **Compose by surface type.** Work tools (kanban, large tables, inboxes, cockpits) take the full viewport width with padding and an app shell (sidebar or top nav from the library's own blocks); contained centered layouts are for content and forms only. One primary action per region. Check each library block's provider requirements (sidebar/tooltip/toast need their providers at the root) before using it.
8. **Verify.** Run ${code('canon lint')} and ${code('canon check')} after any change touching these components or the theme file; fix violations introduced by the change. Then exercise the screen's interactions in a browser — a screen whose buttons do nothing is not done.

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
