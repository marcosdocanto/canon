import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { chromium } from 'playwright';
import { createSystem, writeDesignDir, loadDesignDir } from '../src/system.ts';
import { buildSystem } from '../src/build.ts';
import type { System } from '../src/types.ts';
import { CANON_OVERRIDES } from '../src/tokens/canon-preset.ts';
import { buildTokens, deepMerge } from '../src/tokens/index.ts';
import { fullCss, indexTokens } from '../src/engine.js';
import { connect } from '../src/connect.ts';

test('the complete component catalog fits narrow containers and keeps form controls readable', async t => {
  const system = await createSystem({ name: 'Catalog review', prefix: 'cn' });
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const examples = system.components.flatMap(component => [...component.examples, ...(component.recipes ?? [])]
    .map((example, index) => `<section data-component="${component.slug}" data-example="${index}"><div class="review-stage">${example.html}</div></section>`));
  await page.setContent(`<style>${fullCss(system, indexTokens(system.tokens, 'cn')).all}
    .review-stage { padding: 24px; container-type: inline-size; display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; min-width: 0; }
    .review-stage > * { max-width: 100%; }
    </style>${examples.join('')}`);
  for (const width of [1280, 768, 375, 344]) {
    await page.setViewportSize({ width, height: 900 });
    const overflowing = await page.locator('.review-stage').evaluateAll(stages => stages
      .filter(stage => stage.scrollWidth > stage.clientWidth + 2)
      .map(stage => `${(stage.parentElement as HTMLElement).dataset.component}/${(stage.parentElement as HTMLElement).dataset.example}`));
    assert.deepEqual(overflowing, [], `Examples overflow at ${width}px`);
  }
  const clippedGroupLabels = await page.locator('.cn-button-group .cn-button__label').evaluateAll(labels => labels
    .filter(label => {
      const button = label.closest('button')!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(label);
      return [...range.getClientRects()].some(rect => rect.left < button.left - 1 || rect.right > button.right + 1 || rect.top < button.top - 1 || rect.bottom > button.bottom + 1);
    }).map(label => label.textContent));
  assert.deepEqual(clippedGroupLabels, [], 'Attached button labels stay readable inside their controls');
  for (const selector of ['.cn-field input', '.cn-date-picker input']) {
    const widths = await page.locator(selector).evaluateAll(inputs => inputs.map(input => input.getBoundingClientRect().width));
    assert.ok(widths.every(width => width >= 80), `${selector} should have room to enter and read a value`);
  }
  const pins = await page.locator('.cn-pin-input__cell').evaluateAll(inputs => inputs.map(input => input.getBoundingClientRect().width));
  assert.ok(pins.every(width => width >= 36), 'Every digit remains visible and usable on mobile');
  const steps = await page.locator('.cn-stepper__label').evaluateAll(labels => labels.map(label => label.getBoundingClientRect().width));
  assert.ok(steps.every(width => width >= 48), 'Step titles must not collapse into a few pixels');
  const headers = await page.locator('.cn-card-header__content').evaluateAll(contents => contents.map(content => content.getBoundingClientRect().width));
  assert.ok(headers.every(width => width >= 140), 'Card actions wrap before squeezing titles into a narrow column');
  const attachments = await page.locator('.cn-message__attachment-name').evaluateAll(names => names.every(name =>
    name.getBoundingClientRect().right <= name.closest('.cn-message__attachment')!.getBoundingClientRect().right));
  assert.ok(attachments, 'File names truncate inside their attachment cards');
  const chartLabels = await page.locator('.cn-chart-frame__body[data-scroll] svg text').evaluateAll(labels => labels.map(label => label.getBoundingClientRect().height));
  assert.ok(chartLabels.every(height => height >= 10), 'Chart axes must not scale down to illegible text');
});

