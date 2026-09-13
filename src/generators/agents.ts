import type { System, ResolvedToken } from '../types.ts';

type Idx = Map<string, ResolvedToken>;

const rulesBlock = (system: System) => {
  const p = system.meta.prefix;
  const dist = `design/${system.meta.out || 'dist'}`;
  return `## ${system.meta.name} — UI implementation contract

Use Canon as this project's design system for UI tasks within the user's requested scope. Follow the repository's conventions from quick prototypes through polished production work.

**When connecting Canon:** inspect and reuse the existing setup, preserve the project's stack, routes, behavior, data and design definitions, and run \`canon connect <Studio-URL-or-full-snapshot-JSON-path> --root <project-root> [--design <existing-custom-path>] [--no-hooks]\`. A bound project reuses its recorded source without fetching or resetting it; for a legacy installation, discover and pass its existing \`--design\` path. Never replace a failed snapshot import with \`canon init\` or a preset. Connect the generated CSS through the framework's real style entry point even for a connection-only request, without redesigning screens. An empty folder is not permission to scaffold an app. Then start or reuse \`canon studio --root <project-root> --port 0 --open\` as a background process, verify its URL and return it.

1. **Own implementation and setup.** Inspect repository instructions, framework, routes, shared UI, data flow and available checks. The user sets product intent; make routine technical decisions from repository conventions. Install needed dependencies with its package manager, configure integration and wire CSS/wrappers into the app. Let the goal determine depth: a prototype needs a small working flow with separate, clearly identified fixtures; production work needs useful domain/data/presentation boundaries plus requested validation, persistence and failure handling. Add architecture or services only when needed.
2. **Retrieve a small working set.** At the beginning of UI work, read the current \`DESIGN.compact.md\` and installed Canon instruction block. With Canon MCP, call \`design_rules\` once, then only relevant \`get_component\`, \`get_pattern\`, \`get_token\` or grouped \`list_tokens\`; use \`search\` or \`suggest_token\` when needed. Without MCP, read matching source JSON or selected sections of \`DESIGN.md\`. MCP supplies context and lint; execute setup, commands and preview processes through terminal tools.
3. **Reuse the contract.** Reuse stable application components and compose the documented components and patterns. Preserve semantic elements, anatomy, \`.${p}-<component>\` / \`.${p}-<component>__<part>\` classes and allowed \`data-*\` props; adapt content, framework bindings, routes and events to the product. Use semantic tokens (\`var(--${p}-…)\` or generated Tailwind utilities) for colors, typography, spacing, radii and shadows. Use composite text styles and token-based layout CSS.
4. **Compose with intent.** Choose hierarchy, density, grouping and responsive layout from the user's task, supplied content and visual references. Keep at most one primary action per region. Use meaningful copy; distinguish fixtures from verified product facts. Never invent testimonials or metrics as evidence. Avoid generic card grids and decoration that do not help the content.
5. **Make the flow work.** Generated React wrappers provide styled markup and typed attributes, not application behavior. Implement the requested interactions and relevant loading, error, empty, success and disabled states. Use semantic HTML, labels, accessible names, visible focus, keyboard operation and focus management; respect reduced motion. Check responsive layouts and supported themes with realistic content.
6. **Keep the app light.** Preserve the framework's rendering model; keep client code local to interactions. Avoid gratuitous dependencies, importing an entire icon set, repeated CSS imports and oversized unoptimized media. Use individual icons and appropriately sized media; defer noncritical work when useful. Measure significant pages with the project's bundle, load and interaction tooling before claiming a performance improvement.
7. **Change the right source.** Product routes, domain logic, data access and screen composition belong in application files. Shared tokens and reusable visual behavior belong in the configured Canon source: extend an existing spec or add \`design/components/<slug>.json\` (and a pattern when useful) instead of scattering overrides. \`canon add <slug>\` only restores an existing catalogue component. Studio Save atomically updates design files, generated CSS and installed references; MCP refreshes on its next data request after the build. Save does not edit application HTML, routes or behavior or deploy the app. After source edits made outside Studio, run \`canon sync\` to build outputs and refresh installed instructions. \`canon build\` only regenerates outputs. Never patch generated files.
8. **Verify and deliver.** Run \`canon lint <changed files>\` and \`canon check\`; fix violations introduced by the change. Run applicable repository type checks/tests and inspect changed screens in a browser at narrow and wide widths, exercising keyboard and relevant states. Canon lint checks token/class/prop usage; check also verifies generated output freshness. Neither proves visual quality, accessibility or performance. For runnable UI work, start or reuse the application's dev server, verify the affected route and leave the preview running. Use the project's dev command for the app; \`canon studio\` opens the design-system editor. Return the preview URL, checks actually run and remaining limitations.

Art direction: ${system.meta.direction.summary}
Avoid: ${system.meta.direction.never.slice(0, 6).join(' · ')}

CSS: a prototype can import \`${dist}/${p}.css\` once. For a smaller product bundle, explicitly select \`${dist}/tokens.css\` + \`${dist}/base.css\` + used \`${dist}/css/components/<slug>.css\` and \`${dist}/css/patterns/<slug>.css\`, including every component/pattern dependency referenced by that UI. Use one strategy to avoid duplicate CSS; selection is explicit.
Files: Tailwind \`${dist}/tailwind.theme.css\` · React \`${dist}/react/\` · Studio \`${dist}/preview.html\` (\`canon studio\`). The app consumes these local generated files through its normal reload/build and does not depend on the originating Studio after import. Paths assume \`design/\`; use the project's recorded binding or configured \`--design\` and \`--root\` when different.`;
};

export function agentsMd(system: System): string {
  return `<!-- canon:start -->\n${rulesBlock(system)}\n<!-- canon:end -->\n`;
}

export function skillMd(system: System): string {
  return `---
name: design-system
description: ${system.meta.name} design system rules, tokens, components and patterns. Use BEFORE writing or editing any UI (components, pages, CSS, Tailwind, React/HTML markup, styling) in this project, and when asked about colors, spacing, typography, buttons, forms, layouts or "how should this look".
---

# ${system.meta.name} design system

${rulesBlock(system)}
`;
}

export function cursorMdc(system: System): string {
  return `---
description: ${system.meta.name} design system — mandatory rules for UI code
globs: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.html", "**/*.css", "**/*.scss"]
alwaysApply: true
---
${rulesBlock(system)}
`;
}

export function promptMd(system: System): string {
  return `# System prompt block — ${system.meta.name} design system (paste into any LLM)

Use the ${system.meta.name} design system in this project. Start with DESIGN.compact.md and retrieve the component and pattern specifications needed for the current task. Preserve work in progress and adopt the system within the requested scope.

${rulesBlock(system)}

When outputting code, include the markup and behavior needed for the requested flow, using the project's framework and the documented component contract. State any fixture data and unverified assumptions.
`;
}

export function mcpJson(): string {
  return JSON.stringify({ mcpServers: { canon: { command: 'canon', args: ['mcp', '--design', 'design'] } } }, null, 2) + '\n';
}

export function generate(system: System, _idx: Idx, write: (rel: string, content: string) => void) {
  write('agents/AGENTS.md', agentsMd(system));
  write('agents/CLAUDE.md', agentsMd(system));
  write('agents/SKILL.md', skillMd(system));
  write('agents/design-system.mdc', cursorMdc(system));
  write('agents/PROMPT.md', promptMd(system));
  write('agents/mcp.json', mcpJson());
}
