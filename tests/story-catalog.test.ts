import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogStory, exclusionReason } from '../src/generators/story-catalog.ts';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ComponentInfo } from '../src/adapters/types.ts';

function component(slug: string, exportName: string, parts: string[] = []): ComponentInfo {
  return { slug, exportName, file: `/ui/${slug}.tsx`, importPath: `@/components/ui/${slug}`, parts: parts.map((name) => ({ name, classes: [] })) } as ComponentInfo;
}
const button = component('button', 'Button');
const lookup = (slug: string) => slug === 'button' ? button : undefined;

test('bubble example is a two-sided conversation and imports its group even when Bubble is the primary export', () => {
  const bubble = component('bubble', 'Bubble', ['BubbleGroup', 'BubbleContent']);
  const result = catalogStory(bubble, '/unused', lookup)!;
  assert.ok(result);
  assert.ok(result.ownNames.includes('BubbleGroup'));
  assert.equal((result.jsx.match(/<Bubble(?: |>|\n)/g) ?? []).length, 2);
  assert.match(result.jsx, /align="end"/);
  assert.match(result.jsx, /Can you share the updated designs\?/);
});

test('bubble without its required group does not emit an undefined React element', () => {
  assert.equal(catalogStory(component('bubble', 'Bubble', ['BubbleContent']), '/unused', lookup), undefined);
});

test('button group imports real buttons and breadcrumb composes a complete navigation trail', () => {
  const group = catalogStory(component('button-group', 'ButtonGroup'), '/unused', lookup)!;
  assert.deepEqual(group.imports, [{ path: button.importPath, names: ['Button'] }]);
  assert.equal((group.jsx.match(/<Button /g) ?? []).length, 3);
  const breadcrumb = catalogStory(component('breadcrumb', 'Breadcrumb', ['BreadcrumbList', 'BreadcrumbItem', 'BreadcrumbLink', 'BreadcrumbSeparator', 'BreadcrumbPage']), '/unused', lookup)!;
  assert.equal((breadcrumb.jsx.match(/<BreadcrumbItem>/g) ?? []).length, 3);
  assert.match(breadcrumb.jsx, /<BreadcrumbPage>Breadcrumb<\/BreadcrumbPage>/);
});

for (const [slug, family] of [['dialog', 'Dialog'], ['alert-dialog', 'AlertDialog'], ['sheet', 'Sheet'], ['drawer', 'Drawer']]) {
  test(`${slug} includes trigger, accessible title/description and closing controls without opening over the gallery`, () => {
    const suffixes = ['Trigger', 'Content', 'Header', 'Title', 'Description', 'Footer', ...(family === 'AlertDialog' ? ['Cancel', 'Action'] : ['Close'])];
    const c = component(slug, family, suffixes.map((part) => family + part));
    const result = catalogStory(c, '/unused', lookup)!;
    assert.ok(result);
    assert.ok(result.jsx.includes(`<${family}Trigger asChild>`));
    assert.ok(result.jsx.includes(`<${family}Title>`));
    assert.ok(result.jsx.includes(`<${family}Description>`));
    assert.doesNotMatch(result.jsx, /defaultOpen|>…</);
    assert.equal(catalogStory({ ...c, parts: c.parts!.filter((part) => part.name !== family + 'Title') }, '/unused', lookup), undefined);
  });
}

test('card and alert show meaningful content from actual component parts', () => {
  const card = catalogStory(component('card', 'Card', ['CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter']), '/unused', lookup)!;
  assert.match(card.jsx, /<CardTitle>New project<\/CardTitle>/);
  assert.match(card.jsx, /<Button variant="default">Create project<\/Button>/);
  const alert = catalogStory(component('alert', 'Alert', ['AlertTitle', 'AlertDescription']), '/unused', lookup)!;
  assert.match(alert.jsx, /<AlertTitle>Changes saved<\/AlertTitle>/);
});


test('resizable uses the orientation prop of the installed primitive version', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'canon-resizable-example-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const c = component('resizable', 'ResizablePanelGroup', ['ResizablePanel', 'ResizableHandle']);
  c.file = join(root, 'resizable.tsx');
  writeFileSync(c.file, 'return <ResizablePrimitive.Group {...props} />');
  assert.match(catalogStory(c, root, lookup)!.jsx, /<ResizablePanelGroup orientation="horizontal"/);
  writeFileSync(c.file, 'return <ResizablePrimitive.PanelGroup {...props} />');
  assert.match(catalogStory(c, root, lookup)!.jsx, /<ResizablePanelGroup direction="horizontal"/);
});

test('preview presentation never pins component radius, background, border or shadow over source styles', () => {
  const cases: [string,string,string[]][] = [
    ['calendar','Calendar',[]], ['skeleton','Skeleton',[]], ['command','Command',['CommandInput','CommandList','CommandGroup','CommandItem']],
    ['scroll-area','ScrollArea',[]], ['resizable','ResizablePanelGroup',['ResizablePanel','ResizableHandle']], ['aspect-ratio','AspectRatio',[]],
    ['message-scroller','MessageScrollerProvider',['MessageScroller','MessageScrollerViewport','MessageScrollerContent','MessageScrollerItem']],
  ];
  for (const [slug,name,parts] of cases) {
    const jsx=catalogStory(component(slug,name,parts),'/unused',lookup)!.jsx;
    for (const tag of jsx.matchAll(/<[A-Z][\w]*\b[^>]*>/g)) assert.doesNotMatch(tag[0], /borderRadius|boxShadow|rounded-|bg-muted|className="[^"]*\bborder\b/, slug);
  }
});