async function studio(t: TestContext, prepare?: (system: System) => void, project?: { existing: boolean }) {
  const root = mkdtempSync(join(tmpdir(), 'canon-studio-test-'));
  const design = join(root, 'design');
  const system = await createSystem({ name: 'Studio test', prefix: 'acme' });
  prepare?.(system);
  if (project) {
    const snapshot = join(root, 'saved-design.json');
    writeFileSync(snapshot, JSON.stringify(system));
    if (project.existing) writeFileSync(join(root, 'index.html'), '<main><h1>Existing customer app</h1><p id="customer">Customer #132</p><button class="acme-button" data-variant="primary" onclick="this.textContent=\'Saved customer\'">Save customer</button></main>');
    const previousApp = existsSync(join(root, 'index.html')) ? readFileSync(join(root, 'index.html'), 'utf8') : undefined;
    await connect(snapshot, { root, hooks: false });
    assert.equal(existsSync(join(root, 'index.html')), project.existing, 'Connection must not scaffold an application');
    if (previousApp) assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), previousApp);
  } else {
    writeDesignDir(system, design);
    await buildSystem(system, design);
  }
  const portFinder = createServer();
  portFinder.listen(0, '127.0.0.1');
  await once(portFinder, 'listening');
  const port = (portFinder.address() as { port: number }).port;
  await new Promise<void>(resolve => portFinder.close(() => resolve()));
  const child = spawn(process.execPath, [fileURLToPath(new URL('../bin/canon.js', import.meta.url)), 'serve', '--design', design, '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stderr.on('data', value => { logs += value; });
  await new Promise<void>((resolve, reject) => {
    child.stdout.on('data', value => { if (String(value).includes('http://')) resolve(); });
    child.once('exit', () => reject(new Error(logs || 'Studio exited during startup')));
    child.once('error', reject);
  });
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGINT'); await exited; }
    rmSync(root, { recursive: true, force: true });
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#pv-edit').click();
  const brand = page.locator('#pv-editor input[type="text"]').first();
  const save = page.locator('#pv-save');
  const undo = page.locator('#pv-editor').getByRole('button', { name: 'Undo', exact: true });
  const renderedBrand = async () => page.evaluate(() => (window as any).__CANON__.meta.seeds.brand);
  const savedBrand = () => loadDesignDir(design).meta.seeds.brand;
  return { page, brand, save, undo, renderedBrand, savedBrand, design, root };
}

for (const existing of [false, true]) {
  test(`project Studio saves update a ${existing ? 'previously existing' : 'new'} app and agent references without a sync command`, async t => {
    const { page, brand, save, undo, design, root } = await studio(t, undefined, { existing });
    await page.locator('#pv-project').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await page.locator('#pv-project').innerText(), /Project/);
    const appFile = join(root, 'index.html');
    const markup = existing ? readFileSync(appFile, 'utf8') : '<main><h1>New application</h1><button class="acme-button" data-variant="primary">Create customer</button></main>';
    // The coding agent owns this framework-specific import; consume the generated
    // styles directly, so Save must affect the real app without another CLI command.
    writeFileSync(appFile, '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/design/dist/tokens.css"><link rel="stylesheet" href="/design/dist/base.css"><link rel="stylesheet" href="/design/dist/css/components/button.css">' + markup);
    const importedApp = readFileSync(appFile, 'utf8');
    const appServer = createHttpServer((req, res) => {
      const file = req.url === '/' ? appFile : req.url === '/design/dist/tokens.css' ? join(design, 'dist', 'tokens.css') : req.url === '/design/dist/base.css' ? join(design, 'dist', 'base.css') : req.url === '/design/dist/css/components/button.css' ? join(design, 'dist', 'css/components/button.css') : undefined;
      if (!file) { res.writeHead(404); res.end(); return; }
      res.setHeader('content-type', file.endsWith('.css') ? 'text/css' : 'text/html');
      res.setHeader('cache-control', 'no-store');
      res.end(readFileSync(file));
    });
    appServer.listen(0, '127.0.0.1');
    await once(appServer, 'listening');
    t.after(() => new Promise<void>(resolve => appServer.close(() => resolve())));
    const app = await page.context().newPage();
    await app.goto(`http://127.0.0.1:${(appServer.address() as { port: number }).port}`);
    const buttonColor = () => app.locator('.acme-button').evaluate(el => getComputedStyle(el).backgroundColor);
    const before = await buttonColor();
    await brand.fill('#1560BD');
    await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/save')), save.click()]);
    await app.reload();
    assert.notEqual(await buttonColor(), before, 'Saved design styles must reach the consuming app');
    assert.match(readFileSync(join(root, 'DESIGN.md'), 'utf8'), /#1560BD/i);
    assert.match(await page.locator('#pv-sync-hint').innerText(), /references are up to date/i);
    assert.equal(readFileSync(appFile, 'utf8'), importedApp, 'Save must not rewrite routes or domain behavior');
    if (existing) {
      assert.equal(await app.locator('#customer').innerText(), 'Customer #132');
      await app.getByRole('button', { name: 'Save customer', exact: true }).click();
      assert.equal(await app.locator('.acme-button').innerText(), 'Saved customer');
    }
    await undo.click();
    await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/save')), save.click()]);
    await app.reload();
    assert.equal(await buttonColor(), before, 'Undo + Save must restore the consuming app');
    await connect('http://127.0.0.1:1/CONNECT.md', { root, hooks: false });
    assert.equal(readFileSync(appFile, 'utf8'), importedApp, 'Reconnecting must preserve the integrated app');
  });
}

test('Studio Undo restores a brand change in both the design and preview', async t => {
  const { page, brand, undo, renderedBrand } = await studio(t);
  await brand.fill('#AABBCC');
  await page.waitForFunction(() => document.querySelector('#pv-save')?.textContent?.includes('('));
  await undo.click();
  assert.equal(await renderedBrand(), '#B4309F');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acme-brand-600').trim()), '#B4309F');
});

test('tab rows have no vertical overflow', async t => {
  const { page } = await studio(t);
  await page.locator('#pv-edit').click();
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    const overflowing = await page.locator('#c-tabs .acme-tabs').evaluateAll(rows => rows
      .filter(row => row.scrollHeight > row.clientHeight)
      .map(row => ({ variant: row.getAttribute('data-variant'), excess: row.scrollHeight - row.clientHeight })));
    assert.deepEqual(overflowing, [], `Tab rows must not scroll vertically at ${width}px`);
  }
});

