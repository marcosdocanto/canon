import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// Metric group: the metric-card family as one self-contained component. A grid
// of cards (label, big value, soft trend pill with a 12px arrow, "vs last month"
// note) that can carry a featured icon, a 64px sparkline, a ⋯ menu or a
// "View report" link under a divider, a progress bar, or collapse into a list.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';

const ARROW: Record<string, string> = {
  up: '<svg class="cn-metric-group__trend-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4"/></svg>',
  down: '<svg class="cn-metric-group__trend-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4"/></svg>',
  flat: '<svg class="cn-metric-group__trend-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M3 8h10"/></svg>',
};
const SVG = {
  users: '<svg class="cn-featured-icon__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="5.5" r="2.5"/><path d="M1.75 13c.5-2.4 2.2-3.75 4.25-3.75S9.75 10.6 10.25 13M10.5 3.25a2.5 2.5 0 010 4.5M11.5 9.5c1.6.4 2.5 1.6 2.75 3.5"/></svg>',
  wallet: '<svg class="cn-featured-icon__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="11" height="8" rx="1.5"/><path d="M2.5 7.5h11M5 10.5h2"/></svg>',
  clock: '<svg class="cn-featured-icon__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/></svg>',
};

/** 128×64 sparkline. `d` is the line; the area closes it to the baseline. */
const spark = (d: string) => `<div class="cn-metric-group__chart" aria-hidden="true"><svg viewBox="0 0 128 64" preserveAspectRatio="none"><path data-area d="${d} V64 H0 Z"/><path d="${d}"/></svg></div>`;
const LINES = [
  'M0 44 L16 40 L32 46 L48 34 L64 36 L80 24 L96 28 L112 18 L128 12',
  'M0 38 L16 42 L32 36 L48 40 L64 30 L80 32 L96 22 L112 26 L128 16',
  'M0 16 L16 22 L32 18 L48 30 L64 28 L80 40 L96 36 L112 46 L128 50',
];

const featured = (svg: string, tone = 'brand') => `<span class="cn-metric-group__icon"><span class="cn-featured-icon" data-theme="light" data-tone="${tone}" data-size="md" data-shape="square">${svg}</span></span>`;
const trend = (dir: 'up' | 'down' | 'flat', text: string, label = 'vs last month', sentiment?: string) =>
  `<div class="cn-metric-group__delta"><span class="cn-metric-group__trend" data-trend="${dir}"${sentiment ? ` data-sentiment="${sentiment}"` : ''}>${ARROW[dir]}${text}</span><span class="cn-metric-group__trend-label">${label}</span></div>`;
const MORE = `<div class="cn-metric-group__actions"><button type="button" class="cn-icon-button" data-variant="ghost" data-size="sm" data-shape="square" aria-label="More actions" aria-haspopup="menu">${ICON.dots.replace('cn-icon', 'cn-icon-button__icon')}</button></div>`;
const REPORT = `<div class="cn-metric-group__divider" role="separator"></div><div class="cn-metric-group__actions"><button type="button" class="cn-button" data-variant="link-color" data-size="sm"><span class="cn-button__label">View report</span></button></div>`;
const progress = (id: string, label: string, value: string, pct: number, max: number, tone = 'action') =>
  `<div class="cn-metric-group__progress"><div class="cn-progress" data-size="md" data-tone="${tone}" role="progressbar" aria-labelledby="${id}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="${max}"><div class="cn-progress__header"><span class="cn-progress__label" id="${id}">${label}</span><span class="cn-progress__value">${value}</span></div><div class="cn-progress__track"><div class="cn-progress__indicator" style="width:${Math.round((pct / max) * 100)}%"></div></div></div></div>`;

const item = (o: { label: string; value: string; icon?: string; actions?: string; trend?: string; chart?: string; extra?: string }) =>
  `<div class="cn-metric-group__item"><div class="cn-metric-group__header">${o.icon ?? ''}<span class="cn-metric-group__label">${o.label}</span>${o.actions ?? ''}</div><div class="cn-metric-group__body"><span class="cn-metric-group__value">${o.value}</span>${o.chart ?? ''}</div>${o.trend ?? ''}${o.extra ?? ''}</div>`;

