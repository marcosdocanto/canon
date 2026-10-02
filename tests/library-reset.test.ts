import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { clone } from './fixtures/clone.ts';
import { adopt } from '../src/adopt.ts';
import { shadcnAdapter } from '../src/adapters/shadcn/index.ts';
import { resetDefaults, type RegistryReader } from '../src/adapters/shadcn/reset.ts';
import { parseVarBlocks } from '../src/adapters/shadcn/theme.ts';
import { libraryReset } from '../src/reset-lib.ts';

async function fixture(t: any) {
  const root = clone(t);
  const css = join(root, 'app/globals.css');
  const ui = join(root, 'src/ui');
  // Resolve through inventory so fixtures with a nonstandard alias exercise it as well.
  const components = shadcnAdapter.inventory(root);
  const originals = new Map(components.map(c => [c.slug, readFileSync(c.file, 'utf8')]));
  const theme = parseVarBlocks(readFileSync(css, 'utf8'));
  const palette = { cssVars: { light: Object.fromEntries(theme.root), dark: Object.fromEntries(theme.dark) } };
  const requests: string[] = [];
  const read: RegistryReader = async path => {
    requests.push(path);
    if (path === 'styles/new-york/index.json') return { name: 'index' };
    if (path === 'colors/neutral.json') return palette;
    const slug = path.split('/').pop()!.replace('.json', '');
    const content = originals.get(slug);
    return content ? { files: [{ path: `registry/new-york/ui/${slug}.tsx`, content }] } : null;
  };
  const adapter = { ...shadcnAdapter, resetDefaults: (root: string) => resetDefaults(root, read) };
  await adopt({ root, apply: true, hooks: false });
  const lock = { saving: false };
  const reset = libraryReset(root, join(root, 'design'), adapter, lock);
  const button = components.find(c => c.slug === 'button')!;
  const originalButton = readFileSync(button.file, 'utf8');
  const originalCss = readFileSync(css, 'utf8');
  writeFileSync(button.file, originalButton.replace('inline-flex', 'block').replace('rounded-md', 'rounded-full') + '\n// Application-owned note.\n');
  writeFileSync(css, originalCss.replace('oklch(0.205 0 0)', '#ff00ff').replace('oklch(0.922 0 0)', '#0000ff').replace('0.625rem', '2rem'));
  return { root, css, ui, adapter, reset, read, originals, requests, lock, button, originalButton, originalCss };
}