test('tab notification counts fit inside the row and keep selection baselines aligned', async t => {
  const { page } = await studio(t);
  await page.locator('#pv-edit').click();
  const row = page.locator('#c-tabs .pv-example__stage').nth(1).locator('.acme-tabs');
  for (const size of ['sm', 'md']) {
    await row.evaluate((el, value) => el.setAttribute('data-size', value), size);
    const geometry = await row.evaluate(el => {
      const bounds = el.getBoundingClientRect();
      return {
        counts: [...el.querySelectorAll('.acme-tabs__count')].map(count => {
          const rect = count.getBoundingClientRect();
          return { top: rect.top - bounds.top, bottom: bounds.bottom - rect.bottom, height: rect.height };
        }),
        baselines: [...el.querySelectorAll('.acme-tabs__tab')].map(tab => bounds.bottom - tab.getBoundingClientRect().bottom),
      };
    });
    assert.equal(geometry.counts.length, 2);
    assert.ok(geometry.counts.every(count => count.height > 0 && count.top >= 0 && count.bottom >= 0),
      `${size} notification counts must remain fully visible: ${JSON.stringify(geometry.counts)}`);
    assert.ok(geometry.baselines.every(offset => Math.abs(offset) < 0.1),
      `${size} tabs with and without counts must share the row's baseline`);
  }
});

test('hovered tabs retain a distinct state from the selected view', async t => {
  const { page } = await studio(t);
  await page.locator('#pv-edit').click();
  const tabs = page.locator('#c-tabs .pv-example__stage').first().locator('.acme-tabs__tab');
  const selected = tabs.first();
  const unselected = tabs.nth(1);
  const selectedRule = await selected.evaluate(el => getComputedStyle(el).borderBottomColor);
  await unselected.hover();
  assert.equal(await unselected.getAttribute('aria-selected'), 'false');
  assert.equal(await unselected.evaluate(el => getComputedStyle(el).borderBottomColor), 'rgba(0, 0, 0, 0)');
  assert.equal(await selected.evaluate(el => getComputedStyle(el).borderBottomColor), selectedRule);
  assert.notEqual(selectedRule, 'rgba(0, 0, 0, 0)');
});

test('the Studio theme button keeps a legible icon and announces the next theme', async t => {
  const { page } = await studio(t);
  await page.locator('#pv-edit').click();
  const button = page.locator('#pv-theme');
  const icon = await button.locator('svg').boundingBox();
  assert.ok(icon && icon.width >= 16 && icon.height >= 16, 'The theme icon must not shrink inside the button padding');
  assert.equal(await button.getAttribute('aria-label'), 'Switch to dark mode');
  await button.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await button.getAttribute('aria-label'), 'Switch to light mode');
  await button.click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
});

