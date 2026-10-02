#!/usr/bin/env node
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { VERSION } from './version.ts';
import { PRESETS } from './tokens/presets.ts';
import { findProject } from './project.ts';
import type { ExecFn } from './adapters/types.ts';

const args = process.argv.slice(2);
const cmd = args[0];

function flag(name: string, def?: string): string | undefined {
  const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return def;
  const a = args[i];
  if (a.includes('=')) return a.slice(a.indexOf('=') + 1);
  const next = args[i + 1];
  if (next && !next.startsWith('--')) return next;
  return 'true';
}
const has = (name: string) => args.includes(`--${name}`) || args.some((a) => a.startsWith(`--${name}=`));
const positional = args.slice(1).filter((a, i, arr) => !a.startsWith('--') && !(arr[i - 1]?.startsWith('--') && !arr[i - 1].includes('=') && !['true', 'false'].includes(a) && isFlagWithValue(arr[i - 1])));
function isFlagWithValue(f: string) { return !['--force', '--no-install', '--json', '--quiet', '--fix', '--changed', '--annotate', '--hooks', '--no-hooks', '--open', '--apply'].includes(f); }

/** Default `ExecFn` for adapters/generators that shell out (`canon init --lib`, `add` in library mode, `storybook`). */
const defaultExec: ExecFn = async (execCmd, execArgs, opts) => {
  const result = spawnSync(execCmd, execArgs, { cwd: opts.cwd, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? (result.error ? String(result.error.message) : '') };
};

const rootDir = () => resolve(flag('root') ?? findProject(process.cwd())?.root ?? '.');
const designDir = () => {
  const from = flag('root') ? resolve(flag('root')!) : process.cwd();
  if (flag('design')) return resolve(from, flag('design')!);
  const project = findProject(from);
  if (project) return project.design;
  return existsSync(join(from, 'system.json')) ? from : join(from, 'design');
};

const HELP = `canon ${VERSION} — the design harness for coding agents.

Usage
  canon connect <studio-url|snapshot.json> [--root .] [--design design] [--no-hooks]
                                           Import the saved design or reuse this project's existing Canon
  canon init <name> [--preset canon|editorial|vera|clean|dark] [--prefix cn] [--brand #hex] [--action #hex]
             [--font "Geist"] [--radius 1] [--base 14] [--control 36] [--design design] [--force]
  canon init <name> --lib shadcn [--preset canon|editorial|vera|clean|dark] [--root .] [--no-hooks] [--force]
                                           Bootstrap onto an external component library instead of Canon's catalog
                                           (runs the library's own init when not already present, then seeds its theme from the preset)
  canon adopt [--root .] [--apply] [--no-hooks] [--design design]
                                           Import an existing repo that already uses a supported library (shadcn/ui today)
                                           Plans by default; pass --apply to write the design dir, theme-derived tokens and agent files
  canon build [--design design]            Compile tokens → css, tailwind, react, gallery, DESIGN.md, agent files
                                           (or, in an adopted/--lib project: DESIGN.md + agent files + Storybook stories from the library's own code)
  canon install [--design design] [--root .] [--no-hooks]
                                           Put DESIGN.md, AGENTS.md/CLAUDE.md blocks, skill, cursor rules, MCP config and lint hook in a project
  canon sync                               build + install
  canon lint [paths…] [--design design] [--json] [--changed]
                                           Find raw colors/sizes/fonts/tailwind palette classes outside the system
  canon check                              Fail if dist is stale or lint fails (CI / pre-commit)
  canon mcp [--design design]              MCP server (stdio) exposing tokens, components, rules and lint to any agent
  canon add <component-slug>               Add a catalog component missing from the design dir
                                           (in an adopted/--lib project: installs it through the library's own CLI instead)
  canon storybook [--root .]               Ensure Storybook is installed, then (re)generate one story per inventoried component
                                           (adopted/--lib projects only)
  canon presets                            List presets
  canon studio [--root .] [--port 4600] [--open]
                                           Edit this project's design and save its styles and agent references
                                           (adopted/--lib projects: edit the repo's own theme and component variants instead)
  canon serve                              Alias for studio
  canon doctor                             Sanity-check a design dir

Examples
  canon init "Vera" --preset vera --prefix vera && canon install
  canon init "My App" --lib shadcn --preset vera && canon storybook
  canon adopt && canon adopt --apply
  canon lint src app
  canon mcp --design ./design   (register in .mcp.json; canon install does it)
`;

async function main() {
  switch (cmd) {
    case 'connect': {
      const { connect } = await import('./connect.ts');
      const result = await connect(positional[0], { root: rootDir(), design: flag('design'), hooks: !has('no-hooks') });
      console.log(`✓ ${result.reused ? 'Reused existing design' : 'Imported saved Studio design'} → ${result.design}`);
      for (const line of result.log) console.log(line);
      console.log('Start this project’s Studio: canon studio --port 0 --open');
      return;
    }
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      return;
    case '--version':
    case '-v':
    case 'version':
      console.log(VERSION);
      return;
    case 'presets': {
      for (const p of Object.values(PRESETS)) console.log(`${p.id.padEnd(9)} ${p.label}\n${''.padEnd(10)}${p.direction.summary}\n`);
      return;
    }
    case 'init': {
      const name = positional[0] ?? flag('name');
      if (!name) { console.error('canon init <name> — a name is required.'); process.exit(2); }
      if (has('lib')) {
        const { initLib } = await import('./init-lib.ts');
        const lib = flag('lib')!;
        const root = rootDir();
        await initLib({ root, lib, preset: flag('preset'), name, exec: defaultExec, hooks: !has('no-hooks'), force: has('force') });
        console.log(`✓ ${name} on ${lib} → ${root}`);
        console.log(`  design dir: design · stories: stories/canon`);
        console.log(`\nNext: canon storybook to view the generated stories (or open the *.stories.tsx files directly); canon lint / canon check to verify, then commit.`);
        return;
      }
      const { createSystem, writeDesignDir } = await import('./system.ts');
      const { buildSystem } = await import('./build.ts');
      const dir = resolve(flag('design', 'design')!);
      if (existsSync(join(dir, 'system.json')) && !has('force')) {
        console.error(`${dir}/system.json already exists. Use --force to overwrite (components you customized will be reset).`);
        process.exit(2);
      }
      const num = (n: string) => (flag(n) !== undefined ? Number(flag(n)) : undefined);
      const system = await createSystem({
        name,
        prefix: flag('prefix'),
        preset: flag('preset', 'canon'),
        description: flag('description'),
        seeds: {
          brand: flag('brand'), action: flag('action'),
          fontSans: flag('font'), fontMono: flag('mono'), fontDisplay: flag('display'),
          radiusScale: num('radius'), baseFontSize: num('base'), controlHeight: num('control'),
          canvasLight: flag('canvas'), inkDark: flag('ink'), shadowTint: flag('shadow-tint'),
          neutralHue: num('neutral-hue'), neutralChroma: num('neutral-chroma'),
          defaultTheme: flag('theme') as 'light' | 'dark' | undefined,
        },
      });
      const written = writeDesignDir(system, dir);
      console.log(`✓ ${system.meta.name} (prefix "${system.meta.prefix}", preset ${flag('preset', 'canon')}) → ${dir}`);
      console.log(`  ${written.length} source files: system.json, tokens.json, ${system.components.length} components, ${system.patterns.length} patterns`);
      const r = await buildSystem(system, dir);
      report(r);
      console.log(`\nNext: open ${join(r.outDir, 'preview.html')} to see everything, then \`canon install\` to wire agents.`);
      return;
    }
    case 'adopt': {
      const { adopt } = await import('./adopt.ts');
      const root = rootDir();
      const result = await adopt({ root, apply: has('apply'), hooks: !has('no-hooks'), design: flag('design') });
      for (const line of result.plan) console.log(line);
      console.log(result.applied
        ? `\n✓ applied — adapter-mode Canon project ready at ${root}`
        : '\n(dry run — nothing was written; pass --apply to write these files)');
      return;
    }
    case 'build': {
      const { loadDesignDir } = await import('./system.ts');
      const dir = designDir();
      const system = loadDesignDir(dir);
      const project = findProject(rootDir()) ?? findProject(dir);
      if (project?.adapter) {
        const { buildLib } = await import('./build-lib.ts');
        await buildLib(project.root, dir);
        console.log(`✓ built library-mode dist → ${join(dir, system.meta.out || 'dist')}`);
        return;
      }
      const { buildSystem } = await import('./build.ts');
      const r = await buildSystem(system, dir, { only: flag('only')?.split(',') });
      report(r);
      return;
    }
    case 'install':
    case 'sync': {
      const { loadDesignDir } = await import('./system.ts');
      const { install } = await import('./install.ts');
      const dir = designDir();
      const system = loadDesignDir(dir);
      const root = rootDir();
      if (cmd === 'sync') {
        const project = findProject(root) ?? findProject(dir);
        if (project?.adapter) {
          const { buildLib } = await import('./build-lib.ts');
          await buildLib(project.root, dir);
          console.log(`✓ built library-mode dist → ${join(dir, system.meta.out || 'dist')}`);
        } else {
          const { buildSystem } = await import('./build.ts');
          report(await buildSystem(system, dir));
        }
      }
      const res = install(system, dir, { root, hooks: !has('no-hooks') });
      for (const l of res.log) console.log(l);
      return;
    }
    case 'lint': {
      const { runLint, formatReport } = await import('./lint.ts');
      const { loadDesignDir } = await import('./system.ts');
      const dir = designDir();
      const system = loadDesignDir(dir);
      const paths = positional.length ? positional : undefined;
      const res = await runLint(system, dir, { paths, root: rootDir(), changed: has('changed') });
      if (has('json')) console.log(JSON.stringify(res, null, 2));
      else console.log(formatReport(res));
      process.exit(res.violations.filter((v) => v.severity === 'error').length ? 1 : 0);
    }
    case 'check': {
      const { loadDesignDir } = await import('./system.ts');
      const { runLint, formatReport } = await import('./lint.ts');
      const dir = designDir();
      const system = loadDesignDir(dir);
      const root = rootDir();
      const project = findProject(root) ?? findProject(dir);
      let build: { ok: boolean; issues: string[] };
      if (project?.adapter) {
        const { checkLib } = await import('./build-lib.ts');
        build = checkLib(project.root, dir);
      } else {
        const { checkBuild } = await import('./build-manifest.ts');
        build = checkBuild(system, dir);
      }
      let ok = build.ok;
      if (build.ok) console.log(project?.adapter ? '✓ dist is up to date (theme + inventory unchanged since last build)' : '✓ dist is up to date (all generators and file hashes verified)');
      else {
        for (const issue of build.issues) console.log(`✗ ${issue}`);
        console.log('  Run `canon build` to rebuild all artifacts.');
      }
      const res = await runLint(system, dir, { root: rootDir() });
      console.log(formatReport(res));
      if (res.violations.some((v) => v.severity === 'error')) ok = false;
      process.exit(ok ? 0 : 1);
    }
    case 'hook': {
      // Claude Code PostToolUse hook: lint the edited file; exit 2 + stderr feeds violations back to the agent.
      const { runLint, formatReport } = await import('./lint.ts');
      const { loadDesignDir } = await import('./system.ts');
      const chunks: Buffer[] = [];
      for await (const c of process.stdin) chunks.push(c as Buffer);
      let file: string | undefined;
      try { const j = JSON.parse(Buffer.concat(chunks).toString('utf8')); file = j.tool_input?.file_path ?? j.tool_input?.path; } catch { /* ignore */ }
      if (!file || !existsSync(file) || !/\.(css|scss|less|tsx|jsx|ts|js|mjs|html|vue|svelte|astro|mdx)$/.test(file)) return;
      const dir = designDir();
      const system = loadDesignDir(dir);
      const res = await runLint(system, dir, { paths: [file], root: process.cwd() });
      if (res.summary.errors) { console.error(`canon lint found ${res.summary.errors} design-system violation(s) in ${file}. Fix them using tokens/components from DESIGN.md:\n` + formatReport(res)); process.exit(2); }
      return;
    }
    case 'mcp': {
      const { startMcp } = await import('./mcp.ts');
      await startMcp(designDir());
      return;
    }
    case 'add': {
      const slug = positional[0];
      if (!slug) { console.error('canon add <component-slug> — a slug is required.'); process.exit(2); }
      const root = rootDir();
      const project = findProject(root);
      if (project?.adapter) {
        const { getAdapter } = await import('./adapters/index.ts');
        const adapter = getAdapter(project.adapter);
        await adapter.install(project.root, [slug], defaultExec);
        console.log(`✓ ${adapter.id} add ${slug} — run canon build`);
        return;
      }
      const { loadDesignDir } = await import('./system.ts');
      const { loadCatalog } = await import('./components/index.ts');
      const CATALOG = await loadCatalog();
      const { writeFileSync } = await import('node:fs');
      const dir = designDir();
      const system = loadDesignDir(dir);
      const spec = CATALOG.find((c) => c.slug === slug);
      if (!spec) { console.error(`Unknown component "${slug}". Available: ${CATALOG.map((c) => c.slug).join(', ')}`); process.exit(2); }
      if (system.components.some((c) => c.slug === slug) && !has('force')) { console.error(`${slug} already exists in ${dir}/components. Use --force to reset it.`); process.exit(2); }
      writeFileSync(join(dir, 'components', `${slug}.json`), JSON.stringify(spec, null, 2) + '\n');
      console.log(`✓ added components/${slug}.json — run canon build`);
      return;
    }
    case 'storybook': {
      const root = rootDir();
      const project = findProject(root);
      if (!project?.adapter) { console.error(`No adapter configured for ${root}. Run \`canon adopt\` or \`canon init --lib <id>\` first.`); process.exit(2); }
      const { getAdapter } = await import('./adapters/index.ts');
      const { ensureStorybook, storyWrites } = await import('./generators/stories.ts');
      const { installFiles } = await import('./design-files.ts');
      const adapter = getAdapter(project.adapter);
      const status = await ensureStorybook(project.root, defaultExec);
      console.log(`✓ storybook ${status}`);
      const components = adapter.inventory(project.root);
      const writes = storyWrites(project.root, adapter, components);
      if (writes.length) installFiles(project.root, writes);
      console.log(`✓ wrote ${writes.length} ${writes.length === 1 ? 'story' : 'stories'} → stories/canon/`);
      return;
    }
    case 'serve':
    case 'studio': {
      const { serve } = await import('./serve.ts');
      const { loadDesignDir } = await import('./system.ts');
      const dir = designDir();
      const system = loadDesignDir(dir);
      const project = findProject(rootDir()) ?? findProject(dir);
      const { realpathSync } = await import('node:fs');
      const projectRoot = project && realpathSync(project.design) === realpathSync(dir) ? project.root : undefined;
      await serve(join(dir, system.meta.out || 'dist'), Number(flag('port', '4600')), dir, { projectRoot, open: has('open') });
      return;
    }
    case 'doctor': {
      const { loadDesignDir, validateSystem } = await import('./system.ts');
      const dir = designDir();
      const system = loadDesignDir(dir);
      const v = validateSystem(system);
      for (const w of v.warnings) console.log(`  ! ${w}`);
      if (v.errors.length) { console.log(`✗ ${v.errors.length} problem(s):\n  - ${v.errors.join('\n  - ')}`); process.exit(1); }
      console.log(`✓ ${system.meta.name}: ${system.components.length} components, ${system.patterns.length} patterns, tokens ok`);
      return;
    }
    default:
      console.error(`Unknown command "${cmd}".\n`);
      console.log(HELP);
      process.exit(2);
  }
}

function report(r: { outDir: string; files: string[]; warnings: string[] }) {
  console.log(`✓ built ${r.files.length} files → ${r.outDir}`);
  for (const w of r.warnings) console.log(`  ! ${w}`);
}

main().catch((e) => {
  console.error(`✗ ${(e as Error).message}`);
  if (process.env.CANON_DEBUG) console.error((e as Error).stack);
  process.exit(1);
});
