import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { HARNESS_CONFIG, loadHarnessConfig, doctorHarness, validateHarnessConfig } from './config.ts';
import { captureScenarios, resolvePlaywright } from './browser.ts';
import { installFiles, sourcePath, type Write } from '../design-files.ts';
import type { HarnessConfig } from './types.ts';

const begin = '<!-- canon:harness:start -->';
const end = '<!-- canon:harness:end -->';
function contextWrites(root: string, config: HarnessConfig): Write[] {
  const writes: Write[] = [];
  const references = [...config.context.documents.map(path => `- Project document: ${JSON.stringify(path)}`), ...config.context.skills.map(path => `- Project skill: ${JSON.stringify(path)}`)];
  const block = `${begin}\n## Canon verification contract\n\nRead \`${HARNESS_CONFIG}\` for this project's checks, browser scenarios and completion requirements. Read the following configured sources before implementation; project instructions take precedence over generic design preferences.\n${references.length ? '\n' + references.join('\n') + '\n' : '\nNo additional documents or skills are configured.\n'}\nRun \`canon harness doctor\` to inspect configuration. Run \`canon verify\` after changes, fix failures within the authorized task, and use \`canon report --format markdown\` for review evidence. A report is ready only for the recorded source/configuration and required evidence; rerun verification after changes. Captures prove only the configured pages were rendered, not visual correctness or full accessibility. Preserve existing design-library instructions.\n${end}`;
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const path = join(root,name); const previous = existsSync(path) ? readFileSync(path,'utf8') : '';
    const start = previous.indexOf(begin); const finish = previous.indexOf(end);
    if (previous.split(begin).length > 2 || previous.split(end).length > 2 || (start < 0) !== (finish < 0) || (start >= 0 && finish < start)) throw new Error(`Malformed managed harness block in ${name}; repair its markers before applying.`);
    const next = start >= 0 ? previous.slice(0,start)+block+previous.slice(finish+end.length) : previous + (previous && !previous.endsWith('\n') ? '\n' : '') + (previous ? '\n' : '') + block+'\n';
    if (next !== previous) writes.push({path,content:Buffer.from(next)});
  }
  const ignore = join(root,'.gitignore'); const previous = existsSync(ignore) ? readFileSync(ignore,'utf8') : '';
  if (!previous.split(/\r?\n/).includes('/.canon/runs/')) writes.push({path:ignore,content:Buffer.from(`${previous}${previous && !previous.endsWith('\n') ? '\n' : ''}/.canon/runs/\n`)});
  return writes;
}