test('the inspector explains its scope and resets only the selected variant override', async t => {
  const { page, design } = await studio(t);
  page.setDefaultTimeout(5000);
  await page.locator('#pv-editor').getByRole('button', { name: 'Inspect', exact: true }).click();
  await page.getByLabel('Component', { exact: true }).selectOption('input');
  await page.getByRole('button', { name: 'Text input', exact: true }).click();
  await page.getByLabel('Apply changes to', { exact: true }).selectOption('variants.size.md');
  const baseline = loadDesignDir(design).components.find(c => c.slug === 'input')!;
  assert.equal(await page.getByRole('button', { name: 'Reset minimum width', exact: true }).count(), 0, 'Inherited values cannot be deleted from another scope');
  await page.getByLabel('Minimum width', { exact: true }).selectOption('{space.4}');
  const save = () => Promise.all([page.waitForResponse(r => r.url().endsWith('/api/save')), page.locator('#pv-save').click()]);
  await save();
  const edited = loadDesignDir(design).components.find(c => c.slug === 'input')!;
  assert.equal(edited.variants.size.md.field['min-width'], '{space.4}');
  assert.equal(edited.base.field['min-width'], baseline.base.field['min-width']);
  assert.deepEqual(edited.variants.size.lg, baseline.variants.size.lg);
  await page.getByRole('button', { name: 'Reset minimum width', exact: true }).click();
  await save();
  const reset = loadDesignDir(design).components.find(c => c.slug === 'input')!;
  assert.equal(reset.variants.size.md.field['min-width'], undefined);
  assert.equal(reset.base.field['min-width'], baseline.base.field['min-width']);

  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByLabel('Minimum width', { exact: true }).selectOption('__custom');
    const custom = page.getByLabel('Custom minimum width', { exact: true });
    await custom.fill('24px');
    const box = await custom.boundingBox();
    assert.ok(box && box.width >= 220, 'The custom value has its own readable row');
    const overflow = await page.locator('#pv-editor').evaluate(el => el.scrollWidth - el.clientWidth);
    assert.ok(overflow <= 1, 'Inspector controls must fit the panel');
    await page.getByRole('button', { name: 'Reset minimum width', exact: true }).click();
  }
});

test('the inspector preserves an explicit scope and exposes shared values overridden in the preview', async t => {
  const { page } = await studio(t);
  await page.locator('#pv-editor').getByRole('button', { name: 'Inspect', exact: true }).click();
  await page.getByLabel('Component', { exact: true }).selectOption('input');
  await page.getByRole('button', { name: 'Text input', exact: true }).click();
  const scope = page.getByLabel('Apply changes to', { exact: true });
  await scope.selectOption('base');
  await page.getByLabel('State', { exact: true }).selectOption('focus');
  assert.equal(await scope.inputValue(), 'base', 'Changing the preview state must not discard the chosen edit scope');
  await page.getByLabel('Size', { exact: true }).selectOption('lg');
  assert.equal(await scope.inputValue(), 'base');
  await page.getByLabel('State', { exact: true }).selectOption('');
  await page.getByLabel('Size', { exact: true }).selectOption('md');
  await page.locator('#pv-inspector details[data-group="Typography"] > summary').click();
  await page.getByLabel('Text size', { exact: true }).selectOption('{font.size.xl}');
  await page.locator('#pv-theme').click();
  assert.equal(await page.getByLabel('Text size', { exact: true }).inputValue(), '{font.size.xl}', 'A shared declaration stays editable even when a size variant overrides the rendered value');
  assert.match(await page.locator('[data-property="font-size"]').innerText(), /Preview uses/);
  await page.getByRole('button', { name: 'Remove text size', exact: true }).click();
  const spec = await page.evaluate(() => (window as any).__CANON__.components.find((c: any) => c.slug === 'input'));
  assert.equal(spec.base.field['font-size'], undefined);
  assert.equal(spec.variants.size.md.field['font-size'], '{font.control.md}');
});

test('demo links stay inside the Studio while catalog navigation retains its active section', async t => {
  const { page } = await studio(t);
  await page.locator('#pv-edit').click();
  await page.goto(new URL('#c-sidebar', page.url()).href);
  const sidebarLink = page.locator('.pv-nav a[href="#c-sidebar"]');
  assert.equal(await sidebarLink.getAttribute('aria-current'), 'location');
  const project = page.locator('#c-sidebar .pv-example__stage a').filter({ hasText: /^Projects/ }).first();
  await project.scrollIntoViewIfNeeded();
  const url = page.url();
  const before = await page.evaluate(() => scrollY);
  await project.click();
  assert.equal(page.url(), url, 'A sample navigation link must not open the home page');
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) < 2);
  await project.focus();
  await page.keyboard.press('Enter');
  assert.equal(page.url(), url, 'Keyboard activation must stay in the example too');

  await page.goto(new URL('#c-pagination', page.url()).href);
  await page.locator('#c-pagination a[href="?page=3"]').first().click();
  assert.ok(page.url().endsWith('#c-pagination'), 'Query links in examples must not reload the Studio');
  await page.goto(new URL('#p-settings-page', page.url()).href);
  assert.equal(await page.locator('.pv-nav a[href="#p-settings-page"]').getAttribute('aria-current'), 'location');
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(new URL('#c-sidebar', page.url()).href);
    await page.goto(new URL('#p-settings-page', page.url()).href);
    const top = await page.locator('.pv-top').boundingBox();
    const kicker = await page.locator('#p-settings-page .pv-kicker').boundingBox();
    assert.ok(top && kicker && kicker.y >= top.y + top.height + 8, 'Section labels must remain below the sticky toolbar after anchor navigation');
  }
});

