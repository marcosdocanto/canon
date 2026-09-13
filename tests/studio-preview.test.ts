import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createSystem } from '../src/system.ts';
import { indexTokens } from '../src/engine.js';
import { previewHtml } from '../src/generators/preview.ts';
import { documentationHtml } from '../src/generators/documentation.ts';

async function preview(t: TestContext) {
  const system = await createSystem({ name: 'Preview review', prefix: 'acme' });
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(6000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.setContent(previewHtml(system, indexTokens(system.tokens, 'acme')), { waitUntil: 'domcontentloaded' });
  return page;
}

test('desktop previews keep their product layout when the inspector or Studio window gets narrower', async t => {
  const page = await preview(t);
  const frame = page.locator('#p-dashboard-page .pv-frame').first();
  const geometry = () => frame.evaluate(node => ({
    width: node.clientWidth,
    height: node.clientHeight,
    visualWidth: node.getBoundingClientRect().width,
    available: node.closest('.pv-pattern')!.clientWidth,
    sidebar: getComputedStyle(node.querySelector('.acme-sidebar')!).display,
  }));
  const initial = await geometry();
  assert.equal(initial.width, 1280, 'Desktop must have a real desktop layout width');
  assert.equal(initial.height, 760, 'The product viewport has its own bounded height');
  assert.notEqual(initial.sidebar, 'none');
  await page.locator('#pv-edit').click();
  await page.waitForFunction(() => {
    const frame = document.querySelector('#p-dashboard-page .pv-frame')!;
    return frame.getBoundingClientRect().width <= frame.closest('.pv-pattern')!.clientWidth;
  });
  const editing = await geometry();
  assert.equal(editing.width, initial.width);
  assert.notEqual(editing.sidebar, 'none', 'Opening the inspector must not switch a desktop example to mobile');
  assert.ok(editing.visualWidth < initial.visualWidth, 'Only the presentation scale changes');
  const button = frame.locator('.acme-button').first();
  await button.click();
  assert.equal(await frame.locator('.acme-button[data-pv-selected]').count(), 1, 'Scaled product elements remain inspectable');
  await page.locator('#pv-edit').click();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.waitForFunction(() => {
    const frame = document.querySelector('#p-dashboard-page .pv-frame')!;
    return frame.getBoundingClientRect().width <= frame.closest('.pv-pattern')!.clientWidth;
  });
  const narrow = await geometry();
  assert.equal(narrow.width, 1280);
  assert.notEqual(narrow.sidebar, 'none', 'A narrow Studio window must not apply browser-width media rules to the product');
  assert.ok(narrow.visualWidth <= narrow.available);
  assert.equal(await page.locator('.pv-nav').evaluate(node => getComputedStyle(node).position), 'static', 'The Studio itself still responds to browser width');

  // A live rebuild replaces the generated stylesheet, so viewport isolation must be reapplied.
  await page.evaluate(() => {
    const style = document.querySelector('#cn-css-patterns')!;
    style.textContent = style.textContent;
  });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#p-dashboard-page .pv-frame .acme-sidebar')!).display !== 'none');
  const motion = await page.locator('#cn-css-base').evaluate(node => [...(node as HTMLStyleElement).sheet!.cssRules]
    .filter(rule => rule instanceof CSSMediaRule).map(rule => (rule as CSSMediaRule).conditionText));
  assert.ok(motion.includes('(prefers-reduced-motion: reduce)'), 'Non-width media queries stay intact');

  await page.locator('#p-dashboard-page .pv-pattern:visible [data-viewport="mobile"]').click();
  assert.equal((await geometry()).width, 375, 'Mobile is an explicit product viewport choice');
  assert.equal((await geometry()).sidebar, 'none');
  assert.equal(await page.locator('#p-dashboard-page .pv-pattern:visible [data-viewport="mobile"]').getAttribute('aria-pressed'), 'true');
});

test('pattern variants show one bounded example and keep scrolling inside the preview', async t => {
  const page = await preview(t);
  const section = page.locator('#p-onboarding-page');
  assert.equal(await section.locator('.pv-pattern:visible').count(), 1, 'A five-step flow should not render five full-height pages at once');
  const picker = section.getByRole('combobox', { name: 'Example', exact: true });
  await picker.selectOption('2');
  assert.equal(await section.locator('.pv-pattern:visible').count(), 1);
  assert.match(await section.locator('.pv-pattern:visible').innerText(), /Invite your team/);
  const frame = section.locator('.pv-pattern:visible .pv-frame');
  const heights = await frame.evaluate(node => ({ viewport: node.clientHeight, minimum: parseFloat(getComputedStyle(node.querySelector('.acme-onb')!).minHeight) }));
  assert.equal(heights.viewport, 760);
  assert.equal(heights.minimum, heights.viewport, '100vh in the product must refer to the preview height');
  await frame.locator('.acme-onb').evaluate(node => {
    const content = document.createElement('div');
    content.style.height = '1500px';
    content.style.flexShrink = '0';
    node.append(content);
  });
  assert.equal(await frame.evaluate(node => node.clientHeight), 760);
  assert.ok(await frame.evaluate(node => node.scrollHeight > node.clientHeight));
  await frame.evaluate(node => { node.scrollTop = 100; });
  assert.equal(await frame.evaluate(node => node.scrollTop), 100);
  await picker.selectOption('0');
  assert.match(await section.locator('.pv-pattern:visible').innerText(), /Tell us about you/);
});

test('structural component previews use complete canonical examples instead of synthetic matrices', async t => {
  const page = await preview(t);
  const section = page.locator('#c-sidebar');
  assert.equal(await section.locator('[data-matrix]').count(), 0, 'Changing a variant attribute cannot manufacture dual-tier anatomy');
  assert.equal(await section.locator('.pv-example:visible').count(), 1, 'Only the selected sidebar example occupies the gallery');
  await section.getByRole('combobox', { name: 'Example', exact: true }).selectOption({ label: 'Dual tier' });
  const example = section.locator('.pv-example:visible');
  assert.equal(await example.locator('.acme-sidebar__rail').count(), 1);
  assert.equal(await example.locator('.acme-sidebar__panel').count(), 1);
  assert.ok(await example.locator('.pv-example__stage').evaluate(node => node.clientHeight <= 600));
  assert.equal(await page.locator('#c-header-navigation [data-matrix]').count(), 0);
  assert.ok(await page.locator('#c-button [data-matrix]').count() > 0, 'Compact controls still support a useful comparison matrix');
});

test('standalone header previews keep desktop navigation visible while inspecting a component', async t => {
  const page = await preview(t);
  const navigation = page.locator('#c-header-navigation .pv-example').first().locator('.acme-header-navigation__nav');
  assert.notEqual(await navigation.evaluate(node => getComputedStyle(node).display), 'none');
  await page.locator('#pv-edit').click();
  assert.notEqual(await navigation.evaluate(node => getComputedStyle(node).display), 'none', 'Inspector width must not collapse the header example');
  await page.locator('#pv-edit').click();
  await page.locator('#c-header-navigation .pv-example:visible [data-viewport="mobile"]').click();
  assert.equal(await navigation.evaluate(node => getComputedStyle(node).display), 'none', 'The header still supports an explicit mobile preview');
});

test('actual-size preview zoom scrolls within the canvas and survives viewport and example changes', async t => {
  const page = await preview(t);
  await page.locator('#pv-edit').click();
  const section = page.locator('#p-dashboard-page');
  const actualSize = section.locator('.pv-pattern:visible').getByRole('button', { name: 'Preview at 100%', exact: true });
  assert.equal(await actualSize.count(), 1, 'Small fitted previews need an actual-size reading option');
  await actualSize.click();
  const canvas = section.locator('.pv-pattern:visible .pv-canvas');
  const frame = section.locator('.pv-pattern:visible .pv-frame');
  assert.equal(await frame.evaluate(node => node.getBoundingClientRect().width), 1280, '100% renders product pixels at their actual size');
  const overflow = await canvas.evaluate(node => ({ horizontal: node.scrollWidth > node.clientWidth, vertical: node.scrollHeight > node.clientHeight, height: node.clientHeight }));
  assert.ok(overflow.horizontal && overflow.vertical, 'Both axes remain reachable inside the bounded canvas');
  assert.ok(overflow.height < 600, 'Actual-size zoom must not expand the whole Studio page');
  const pageScroll = await page.evaluate(() => window.scrollY);
  await canvas.evaluate(node => { node.scrollLeft = 280; node.scrollTop = 150; });
  assert.deepEqual(await canvas.evaluate(node => [node.scrollLeft, node.scrollTop]), [280, 150]);
  assert.equal(await page.evaluate(() => window.scrollY), pageScroll);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await section.locator('.pv-pattern:visible [data-viewport="mobile"]').click();
  await section.getByRole('combobox', { name: 'Example', exact: true }).selectOption('1');
  assert.equal(await section.locator('.pv-pattern:visible .pv-frame').evaluate(node => node.getBoundingClientRect().width), 375);
  const fit = section.locator('.pv-pattern:visible').getByRole('button', { name: 'Fit preview to available width', exact: true });
  assert.equal(await fit.count(), 1, 'Changing viewport and variant preserves the chosen zoom mode');
  await fit.click();
  await section.locator('.pv-pattern:visible [data-viewport="desktop"]').click();
  assert.ok(await section.locator('.pv-pattern:visible .pv-frame').evaluate(node => node.getBoundingClientRect().width < 1280));
  assert.deepEqual(await section.locator('.pv-pattern:visible .pv-canvas').evaluate(node => [node.scrollLeft, node.scrollTop]), [0, 0]);
});

test('the public catalog connects visitors to their own Studio without attempting shared edits', async t => {
  const system = await createSystem({ name: 'Public Canon', prefix: 'acme' });
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const apiRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://canon.example/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/api/')) { apiRequests.push(url.pathname); return route.fulfill({ status: 404, body: 'Not found' }); }
    const index = indexTokens(system.tokens, 'acme');
    const body = url.pathname.endsWith('docs.html')
      ? documentationHtml(system, index, '', { publicSite: true })
      : previewHtml(system, index, { publicSite: true });
    return route.fulfill({ contentType: 'text/html', body });
  });
  await page.goto('https://canon.example/canon/preview.html');
  const connect = page.getByRole('link', { name: 'Use in my project', exact: true });
  assert.ok(await connect.isVisible());
  await page.locator('#c-input .pv-h2').click();
  assert.equal(await page.locator('#pv-editor').isVisible(), false, 'The public catalog must not offer a shared writable editor');
  await page.locator('#pv-theme').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await connect.click();
  assert.equal(page.url(), 'https://canon.example/canon/docs.html#primeiro-projeto');
  assert.match(await page.locator('#doc-connect-prompt').innerText(), /https:\/\/canon\.example\/canon\/CONNECT\.md/);
  assert.doesNotMatch(await page.locator('#primeiro-projeto').innerText(), /clique em Save/);
  assert.deepEqual(apiRequests, []);
  assert.deepEqual(errors, []);
});