async function initHarness(root: string, apply: boolean, url?: string) {
  const configPath = join(root,HARNESS_CONFIG);
  for (const name of [HARNESS_CONFIG, 'AGENTS.md', 'CLAUDE.md', '.gitignore']) {
    try { sourcePath(root, join(root,name), 'file'); }
    catch (error) { throw new Error(`Cannot initialize harness: ${name} must be a regular file inside the project. ${(error as Error).message}`); }
  }
  let config: HarnessConfig;
  const existing = existsSync(configPath);
  if (existing) config = (await loadHarnessConfig(root)).config;
  else {
    const pkg = existsSync(join(root,'package.json')) ? JSON.parse(readFileSync(join(root,'package.json'),'utf8')) : {};
    const scripts: Record<string,unknown> = pkg.scripts ?? {};
    const declared = typeof pkg.packageManager === 'string' ? pkg.packageManager.split('@')[0] : undefined;
    const lockfiles = [['pnpm','pnpm-lock.yaml'],['yarn','yarn.lock'],['bun','bun.lock'],['bun','bun.lockb'],['npm','package-lock.json']];
    const manager = ['npm','pnpm','yarn','bun'].includes(declared) ? declared : lockfiles.find(([,file]) => existsSync(join(root,file)))?.[0] ?? 'npm';
    const checks = ['typecheck','lint','test','build'].filter(id=> typeof scripts[id] === 'string').map(id=>({id,command:[manager,'run',id]}));
    config = validateHarnessConfig({schemaVersion:1,context:{documents:['PRODUCT.md','DESIGN.md','DESIGN.compact.md','CONTRIBUTING.md'].filter(path=>existsSync(join(root,path))),skills:['.agents/skills/design-system/SKILL.md','.claude/skills/design-system/SKILL.md'].filter(path=>existsSync(join(root,path)))},checks,scenarios:url ? [{id:'home',path:'/',viewports:[{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]}] : [],completion:{requiredChecks:checks.map(check=>check.id),requiredScenarios:url ? ['home'] : []},...(url ? {app:{url}} : {})});
  }
  const writes = contextWrites(root,config);
  if (!existing) writes.unshift({path:configPath,content:Buffer.from(JSON.stringify(config,null,2)+'\n')});
  if (apply) installFiles(root,writes);
  console.log(`${existing ? 'Preserve' : apply ? 'Created' : 'Proposed'} ${configPath}\n${JSON.stringify(config,null,2)}`);
  console.log(apply ? 'Applied managed harness context to AGENTS.md and CLAUDE.md; run artifacts are ignored by Git.' : 'Dry run — nothing was written. Use --apply to create configuration and managed context.');
  if (!config.checks.length && !config.scenarios.length) console.log('No checks or scenarios detected. Configure at least one required check or scenario before verification can be ready.');
  return 0;
}

export async function inspectHarness(root: string) {
  const result = await doctorHarness(root);
  if (result.ok) {
    const {config} = await loadHarnessConfig(root);
    if (config.scenarios.length) {
      try {
        const api = await resolvePlaywright(result.root);
        if (typeof api.chromium?.executablePath !== 'function' || !existsSync(api.chromium.executablePath())) result.errors.push("Chromium is not installed. Run the target project's local playwright install chromium command.");
      } catch (error) { result.errors.push((error as Error).message); }
    }
  }
  result.ok = result.errors.length === 0;
  return result;
}

export async function runHarnessCommand(command: string, args: string[]): Promise<number> {
  const has = (name:string)=>args.includes(`--${name}`);
  const flag = (name:string) => {const index=args.findIndex(a=>a===`--${name}`||a.startsWith(`--${name}=`)); if(index<0)return undefined; const value=args[index].includes('=')?args[index].slice(args[index].indexOf('=')+1):args[index+1]; if(!value||value.startsWith('--'))throw new Error(`--${name} requires a value`); return value;};
  const root=realpathSync(resolve(flag('root') ?? process.cwd()));
  if(command==='harness') {
    if(args[0]==='init') return initHarness(root,has('apply'),flag('url'));
    if(args[0]==='doctor') {const result=await inspectHarness(root); console.log(has('json')?JSON.stringify(result,null,2):[result.ok?'Harness configuration is valid.':'Harness configuration has problems.',...result.errors.map(x=>`Error: ${x}`),...result.warnings.map(x=>`Warning: ${x}`)].join('\n'));return result.ok?0:1;}
    if(args[0]==='mcp') {const {startHarnessMcp}=await import('./mcp.ts');await startHarnessMcp(root);return 0;}
    console.error('Usage: canon harness init [--apply] [--url <url>] | doctor [--json] | mcp [--root <path>]'); return 2;
  }
  const {readHarnessReport,renderHarnessMarkdown,renderHarnessHtml}=await import('./report.ts');
  let report;
  if(command==='verify') {
    const {verifyHarness}=await import('./runner.ts');
    const controller=new AbortController(); const abort=()=>controller.abort(new Error('Verification interrupted'));
    process.on('SIGINT',abort);process.on('SIGTERM',abort);
    try {report=await verifyHarness(root,{capture:captureScenarios,signal:controller.signal});}
    finally {process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
  } else {
    const positional=args.filter((arg,index)=>!arg.startsWith('--') && !(index>0 && ['--root','--format'].includes(args[index-1])));
    report=await readHarnessReport(root,positional[0]);
  }
  const format=has('json')?'json':flag('format') ?? (command==='report'?'markdown':'text');
  if(format==='json') console.log(JSON.stringify(report,null,2));
  else if(format==='markdown') console.log(renderHarnessMarkdown(report));
  else if(format==='html') console.log(renderHarnessHtml(report));
  else if(format==='text') console.log(`${report.ready?'Ready':'Not ready'}${report.stale?' (stale)':''}: ${report.runId}\n${report.errors.join('\n')}\nEvidence: ${report.runDir}\nRead details: canon report ${report.runId}`);
  else {console.error(`Unknown report format: ${format}`);return 2;}
  return report.ready?0:1;
}
