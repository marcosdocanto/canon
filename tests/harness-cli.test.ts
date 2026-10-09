import { test } from 'node:test';
import assert from 'node:assert/strict';
import { symlinkSync, realpathSync, mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const cli = fileURLToPath(new URL('../bin/canon.js', import.meta.url));
function fixture(t: any) { const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon-harness-cli-'))); t.after(() => rmSync(root, {recursive:true, force:true})); return root; }
function run(root: string, ...args: string[]) { return spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8'}); }
function config(root: string) { writeFileSync(join(root,'canon.config.json'), JSON.stringify({schemaVersion:1,context:{documents:[],skills:[]},checks:[{id:'unit',command:[process.execPath,'-e','console.log("verified")']}],scenarios:[],completion:{requiredChecks:['unit'],requiredScenarios:[]}})); }

test('harness init previews a generic project without writing files', t => {
 const root=fixture(t); writeFileSync(join(root,'package.json'),JSON.stringify({scripts:{test:'node --test',dev:'vite'}})); writeFileSync(join(root,'PRODUCT.md'),'Product rules');
 const result=run(root,'harness','init'); assert.equal(result.status,0,result.stderr); assert.match(result.stdout,/dry run/i); assert.match(result.stdout,/PRODUCT.md/); assert.match(result.stdout,/npm/); assert.equal(existsSync(join(root,'canon.config.json')),false);
});
test('harness init apply preserves existing configuration and unrelated context', t => {
 const root=fixture(t); const original='# Team rules\n\n<!-- canon:start -->\nExisting Canon context\n<!-- canon:end -->\n'; writeFileSync(join(root,'AGENTS.md'),original); writeFileSync(join(root,'PRODUCT.md'),'Product rules');
 let result=run(root,'harness','init','--apply','--url','http://localhost:4321'); assert.equal(result.status,0,result.stderr);
 const policy=readFileSync(join(root,'canon.config.json'),'utf8'); assert.equal(JSON.parse(policy).scenarios[0].path,'/'); const instructions=readFileSync(join(root,'AGENTS.md'),'utf8'); assert.ok(instructions.includes(original.trim())); assert.match(instructions,/PRODUCT.md/); assert.match(instructions,/canon verify/);
 result=run(root,'harness','init','--apply','--url','http://localhost:9999'); assert.equal(result.status,0,result.stderr); assert.equal(readFileSync(join(root,'canon.config.json'),'utf8'),policy); assert.equal(readFileSync(join(root,'AGENTS.md'),'utf8'),instructions);
});
test('harness doctor identifies missing config without requiring a design system', t => {
 const root=fixture(t); const result=run(root,'harness','doctor','--json'); assert.equal(result.status,1); const value=JSON.parse(result.stdout); assert.equal(value.ok,false); assert.match(value.errors.join(' '),/canon.config.json/);
});
test('verify and report use closest harness policy and expose fresh then stale evidence', t => {
 const root=fixture(t); config(root); writeFileSync(join(root,'app.js'),'v1'); mkdirSync(join(root,'nested')); mkdirSync(join(root,'.canon')); writeFileSync(join(root,'.canon','project.json'),JSON.stringify({schemaVersion:1,design:'missing-design'}));
 let result=run(join(root,'nested'),'verify','--json'); assert.equal(result.status,0,result.stderr); const report=JSON.parse(result.stdout); assert.equal(report.ready,true); assert.equal(report.root,root);
 result=run(root,'report','--format','markdown'); assert.equal(result.status,0,result.stderr); assert.match(result.stdout,/unit/);
 writeFileSync(join(root,'app.js'),'v2'); result=run(root,'report','--json'); assert.equal(result.status,1,result.stderr); const stale=JSON.parse(result.stdout); assert.equal(stale.ready,false); assert.equal(stale.stale,true);
});
test('harness MCP exposes policy and report read tools without design dependencies', t => {
 const root=fixture(t); config(root);
 const request=[{jsonrpc:'2.0',id:1,method:'initialize',params:{}},{jsonrpc:'2.0',id:2,method:'tools/list',params:{}},{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'harness_policy',arguments:{}}}].map(x=>JSON.stringify(x)).join('\n')+'\n';
 const result=spawnSync(process.execPath,[cli,'harness','mcp'],{cwd:root,encoding:'utf8',input:request}); assert.equal(result.status,0,result.stderr); const messages=result.stdout.trim().split('\n').map(x=>JSON.parse(x)); assert.deepEqual(messages.find(x=>x.id===2).result.tools.map((x:any)=>x.name),['harness_policy','harness_doctor','harness_report']); assert.match(messages.find(x=>x.id===3).result.content[0].text,/unit/);
});
test('init selects the declared package manager or detected lockfile for checks', t => {
 for (const manager of ['pnpm','yarn','bun']) {
  const root=fixture(t); writeFileSync(join(root,'package.json'),JSON.stringify({packageManager:`${manager}@1.0.0`,scripts:{test:'runner'}}));
  const result=run(root,'harness','init','--apply'); assert.equal(result.status,0,result.stderr); assert.deepEqual(JSON.parse(readFileSync(join(root,'canon.config.json'),'utf8')).checks[0].command,[manager,'run','test']);
 }
 const root=fixture(t); writeFileSync(join(root,'package.json'),JSON.stringify({scripts:{lint:'linter'}}));writeFileSync(join(root,'pnpm-lock.yaml'),'lockfileVersion: 9');assert.equal(run(root,'harness','init','--apply').status,0);assert.equal(JSON.parse(readFileSync(join(root,'canon.config.json'),'utf8')).checks[0].command[0],'pnpm');
});
test('init preflights malformed and duplicate markers before writing any file', t => {
 for (const invalid of ['<!-- canon:harness:start -->\nbroken', '<!-- canon:harness:start --><!-- canon:harness:end --><!-- canon:harness:start --><!-- canon:harness:end -->']) {
  const root=fixture(t); writeFileSync(join(root,'AGENTS.md'),'Team rules\n'); writeFileSync(join(root,'CLAUDE.md'),invalid); const result=run(root,'harness','init','--apply'); assert.equal(result.status,1); assert.equal(readFileSync(join(root,'AGENTS.md'),'utf8'),'Team rules\n'); assert.equal(readFileSync(join(root,'CLAUDE.md'),'utf8'),invalid);assert.equal(existsSync(join(root,'canon.config.json')),false);assert.equal(existsSync(join(root,'.gitignore')),false);
 }
});
test('init refuses linked destinations without modifying configuration or external files', t => {
 for(const target of ['AGENTS.md','CLAUDE.md','.gitignore','canon.config.json']) {
  const root=fixture(t);const outside=fixture(t);const path=join(outside,'target');writeFileSync(path,target==='canon.config.json'?JSON.stringify({schemaVersion:1,context:{documents:[],skills:[]},checks:[],scenarios:[],completion:{requiredChecks:[],requiredScenarios:[]}}):'External instructions\n');const original=readFileSync(path,'utf8');symlinkSync(path,join(root,target));
  const result=run(root,'harness','init','--apply'); assert.equal(result.status,1,`${target}: ${result.stdout}`);assert.equal(readFileSync(path,'utf8'),original);if(target!=='canon.config.json')assert.equal(existsSync(join(root,'canon.config.json')),false);if(target!=='AGENTS.md')assert.equal(existsSync(join(root,'AGENTS.md')),false);
 }
});