test('catalog search keeps connection links available and explains an empty result', async t => {
  const { page } = await studio(t);
  await page.locator('#pv-edit').click();
  await page.locator('#pv-search').fill('nothing-matches-this-query');
  assert.ok(await page.locator('#pv-nav-empty').isVisible());
  assert.ok(await page.locator('.pv-nav__start').isVisible());
  assert.ok(await page.locator('.pv-nav__docs').isVisible());
  await page.locator('#pv-search').fill('Sidebar');
  assert.ok(await page.locator('.pv-nav a[href="#c-sidebar"]').isVisible());
  assert.equal(await page.locator('#pv-nav-empty').isVisible(), false);
  await page.locator('#pv-search').fill('');
  assert.equal(await page.locator('.pv-nav a[hidden]').count(), 0);
});

test('Studio retains edits made during a pending save for the next save', async t => {
  const { page, brand, save, savedBrand } = await studio(t);
  await brand.fill('#AABBCC');
  await page.waitForFunction(() => document.querySelector('#pv-save')?.textContent?.includes('('));
  let release!: () => void;
  let reached!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const entered = new Promise<void>(resolve => { reached = resolve; });
  await page.route('**/api/save', async route => { reached(); await gate; await route.continue(); }, { times: 1 });
  await save.click();
  await entered;
  await brand.fill('#112233');
  await page.waitForFunction(() => document.querySelector('#pv-brand-big')?.getAttribute('style')?.includes('17, 34, 51'));
  const response = page.waitForResponse(r => r.url().endsWith('/api/save'));
  release();
  await response;
  await page.waitForFunction(() => document.querySelector('#pv-status')?.textContent?.includes('saved'));
  assert.equal(savedBrand(), '#AABBCC');
  assert.match((await save.textContent())!, /Save \(\d+\)/);
  await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/save')), save.click()]);
  assert.equal(savedBrand(), '#112233');
});

test('Studio can persist Undo after a completed save', async t => {
  const { page, brand, save, undo, savedBrand } = await studio(t);
  await brand.fill('#AABBCC');
  await page.waitForFunction(() => document.querySelector('#pv-save')?.textContent?.includes('('));
  await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/save')), save.click()]);
  await page.waitForFunction(() => document.querySelector('#pv-save')?.textContent === 'Save');
  await undo.click();
  assert.match((await save.textContent())!, /Save \(\d+\)/);
  await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/save')), save.click()]);
  assert.equal(savedBrand(), '#B4309F');
});

test('Studio preserves hand-edited tokens when changing an unrelated seed', async t => {
  const { page, brand } = await studio(t, system => { system.tokens.radius.control = '19px'; });
  await brand.fill('#AABBCC');
  await page.waitForFunction(() => document.querySelector('#pv-save')?.textContent?.includes('('));
  assert.equal(await page.evaluate(() => (window as any).__CANON__.tokens.radius.control), '19px');
});

test('Studio saves an immediate seed edit before deferred preview rendering', async t => {
  const { page, savedBrand } = await studio(t);
  // Input and the save shortcut occur in the same event-loop turn, as with a fast edit/save.
  const response = page.waitForResponse(r => r.url().endsWith('/api/save'), { timeout: 5000 });
  await page.evaluate(() => {
    const input = document.querySelector('#pv-editor input[type="text"]') as HTMLInputElement;
    input.value = '#AABBCC';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
  });
  assert.notEqual(await page.locator('#pv-status').textContent(), 'nothing to save');
  await response;
  assert.equal(savedBrand(), '#AABBCC');
});

