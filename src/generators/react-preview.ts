// Browser-only compilation of the connected project's real React components. Drafts are
// adapter-generated virtual source buffers; neither project files nor bundles are written.
import { createRequire } from 'node:module';

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, extname } from 'node:path';
import type { Adapter, ComponentInfo, CvaSpec, LibraryTheme } from '../adapters/types.ts';
import { catalogStory, exclusionReason } from './story-catalog.ts';
import { escapeHtml, previewHtml } from './preview-lib.ts';
import { parseParts } from '../adapters/shadcn/parts.ts';
import { findCva, parseCva, spliceCva } from '../adapters/shadcn/cva.ts';

interface Draft { components: Record<string, CvaSpec>; parts: Record<string, Record<string,string>>; }
const LEAVES = new Set(['button', 'badge', 'input', 'textarea', 'label', 'separator', 'skeleton', 'progress']);

// Layout belongs to the preview; every interactive control comes from the connected library.
function themeDashboard(inventory: ComponentInfo[], root: string, moduleName: (path: string) => string): string | null {
  const tag = (slug: string, name: string) => {
    const info = inventory.find(c => c.slug === slug);
    if (!info) return null;
    const catalog = catalogStory(info, root, s => inventory.find(c => c.slug === s));
    if (![info.exportName, ...(catalog?.ownNames ?? []), ...(info.parts ?? []).map(p => p.name)].includes(name)) return null;
    return `${moduleName(info.file)}.${name}`;
  };
  const Card = tag('card', 'Card'), Button = tag('button', 'Button'), Input = tag('input', 'Input');
  if (!Card || !Button || !Input) return null;
  const Badge = tag('badge', 'Badge'), Checkbox = tag('checkbox', 'Checkbox'), Progress = tag('progress', 'Progress');
  const Avatar = tag('avatar', 'Avatar'), AvatarFallback = tag('avatar', 'AvatarFallback');
  const chartInfo = inventory.find(c=>c.slug==='chart');
  const chartAvailable = chartInfo && catalogStory(chartInfo,root,s=>inventory.find(c=>c.slug===s));
  const ChartContainer = chartAvailable ? tag('chart','ChartContainer') : null;
  const ChartTooltip = chartAvailable ? tag('chart','ChartTooltip') : null;
  const ChartTooltipContent = chartAvailable ? tag('chart','ChartTooltipContent') : null;
  const recharts = ChartContainer ? moduleName('recharts') : null;
  const activityChart = ChartContainer && recharts ? `<${ChartContainer} config={{tasks:{label:'Tasks',color:'var(--chart-1, var(--primary))'}}} className="h-40 w-full" aria-label="Tasks completed this week"><${recharts}.BarChart accessibilityLayer data={[{day:'Mon',tasks:3},{day:'Tue',tasks:5},{day:'Wed',tasks:4},{day:'Thu',tasks:6},{day:'Fri',tasks:4},{day:'Sat',tasks:6},{day:'Sun',tasks:4}]}><${recharts}.CartesianGrid vertical={false}/><${recharts}.XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8}/>${ChartTooltip && ChartTooltipContent ? `<${ChartTooltip} cursor={false} content={<${ChartTooltipContent}/>}/>` : ''}<${recharts}.Bar dataKey="tasks" fill="var(--color-tasks)"/></${recharts}.BarChart></${ChartContainer}>` : '';

  const Tabs = tag('tabs', 'Tabs'), TabsList = tag('tabs', 'TabsList'), TabsTrigger = tag('tabs', 'TabsTrigger'), TabsContent = tag('tabs', 'TabsContent');
  const Select = tag('select', 'Select'), SelectTrigger = tag('select', 'SelectTrigger'), SelectValue = tag('select', 'SelectValue'), SelectContent = tag('select', 'SelectContent'), SelectItem = tag('select', 'SelectItem');
  const avatar = (initials: string) => Avatar && AvatarFallback ? `<${Avatar}><${AvatarFallback}>${initials}</${AvatarFallback}></${Avatar}>` : '';
  const badge = (text: string) => Badge ? `<${Badge} variant="secondary">${text}</${Badge}>` : `<span className="theme-muted">${text}</span>`;
  const tasks = ['Review homepage concepts', 'Share the component library', 'Publish the weekly update'].map((label, i) => `<label className="theme-task">${Checkbox ? `<${Checkbox} defaultChecked={${i === 0}} aria-label=${JSON.stringify(label)} />` : ''}<span>${label}</span><small>${['Today','Today','Tomorrow'][i]}</small></label>`).join('');
  const taskBody = `<div className="theme-task-list">${tasks}</div>`;
  const taskPanel = Tabs && TabsList && TabsTrigger && TabsContent
    ? `<${Tabs} defaultValue="today"><${TabsList}><${TabsTrigger} value="today">Today</${TabsTrigger}><${TabsTrigger} value="upcoming">Upcoming</${TabsTrigger}></${TabsList}><${TabsContent} value="today">${taskBody}</${TabsContent}><${TabsContent} value="upcoming"><p className="theme-muted" style={{padding:'20px 0'}}>Design review · Friday, 10:00 AM</p></${TabsContent}></${Tabs}>` : taskBody;
  const role = Select && SelectTrigger && SelectValue && SelectContent && SelectItem
    ? `<${Select} defaultValue="member"><${SelectTrigger} aria-label="Workspace role"><${SelectValue}/></${SelectTrigger}><${SelectContent}><${SelectItem} value="member">Member</${SelectItem}><${SelectItem} value="admin">Admin</${SelectItem}></${SelectContent}></${Select}>` : '';
  const CardHeader = tag('card','CardHeader') ?? 'div';
  const CardContent = tag('card','CardContent') ?? 'div';
  const CardFooter = tag('card','CardFooter') ?? 'div';
  const CardTitle = tag('card','CardTitle') ?? 'h2';
  const CardDescription = tag('card','CardDescription') ?? 'p';
  const panel = (name:string, title:string, description:string, body:string, footer='', header='') => `<div className="theme-panel ${name}"><${Card}><${CardHeader}>${header || `<${CardTitle}>${title}</${CardTitle}>${description ? `<${CardDescription}>${description}</${CardDescription}>` : ''}`}</${CardHeader}><${CardContent}>${body}</${CardContent}>${footer ? `<${CardFooter} className="theme-panel-footer">${footer}</${CardFooter}>` : ''}</${Card}></div>`;
  return `<div className="theme-workspace" data-theme-dashboard>
    <header className="theme-topbar"><div className="theme-brand"><svg className="theme-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>studio<span className="theme-workspace-name">/ Design workspace</span></div><div className="theme-person">${avatar('JD')}<span>Jamie Davis</span></div></header>
    <div className="theme-heading"><div><p className="theme-eyebrow">MONDAY, OCTOBER 5</p><h1>A little progress, every day.</h1><p className="theme-muted">Here's what's happening in your workspace.</p></div><${Button}>New project <span aria-hidden="true">＋</span></${Button}></div>
    <div className="theme-bento" data-has-chart={${Boolean(activityChart)}}>
      ${panel('theme-hero','Brand refresh','A fresh direction for the next chapter.', `<div className="theme-project-summary"><div className="theme-project-status">${badge('In progress')}<span className="theme-muted">Due Oct 16</span></div><div className="theme-project-progress"><div className="theme-progress-label"><span>Project progress</span><strong>68%</strong></div>${Progress ? `<${Progress} value={68} aria-label="Brand refresh progress"/>` : ''}</div><div className="theme-project-detail"><div><span className="theme-muted">Next milestone</span><p>Visual direction review</p></div><div><span className="theme-muted">Team</span><div className="theme-team">${avatar('JD')}${avatar('AL')}${avatar('MK')}</div></div></div></div>`, `<div className="theme-project-footer"><span className="theme-muted">Thursday · 10:00 AM</span><${Button} variant="outline">Open project <span aria-hidden="true">↗</span></${Button}></div>`)}
      ${activityChart ? panel('theme-metric','Weekly activity','Completed tasks across your workspace.', `<div className="theme-number">32 <span>tasks completed</span></div>${activityChart}`) : ''}
      ${panel('theme-tasks','Your tasks','A few things to move forward today.', taskPanel)}
      ${panel('theme-profile','Jamie Davis','Product designer · Studio team', `<div>${badge('Pro plan')}</div><div className="theme-profile-stats"><div><strong>12</strong><span>Projects</span></div><div><strong>8</strong><span>Teammates</span></div><div><strong>96</strong><span>Tasks done</span></div></div>`, `<${Button} variant="outline">View profile</${Button}>`, `<div className="theme-profile-heading">${avatar('JD')}<div><${CardTitle}>Jamie Davis</${CardTitle}><${CardDescription}>Product designer · Studio team</${CardDescription}></div></div>`)}
      ${panel('theme-invite','Better together','Invite someone to make great things with you.', `<form onSubmit={event=>event.preventDefault()} className="theme-invite-form"><label htmlFor="theme-invite-email">Email address</label><${Input} id="theme-invite-email" type="email" placeholder="name@company.com"/><div className="theme-invite-actions">${role}<${Button} type="submit">Send invitation</${Button}></div></form>`)}
      ${panel('theme-activity','Latest updates','What your team has been working on.', `<div className="theme-update">${avatar('AL')}<div><p><strong>Alex</strong> shared new explorations</p><small>Brand refresh · 24 minutes ago</small></div></div><div className="theme-update">${avatar('MK')}<div><p><strong>Morgan</strong> completed the handoff</p><small>Website launch · 2 hours ago</small></div></div>`)}
    </div><footer className="theme-footer">A good day to make something great.<span>Studio workspace</span></footer>
  </div>`;
}

