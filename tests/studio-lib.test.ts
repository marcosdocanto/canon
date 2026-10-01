// Library-mode Studio E2E: boots an adopted fixture project's Studio through the real `serve()`
// entry point (src/serve.ts's adapter-mode branch — see tests/serve-lib.test.ts for the HTTP-level
// contract this drives) and exercises the bundled editor app (src/lib-editor/) with a real
// browser, mirroring tests/studio.test.ts's Playwright harness for the native Studio.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync, writeFileSync, symlinkSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { adopt } from '../src/adopt.ts';
import { clone } from './fixtures/clone.ts';

/**
 * Boot `serve()` (src/serve.ts) as a child process on port 0 — same recipe as
 * tests/serve-lib.test.ts's bootServe — but surface the OS-assigned port instead of an
 * http.request helper, so a Playwright page can navigate to the live Studio.
 */
async function bootServe(t: TestContext, dist: string, design: string, projectRoot: string): Promise<{ port: number }> {
  let port = 0;
  const child = spawn(process.execPath, ['--input-type=module', '-e', `import { serve } from ${JSON.stringify(new URL('../src/serve.ts', import.meta.url).href)}; await serve(process.argv[1], 0, process.argv[2], { projectRoot: process.argv[3] || undefined });`, dist, design, projectRoot], { stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (data) => { logs += data; });
  child.stderr.on('data', (data) => { logs += data; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Studio did not start: ${logs}`)), 10_000);
    const ready = () => {
      const address = logs.match(/canon studio → http:\/\/127\.0\.0\.1:(\d+)\//);
      if (address) { port = Number(address[1]); clearTimeout(timer); child.stdout.off('data', ready); resolve(); }
    };
    child.stdout.on('data', ready);
    child.once('exit', () => { clearTimeout(timer); reject(new Error(`Studio exited: ${logs}`)); });
  });
  return { port };
}

/**
 * Clone the shadcn-app fixture, adopt it (apply: true — the same fixture and flow as
 * tests/serve-lib.test.ts's libFixture), boot its Studio, and open the bundled editor in a real
 * browser page.
 */
async function libStudio(t: TestContext, prepare?: (root: string) => void) {
  const root = clone(t);
  prepare?.(root);
  await adopt({ root, apply: true, hooks: false });
  const design = join(root, 'design');
  const dist = join(design, 'dist');
  const { port } = await bootServe(t, dist, design, root);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => {
    await browser.close();
    assert.deepEqual(errors, [], 'the library editor must not throw uncaught errors');
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });

  return {
    page,
    root,
    design,
    themeFile: join(root, 'app', 'globals.css'),
    buttonFile: join(root, 'src', 'ui', 'button.tsx'),
    badgeFile: join(root, 'src', 'ui', 'badge.tsx'),
    dialogFile: join(root, 'src', 'ui', 'dialog.tsx'),
  };
}

async function choose(page: Page, selector: string, label: string) {
  await page.locator(selector).click();
  await page.getByRole('option', { name: label, exact: true }).click();
}

function varRow(page: Page, name: string) { return page.locator(`.le-var-row[data-var="${name}"]`); }

test('boots an adopted fixture and lists a real theme var with its fixture value on the Theme tab, shown as two color wells whose tooltips carry the value (never inline text)', async t => {
  const { page } = await libStudio(t);
  // The Theme tab is the default view — no click needed, only the async state load to settle.
  assert.equal(await page.locator('#le-tab-theme').getAttribute('data-active'), '1');
  const row = varRow(page, 'primary');
  await row.waitFor({ state: 'visible', timeout: 5000 });
  assert.equal(await page.locator('#le-editor-title').innerText(), 'Theme');
  const lightWell = row.locator('.le-well[data-var-key="light"]');
  const darkWell = row.locator('.le-well[data-var-key="dark"]');
  await lightWell.waitFor({ state: 'visible', timeout: 5000 });
  // The value comes from the fixture globals.css, not a placeholder — and it's never printed as
  // visible row text, only reachable via the well's title tooltip.
  assert.match((await lightWell.getAttribute('title'))!, /oklch\(0\.205 0 0\)/);
  assert.match((await darkWell.getAttribute('title'))!, /oklch\(0\.922 0 0\)/);
  assert.equal(await row.locator('input').count(), 0, 'no inline text input for a color var — only wells, until one is clicked open');
});

test('editing --primary through a well\'s popover and saving writes the new value to globals.css and leaves button.tsx byte-identical', async t => {
  const { page, themeFile, buttonFile } = await libStudio(t);
  const buttonBefore = readFileSync(buttonFile, 'utf8');
  const cssBefore = readFileSync(themeFile, 'utf8');
  assert.match(cssBefore, /--primary:\s*oklch\(0\.205 0 0\);/);

  const row = varRow(page, 'primary');
  await row.waitFor({ state: 'visible', timeout: 5000 });
  const lightWell = row.locator('.le-well[data-var-key="light"]');
  const save = page.locator('#le-save');
  assert.ok(await save.isDisabled(), 'Save starts disabled until something is dirty');

  // Click the well to open its popover, edit the hex/value text field inside it, and commit with
  // Enter (same path the Apply button takes) — exactly the "click well -> popover -> text field +
  // Apply" flow the design brief calls for, replacing the old always-visible inline input.
  await lightWell.click();
  const popoverInput = page.locator('.le-popover input[data-var-key="light"]');
  await popoverInput.waitFor({ state: 'visible', timeout: 2000 });
  await popoverInput.fill('#112233');
  await popoverInput.press('Enter');
  await page.locator('.le-popover').waitFor({ state: 'detached' });
  assert.equal(await page.locator('.le-popover').count(), 0, 'committing closes the popover');
  assert.ok(await save.isEnabled(), 'changing a theme var must mark the draft dirty');
  assert.match((await lightWell.getAttribute('title'))!, /#112233/, 'the well\'s own tooltip reflects the committed value immediately');

  await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/lib/save')), save.click()]);
  await page.waitForFunction(() => document.querySelector('#le-status')?.textContent === 'saved');

  assert.match(readFileSync(themeFile, 'utf8'), /--primary:\s*#112233;/, 'the saved value must land on disk');
  assert.equal(readFileSync(buttonFile, 'utf8'), buttonBefore, 'a theme-only save must not touch any component file');
});

test('a read-only component (badge) is marked read-only in the rail and exposes nothing editable', async t => {
  const { page } = await libStudio(t);
  const item = page.locator('.le-comp-item[data-slug="badge"]');
  await item.waitFor({ state: 'visible', timeout: 5000 });
  assert.equal(await item.getAttribute('data-readonly'), '1', 'the rail must flag badge as read-only');
  assert.match(await item.locator('.le-badge').innerText(), /read-only/i);

  await item.click();
  assert.equal(await page.locator('#le-editor-title').innerText(), 'Badge');
  await page.locator('#le-editor-body .le-hint').first().waitFor({ state: 'visible', timeout: 5000 });
  assert.match(await page.locator('#le-editor-body').innerText(), /Read-only:.*template interpolation/i, 'the read-only reason from the server must surface in the panel');
  assert.equal(await page.locator('#le-editor-body .le-chip').count(), 0, 'a read-only component offers no editable chips');
  assert.equal(await page.locator('#le-editor-body input').count(), 0, 'a read-only component offers no editable inputs');
  assert.ok(await page.locator('#le-save').isDisabled(), 'selecting a read-only component must not make Save available');
});

// ---- Parts (Task 4) ---------------------------------------------------------------------------

test('opening Dialog lists its parts: DialogContent editable with chips, DialogTrigger read-only with a reason', async t => {
  const { page } = await libStudio(t);
  const item = page.locator('.le-comp-item[data-slug="dialog"]');
  await item.waitFor({ state: 'visible', timeout: 5000 });
  // dialog.tsx has no cva() at all, so the rail must not flag it read-only (it still has editable
  // parts) — only individual read-only parts inside the panel are marked.
  assert.equal(await item.getAttribute('data-readonly'), null);
  await item.click();
  assert.equal(await page.locator('#le-editor-title').innerText(), 'Dialog');

  await choose(page, '.le-scope-select', 'DialogContent');
  const contentRow = page.locator('.le-part-row[data-part="DialogContent"]');
  await contentRow.waitFor({ state: 'visible', timeout: 5000 });
  // The structured editor renders property rows for recognized families and an Advanced chip
  // section for everything else; DialogContent's literal yields at least one of each.
  assert.ok(await contentRow.locator('.le-prop-row').count() >= 1, 'DialogContent shows structured property controls');
  assert.ok(await contentRow.locator('.le-advanced').count() === 1, 'unrecognized tokens live in a collapsed Advanced section');
  await contentRow.locator('.le-advanced-trigger').click();
  assert.ok(await contentRow.locator('.le-chip').count() >= 1, 'Advanced holds the untyped tokens as chips');
  assert.match(await contentRow.locator('.le-part-tail').innerText(), /className/, 'DialogContent\'s dynamic tail (the cn(...) className arg) is shown muted beside the editor');

  await choose(page, '.le-scope-select', 'DialogTrigger · read-only');
  const triggerRow = page.locator('.le-part-row[data-part="DialogTrigger"]');
  await triggerRow.waitFor({ state: 'visible', timeout: 5000 });
  assert.equal(await triggerRow.locator('.le-chip').count(), 0, 'DialogTrigger (a plain DialogPrimitive.Trigger alias) is read-only: no chips');
  assert.equal(await triggerRow.locator('input').count(), 0, 'DialogTrigger is read-only: no inputs');
  assert.match(await triggerRow.innerText(), /Read-only:.*no static className found/i);
});

test('DialogContent\'s background color property shows ONE well + the theme name as text, and clicking it opens a named swatch grid of the project\'s theme colors', async t => {
  const { page } = await libStudio(t);
  const item = page.locator('.le-comp-item[data-slug="dialog"]');
  await item.waitFor({ state: 'visible', timeout: 5000 });
  await item.click();

  await choose(page, '.le-scope-select', 'DialogContent');
  const contentRow = page.locator('.le-part-row[data-part="DialogContent"]');
  await contentRow.waitFor({ state: 'visible', timeout: 5000 });
  // DialogContent's literal includes `bg-background` — the Background property row's control is a
  // single trigger (well + name), never the old inline select+custom+opacity stack.
  const bgRow = contentRow.locator('.le-prop-row[data-family="background"]');
  await bgRow.waitFor({ state: 'visible', timeout: 5000 });
  const trigger = bgRow.locator('.le-prop-color-trigger');
  assert.equal(await trigger.count(), 1);
  assert.match(await trigger.innerText(), /^background$/);
  assert.equal(await bgRow.locator('select').count(), 0, 'no inline <select> — picking a color happens in the popover');

  await trigger.click();
  const popover = page.locator('.le-popover');
  await popover.waitFor({ state: 'visible', timeout: 2000 });
  const swatches = popover.locator('.le-popover-swatch');
  const names = await swatches.evaluateAll((els) => els.map((e) => e.getAttribute('title')));
  // The project's real theme colors (from globals.css), named — never an anonymous wall of
  // swatches, and never polluted by a non-color var like radius (a loose server-side heuristic
  // flags "0.625rem" as colorish; the client re-validates through the real CSS color parser).
  assert.deepEqual(names.sort(), ['background', 'border', 'foreground', 'primary', 'primary-foreground', 'ring'].sort());
  assert.equal(await popover.locator('input[placeholder="#hex / oklch(…)"]').count(), 1, 'custom value field lives in the popover');
  assert.equal(await popover.locator('input[type="number"]').count(), 1, 'opacity field lives in the popover');

  // Picking "primary" applies it and closes the popover (the component panel re-renders on any edit).
  await popover.locator('.le-popover-swatch[title="primary"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.le-popover').length === 0);
  const reopenedRow = page.locator('.le-part-row[data-part="DialogContent"] .le-prop-row[data-family="background"]');
  assert.match(await reopenedRow.locator('.le-prop-color-trigger').innerText(), /^primary$/);
  assert.ok(await page.locator('#le-save').isEnabled());
});

test('adding a class to DialogContent through the Parts chip editor and saving splices only that literal, byte-identical otherwise, and reload shows it persisted', async t => {
  const { page, dialogFile } = await libStudio(t);
  const before = readFileSync(dialogFile, 'utf8');
  assert.doesNotMatch(before, /canon-part-e2e/);

  const item = page.locator('.le-comp-item[data-slug="dialog"]');
  await item.waitFor({ state: 'visible', timeout: 5000 });
  await item.click();

  await choose(page, '.le-scope-select', 'DialogContent');
  const contentRow = page.locator('.le-part-row[data-part="DialogContent"]');
  await contentRow.waitFor({ state: 'visible', timeout: 5000 });
  const save = page.locator('#le-save');
  assert.ok(await save.isDisabled(), 'Save starts disabled until something is dirty');

  // The structured editor keeps free-form class entry inside the Advanced section.
  await contentRow.locator('.le-advanced-trigger').click();
  const addInput = contentRow.locator('.le-advanced input[placeholder="+ class ⏎"]');
  await addInput.fill('canon-part-e2e');
  await addInput.press('Enter');
  assert.ok(await save.isEnabled(), 'editing a part\'s classes must mark the draft dirty');
  assert.match(await contentRow.innerText(), /canon-part-e2e/, 'the new chip appears immediately in the draft');

  await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/lib/save')), save.click()]);
  await page.waitForFunction(() => document.querySelector('#le-status')?.textContent === 'saved');

  const after = readFileSync(dialogFile, 'utf8');
  assert.notEqual(after, before, 'dialog.tsx must change on disk');
  assert.match(after, /canon-part-e2e/);
  // Only the DialogContent literal changed (one class appended to the end of the joined string) —
  // stripping exactly that addition back out must reproduce the original file byte-for-byte.
  assert.equal(after.replace(' canon-part-e2e', ''), before, 'every other byte of dialog.tsx is unchanged');

  // A reload re-reads state fresh off disk — the edit must be genuinely persisted, not just an
  // optimistic client-side update.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await item.waitFor({ state: 'visible', timeout: 5000 });
  await item.click();
  await choose(page, '.le-scope-select', 'DialogContent');
  const reloadedRow = page.locator('.le-part-row[data-part="DialogContent"]');
  await reloadedRow.waitFor({ state: 'visible', timeout: 5000 });
  await reloadedRow.locator('.le-advanced-trigger').click(); // unrecognized token lives in Advanced
  assert.match(await reloadedRow.innerText(), /canon-part-e2e/, 'the persisted class is shown after a fresh state load');
  assert.ok(await page.locator('#le-save').isDisabled(), 'freshly-loaded state must not start dirty');
});

async function setInspectedColor(page: Page, value: string) {
  await page.locator('#le-editor-body .le-prop-row[data-family="background"] .le-prop-color-trigger').click();
  const field = page.locator('.le-popover input[placeholder="#hex / oklch(…)"]');
  await field.fill(value);
  await field.press('Enter');
  await page.keyboard.press('Escape');
}
async function waitForDraftButtonColor(page: Page, color: string) {
  await page.waitForFunction((expected) => {
    const doc = (document.querySelector('#le-preview-frame') as HTMLIFrameElement)?.contentDocument;
    const buttons = [...(doc?.querySelectorAll('[data-inspect="button"][data-variant="default"]') ?? [])];
    return buttons.length >= 2 && buttons.every((button) => doc!.defaultView!.getComputedStyle(button).backgroundColor === expected);
  }, color);
}

test('live draft updates every matching variant before Save, keeps other variants unchanged, and Save writes shared source', async t => {
  const { page, buttonFile } = await libStudio(t);
  const before = readFileSync(buttonFile, 'utf8');
  await choose(page, '#le-example', 'Settings');
  const frame = page.frameLocator('#le-preview-frame');
  const button = frame.locator('[data-inspect="button"][data-variant="default"]').first();
  await button.click();
  assert.equal(await page.locator('.le-scope-select').getAttribute('data-value'), 'variant:variant:default');
  assert.equal(await page.locator('#le-example').getAttribute('data-value'), 'settings');
  const outlineBefore = await frame.locator('[data-inspect="button"][data-variant="outline"]').first().evaluate((node) => getComputedStyle(node).backgroundColor);
  await setInspectedColor(page, '#ff0000');
  await waitForDraftButtonColor(page, 'rgb(255, 0, 0)');
  assert.equal(readFileSync(buttonFile, 'utf8'), before, 'live preview never writes source');
  assert.equal(await frame.locator('[data-inspect="button"][data-variant="outline"]').first().evaluate((node) => getComputedStyle(node).backgroundColor), outlineBefore);
  await page.locator('#le-save').click();
  await page.waitForFunction(() => document.querySelector('#le-status')?.textContent === 'saved');
  assert.match(readFileSync(buttonFile, 'utf8'), /bg-\[#ff0000\]/);
  assert.equal(await page.locator('#le-example').getAttribute('data-value'), 'settings');
});

test('edits during an in-flight Save remain unsaved in the inspector and canvas', async t => {
  const { page, buttonFile } = await libStudio(t);
  await choose(page, '#le-example', 'Settings');
  await page.frameLocator('#le-preview-frame').locator('[data-inspect="button"][data-variant="default"]').first().click();
  await setInspectedColor(page, '#ff0000');
  await waitForDraftButtonColor(page, 'rgb(255, 0, 0)');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let accepted!: () => void;
  const received = new Promise<void>((resolve) => { accepted = resolve; });
  await page.route('**/api/lib/save', async (route) => {
    const response = await route.fetch(); accepted(); await gate; await route.fulfill({ response });
  });
  await page.locator('#le-save').click(); await received;
  await setInspectedColor(page, '#0000ff');
  release();
  await page.waitForFunction(() => document.querySelector('#le-status')?.textContent?.includes('newer edits remain unsaved'));
  await waitForDraftButtonColor(page, 'rgb(0, 0, 255)');
  assert.ok(await page.locator('#le-save').isEnabled());
  assert.match(readFileSync(buttonFile, 'utf8'), /bg-\[#ff0000\]/);
  assert.doesNotMatch(readFileSync(buttonFile, 'utf8'), /bg-\[#0000ff\]/);
});

test('late preview responses cannot replace a newer draft and Reset preserves page and device', async t => {
  const { page, buttonFile } = await libStudio(t);
  const before = readFileSync(buttonFile, 'utf8');
  await choose(page, '#le-example', 'Settings');
  await choose(page, '#le-device', 'Mobile');
  await page.frameLocator('#le-preview-frame').locator('[data-inspect="button"][data-variant="default"]').first().click();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let accepted!: () => void;
  const received = new Promise<void>((resolve) => { accepted = resolve; });
  let delayed = false;
  await page.route('**/api/lib/preview', async (route) => {
    if (!delayed && route.request().postData()?.includes('#ff0000')) {
      delayed = true;
      const response = await route.fetch(); accepted(); await gate;
      await route.fulfill({ response }).catch(() => {}); return;
    }
    await route.continue();
  });
  await setInspectedColor(page, '#ff0000'); await received;
  await setInspectedColor(page, '#0000ff');
  await waitForDraftButtonColor(page, 'rgb(0, 0, 255)');
  release();
  await page.locator('#le-reset').click();
  await page.waitForFunction(() => (document.querySelector('#le-save') as HTMLButtonElement)?.disabled);
  assert.equal(await page.locator('#le-example').getAttribute('data-value'), 'settings');
  assert.equal(await page.locator('#le-device').getAttribute('data-value'), 'mobile');
  assert.equal(readFileSync(buttonFile, 'utf8'), before);
});


test('keyboard controls edit a shared radius and color popover returns focus; mobile stays usable', async t => {
  const { page, buttonFile } = await libStudio(t);
  const before = readFileSync(buttonFile, 'utf8');
  await page.locator('.le-comp-item[data-slug="button"]').click();
  const scope = page.getByRole('combobox', { name: 'Style scope' });
  await scope.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  const radius = page.getByRole('slider', { name: 'Radius', exact: true });
  await radius.focus();
  await page.keyboard.press('Home');
  assert.ok(await page.locator('#le-save').isEnabled());
  assert.equal(readFileSync(buttonFile, 'utf8'), before);
  await page.locator('#le-tab-theme').click();
  const well = page.getByRole('button', { name: 'primary light', exact: true });
  await well.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'primary light value' }).waitFor();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'primary light');
  assert.equal(await well.evaluate(el => el === document.activeElement), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('textbox', { name: 'Find a component' }).fill('button');
  await page.locator('.le-comp-item[data-slug="button"]').click();
  assert.equal(await page.locator('#le-editor-title').innerText(), 'Button');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
});

test('real gallery preserves component interaction and its composition while inspecting nested controls', async t => {
  const { page, root, buttonFile } = await libStudio(t, (root) => {
    symlinkSync(resolve('node_modules'), join(root, 'node_modules'));
    mkdirSync(join(root,'src/lib'),{recursive:true});
    writeFileSync(join(root,'src/lib/utils.ts'), `export function cn(...values){return values.filter(Boolean).join(' ')}`);
    const button = join(root, 'src/ui/button.tsx');
    writeFileSync(button, readFileSync(button,'utf8').replace('<button\n', '<button\n        data-slot="button"\n        data-pressed={pressedCount}\n'));
    writeFileSync(join(root,'src/ui/button-group.tsx'), `import React from 'react'; export function ButtonGroup({children}) { return <div data-slot="button-group" role="group" className="flex gap-2">{children}</div>; }`);
  });
  const before = readFileSync(buttonFile,'utf8');
  await page.locator('.le-comp-item[data-slug="button-group"]').click();
  await choose(page, '#le-example', 'Components');
  const frame = page.frameLocator('#le-preview-frame');
  await frame.locator('[data-react-gallery]').waitFor();
  await frame.getByRole('button', {name:'Copy',exact:true}).click();
  assert.equal(await frame.getByRole('button',{name:'Copy',exact:true}).getAttribute('data-pressed'),'1');
  assert.equal(await frame.locator('h1').innerText(),'ButtonGroup');
  assert.equal(await page.locator('#le-editor-title').innerText(),'Button');
  assert.equal(await page.getByRole('combobox',{name:'Style scope'}).getAttribute('data-value'),'base');
  const radius = page.getByRole('slider',{name:'Radius',exact:true});
  await radius.focus(); await page.keyboard.press('Home');
  await page.waitForFunction(() => [...document.querySelector('#le-preview-frame').contentDocument.querySelectorAll('[data-slot="button"]')].every(el => el.classList.contains('rounded-none')));
  assert.equal(await frame.locator('h1').innerText(),'ButtonGroup');
  assert.equal(readFileSync(buttonFile,'utf8'),before);
});
