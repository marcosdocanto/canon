// Library-mode Studio E2E: boots an adopted fixture project's Studio through the real `serve()`
// entry point (src/serve.ts's adapter-mode branch — see tests/serve-lib.test.ts for the HTTP-level
// contract this drives) and exercises the bundled editor app (src/lib-editor/) with a real
// browser, mirroring tests/studio.test.ts's Playwright harness for the native Studio.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
async function libStudio(t: TestContext) {
  const root = clone(t);
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

function varRow(page: Page, name: string) { return page.locator(`.le-var-row[data-var="${name}"]`); }

test('boots an adopted fixture and lists a real theme var with its fixture value on the Theme tab', async t => {
  const { page } = await libStudio(t);
  // The Theme tab is the default view — no click needed, only the async state load to settle.
  assert.equal(await page.locator('#le-tab-theme').getAttribute('data-active'), '1');
  const row = varRow(page, 'primary');
  await row.waitFor({ state: 'visible', timeout: 5000 });
  assert.equal(await page.locator('#le-editor-title').innerText(), 'Theme');
  assert.equal(await row.locator('input[data-var-key="light"]').inputValue(), 'oklch(0.205 0 0)', 'the light value comes from the fixture globals.css, not a placeholder');
  assert.equal(await row.locator('input[data-var-key="dark"]').inputValue(), 'oklch(0.922 0 0)');
});

test('editing --primary through the page and saving writes the new value to globals.css and leaves button.tsx byte-identical', async t => {
  const { page, themeFile, buttonFile } = await libStudio(t);
  const buttonBefore = readFileSync(buttonFile, 'utf8');
  const cssBefore = readFileSync(themeFile, 'utf8');
  assert.match(cssBefore, /--primary:\s*oklch\(0\.205 0 0\);/);

  const row = varRow(page, 'primary');
  await row.waitFor({ state: 'visible', timeout: 5000 });
  const lightInput = row.locator('input[data-var-key="light"]');
  const save = page.locator('#le-save');
  assert.ok(await save.isDisabled(), 'Save starts disabled until something is dirty');

  // Set the text input's value directly and dispatch an `input` event, exactly as a user typing
  // (or the color picker's own `input` handler) would trigger the editor's commit() path.
  await lightInput.evaluate((el: HTMLInputElement, value: string) => {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, '#112233');
  assert.ok(await save.isEnabled(), 'changing a theme var must mark the draft dirty');

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

  const contentRow = page.locator('.le-part-row[data-part="DialogContent"]');
  await contentRow.waitFor({ state: 'visible', timeout: 5000 });
  // The structured editor renders property rows for recognized families and an Advanced chip
  // section for everything else; DialogContent's literal yields at least one of each.
  assert.ok(await contentRow.locator('.le-prop-row').count() >= 1, 'DialogContent shows structured property controls');
  assert.ok(await contentRow.locator('.le-advanced').count() === 1, 'unrecognized tokens live in a collapsed Advanced section');
  await contentRow.locator('.le-advanced > summary').click();
  assert.ok(await contentRow.locator('.le-chip').count() >= 1, 'Advanced holds the untyped tokens as chips');
  assert.match(await contentRow.locator('.le-part-tail').innerText(), /className/, 'DialogContent\'s dynamic tail (the cn(...) className arg) is shown muted beside the editor');

  const triggerRow = page.locator('.le-part-row[data-part="DialogTrigger"]');
  await triggerRow.waitFor({ state: 'visible', timeout: 5000 });
  assert.equal(await triggerRow.locator('.le-chip').count(), 0, 'DialogTrigger (a plain DialogPrimitive.Trigger alias) is read-only: no chips');
  assert.equal(await triggerRow.locator('input').count(), 0, 'DialogTrigger is read-only: no inputs');
  assert.match(await triggerRow.innerText(), /Read-only:.*no static className found/i);
});

test('adding a class to DialogContent through the Parts chip editor and saving splices only that literal, byte-identical otherwise, and reload shows it persisted', async t => {
  const { page, dialogFile } = await libStudio(t);
  const before = readFileSync(dialogFile, 'utf8');
  assert.doesNotMatch(before, /canon-part-e2e/);

  const item = page.locator('.le-comp-item[data-slug="dialog"]');
  await item.waitFor({ state: 'visible', timeout: 5000 });
  await item.click();

  const contentRow = page.locator('.le-part-row[data-part="DialogContent"]');
  await contentRow.waitFor({ state: 'visible', timeout: 5000 });
  const save = page.locator('#le-save');
  assert.ok(await save.isDisabled(), 'Save starts disabled until something is dirty');

  // The structured editor keeps free-form class entry inside the Advanced section.
  await contentRow.locator('.le-advanced > summary').click();
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
  const reloadedRow = page.locator('.le-part-row[data-part="DialogContent"]');
  await reloadedRow.waitFor({ state: 'visible', timeout: 5000 });
  await reloadedRow.locator('.le-advanced > summary').click(); // unrecognized token lives in Advanced
  assert.match(await reloadedRow.innerText(), /canon-part-e2e/, 'the persisted class is shown after a fresh state load');
  assert.ok(await page.locator('#le-save').isDisabled(), 'freshly-loaded state must not start dirty');
});