const THEME_DASHBOARD_CSS = `
.canon-preview-canvas:has([data-preview-page="theme"]){max-width:1200px;background:var(--background);padding:28px}
.theme-workspace{font-size:13px;color:var(--foreground);line-height:1.5}.theme-topbar,.theme-brand,.theme-person,.theme-heading,.theme-project-footer,.theme-profile-top,.theme-invite-actions,.theme-footer{display:flex;align-items:center;justify-content:space-between;gap:14px}.theme-topbar{padding-bottom:26px;border-bottom:1px solid var(--border)}.theme-brand{justify-content:flex-start;font-size:19px;font-weight:700;letter-spacing:-.7px}.theme-mark{width:28px;height:28px;flex-shrink:0;color:var(--foreground)}.theme-workspace-name{font-size:12px;font-weight:400;letter-spacing:0;color:var(--muted-foreground)}.theme-person{font-size:12px}.theme-heading{margin:30px 0 24px}.theme-heading h1{font-size:26px;font-weight:600;letter-spacing:-1px;margin:4px 0 6px}.theme-eyebrow{font-size:10px;font-weight:600;letter-spacing:1.2px;margin:0 0 8px}.theme-muted,.theme-heading .theme-eyebrow{color:var(--muted-foreground)}
.theme-bento{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:18px;align-items:stretch}.theme-panel{min-width:0;display:grid}.theme-panel>*{min-width:0}.theme-panel-footer{margin-top:auto}.theme-hero{grid-column:span 6}.theme-bento[data-has-chart="false"] .theme-hero{grid-column:1 / -1}.theme-project-summary{display:grid;gap:24px}.theme-project-status,.theme-project-detail{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.theme-project-progress{display:grid;gap:10px}.theme-project-detail>div{display:grid;gap:8px}.theme-project-detail>div>span{font-size:11px}.theme-metric{grid-column:span 6}.theme-number{font-size:34px;letter-spacing:-1px;font-weight:600;margin-bottom:12px}.theme-number>span{font-size:11px;font-weight:400;letter-spacing:0;color:var(--muted-foreground)}.theme-profile{grid-column:span 4}.theme-invite,.theme-activity{grid-column:span 6}.theme-tasks{grid-column:span 8}.theme-progress-label{display:flex;justify-content:space-between;gap:20px;font-size:12px}.theme-project-footer{width:100%;flex-wrap:wrap}.theme-team{display:flex;gap:4px;flex-wrap:wrap}.theme-task-list{margin-top:8px}.theme-task{display:flex;gap:12px;align-items:center;padding:17px 0;border-bottom:1px solid var(--border)}.theme-task:last-child{border:0}.theme-task>span{flex:1;min-width:0;overflow-wrap:anywhere}.theme-task small{flex-shrink:0}.theme-task small{color:var(--muted-foreground);font-size:10px}.theme-profile-heading{display:flex;align-items:center;gap:12px;min-width:0}.theme-profile-heading>div:last-child{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}.theme-profile-stats{display:flex;justify-content:space-between;gap:14px;margin-top:20px}.theme-profile-stats>div{display:grid;gap:3px}.theme-profile-stats strong{font-size:20px;font-weight:600}.theme-profile-stats span{font-size:10px;color:var(--muted-foreground)}.theme-invite-form{display:grid;grid-template-columns:minmax(0,1fr);gap:9px}.theme-invite-form>label{font-size:11px;font-weight:500}.theme-invite-actions{gap:8px;flex-wrap:wrap}.theme-invite-actions>*{min-width:0;max-width:100%}.theme-update{display:flex;align-items:center;gap:10px;padding:12px 0}.theme-update>div{min-width:0;overflow-wrap:anywhere}.theme-update p{font-size:11px}.theme-update small{font-size:10px;color:var(--muted-foreground)}.theme-footer{font-size:10px;color:var(--muted-foreground);margin-top:24px}
@media(max-width:900px){.theme-hero,.theme-metric,.theme-invite,.theme-activity{grid-column:span 6}.theme-profile{grid-column:span 5}.theme-tasks{grid-column:span 7}}
@media(max-width:580px){.canon-preview-canvas:has([data-preview-page="theme"]){padding:16px}.theme-workspace-name,.theme-person>span,.theme-footer>span{display:none}.theme-heading{align-items:flex-start;gap:14px;flex-direction:column}.theme-heading h1{font-size:24px}.theme-bento{grid-template-columns:1fr;gap:14px}.theme-bento>.theme-panel{grid-column:1}.theme-task{gap:9px}.theme-task small{font-size:9px}}
`;
const STATE_CONTROLS: Record<string, string[]> = {
  input: ['Input'], 'input-group': ['InputGroupInput', 'InputGroupTextarea'], textarea: ['Textarea'],
  select: ['SelectTrigger'], checkbox: ['Checkbox'], switch: ['Switch'], 'radio-group': ['RadioGroupItem'], button: ['Button'],
};
function stateExamples(slug: string, jsx: string) {
  const controls = STATE_CONTROLS[slug];
  if (!controls) return [];
  const states = slug === 'button' ? ['Normal', 'Hover', 'Focus', 'Disabled'] : ['Normal', 'Focus', 'Error', 'Disabled'];
  return states.map(title => {
    const state = title.toLowerCase();
    const attr = state === 'error' ? ' aria-invalid="true"' : state === 'disabled' ? ' disabled' : state === 'focus' || state === 'hover' ? ' data-canon-state-target="true"' : '';
    let sample = jsx.replace(new RegExp(`<(${controls.join('|')})(?=[\\s/>])`, 'g'), `<$1${attr}`);
    if (state === 'disabled' && ['select', 'radio-group'].includes(slug)) sample = sample.replace(/<(Select|RadioGroup)(?=[\s/>])/, '<$1 disabled');
    return {title, jsx:sample};
  });
}
// Keep label associations local to each example instead of reusing catalog IDs.
function uniqueExampleIds(jsx: string, suffix: string) {
  return jsx.replace(/\b(id|htmlFor|aria-describedby|aria-labelledby)="([^"]+)"/g, (_, attr, value) => `${attr}="${value.split(/\s+/).map((id:string) => `${id}-${suffix}`).join(' ')}"`);
}

