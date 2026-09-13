// Minimal MCP server over stdio (JSON-RPC 2.0, newline-delimited). Zero deps.
import { createInterface } from 'node:readline';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { System, ResolvedToken } from './types.ts';
import { loadDesignDir } from './system.ts';
import { indexTokens } from './tokens/resolve.ts';
import { componentCss } from './generators/css.ts';
import { lintSource, knownFromSystem } from './lint.ts';
import { parseCssColor, distance } from './color.js';
import { VERSION } from './version.ts';
import { CATEGORY_LABEL } from './components/index.ts';
import { sourceHash, type BuildManifest } from './build-manifest.ts';

type Json = Record<string, unknown>;
type BuildRevision = { path: string; content: string | null };

const sameRevision = (a: BuildRevision, b: BuildRevision) => a.path === b.path && a.content === b.content;

function readRevision(designDir: string, out: string): BuildRevision {
  const path = join(designDir, out || 'dist', 'canon.lock.json');
  try {
    return { path, content: readFileSync(path, 'utf8') };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { path, content: null };
    throw error;
  }
}

function currentRevision(designDir: string): BuildRevision {
  const meta = JSON.parse(readFileSync(join(designDir, 'system.json'), 'utf8')) as { out?: unknown };
  return readRevision(designDir, typeof meta.out === 'string' ? meta.out : 'dist');
}

