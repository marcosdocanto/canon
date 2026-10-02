// Library MCP reads the app's source on each request. A native build manifest is not
// the revision of a shadcn project: its theme and installed files are authoritative.
import { readFileSync, realpathSync } from 'node:fs';
import { findProject } from './project.ts';
import { getAdapter } from './adapters/index.ts';
import { sourcePath } from './design-files.ts';
import { loadDesignDir } from './system.ts';
import { agentsLibBlock } from './generators/agents-lib.ts';
import { designmdLib } from './generators/designmd-lib.ts';
import { lintSource, type Known } from './lint.ts';
import { distance, parseCssColor, oklchToHex } from './color.js';

type Json = Record<string, unknown>;
const text = (value: string) => ({ content: [{ type: 'text', text: value }] });
const json = (value: unknown) => text(JSON.stringify(value, null, 2));

function color(value: string): string | null {
  const parsed = parseCssColor(value);
  if (parsed) return parsed;
  const m = value.match(/^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)\s*\)$/i);
  return m ? oklchToHex({ L: +m[1] / (m[2] ? 100 : 1), C: +m[3], H: +m[4] }) : null;
}

export function libraryMcp(designDir: string, root: string) {
  const canonical = realpathSync(designDir);
  const project = [findProject(root), findProject(designDir)].find(p => p && realpathSync(p.design) === canonical);
  if (!project?.adapter) return undefined;
  const adapter = getAdapter(project.adapter);
  const read = () => {
    const system = loadDesignDir(canonical);
    const theme = adapter.readTheme(project.root);
    const components = adapter.inventory(project.root);
    const variables: Record<string, { light: string; dark?: string }> = { ...Object.fromEntries(Object.entries(theme.utilityTheme ?? {}).map(([name, light]) => [name.replace(/^--/, ''), { light }])), ...theme.vars };
    const tokens = Object.entries(variables).map(([name, value]) => ({
      name, cssVar: `--${name}`, ...value,
      group: /^font-/.test(name) ? 'font' : /^text-/.test(name) ? 'type' : /^radius/.test(name) ? 'radius' : /^spacing/.test(name) ? 'space' : /^shadow/.test(name) ? 'shadow' : color(value.light) || adapter.describeVar(name) || /^(chart-|sidebar|color-)/.test(name) ? 'color' : 'other',
    }));
    const themeCss = () => readFileSync(sourcePath(project.root, theme.file, 'file'), 'utf8');
    return { system, theme, components, tokens, themeCss };
  };
  return {
    instructions: `Canon ${adapter.id} library for ${project.root}. Call design_rules, list_components, then get_component for the actual imports, styles and source. Reuse the installed code. No native component or pattern catalog applies.`,
    async call(name: string, args: Json) {
      const { system, theme, components, tokens, themeCss } = read();
      const component = components.find(c => c.slug === args.slug);
      switch (name) {
        case 'design_rules': return text(agentsLibBlock(system, theme, components));
        case 'list_components': return json({ project: project.root, adapter: adapter.id, ...(args.category ? { note: 'Library categories are not inferred; all installed components are listed.' } : {}), components: components.map(c => ({ slug: c.slug, exportName: c.exportName, importPath: c.importPath, variants: c.cva?.variants, readOnlyReason: c.readOnlyReason })) });
        case 'get_component':
          if (!component) return text(`Unknown installed component "${args.slug}". Call list_components for this project's inventory.`);
          return text(`${JSON.stringify(component, null, 2)}\n\nInstalled source (props, exports and composition):\n\`\`\`tsx\n${readFileSync(sourcePath(project.root, component.file, 'file'), 'utf8')}\n\`\`\``);
        case 'get_css':
          if (args.slug === 'tokens' || args.slug === 'all') return text(`/* Project theme: ${theme.file}. Component utilities are compiled by the application's Tailwind build. */\n${themeCss()}`);
          return component ? json({ file: component.file, note: 'Shared class definitions from installed source; no standalone generated component CSS.', cva: component.cva, parts: component.parts, readOnlyReason: component.readOnlyReason }) : text(`Unknown installed component "${args.slug}".`);
        case 'list_tokens': return json(tokens.filter(t => !args.group || t.group === args.group));
        case 'get_token': {
          const tokenName = String(args.name).replace(/^var\((--[^)]+)\)$/, '$1').replace(/^--/, '');
          return json(tokens.find(t => t.name === tokenName) ?? { error: `Unknown declared token ${args.name}` });
        }
        case 'suggest_token': {
          const value = String(args.value).trim();
          const exact = tokens.filter(t => t.light === value || t.dark === value);
          if (exact.length) return json(exact.map(t => ({ ...t, use: `var(${t.cssVar})`, match: 'exact' })));
          const hex = color(value);
          return hex ? json(tokens.flatMap(t => { const candidate = color(t.light); return candidate ? [{ ...t, use: `var(${t.cssVar})`, distance: distance(hex, candidate) }] : []; }).sort((a, b) => a.distance - b.distance).slice(0, 5)) : text('No matching declared token. Use list_tokens to inspect this project; inherited Tailwind scales are not invented here.');
        }
        case 'search': {
          const query = String(args.query).toLowerCase();
          return json({ components: components.filter(c => JSON.stringify(c).toLowerCase().includes(query)), tokens: tokens.filter(t => JSON.stringify(t).toLowerCase().includes(query)) });
        }
        case 'list_patterns': case 'get_pattern': return text('Application patterns are not inventoried by this library adapter. Compose the installed components; no Canon-native patterns apply.');
        case 'lint_code': {
          const known: Known = { classes: new Set(), props: new Map(), colors: [], dims: [], prefix: system.meta.prefix };
          for (const token of tokens) {
            const hex = color(token.light);
            if (hex) known.colors.push({ name: token.name, hex, ref: token.cssVar });
            const length = token.light.match(/^([\d.]+)(px|rem)$/);
            if (length) known.dims.push({ ref: token.cssVar, px: +length[1] * (length[2] === 'rem' ? 16 : 1), group: token.group });
          }
          const violations = lintSource(known, String(args.filename ?? 'snippet.tsx'), String(args.code), { tailwind: system.meta.lint.tailwind, native: false });
          return json({ scope: 'Static raw-style and Tailwind checks against declared project tokens; does not validate React props or runtime behavior.', violations });
        }
        case 'reload': return text(`Reloaded ${system.meta.name}: ${components.length} installed components, ${tokens.length} declared tokens. Source is refreshed on every request.`);
        default: throw Object.assign(new Error(`Unknown tool ${name}`), { code: -32602 });
      }
    },
    readResource(uri: string) {
      const { system, theme, components, themeCss } = read();
      const docs = designmdLib(system, theme, components, adapter.describeVar);
      const value = uri === 'canon://DESIGN.md' ? docs.full : uri === 'canon://DESIGN.compact.md' ? docs.compact : uri === 'canon://tokens.css' ? themeCss() : undefined;
      if (value === undefined) throw new Error(`Unknown resource ${uri}`);
      return { contents: [{ uri, mimeType: uri.endsWith('.css') ? 'text/css' : 'text/markdown', text: value }] };
    },
  };
}
