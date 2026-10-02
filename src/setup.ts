import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const SETUP_HELP = `Install the Canon skill for your coding agent.

Usage
  npx canon-ds@latest setup
  npx canon-ds@latest setup --agent codex --yes
  npx canon-ds@latest setup --agent claude-code cursor --global --yes

Options
  --agent <agents...>  Choose agents; otherwise select them interactively
  --global            Install for your user instead of a single project
  --root <directory>  Use this directory for a project installation
  --yes               Skip prompts; requires an explicit --agent
  --help              Show this help

The installer lets you choose project or global scope. With --yes, scope
defaults to the current directory unless --global or --root is specified.
It copies the skill included in this Canon version, so it survives npm cache
cleanup. Run setup again to update that copy; it does not update automatically.

After installation, reload your agent if needed and ask it to use Canon:
  Existing project: connect this shadcn/ui project; preserve its components and theme.
  New project: build a local app in a new folder with shadcn/ui.

Setup installs the entry skill only. Your agent connects the project when asked;
setup does not initialize a library, change its theme or rebuild the app.
`;

export function setup(args: string[]): number {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(SETUP_HELP);
    return 0;
  }
  const options: string[] = [];
  let root = process.cwd();
  let explicitRoot = false;
  let global = false;
  let yes = false;
  let agentCount = 0;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--agent') {
      const agents: string[] = [];
      while (args[i + 1] && !args[i + 1].startsWith('-')) {
        const agent = args[++i];
        if (!/^[a-z][a-z0-9-]*$/.test(agent)) throw new Error(`Invalid agent name: ${agent}`);
        agents.push(agent);
      }
      if (!agents.length) throw new Error('--agent requires an agent name, such as codex or claude-code.');
      options.push('--agent', ...agents);
      agentCount += agents.length;
    } else if (arg === '--global') {
      global = true;
      options.push('--global');
    } else if (arg === '--yes') {
      yes = true;
      options.push('--yes');
    } else if (arg === '--root') {
      const directory = args[++i];
      if (!directory || directory.startsWith('-')) throw new Error('--root requires a directory.');
      root = resolve(directory);
      explicitRoot = true;
    } else {
      throw new Error(`Unknown setup option: ${arg}. Run canon setup --help.`);
    }
  }
  if (yes && !agentCount) throw new Error('--yes requires --agent so setup only installs for the agents you choose.');
  if (global && explicitRoot) throw new Error('Choose either --global or --root, not both.');
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`Setup directory does not exist: ${root}`);
  const skill = fileURLToPath(new URL('../skills/canon', import.meta.url));
  if (!existsSync(resolve(skill, 'SKILL.md'))) throw new Error('The packaged Canon skill is missing. Reinstall canon-ds.');
  const installer = createRequire(import.meta.url).resolve('skills/bin/cli.mjs');
  console.log('Canon setup · install the included skill for your coding agent.');
  console.log('Your application components and theme stay unchanged.\n');
  const result = spawnSync(process.execPath, [installer, 'add', skill, '--skill', 'canon', '--copy', ...options], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  // Keep installer cancellation/failure visible; never claim a successful install
  // merely because the interactive process returned.
  return result.status ?? 1;
}
