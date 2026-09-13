import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { System, SystemMeta, Seeds, Tokens, ComponentSpec, Pattern } from './types.ts';
import { buildTokens, applySeedChanges } from './tokens/index.ts';
import { PRESETS } from './tokens/presets.ts';
import { indexTokens } from './tokens/resolve.ts';
import { loadCatalog, compareSpecs } from './components/index.ts';
import { loadPatterns, comparePatterns } from './patterns/index.ts';
import { VERSION } from './version.ts';

export interface InitOptions {
  name: string;
  prefix?: string;
  preset?: string;
  seeds?: Partial<Seeds>;
  description?: string;
}

/** Build an in-memory System from a preset + overrides. */
export async function createSystem(opts: InitOptions): Promise<System> {
  const CATALOG = await loadCatalog();
  const PATTERNS = await loadPatterns();
  const preset = PRESETS[opts.preset ?? 'canon'];
  if (!preset) throw new Error(`Unknown preset "${opts.preset}". Available: ${Object.keys(PRESETS).join(', ')}`);
  const prefix = (opts.prefix ?? slugify(opts.name).slice(0, 8) ?? 'cn').replace(/[^a-z0-9]/g, '') || 'cn';
  const { overrides: presetOverrides = {}, ...presetSeeds } = preset.seeds;
  const seeds: Seeds = applySeedChanges({ name: opts.name, prefix, ...presetSeeds, presetOverrides }, stripUndefined(opts.seeds ?? {}));
  const tokens = buildTokens(seeds);
  const meta: SystemMeta = {
    name: opts.name,
    prefix,
    version: '1.0.0',
    description: opts.description ?? `${opts.name} design system, compiled by canon ${VERSION}.`,
    direction: preset.direction,
    seeds,
    defaultTheme: seeds.defaultTheme ?? 'light',
    out: 'dist',
    lint: {
      include: ['src', 'app', 'components', 'pages', 'lib', 'styles'],
      exclude: ['node_modules', 'dist', 'build', '.next', 'design', 'public', 'coverage'],
      allow: ['**/tokens.css', '**/canon.css', '**/*.stories.*'],
      tailwind: true,
    },
    icons: { set: 'Lucide', strokeWidth: '1.5', note: 'Outline icons, 1.5px stroke, sized by the icon token scale (16px default in text, 20px in nav). Never emoji, never filled icon sets mixed with outline.' },
  };
  return { meta, tokens, components: structuredClone(CATALOG), patterns: structuredClone(PATTERNS) };
}

