// Library-mode Studio E2E: boots an adopted fixture project's Studio through the real `serve()`
// entry point (src/serve.ts's adapter-mode branch — see tests/serve-lib.test.ts for the HTTP-level
// contract this drives) and exercises the bundled editor app (src/lib-editor/) with a real
// browser, mirroring tests/studio.test.ts's Playwright harness for the native Studio.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync, writeFileSync, symlinkSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import {tmpdir} from 'node:os';
import {realComponentPreview} from '../src/generators/react-preview.ts';
import {getAdapter} from '../src/adapters/index.ts';
import {parseParts} from '../src/adapters/shadcn/parts.ts';
import {findCva,parseCva} from '../src/adapters/shadcn/cva.ts';
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
  if (!existsSync(join(root, 'node_modules'))) symlinkSync(resolve('node_modules'), join(root, 'node_modules'));
  mkdirSync(join(root, 'src/lib'), {recursive:true});
  if (!existsSync(join(root, 'src/lib/utils.ts'))) writeFileSync(join(root, 'src/lib/utils.ts'), `export function cn(...values){return values.filter(Boolean).join(' ')}`);
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

test('full reset is available from the clean Reset dropdown and requires explicit confirmation', async t => {
  const { page, themeFile, buttonFile } = await libStudio(t);
  const before = [readFileSync(themeFile, 'utf8'), readFileSync(buttonFile, 'utf8')];
  const commits: unknown[] = [];
  const cancelled: string[] = [];
  let prepared = 0;
  await page.route('**/api/lib/reset/prepare', route => route.fulfill({ json: {
    id: `reset-${++prepared}`, label: 'new-york / neutral', restored: ['button'], preserved: [],
    tokens: ['primary'], source: 'Current official shadcn defaults',
  } }));
  await page.route('**/api/lib/reset/cancel', route => {
    cancelled.push(route.request().postDataJSON().id);
    return route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/lib/reset', async route => {
    commits.push(route.request().postDataJSON());
    const state = await (await page.request.get(new URL('/api/lib/state', page.url()).href)).json();
    await route.fulfill({ json: { ...state, backup: '.canon/backups/library-reset/test' } });
  });
  const options = page.getByRole('button', { name: 'More reset options' });
  await options.waitFor();
  assert.ok(await page.locator('#le-reset').isDisabled());
  assert.ok(await options.isEnabled(), 'saved designs must be resettable without a dirty draft');
  assert.equal(await page.locator('.le-rail #le-full-reset').count(), 0);
  await options.click();
  await page.getByRole('menuitem', { name: /Full reset/ }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.waitFor();
  await page.getByText('new-york / neutral', { exact: true }).waitFor();
  assert.deepEqual(commits, [], 'opening the confirmation must not apply the reset');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.id === 'le-reset-options');
  await page.waitForTimeout(50);
  assert.deepEqual(commits, []);
  assert.deepEqual(cancelled, ['reset-1']);
  assert.deepEqual([readFileSync(themeFile, 'utf8'), readFileSync(buttonFile, 'utf8')], before);
  await options.click();
  await page.getByRole('menuitem', { name: /Full reset/ }).click();
  await page.getByText('new-york / neutral', { exact: true }).waitFor();
  await dialog.getByRole('button', { name: 'Restore defaults', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.deepEqual(commits, [{ id: 'reset-2', confirm: 'RESET_LIBRARY' }]);
  assert.ok(await page.locator('#le-save').isDisabled());
});

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
    const buttons = [...(doc?.querySelectorAll('section[data-slug="button"] button') ?? [])].filter(button => {const picks=JSON.parse(button.closest('section')?.getAttribute('data-picks') ?? '{}');return button.closest('section')?.getAttribute('data-preview-state')!=='hover' && (!picks.variant || picks.variant==='default');});
    return buttons.length >= 2 && buttons.every((button) => doc!.defaultView!.getComputedStyle(button).backgroundColor === expected);
  }, color);
}

