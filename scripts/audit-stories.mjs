// Audit every Canon/* story in a running Storybook instance by loading each story's PREVIEW
// IFRAME directly (never the manager UI) and measuring the actual painted document — the
// page-under-test is the iframe's own `document.body`, which is exactly where a Radix/vaul
// portal (Dialog, Sheet, Tooltip, Popover, DropdownMenu, …) appends its content. Measuring the
// manager UI or only `#storybook-root` misses that content entirely and misreports a real,
// open-by-default overlay as empty. See /tmp/audit/report.json for the old, uncorrected numbers.
//
// Usage: node scripts/audit-stories.mjs <storybookBaseUrl> <outDir>
//   node scripts/audit-stories.mjs http://localhost:6006 /tmp/audit2
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:6006';
const outDir = process.argv[3] ?? '/tmp/audit2';
mkdirSync(outDir, { recursive: true });

const indexRes = await fetch(`${base}/index.json`);
const index = await indexRes.json();
const stories = Object.values(index.entries)
  .filter((e) => e.type === 'story' && e.title?.startsWith('Canon/'))
  .sort((a, b) => a.id.localeCompare(b.id));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });

/** In-page measurement: real painted content, not just #storybook-root — portals included. */
async function measure() {
  return page.evaluate(() => {
    const body = document.body;
    const text = (body.innerText ?? '').trim();
    let area = 0;
    let maxBottom = 0;
    const all = body.querySelectorAll('*');
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
      // Only count leaf-ish paint: an element with no element children contributes its own box.
      // This avoids wildly double-counting nested wrapper divs while still catching portaled
      // content appended as siblings of #storybook-root.
      if (el.children.length === 0 && (el.textContent ?? '').trim().length === 0 && el.tagName !== 'IMG' && el.tagName !== 'SVG' && el.tagName !== 'INPUT' && el.tagName !== 'BUTTON') continue;
      area += rect.width * rect.height;
      maxBottom = Math.max(maxBottom, rect.bottom);
    }
    return { textLen: text.length, text: text.slice(0, 300), area: Math.round(area), bottom: Math.round(maxBottom), count: all.length };
  });
}

const results = [];
for (const story of stories) {
  const url = `${base}/iframe.html?id=${story.id}&viewMode=story`;
  let entry = { id: story.id, slug: null, err: null };
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    // Give client-rendered effects (portals, embla, radix measurement) a moment to settle.
    await page.waitForTimeout(350);
    const m = await measure();
    entry = { ...entry, ...m };
  } catch (error) {
    entry.err = String(error?.message ?? error);
  }
  // componentPath (e.g. './components/ui/alert-dialog.tsx') carries the real slug — the id does
  // not: it's derived from the PascalCase exportName (AlertDialog -> "alertdialog"), which loses
  // word boundaries that a filename-derived slug ("alert-dialog") keeps.
  const slug = story.componentPath.replace(/^\.\/components\/ui\//, '').replace(/\.tsx$/, '');
  entry.slug = slug;
  entry.exportName = story.title.replace(/^Canon\//, '');
  const screenshotPath = join(outDir, `${slug}.png`);
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } catch { /* best effort */ }
  results.push(entry);
  console.log(`${slug.padEnd(22)} textLen=${String(entry.textLen ?? 0).padEnd(6)} area=${String(entry.area ?? 0).padEnd(8)} err=${entry.err ?? ''}`);
}

await browser.close();
writeFileSync(join(outDir, 'report.json'), JSON.stringify(results, null, 1));
console.log(`\nWrote ${results.length} entries to ${join(outDir, 'report.json')}`);