// Mirror the project's compiled selectors, including nested :has(), media queries and
// cascade layers. Focus samples never call focus() or invent their own ring/border styles.
const STATE_PREVIEW_RUNTIME = String.raw`
function installStatePreviews(){
  const pseudo=/(?<!\\):(focus-visible|focus-within|focus|hover)\b/g;
  const rewrite=text=>text.replace(pseudo,(_,state)=>'[data-canon-preview-'+state+']');
  const copyRule=rule=>{
    if(rule.selectorText){
      if(/\[data-(?:inspect|canon-inspect)/.test(rule.selectorText))return '';
      if(rewrite(rule.selectorText)!==rule.selectorText)return rewrite(rule.cssText);
      const nested=Array.from(rule.cssRules||[]).map(copyRule).join('');
      return nested?rule.selectorText+'{'+nested+'}':'';
    }
    if(rule.cssRules){
      const nested=Array.from(rule.cssRules).map(copyRule).join('');
      return nested?rule.cssText.slice(0,rule.cssText.indexOf('{')+1)+nested+'}':'';
    }
    return '';
  };
  document.querySelectorAll('[data-preview-state="focus"], [data-preview-state="hover"]').forEach(section=>{
    const control=section.querySelector('[data-canon-state-target]');
    if(!control)return;
    const state=section.dataset.previewState;
    control.setAttribute('data-canon-preview-'+state,'');
    if(state==='focus')control.setAttribute('data-canon-preview-focus-visible','');
    for(let element=control;element&&element!==section.parentElement;element=element.parentElement){
      element.setAttribute('data-canon-preview-'+(state==='focus'?'focus-within':'hover'),'');
    }
  });
  const mirror=document.createElement('style');mirror.id='canon-state-preview-styles';
  mirror.textContent=Array.from(document.styleSheets).flatMap(sheet=>{try{return Array.from(sheet.cssRules).map(copyRule)}catch{return []}}).join('');
  document.head.append(mirror);
}
`;

