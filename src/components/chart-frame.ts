import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference chart card: white, gray-200 ring, shadow-xs, radius 12, 20 × 24px padding; an
// 18px semibold title with a 14px muted description, a legend of 8px round swatches with 14px
// gray-600 labels 12px apart, gray-100 gridlines and 12px gray-500 axis text.

const ring = (color: string) => `inset 0 0 0 1px ${color}`;

/** Grouped bars, 6 months × 2 series, drawn with token variables only. */
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const SIGNUPS = [42, 55, 38, 60, 47, 51];
const UPGRADES = [12, 19, 15, 24, 18, 21];
const BASE = 170, MAX = 60, H = 130;
const bars = MONTHS.map((m, i) => {
  const cx = 32 + 73 * i + 36.5;
  const hs = Math.round((SIGNUPS[i] / MAX) * H), hr = Math.round((UPGRADES[i] / MAX) * H);
  return `<rect x="${cx - 22}" y="${BASE - hs}" width="20" height="${hs}" rx="2" fill="var(--cn-color-bg-action)"><title>${m} sign-ups: ${SIGNUPS[i]}</title></rect><rect x="${cx + 2}" y="${BASE - hr}" width="20" height="${hr}" rx="2" fill="var(--cn-brand-300)"><title>${m} upgrades: ${UPGRADES[i]}</title></rect><text x="${cx}" y="188" text-anchor="middle">${m}</text>`;
}).join('');
const grid = [0, 20, 40, 60].map((v) => { const y = Math.round(BASE - (v / MAX) * H); return `<line x1="32" x2="472" y1="${y}" y2="${y}" stroke="var(--cn-color-border-subtle)"/><text x="24" y="${y + 4}" text-anchor="end">${v}</text>`; }).join('');
const BAR_CHART = `<svg viewBox="0 0 480 200" width="100%" role="img" aria-label="Sign-ups and upgrades per month, last 6 months. Upgrades grew from 12 to 21." style="display:block;max-width:100%">${grid}${bars}</svg>`;

const SPARK = `<svg viewBox="0 0 320 80" width="100%" role="img" aria-label="Conversion rate, last 30 days: 3.2% to 4.2%" style="display:block;color:var(--cn-color-bg-action);max-width:100%"><defs><linearGradient id="cn-spark-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.16"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="M0,62 L32,58 L64,60 L96,48 L128,52 L160,40 L192,44 L224,30 L256,34 L288,22 L320,18 V80 H0 Z" fill="url(#cn-spark-fill)"/><polyline points="0,62 32,58 64,60 96,48 128,52 160,40 192,44 224,30 256,34 288,22 320,18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="320" cy="18" r="4" fill="var(--cn-color-bg-surface)" stroke="currentColor" stroke-width="2"/></svg>`;

const legend = (items: [string, string][]) =>
  `<div class="cn-chart-frame__legend">${items.map(([label, color]) => `<span class="cn-chart-frame__legend-item"><span class="cn-chart-frame__swatch" style="background:${color}"></span>${label}</span>`).join('')}</div>`;

