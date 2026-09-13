import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// Two or three concentric rings, one per metric, in brand.600 / brand.400 / brand.200 from the
// outside in, with a legend beside them. Same geometry rules as ProgressCircle: viewBox 0 0 100 100,
// stroke-width 8, radii 42 / 32 / 22 → circumferences 263.89 / 201.06 / 138.23.

const RINGS = [
  { r: 42, c: 263.89 },
  { r: 32, c: 201.06 },
  { r: 22, c: 138.23 },
];
const RING_COLOR = ['{brand.600}', '{brand.400}', '{brand.200}'];

type Metric = { label: string; value: number; text?: string };

const gauge = (o: { size?: string; metrics: Metric[]; label: string }) => {
  const rings = o.metrics.map((m, i) => {
    const { r, c } = RINGS[i];
    return `<circle class="cn-activity-gauge__ring" data-ring="${i + 1}" data-track cx="50" cy="50" r="${r}"/><circle class="cn-activity-gauge__ring" data-ring="${i + 1}" cx="50" cy="50" r="${r}" style="stroke-dasharray:${c};stroke-dashoffset:${(c * (1 - m.value / 100)).toFixed(1)}"/>`;
  }).join('');
  const legend = o.metrics.map((m, i) => `<li class="cn-activity-gauge__legend-item"><span class="cn-activity-gauge__swatch" data-ring="${i + 1}"></span><span class="cn-activity-gauge__label">${m.label}</span><span class="cn-activity-gauge__label" data-value>${m.text ?? `${m.value}%`}</span></li>`).join('');
  return `<div class="cn-activity-gauge" data-size="${o.size ?? 'md'}" role="img" aria-label="${o.label}"><svg class="cn-activity-gauge__rings" viewBox="0 0 100 100" aria-hidden="true">${rings}</svg><ul class="cn-activity-gauge__legend">${legend}</ul></div>`;
};

const OUTREACH: Metric[] = [
  { label: 'Emails sent', value: 72 },
  { label: 'Replies', value: 48 },
  { label: 'Meetings booked', value: 91 },
];