// A composed specimen demonstrates project fonts; sample sizing never creates saved tokens.
function typographyDocument(theme: LibraryTheme): string {
  const vars = {...Object.fromEntries(Object.entries(theme.utilityTheme ?? {}).map(([name,value])=>[name,{light:value}])),...theme.vars};
  const groups = [
    {title:'Font families', pattern:/^font-(?!weight(?:-|$))/, property:'font-family'},
    {title:'Text sizes', pattern:/^text-(?!.*--)/, property:'font-size'},
    {title:'Line height', pattern:/^(leading-|text-.*--line-height$)/, property:'line-height'},
    {title:'Letter spacing', pattern:/^tracking-/, property:'letter-spacing'},
    {title:'Font weight', pattern:/^font-weight-/, property:'font-weight'},
  ];
  const sections = groups.map(group=>{
    const tokens=Object.entries(vars).filter(([name])=>group.pattern.test(name) && /^[A-Za-z0-9-]+$/.test(name));
    if(!tokens.length)return '';
    return `<section class="canon-type-section"><h2 class="canon-type-caption">${group.title}</h2>${tokens.map(([name,value])=>`<div class="canon-type-row" data-type-token="${name}"><div class="canon-type-meta"><code>--${name}</code><span data-theme-token-value="${name}">${escapeHtml(value.light)}</span>${group.property==='font-family' && name!=='font-mono'?`<span data-font-resolution="${name}" hidden></span>`:''}</div><div class="canon-type-specimen"  style="${group.property}:var(--${name})">The quick brown fox jumps over the lazy dog. 0123456789</div></div>`).join('')}</section>`;
  }).join('');
  const specimen = `<p class="canon-type-caption">Sample layout</p><section class="canon-type-showcase" aria-label="Typography specimen"><div class="canon-type-scale"><p class="canon-type-caption">Headings</p><h1 data-type-heading>Build something<br>worth sharing.</h1><h2>Good ideas start here.</h2><h3>A little progress, every day.</h3><h4>Make room for possibility.</h4><h5>Thoughtful by design.</h5><h6>Small details matter.</h6></div><div class="canon-type-reading" data-type-body><p class="canon-type-caption">Text in context</p><p class="canon-type-lead">A space for clear thinking, thoughtful work, and everything you’re building together.</p><p>Great design begins with a conversation. Keep the important things close, give your ideas room to grow, and make the next step <strong>easy to understand</strong>.</p><p>Explore a <a href="#canon-type-families">different perspective</a>, find a rhythm, and pay attention to the details that make an experience feel considered.</p><blockquote>Clarity is what makes a good idea easy to share.</blockquote><ul><li>Start with something meaningful.</li><li>Make the details work together.</li><li>Keep learning as you go.</li></ul><p class="canon-type-small">Small text · Supporting details, useful context, and a quiet note.</p><div><p class="canon-type-caption">Code</p>${vars['font-mono'] ? '<span class="canon-type-caption" data-font-resolution="font-mono" hidden></span>' : ''}<pre data-type-code><code>const idea = {\n  name: "Something worth making",\n  ready: true,\n};</code></pre></div></div></section>`;
  return `<style>
.canon-preview-canvas:has([data-preview-page="typography"]){max-width:1120px;padding:32px}
.canon-typography>header{margin-bottom:28px}.canon-typography>header h1{font-size:20px;font-weight:600}.canon-typography>header p,.canon-type-caption,.canon-type-meta{font-size:12px;line-height:1.5;color:var(--muted-foreground)}.canon-typography>header p{margin-top:8px;max-width:70ch}.canon-type-section{padding:24px 0;border-top:1px solid var(--border)}.canon-type-caption{font-weight:600;margin-bottom:16px}.canon-type-row{display:grid;grid-template-columns:minmax(160px,1fr) minmax(0,2fr);gap:28px;padding:18px 0}.canon-type-meta{display:grid;align-content:start;gap:5px;overflow-wrap:anywhere}.canon-type-meta code{color:var(--foreground)}.canon-type-specimen{overflow-wrap:anywhere;min-width:0;font-size:24px;line-height:1.5}.canon-type-showcase{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;padding:32px 0 44px;border-top:1px solid var(--border);font-family:var(--font-sans,inherit)}.canon-type-scale h1,.canon-type-scale h2,.canon-type-scale h3,.canon-type-scale h4,.canon-type-scale h5,.canon-type-scale h6{font-family:var(--font-heading,var(--font-sans,inherit));font-weight:600;line-height:1.2;margin:0 0 24px;overflow-wrap:anywhere}.canon-type-scale h1{font-size:var(--text-4xl,3rem);letter-spacing:-.04em}.canon-type-scale h2{font-size:var(--text-3xl,2rem);letter-spacing:-.025em}.canon-type-scale h3{font-size:var(--text-2xl,1.5rem)}.canon-type-scale h4{font-size:var(--text-xl,1.25rem)}.canon-type-scale h5{font-size:var(--text-lg,1.125rem)}.canon-type-scale h6{font-size:var(--text-base,1rem)}.canon-type-reading{display:grid;align-content:start;gap:18px;line-height:var(--leading-normal,1.65);font-size:var(--text-base,1rem)}.canon-type-reading>.canon-type-caption{margin:0}.canon-type-lead{font-size:var(--text-xl,1.25rem);line-height:1.5}.canon-type-reading a{color:var(--primary);text-decoration:underline;text-underline-offset:3px}.canon-type-reading blockquote{border-left:2px solid var(--border);padding-left:18px;color:var(--muted-foreground);font-style:italic}.canon-type-reading ul{list-style:disc;padding-left:20px}.canon-type-reading .canon-type-small{font-size:var(--text-sm,.875rem);color:var(--muted-foreground)}.canon-type-reading pre{font-family:var(--font-mono,ui-monospace,monospace);font-size:var(--text-sm,.875rem);padding:18px;background:var(--muted);border:1px solid var(--border);border-radius:var(--radius);overflow:auto}.canon-type-reading code{font-family:inherit}.canon-type-empty{color:var(--muted-foreground);font-size:13px;margin:20px 0}
@media(max-width:600px){.canon-preview-canvas:has([data-preview-page="typography"]){padding:20px}.canon-type-row{grid-template-columns:1fr;gap:12px}.canon-type-showcase{grid-template-columns:1fr;gap:24px}.canon-type-scale h1{font-size:2.5rem}}
</style><article class="canon-typography" data-preview-page="typography"><header><h1>Typography</h1><p>Your project fonts, in context.</p></header>${specimen}<details id="canon-type-families"><summary class="canon-type-caption">Font families &amp; theme tokens</summary>${sections || '<p class="canon-type-empty">No typography tokens are declared in this theme. Text inherits the project’s base styles and browser defaults.</p><p data-type-inherited>The quick brown fox jumps over the lazy dog. 0123456789</p>'}</details></article>`;
}