export const chartFrame: ComponentSpec = {
  name: 'ChartFrame',
  slug: 'chart-frame',
  category: 'data-display',
  description: 'The card every chart lives in: an 18px semibold title and muted description on the left, a legend of round swatches on the right, a fixed-height body for the chart and a small footer line. White, gray-200 ring, shadow-xs, radius 12. The chart itself is your SVG or library output; the frame gives it the system\'s type, colors and spacing.',
  usage: 'Wrap every chart (bars, lines, areas, donuts) in dashboards and reports. Not for single numbers (Stat) and not for tables of values (Table).',
  anatomy: [
    { part: 'root', element: 'section', description: 'The card: white, gray-200 ring, shadow-xs, radius 12, 20 × 24px padding, column layout with 20px gaps.' },
    { part: 'header', element: 'header', description: 'Row: title + description on the left, legend (or a small control) on the right, 16px apart.' },
    { part: 'title', element: 'h3', description: 'What the chart shows, 18px semibold in ink, sentence case ("Sign-ups per month").' },
    { part: 'description', element: 'p', description: 'Optional one line: period, filter or definition, 14px fg-muted.', optional: true },
    { part: 'legend', element: 'div', description: 'Wrapping row of legend items, 12px apart, 14px fg-muted.', optional: true },
    { part: 'legend-item', element: 'span', description: 'Swatch + series name, 8px apart.', optional: true },
    { part: 'swatch', element: 'span', description: '8px round swatch with a 0.5px inner contrast ring, filled with the series color via an inline style using a token variable.', optional: true },
    { part: 'body', element: 'div', description: 'Where the chart goes. Position relative, min-height from size, the SVG fills the width; axis text is 12px fg-subtle. Also the place for an EmptyState or Skeleton.' },
    { part: 'footer', element: 'footer', description: 'Optional source or note, 12px fg-subtle ("Source: product analytics · Updated 2h ago").', optional: true },
  ],
  props: {
    size: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Minimum height of the body: sm 160px (sparklines and small multiples, 16 × 20px padding), md 240px (dashboard tiles), lg 320px (the main chart of a report page).',
    },
  },
  states: {},
  base: {
    root: {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.5}',
      'background-color': '{color.bg-surface}',
      'box-shadow': `${ring('{color.border-default}')}, {shadow.xs}`,
      'border-radius': '{radius.card}',
      padding: '{space.5} {space.6}',
      'min-width': '0',
      color: '{color.fg-default}',
    },
    header: { display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '{space.4}', 'flex-wrap': 'wrap' },
    title: { ...typeStyle('heading-sm'), color: '{color.fg-default}', margin: '0' },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}', 'margin-top': '{space.0.5}' },
    legend: { display: 'flex', 'flex-wrap': 'wrap', gap: '{space.1} {space.3}', ...typeStyle('body-md'), color: '{color.fg-muted}' },
    'legend-item': { display: 'inline-flex', 'align-items': 'center', gap: '{space.2}', 'white-space': 'nowrap' },
    swatch: { width: '{space.2}', height: '{space.2}', 'border-radius': '{radius.full}', 'flex-shrink': '0', 'background-color': '{color.bg-action}', 'box-shadow': 'inset 0 0 0 0.5px color-mix(in srgb, {black} 10%, transparent)' },
    body: { position: 'relative', 'min-width': '0', 'min-height': 'calc({space.56} + {space.4})' },
    footer: { ...typeStyle('body-sm'), color: '{color.fg-subtle}' },
  },
  variants: {
    size: {
      sm: { body: { 'min-height': '{space.40}' }, root: { padding: '{space.4} {space.5}', gap: '{space.4}' } },
      md: { body: { 'min-height': 'calc({space.56} + {space.4})' } },
      lg: { body: { 'min-height': 'calc({space.64} + {space.16})' } },
    },
  },
  extraCss: `
.cn-chart-frame__body > svg { display: block; width: 100%; height: auto; }
.cn-chart-frame__body > svg text { font-family: {font.family.sans}; font-size: {font.size.xs}; fill: {color.fg-subtle}; }
.cn-chart-frame .cn-chart-frame__body[data-scroll] { overflow-x: auto; }
.cn-chart-frame__body[data-scroll] > svg { min-width: {size.container.xs}; }
.cn-chart-frame__header > .cn-stat { align-items: flex-end; }`,
  examples: [
    ex('Bars, two series', `<section class="cn-chart-frame" data-size="md" style="width:100%;max-width:560px"><header class="cn-chart-frame__header"><div><h3 class="cn-chart-frame__title">Sign-ups and upgrades</h3><p class="cn-chart-frame__description">Last 6 months · all plans</p></div>${legend([['Sign-ups', 'var(--cn-color-bg-action)'], ['Upgrades', 'var(--cn-brand-300)']])}</header><div class="cn-chart-frame__body" data-scroll role="region" tabindex="0" aria-label="Sign-ups and upgrades chart; scroll horizontally on small screens">${BAR_CHART}</div><footer class="cn-chart-frame__footer">Source: product analytics · Updated 2h ago</footer></section>`, 'Series 1 = brand-600, series 2 = brand-300. Gridlines gray-100, axis text 12px gray-500, round 8px swatches.'),
    ex('Small sparkline with a Stat', `<section class="cn-chart-frame" data-size="sm" style="width:100%;max-width:320px"><header class="cn-chart-frame__header"><div><h3 class="cn-chart-frame__title">Conversion rate</h3><p class="cn-chart-frame__description">Last 30 days</p></div><div class="cn-stat" data-size="sm" data-variant="plain" data-trend="up"><div class="cn-stat__value">4.2%</div><div class="cn-stat__delta"><svg class="cn-stat__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4"/></svg><span>1.0 pt</span></div></div></header><div class="cn-chart-frame__body">${SPARK}</div></section>`, 'A plain Stat in the header slot instead of a legend; the line is brand-600 with a faint fill and a hollow end dot.'),
    ex('Large, no data', `<section class="cn-chart-frame" data-size="lg" style="width:100%;max-width:560px"><header class="cn-chart-frame__header"><div><h3 class="cn-chart-frame__title">Revenue by plan</h3><p class="cn-chart-frame__description">This quarter</p></div></header><div class="cn-chart-frame__body" style="display:flex;align-items:center;justify-content:center"><div class="cn-empty-state" data-size="sm" data-variant="default"><span class="cn-featured-icon cn-empty-state__icon" data-theme="modern" data-tone="gray" data-size="lg" data-shape="square">${ICON.inbox.replace('cn-icon', 'cn-featured-icon__icon')}</span><h3 class="cn-empty-state__title">No revenue this quarter yet</h3><p class="cn-empty-state__description">Revenue appears here once the first invoice is paid.</p></div></div></section>`, 'The body hosts an EmptyState (with a modern FeaturedIcon) when there is nothing to draw.'),
  ],
  rules: [
    'Series colors in order: 1 = brand-600 (bg-action), 2 = brand-300, 3 = gray-400. Semantic colors (success, warning, danger, info) only when the series means that state. Maximum 6 series.',
    'Gridlines are gray-100 (border-subtle), axis text is 12px gray-500, no axis lines heavier than a hairline. No 3D, no gradients beyond a faint area fill, no shadows, bars with 2px radius.',
    'The title lives in the frame header, never inside the SVG; the SVG carries only marks, axes and labels.',
    'Every series in the legend (8px round swatches, 12px apart), every axis with units; never rely on color alone (order and labels carry the meaning).',
    'The chart fills the body width. Reflow axes and marks for narrow screens; for a static SVG whose labels would become too small, use data-scroll on the body with a named, focusable scroll region. Keep the minimum height from size.',
    'One chart per frame. Small multiples are several sm frames in a grid, not one frame with subplots.',
    'No data or loading: put an EmptyState (sm) or a Skeleton in the body; keep the header so the tile does not jump.',
    'Numbers on the chart use the same formatting as the rest of the page (locale, units).',
  ],
  a11y: [
    'The SVG has role="img" and an aria-label that states the takeaway ("Upgrades grew from 12 to 21"), not just the chart name.',
    'Offer the data as a table (a "View as table" link Button in the footer or a visually hidden table) for screen readers and copy-paste.',
    'Tooltips on marks are enhancements; <title> elements inside the SVG give hover text without JS.',
    'Check series contrast against the actual surface in each supported theme. Use labels, patterns or outlines when a lighter series alone does not reach 3:1.',
  ],
  related: ['stat', 'card', 'card-header', 'empty-state', 'skeleton', 'table'],
};