test('Studio retains deliberate legacy overrides when changing a seed', async t => {
  const { page, design, save } = await studio(t, system => {
    delete system.meta.seeds.presetOverrides;
    system.meta.seeds.overrides = deepMerge(CANON_OVERRIDES, { font: { family: { display: 'Hand-set display' } } });
    system.tokens = buildTokens(system.meta.seeds);
  });
  await page.locator('#pv-editor summary').filter({ hasText: 'All tokens (advanced)' }).click();
  await page.locator('#pv-editor summary').filter({ hasText: 'Seeds —' }).click();
  await page.locator('#pv-editor label').filter({ has: page.locator('span', { hasText: /^Sans$/ }) }).locator('input').fill('Different sans');
  await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/save')), save.click()]);
  const saved = loadDesignDir(design);
  assert.equal(saved.tokens.font.family.sans, 'Different sans');
  assert.equal(saved.tokens.font.family.display, 'Hand-set display');
});

test('Studio Undo restores an exact token edit without resurrecting it on a later seed change', async t => {
  const { page, undo, brand } = await studio(t);
  await page.locator('#pv-editor summary').filter({ hasText: 'All tokens (advanced)' }).click();
  const radius = page.locator('#pv-editor details').filter({ has: page.locator(':scope > summary', { hasText: /^radius$/ }) });
  await radius.locator(':scope > summary').click();
  await radius.locator('.pv-tok__row').filter({ has: page.locator('code', { hasText: /^control$/ }) }).locator('input[type="text"]').fill('19px');
  assert.equal(await page.evaluate(() => (window as any).__CANON__.tokens.radius.control), '19px');
  await undo.click();
  await brand.fill('#AABBCC');
  assert.equal(await page.evaluate(() => (window as any).__CANON__.tokens.radius.control), '6px');
});

test('Studio form previews keep fields and actions inside a padded form column', async t => {
  const { page } = await studio(t);
  const frame = page.locator('#p-form-layout .pv-frame');
  const checkForm = async () => {
    const layout = await frame.evaluate(element => {
      const frame = element.getBoundingClientRect();
      const form = element.querySelector('form')!.getBoundingClientRect();
      return {
        width: form.width,
        inset: form.left - frame.left,
        overflow: element.scrollWidth - element.clientWidth,
        clipped: [...element.querySelectorAll('input, button')].filter(control => {
          const box = control.getBoundingClientRect();
          return box.left < frame.left || box.right > frame.right;
        }).length,
      };
    });
    assert.ok(layout.width <= 520, `form column stretched to ${layout.width}px`);
    assert.ok(layout.inset > 0, 'form content touches the preview border');
    assert.ok(layout.overflow <= 1, 'form preview requires horizontal scrolling');
    assert.equal(layout.clipped, 0, 'a field or action is outside the visible preview');
  };
  await checkForm(); // The editor leaves less space for the preview.
  await page.locator('#pv-edit').click();
  await checkForm();
  await page.setViewportSize({ width: 375, height: 900 });
  await checkForm();
});

test('Studio phone previews retain their phone width and fit a narrow gallery', async t => {
  const { page } = await studio(t);
  await page.locator('#pv-edit').click();
  const example = page.locator('#p-mobile-app .pv-pattern').first();
  const frame = example.locator('.pv-frame');
  assert.ok((await frame.boundingBox())!.width <= 375, 'phone catalog opens at desktop width');
  await example.locator('[data-viewport="desktop"]').click();
  assert.ok((await frame.locator(':scope > *').first().boundingBox())!.width <= 375, 'desktop mode stretches the phone screen');
  await example.locator('[data-viewport="mobile"]').click();
  await page.setViewportSize({ width: 375, height: 900 });
  const layout = await example.evaluate(element => {
    const frame = element.querySelector('.pv-frame')!.getBoundingClientRect();
    const example = element.getBoundingClientRect();
    return { contained: frame.left >= example.left && frame.right <= example.right, overflow: element.scrollWidth - element.clientWidth };
  });
  assert.ok(layout.contained, 'phone frame is cut off by the gallery border');
  assert.ok(layout.overflow <= 1, 'phone example overflows on a narrow screen');
});

