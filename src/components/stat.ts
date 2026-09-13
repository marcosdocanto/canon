import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// A measured readout: a mono label, a clear value and a separate change indicator.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

const ARROW: Record<string, string> = {
  up: '<svg class="cn-stat__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4"/></svg>',
  down: '<svg class="cn-stat__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4"/></svg>',
  flat: '<svg class="cn-stat__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 8h10"/></svg>',
};

const tile = (o: { label: string; value: string; delta?: string; trend?: string; description?: string; size?: string; variant?: string; sentiment?: string; style?: string; media?: string; actions?: string; badge?: boolean }) => {
  const trend = o.trend ?? 'flat';
  return `<div class="cn-stat" data-size="${o.size ?? 'md'}" data-variant="${o.variant ?? 'card'}" data-trend="${trend}"${o.sentiment ? ` data-sentiment="${o.sentiment}"` : ''}${o.style ? ` style="${o.style}"` : ''}>${o.media ? `<div class="cn-stat__media">${o.media}</div>` : ''}<div class="cn-stat__label">${o.label}</div><div class="cn-stat__value">${o.value}</div>${o.delta ? `<div class="cn-stat__delta"${o.badge ? ' data-badge' : ''}>${ARROW[trend]}<span>${o.delta}</span></div>` : ''}${o.description ? `<div class="cn-stat__description">${o.description}</div>` : ''}${o.actions ? `<div class="cn-stat__actions">${o.actions}</div>` : ''}</div>`;
};
const FEATURED = (i: keyof typeof ICON) => `<span class="cn-featured-icon" data-theme="modern" data-tone="gray" data-size="md" data-shape="square">${ICON[i].replace('cn-icon', 'cn-featured-icon__icon')}</span>`;
const VIEW = `<button type="button" class="cn-button" data-variant="link-color" data-size="sm"><span class="cn-button__label">View report</span>${ICON.arrow.replace('cn-icon', 'cn-button__icon')}</button>`;