export async function startMcp(designDir: string) {
  let system: System = loadDesignDir(designDir);
  let idx = indexTokens(system.tokens, system.meta.prefix);
  let known = knownFromSystem(system, idx);
  let revision = readRevision(designDir, system.meta.out || 'dist');
  const reload = () => {
    const nextSystem = loadDesignDir(designDir);
    const nextIdx = indexTokens(nextSystem.tokens, nextSystem.meta.prefix);
    const nextKnown = knownFromSystem(nextSystem, nextIdx);
    const nextRevision = readRevision(designDir, nextSystem.meta.out || 'dist');
    system = nextSystem;
    idx = nextIdx;
    known = nextKnown;
    revision = nextRevision;
  };
  const refreshIfBuilt = () => {
    let observed: BuildRevision;
    try {
      observed = currentRevision(designDir);
    } catch (error) {
      throw new Error(`Cannot refresh Canon MCP: ${(error as Error).message}`);
    }
    if (sameRevision(observed, revision)) return;
    if (observed.content === null) throw new Error(`Cannot refresh Canon MCP: build manifest is missing at ${observed.path}.`);

    try {
      const manifest = JSON.parse(observed.content) as Partial<BuildManifest>;
      if (manifest.manifestVersion !== 1 || typeof manifest.sourceHash !== 'string') {
        throw new Error('build manifest is incomplete or uses an older format');
      }
      const nextSystem = loadDesignDir(designDir);
      if (readRevision(designDir, nextSystem.meta.out || 'dist').path !== observed.path) {
        throw new Error('design output path changed while refreshing');
      }
      if (sourceHash(nextSystem) !== manifest.sourceHash) {
        throw new Error('design source does not match the latest build manifest');
      }
      const nextIdx = indexTokens(nextSystem.tokens, nextSystem.meta.prefix);
      const nextKnown = knownFromSystem(nextSystem, nextIdx);
      const confirmed = currentRevision(designDir);
      if (!sameRevision(confirmed, observed)) throw new Error('build manifest changed while refreshing');

      system = nextSystem;
      idx = nextIdx;
      known = nextKnown;
      revision = confirmed;
    } catch (error) {
      throw new Error(`Cannot refresh Canon MCP: ${(error as Error).message}`);
    }
  };
  const distDir = () => join(designDir, system.meta.out || 'dist');
  const p = () => system.meta.prefix;

  const tools = [
    { name: 'design_rules', description: 'The mandatory rules, art direction and workflow for producing UI in this project. Call this first.', inputSchema: { type: 'object', properties: {} } },
    { name: 'list_components', description: 'List every component with class, category, props and when to use it.', inputSchema: { type: 'object', properties: { category: { type: 'string', description: 'Optional category filter: actions, forms, navigation, data-display, feedback, overlays, layout, typography, media' } } } },
    { name: 'get_component', description: 'Full specification of one component: anatomy, props, states, exact markup examples, every CSS value, rules and accessibility. Use the slug (e.g. "button", "dialog").', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] } },
    { name: 'get_css', description: 'The generated CSS for one component (or "tokens" / "all").', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] } },
    { name: 'list_tokens', description: 'List tokens by group (color, font, type, space, radius, shadow, size, z, motion, breakpoint, opacity) with CSS variables and light/dark values.', inputSchema: { type: 'object', properties: { group: { type: 'string' } } } },
    { name: 'get_token', description: 'Details for one token by reference ("color.bg-action", "space.4", "type.body-md.size") or CSS variable name.', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
    { name: 'suggest_token', description: 'Given a raw value (hex/rgb color, px size, shadow) and optionally the CSS property, return the tokens to use instead.', inputSchema: { type: 'object', properties: { value: { type: 'string' }, property: { type: 'string' } }, required: ['value'] } },
    { name: 'search', description: 'Free-text search across components, patterns and tokens (names, descriptions, rules).', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'list_patterns', description: 'List layout/section/page patterns with their category and description.', inputSchema: { type: 'object', properties: { category: { type: 'string' } } } },
    { name: 'get_pattern', description: 'Full HTML (primary + variants), rules and CSS for one pattern by slug.', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] } },
    { name: 'lint_code', description: 'Lint a code snippet (CSS/TSX/HTML…) against the system: raw values, unknown classes, invalid prop values. Returns violations with suggested tokens.', inputSchema: { type: 'object', properties: { code: { type: 'string' }, filename: { type: 'string', description: 'e.g. Card.tsx or styles.css (drives the parser)' } }, required: ['code'] } },
    { name: 'reload', description: 'Reload the design system from disk after `canon build`.', inputSchema: { type: 'object', properties: {} } },
  ];

  const text = (t: string) => ({ content: [{ type: 'text', text: t }] });
  const tokenLine = (t: ResolvedToken) => `${t.ref}  ${t.cssVar} = ${t.light}${t.themed ? `  (dark ${t.dark})` : ''}${t.description ? `  — ${t.description}` : ''}`;

  const call = async (name: string, args: Json): Promise<Json> => {
    if (name !== 'reload') refreshIfBuilt();
    switch (name) {
      case 'design_rules': {
        const { agentsMd } = await import('./generators/agents.ts');
        return text(agentsMd(system) + `\nPrinciples:\n${system.meta.direction.principles.map((x) => `- ${x}`).join('\n')}\n\nNever:\n${system.meta.direction.never.map((x) => `- ${x}`).join('\n')}`);
      }
      case 'list_components': {
        const cat = args.category as string | undefined;
        const list = system.components.filter((c) => !cat || c.category === cat);
        return text(list.map((c) => `- ${c.name} (.${p()}-${c.slug}) [${CATEGORY_LABEL[c.category]}] props: ${Object.entries(c.props).map(([k, v]) => `${k}=${v.values.join('|')}`).join(' ') || '—'}\n  ${c.usage}`).join('\n'));
      }
      case 'get_component': {
        const c = system.components.find((x) => x.slug === args.slug || x.name.toLowerCase() === String(args.slug).toLowerCase());
        if (!c) return text(`Unknown component "${args.slug}". Known: ${system.components.map((x) => x.slug).join(', ')}`);
        const { designMd } = await import('./generators/designmd.ts');
        const full = designMd({ ...system, components: [c], patterns: [] }, idx);
        const start = full.indexOf(`<a id="${c.slug}"></a>`);
        const end = full.indexOf('## 4. Patterns');
        return text(full.slice(start, end));
      }
      case 'get_css': {
        if (args.slug === 'tokens') return text(readFileSync(join(distDir(), 'tokens.css'), 'utf8'));
        if (args.slug === 'all') return text(readFileSync(join(distDir(), `${p()}.css`), 'utf8'));
        const c = system.components.find((x) => x.slug === args.slug);
        if (!c) return text(`Unknown component "${args.slug}"`);
        return text(componentCss(c, idx, p(), true));
      }
      case 'list_tokens': {
        const g = args.group as string | undefined;
        return text([...idx.values()].filter((t) => !g || t.group === g || t.ref.startsWith(`{${g}`)).map(tokenLine).join('\n'));
      }
      case 'get_token': {
        const n = String(args.name).replace(/^\{|\}$/g, '');
        const t = idx.get(n) ?? [...idx.values()].find((x) => x.cssVar === n || x.cssVar === `--${n}`);
        return text(t ? tokenLine(t) : `Unknown token ${n}`);
      }
      case 'suggest_token': {
        const value = String(args.value).trim();
        const prop = String(args.property ?? '');
        const hex = parseCssColor(value);
        if (hex) {
          const ranked = known.colors.map((c) => ({ c, d: distance(hex, c.hex) })).sort((a, b) => a.d - b.d);
          const sem = ranked.filter((r) => r.c.ref.includes('-color-')).slice(0, 5);
          const prim = ranked.filter((r) => !r.c.ref.includes('-color-')).slice(0, 3);
          return text(`For ${value} (${hex}):\nSemantic (prefer):\n${sem.map((r) => `- var(${r.c.ref}) ${r.c.hex} (Δ ${r.d.toFixed(3)})`).join('\n')}\nPrimitive:\n${prim.map((r) => `- var(${r.c.ref}) ${r.c.hex} (Δ ${r.d.toFixed(3)})`).join('\n')}`);
        }
        const m = value.match(/^(-?[\d.]+)(px|rem|em)?$/);
        if (m) {
          const px = m[2] === 'rem' || m[2] === 'em' ? +m[1] * 16 : +m[1];
          const group = /radius/.test(prop) ? 'radius' : /font/.test(prop) ? 'font' : /height|width/.test(prop) ? 'size' : 'space';
          const ranked = known.dims.filter((d) => d.group === group).sort((a, b) => Math.abs(a.px - px) - Math.abs(b.px - px)).slice(0, 4);
          return text(`For ${value} on ${prop || 'spacing'}:\n${ranked.map((d) => `- var(${d.ref}) = ${d.px}px${d.px === px ? ' (exact)' : ''}`).join('\n')}`);
        }
        if (/shadow/.test(prop) || /px.*rgba?/.test(value)) return text(`Shadows: ${Object.keys(system.tokens.shadow).map((k) => `var(--${p()}-shadow-${k})`).join(', ')} — xs on controls, sm resting cards (only on same-color canvas), md menus/popovers, lg dialogs/drawers, focus for rings.`);
        return text(`No suggestion for "${value}". Provide a color (hex/rgb) or a length (px/rem) and the CSS property.`);
      }
      case 'search': {
        const q = String(args.query).toLowerCase();
        const hits: string[] = [];
        for (const c of system.components) {
          const hay = [c.name, c.slug, c.description, c.usage, ...c.rules, ...Object.keys(c.props)].join(' ').toLowerCase();
          if (hay.includes(q)) hits.push(`component ${c.slug}: ${c.description}`);
        }
        for (const pt of system.patterns) if ([pt.name, pt.slug, pt.description, ...pt.rules].join(' ').toLowerCase().includes(q)) hits.push(`pattern ${pt.slug}: ${pt.description}`);
        for (const t of idx.values()) if ((t.ref + ' ' + (t.description ?? '')).toLowerCase().includes(q)) hits.push(`token ${tokenLine(t)}`);
        return text(hits.length ? hits.slice(0, 40).join('\n') : 'No matches.');
      }
      case 'list_patterns': {
        const cat = args.category as string | undefined;
        return text(system.patterns.filter((pt) => !cat || pt.category === cat).map((pt) => `- ${pt.slug} [${pt.category}] ${pt.name}: ${pt.description}${pt.variants?.length ? ` (${pt.variants.length} more layouts)` : ''}`).join('\n'));
      }
      case 'get_pattern': {
        const pt = system.patterns.find((x) => x.slug === args.slug);
        if (!pt) return text(`Unknown pattern "${args.slug}". Known: ${system.patterns.map((x) => x.slug).join(', ')}`);
        const re = (s: string) => s.replace(/\bcn-/g, `${p()}-`);
        return text(`# ${pt.name} [${pt.category}]\n${pt.description}\n\nRules:\n${pt.rules.map((r) => `- ${r}`).join('\n')}\n\n## Primary\n\`\`\`html\n${re(pt.html)}\n\`\`\`\n${(pt.variants ?? []).map((v) => `## ${v.title}\n${v.description ?? ''}\n\`\`\`html\n${re(v.html)}\n\`\`\``).join('\n')}${pt.css ? `\n## CSS (already in ${p()}.css)\n\`\`\`css\n${re(pt.css)}\n\`\`\`` : ''}`);
      }
      case 'lint_code': {
        const vs = lintSource(known, String(args.filename ?? 'snippet.tsx'), String(args.code), { tailwind: system.meta.lint.tailwind });
        return text(vs.length ? vs.map((v) => `${v.line}:${v.col} ${v.severity} ${v.rule}: ${v.message}${v.suggestion ? ` → ${v.suggestion}` : ''}\n    ${v.snippet}`).join('\n') : '✓ no violations');
      }
      case 'reload':
        reload();
        return text(`Reloaded ${system.meta.name}: ${system.components.length} components, ${idx.size} tokens.`);
      default:
        throw Object.assign(new Error(`Unknown tool ${name}`), { code: -32602 });
    }
  };

  const resources = () => [
    { uri: 'canon://DESIGN.md', name: 'DESIGN.md', mimeType: 'text/markdown', description: 'Full design system specification' },
    { uri: 'canon://DESIGN.compact.md', name: 'DESIGN.compact.md', mimeType: 'text/markdown', description: 'Compact quick reference' },
    { uri: 'canon://tokens.css', name: 'tokens.css', mimeType: 'text/css', description: 'All CSS custom properties' },
  ];
  const readResource = (uri: string) => {
    refreshIfBuilt();
    const file = uri.replace('canon://', '');
    const path = join(distDir(), file);
    if (!existsSync(path)) throw Object.assign(new Error(`Resource not built: run canon build (${path})`), { code: -32002 });
    return { contents: [{ uri, mimeType: file.endsWith('.css') ? 'text/css' : 'text/markdown', text: readFileSync(path, 'utf8') }] };
  };

  const send = (msg: Json) => process.stdout.write(JSON.stringify(msg) + '\n');
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', async (line) => {
    if (!line.trim()) return;
    let req: Json;
    try { req = JSON.parse(line); } catch { return; }
    const id = req.id;
    const method = String(req.method);
    const params = (req.params ?? {}) as Json;
    const reply = (result: unknown) => { if (id !== undefined) send({ jsonrpc: '2.0', id, result }); };
    const fail = (code: number, message: string) => { if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code, message } }); };
    try {
      switch (method) {
        case 'initialize':
          reply({ protocolVersion: (params.protocolVersion as string) ?? '2025-06-18', capabilities: { tools: { listChanged: false }, resources: { listChanged: false } }, serverInfo: { name: 'canon', version: VERSION }, instructions: `Design system "${system.meta.name}". Call design_rules first, then get_component / get_pattern for exact markup, suggest_token for any raw value, lint_code before finishing.` });
          break;
        case 'notifications/initialized':
        case 'notifications/cancelled':
          break;
        case 'ping':
          reply({});
          break;
        case 'tools/list':
          reply({ tools });
          break;
        case 'tools/call':
          reply(await call(String(params.name), (params.arguments ?? {}) as Json));
          break;
        case 'resources/list':
          reply({ resources: resources() });
          break;
        case 'resources/read':
          reply(readResource(String(params.uri)));
          break;
        default:
          fail(-32601, `Method not found: ${method}`);
      }
    } catch (e) {
      const err = e as Error & { code?: number };
      fail(err.code ?? -32000, err.message);
    }
  });
  rl.on('close', () => process.exit(0));
  process.stderr.write(`canon mcp: ${system.meta.name} (${system.components.length} components, ${idx.size} tokens) on stdio\n`);
  await new Promise(() => {});
}