test('Studio page previews contain narrow layouts while navigation tabs remain reachable', async t => {
  const { page } = await studio(t);
  await page.locator('#pv-edit').click();
  // Audit the geometry of every canonical variant. The preview-specific tests
  // separately verify that the normal picker displays only one at a time.
  await page.locator('.pv-section[data-pattern] [data-example-option]').evaluateAll(examples => examples.forEach(example => { (example as HTMLElement).hidden = false; }));
  await page.locator('[data-viewport="mobile"]').evaluateAll(buttons => buttons.forEach(button => (button as HTMLButtonElement).click()));
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.locator('.pv-frame').evaluateAll(frames => frames
      .filter(frame => frame.scrollWidth > frame.clientWidth + 1)
      .map(frame => ({ pattern: frame.closest<HTMLElement>('[data-pattern]')!.dataset.pattern, variant: frame.closest<HTMLElement>('[data-variant]')!.dataset.variant, excess: frame.scrollWidth - frame.clientWidth })));
    assert.deepEqual(overflow, [], `page previews overflow in a ${width}px gallery`);
  }
  const tabs = page.locator('#p-settings-page .pv-frame').first().locator('.acme-tabs').first();
  await tabs.getByRole('tab').last().focus();
  const navigation = await tabs.evaluate(element => {
    const viewport = element.getBoundingClientRect();
    const last = element.lastElementChild!.getBoundingClientRect();
    return { scrolled: element.scrollLeft > 0, visible: last.left >= viewport.left && last.right <= viewport.right + 1 };
  });
  assert.ok(navigation.scrolled && navigation.visible, 'last tab cannot be reached inside the navigation strip');

  const unpaddedBodies = await page.locator('.pv-frame .acme-app__card-body:not(.acme-app__card-body--flush)').evaluateAll(bodies => bodies.filter(body => parseFloat(getComputedStyle(body).paddingLeft) === 0).map(body => ({ pattern: body.closest<HTMLElement>('[data-pattern]')!.dataset.pattern, style: body.getAttribute('style'), parent: body.parentElement!.className })));
  assert.deepEqual(unpaddedBodies, [], 'Pattern content must retain padding inside a card with an edge-to-edge header');
  const tables = page.locator('.pv-frame .acme-app__card-body--flush:has(table)');
  assert.ok(await tables.count() > 0);
  assert.ok(await tables.evaluateAll(bodies => bodies.every(body => getComputedStyle(body).overflowX === 'auto' && body.getAttribute('tabindex') === '0')), 'Wide tables remain reachable by scrolling and keyboard');

  const calendar = page.locator('#p-calendar-page .pv-frame').first();
  const alignedMonth = await calendar.evaluate(frame => {
    const headings = [...frame.querySelectorAll('.acme-cal__weekdays > span')].map(day => day.getBoundingClientRect());
    const cells = [...frame.querySelectorAll('.acme-cal__cell')].slice(0, 7).map(day => day.getBoundingClientRect());
    return cells.every((cell, index) => Math.abs(cell.left - headings[index].left) < 1 && Math.abs(cell.width - headings[index].width) < 1);
  });
  assert.ok(alignedMonth, 'All seven month columns align with their weekday heading');
  const hours = await page.locator('#p-calendar-page .acme-cal__hour').evaluateAll(labels => labels.map(label => label.getBoundingClientRect().left));
  assert.ok(hours.length > 1 && hours.every(left => Math.abs(left - hours[0]) < 1), 'Calendar events must not push time labels into day columns');
  const inviteHeights = await page.locator('#p-onboarding-page .acme-onb__invite .acme-input').evaluateAll(inputs => inputs.map(input => (input as HTMLElement).offsetHeight));
  assert.ok(inviteHeights.every(height => height >= 36), 'Stacked invite fields retain their control height');
  const memberWidths = await page.locator('#p-permissions-page .acme-perm__members .acme-list__content').evaluateAll(contents => contents.map(content => (content as HTMLElement).offsetWidth));
  assert.ok(memberWidths.every(width => width >= 140), 'Member identity must remain readable beside role actions');
  const keysFit = await page.locator('#p-permissions-page .acme-perm__key').evaluateAll(keys => keys.every(key => {
    const range = document.createRange();
    range.selectNodeContents(key);
    return range.getClientRects().length === 1;
  }));
  assert.ok(keysFit, 'API key prefixes remain on one line in a horizontally scrollable table');
  const drawerActions = await page.locator('#p-modal-flows .acme-drawer__footer button').evaluateAll(buttons => buttons.every(button => {
    const box = button.getBoundingClientRect();
    const footer = button.closest('.acme-drawer__footer')!.getBoundingClientRect();
    return box.left >= footer.left && box.right <= footer.right;
  }));
  assert.ok(drawerActions, 'Every drawer action stays inside the visible footer');
  const tableActions = await page.locator('.pv-frame .acme-app__table-card .acme-card__footer button').evaluateAll(buttons => buttons.every(button => {
    const box = button.getBoundingClientRect();
    const footer = button.closest('.acme-card__footer')!.getBoundingClientRect();
    return box.left >= footer.left && box.right <= footer.right;
  }));
  assert.ok(tableActions, 'Table footer actions wrap within the padded card');
});

