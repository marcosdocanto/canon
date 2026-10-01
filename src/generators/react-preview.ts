// Browser-only compilation of the connected project's real React components. Drafts are
// adapter-generated virtual source buffers; neither project files nor bundles are written.
import { createRequire } from 'node:module';

import { readFileSync, realpathSync } from 'node:fs';
import { dirname, extname } from 'node:path';
import type { Adapter, ComponentInfo, CvaSpec, LibraryTheme } from '../adapters/types.ts';
import { catalogStory, exclusionReason } from './story-catalog.ts';
import { escapeHtml, previewHtml } from './preview-lib.ts';

interface Draft { components: Record<string, CvaSpec>; parts: Record<string, Record<string,string>>; }
const LEAVES = new Set(['button', 'badge', 'input', 'textarea', 'label', 'separator', 'skeleton', 'progress']);

export async function realComponentPreview(root: string, adapter: Adapter, inventory: ComponentInfo[], theme: LibraryTheme, slug: string | undefined, draft: Draft = { components:{}, parts:{} }): Promise<string> {
  if (slug && !inventory.some(c => c.slug === slug)) throw new Error(`Unknown component: ${slug}`);
  const info = inventory.find(c => c.slug === slug) ?? inventory.find(c => c.slug === 'button') ?? inventory[0];
  const require = createRequire(root + '/package.json');
  let extraCss = readFileSync(new URL('../vendor/shadcn-variants.css',import.meta.url),'utf8');
  try { extraCss += readFileSync(require.resolve('tw-animate-css'),'utf8'); } catch {}
  const shell = (body: string) => previewHtml(theme, []).replace('<style type="text/tailwindcss">', '<style type="text/tailwindcss">' + extraCss.replace(/</g,'\\3c ')).replace(/<body>[\s\S]*?<\/body>/, () => `<body>${body}</body>`);
  if (!info) return shell('<p role="status">No components were found in this project.</p>');
  const reason = exclusionReason(info, root);
  const catalog = catalogStory(info, root, s => inventory.find(c => c.slug === s));
  const spec = draft.components[info.slug] ?? info.cva;
  const owner = info.cvaOwner;
  const variants = catalog && spec && owner ? Object.entries(spec.variants).flatMap(([axis,options]) => Object.keys(options).map(value => ({title:axis + ': ' + value,jsx:catalog.jsx.replace(new RegExp('<'+owner+'(?=[\\s/>])([^>]*)(>)','g'),(_tag,attrs,end) => '<'+owner+' '+axis+'={'+JSON.stringify(value === 'true' ? true : value === 'false' ? false : value)+'}'+attrs.replace(new RegExp('\\s'+axis+'=(?:"[^"]*"|\\{[^}]*\\})','g'),'')+end)}))) : [];
  const examples = catalog ? [{title:'Example',jsx:catalog.jsx},...variants] : LEAVES.has(info.slug) ? adapter.renderSpec({...info,cva:draft.components[info.slug] ?? info.cva}).filter(e => !e.jsx.includes('…')) : [];
  const title = `<header style="margin-bottom:24px"><h1 style="font-size:20px;font-weight:600">${escapeHtml(info.exportName)}</h1><p style="font-size:13px;opacity:.65">Live React component · Changes apply to the shared source when saved</p></header>`;
  if (reason || !examples.length) return shell(`${title}<p role="status">No complete preview is available for this component yet.${reason ? ` ${escapeHtml(reason)}` : ''}</p>`);
  const virtual = new Map<string,string>();
  for (const c of inventory) {
    const spec = draft.components[c.slug];
    const changedSpec = spec && JSON.stringify(spec) !== JSON.stringify(c.cva);
    const changedParts = Object.entries(draft.parts[c.slug] ?? {}).filter(([name,classes]) => c.parts?.find(p => p.name === name)?.classes !== classes);
    if (!changedSpec && !changedParts.length) continue;
    let source = readFileSync(c.file,'utf8');
    if (changedSpec) source = adapter.writeVariants(c,spec,source).content.toString();
    for (const [name,classes] of changedParts) source = adapter.writePart(c,name,classes,source).content.toString();
    virtual.set(realpathSync(c.file),source);
  }
  const imports = [`import * as React from 'react'; import {createRoot} from 'react-dom/client';`, `import {${[...new Set([info.exportName,...(catalog?.ownNames ?? [])])].join(',')}} from ${JSON.stringify(info.file)};`];
  for (const item of catalog?.imports ?? []) {
    const component = inventory.find(c => c.importPath === item.path);
    imports.push(`import {${item.names.join(',')}} from ${JSON.stringify(component?.file ?? item.path)};`);
  }
  const slots = Object.fromEntries(inventory.flatMap(c => [{name:c.exportName,span:undefined,readOnlyReason:undefined},...(c.parts ?? [])].map(p => [p.name.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase(),{slug:c.slug,part:p.span && !p.readOnlyReason && !(c.cva && p.name === c.cvaOwner) ? p.name : undefined,cva:p.name === (c.cvaOwner ?? c.exportName) ? c.cva : undefined}])));
  // data-slot originates in the real component implementation, so it survives portals and
  // identifies nested sibling components without replacing their behavior with mock markup.
  const entry = `${imports.join('\n')}
class Boundary extends React.Component { state={error:null}; static getDerivedStateFromError(error){return {error:String(error.message||error)}} render(){return this.state.error ? <div role="alert" style={{padding:24,border:'1px solid #dc2626',borderRadius:8}}><strong>Component could not render</strong><p>{this.state.error}</p></div> : this.props.children} }
function Example(){return <><h1 style={{fontSize:20,fontWeight:600}}>${info.exportName}</h1><p style={{fontSize:13,opacity:.65,marginBottom:24}}>Live React component · Changes apply to the shared source when saved</p>${examples.map(e => `<section data-slug=${JSON.stringify(info.slug)} data-picks={${JSON.stringify(JSON.stringify(Object.fromEntries(e.title.includes(": ") ? [e.title.split(": ")] : [])))}} style={{marginBottom:32}}><h2 style={{fontSize:12,opacity:.65,marginBottom:12}}>${escapeHtml(e.title)}</h2><Boundary>${e.jsx}</Boundary></section>`).join('\n')}</>}
createRoot(document.getElementById('react-gallery')).render(<Example/>);
const slots=${JSON.stringify(slots)};
function annotate(){document.querySelectorAll('[data-slot]').forEach(el=>{const m=slots[el.dataset.slot];if(m){el.dataset.inspect=m.slug;if(m.part)el.dataset.part=m.part;if(m.cva){let picks={};try{picks=JSON.parse(el.closest('[data-picks]')?.dataset.picks||'{}')}catch{}for(const axis of Object.keys(m.cva.variants)){const value=el.getAttribute('data-'+axis);if(value&&Object.hasOwn(m.cva.variants[axis],value))picks[axis]=value}el.dataset.picks=JSON.stringify(picks);}}})}
new MutationObserver(annotate).observe(document.body,{childList:true,subtree:true}); annotate();
`;
  const { build } = await import('esbuild');
  const result = await build({ stdin:{contents:entry,loader:'tsx',resolveDir:root,sourcefile:'canon-react-preview.tsx'},bundle:true,write:false,outfile:'canon-preview.js',format:'iife',platform:'browser',jsx:'automatic',target:'es2022',minify:true,logLevel:'silent',define:{'process.env.NODE_ENV':'"development"'}, plugins:[{name:'canon-draft',setup(builder){builder.onLoad({filter:/\.[cm]?[jt]sx?$/},args=>{const contents=virtual.get(realpathSync(args.path));if(contents===undefined)return;return {contents,loader:extname(args.path).includes('tsx')?'tsx':extname(args.path).includes('ts')?'ts':'jsx',resolveDir:dirname(args.path)};});}}] });
  const js = result.outputFiles.find(f=>f.path.endsWith('.js')) ?? result.outputFiles[0];
  const css = result.outputFiles.find(f=>f.path.endsWith('.css'));
  return shell(`${css ? `<style>${css.text.replace(/</g,'\\3c ')}</style>` : ''}<div id="react-gallery" data-react-gallery style="padding:8px;min-height:200px"></div><script>${js.text.replace(/<\/script/gi,'<\\/script')}</script>`);
}