export async function realComponentPreview(root: string, adapter: Adapter, inventory: ComponentInfo[], theme: LibraryTheme, slug: string | undefined, draft: Draft = { components:{}, parts:{} }, options: {mode?: 'component' | 'theme' | 'typography'} = {}): Promise<string> {
  const overview = options.mode === 'theme';
  if (!overview && slug && !inventory.some(c => c.slug === slug)) throw new Error(`Unknown component: ${slug}`);
  const info = inventory.find(c => c.slug === slug) ?? inventory.find(c => c.slug === 'button') ?? inventory[0];
  const require = createRequire(root + '/package.json');
  const shell = (body: string) => previewHtml(theme, []).replace(/<body>[\s\S]*?<\/body>/, () => `<body><style>body:has(> .canon-preview-canvas){display:block;max-width:none;margin:0;padding:0}.canon-preview-canvas{box-sizing:border-box;max-width:1040px;margin-inline:auto;padding:24px;display:grid;gap:16px;min-width:0}</style><main class="canon-preview-canvas">${body}</main></body>`);
  if (options.mode === 'typography') return shell(typographyDocument(theme));
  if (!info) return shell('<p role="status">No components were found in this project.</p>');
  const selected = overview
    ? ['button','card','input','select','checkbox','switch','tabs','badge','alert','textarea','progress'].map(slug => inventory.find(c => c.slug === slug)).filter((c): c is ComponentInfo => Boolean(c))
    : [info];
  const groups = selected.flatMap(component => {
    if (exclusionReason(component,root)) return [];
    const catalog = catalogStory(component,root,s => inventory.find(c => c.slug === s));
    const spec = draft.components[component.slug] ?? component.cva;
    const owner = component.cvaOwner;
    const variants = !overview && catalog && spec && owner ? Object.entries(spec.variants).flatMap(([axis,values]) => Object.keys(values).map(value => ({title:axis + ': ' + value,jsx:catalog.jsx.replace(new RegExp('<'+owner+'(?=[\\s/>])([^>]*)(>)','g'),(_tag,attrs,end) => '<'+owner+' '+axis+'={'+JSON.stringify(value === 'true' ? true : value === 'false' ? false : value)+'}'+attrs.replace(new RegExp('\\s'+axis+'=(?:"[^"]*"|\\{[^}]*\\})','g'),'')+end)}))) : [];
    let examples = catalog ? [{title:'Example',jsx:catalog.jsx},...variants] : LEAVES.has(component.slug) ? adapter.renderSpec({...component,cva:spec}).filter(e => !e.jsx.includes('…')) : [];
    if (!overview && STATE_CONTROLS[component.slug] && examples.length) {
      const states = stateExamples(component.slug, catalog?.jsx ?? examples[0].jsx);
      examples = [...states, ...examples.filter(e => e.title !== 'Example')];
    }
    if (overview) {
      // Keep popovers closed in the overview, and keep leaf variants compact.
      examples = examples.filter(e => !e.title.startsWith('size:')).slice(0,6).map(e => ({...e,jsx:e.jsx.replace(/\sdefaultOpen(?:=\{true\})?/g,'').replace(/\sopen=\{true\}/g,'')}));
    }
    return examples.length ? [{info:component,catalog,examples}] : [];
  });
  const heading = overview ? 'Theme' : info.exportName;
  const description = overview ? 'Your components, together. Theme changes update every example.' : 'Live React component · Changes apply to the shared source when saved';
  const title = `<header style="margin-bottom:24px"><h1 style="font-size:20px;font-weight:600">${escapeHtml(heading)}</h1><p style="font-size:13px;opacity:.65">${description}</p></header>`;
  if (!groups.length) return shell(`${title}<p role="status">${escapeHtml(!overview && exclusionReason(info,root) || 'No complete preview is available for these components yet.')}</p>`);
  // Inert class markers follow the exact editable source literal through className
  // forwarding, even when components share slots or do not expose data-slot at all.
  const sourceOwners: Record<string,{slug:string;name:string;part?:string;cva?:CvaSpec}> = {};
  const markers = new Map<string,string>();
  for (const c of inventory) {
    const owner = c.cvaOwner ?? c.exportName;
    for (const name of new Set([...(c.cva ? [owner] : []), ...(c.parts ?? []).filter(p=>p.span && !p.readOnlyReason).map(p=>p.name)])) {
      const marker = `canon-source-${markers.size}`;
      markers.set(`${c.slug}:${name}`,marker);
      sourceOwners[marker] = {slug:c.slug,name,...(c.cva && name===owner ? {cva:draft.components[c.slug] ?? c.cva} : {part:name})};
    }
  }
  const sourceFiles = new Map(inventory.filter(c=>existsSync(c.file)).map(c=>[realpathSync(c.file),c]));
  function instrument(source:string,c:ComponentInfo) {
    if(c.cva) {
      const span=findCva(source), marker=markers.get(`${c.slug}:${c.cvaOwner ?? c.exportName}`);
      if(span && marker) {const spec=parseCva(source,span);source=spliceCva(source,span,{...spec,base:[...spec.base,marker]});}
    }
    // Reparse after draft/CVA changes: original offsets no longer describe this buffer.
    const parts=parseParts(source).filter(p=>p.span && markers.has(`${c.slug}:${p.name}`));
    for(const part of parts.sort((a,b)=>b.span!.start-a.span!.start)) {
      const offset=part.span!.end-1;
      source=source.slice(0,offset)+' '+markers.get(`${c.slug}:${part.name}`)+source.slice(offset);
    }
    return source;
  }
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
  const imports = [`import * as React from 'react'; import {createRoot} from 'react-dom/client';`];
  const namespaces = new Map<string,string>();
  const moduleName = (path:string) => {
    if (!namespaces.has(path)) {
      const name = `LibraryModule${namespaces.size}`;
      namespaces.set(path,name);
      imports.push(`import * as ${name} from ${JSON.stringify(path)};`);
    }
    return namespaces.get(path)!;
  };
  const samples = groups.map((group,index) => {
    const bindings = new Map<string,string>();
    for (const name of new Set([group.info.exportName,...(group.catalog?.ownNames ?? [])])) bindings.set(name,`${moduleName(group.info.file)}.${name}`);
    for (const item of group.catalog?.imports ?? []) {
      const component = inventory.find(c => c.importPath === item.path);
      for (const name of item.names) bindings.set(name,`${moduleName(component?.file ?? item.path)}.${name}`);
    }
    const declarations = [...bindings].map(([name,path]) => `const ${name}=${path};`).join('');
    return `function Sample${index}(){${declarations}return <div className=${JSON.stringify(overview ? 'canon-theme-examples' : 'canon-component-examples')}>${group.examples.map((e,exampleIndex) => `<section data-preview-state=${JSON.stringify(['Normal','Hover','Focus','Error','Disabled'].includes(e.title) ? e.title.toLowerCase() : 'variant')} data-slug=${JSON.stringify(group.info.slug)} data-picks={${JSON.stringify(JSON.stringify(Object.fromEntries(e.title.includes(': ') ? [e.title.split(': ')] : [])))}} style={{marginBottom:${overview ? 0 : 32},minWidth:0}}>${overview && e.title === 'Example' ? '' : `<h2 style={{fontSize:12,opacity:.65,marginBottom:12}}>${escapeHtml(e.title)}</h2>`}<Boundary>${uniqueExampleIds(e.jsx, `${group.info.slug}-${exampleIndex}`)}</Boundary></section>`).join('')}<\/div>}`;
  });
  const dashboard = overview ? themeDashboard(inventory, root, moduleName) : null;
  const content = dashboard ? `<Boundary>${dashboard}</Boundary>` : (overview
    ? `<div className="canon-theme-grid">${groups.map((group,index) => `<section className="canon-theme-card" data-theme-component=${JSON.stringify(group.info.slug)}><h2 style={{fontSize:13,fontWeight:600,marginBottom:16}}>${group.info.exportName}</h2><Boundary><Sample${index}/></Boundary></section>`).join('')}</div>`
    : `<Sample0/>`);
  const slots = Object.fromEntries(inventory.flatMap(c => [{name:c.exportName,span:undefined,readOnlyReason:undefined},...(c.parts ?? [])].filter(p=>!markers.has(`${c.slug}:${p.name}`)).map(p => [p.name.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase(),{slug:c.slug,part:p.span && !p.readOnlyReason && !(c.cva && p.name === c.cvaOwner) ? p.name : undefined,cva:p.name === (c.cvaOwner ?? c.exportName) ? c.cva : undefined}])));
  // Slots remain a fallback for non-editable wrappers. Editable targets require their
  // source marker: a shared slot must never identify a different or inactive render branch.
  const entry = `${imports.join('\n')}
class Boundary extends React.Component { state={error:null}; static getDerivedStateFromError(error){return {error:String(error.message||error)}} render(){return this.state.error ? <div role="alert" style={{padding:24,border:'1px solid #dc2626',borderRadius:8}}><strong>Component could not render</strong><p>{this.state.error}</p></div> : this.props.children} }
${samples.join('\n')}
${STATE_PREVIEW_RUNTIME}
function Example(){React.useEffect(()=>{let live=true;const ready=()=>{if(!live)return;const probe=document.querySelector('[data-canon-style-probe]');if(probe&&getComputedStyle(probe).display==='none'){requestAnimationFrame(()=>requestAnimationFrame(()=>{if(live){installStatePreviews();document.documentElement.dataset.canonPreviewReady='true'}}))}else requestAnimationFrame(ready)};requestAnimationFrame(ready);return()=>{live=false}},[]);return <><span data-canon-style-probe className="hidden" aria-hidden="true"/>${dashboard ? '' : `<h1 style={{fontSize:20,fontWeight:600}}>${heading}</h1><p style={{fontSize:13,opacity:.65,marginBottom:24}}>${description}</p>`}${content}</>}
createRoot(document.getElementById('react-gallery')).render(<Example/>);
const slots=${JSON.stringify(slots)};
const sourceOwners=${JSON.stringify(sourceOwners)};
function annotate(){document.querySelectorAll('[class], [data-slot]').forEach(el=>{
  const owners=[...el.classList].map(name=>sourceOwners[name]).filter(Boolean);
  const m=owners.at(-1) ?? slots[el.dataset.slot];
  if(owners.length)el.dataset.canonSources=JSON.stringify(owners.map(({slug,name,part})=>({slug,name,part})));
  else if(el.dataset.canonSources){delete el.dataset.canonSources;delete el.dataset.inspect;delete el.dataset.part;}
  if(m){el.dataset.inspect=m.slug;if(m.part)el.dataset.part=m.part;else delete el.dataset.part;
    const sourcePicks={};
    for(const owner of owners.length ? owners : [m]) {
      if(!owner.cva)continue;
      let picks={};try{Object.assign(picks,JSON.parse(el.parentElement?.closest('[data-picks]')?.dataset.picks||'{}'))}catch{}
      for(const axis of Object.keys(owner.cva.variants)){const value=el.getAttribute('data-'+axis);if(value&&Object.hasOwn(owner.cva.variants[axis],value))picks[axis]=value}
      sourcePicks[owner.slug]=picks;
    }
    el.dataset.canonSourcePicks=JSON.stringify(sourcePicks);
    if(m.cva)el.dataset.picks=JSON.stringify(sourcePicks[m.slug] ?? {});else delete el.dataset.picks;
  }
})}
new MutationObserver(annotate).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); annotate();
`;
  const { build } = await import('esbuild');
  const result = await build({ stdin:{contents:entry,loader:'tsx',resolveDir:root,sourcefile:'canon-react-preview.tsx'},bundle:true,write:false,outfile:'canon-preview.js',format:'iife',platform:'browser',jsx:'automatic',target:'es2022',minify:true,logLevel:'silent',define:{'process.env.NODE_ENV':'"development"'}, plugins:[{name:'canon-draft',setup(builder){builder.onLoad({filter:/\.[cm]?[jt]sx?$/},args=>{const path=realpathSync(args.path), component=sourceFiles.get(path);if(!component)return;const contents=instrument(virtual.get(path) ?? readFileSync(path,'utf8'),component);return {contents,loader:extname(args.path).includes('tsx')?'tsx':extname(args.path).includes('ts')?'ts':'jsx',resolveDir:dirname(args.path)};});}}] });
  const js = result.outputFiles.find(f=>f.path.endsWith('.js')) ?? result.outputFiles[0];
  const css = result.outputFiles.find(f=>f.path.endsWith('.css'));
  const overviewCss = dashboard ? `<style>${THEME_DASHBOARD_CSS}</style>` : overview ? '<style>.canon-preview-canvas:has([data-preview-page="theme"]){max-width:1280px}.canon-theme-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px}.canon-theme-card{min-width:0;padding:20px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:var(--card,var(--background,#fff))}.canon-theme-examples{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.canon-theme-examples>section{max-width:100%}.canon-theme-examples>section>*{max-width:100%}</style>' : '';
  return shell(`${overviewCss}${css ? `<style>${css.text.replace(/</g,'\\3c ')}</style>` : ''}<div id="react-gallery" data-react-gallery data-preview-page="${overview ? 'theme' : 'components'}" style="padding:8px;min-height:200px"></div><script>${js.text.replace(/<\/script/gi,'<\\/script')}</script>`);
}