export const stat: ComponentSpec = {
  name: 'Stat',
  slug: 'stat',
  category: 'data-display',
  description: 'A metric readout with a compact mono label and one semibold tabular number, a change indicator with an arrow (green up, red down) or as a pill, a "vs last month" note, optionally a featured icon above and a "View report" footer. Direction is a fact; whether it is good is a separate attribute.',
  usage: 'Dashboards and page headers that summarize a workspace ("Active users 2,420", "Conversion 4.2%"). Rows of 3–4 tiles. Not for counts inside navigation (Counter) or for a value inside a table (plain tabular text).',
  anatomy: [
    { part: 'root', element: 'div', description: 'Column of media, label, value, delta + description, actions. Plain, or framed as the metric card (white, gray-200 ring, flat edge and token-defined corners, 20 × 24px padding).' },
    { part: 'media', element: 'div', description: 'Optional 40px FeaturedIcon (modern, gray) above the label, 16px before it.', optional: true },
    { part: 'label', element: 'div', description: 'What is measured, 14px medium fg-muted. 1–3 words ("Active users").' },
    { part: 'value', element: 'div', description: 'The number, semibold, tabular figures: 24 / 30 / 36px by size. Include the unit in the string ("41%", "2.1h", "$412k").' },
    { part: 'delta', element: 'div', description: 'Optional change vs the previous period: 16px arrow + 14px medium text ("12%"). Colored by trend and sentiment; data-badge renders it as a tinted pill.', optional: true },
    { part: 'icon', element: 'svg', description: '16px arrow inside the delta: up, down or flat, matching data-trend.', optional: true },
    { part: 'description', element: 'div', description: 'Optional 14px fg-muted note after the delta: period, source or definition ("vs last month").', optional: true },
    { part: 'actions', element: 'div', description: 'Optional footer on a hairline (bleeds to the card edges, 16 × 24px padding) holding a link-color Button ("View report").', optional: true },
  ],
  props: {
    size: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Size of the value: sm = 24/32 semibold (inside cards and drawers); md = 30/38 (the default readout, dashboard rows); lg = 36/44 (one hero number per page).',
    },
    variant: {
      values: ['plain', 'card'],
      default: 'card',
      description: 'card = the metric card: white, gray-200 ring, flat edge and token-defined corners, 20 × 24px padding (standalone tiles on the canvas); plain = no frame, for stats inside a Card, a header or next to a chart.',
    },
    trend: {
      values: ['up', 'down', 'flat'],
      default: 'flat',
      description: 'Direction of the delta: up = increased (green), down = decreased (red), flat = unchanged (muted). Direction only; add data-sentiment="good|bad" when up is bad or down is good.',
    },
  },
  states: {},
  base: {
    // A wrapping row: media, label, value and actions span the full width; delta and description share one line.
    root: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.2}', 'min-width': '0', color: '{color.fg-default}' },
    media: { display: 'flex', width: '100%', 'margin-bottom': '{space.2}' },
    label: { width: '100%', ...typeStyle('kicker'), color: '{color.fg-muted}' },
    value: {
      width: '100%',
      ...typeStyle('heading-lg'),
      'font-variant-numeric': 'tabular-nums',
      color: '{color.fg-default}',
      'overflow-wrap': 'anywhere',
    },
    delta: { display: 'inline-flex', 'align-items': 'center', gap: '{space.1}', ...typeStyle('label-sm'), color: '{color.fg-muted}', 'font-variant-numeric': 'tabular-nums' },
    icon: { width: '{size.icon.sm}', height: '{size.icon.sm}', 'flex-shrink': '0' },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}' },
    actions: { display: 'flex', width: '100%', 'align-items': 'center', 'justify-content': 'flex-end', gap: '{space.3}', 'margin-top': '{space.2}', 'padding-top': '{space.4}', 'border-top': HAIRLINE },
  },
  variants: {
    size: {
      sm: { root: { gap: '{space.1.5}' }, value: { ...typeStyle('heading-md') }, delta: { ...typeStyle('label-xs') } },
      md: { value: { ...typeStyle('heading-lg') } },
      lg: { root: { gap: '{space.3}' }, value: { ...typeStyle('heading-xl') }, delta: { ...typeStyle('label-md') }, description: { ...typeStyle('body-lg') } },
    },
    variant: {
      plain: { root: {} },
      card: { root: { 'background-color': '{color.bg-surface}', 'box-shadow': `${ring('{color.border-default}')}, {shadow.xs}`, 'border-radius': '{radius.card}', padding: '{space.5} {space.6}' }, actions: { width: 'calc(100% + {space.6} * 2)', margin: '{space.4} calc({space.6} * -1) calc({space.5} * -1)', padding: '{space.4} {space.6}' } },
    },
    trend: {
      up: { delta: { color: '{color.fg-success}' } },
      down: { delta: { color: '{color.fg-danger}' } },
      flat: { delta: { color: '{color.fg-muted}' } },
    },
  },
  compound: [
    { when: { variant: 'card', size: 'sm' }, block: { root: { padding: '{space.4} {space.5}' }, actions: { width: 'calc(100% + {space.5} * 2)', margin: '{space.3} calc({space.5} * -1) calc({space.4} * -1)', padding: '{space.3} {space.5}' } } },
    { when: { variant: 'card', size: 'lg' }, block: { root: { padding: '{space.6}' }, actions: { margin: '{space.4} calc({space.6} * -1) calc({space.6} * -1)' } } },
  ],
  extraCss: `
.cn-stat__delta[data-badge] { height: {space.6}; padding: 0 {space.2.5} 0 {space.2}; border-radius: {radius.full}; background-color: {color.bg-subtle}; box-shadow: ${ring('{color.border-default}')}; }
.cn-stat[data-trend="up"] .cn-stat__delta[data-badge] { background-color: {green.50}; box-shadow: ${ring('{green.200}')}; color: {green.700}; }
.cn-stat[data-trend="down"] .cn-stat__delta[data-badge] { background-color: {red.50}; box-shadow: ${ring('{red.200}')}; color: {red.700}; }
.cn-stat[data-sentiment="good"] .cn-stat__delta { color: {color.fg-success}; }
.cn-stat[data-sentiment="bad"] .cn-stat__delta { color: {color.fg-danger}; }
.cn-stat[data-sentiment="good"] .cn-stat__delta[data-badge] { background-color: {green.50}; box-shadow: ${ring('{green.200}')}; color: {green.700}; }
.cn-stat[data-sentiment="bad"] .cn-stat__delta[data-badge] { background-color: {red.50}; box-shadow: ${ring('{red.200}')}; color: {red.700}; }
.cn-stat[data-sentiment="neutral"] .cn-stat__delta { color: {color.fg-muted}; }`,
  examples: [
    ex('Metric card (default)', tile({ label: 'Active users', value: '2,420', delta: '12%', trend: 'up', description: 'vs last month', style: 'width:280px' }), 'White card with a fine outline, 20 × 24px padding; 14px medium label, a token-sized semibold value, green arrow + "12%", muted "vs last month".'),
    ex('Row of three', `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--cn-space-6);width:100%">${tile({ label: 'Total users', value: '2,420', delta: '40%', trend: 'up', description: 'vs last month' })}${tile({ label: 'Active sessions', value: '1,210', delta: '10%', trend: 'down', description: 'vs last month' })}${tile({ label: 'Conversion rate', value: '4.2%', delta: '0.8 pts', trend: 'up', description: 'vs last month' })}</div>`, 'One row, equal widths, same size. The labels line up.'),
    ex('With icon and actions', `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--cn-space-6);width:100%;max-width:560px">${tile({ label: 'Views 24h', value: '18,204', delta: '6%', trend: 'up', description: 'vs yesterday', media: FEATURED('user'), actions: VIEW })}${tile({ label: 'Revenue', value: '$32,480', delta: '2%', trend: 'down', description: 'vs last month', media: FEATURED('inbox'), actions: VIEW, badge: true })}</div>`, 'A 40px modern FeaturedIcon above the label; the delta as a tinted pill (data-badge); "View report" in a footer on a hairline.'),
    ex('Sizes (plain)', `<div style="display:flex;gap:var(--cn-space-10);align-items:flex-end;flex-wrap:wrap">${tile({ label: 'Conversion', value: '4.2%', delta: '0.8 pts', trend: 'up', size: 'sm', variant: 'plain' })}${tile({ label: 'Conversion', value: '4.2%', delta: '0.8 pts', trend: 'up', size: 'md', variant: 'plain' })}${tile({ label: 'Conversion', value: '4.2%', delta: '0.8 pts', trend: 'up', size: 'lg', variant: 'plain', description: 'vs last month' })}</div>`, 'sm 24px · md 30px · lg 36px values.'),
    ex('Direction is not sentiment', `<div style="display:flex;gap:var(--cn-space-6);flex-wrap:wrap">${tile({ label: 'Avg. response time', value: '2.1h', delta: '18%', trend: 'down', sentiment: 'good', description: 'vs last month', style: 'width:260px' })}${tile({ label: 'Bounce rate', value: '4.2%', delta: '0.8 pts', trend: 'up', sentiment: 'bad', description: 'vs last month', style: 'width:260px' })}</div>`, 'The arrow says which way it moved; data-sentiment says whether that is good.'),
  ],
  rules: [
    'Label is 14px medium muted, 1–3 words, names the metric ("Active users"), never the value type ("Count").',
    'The value carries its unit in the string ("41%", "2.1h", "$412k") and uses tabular figures; format with the locale, max 5 significant characters plus unit.',
    'data-trend is the direction of change (the arrow), not a judgement. When up is bad (bounce rate, response time) or down is good, add data-sentiment="good|bad" so the color tells the truth.',
    'The delta is the change ("12%", "0.8 pts") and the description names the period ("vs last month"); no delta at all beats a delta without a period.',
    'Rows of stats: 3–4 tiles, equal width, same size and variant, 24px apart, labels aligned on one baseline. Never a grid of nine tiles.',
    'One lg (hero) stat per page at most; md in dashboard rows; sm inside cards, drawers and comparisons.',
    'Use variant="card" on the canvas; plain inside a Card, a page header or next to a chart (ChartFrame).',
    'The only action is the "View report" link in the footer; no buttons inside the tile. If the whole tile opens a report, wrap it in a Link.',
  ],
  a11y: [
    'Reading order is label, value, delta, description; the DOM must match so screen readers announce "Active users, 2,420, up 12% vs last month".',
    'The arrow is decorative (aria-hidden); the delta text must state the direction in words or sign ("+12%", "−18%"), never rely on the arrow or color.',
    'Use a real heading only when the stat is a section of its own; inside a row of tiles keep them as divs so the page outline stays clean.',
    'Ensure the value text is selectable and not an image; no SVG numbers.',
  ],
  related: ['counter', 'chart-frame', 'card', 'featured-icon', 'badge', 'button'],
};
