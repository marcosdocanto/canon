import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// the reference count chips: the 22px badge (12px medium, tinted fill with a ring one step darker)
// next to tabs and nav items, and the 14px red disc (10px bold white) on notification icons.

const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const PAINT: Record<string, { solid: [string, string]; soft: [string, string, string] }> = {
  neutral: { solid: ['{color.bg-inverse}', '{color.fg-inverse}'], soft: ['{color.bg-subtle}', '{color.fg-muted}', '{color.border-default}'] },
  accent: { solid: ['{color.bg-accent}', '{color.fg-on-accent}'], soft: ['{color.bg-accent-subtle}', '{color.fg-accent}', '{brand.200}'] },
  danger: { solid: ['{color.bg-danger}', '{white}'], soft: ['{color.bg-danger-subtle}', '{color.fg-danger}', '{red.200}'] },
  action: { solid: ['{color.bg-action}', '{color.fg-on-action}'], soft: ['{brand.50}', '{brand.700}', '{brand.200}'] },
};

const compound = Object.entries(PAINT).flatMap(([tone, p]) => [
  { when: { tone, variant: 'solid' }, block: { root: { 'background-color': p.solid[0], color: p.solid[1], 'box-shadow': 'none' } } },
  { when: { tone, variant: 'soft' }, block: { root: { 'background-color': p.soft[0], color: p.soft[1], 'box-shadow': ring(p.soft[2]) } } },
]);

const c = (n: string, tone = 'neutral', variant = 'soft', size = 'md') =>
  `<span class="cn-counter" data-tone="${tone}" data-variant="${variant}" data-size="${size}">${n}</span>`;

