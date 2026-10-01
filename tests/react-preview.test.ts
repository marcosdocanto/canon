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
