import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { realComponentPreview } from '../src/generators/react-preview.ts';
import { getAdapter } from '../src/adapters/index.ts';

test('actual React component source is bundled with a draft without writing source', async () => {
  const root = mkdtempSync(join(tmpdir(), 'canon-react-preview-'));
  try {
    mkdirSync(join(root, 'components/ui'), { recursive: true });
    symlinkSync(resolve('node_modules'), join(root, 'node_modules'));
    const file = join(root, 'components/ui/button.tsx');
    const source = `import React from 'react'; import { cva } from 'class-variance-authority'; const buttonVariants = cva('rounded-lg', { variants: { variant: { default: 'bg-primary', outline: 'border' } }, defaultVariants: { variant: 'default' } }); export function Button({variant, children}) { return <button data-slot="button" onClick={e => e.currentTarget.textContent='Clicked real React'} className={buttonVariants({variant})}>{children}</button> }`;
    writeFileSync(file, source);
    const component = { slug: 'button', file, exportName: 'Button', importPath: './components/ui/button', cva: { base: ['rounded-lg'], variants: { variant: { default: ['bg-primary'], outline: ['border'] } }, defaultVariants: { variant: 'default' }, compoundVariants: [] } };
    const html = await realComponentPreview(root, getAdapter('shadcn'), [component], { file:'', vars: {} }, 'button', {components:{ button:{...component.cva,base:['rounded-none']} },parts:{}});
    assert.match(html, /Clicked real React/);
    assert.match(html, /rounded-none/);
    assert.match(html, /data-react-gallery/);
    assert.equal(readFileSync(file,'utf8'),source);
  } finally { rmSync(root, {recursive:true,force:true}); }
});

