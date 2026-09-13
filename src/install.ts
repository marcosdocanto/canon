import { existsSync, readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { System } from './types.ts';
import { installFiles, sourcePath, type Write } from './design-files.ts';
import { projectWrite } from './project.ts';

export interface InstallOptions { root: string; hooks: boolean }

const START = '<!-- canon:start -->', END = '<!-- canon:end -->';
const shellQuote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";

function managedContent(path: string, block: string) {
  let content = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const s = content.indexOf(START), e = content.indexOf(END);
  if (s !== -1 && e !== -1) content = content.slice(0, s) + block.trim() + content.slice(e + END.length);
  else content = (content ? content.replace(/\s*$/, '\n\n') : '') + block.trim() + '\n';
  return content;
}

/** Prepare references from a build without writing; Save uses its staged build. */
export function referenceWrites(system: System, designDir: string, root: string, dist = join(designDir, system.meta.out || 'dist')): Write[] {
  const relDesign = relative(root, designDir).split(sep).join('/') || '.';
  const text = (file: string) => readFileSync(join(dist, file), 'utf8').replace(/\bdesign\//g, () => `${relDesign}/`);
  const files = new Map<string, string>([
    ['DESIGN.md', 'DESIGN.md'], ['DESIGN.compact.md', 'DESIGN.compact.md'],
    ['.claude/skills/design-system/SKILL.md', 'agents/SKILL.md'],
    ['.cursor/rules/design-system.mdc', 'agents/design-system.mdc'],
  ]);
  const writes: Write[] = [...files].map(([target, source]) => ({ root, path: join(root, target), content: Buffer.from(text(source)) }));
  const block = text('agents/AGENTS.md');
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const path = sourcePath(root, join(root, name), 'file');
    writes.push({ root, path, content: Buffer.from(managedContent(path, block)) });
  }
  return writes;
}

function mergeJson(path: string, patch: (j: Record<string, unknown>) => void, log: string[]) {
  let j: Record<string, unknown> = {};
  if (existsSync(path)) { try { j = JSON.parse(readFileSync(path, 'utf8')); } catch { log.push(`  ! ${path} is not valid JSON, left untouched`); return; } }
  patch(j);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(j, null, 2) + '\n');
  log.push(`  merged ${path}`);
}

export function install(system: System, designDir: string, opts: InstallOptions): { log: string[] } {
  const log: string[] = [];
  const root = realpathSync(opts.root);
  designDir = realpathSync(designDir);
  const dist = join(designDir, system.meta.out || 'dist');
  if (!existsSync(join(dist, 'DESIGN.md'))) throw new Error(`dist not built at ${dist}. Run canon build first.`);
  const binPath = fileURLToPath(new URL('../bin/canon.js', import.meta.url));
  const relDesign = relative(root, designDir) || 'design';
  log.push(`Installing ${system.meta.name} into ${root}`);
  const references = referenceWrites(system, designDir, root, dist);
  installFiles(root, [...references, projectWrite(root, designDir)]);
  for (const write of references) log.push(`  wrote ${write.path}`);
  mergeJson(join(root, '.mcp.json'), (j) => {
    const servers = ((j.mcpServers as Record<string, unknown>) ??= {});
    servers.canon = { command: 'node', args: [binPath, 'mcp', '--design', relDesign] };
  }, log);
  if (opts.hooks) {
    mergeJson(join(root, '.claude', 'settings.json'), (j) => {
      const hooks = ((j.hooks as Record<string, unknown[]>) ??= {});
      const post = ((hooks.PostToolUse as Record<string, unknown>[]) ??= []);
      const cmd = `node ${shellQuote(binPath)} hook --design ${shellQuote(relDesign)}`;
      const legacyCmd = `node ${binPath} hook --design ${relDesign}`;
      let exists = false;
      for (const entry of post) {
        if (entry.matcher !== 'Edit|Write|MultiEdit' || !Array.isArray(entry.hooks)) continue;
        for (const hook of entry.hooks) {
          if (!hook || typeof hook !== 'object' || hook.type !== 'command') continue;
          if (hook.command === legacyCmd) hook.command = cmd;
          if (hook.command === cmd) exists = true;
        }
      }
      if (!exists) post.push({ matcher: 'Edit|Write|MultiEdit', hooks: [{ type: 'command', command: cmd, timeout: 30 }] });
    }, log);
    log.push(`  hook: every Edit/Write is linted; violations are reported back to the agent`);
  }
  // codex: point to AGENTS.md + MCP config hint
  const codexToml = join(root, '.codex', 'config.toml');
  const tomlBlock = `\n# canon design system MCP (added by canon install)\n[mcp_servers.canon]\ncommand = "node"\nargs = ${JSON.stringify([binPath, 'mcp', '--design', relDesign])}\n`;
  mkdirSync(join(root, '.codex'), { recursive: true });
  const cur = existsSync(codexToml) ? readFileSync(codexToml, 'utf8') : '';
  if (!cur.includes('[mcp_servers.canon]')) { writeFileSync(codexToml, cur + tomlBlock); log.push(`  wrote .codex/config.toml (mcp_servers.canon)`); }
  log.push('');
  log.push('Next:');
  const relDist = relative(root, dist).split(sep).join('/');
  log.push(`  1. Import the CSS once: \`import ${JSON.stringify(`./${relDist}/${system.meta.prefix}.css`)}\` (or <link>). Tailwind v4: also @import ${JSON.stringify(`./${relDist}/tailwind.theme.css`)}.`);
  log.push(`  2. Open the gallery: canon serve --design ${shellQuote(relDesign)}`);
  log.push(`  3. Agents start with DESIGN.compact.md + AGENTS.md/CLAUDE.md and retrieve relevant specs through Canon MCP or design source. Run \`canon check --design ${shellQuote(relDesign)}\` in CI.`);
  return { log };
}