export const activityGauge: ComponentSpec = {
  name: 'ActivityGauge',
  slug: 'activity-gauge',
  category: 'data-display',
  description: 'Two or three concentric rings that each show a share of a goal, from the outer ring in the strongest brand tint to the inner one in the lightest, with a legend beside them that names each ring and its value.',
  usage: 'Use on a dashboard card to compare 2–3 related goals at a glance (sent / replied / booked; storage / bandwidth / seats). For one value use ProgressCircle; for more than three metrics or exact comparison use a bar chart in a ChartFrame; for a trend use a line chart.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Row (inline-flex, align center) with the rings on the left and the legend on the right. role="img" with an aria-label that reads every metric. Carries data-size.' },
    { part: 'rings', element: 'svg', description: 'The square svg, viewBox 0 0 100 100, holding a track and a value ring per metric.' },
    { part: 'ring', element: 'circle', description: 'One ring. data-ring="1|2|3" sets the color (brand.600 / 400 / 200, outside in); data-track marks the grey background ring. Value rings set stroke-dasharray (circumference) and stroke-dashoffset inline.' },
    { part: 'legend', element: 'ul', description: 'Stacked list of metrics next to the rings, gap space.2, no bullets.' },
    { part: 'legend-item', element: 'li', description: 'One row: swatch, label, value (label with data-value).' },
    { part: 'swatch', element: 'span', description: '8px round dot in the ring color (data-ring).' },
    { part: 'label', element: 'span', description: 'body-sm text: the metric name in fg-muted; with data-value, the number pushed to the end in fg-default, tabular.' },
  ],
  props: {
    size: { values: ['sm', 'md', 'lg'], default: 'md', description: 'Ring box 96 / 128 / 160px. sm for a stat tile, md for a dashboard card, lg for a page section with a heading.' },
  },
  states: {},
  base: {
    root: { display: 'inline-flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.6}', 'max-width': '100%', color: '{color.fg-default}', 'vertical-align': 'middle' },
    rings: { display: 'block', 'flex-shrink': '0', width: '{space.32}', height: '{space.32}', overflow: 'visible' },
    ring: {
      fill: 'none',
      stroke: '{brand.600}',
      'stroke-width': '8',
      'stroke-linecap': 'round',
      transform: 'rotate(-90deg)',
      'transform-origin': '50% 50%',
      'transition-property': 'stroke-dashoffset',
      'transition-duration': '{motion.duration.slow}',
      'transition-timing-function': '{motion.easing.standard}',
    },
    legend: { display: 'flex', 'flex-direction': 'column', gap: '{space.2}', margin: '0', padding: '0', 'list-style': 'none', 'min-width': '{space.40}' },
    'legend-item': { display: 'flex', 'align-items': 'center', gap: '{space.2}', ...typeStyle('body-sm') },
    swatch: { width: '{space.2}', height: '{space.2}', 'flex-shrink': '0', 'border-radius': '{radius.full}', 'background-color': '{brand.600}' },
    label: { color: '{color.fg-muted}', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
  },
  variants: {
    size: {
      sm: { root: { gap: '{space.4}' }, rings: { width: '{space.24}', height: '{space.24}' }, 'legend-item': { 'font-size': '{font.size.xs}' }, legend: { 'min-width': '{space.32}' } },
      md: { rings: { width: '{space.32}', height: '{space.32}' } },
      lg: { root: { gap: '{space.8}' }, rings: { width: '{space.40}', height: '{space.40}' }, 'legend-item': { 'font-size': '{font.size.md}' }, legend: { gap: '{space.3}' } },
    },
  },
  extraCss: `
.cn-activity-gauge .cn-activity-gauge__ring[data-track] { stroke: {color.bg-subtle}; stroke-linecap: butt; }
.cn-activity-gauge .cn-activity-gauge__ring[data-ring="1"]:not([data-track]), .cn-activity-gauge .cn-activity-gauge__swatch[data-ring="1"] { stroke: ${RING_COLOR[0]}; background-color: ${RING_COLOR[0]}; }
.cn-activity-gauge .cn-activity-gauge__ring[data-ring="2"]:not([data-track]), .cn-activity-gauge .cn-activity-gauge__swatch[data-ring="2"] { stroke: ${RING_COLOR[1]}; background-color: ${RING_COLOR[1]}; }
.cn-activity-gauge .cn-activity-gauge__ring[data-ring="3"]:not([data-track]), .cn-activity-gauge .cn-activity-gauge__swatch[data-ring="3"] { stroke: ${RING_COLOR[2]}; background-color: ${RING_COLOR[2]}; }
.cn-activity-gauge .cn-activity-gauge__label[data-value] { margin-inline-start: auto; color: {color.fg-default}; font-weight: {font.weight.medium}; font-variant-numeric: tabular-nums; flex-shrink: 0; }`,
  examples: [
    ex('Three metrics (md)', gauge({ metrics: OUTREACH, label: 'Outreach this week: emails sent 72%, replies 48%, meetings booked 91%' }), 'Outer ring = first metric in brand.600, then brand.400, then brand.200. Offsets: 263.89 × 0.28 = 73.9, 201.06 × 0.52 = 104.6, 138.23 × 0.09 = 12.4.'),
    ex('Two metrics', gauge({ metrics: [{ label: 'Storage', value: 64, text: '64 GB of 100' }, { label: 'Bandwidth', value: 37, text: '37%' }], label: 'Usage: storage 64 GB of 100, bandwidth 37%' }), 'With two metrics only the outer two radii are used; the values can be counts.'),
    ex('Sizes', `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--cn-space-8)">${gauge({ size: 'sm', metrics: OUTREACH, label: 'Outreach: emails sent 72%, replies 48%, meetings booked 91%' })}${gauge({ size: 'lg', metrics: OUTREACH, label: 'Outreach: emails sent 72%, replies 48%, meetings booked 91%' })}</div>`, '96px (sm) and 160px (lg) rings with body-xs / body-md legends.'),
  ],
  recipes: [
    ex('Dashboard card', `<section class="cn-card" data-variant="default" data-padding="md" style="max-width:420px"><header class="cn-card__header"><div><h3 class="cn-card__title">Outreach this week</h3><p class="cn-card__description">Share of the weekly goal, Sep 7–11</p></div></header><div class="cn-card__body">${gauge({ metrics: OUTREACH, label: 'Outreach this week: emails sent 72%, replies 48%, meetings booked 91%' })}</div></section>`, 'Title names the goal, description the period; the gauge is the whole body.'),
  ],
  rules: [
    'Two or three rings, never one (ProgressCircle) or four. Order metrics by importance: the first is the outer ring in the strongest tint.',
    'Geometry is fixed: viewBox 0 0 100 100, stroke 8, radii 42 / 32 / 22 with circumferences 263.89 / 201.06 / 138.23. Each value ring sets stroke-dasharray to its circumference and stroke-dashoffset = circumference × (1 − value / 100) inline.',
    'Every value ring has a track ring of the same radius behind it (data-track) so an empty metric still reads as a ring.',
    'Colors are the three brand tints only; the rings compare shares of goals, not statuses. Use a bar chart when the metrics need distinct hues.',
    'The legend is mandatory and lists the metrics in ring order, each with its value; the number may be a count ("64 GB of 100") when the percentage alone is unclear.',
    'Values are capped at 100%; show "100%" and say the goal was exceeded in the caption or the card description.',
    'One gauge per card. sm in stat tiles, md in dashboard cards, lg in a page section.',
  ],
  a11y: [
    'The root is role="img" with an aria-label that reads every metric and value in ring order; the svg is aria-hidden.',
    'The legend repeats the same information as visible text, so the rings are never the only source.',
    'Swatches are decorative; the pairing between ring and legend is also carried by order (outer to inner, top to bottom).',
  ],
  related: ['progress-circle', 'progress', 'stat', 'chart-frame', 'card'],
};