test('live draft updates every matching variant before Save, keeps other variants unchanged, and Save writes shared source', async t => {
  const { page, buttonFile } = await libStudio(t);
  const before = readFileSync(buttonFile, 'utf8');
  await page.locator('.le-comp-item[data-slug="button"]').click();
  const frame = page.frameLocator('#le-preview-frame');
  const button = frame.locator('section[data-slug="button"][data-picks*=\'"variant":"default"\'] button').first();
  await button.click();
  assert.equal(await page.locator('.le-scope-select').getAttribute('data-value'), 'variant:variant:default');
  assert.equal(await page.locator('#le-page-title').getAttribute('data-page'), 'components');
  const outlineBefore = await frame.locator('section[data-slug="button"][data-picks*=\'"variant":"outline"\'] button').first().evaluate((node) => getComputedStyle(node).backgroundColor);
  await setInspectedColor(page, '#ff0000');
  await waitForDraftButtonColor(page, 'rgb(255, 0, 0)');
  assert.equal(readFileSync(buttonFile, 'utf8'), before, 'live preview never writes source');
  assert.equal(await frame.locator('section[data-slug="button"][data-picks*=\'"variant":"outline"\'] button').first().evaluate((node) => getComputedStyle(node).backgroundColor), outlineBefore);
  await page.locator('#le-save').click();
  await page.waitForFunction(() => document.querySelector('#le-status')?.textContent === 'saved');
  assert.match(readFileSync(buttonFile, 'utf8'), /bg-\[#ff0000\]/);
  assert.equal(await page.locator('#le-page-title').getAttribute('data-page'), 'components');
});

test('edits during an in-flight Save remain unsaved in the inspector and canvas', async t => {
  const { page, buttonFile } = await libStudio(t);
  await page.locator('.le-comp-item[data-slug="button"]').click();
  await page.frameLocator('#le-preview-frame').locator('section[data-slug="button"][data-picks*=\'"variant":"default"\'] button').first().click();
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
  await page.locator('.le-comp-item[data-slug="button"]').click();
  await page.getByRole('switch', {name: 'Mobile preview'}).click();
  await page.frameLocator('#le-preview-frame').locator('section[data-slug="button"][data-picks*=\'"variant":"default"\'] button').first().click();
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
  assert.equal(await page.locator('#le-page-title').getAttribute('data-page'), 'components');
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
    writeFileSync(join(root,'src/ui/button-group.tsx'), `import React from 'react'; export function ButtonGroup({children}) { return <div data-slot="button-group" role="group" className="flex gap-2">{React.Children.map(children,child=>React.isValidElement(child)?React.cloneElement(child,{className:"rounded-lg!"}):child)}</div>; }`);
  });
  const before = readFileSync(buttonFile,'utf8');
  await page.locator('.le-comp-item[data-slug="button-group"]').click();
  const frame = page.frameLocator('#le-preview-frame');
  await frame.locator('[data-react-gallery]').waitFor();
  const inspectMode = page.getByRole('switch',{name:'Inspect mode'});
  assert.equal(await inspectMode.isChecked(),true);
  const frameUrl = await page.locator('#le-preview-frame').getAttribute('src');
  await inspectMode.click();
  await frame.getByRole('button', {name:'Copy',exact:true}).click();
  assert.equal(await frame.getByRole('button',{name:'Copy',exact:true}).getAttribute('data-pressed'),'1');
  assert.equal(await page.locator('#le-editor-title').innerText(),'ButtonGroup');
  assert.equal(await frame.locator('[data-canon-inspect-box]').count(),0);
  await inspectMode.focus(); await page.keyboard.press('Space');
  assert.equal(await inspectMode.isChecked(),true);
  await frame.getByRole('button',{name:'Copy',exact:true}).click();
  assert.equal(await frame.getByRole('button',{name:'Copy',exact:true}).getAttribute('data-pressed'),'1','Inspect selects without activating');
  assert.equal(await page.locator('#le-preview-frame').getAttribute('src'),frameUrl,'mode switching preserves the mounted preview');
  assert.equal(await frame.locator('h1').innerText(),'ButtonGroup');
  await page.getByText('This instance overrides Radius with rounded-lg!. Editing the shared style will not change this override.',{exact:true}).waitFor();
  assert.equal(await page.locator('#le-editor-title').innerText(),'Button');
  assert.equal(await page.getByRole('combobox',{name:'Style scope'}).getAttribute('data-value'),'base');
  const radius = page.getByRole('slider',{name:'Radius',exact:true});
  await radius.focus(); await page.keyboard.press('Home');
  await page.waitForFunction(() => [...document.querySelector('#le-preview-frame').contentDocument.querySelectorAll('[data-slot="button"]')].every(el => el.classList.contains('rounded-none')));
  await page.getByText('This instance overrides Radius with rounded-lg!. Editing the shared style will not change this override.',{exact:true}).waitFor();
  assert.equal(await frame.locator('h1').innerText(),'ButtonGroup');
  assert.equal(readFileSync(buttonFile,'utf8'),before);
});

test('scope and canvas hover inspect visible parts without selecting or changing the draft', async t => {
  const {page,root} = await libStudio(t,root=>{
    symlinkSync(resolve('node_modules'),join(root,'node_modules'));
    mkdirSync(join(root,'src/lib'),{recursive:true});
    writeFileSync(join(root,'src/lib/utils.ts'), `export function cn(...values){return values.filter(Boolean).join(' ')}`);
    writeFileSync(join(root,'src/ui/card.tsx'), `import React from 'react';
export function Card({children}){return <article data-slot="card" className="p-4 border">{children}</article>}
export function CardHeader({children}){return <header data-slot="card-header" className="p-2">{children}</header>}
export function CardTitle({children}){return <h2 data-slot="card-title" className="text-lg">{children}</h2>}
export function CardDescription({children}){return <p data-slot="card-description" className="text-sm">{children}</p>}
export function CardContent({children}){return <div data-slot="card-content" className="p-2">{children}</div>}
export function CardFooter({children}){return <footer data-slot="card-footer" className="p-2">{children}</footer>}
export function CardHidden(){return <span data-slot="card-hidden">Hidden part</span>}`);
  });
  await page.locator('.le-comp-item[data-slug="card"]').click();
  const frame=page.frameLocator('#le-preview-frame');
  await frame.locator('[data-slot="card-title"]').waitFor();
  const scope=page.locator('#le-editor-body .le-scope-select');
  const before=await scope.getAttribute('data-value');
  await scope.click();
  await page.getByRole('option',{name:'CardTitle',exact:true}).hover();
  await frame.locator('[data-canon-inspect-label]').filter({hasText:'CardTitle'}).waitFor();
  assert.equal(await scope.getAttribute('data-value'),before);
  assert.equal(await page.locator('#le-save').isDisabled(),true);
  assert.equal(await frame.locator('[data-canon-inspect-box]').first().evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  await page.getByRole('option',{name:/CardHidden/}).hover();
  await page.getByText('CardHidden is not visible in this preview.',{exact:true}).waitFor();
  assert.equal(await frame.locator('[data-canon-inspect-box]').count(),0);
  await page.keyboard.press('Escape');
  assert.equal(await frame.locator('[data-canon-inspect-box]').count(),0);
  // Wait for the closing menu to unmount before reopening it. Reopening during
  // Radix's exit animation retains the old focus scope and can leave focus on the trigger.
  await page.getByRole('option',{name:'CardTitle',exact:true}).waitFor({state:'detached'});
  await scope.focus(); await page.keyboard.press('Enter');
  // Radix focuses the selected item after the popper is positioned.
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'option' && document.activeElement?.getAttribute('data-state') === 'checked');
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'option' && document.activeElement?.textContent?.trim() === 'CardHeader');
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'option' && document.activeElement?.textContent?.trim() === 'CardTitle');
  await frame.locator('[data-canon-inspect-label]').filter({hasText:'CardTitle'}).waitFor();
  await page.keyboard.press('Escape');
  await frame.locator('[data-slot="card-title"]').hover();
  await frame.locator('[data-canon-inspect-label]').filter({hasText:'CardTitle'}).waitFor();
  await page.locator('#le-editor-title').hover();
  assert.equal(await frame.locator('[data-canon-inspect-box]').count(),0);
  assert.equal(await scope.getAttribute('data-value'),before);
  assert.equal(await page.locator('#le-save').isDisabled(),true);
});