const grid = (variant: string, columns: string, inner: string) =>
  `<div class="cn-metric-group" data-variant="${variant}" data-columns="${columns}" role="group" aria-label="Key metrics">${inner}</div>`;

export const metricGroup: ComponentSpec = {
  name: 'MetricGroup',
  slug: 'metric-group',
  category: 'data-display',
  description: 'The metric-card family as one component: a responsive grid of surface cards with a label, a heading-lg tabular value, a soft success/danger trend pill with a 12px arrow and a "vs last month" note. Cards can add a featured icon, a 64px sparkline, a ⋯ menu or a "View report" link under a divider, or a progress bar; the list variant stacks the same items as rows in one card.',
  usage: 'Use at the top of a dashboard or report page to summarize 2–4 numbers with their change. For a single KPI use Stat; for a chart with axes use ChartFrame; for counts in navigation use Counter.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The grid (role="group", aria-label): 24px gaps, 2–4 equal columns that collapse to two below the lg breakpoint and one below md.' },
    { part: 'item', element: 'div', description: 'One metric card: bg-surface, hairline, radius card, 20px padding, shadow-xs; a flex column with 16px gaps.' },
    { part: 'header', element: 'div', description: 'Top row: optional featured icon, the label, and the optional ⋯ actions pushed right.' },
    { part: 'icon', element: 'span', description: 'Wrapper for a 40px FeaturedIcon (light theme) before the label.', optional: true },
    { part: 'label', element: 'span', description: 'What is measured, label-sm in fg-default ("Monthly recurring revenue").' },
    { part: 'actions', element: 'div', description: 'Right-aligned actions: a ghost sm IconButton (⋯) in the header, or a link-color sm "View report" Button under the divider.', optional: true },
    { part: 'body', element: 'div', description: 'The value on the left and, when present, the sparkline on the right, bottom-aligned.' },
    { part: 'value', element: 'span', description: 'The number in heading-lg semibold with tabular figures; the unit is part of the string ("$48,210", "1.9%").' },
    { part: 'delta', element: 'div', description: 'Row under the value: the trend pill and its label.', optional: true },
    { part: 'trend', element: 'span', description: 'Soft pill: success for up, danger for down, neutral for flat (data-trend); add data-sentiment="good|bad" when the direction and the meaning disagree.', optional: true },
    { part: 'trend-icon', element: 'svg', description: '12px arrow inside the pill matching data-trend.', optional: true },
    { part: 'trend-label', element: 'span', description: 'Period note in body-sm muted ("vs last month").', optional: true },
    { part: 'chart', element: 'div', description: '128×64 sparkline slot; the svg strokes currentColor (bg-action) with a 10% area under the line. Decorative.', optional: true },
    { part: 'progress', element: 'div', description: 'Wrapper for a Progress bar (label + value + track) for quota-style metrics.', optional: true },
    { part: 'divider', element: 'div', description: 'Hairline that bleeds to the card edges above a footer action.', optional: true },
  ],
  props: {
    variant: {
      values: ['simple', 'with-trend', 'with-icon', 'with-chart', 'with-actions', 'with-progress', 'list'],
      default: 'simple',
      description: 'simple = label and value only. with-trend = adds the trend pill and period note (the default dashboard card). with-icon = a 40px FeaturedIcon before the label for a small set of very different metrics. with-chart = a sparkline next to the value for metrics with a shape over time. with-actions = a ⋯ menu in the header or a "View report" link under a divider. with-progress = a Progress bar for used-of-limit metrics (seats, storage). list = the same items as rows inside one card, for side panels and narrow columns.',
    },
    columns: {
      values: ['2', '3', '4'],
      default: '3',
      description: 'Number of equal columns on wide screens: 2 for two hero numbers or cards with charts, 3 by default, 4 for a dense KPI row. Below the lg breakpoint 3 and 4 become 2; below md everything is one column. Ignored by the list variant.',
    },
  },
  states: {
    up: { selector: ' .cn-metric-group__trend[data-trend="up"]', description: 'The value increased (on the trend pill; extraCss): success tint, up arrow.', markup: 'data-trend="up" on .cn-metric-group__trend' },
    down: { selector: ' .cn-metric-group__trend[data-trend="down"]', description: 'The value decreased (extraCss): danger tint, down arrow.', markup: 'data-trend="down" on .cn-metric-group__trend' },
    flat: { selector: ' .cn-metric-group__trend[data-trend="flat"]', description: 'No meaningful change (extraCss): neutral tint, a dash.', markup: 'data-trend="flat" on .cn-metric-group__trend' },
    sentiment: { selector: ' .cn-metric-group__trend[data-sentiment]', description: 'When direction and meaning disagree (churn going down is good): data-sentiment="good|bad" overrides the tint while the arrow keeps the direction (extraCss).', markup: 'data-sentiment="good" or "bad" on .cn-metric-group__trend' },
  },
  base: {
    root: { display: 'grid', 'grid-template-columns': 'repeat(3, minmax(0, 1fr))', gap: '{space.6}', width: '100%', 'min-width': '0', color: '{color.fg-default}' },
    item: {
      position: 'relative',
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.4}',
      'min-width': '0',
      padding: '{space.5}',
      'background-color': '{color.bg-surface}',
      border: HAIRLINE,
      'border-radius': '{radius.card}',
      'box-shadow': '{shadow.xs}',
    },
    header: { display: 'flex', 'align-items': 'center', gap: '{space.3}', 'min-width': '0' },
    icon: { display: 'inline-flex', 'flex-shrink': '0' },
    label: { flex: '1 1 auto', 'min-width': '0', ...typeStyle('label-sm'), 'line-height': '{font.lineHeight.normal}', color: '{color.fg-default}', 'overflow-wrap': 'anywhere' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.2}', 'margin-inline-start': 'auto', 'flex-shrink': '0' },
    body: { display: 'flex', 'align-items': 'flex-end', 'justify-content': 'space-between', gap: '{space.4}', 'min-width': '0' },
    value: { ...typeStyle('heading-lg'), 'letter-spacing': '{font.letterSpacing.tight}', 'font-variant-numeric': 'tabular-nums', color: '{color.fg-default}', 'min-width': '0', 'overflow-wrap': 'anywhere' },
    delta: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.2}', 'min-width': '0' },
    trend: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.1}',
      height: '{space.6}',
      'padding-inline': '{space.2}',
      'border-radius': '{radius.full}',
      border: HAIRLINE,
      'background-color': '{color.bg-subtle}',
      ...typeStyle('label-sm'),
      color: '{color.fg-muted}',
      'font-variant-numeric': 'tabular-nums',
      'white-space': 'nowrap',
    },
    'trend-icon': { width: '{size.icon.xs}', height: '{size.icon.xs}', 'flex-shrink': '0' },
    'trend-label': { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'white-space': 'nowrap' },
    chart: { flex: '0 0 auto', width: '128px', height: '{space.16}', color: '{color.bg-action}' },
    progress: { width: '100%' },
    divider: { height: '0', 'border-top': HAIRLINE, 'margin-inline': 'calc(-1 * {space.5})' },
  },
  variants: {
    variant: {
      simple: { root: {} },
      'with-trend': { root: {} },
      'with-icon': { root: {} },
      'with-chart': { root: {} },
      'with-actions': { root: {} },
      'with-progress': { root: {} },
      list: {
        root: { display: 'flex', 'flex-direction': 'column', gap: '0', 'background-color': '{color.bg-surface}', border: HAIRLINE, 'border-radius': '{radius.card}', 'box-shadow': '{shadow.xs}', overflow: 'hidden' },
        item: { 'flex-direction': 'row', 'align-items': 'center', gap: '{space.4}', padding: '{space.4} {space.5}', border: '0', 'border-radius': '0', 'box-shadow': 'none' },
        header: { flex: '1 1 auto' },
        body: { flex: '0 0 auto', 'align-items': 'center' },
        value: { ...typeStyle('heading-md'), 'letter-spacing': '{font.letterSpacing.tight}' },
        delta: { flex: '0 0 auto', 'flex-wrap': 'nowrap' },
        chart: { width: '96px', height: '{space.10}' },
      },
    },
    columns: {
      '2': { root: { 'grid-template-columns': 'repeat(2, minmax(0, 1fr))' } },
      '3': { root: { 'grid-template-columns': 'repeat(3, minmax(0, 1fr))' } },
      '4': { root: { 'grid-template-columns': 'repeat(4, minmax(0, 1fr))' } },
    },
  },
  extraCss: `
.cn-metric-group__trend[data-trend="up"] { background-color: {color.bg-success-subtle}; color: {color.fg-success}; border-color: {color.border-success}; }
.cn-metric-group__trend[data-trend="down"] { background-color: {color.bg-danger-subtle}; color: {color.fg-danger}; border-color: {color.border-danger}; }
.cn-metric-group__trend[data-trend="flat"] { background-color: {color.bg-subtle}; color: {color.fg-muted}; border-color: {color.border-default}; }
.cn-metric-group__trend[data-sentiment="good"] { background-color: {color.bg-success-subtle}; color: {color.fg-success}; border-color: {color.border-success}; }
.cn-metric-group__trend[data-sentiment="bad"] { background-color: {color.bg-danger-subtle}; color: {color.fg-danger}; border-color: {color.border-danger}; }
.cn-metric-group__chart svg { display: block; width: 100%; height: 100%; overflow: visible; }
.cn-metric-group__chart path { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.cn-metric-group__chart path[data-area] { fill: color-mix(in srgb, currentColor 10%, transparent); stroke: none; }
.cn-metric-group[data-variant="list"] .cn-metric-group__item + .cn-metric-group__item { border-top: ${HAIRLINE}; }
@media (max-width: {breakpoint.lg}) { .cn-metric-group[data-columns="3"], .cn-metric-group[data-columns="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: {breakpoint.md}) { .cn-metric-group[data-columns="2"], .cn-metric-group[data-columns="3"], .cn-metric-group[data-columns="4"] { grid-template-columns: minmax(0, 1fr); } }`,
  examples: [
    ex('Simple, three columns', grid('simple', '3', [
      item({ label: 'Monthly recurring revenue', value: '$48,210' }),
      item({ label: 'Active customers', value: '2,318' }),
      item({ label: 'Churn rate', value: '1.9%' }),
    ].join('')), 'Label and value only. The unit is part of the value string.'),
    ex('With trend, four columns', grid('with-trend', '4', [
      item({ label: 'Monthly recurring revenue', value: '$48,210', trend: trend('up', '12%') }),
      item({ label: 'Active customers', value: '2,318', trend: trend('up', '4.3%') }),
      item({ label: 'Churn rate', value: '1.9%', trend: trend('down', '0.4 pts', 'vs last month', 'good') }),
      item({ label: 'Avg. session', value: '6m 12s', trend: trend('flat', '0%') }),
    ].join('')), 'Churn went down, which is good: data-sentiment="good" keeps the down arrow but tints the pill success.'),
    ex('With icon', grid('with-icon', '3', [
      item({ label: 'Open invoices', value: '43', icon: featured(SVG.wallet), trend: trend('up', '6', 'since Monday') }),
      item({ label: 'Paid this month', value: '$128,400', icon: featured(SVG.wallet, 'success'), trend: trend('up', '18%') }),
      item({ label: 'Overdue', value: '7', icon: featured(SVG.clock, 'warning'), trend: trend('down', '3', 'vs last week', 'good') }),
    ].join('')), 'A 40px FeaturedIcon before the label; tone follows the metric, not decoration.'),
    ex('With chart', grid('with-chart', '3', [
      item({ label: 'Sign-ups', value: '1,204', chart: spark(LINES[0]), trend: trend('up', '18%') }),
      item({ label: 'Trial to paid', value: '24.6%', chart: spark(LINES[1]), trend: trend('up', '2.1 pts') }),
      item({ label: 'Support tickets', value: '312', chart: spark(LINES[2]), trend: trend('down', '9%', 'vs last month', 'good') }),
    ].join('')), 'The sparkline sits next to the value, strokes the action color and is decorative.'),
    ex('With actions (menu)', grid('with-actions', '2', [
      item({ label: 'Net revenue retention', value: '112%', actions: MORE, trend: trend('up', '3 pts', 'vs last quarter') }),
      item({ label: 'Payback period', value: '9.4 months', actions: MORE, trend: trend('down', '1.1 months', 'vs last quarter', 'good') }),
    ].join('')), 'A ghost ⋯ IconButton in the header opens a Menu (export, compare, hide).'),
    ex('With actions (View report)', grid('with-actions', '3', [
      item({ label: 'Website visitors', value: '84,120', trend: trend('up', '22%'), extra: REPORT }),
      item({ label: 'Demo requests', value: '318', trend: trend('up', '11%'), extra: REPORT }),
      item({ label: 'Cost per lead', value: '$41.30', trend: trend('up', '5%', 'vs last month', 'bad'), extra: REPORT }),
    ].join('')), 'A hairline bleeds to the card edges above a link-color "View report".'),
    ex('With progress', grid('with-progress', '2', [
      item({ label: 'Seats used', value: '34 / 40', extra: progress('mg-seats', 'Team plan', '85%', 34, 40, 'warning') }),
      item({ label: 'Storage', value: '128 GB', extra: progress('mg-storage', 'of 250 GB', '51%', 128, 250) }),
    ].join('')), 'Used-of-limit metrics carry a Progress bar; warning tone from 80%.'),
    ex('List', `<div style="width:100%;max-width:420px">${grid('list', '3', [
      item({ label: 'Monthly recurring revenue', value: '$48,210', trend: trend('up', '12%', '') }),
      item({ label: 'Active customers', value: '2,318', trend: trend('up', '4.3%', '') }),
      item({ label: 'Churn rate', value: '1.9%', trend: trend('down', '0.4 pts', '', 'good') }),
      item({ label: 'Avg. session', value: '6m 12s', trend: trend('flat', '0%', '') }),
    ].join(''))}</div>`, 'The same items as rows in one card, for side panels and narrow columns.'),
  ],
  rules: [
    'Two to four metrics per group. A fifth number belongs in a table or a second group with its own heading.',
    'Labels name the metric in sentence case ("Monthly recurring revenue"), never the value type; values carry their unit in the string and use tabular figures.',
    'Format numbers for the locale with at most four significant characters plus unit ("$48.2k" beats "$48,210.37" in a card).',
    'data-trend is the direction of change; when up is bad or down is good (churn, cost, response time), add data-sentiment so the tint tells the truth while the arrow keeps the direction.',
    'The period note is short and always present with a trend ("vs last month"); a trend without a period is meaningless.',
    'One variant per group: every card has the same parts, aligned on the same rows. Never mix a sparkline card with a plain one.',
    'Sparklines are decorative and unlabeled; if the shape matters enough to read, use ChartFrame.',
    'Actions are one ⋯ menu in the header or one "View report" link under the divider, never both.',
    'Use list in columns narrower than 420px or inside drawers; on a page use the grid.',
  ],
  a11y: [
    'The root is role="group" with an aria-label ("Key metrics"); each card reads in order: label, value, trend, note.',
    'Trend arrows are aria-hidden; the trend text includes the sign or the word ("+12%", "0.4 pts") and the label gives the period, so color is never the only signal.',
    'Sparklines are aria-hidden; when a chart carries information, give it a text alternative or use ChartFrame.',
    'The ⋯ button has aria-label "More actions" and aria-haspopup="menu"; "View report" is a real link or button with the metric name available via aria-label when several cards share the text.',
    'Progress bars use role="progressbar" with aria-valuenow/min/max and a visible value.',
  ],
  related: ['stat', 'featured-icon', 'progress', 'chart-frame', 'icon-button', 'card'],
};