export function writeDesignDir(system: System, dir: string): string[] {
  const written: string[] = [];
  const w = (rel: string, data: unknown) => {
    const p = join(dir, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
    written.push(p);
  };
  w('system.json', system.meta);
  w('tokens.json', system.tokens);
  for (const c of system.components) w(`components/${c.slug}.json`, c);
  for (const p of system.patterns) w(`patterns/${p.slug}.json`, p);
  const readme = join(dir, 'README.md');
  if (!existsSync(readme)) {
    writeFileSync(readme, `# ${system.meta.name} — design source

This folder is the single source of truth for the ${system.meta.name} design system.

- \`system.json\` — name, prefix, art direction, seeds, lint config.
- \`tokens.json\` — every token (colors, type, space, radius, shadow, motion…). Values may reference other tokens with \`{group.path}\`.
- \`components/*.json\` — one file per component: anatomy, props, states, styles per part/variant/state, examples, rules.
- \`patterns/*.json\` — page-level compositions.

Edit these files, then run \`canon build\` (or \`canon sync\` to also refresh the agent files in the project root).
Never edit \`dist/\` by hand — it is regenerated.
`);
    written.push(readme);
  }
  return written;
}

export function loadDesignDir(dir: string): System {
  const read = <T>(rel: string): T => JSON.parse(readFileSync(join(dir, rel), 'utf8')) as T;
  if (!existsSync(join(dir, 'system.json'))) throw new Error(`No design system found at ${dir} (missing system.json). Run \`canon init\` first.`);
  const meta = read<SystemMeta>('system.json');
  const tokens = read<Tokens>('tokens.json');
  const compDir = join(dir, 'components');
  const components: ComponentSpec[] = existsSync(compDir)
    ? readdirSync(compDir).filter((f) => f.endsWith('.json')).sort().map((f) => read<ComponentSpec>(`components/${f}`))
    : [];
  components.sort(compareSpecs);
  const patDir = join(dir, 'patterns');
  const patterns: Pattern[] = existsSync(patDir)
    ? readdirSync(patDir).filter((f) => f.endsWith('.json')).sort().map((f) => read<Pattern>(`patterns/${f}`))
    : [];
  patterns.sort(comparePatterns);
  return { meta, tokens, components, patterns };
}

/** Structural validation. Throws with every problem listed. */
export function validateSystem(system: System): { errors: string[]; warnings: string[] } {
  const problems: string[] = [];
  const warnings: string[] = [];
  let idx;
  try {
    idx = indexTokens(system.tokens, system.meta.prefix);
  } catch (e) {
    problems.push(`tokens: ${(e as Error).message}`);
    return { errors: problems, warnings };
  }
  const refRe = /\{([a-zA-Z0-9_.-]+)\}/g;
  const checkRefs = (where: string, value: string) => {
    for (const m of value.matchAll(refRe)) if (!idx.has(m[1])) problems.push(`${where}: unknown token {${m[1]}}`);
  };
  const checkBlock = (c: ComponentSpec, where: string, block: Record<string, unknown> | undefined) => {
    if (!block) return;
    for (const [part, decls] of Object.entries(block)) {
      if (part === '@states') {
        for (const [state, parts] of Object.entries(decls as Record<string, Record<string, Record<string, string>>>)) {
          if (!c.states[state]) problems.push(`${c.slug} ${where}: unknown state "${state}"`);
          for (const [p2, d2] of Object.entries(parts)) {
            if (!c.anatomy.some((a) => a.part === p2)) problems.push(`${c.slug} ${where} @states.${state}: unknown part "${p2}"`);
            for (const [prop, val] of Object.entries(d2)) checkRefs(`${c.slug} ${where} ${state} ${p2} ${prop}`, val);
          }
        }
        continue;
      }
      if (!c.anatomy.some((a) => a.part === part)) problems.push(`${c.slug} ${where}: unknown part "${part}"`);
      for (const [prop, val] of Object.entries(decls as Record<string, string>)) checkRefs(`${c.slug} ${where} ${part} ${prop}`, val);
    }
  };
  const slugs = new Set<string>();
  for (const c of system.components) {
    if (slugs.has(c.slug)) problems.push(`duplicate component slug "${c.slug}"`);
    slugs.add(c.slug);
    if (!c.anatomy.some((a) => a.part === 'root')) problems.push(`${c.slug}: anatomy must include a "root" part`);
    checkBlock(c, 'base', c.base as Record<string, unknown>);
    for (const [axis, values] of Object.entries(c.variants ?? {})) {
      const prop = c.props[axis];
      if (!prop) problems.push(`${c.slug}: variants axis "${axis}" has no matching prop`);
      for (const [value, block] of Object.entries(values)) {
        if (prop && !prop.values.includes(value)) problems.push(`${c.slug}: variant ${axis}="${value}" not listed in props.${axis}.values`);
        checkBlock(c, `variants.${axis}.${value}`, block as Record<string, unknown>);
      }
      if (prop) for (const v of prop.values) if (!(v in values)) problems.push(`${c.slug}: props.${axis} value "${v}" has no variants block (add an empty one)`);
    }
    for (const [axis, prop] of Object.entries(c.props)) {
      if (!prop.values.includes(prop.default)) problems.push(`${c.slug}: props.${axis}.default "${prop.default}" not in values`);
    }
    for (const comp of c.compound ?? []) {
      for (const [axis, val] of Object.entries(comp.when)) if (!c.props[axis]?.values.includes(val)) problems.push(`${c.slug}: compound when ${axis}="${val}" invalid`);
      checkBlock(c, 'compound', comp.block as Record<string, unknown>);
    }
    if (c.extraCss) checkRefs(`${c.slug} extraCss`, c.extraCss);
    if (!c.examples?.length) problems.push(`${c.slug}: needs at least one example`);
    const allSlugs = new Set(system.components.map((o) => o.slug));
    for (const ex of [...(c.examples ?? []), ...(c.recipes ?? [])]) {
      for (const m of ex.html.matchAll(/\bcn-([a-z0-9]+(?:-[a-z0-9]+)*)__([a-z0-9]+(?:-[a-z0-9]+)*)/g)) {
        const owner = system.components.find((o) => o.slug === m[1]);
        if (!owner) { if (!system.components.some((o) => (o.extraCss ?? '').includes(`.cn-${m[1]}`))) warnings.push(`${c.slug} example "${ex.title}": references unknown component cn-${m[1]}`); continue; }
        if (!owner.anatomy.some((a) => a.part === m[2]) && !(owner.extraCss ?? '').includes(`cn-${m[1]}__${m[2]}`)) problems.push(`${c.slug} example "${ex.title}": cn-${m[1]}__${m[2]} is not a part of ${m[1]} (parts: ${owner.anatomy.map((a) => a.part).join(', ')})`);
      }
      for (const tagm of ex.html.matchAll(/<[a-z][a-z0-9-]*\b[^>]*\bclass="([^"]*)"[^>]*>/g)) {
        const owner = tagm[1].split(/\s+/).map((cls) => system.components.find((o) => `cn-${o.slug}` === cls)).find(Boolean);
        if (!owner) continue;
        for (const d of tagm[0].matchAll(/\bdata-([a-z-]+)="([^"]*)"/g)) {
          const pr = owner.props[d[1]];
          if (pr && !pr.values.includes(d[2])) warnings.push(`${c.slug} example "${ex.title}": cn-${owner.slug} data-${d[1]}="${d[2]}" is not an allowed value (${pr.values.join('|')})`);
        }
      }
      for (const m of ex.html.matchAll(/class="([^"]*)"/g)) {
        for (const cls of m[1].split(/\s+/)) {
          const mm = cls.match(/^cn-([a-z0-9]+(?:-[a-z0-9]+)*)$/);
          if (mm && !allSlugs.has(mm[1]) && !['icon', 'sr-only', 'tabular', 'truncate', 'container', 'prose', 'section', 'stack', 'row', 'grid', 'split', 'center', 'measure', 'mx-auto', 'flex-1', 'hide-mobile', 'show-mobile', 'placeholder'].includes(mm[1]) && !mm[1].startsWith('text-') && !system.components.some((o) => (o.extraCss ?? '').includes(`.cn-${mm[1]}`)) && !system.patterns.some((pt) => (pt.css ?? '').includes(`.cn-${mm[1]}`))) warnings.push(`${c.slug} example "${ex.title}": class cn-${mm[1]} is not a known component`);
        }
      }
    }
    for (const r of c.related) if (!system.components.some((o) => o.slug === r)) warnings.push(`${c.slug}: related "${r}" is not in this design system`);
  }
  for (const p of system.patterns) if (p.css) checkRefs(`pattern ${p.slug}`, p.css);
  return { errors: problems, warnings };
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