test('Theme opens a real component overview and theme edits retain the mounted preview and interactions', async t => {
  const {page} = await libStudio(t, root => {
    const css=join(root,'app/globals.css');
    writeFileSync(css,readFileSync(css,'utf8')+'\n@theme inline { --color-primary:var(--primary); --color-primary-foreground:var(--primary-foreground); }');
    symlinkSync(resolve('node_modules'), join(root, 'node_modules'));
    mkdirSync(join(root,'src/lib'),{recursive:true});
    writeFileSync(join(root,'src/lib/utils.ts'), `export function cn(...values){return values.filter(Boolean).join(' ')}`);
    const button=join(root,'src/ui/button.tsx');
    writeFileSync(button,readFileSync(button,'utf8').replace('<button\n','<button\n        data-slot="button"\n        data-pressed={pressedCount}\n'));
  });
  const frame=page.frameLocator('#le-preview-frame');
  await frame.locator('[data-preview-page="theme"] [data-slot="button"]').first().waitFor();
  assert.equal(await page.locator('.le-browser__address').innerText(),'Preview');
  assert.equal(await frame.getByRole('navigation',{name:'Workspace pages'}).count(),0);
  assert.equal(await frame.locator('[data-theme-settings]').count(),0);
  await page.getByRole('switch',{name:'Inspect mode'}).click();
  const button=frame.locator('[data-slot="button"]').first();
  await button.click();
  assert.equal(await button.getAttribute('data-pressed'),'1');
  const source=await page.locator('#le-preview-frame').getAttribute('src');
  let requests=0;
  page.on('request',request=>{if(request.url().endsWith('/api/lib/preview')) requests++;});
  await page.getByRole('button',{name:'primary light',exact:true}).click();
  const input=page.getByRole('textbox',{name:'primary light value'});
  await input.fill('#123456'); await input.press('Enter');
  await page.waitForFunction(()=>getComputedStyle((document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.documentElement).getPropertyValue('--primary').trim()==='#123456');
  await page.waitForFunction(()=>getComputedStyle((document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.querySelector('[data-slot="button"]')!).backgroundColor==='rgb(18, 52, 86)');
  assert.equal(await page.locator('#le-preview-frame').getAttribute('src'),source);
  assert.equal(await button.getAttribute('data-pressed'),'1');
  await page.getByRole('button',{name:'primary dark',exact:true}).click();
  const darkInput=page.getByRole('textbox',{name:'primary dark value'});
  await darkInput.fill('#654321'); await darkInput.press('Enter');
  assert.equal(await button.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(18, 52, 86)','dark edits must not change the light preview');
  const appearance=page.getByRole('switch',{name:'Dark preview'});
  await appearance.click();
  await page.waitForFunction(()=>getComputedStyle((document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.querySelector('[data-slot="button"]')!).backgroundColor==='rgb(101, 67, 33)');
  assert.equal(await appearance.getAttribute('aria-checked'),'true');
  assert.equal(await frame.locator('html').evaluate(el=>getComputedStyle(el).colorScheme),'dark');
  assert.equal(await page.locator('#le-preview-frame').getAttribute('src'),source);
  assert.equal(await button.getAttribute('data-pressed'),'1');
  await page.getByRole('button',{name:'primary dark',exact:true}).click();
  await darkInput.fill('#234567'); await darkInput.press('Enter');
  await page.waitForFunction(()=>getComputedStyle((document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.querySelector('[data-slot="button"]')!).backgroundColor==='rgb(35, 69, 103)');
  await appearance.click();
  await page.waitForFunction(()=>getComputedStyle((document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.querySelector('[data-slot="button"]')!).backgroundColor==='rgb(18, 52, 86)');
  assert.equal(await appearance.getAttribute('aria-checked'),'false');
  assert.equal(await frame.locator('html').evaluate(el=>getComputedStyle(el).colorScheme),'light');
  assert.equal(await page.locator('#le-preview-frame').getAttribute('src'),source);
  assert.equal(await button.getAttribute('data-pressed'),'1');
  assert.equal(requests,0,'theme edits and appearance switches must not rebuild or navigate the preview');
  await appearance.click();
  await page.locator('.le-comp-item[data-slug="button"]').click();
  await frame.locator('[data-inspect="button"]').first().waitFor();
  assert.equal(await frame.locator('html').evaluate(el=>el.classList.contains('dark')),true,'new pages inherit the selected dark appearance before swapping in');
  assert.equal(await frame.locator('html').evaluate(el=>getComputedStyle(el).colorScheme),'dark');
  await page.locator('#le-tab-theme').click();
  await frame.locator('[data-preview-page="theme"]').waitFor();
  await page.waitForFunction(()=>getComputedStyle((document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.querySelector('[data-slot="button"]')!).backgroundColor==='rgb(35, 69, 103)');
  assert.equal(await frame.locator('html').evaluate(el=>el.classList.contains('dark')),true,'returning to Theme retains dark appearance and latest dark values');
});

test('component updates keep the current styled document visible until its replacement is ready', async t => {
  const {page}=await libStudio(t);
  await page.locator('.le-comp-item[data-slug="button"]').click();
  await page.frameLocator('#le-preview-frame').locator('section[data-slug="button"][data-picks*=\'"variant":"default"\'] button').first().click();
  const source=await page.locator('#le-preview-frame').getAttribute('src');
  let release!:()=>void, accepted!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const received=new Promise<void>(resolve=>{accepted=resolve;});
  await page.route('**/api/lib/preview',async route=>{const response=await route.fetch();accepted();await gate;await route.fulfill({response});});
  await setInspectedColor(page,'#ff0000'); await received;
  assert.equal(await page.locator('#le-preview-frame').getAttribute('src'),source);
  assert.equal(await page.locator('#le-preview-frame').isVisible(),true);
  release();
  await waitForDraftButtonColor(page,'rgb(255, 0, 0)');
  assert.notEqual(await page.locator('#le-preview-frame').getAttribute('src'),source);
  assert.equal(await page.locator('#le-preview-frame').getAttribute('data-visible'),'true');
  assert.equal(await page.locator('#le-preview-pending').getAttribute('aria-hidden'),'true');
});

test('form state previews use real invalid/disabled controls and compiled focus styles without taking focus', async t => {
  const {page}=await libStudio(t,root=>{
    symlinkSync(resolve('node_modules'),join(root,'node_modules'));
    mkdirSync(join(root,'src/lib'),{recursive:true});
    writeFileSync(join(root,'src/lib/utils.ts'), `export function cn(...values){return values.filter(Boolean).join(' ')}`);
    writeFileSync(join(root,'src/ui/input-group.tsx'), `import React from 'react';
export function InputGroup({children,className,...props}) {return <div data-slot="input-group" className={"border has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[aria-invalid=true]]:border-destructive has-disabled:opacity-50 "+(className||" ")} {...props}>{children}</div>}
export function InputGroupInput(props){return <input data-slot="input-group-control" {...props}/>}
export function InputGroupAddon({align,...props}){return <div {...props}/>}
export function InputGroupText(props){return <span {...props}/>}`);
  });
  await page.locator('.le-comp-item[data-slug="input-group"]').click();
  const frame=page.frameLocator('#le-preview-frame');
  const normal=frame.locator('[data-preview-state="normal"] [data-slot="input-group"]');
  const focus=frame.locator('[data-preview-state="focus"] [data-slot="input-group"]');
  await focus.waitFor();
  assert.equal(await frame.locator('[data-preview-state="disabled"] input').isDisabled(),true);
  assert.equal(await frame.locator('[data-preview-state="error"] input').getAttribute('aria-invalid'),'true');
  assert.notEqual(await focus.evaluate(el=>getComputedStyle(el).boxShadow),await normal.evaluate(el=>getComputedStyle(el).boxShadow),'focus preview must show source ring styles including :has focus selectors');
  assert.equal(await frame.locator('[data-preview-state="focus"] input').evaluate(el=>el===document.activeElement),false);
  assert.equal(await page.evaluate(()=>document.activeElement?.tagName==='IFRAME'),false,'gallery never steals outer focus');
  // Prove the mirror preserves the real styles instead of painting its own ring.
  const simulated=await focus.evaluate(el=>({shadow:getComputedStyle(el).boxShadow,border:getComputedStyle(el).borderColor}));
  await page.getByRole('switch',{name:'Inspect mode'}).click();
  await frame.locator('[data-preview-state="normal"] input').focus();
  const actual=await normal.evaluate(el=>({shadow:getComputedStyle(el).boxShadow,border:getComputedStyle(el).borderColor}));
  assert.deepEqual(simulated,actual);
});


test('Typography menu edits shared body, heading and code fonts without rebuilding its preview', async t => {
  const {page,themeFile}=await libStudio(t,root=>{
    const css=join(root,'app/globals.css');
    writeFileSync(css,readFileSync(css,'utf8')+'\n@theme inline { --font-sans: Arial, sans-serif; --font-heading: var(--font-sans); --font-mono: monospace; }');
  });
  await page.locator('#le-tab-typography').click();
  const frame=page.frameLocator('#le-preview-frame');
  await frame.locator('[data-preview-page="typography"]').waitFor();
  assert.equal(await page.locator('#le-editor-title').innerText(),'Typography');
  assert.equal(await page.locator('#le-page-title').getAttribute('data-page'),'typography');
  assert.equal(await page.locator('#le-save').isDisabled(),true,'existing fonts load without changing the draft');
  const source=await page.locator('#le-preview-frame').getAttribute('src');
  let requests=0;page.on('request',request=>{if(request.url().endsWith('/api/lib/preview'))requests++;});
  await page.getByRole('combobox',{name:'Body font preset'}).click();
  await page.getByRole('option',{name:'Serif',exact:true}).click();
  await page.waitForFunction(()=>getComputedStyle((document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.querySelector('[data-type-body]')!).fontFamily.includes('Georgia'));
  await page.getByRole('combobox',{name:'Headings font preset'}).click();
  await page.getByRole('option',{name:'Monospace',exact:true}).click();
  await page.waitForFunction(()=>getComputedStyle((document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.querySelector('[data-type-token="font-heading"] .canon-type-specimen')!).fontFamily.includes('ui-monospace'));
  const code=page.getByRole('textbox',{name:'Code font family'});
  await code.fill('"Courier New", monospace');
  await code.press('Enter');
  await page.waitForFunction(()=>getComputedStyle((document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.querySelector('[data-type-token="font-mono"] .canon-type-specimen')!).fontFamily.includes('Courier New'));
  assert.equal(await page.locator('#le-preview-frame').getAttribute('src'),source);
  assert.equal(requests,0);
  await frame.locator('#canon-type-families summary').click();
  assert.match(await frame.locator('[data-theme-token-value="font-sans"]').innerText(),/Georgia/);
  await page.getByRole('switch',{name:'Dark preview'}).click();
  assert.match(await frame.locator('[data-type-body]').evaluate(el=>getComputedStyle(el).fontFamily),/Georgia/);
  await page.locator('#le-save').click();
  await page.waitForFunction(()=>document.querySelector('#le-status')?.textContent==='saved');
  assert.match(readFileSync(themeFile,'utf8'),/--font-sans:\s*Georgia/);
  assert.match(readFileSync(themeFile,'utf8'),/--font-heading:\s*ui-monospace/);
  assert.equal(await page.locator('#le-preview-frame').getAttribute('src'),source);
  await page.locator('#le-tab-theme').click();
  assert.equal(await page.getByRole('textbox',{name:'font-sans light',exact:true}).count(),0);
});


test('Typography does not offer undeclared font families as installed settings', async t=>{
  const {page}=await libStudio(t);
  await page.locator('#le-tab-typography').click();
  await page.getByText('No font family tokens are declared in this theme.',{exact:false}).waitFor();
  assert.equal(await page.locator('.le-font-control').count(),0);
  assert.equal(await page.locator('#le-save').isDisabled(),true);
});

test('Sonner triggers the project toast API and follows preview dark mode without remounting', async t => {
  const {page}=await libStudio(t,root=>{
    const packagePath=join(root,'package.json'),pkg={dependencies:{}};
    pkg.dependencies={...pkg.dependencies,sonner:'*'};writeFileSync(packagePath,JSON.stringify(pkg));
    const configPath=join(root,'tsconfig.json'),config=JSON.parse(readFileSync(configPath,'utf8'));
    config.compilerOptions.paths.sonner=['./src/sonner.ts'];writeFileSync(configPath,JSON.stringify(config));
    // A project-local notification API fixture verifies that the generated controls use
    // its exported API and Toaster implementation, rather than inserting fake toast markup.
    writeFileSync(join(root,'src/sonner.ts'),`import {useSyncExternalStore} from 'react';let message='';const listeners=new Set();export function toast(value){message=value;listeners.forEach(fn=>fn())};toast.success=toast;toast.error=toast;export function useMessage(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>message)}`);
    writeFileSync(join(root,'src/ui/sonner.tsx'),`import React from 'react';import {useMessage} from 'sonner';export function Toaster({theme}){const message=useMessage();return <div data-project-toaster data-theme={theme}>{message&&<div role="status">{message}</div>}</div>}`);
  });
  await page.locator('.le-comp-item[data-slug="sonner"]').click();
  const frame=page.frameLocator('#le-preview-frame');
  await frame.locator('[data-project-toaster]').waitFor({state:'attached'});
  const source=await page.locator('#le-preview-frame').getAttribute('src');
  await page.getByRole('switch',{name:'Inspect mode'}).click();
  await frame.getByRole('button',{name:'Show notification',exact:true}).click();
  assert.equal(await frame.getByRole('status').innerText(),'Changes saved');
  await frame.getByRole('button',{name:'Error',exact:true}).click();
  assert.equal(await frame.getByRole('status').innerText(),'Could not save changes');
  await page.getByRole('switch',{name:'Dark preview'}).click();
  await page.waitForFunction(()=>(document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!.querySelector('[data-project-toaster]')?.getAttribute('data-theme')==='dark');
  assert.equal(await page.locator('#le-preview-frame').getAttribute('src'),source);
  assert.equal(await frame.getByRole('status').innerText(),'Could not save changes');
});

test('Typography identifies unresolved application font variables and CSS import warnings are visible',async t=>{
  const {page}=await libStudio(t,root=>{
    const css=join(root,'app/globals.css');
    writeFileSync(css,readFileSync(css,'utf8')+'\n@theme inline { --font-mono:var(--missing-app-font); }\n@import "./missing-preview.css";');
  });
  await page.locator('#le-tab-typography').click();
  const frame=page.frameLocator('#le-preview-frame');
  await frame.locator('[data-font-resolution="font-mono"]').waitFor({state:'visible'});
  assert.match(await frame.locator('[data-font-resolution="font-mono"]').innerText(),/Unresolved font variable/);
  await page.getByText('Stylesheet could not be loaded: ./missing-preview.css',{exact:false}).waitFor();
});

test('source owners distinguish shared/missing slots, forwarded classes and repeated instances after drafts', async t=>{
  const root=mkdtempSync(join(tmpdir(),'canon-source-inspect-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  symlinkSync(resolve('node_modules'),join(root,'node_modules'));
  const file=join(root,'card.tsx');
  const source=`import React from 'react';
export function Card({children,className=''}){return <article data-slot="chart" className={'border '+className}>{children}</article>}
export function CardHeader({children}){return <header className="p-2">{children}</header>}
export function CardTitle({children}){return <h2 data-slot="field-label" className="p-2"><span data-slot="unrecognized">{children}</span></h2>}
export function CardDescription({children}){return <p data-slot="field-label" className="p-2">{children}</p>}
export function CardContent({children}){return <Card className="p-2">{children}</Card>}
export function CardFooter({children}){if(false)return <footer className="p-2">Hidden branch</footer>;return <footer data-slot="card-footer" className="p-4">{children}</footer>}`;
  writeFileSync(file,source);
  // The inner Card owns CVA styles; CardContent forwards its own editable className.
  const actual=source.replace("className={'border '+className}", 'className={cn(cardVariants(),className)}')+'\nfunction cn(...values){return values.join(" ")}\nimport {cva} from "class-variance-authority"; const cardVariants=cva("border",{variants:{variant:{default:"bg-card"}},defaultVariants:{variant:"default"}});';
  writeFileSync(file,actual);
  const info={slug:'card',file,importPath:'./card',exportName:'Card',cvaOwner:'Card',cva:parseCva(actual,findCva(actual)!),parts:parseParts(actual)};
  const html=await realComponentPreview(root,getAdapter('shadcn'),[info],{file:'',vars:{}},'card',{components:{},parts:{card:{CardTitle:'p-4 opacity-90'}}});
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const page=await browser.newPage();
  await page.setContent(html,{waitUntil:'domcontentloaded'});
  await page.locator('[data-part="CardTitle"]').first().waitFor();
  assert.equal(await page.locator('h2[data-slot]').first().getAttribute('data-part'),'CardTitle');
  assert.equal(await page.locator('p[data-slot="field-label"]').first().getAttribute('data-part'),'CardDescription');
  assert.equal(await page.locator('header').first().getAttribute('data-part'),'CardHeader');
  assert.match(await page.locator('h2[data-slot]').first().getAttribute('class') ?? '',/opacity-90/);
  assert.equal(await page.locator('footer').first().getAttribute('data-part'),null,'inactive editable branch must not be inferred from its slot');
  const forwarded=page.locator('article[data-part="CardContent"]').first();
  assert.deepEqual(JSON.parse(await forwarded.getAttribute('data-canon-sources') ?? '[]').map(p=>p.name),['Card','CardContent']);
  assert.equal(await forwarded.getAttribute('data-picks'),null,'outer part must not become an underlying CVA variant selection');
  assert.ok(Object.hasOwn(JSON.parse(await forwarded.getAttribute('data-canon-source-picks') ?? '{}'),'card'));
  const inspector=readFileSync(new URL('../studio/hover-inspector.js',import.meta.url),'utf8').replace('export function createHoverInspector','function createHoverInspector');
  await page.evaluate(inspector+'\nwindow.inspector=createHoverInspector(document,'+JSON.stringify([info])+',()=>{});');
  await page.evaluate(info=>window.inspector.scope(info,'part:CardTitle'),info);
  assert.equal(await page.locator('[data-canon-inspect-box]').count(),2);
  await page.evaluate(info=>window.inspector.scope(info,'base'),info);
  assert.equal(await page.locator('[data-canon-inspect-box]').count(),4);
  await page.evaluate(info=>window.inspector.scope(info,'part:CardFooter'),info);
  assert.equal(await page.locator('[data-canon-inspect-box]').count(),0);
  await page.locator('h2 span').first().hover();
  assert.equal(await page.locator('[data-canon-inspect-label]').innerText(),'CardTitle');
  assert.equal(readFileSync(file,'utf8'),actual,'virtual inspection markers never touch project source');
});

test('Chart palette edits only declared shared tokens and keeps mounted previews on theme updates', async t=>{
  const {page,themeFile}=await libStudio(t,root=>{
    writeFileSync(join(root,'src/ui/chart.tsx'),'export function ChartContainer({children}){return <div className="flex">{children}</div>}');
    const css=join(root,'app/globals.css');
    writeFileSync(css,readFileSync(css,'utf8').replace(':root {',':root {\n--chart-1:#334455;\n--chart-3:#667788;').replace('.dark {','.dark {\n--chart-1:#8899aa;'));
  });
  await page.locator('.le-comp-item[data-slug="chart"]').click();
  const palette=page.getByRole('region',{name:'Chart palette'});
  await palette.waitFor();
  await palette.getByRole('button',{name:'Edit palette values',exact:true}).click();
  assert.equal(await palette.locator('[data-var]').count(),2);
  assert.equal(await palette.locator('[data-var="chart-2"]').count(),0);
  const frame=page.frameLocator('#le-preview-frame');
  await frame.getByRole('status').waitFor();
  await frame.locator('body').evaluate(el=>el.dataset.paletteMounted='yes');
  await palette.getByRole('button',{name:'chart-1 light',exact:true}).click();
  await page.getByRole('textbox',{name:'chart-1 light value'}).fill('#112233');
  await page.getByRole('textbox',{name:'chart-1 light value'}).press('Enter');
  await frame.locator('html').evaluate(el=>new Promise<void>(resolve=>{const check=()=>getComputedStyle(el).getPropertyValue('--chart-1').trim()==='#112233'?resolve():requestAnimationFrame(check);check()}));
  assert.equal(await frame.locator('body').getAttribute('data-palette-mounted'),'yes');
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/lib/save')),page.locator('#le-save').click()]);
  await page.waitForFunction(()=>document.querySelector('#le-status')?.textContent==='saved');
  assert.match(readFileSync(themeFile,'utf8'),/--chart-1:\s*#112233/);
  assert.match(readFileSync(themeFile,'utf8'),/--chart-1:\s*#8899aa/,'light edit preserves declared dark palette');
  await page.locator('#le-tab-theme').click();
  await frame.locator('[data-preview-page="theme"]').waitFor();
  assert.equal(await frame.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--chart-1').trim()),'#112233');
});

test('Chart palette exposes existing Primary fallback without creating undeclared chart tokens', async t=>{
  const {page}=await libStudio(t,root=>writeFileSync(join(root,'src/ui/chart.tsx'),'export function ChartContainer({children}){return <div>{children}</div>}'));
  await page.locator('.le-comp-item[data-slug="chart"]').click();
  const palette=page.getByRole('region',{name:'Chart palette'});
  await palette.waitFor();
  await palette.getByRole('button',{name:'Edit palette values',exact:true}).click();
  assert.equal(await palette.locator('[data-var]').count(),1);
  assert.equal(await palette.getByRole('button',{name:'primary light',exact:true}).count(),1);
  assert.equal(await palette.getByRole('button',{name:'primary dark',exact:true}).count(),1);
  assert.equal(await palette.locator('[data-var="chart-1"]').count(),0);
  assert.match(await palette.innerText(),/chart-1 is not declared/);
  assert.ok(await page.locator('#le-save').isDisabled());
});

test('OKLCH wells expose a visual picker, preserve original alpha on open and color changes, and reject invalid HEX', async t=>{
  const original='oklch(0.65 0.15 250 / 0.4)';
  const {page,themeFile}=await libStudio(t,root=>{
    writeFileSync(join(root,'src/ui/chart.tsx'),'export function ChartContainer({children}){return <div>{children}</div>}');
    const css=join(root,'app/globals.css');
    writeFileSync(css,readFileSync(css,'utf8').replace(':root {',`:root {\n--chart-1:${original};`));
  });
  await page.locator('.le-comp-item[data-slug="chart"]').click();
  await page.getByRole('button',{name:'Edit palette values',exact:true}).click();
  const well=page.getByRole('button',{name:'chart-1 light',exact:true});
  await well.click();
  const picker=page.getByLabel('chart-1 light picker',{exact:true});
  await picker.waitFor();
  assert.match(await page.getByRole('textbox',{name:'chart-1 light value',exact:true}).inputValue(),/^#[a-f\d]{6}66$/i);
  await page.getByRole('button',{name:'CSS value',exact:true}).click();
  assert.equal(await page.getByRole('textbox',{name:'chart-1 light CSS value',exact:true}).inputValue(),original);
  assert.ok(await page.locator('#le-save').isDisabled());
  await page.keyboard.press('Escape');
  await page.locator('.le-popover').waitFor({state:'detached'});
  await page.getByRole('button',{name:'chart-1 dark',exact:true}).click();
  assert.match(await page.getByRole('textbox',{name:'chart-1 dark value',exact:true}).inputValue(),/^#[a-f\d]{6}66$/i);
  assert.match(await page.locator('.le-popover').innerText(),/Using the light color/);
  assert.ok(await page.locator('#le-save').isDisabled());
  await page.keyboard.press('Escape');
  await page.locator('.le-popover').waitFor({state:'detached'});
  await well.click();
  await picker.fill('#ff0000');
  assert.match(await well.getAttribute('title') ?? '',/#ff000066/,'picker preserves 40% opacity');
  const hex=page.getByRole('textbox',{name:'chart-1 light value',exact:true});
  await hex.fill('not a color');
  await page.getByRole('alert').filter({hasText:'Use a HEX color'}).waitFor();
  assert.ok(await page.getByRole('button',{name:'Apply',exact:true}).isDisabled());
  assert.match(await well.getAttribute('title') ?? '',/#ff000066/,'invalid text never reaches theme draft');
  await hex.fill('#00ff0066');
  await hex.press('Enter');
  assert.match(await well.getAttribute('title') ?? '',/#00ff0066/);
  assert.match(readFileSync(themeFile,'utf8'),/oklch\(0\.65 0\.15 250 \/ 0\.4\)/,'preview edits still require Save');
});

test('Chart series chooses shared theme tokens and excludes self and transitive cycles', async t=>{
  const {page,themeFile}=await libStudio(t,root=>{
    writeFileSync(join(root,'src/ui/chart.tsx'),'export function ChartContainer({children}){return <div>{children}</div>}');
    const css=join(root,'app/globals.css');
    writeFileSync(css,readFileSync(css,'utf8').replace(':root {',':root {\n--chart-1:#334455;\n--chart-3:var(--chart-1);\n--dependent:var(--chart-3);\n--dark-dependent:#112233;\n--font-mono:var(--missing-font);\n--font-heading:var(--font-mono);').replace('.dark {','.dark {\n--dark-dependent:var(--chart-1);'));
  });
  await page.locator('.le-comp-item[data-slug="chart"]').click();
  const frame=page.frameLocator('#le-preview-frame');
  await frame.getByRole('status').waitFor();
  await frame.locator('body').evaluate(el=>el.dataset.aliasMounted='yes');
  const selector=page.getByRole('button',{name:'chart-1 light color',exact:true});
  await selector.click();
  const menu=page.getByRole('dialog',{name:'chart-1 light color',exact:true});
  for(const name of ['chart-1','chart-3','dependent','dark-dependent','font-mono','font-heading']) assert.equal(await menu.getByRole('button',{name,exact:true}).count(),0);
  await menu.getByRole('button',{name:'primary',exact:true}).click();
  await page.waitForFunction(()=>{const doc=(document.querySelector('#le-preview-frame') as HTMLIFrameElement).contentDocument!;const css=getComputedStyle(doc.documentElement);return css.getPropertyValue('--chart-1').trim()===css.getPropertyValue('--primary').trim()});
  assert.equal(await frame.locator('body').getAttribute('data-alias-mounted'),'yes');
  assert.match(await selector.innerText(),/primary/);
  await page.locator('#le-save').click();
  await page.waitForFunction(()=>document.querySelector('#le-status')?.textContent==='saved');
  assert.match(readFileSync(themeFile,'utf8'),/--chart-1:\s*var\(--primary\)/);
  await page.getByRole('button',{name:'Edit palette values',exact:true}).click();
  await page.getByRole('button',{name:'chart-1 light',exact:true}).click();
  const hex=page.getByRole('textbox',{name:'chart-1 light value',exact:true});
  await hex.fill('#112233');await hex.press('Enter');
  assert.match(await selector.innerText(),/Custom color/,'a linked series can return to a custom palette value');
});

test('editing an open AlertDialog footer retains its real open state and updated style without reopening after navigation', async t => {
  const {page,root}=await libStudio(t,root=>{
    writeFileSync(join(root,'src/ui/alert-dialog.tsx'), `import React from 'react';
import {AlertDialog as Primitive} from 'radix-ui';
export const AlertDialog=Primitive.Root;
export const AlertDialogTrigger=Primitive.Trigger;
export const AlertDialogCancel=Primitive.Cancel;
export const AlertDialogAction=Primitive.Action;
export function AlertDialogContent({children}) { return <Primitive.Portal><Primitive.Overlay className="fixed inset-0 bg-black/40"/><Primitive.Content data-slot="alert-dialog-content" className="fixed left-8 top-8 border bg-background p-6">{children}</Primitive.Content></Primitive.Portal> }
export function AlertDialogHeader({children}) { return <header className="p-2">{children}</header> }
export const AlertDialogTitle=Primitive.Title;
export const AlertDialogDescription=Primitive.Description;
export function AlertDialogFooter({children}) { return <footer data-slot="alert-dialog-footer" className="rounded-md p-2">{children}</footer> }`);
  });
  const file=join(root,'src/ui/alert-dialog.tsx'),before=readFileSync(file,'utf8');
  await page.locator('.le-comp-item[data-slug="alert-dialog"]').click();
  const preview=page.frameLocator('#le-preview-frame');
  await preview.getByRole('button',{name:'Archive project',exact:true}).waitFor();
  const inspect=page.getByRole('switch',{name:'Inspect mode'});
  await inspect.click();
  await preview.getByRole('button',{name:'Archive project',exact:true}).click();
  await preview.getByRole('alertdialog').waitFor();
  await inspect.click();
  await choose(page,'#le-editor-body .le-scope-select','AlertDialogFooter');
  const radius=page.getByRole('slider',{name:'Radius',exact:true});
  const oldFrame=await page.locator('#le-preview-frame').getAttribute('src');
  await radius.focus(); await page.keyboard.press('Home');
  await page.waitForFunction(old=>document.querySelector('#le-preview-frame')?.getAttribute('src')!==old,oldFrame);
  await preview.getByRole('alertdialog').waitFor();
  assert.equal(await preview.locator('[data-slot="alert-dialog-footer"]').evaluate(el=>getComputedStyle(el).borderRadius),'0px');
  assert.equal(await radius.evaluate(el=>el===document.activeElement),true,'restoring the dialog must not steal inspector focus');
  assert.equal(readFileSync(file,'utf8'),before,'a draft leaves the shared file unchanged');
  await inspect.click();
  await preview.getByRole('button',{name:'Cancel',exact:true}).click();
  await preview.getByRole('alertdialog').waitFor({state:'hidden'});
  await preview.getByRole('button',{name:'Archive project',exact:true}).click();
  await preview.getByRole('alertdialog').waitFor();
  await page.locator('.le-comp-item[data-slug="button"]').click();
  await preview.locator('h1').filter({hasText:'Button'}).waitFor();
  await page.locator('.le-comp-item[data-slug="alert-dialog"]').click();
  await preview.getByRole('button',{name:'Archive project',exact:true}).waitFor();
  assert.equal(await preview.getByRole('alertdialog').count(),0,'component navigation intentionally starts a fresh example');
});