test('Studio documentation opens the prompt and keeps connection and Studio navigation available', async t => {
  const { page } = await studio(t);
  await page.locator('.pv-nav').getByRole('link', { name: 'Documentação', exact: true }).click({ timeout: 1500 });
  await page.getByRole('heading', { name: 'Conecte o Canon ao seu projeto', exact: true }).waitFor();
  assert.deepEqual(await page.locator('#doc-nav a').allTextContents(), ['Conectar', 'Studio']);
  await page.locator('#doc-nav').getByRole('link', { name: 'Studio', exact: true }).click();
  await page.getByRole('heading', { name: 'Explore e ajuste no Studio', exact: true }).waitFor();
  await page.goto(new URL('docs.html#studio-salvar', page.url()).href);
  await page.getByRole('heading', { name: 'Salve e continue com o agente', exact: true }).waitFor();
  await page.reload();
  assert.equal(await page.locator('article:not([hidden])').getAttribute('id'), 'studio');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.locator('#doc-nav').getByRole('link', { name: 'Conectar', exact: true }).click();
  await page.getByRole('heading', { name: 'Conecte o Canon ao seu projeto', exact: true }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 1, 'documentation overflows a phone viewport');
  await page.locator('.doc-header').getByRole('link', { name: 'Abrir Studio', exact: true }).click();
  await page.locator('#pv-edit').waitFor();
});

test('Documentation supports manual prompt copying and Studio section deep links', async t => {
  const { page } = await studio(t);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Clipboard unavailable'); } } });
    document.execCommand = () => false;
  });
  await page.goto(new URL('docs.html', page.url()).href);
  const prompt = await page.locator('#doc-connect-prompt').textContent();
  await page.getByRole('button', { name: 'Copiar prompt de conexão', exact: true }).click();
  assert.equal(await page.evaluate(() => window.getSelection()?.toString()), prompt);
  assert.match(await page.locator('#doc-start-status').innerText(), /Selecionei o prompt/);
  await page.goto(new URL('docs.html#studio-desfazer', page.url()).href);
  await page.getByText('Quero desfazer uma alteração', { exact: true }).waitFor();
  await page.locator('#studio details p').waitFor();
  assert.equal(await page.locator('article:not([hidden])').getAttribute('id'), 'studio');
  await page.goto(new URL('docs.html#visao-geral', page.url()).href);
  await page.getByRole('heading', { name: 'Conecte o Canon ao seu projeto', exact: true }).waitFor();
});

test('Get Started connects the agent to Canon instructions without a product brief', async t => {
  const { page, design } = await studio(t);
  await page.locator('.pv-nav__start').click();
  await page.getByRole('heading', { name: 'Conecte o Canon ao seu projeto', exact: true }).waitFor();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  assert.equal(await page.locator('#primeiro-projeto input, #primeiro-projeto textarea').count(), 0);
  const copy = page.getByRole('button', { name: 'Copiar prompt de conexão', exact: true });
  await copy.click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  assert.ok(prompt.startsWith('Use o Canon como design system deste projeto.'));
  assert.ok(prompt.length < 250, 'the connection prompt must stay short; Canon supplies the procedure');
  assert.doesNotMatch(prompt, /__CANON_|\[descreva|npm install|Quero construir/);
  const url = prompt.match(/http:\/\/127\.0\.0\.1:\d+\/CONNECT\.md/)?.[0];
  assert.ok(url, 'the prompt must link to this Studio instance');
  const reference = await page.request.get(url);
  assert.equal(reference.status(), 200);
  assert.match(reference.headers()['content-type'], /^text\/markdown/);
  const instructions = await reference.text();
  assert.match(instructions, /canon-package\.tgz/);
  assert.match(instructions, /npm install --save-dev \.\/\.canon\/canon-ds\.tgz/);
  assert.match(instructions, /DESIGN\.compact\.md/);
  assert.match(instructions, /does not authorize recreating the app/);
  assert.match(instructions, /canon connect/);
  assert.match(instructions, /canon studio --root <project-root> --port 0 --open/);
  await page.setViewportSize({ width: 375, height: 900 });
  await copy.click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), prompt);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  await page.goto(new URL(`file://${design}/dist/docs.html#primeiro-projeto`).href);
  const offline = await page.locator('#doc-connect-prompt').textContent();
  assert.doesNotMatch(offline!, /__CANON_|https?:/);
  const localReference = offline!.match(/file:\/\/\S+\/CONNECT\.md/)?.[0];
  assert.ok(localReference);
  assert.equal(readFileSync(fileURLToPath(localReference), 'utf8'), instructions);
});