test('available Select groups and input group textarea/actions are visible in their real context', () => {
  const select=catalogStory(component('select','Select',['SelectTrigger','SelectValue','SelectContent','SelectItem','SelectGroup','SelectLabel','SelectSeparator']),'/unused',lookup)!;
  assert.match(select.jsx, /<SelectGroup><SelectLabel>Fruit/);
  assert.match(select.jsx, /<SelectSeparator/);
  const input=catalogStory(component('input-group','InputGroup',['InputGroupInput','InputGroupAddon','InputGroupText','InputGroupTextarea','InputGroupButton']),'/unused',lookup)!;
  assert.match(input.jsx, /<InputGroupTextarea/); assert.match(input.jsx, /<InputGroupButton>Send/);
  assert.ok(input.ownNames.includes('InputGroupTextarea'));
});

test('optional parts are composed only when installed', () => {
  const avatar=catalogStory(component('avatar','Avatar',['AvatarFallback','AvatarImage','AvatarBadge','AvatarGroup','AvatarGroupCount']),'/unused',lookup)!;
  for(const name of ['AvatarImage','AvatarBadge','AvatarGroup','AvatarGroupCount']) assert.ok(avatar.ownNames.includes(name));
  const basic=catalogStory(component('avatar','Avatar',['AvatarFallback']),'/unused',lookup)!;
  assert.doesNotMatch(basic.jsx,/AvatarImage|AvatarGroup|AvatarBadge/);
});

test('Sonner renders the real Toaster and triggers its installed toast API', t => {
  const root=mkdtempSync(join(tmpdir(),'canon-sonner-story-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const c=component('sonner','Toaster');
  writeFileSync(join(root,'package.json'),JSON.stringify({dependencies:{sonner:'2.0.0'}}));
  const result=catalogStory(c,root,lookup)!;
  assert.ok(result);assert.match(result.jsx,/<Toaster theme=\{theme\} position="bottom-right"/);
  assert.match(result.jsx,/onClick=\{\(\) => toast\(/);assert.match(result.jsx,/toast.success/);assert.match(result.jsx,/toast.error/);
  assert.match(result.jsx,/createElement\(function NotificationDemo/);
  assert.match(result.jsx,/MutationObserver\(update\)/);
  assert.match(result.jsx,/classList.contains\('dark'\)/);
  assert.ok(result.imports?.some(entry=>entry.path==='sonner'&&entry.names.includes('toast')));
  assert.equal(exclusionReason(c,root),undefined);
  writeFileSync(join(root,'package.json'),'{}');
  assert.match(exclusionReason(c,root)!,/sonner is not a dependency/);
  assert.equal(catalogStory(c,root,lookup),undefined);
});

test('DirectionProvider switches LTR/RTL and wraps real directional Tabs when available', () => {
  const c=component('direction','DirectionProvider');
  const tabs=component('tabs','Tabs',['TabsList','TabsTrigger','TabsContent']);
  const result=catalogStory(c,'/unused',slug=>slug==='tabs'?tabs:lookup(slug))!;
  assert.equal(exclusionReason(c,'/unused'),undefined);
  assert.match(result.jsx,/createElement\(function DirectionDemo/);
  assert.match(result.jsx,/<DirectionProvider dir=\{direction\}/);
  assert.match(result.jsx,/<section dir=\{direction\}/);
  assert.match(result.jsx,/setDirection\('rtl'\)/);
  assert.match(result.jsx,/<Tabs defaultValue="account"/);
  assert.ok(result.imports?.some(entry=>entry.path===tabs.importPath));
});

test('avatar examples separate image, fallback, status and group without overriding installed dimensions', () => {
  const c = component('avatar', 'Avatar', ['AvatarFallback', 'AvatarImage', 'AvatarBadge', 'AvatarGroup', 'AvatarGroupCount']);
  const { jsx } = catalogStory(c, '/unused', lookup)!;
  for (const label of ['Image', 'Initials', 'Status', 'Group']) assert.ok(jsx.includes(`>${label}</`), label);
  assert.equal((jsx.match(/<figure\b/g) ?? []).length, 4);
  assert.match(jsx, /<AvatarBadge[^>]*><svg\b[^>]*viewBox="0 0 24 24"/);
  assert.doesNotMatch(jsx, /✓/);
  assert.match(jsx, /<AvatarGroupCount>\+3<\/AvatarGroupCount>/);
  assert.match(jsx, /gap: 32/);
  for (const tag of jsx.matchAll(/<Avatar\w*\b[^>]*>/g)) assert.doesNotMatch(tag[0], /className=|style=|\ssize=/, tag[0]);
  assert.match(jsx, /<figcaption>Initials<\/figcaption><Avatar><AvatarFallback>CN<\/AvatarFallback><\/Avatar>/);
});
