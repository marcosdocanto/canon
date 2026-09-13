import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// SVG ring in a 100-unit viewBox: r = 42, circumference 2π·42 = 263.89. The indicator is a dashed
// circle whose stroke-dashoffset = 263.89 × (1 − value) (half gauge: 131.95 × (1 − value)).
// The label and caption are HTML centered over the ring; the svg sits behind them.

const C = 263.89;
const HALF = 131.95;
const off = (pct: number, half = false) => ((half ? HALF : C) * (1 - pct / 100)).toFixed(1);

const SIZES = {
  xs: { box: '{space.16}', stroke: '10', label: 'label-xs' },
  sm: { box: '{space.24}', stroke: '8', label: 'label-sm' },
  md: { box: '{space.40}', stroke: '6', label: 'heading-sm' },
  lg: { box: 'calc({space.40} + {space.10})', stroke: '5', label: 'heading-lg' },
} as const;

const TONE: Record<string, string> = { action: '{color.bg-action}', success: '{color.bg-success}', warning: '{color.bg-warning}', danger: '{color.bg-danger}' };

const ring = (o: { size?: string; variant?: string; tone?: string; value: number; label: string; caption?: string; text?: string }) => {
  const half = o.variant === 'half';
  return `<div class="cn-progress-circle" data-size="${o.size ?? 'md'}" data-variant="${o.variant ?? 'circle'}" data-tone="${o.tone ?? 'action'}" role="progressbar" aria-valuenow="${o.value}" aria-valuemin="0" aria-valuemax="100" aria-label="${o.label}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="cn-progress-circle__track" cx="50" cy="50" r="42"/><circle class="cn-progress-circle__indicator" cx="50" cy="50" r="42" style="stroke-dashoffset:${off(o.value, half)}"/></svg><div class="cn-progress-circle__label">${o.text ?? `${o.value}%`}</div>${o.caption ? `<div class="cn-progress-circle__caption">${o.caption}</div>` : ''}</div>`;
};

