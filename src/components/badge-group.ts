import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

const TONES = { brand: ['{color.bg-accent-subtle}', '{color.fg-accent}', '{brand.200}'], gray: ['{color.bg-subtle}', '{color.fg-muted}', '{color.border-default}'], success: ['{color.bg-success-subtle}', '{color.fg-success}', '{green.200}'], warning: ['{color.bg-warning-subtle}', '{color.fg-warning}', '{amber.200}'], error: ['{color.bg-danger-subtle}', '{color.fg-danger}', '{red.200}'] };

export const badgeGroup: ComponentSpec = {
  name: 'BadgeGroup',
  slug: 'badge-group',
  category: 'data-display',
  description: 'A pill that holds a small inner badge plus a message and an arrow: the "badge group" used for announcements above hero titles ("New feature · Check out the team dashboard →").',
  usage: 'Announcements, release notes and "what is new" links above a page or hero title. One per page. Not for status in tables (use Badge).',
  anatomy: [
    { part: 'root', element: 'a', description: 'The outer pill. A link when it navigates.' },
    { part: 'badge', element: 'span', description: 'The inner pill (e.g. "New feature").' },
    { part: 'label', element: 'span', description: 'The message.' },
    { part: 'icon', element: 'svg', description: 'Trailing arrow, 16px.' },
  ],
  props: {
    tone: { values: ['brand', 'gray', 'success', 'warning', 'error'], default: 'brand', description: 'Color family of the group.' },
    theme: { values: ['light', 'modern'], default: 'light', description: 'light = tinted outer pill with white inner badge; modern = white outer pill with grey ring and a tinted inner badge.' },
    size: { values: ['sm', 'md', 'lg'], default: 'md', description: 'Outer pill 24 / 28 / 32px; text 12 / 14 / 14.' },
    align: { values: ['leading', 'trailing'], default: 'leading', description: 'leading = inner badge first; trailing = inner badge after the message.' },
  },
  states: { hover: { selector: ':hover', description: 'Slightly stronger fill; arrow moves 2px.', markup: 'native' }, focus: { selector: ':focus-visible', description: 'Focus ring.', markup: 'native' } },
  base: {
    root: { display: 'inline-flex', 'align-items': 'center', gap: '{space.2}', 'border-radius': '{radius.full}', border: '{border.width.thin} solid transparent', 'padding-inline': '{space.1} {space.2.5}', ...typeStyle('label-sm'), 'text-decoration': 'none', 'min-width': '0', 'max-width': '100%', 'padding-block': '{space.0.5}', cursor: 'pointer', 'transition-property': 'background-color, border-color', 'transition-duration': '{motion.duration.fast}', 'transition-timing-function': '{motion.easing.standard}' },
    badge: { 'flex-shrink': '0', 'white-space': 'nowrap', display: 'inline-flex', 'align-items': 'center', height: '22px', 'padding-inline': '{space.2}', 'border-radius': '{radius.full}', border: '{border.width.thin} solid transparent', 'font-size': '{font.size.xs}', 'font-weight': '{font.weight.medium}', 'line-height': '1' },
    label: { display: 'inline-block', 'min-width': '0', 'overflow-wrap': 'anywhere' },
    icon: { width: '{size.icon.sm}', height: '{size.icon.sm}', 'flex-shrink': '0', transition: 'transform {motion.duration.fast} {motion.easing.standard}' },
    '@states': { focus: { root: { outline: 'none', 'box-shadow': '{shadow.focus}' } }, hover: { icon: { transform: 'translateX(2px)' } } },
  },
  variants: {
    tone: Object.fromEntries(Object.keys(TONES).map((t) => [t, { root: {} }])),
    theme: { light: { root: {} }, modern: { root: { 'background-color': '{color.bg-surface}', 'border-color': '{color.border-control}', color: '{color.fg-muted}', 'box-shadow': '{shadow.xs}' } } },
    size: {
      sm: { root: { 'min-height': '24px', 'font-size': '{font.size.xs}' }, badge: { height: '18px', 'padding-inline': '{space.1.5}' } },
      md: { root: { 'min-height': '28px' }, badge: { height: '22px' } },
      lg: { root: { 'min-height': '32px', 'padding-inline': '{space.1} {space.3}' }, badge: { height: '24px', 'font-size': '{font.size.sm}' } },
    },
    align: { leading: { root: {} }, trailing: { root: { 'flex-direction': 'row-reverse', 'padding-inline': '{space.2.5} {space.1}' } } },
  },
  compound: Object.entries(TONES).flatMap(([t, [bg, fg, border]]) => [
    { when: { tone: t, theme: 'light' }, block: { root: { 'background-color': bg, color: fg, 'border-color': border }, badge: { 'background-color': '{color.bg-surface}', color: fg, 'border-color': border }, '@states': { hover: { root: { 'border-color': fg } } } } },
    { when: { tone: t, theme: 'modern' }, block: { badge: { 'background-color': bg, color: fg, 'border-color': border } } },
  ]),
  extraCss: `
.cn-badge-group[data-align="trailing"] .cn-badge-group__icon { order: -1; transform: none; }
.cn-badge-group[data-align="trailing"]:hover .cn-badge-group__icon { transform: translateX(-2px); }`,
  examples: [
    ex('Light, leading (default)', `<a href="#" class="cn-badge-group" data-tone="brand" data-theme="light" data-size="md" data-align="leading"><span class="cn-badge-group__badge">New feature</span><span class="cn-badge-group__label">Check out the team dashboard</span>${ICON.arrow.replace('cn-icon', 'cn-badge-group__icon')}</a>`),
    ex('Modern', `<a href="#" class="cn-badge-group" data-tone="brand" data-theme="modern" data-size="md" data-align="leading"><span class="cn-badge-group__badge">We're hiring!</span><span class="cn-badge-group__label">Join our remote team</span>${ICON.arrow.replace('cn-icon', 'cn-badge-group__icon')}</a>`),
    ex('Tones', `<a href="#" class="cn-badge-group" data-tone="gray" data-theme="light" data-size="md" data-align="leading"><span class="cn-badge-group__badge">Update</span><span class="cn-badge-group__label">Version 4.2 is live</span>${ICON.arrow.replace('cn-icon', 'cn-badge-group__icon')}</a> <a href="#" class="cn-badge-group" data-tone="success" data-theme="light" data-size="md" data-align="leading"><span class="cn-badge-group__badge">Resolved</span><span class="cn-badge-group__label">All systems normal</span>${ICON.arrow.replace('cn-icon', 'cn-badge-group__icon')}</a> <a href="#" class="cn-badge-group" data-tone="error" data-theme="light" data-size="md" data-align="leading"><span class="cn-badge-group__badge">Incident</span><span class="cn-badge-group__label">API latency degraded</span>${ICON.arrow.replace('cn-icon', 'cn-badge-group__icon')}</a>`),
    ex('Trailing and sizes', `<a href="#" class="cn-badge-group" data-tone="brand" data-theme="light" data-size="sm" data-align="trailing"><span class="cn-badge-group__badge">New</span><span class="cn-badge-group__label">Read the changelog</span>${ICON.arrow.replace('cn-icon', 'cn-badge-group__icon')}</a> <a href="#" class="cn-badge-group" data-tone="brand" data-theme="light" data-size="lg" data-align="leading"><span class="cn-badge-group__badge">New feature</span><span class="cn-badge-group__label">Check out the team dashboard</span>${ICON.arrow.replace('cn-icon', 'cn-badge-group__icon')}</a>`),
  ],
  rules: ['One badge group per page, placed above the hero or page title with 16–24px below it.', 'Inner badge: 1–2 words; label: one short sentence; always ends with the arrow when it links.', 'the system equivalent: badge group (light / modern; leading / trailing; sm–lg).'],
  a11y: ['When it navigates it is an <a href>; otherwise a <span> without hover affordance.', 'The inner badge text is part of the link name; do not hide it.'],
  related: ['badge', 'kicker', 'banner'],
};