test('full Studio drafts skip unchanged components and parts before rewriting source', async () => {
  const root = mkdtempSync(join(tmpdir(), 'canon-full-preview-'));
  try {
    symlinkSync(resolve('node_modules'), join(root, 'node_modules'));
    const file = join(root,'button.tsx');
    writeFileSync(file, `import React from 'react'; export function Button({children}) { return <button>{children}</button> }`);
    const button = {slug:'button',file,exportName:'Button',importPath:'./button',parts:[{name:'Button',classes:'',span:{start:0,end:0}}]};
    const marker = {slug:'marker',file:join(root,'must-not-read.tsx'),exportName:'Marker',importPath:'./marker',cva:{base:[''],variants:{variant:{default:['']}},defaultVariants:{variant:'default'},compoundVariants:[]}};
    const adapter = {...getAdapter('shadcn'),writeVariants(){throw Error('unchanged variants must not be rewritten')},writePart(){throw Error('unchanged parts must not be rewritten')}};
    const html = await realComponentPreview(root,adapter,[button,marker],{file:'',vars:{}},'button',{components:{marker:structuredClone(marker.cva)},parts:{button:{Button:''}}});
    assert.match(html,/data-react-gallery/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('curated compound examples render each variant on the actual CVA owner', async () => {
  const root=mkdtempSync(join(tmpdir(),'canon-variant-preview-'));
  try {
    symlinkSync(resolve('node_modules'),join(root,'node_modules'));
    const file=join(root,'group.tsx');
    writeFileSync(file,`import React from 'react'; export function ButtonGroup({orientation,children}){return <div data-slot="button-group" data-orientation={orientation}>{children}</div>}`);
    const info={slug:'button-group',file,importPath:'./group',exportName:'ButtonGroup',cvaOwner:'ButtonGroup',cva:{base:[],variants:{orientation:{horizontal:['flex-row'],vertical:['flex-col']}},defaultVariants:{orientation:'horizontal'},compoundVariants:[]}};
    const html=await realComponentPreview(root,getAdapter('shadcn'),[info],{file:'',vars:{}},'button-group');
    assert.match(html,/orientation: vertical/);
    assert.match(html,/orientation:"vertical"/);
    assert.match(html,/orientation:"horizontal"/);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('Theme overview compiles multiple real components and unsaved drafts without touching source', async () => {
  const root=mkdtempSync(join(tmpdir(),'canon-theme-preview-'));
  try {
    symlinkSync(resolve('node_modules'),join(root,'node_modules'));
    const buttonFile=join(root,'button.tsx'), badgeFile=join(root,'badge.tsx');
    const buttonSource=`import React from 'react'; import {cva} from 'class-variance-authority'; const styles=cva('rounded-lg',{variants:{variant:{default:'bg-primary',outline:'border'}},defaultVariants:{variant:'default'}}); export function Button({children,variant}){return <button data-slot="button" className={styles({variant})}>Real button: {children}</button>}`;
    const badgeSource=`import React from 'react'; export function Badge({children}){return <span data-slot="badge">Real badge: {children}</span>}`;
    writeFileSync(buttonFile,buttonSource);writeFileSync(badgeFile,badgeSource);
    const button={slug:'button',file:buttonFile,importPath:'./button',exportName:'Button',cva:{base:['rounded-lg'],variants:{variant:{default:['bg-primary'],outline:['border']}},defaultVariants:{variant:'default'},compoundVariants:[]}};
    const badge={slug:'badge',file:badgeFile,importPath:'./badge',exportName:'Badge'};
    const html=await realComponentPreview(root,getAdapter('shadcn'),[button,badge],{file:'',vars:{primary:{light:'#123456'}}},undefined,{components:{button:{...button.cva,base:['rounded-none']}},parts:{}},{mode:'theme'});
    assert.match(html,/data-preview-page="theme"/);
    assert.doesNotMatch(html,/Workspace pages/);
    assert.doesNotMatch(html,/data-theme-settings/);
    assert.match(html,/Real button:/);assert.match(html,/Real badge:/);
    assert.match(html,/rounded-none/);assert.match(html,/#123456/);
    assert.match(html,/canonPreviewReady/);
    assert.equal(readFileSync(buttonFile,'utf8'),buttonSource);assert.equal(readFileSync(badgeFile,'utf8'),badgeSource);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('Theme composes a product workspace from real library components when available', async () => {
  const root=mkdtempSync(join(tmpdir(),'canon-theme-workspace-'));
  try {
    symlinkSync(resolve('node_modules'),join(root,'node_modules'));
    const definitions=[['button','Button','button'],['card','Card','article'],['input','Input','input'],['checkbox','Checkbox','input']] as const;
    const inventory=definitions.map(([slug,name,tag])=>{
      const file=join(root,slug+'.tsx');
      writeFileSync(file,`import React from 'react'; export function ${name}({children,...props}) { return <${tag} data-slot="${slug}" data-real-component="${name}" {...props}${tag==='input'?'/>':`>{children}</${tag}>`}; }`);
      return {slug,exportName:name,file,importPath:'./'+slug};
    });
    const html=await realComponentPreview(root,getAdapter('shadcn'),inventory,{file:'',vars:{primary:{light:'#123456'}}},undefined,undefined,{mode:'theme'});
    assert.match(html,/data-theme-dashboard/);
    assert.match(html,/Brand refresh/);
    assert.match(html,/Your tasks/);
    assert.match(html,/name@company.com/);
    assert.match(html,/data-real-component/);
    assert.match(html,/theme-task-list/);
    assert.doesNotMatch(html,/theme-bars/);
    assert.doesNotMatch(html,/theme-panel\{[^}]*padding:/);
    assert.doesNotMatch(html,/theme-panel\{[^}]*box-shadow:/);
    assert.doesNotMatch(html,/theme-hero\{[^}]*background:/);
    assert.doesNotMatch(html,/Your components, together/);
    assert.doesNotMatch(html,/data-theme-component/);
    assert.match(html,/canonPreviewReady/);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('form states preserve real control props and give every repeated label a unique target', async () => {
  const root=mkdtempSync(join(tmpdir(),'canon-form-states-'));
  try {
    symlinkSync(resolve('node_modules'),join(root,'node_modules'));
    const file=join(root,'checkbox.tsx');
    writeFileSync(file,`import React from 'react'; export function Checkbox(props){return <input type="checkbox" data-slot="checkbox" {...props}/>}`);
    const checkbox={slug:'checkbox',exportName:'Checkbox',file,importPath:'./checkbox'};
    const html=await realComponentPreview(root,getAdapter('shadcn'),[checkbox],{file:'',vars:{}},'checkbox');
    for(const state of ['normal','focus','error','disabled']) assert.match(html,new RegExp('"data-preview-state":"'+state+'"'));
    assert.match(html,/"aria-invalid":"true"/);
    assert.match(html,/disabled:!0/);
    for(let index=0;index<4;index++){
      assert.match(html,new RegExp('id:"story-checkbox-checkbox-'+index+'"'));
      assert.match(html,new RegExp('htmlFor:"story-checkbox-checkbox-'+index+'"'));
    }
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('Typography composes project fonts without creating saved typography tokens', async () => {
  const root=mkdtempSync(join(tmpdir(),'canon-typography-preview-'));
  try {
    const html=await realComponentPreview(root,getAdapter('shadcn'),[],{file:'',vars:{'font-sans':{light:'Georgia, serif'},'font-heading':{light:'system-ui'},'font-mono':{light:'monospace'}},utilityTheme:{'text-brand':'2.3rem','leading-copy':'1.7','tracking-brand':'.01em','font-weight-brand':'650'}},undefined,undefined,{mode:'typography'});
    assert.match(html,/data-preview-page="typography"/);
    for(const name of ['font-sans','font-heading','font-mono','text-brand','leading-copy','tracking-brand','font-weight-brand']) assert.match(html,new RegExp('data-type-token="'+name+'"'));
    assert.match(html,/font-size:var\(--text-brand\)/);
    assert.match(html,/data-theme-token-value="font-sans">Georgia, serif/);
    assert.match(html,/data-type-heading/);
    assert.match(html,/data-type-code/);
    assert.match(html,/font-family:var\(--font-heading,var\(--font-sans,inherit\)\)/);
    assert.match(html,/Your project fonts, in context/);
    const empty=await realComponentPreview(root,getAdapter('shadcn'),[],{file:'',vars:{}},undefined,undefined,{mode:'typography'});
    assert.match(empty,/No typography tokens are declared/);
    assert.doesNotMatch(empty,/data-type-token=/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
