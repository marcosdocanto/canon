import { createInterface } from 'node:readline';
import { loadHarnessConfig } from './config.ts';
import { inspectHarness } from './commands.ts';
import { readHarnessReport } from './report.ts';
import { VERSION } from '../version.ts';

/** Read-only: tools cannot run checks or manufacture a pass result. */
export async function startHarnessMcp(root: string) {
  const tools = [
    {name:'harness_policy',description:'Read the configured project documents, skills, checks, scenarios and completion requirements.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
    {name:'harness_doctor',description:'Inspect harness configuration and locally installed browser tooling without executing checks.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
    {name:'harness_report',description:'Read a recorded report and revalidate source, configuration and artifact freshness. Missing or stale evidence is not a pass.',inputSchema:{type:'object',properties:{runId:{type:'string'}},additionalProperties:false}},
  ];
  const lines=createInterface({input:process.stdin});
  for await (const line of lines) {
    let request: any;
    try {request=JSON.parse(line);} catch {process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON'}})+'\n');continue;}
    if(request.id===undefined)continue;
    const send=(result:unknown)=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\n');
    try {
      if(request.method==='initialize') send({protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'canon-harness',version:VERSION}});
      else if(request.method==='ping')send({});
      else if(request.method==='tools/list')send({tools});
      else if(request.method==='tools/call') {
        let value:unknown;
        switch(request.params?.name) {
          case 'harness_policy':value=await loadHarnessConfig(root);break;
          case 'harness_doctor':value=await inspectHarness(root);break;
          case 'harness_report':value=await readHarnessReport(root,request.params?.arguments?.runId);break;
          default:throw new Error(`Unknown tool: ${request.params?.name}`);
        }
        send({content:[{type:'text',text:JSON.stringify(value,null,2)}]});
      } else process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Method not found'}})+'\n');
    } catch(error) {send({isError:true,content:[{type:'text',text:(error as Error).message}]});}
  }
}