export const counter: ComponentSpec = {
  name: 'Counter',
  slug: 'counter',
  category: 'data-display',
  description: 'A small round pill with a number: the reference\'s 22px count badge (12px medium, tinted with a ring) after tabs and nav items, or the 14px red disc on a notification icon. Tabular figures, capped at "99+". Numbers only.',
  usage: 'After a label that it counts: a tab, a nav item, a section title, a filter; or on the corner of an icon button for unread notifications. Not for words (Badge), not for large KPIs (Stat), never as a button.',
  anatomy: [
    { part: 'root', element: 'span', description: 'The pill. Contains only the number (or "99+").' },
  ],
  props: {
    tone: { values: ['neutral', 'accent', 'danger', 'action'], default: 'neutral', description: 'Urgency, not decoration. neutral (gray) = totals and result counts; action (brand) = things waiting for the user, and the selected tab\'s count; danger (red) = failures, overdue items and unread notifications; accent = items produced by the assistant.' },
    variant: { values: ['solid', 'soft'], default: 'soft', description: 'soft = tinted fill with a 1px ring one step darker (the reference badge); solid = filled, at most one per row or nav to mark the count that matters (and always for the xs notification disc).' },
    size: { values: ['xs', 'sm', 'md'], default: 'md', description: 'md 22px tall with 12px medium text (the badge next to tabs and nav items); sm 18px inside buttons and dense rows; xs 14px with 10px bold text, the notification disc on an icon corner.' },
  },
  states: {},
  base: {
    root: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'min-width': '22px',
      height: '22px',
      'padding-inline': '{space.2}',
      'border-radius': '{radius.full}',
      ...typeStyle('label-xs'),
      'font-variant-numeric': 'tabular-nums',
      'flex-shrink': '0',
      'white-space': 'nowrap',
      'vertical-align': 'middle',
    },
  },
  variants: {
    tone: { neutral: { root: {} }, accent: { root: {} }, danger: { root: {} }, action: { root: {} } },
    variant: { solid: { root: {} }, soft: { root: {} } },
    size: {
      xs: { root: { 'min-width': '{space.3.5}', height: '{space.3.5}', 'padding-inline': '3px', 'font-size': '10px', 'font-weight': '{font.weight.bold}', 'line-height': '1' } },
      sm: { root: { 'min-width': '18px', height: '18px', 'padding-inline': '{space.1.5}', 'font-size': '{font.size.2xs}', 'line-height': '1' } },
      md: { root: { 'min-width': '22px', height: '22px', 'padding-inline': '{space.2}' } },
    },
  },
  compound,
  extraCss: `
.cn-counter[data-size="xs"] { box-shadow: 0 0 0 1.5px {color.bg-surface}; }
.cn-counter[data-anchored] { position: absolute; top: -1px; right: -1px; }`,
  examples: [
    ex('Soft (default)', c('12'), '22px, gray-50 with a gray-200 ring, 12px medium gray-700.'),
    ex('Tones, soft', `${c('128', 'neutral')} ${c('7', 'accent')} ${c('2', 'danger')} ${c('3', 'action')}`, 'neutral · accent · danger · action; each with the ring one step darker than its fill.'),
    ex('Tones, solid', `${c('128', 'neutral', 'solid')} ${c('7', 'accent', 'solid')} ${c('2', 'danger', 'solid')} ${c('3', 'action', 'solid')}`, 'One solid counter per row at most.'),
    ex('Sizes and cap', `<div style="display:flex;align-items:center;gap:var(--cn-space-3)">${c('3', 'danger', 'solid', 'xs')} ${c('45', 'neutral', 'soft', 'sm')} ${c('99+', 'neutral', 'soft', 'md')}</div>`, 'xs 14px (the notification disc) · sm 18px · md 22px. Never more than two digits; cap at 99+.'),
  ],
  recipes: [
    ex('In a nav item, a tab and on an icon', `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-3);align-items:center"><button type="button" class="cn-button" data-variant="ghost" data-size="sm"><span class="cn-button__label">Waiting for you</span>${c('3', 'action', 'soft', 'md')}</button><button type="button" class="cn-button" data-variant="ghost" data-size="sm"><span class="cn-button__label">In review</span>${c('12', 'neutral', 'soft', 'md')}</button><span style="position:relative;display:inline-flex"><button type="button" class="cn-icon-button" data-variant="ghost" data-size="sm" data-shape="square" aria-label="Notifications, 3 unread"><svg class="cn-icon-button__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 9.5h3l1 2h3l1-2h3M2.5 9.5V4a1 1 0 011-1h9a1 1 0 011 1v5.5M2.5 9.5V12a1 1 0 001 1h9a1 1 0 001-1V9.5"/></svg></button>${c('3', 'danger', 'solid', 'xs').replace('data-size="xs"', 'data-size="xs" data-anchored')}</span></div>`, 'The counter follows the label it counts; only the "needs you" count is action-tinted. data-anchored pins the xs disc to the icon corner.'),
  ],
  rules: [
    'Numbers only. A word ("New", "Beta", "Live") is a Badge.',
    'Cap at "99+". Never show three or more digits.',
    'Hide the counter at zero; "0" is noise. If the zero is the content ("0 results"), write it as text.',
    'Tone is urgency: neutral for totals, action for what waits for the user, danger for failures and unread notifications, accent for assistant output. Never pick a tone for looks.',
    'At most one solid counter per row, nav or tab bar; the rest are soft. The xs disc is always solid danger.',
    'The counter comes after the label it counts ("Inbox 12"), separated by the parent\'s gap, never before it.',
    'Stays round at one digit and widens with two; never squash it into a fixed width.',
    'Do not animate count changes (no bounce, no flash). Update the number; announce with aria-live on the region if it matters.',
  ],
  a11y: [
    'The number is plain text and is read as such; give it context with the adjacent label or a visually hidden suffix ("12 unread").',
    'On an icon button, put the count in the button\'s aria-label ("Notifications, 3 unread") and keep the disc aria-hidden.',
    'Live counts: aria-live="polite" on the containing region (the nav item or tab), not on the counter itself.',
    'Color is reinforcement only; the label next to the counter carries the meaning.',
  ],
  related: ['badge', 'tag', 'stat', 'tabs', 'sidebar-nav', 'topbar'],
};
