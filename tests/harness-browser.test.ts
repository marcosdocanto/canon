import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureScenarios, resolvePlaywright } from '../src/harness/browser.ts';
function fixture(t:any) { const root=mkdtempSync(join(tmpdir(),'canon-browser-')); t.after(()=>rmSync(root,{recursive:true,force:true})); return root; }
const scenario={id:'home',path:'/',viewports:[{name:'desktop',width:800,height:600}],readySelector:'h1'};
test('Playwright resolution prefers the target project installation', async t=>{
 const root=fixture(t); const pkg=join(root,'node_modules','playwright'); mkdirSync(pkg,{recursive:true}); writeFileSync(join(pkg,'package.json'),JSON.stringify({name:'playwright',main:'index.cjs'})); writeFileSync(join(pkg,'index.cjs'),'module.exports={chromium:{marker:"target"}}');
 const api=await resolvePlaywright(root); assert.equal((api.chromium as any).marker,'target');
});
test('unreachable application produces failed captures with actionable errors',async t=>{
 const root=fixture(t); const runDir=join(root,'run'); mkdirSync(runDir); const server=createServer(); await new Promise<void>(r=>server.listen(0,'127.0.0.1',r)); const port=(server.address() as any).port; await new Promise<void>(r=>server.close(()=>r()));
 const results=await captureScenarios({root,runDir,config:{schemaVersion:1,context:{documents:[],skills:[]},checks:[],completion:{requiredChecks:[],requiredScenarios:['home']},app:{url:`http://127.0.0.1:${port}`,readyTimeoutMs:100},scenarios:[scenario]}});
 assert.equal(results[0].status,'failed'); assert.match(results[0].error!,/unreachable|ready/i); assert.equal(results[0].path,undefined);
});
// This test belongs in the Chromium suite: removing real navigation or screenshot writing must fail it.
test('captures the live route at each configured viewport and leaves a reused server running',async t=>{
 const root=fixture(t); const runDir=join(root,'run'); mkdirSync(runDir); const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html'); if(req.url==='/missing'){res.statusCode=404;res.end('Missing');return;} res.end('<h1>Working application</h1>');}); await new Promise<void>(r=>server.listen(0,'127.0.0.1',r)); t.after(()=>server.close()); const url=`http://127.0.0.1:${(server.address() as any).port}`;
 const results=await captureScenarios({root,runDir,config:{schemaVersion:1,context:{documents:[],skills:[]},checks:[],completion:{requiredChecks:[],requiredScenarios:['home']},app:{url},scenarios:[{...scenario,viewports:[...scenario.viewports,{name:'phone',width:390,height:844}]},{...scenario,id:'missing',path:'/missing'}]}});
 assert.equal(results.length,3); assert.equal(results[0].status,'captured',results[0].error); assert.equal(results[1].status,'captured',results[1].error); assert.ok(existsSync(join(runDir,results[0].path!))); assert.equal(results[2].status,'failed'); assert.match(results[2].error!,/404/); assert.equal((await fetch(url)).status,200);
});
test('starts a configured app and stops only its owned process after capture',async t=>{
 const root=fixture(t); const runDir=join(root,'run'); mkdirSync(runDir);
 const reservation=createServer(); await new Promise<void>(r=>reservation.listen(0,'127.0.0.1',r)); const port=(reservation.address() as any).port; await new Promise<void>(r=>reservation.close(()=>r()));
 const app=join(root,'server.cjs'); writeFileSync(app,`require('node:fs').writeFileSync(${JSON.stringify(join(root,'pid'))},String(process.pid));require('node:http').createServer((req,res)=>res.end('<h1>Owned</h1>')).listen(${port},'127.0.0.1');`);
 const results=await captureScenarios({root,runDir,config:{schemaVersion:1,context:{documents:[],skills:[]},checks:[],completion:{requiredChecks:[],requiredScenarios:['home']},app:{url:`http://127.0.0.1:${port}`,start:[process.execPath,app],readyTimeoutMs:5000},scenarios:[scenario]}});
 assert.equal(results[0].status,'captured',results[0].error); await assert.rejects(fetch(`http://127.0.0.1:${port}`));
});
test('scenario and viewport names cannot collide in screenshot artifact paths',async t=>{
 const root=fixture(t); const runDir=join(root,'run'); mkdirSync(runDir); const server=createServer((req,res)=>res.end('<h1>Capture</h1>')); await new Promise<void>(r=>server.listen(0,'127.0.0.1',r)); t.after(()=>server.close());
 const results=await captureScenarios({root,runDir,config:{schemaVersion:1,context:{documents:[],skills:[]},checks:[],completion:{requiredChecks:[],requiredScenarios:['a-b','a']},app:{url:`http://127.0.0.1:${(server.address() as any).port}`},scenarios:[{...scenario,id:'a-b',viewports:[{name:'c',width:800,height:600}]},{...scenario,id:'a',viewports:[{name:'b-c',width:390,height:844}]}]}});
 assert.equal(results[0].status,'captured',results[0].error); assert.notEqual(results[0].path,results[1].path);
});
test('an existing HTTP error response never starts a competing application process',async t=>{
 const root=fixture(t); const runDir=join(root,'run'); mkdirSync(runDir); const marker=join(root,'started'); const server=createServer((req,res)=>{res.statusCode=500;res.end('Application error');}); await new Promise<void>(r=>server.listen(0,'127.0.0.1',r)); t.after(()=>server.close());
 const results=await captureScenarios({root,runDir,config:{schemaVersion:1,context:{documents:[],skills:[]},checks:[],completion:{requiredChecks:[],requiredScenarios:['home']},app:{url:`http://127.0.0.1:${(server.address() as any).port}`,start:[process.execPath,'-e',`require('node:fs').writeFileSync(${JSON.stringify(marker)},'started')`],readyTimeoutMs:1000},scenarios:[scenario]}});
 assert.equal(existsSync(marker),false); assert.equal(results[0].status,'failed'); assert.match(results[0].error!,/500/);
});
test('font readiness is bounded by the configured application timeout',async t=>{
 const root=fixture(t); const runDir=join(root,'run'); mkdirSync(runDir); const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end("<script>Object.defineProperty(document.fonts,'ready',{get:()=>new Promise(()=>{})})</script><h1>Fonts pending</h1>");}); await new Promise<void>(r=>server.listen(0,'127.0.0.1',r)); t.after(()=>server.close()); const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),5000);t.after(()=>clearTimeout(timer));
 const results=await captureScenarios({root,runDir,signal:controller.signal,config:{schemaVersion:1,context:{documents:[],skills:[]},checks:[],completion:{requiredChecks:[],requiredScenarios:['home']},app:{url:`http://127.0.0.1:${(server.address() as any).port}`,readyTimeoutMs:1500},scenarios:[scenario]}});
 assert.equal(results[0].status,'failed');assert.match(results[0].error!,/font readiness exceeded \d+ms/i);
});