test('reset preparation is read-only; confirmation restores shadcn styles and both themes, refreshes context, and backs up changed bytes', async t => {
  const f = await fixture(t);
  const beforeButton = readFileSync(f.button.file, 'utf8'), beforeCss = readFileSync(f.css, 'utf8');
  const plan = await f.reset.prepare();
  assert.equal(readFileSync(f.button.file, 'utf8'), beforeButton);
  assert.equal(readFileSync(f.css, 'utf8'), beforeCss);
  assert.equal(existsSync(join(f.root, '.canon/backups')), false);
  assert.equal(plan.label, 'new-york / neutral');
  assert.ok(plan.restored.includes('button'));
  const result = f.reset.apply(plan.id);
  const fresh = shadcnAdapter.inventory(f.root).find(c => c.slug === 'button')!;
  assert.match(fresh.cva!.base.join(' '), /\binline-flex\b/);
  assert.doesNotMatch(fresh.cva!.base.join(' '), /\bblock\b/);
  assert.match(readFileSync(f.button.file, 'utf8'), /Application-owned note/);
  assert.equal(readFileSync(f.css, 'utf8'), f.originalCss);
  const context = readFileSync(join(f.root, 'design/dist/DESIGN.md'), 'utf8');
  assert.match(context, /oklch\(0.205 0 0\)/);
  assert.doesNotMatch(context, /#ff00ff/);
  const manifest = JSON.parse(readFileSync(join(f.root, result.backup, 'manifest.json'), 'utf8'));
  const saved = manifest.files.find((file: any) => file.path === f.button.file);
  assert.equal(readFileSync(join(f.root, result.backup, saved.backup), 'utf8'), beforeButton);
  assert.throws(() => f.reset.apply(plan.id), /expired/);
  assert.equal(f.lock.saving, false);
});

test('cancelled reset cannot be applied and leaves saved changes intact', async t => {
  const f = await fixture(t);
  const before = readFileSync(f.css, 'utf8');
  const plan = await f.reset.prepare();
  f.reset.cancel(plan.id);
  assert.throws(() => f.reset.apply(plan.id), /expired/);
  assert.equal(readFileSync(f.css, 'utf8'), before);
  assert.equal(existsSync(join(f.root, '.canon/backups')), false);
});

test('external changes, changed config and newly added components invalidate reviewed resets', async t => {
  for (const type of ['source', 'config', 'component']) {
    const f = await fixture(t);
    const plan = await f.reset.prepare();
    const before = readFileSync(f.css, 'utf8');
    if (type === 'source') writeFileSync(f.button.file, readFileSync(f.button.file, 'utf8') + '\n// newer edit');
    if (type === 'config') writeFileSync(join(f.root, 'components.json'), readFileSync(join(f.root, 'components.json'), 'utf8') + '\n');
    if (type === 'component') writeFileSync(join(f.button.file, '..', 'custom.tsx'), 'export function Custom(){return <div/>}');
    assert.throws(() => f.reset.apply(plan.id), /changed/);
    assert.equal(readFileSync(f.css, 'utf8'), before);
    assert.equal(existsSync(join(f.root, '.canon/backups')), false);
  }
});

test('registry failure or incompatible component prevents the entire reset', async t => {
  const f = await fixture(t);
  const before = readFileSync(f.css, 'utf8');
  await assert.rejects(resetDefaults(f.root, async () => { throw Error('offline'); }), /offline/);
  await assert.rejects(resetDefaults(f.root, async path => path.endsWith('/button.json') ? { files: [{ path: 'registry/new-york/ui/button.tsx', content: 'export function Button() {return <button/>}' }] } : f.read(path)), /variants no longer match/);
  assert.equal(readFileSync(f.css, 'utf8'), before);
});

test('reset uses configured style and color, preserves project fonts/custom tokens, and names custom components', async t => {
  const f = await fixture(t);
  writeFileSync(f.css, readFileSync(f.css, 'utf8').replace(':root {', ':root {\n --font-sans: MyFont;\n --custom-brand: red;'));
  writeFileSync(join(f.button.file, '..', 'custom.tsx'), 'export function Custom() {return <div className="bg-red-500"/>}');
  const plan = await f.reset.prepare();
  assert.ok(plan.preserved.includes('custom'));
  assert.ok(f.requests.every(path => path.startsWith('styles/new-york/') || path === 'colors/neutral.json'));
  f.reset.apply(plan.id);
  const css = readFileSync(f.css, 'utf8');
  assert.match(css, /--font-sans: MyFont/);
  assert.match(css, /--custom-brand: red/);
});

test('reset and save share a lock; failure releases it', async t => {
  const f = await fixture(t);
  f.lock.saving = true;
  await assert.rejects(f.reset.prepare(), /already in progress/);
  f.lock.saving = false;
  const plan = await f.reset.prepare();
  f.lock.saving = true;
  assert.throws(() => f.reset.apply(plan.id), /already in progress/);
  f.lock.saving = false;
  f.reset.apply(plan.id);
});

test('a blocked backup destination prevents all project writes', async t => {
  const f = await fixture(t);
  const plan = await f.reset.prepare();
  const before = readFileSync(f.css, 'utf8');
  symlinkSync(f.root, join(f.root, '.canon/backups'));
  assert.throws(() => f.reset.apply(plan.id), /symlink/);
  assert.equal(readFileSync(f.css, 'utf8'), before);
  assert.equal(f.lock.saving, false);
});

test('project changes during upstream loading prevent a stale plan', async t => {
  const f = await fixture(t);
  const original = f.adapter.resetDefaults;
  f.adapter.resetDefaults = async root => {
    const defaults = await original(root);
    writeFileSync(f.button.file, readFileSync(f.button.file, 'utf8') + '\n// edit during download');
    return defaults;
  };
  await assert.rejects(f.reset.prepare(), /changed/);
  assert.equal(f.lock.saving, false);
  assert.equal(existsSync(join(f.root, '.canon/backups')), false);
});

test('reset matches installed icon transforms and keeps the SidebarTrigger accessible label hidden', async t => {
  const f = await fixture(t);
  const source = `function SidebarTrigger({className}) { return <Button className={cn(className)}><PanelLeftIcon/><span className="block">Toggle Sidebar</span></Button> }\nexport { SidebarTrigger }`;
  const canonical = source.replace('<PanelLeftIcon/>', '<IconPlaceholder lucide="PanelLeftIcon" className="cn-rtl-flip"/>').replace('className="block"', 'className="sr-only"');
  const file = join(f.button.file, '..', 'sidebar.tsx');
  writeFileSync(file, source);
  f.adapter.resetDefaults = root => resetDefaults(root, path => path.endsWith('/sidebar.json') ? Promise.resolve({ files: [{ path: 'registry/new-york/ui/sidebar.tsx', content: canonical }] }) : f.read(path));
  const plan = await f.reset.prepare();
  f.reset.apply(plan.id);
  assert.match(readFileSync(file, 'utf8'), /<span className="sr-only">Toggle Sidebar/);
  assert.doesNotMatch(readFileSync(file, 'utf8'), /cn-rtl-flip/);
});

test('reset refuses to transfer styles between different descendant elements', async t => {
  const f = await fixture(t);
  const source = 'export function Custom() {return <span className="text-sm"/>}';
  const file = join(f.button.file, '..', 'custom.tsx');
  writeFileSync(file, source);
  const read: RegistryReader = path => path.endsWith('/custom.json') ? Promise.resolve({ files: [{ path: 'registry/new-york/ui/custom.tsx', content: source.replace('<span', '<div') }] }) : f.read(path);
  await assert.rejects(resetDefaults(f.root, read), /element no longer matches/);
  assert.equal(readFileSync(file, 'utf8'), source);
});