export const progressCircle: ComponentSpec = {
  name: 'ProgressCircle',
  slug: 'progress-circle',
  category: 'feedback',
  description: 'A ring that shows a share of a whole: a hairline track, a round-capped indicator in the action (or status) color, and the value centered inside with an optional caption. The half variant is a gauge that opens downward.',
  usage: 'Use for one headline percentage that deserves space: storage used, goal completion, a KPI on a dashboard card, an upload in a dialog. For inline or row-level progress use Progress (the bar); for a wait without a value use Spinner; for several metrics at once use ActivityGauge.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Square box (inline-flex column, centered) that positions the svg behind the label. role="progressbar" with aria-valuenow/min/max and an aria-label. Carries data-size, data-variant, data-tone.' },
    { part: 'track', element: 'circle', description: 'The full ring in the hairline color (stroke border-default). r = 42 in a 0 0 100 100 viewBox, fill none.' },
    { part: 'indicator', element: 'circle', description: 'The value ring: same geometry, stroke in the tone color, round caps, dasharray 263.89. Its stroke-dashoffset is an inline style computed from the value.' },
    { part: 'label', element: 'div', description: 'The centered value ("72%"), tabular numerals. Type scales with size: label-xs / label-sm / heading-sm / heading-lg.' },
    { part: 'caption', element: 'div', description: 'body-xs muted line under the value ("Active users"). Hidden on xs.', optional: true },
  ],
  props: {
    size: { values: ['xs', 'sm', 'md', 'lg'], default: 'md', description: 'Outer box 64 / 96 / 160 / 200px. xs = inside table rows and list items (value only); sm = stat tiles; md = a dashboard card; lg = a page hero or an empty-state style focus.' },
    variant: { values: ['circle', 'half'], default: 'circle', description: 'circle = full ring, value in the middle; half = the top half of the ring as a gauge, value sitting on the chord. Use half when the number reads as a level (capacity, health) rather than completion.' },
    tone: { values: ['action', 'success', 'warning', 'danger'], default: 'action', description: 'Indicator color. action = default; success = completed or healthy; warning = near a limit (≥ 80%); danger = over the limit or failed.' },
  },
  states: {},
  base: {
    root: {
      position: 'relative',
      display: 'inline-flex',
      'flex-direction': 'column',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.40}',
      height: '{space.40}',
      color: '{color.fg-default}',
      'vertical-align': 'middle',
    },
    track: { fill: 'none', stroke: '{color.border-default}', 'stroke-width': '6', transform: 'rotate(-90deg)', 'transform-origin': '50% 50%' },
    indicator: {
      fill: 'none',
      stroke: '{color.bg-action}',
      'stroke-width': '6',
      'stroke-linecap': 'round',
      'stroke-dasharray': '263.89',
      'stroke-dashoffset': '263.89',
      transform: 'rotate(-90deg)',
      'transform-origin': '50% 50%',
      'transition-property': 'stroke-dashoffset, stroke',
      'transition-duration': '{motion.duration.slow}',
      'transition-timing-function': '{motion.easing.standard}',
    },
    label: { position: 'relative', 'z-index': '{z.raised}', ...typeStyle('heading-sm'), 'font-variant-numeric': 'tabular-nums', color: '{color.fg-default}', 'text-align': 'center' },
    caption: { position: 'relative', 'z-index': '{z.raised}', 'margin-top': '{space.0.5}', ...typeStyle('body-xs'), color: '{color.fg-muted}', 'text-align': 'center', 'max-width': '70%' },
  },
  variants: {
    size: Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, {
      root: { width: v.box, height: v.box },
      track: { 'stroke-width': v.stroke },
      indicator: { 'stroke-width': v.stroke },
      label: typeStyle(v.label),
      ...(k === 'xs' ? { caption: { display: 'none' } } : {}),
    }])),
    variant: {
      circle: { root: {} },
      half: {
        root: { 'justify-content': 'flex-end', 'padding-bottom': '{space.1}' },
        track: { 'stroke-dasharray': '131.95 263.89', transform: 'rotate(180deg)' },
        indicator: { 'stroke-dasharray': '131.95 263.89', 'stroke-dashoffset': '131.95', transform: 'rotate(180deg)' },
      },
    },
    tone: Object.fromEntries(Object.entries(TONE).map(([t, color]) => [t, { indicator: { stroke: color } }])),
  },
  compound: Object.entries(SIZES).map(([k, v]) => ({ when: { variant: 'half', size: k }, block: { root: { height: `calc(${v.box} / 2)` } } })),
  extraCss: `
.cn-progress-circle > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
.cn-progress-circle[data-variant="half"] > svg { height: 200%; }
.cn-progress-circle[data-variant="half"] { overflow: hidden; }`,
  examples: [
    ex('Default (md, action)', ring({ value: 72, label: 'Active users: 72%', caption: 'Active users' }), 'stroke-dashoffset = 263.89 × (1 − 0.72) = 73.9.'),
    ex('Sizes', `<div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--cn-space-6)">${ring({ size: 'xs', value: 40, label: 'Storage used: 40%' })}${ring({ size: 'sm', value: 65, label: 'Onboarding: 65%', caption: 'Onboarding' })}${ring({ size: 'md', value: 72, label: 'Active users: 72%', caption: 'Active users' })}${ring({ size: 'lg', value: 88, label: 'Quarterly goal: 88%', caption: 'Quarterly goal' })}</div>`, '64 / 96 / 160 / 200px with label-xs / label-sm / heading-sm / heading-lg values.'),
    ex('Tones', `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-6)">${ring({ size: 'sm', tone: 'success', value: 100, label: 'Import complete', text: 'Done', caption: 'Import' })}${ring({ size: 'sm', tone: 'warning', value: 82, label: 'Seats used: 82%', caption: 'Seats used' })}${ring({ size: 'sm', tone: 'danger', value: 96, label: 'API quota: 96%', caption: 'API quota' })}</div>`, 'success at completion, warning from 80%, danger over the limit.'),
    ex('Half gauge', `<div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--cn-space-6)">${ring({ variant: 'half', size: 'md', value: 65, label: 'Deal health: 65%', caption: 'Deal health' })}${ring({ variant: 'half', size: 'sm', tone: 'warning', value: 84, label: 'Warehouse capacity: 84%', caption: 'Capacity' })}</div>`, 'Half the circumference: stroke-dashoffset = 131.95 × (1 − 0.65) = 46.2.'),
    ex('Custom label', ring({ size: 'md', value: 56, label: '118 of 212 companies verified', text: '118', caption: 'of 212 verified' }), 'The label can be a count instead of a percentage; aria-valuenow still carries the percentage.'),
  ],
  rules: [
    'Geometry is fixed: viewBox 0 0 100 100, r = 42, circumference 263.89. Set the value only through the inline style on the indicator: stroke-dashoffset = 263.89 × (1 − value / 100); for the half variant 131.95 × (1 − value / 100).',
    'The label is HTML, never SVG text, so it uses the type scale and stays selectable; keep it to a number or a short word ("Done").',
    'Tone follows the value, not the brand: switch to warning at ≥ 80% of a limit and to danger when the limit is exceeded or the task failed; success only at 100% or "healthy".',
    'One ProgressCircle per card. Several percentages side by side are a table or an ActivityGauge.',
    'xs has no caption: put the meaning in the row label next to it.',
    'Never animate on first paint; transition only between value updates (260ms).',
    'Use half for levels (capacity, health, score) and circle for completion (progress, share of a goal).',
    'Stroke width scales with the size (10 / 8 / 6 / 5 viewBox units) so the ring stays around 6–10px at every size; do not override it.',
  ],
  a11y: [
    'role="progressbar" with aria-valuenow, aria-valuemin="0", aria-valuemax="100" and an aria-label naming what is measured ("Active users: 72%").',
    'Use aria-valuetext when the visible label is not a percentage ("118 of 212 verified").',
    'The svg is aria-hidden; the label text is the visible equivalent of the ring, so color is never the only signal.',
    'Respect prefers-reduced-motion: the dashoffset transition is the only motion and can be disabled globally.',
  ],
  related: ['progress', 'activity-gauge', 'stat', 'spinner'],
};
