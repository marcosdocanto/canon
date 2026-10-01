import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogStory } from '../src/generators/story-catalog.ts';
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
