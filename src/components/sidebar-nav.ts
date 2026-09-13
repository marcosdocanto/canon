import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// A compact reading rail with persistent leading markers on current destinations.

const TRANSITION_FAST = {
  'transition-property': 'background-color, color, box-shadow',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-sidebar-nav__icon');
const item = (label: string, i: keyof typeof ICON | null, attrs = '', count = '') =>
  `<a href="#" class="cn-sidebar-nav__item"${attrs}>${i ? icon(i) : ''}<span class="cn-sidebar-nav__label">${label}</span>${count ? `<span class="cn-sidebar-nav__count">${count}</span>` : ''}</a>`;
const parent = (label: string, i: keyof typeof ICON, open: boolean, children: string) =>
  `<details class="cn-sidebar-nav__group"${open ? ' open' : ''}><summary class="cn-sidebar-nav__item">${icon(i)}<span class="cn-sidebar-nav__label">${label}</span>${ICON.chevronDown.replace('cn-icon', 'cn-sidebar-nav__chevron')}</summary>${children}</details>`;
const group = (id: string, label: string | null, items: string) =>
  `<div class="cn-sidebar-nav__group" role="group"${label ? ` aria-labelledby="${id}"` : ''}>${label ? `<div class="cn-sidebar-nav__group-label" id="${id}">${label}</div>` : ''}${items}</div>`;
const MAIN = (current = 'Dashboard') => [['Home', 'home'], ['Dashboard', 'calendar'], ['Projects', 'copy'], ['Tasks', 'check', '10'], ['Reporting', 'inbox'], ['Users', 'user']].map(([l, i, c]) => item(l, i as keyof typeof ICON, l === current ? ' aria-current="page"' : '', c ?? '')).join('');

export const sidebarNav: ComponentSpec = {
  name: 'SidebarNav',
  slug: 'sidebar-nav',
  category: 'navigation',
  description: 'A grouped navigation rail: a 280px column of 36px link rows (14px semibold, 20px icon, radius 6) grouped with subheadings or dividers, a quiet hover fill and a leading mark on the current destination, with count badges and collapsible children.',
  usage: 'Use as the nav list of a Sidebar or on its own for the second level of navigation inside a product area (settings sections, a workspace\'s views). Items are answers to what the user wants to do, grouped by job, never a mirror of the data model. For 3–6 top-level destinations use the Topbar instead.',
  anatomy: [
    { part: 'root', element: 'nav', description: 'The column: 280px wide, 20 × 16px padding, groups stacked. Has aria-label.' },
    { part: 'group', element: 'div', description: 'A set of related items with role="group" (or a <details> for a collapsible parent); rows 2px apart, 16px above each group after the first.' },
    { part: 'group-label', element: 'div', description: 'Subheading naming the group in 12px semibold fg-subtle, 8px inset: "General", "Workspace". Referenced by the group\'s aria-labelledby.', optional: true },
    { part: 'item', element: 'a', description: 'One destination: a 36px link row (or <summary> for a collapsible parent), padding 8, radius 6, 14px semibold gray-700; holds icon + label + optional count or chevron. data-level="2" indents a child row to 40px.' },
    { part: 'icon', element: 'svg', description: '20px leading icon, fg-subtle at rest, one step darker when hovered or current. All items in a group have one, or none do.', optional: true },
    { part: 'label', element: 'span', description: 'The destination name, 1–2 words. Fills the row and truncates with an ellipsis.' },
    { part: 'count', element: 'span', description: 'Trailing count in a 22px gray badge (12px medium, gray-50, gray-200 ring), 12px after the label. Only for numbers that need action, never totals.', optional: true },
    { part: 'chevron', element: 'svg', description: '16px chevron-down at the end of a collapsible parent; flips when the <details> is open.', optional: true },
    { part: 'divider', element: 'hr', description: '1px gray-200 rule between groups (the "dividers" layout), 8px above and below.', optional: true },
  ],
  props: {
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 36px rows, 14px semibold, 20px icons; the default. sm = 32px rows (padding 6 × 8), 14px semibold, 16px icons for dense admin rails and secondary panels.',
    },
    variant: {
      values: ['default', 'inset'],
      default: 'default',
      description: 'default = transparent on the surface; hovered and current rows get the gray-50 fill (the default). inset = the whole nav is a gray-50 rail with a hairline on its trailing edge, and the current item uses a surface fill and a leading action-colored rule.',
    },
  },
  states: {
    hover: { selector: ' .cn-sidebar-nav__item:hover', description: 'Pointer over an item (lives on the ITEM, not the root): gray-50 fill, gray-800 label, gray-500 icon.', markup: 'native :hover on the item' },
    current: { selector: ' .cn-sidebar-nav__item[aria-current="page"]', description: 'The destination the user is on: gray-50 fill (gray-100 when hovered), ink label, darker icon (inset: white pill with ring and shadow-xs). Exactly one per nav.', markup: 'aria-current="page" on the item' },
    focus: { selector: ' .cn-sidebar-nav__item:focus-visible', description: 'Keyboard focus on an item: the token-defined focus ring around the row.', markup: 'native :focus-visible on the item' },
    disabled: { selector: ' .cn-sidebar-nav__item[aria-disabled="true"]', description: 'Destination not available on this plan or not yet set up. 50% opacity, no hover; keep the label so the user knows it exists.', markup: 'aria-disabled="true" on the item (omit href)' },
  },
  base: {
    root: {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.4}',
      width: 'calc({space.64} + {space.6})',
      'flex-shrink': '0',
      padding: '{space.5} {space.4}',
      color: '{color.fg-default}',
    },
    group: { display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}' },
    'group-label': {
      display: 'block',
      ...typeStyle('label-xs'),
      'font-family': '{font.family.mono}',
      'letter-spacing': '{font.letterSpacing.wide}',
      'text-transform': 'uppercase',
      color: '{color.fg-subtle}',
      padding: '0 {space.2} {space.1}',
      'user-select': 'none',
    },
    item: {
      position: 'relative',
      display: 'flex',
      'align-items': 'center',
      gap: '{space.2}',
      width: '100%',
      'max-height': '{space.9}',
      padding: '{space.2}',
      'border-radius': '{radius.md}',
      ...typeStyle('label-md'),
      color: '{color.fg-muted}',
      'background-color': 'transparent',
      'text-decoration': 'none',
      cursor: 'pointer',
      'white-space': 'nowrap',
      'min-width': '0',
      'user-select': 'none',
      'list-style': 'none',
      ...TRANSITION_FAST,
    },
    icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', color: '{color.fg-subtle}', transition: 'inherit' },
    label: { flex: '1 1 auto', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    count: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      height: '22px',
      'margin-inline-start': '{space.3}',
      'margin-block': '-1px',
      'padding-inline': '{space.2}',
      'border-radius': '{radius.sm}',
      'background-color': '{color.bg-subtle}',
      'box-shadow': ring('{color.border-default}'),
      ...typeStyle('label-xs'),
      color: '{color.fg-muted}',
      'font-variant-numeric': 'tabular-nums',
      'flex-shrink': '0',
    },
    chevron: { width: '{size.icon.sm}', height: '{size.icon.sm}', 'margin-inline-start': '{space.3}', 'flex-shrink': '0', color: '{color.fg-subtle}', 'stroke-width': '2.5', 'transition-property': 'transform', 'transition-duration': '{motion.duration.fast}', 'transition-timing-function': '{motion.easing.linear}' },
    divider: { border: '0', 'border-top': HAIRLINE, width: '100%', margin: '{space.2} {space.0.5}' },
  },
  variants: {
    size: {
      sm: {
        item: { 'max-height': '{space.8}', padding: '{space.1.5} {space.2}' },
        icon: { width: '{size.icon.sm}', height: '{size.icon.sm}' },
      },
      md: { root: {} },
    },
    variant: {
      default: { root: {} },
      inset: {
        root: { 'background-color': '{color.bg-subtle}', 'border-inline-end': HAIRLINE },
      },
    },
  },
  extraCss: `
.cn-sidebar-nav__item:hover:not([aria-disabled="true"]) { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-sidebar-nav__item:hover:not([aria-disabled="true"]) .cn-sidebar-nav__icon { color: {color.fg-muted}; }
.cn-sidebar-nav__item[aria-current="page"] { background-color: {color.bg-action-subtle}; color: {color.fg-action}; box-shadow: inset 2px 0 0 {color.bg-action}; }
[dir="rtl"] .cn-sidebar-nav__item[aria-current="page"] { box-shadow: inset -2px 0 0 {color.bg-action}; }
.cn-sidebar-nav__item[aria-current="page"]:hover { background-color: {color.bg-muted}; }
.cn-sidebar-nav__item[aria-current="page"] .cn-sidebar-nav__icon { color: inherit; }
.cn-sidebar-nav[data-variant="inset"] .cn-sidebar-nav__item:hover:not([aria-disabled="true"]) { background-color: {color.bg-muted}; }
.cn-sidebar-nav[data-variant="inset"] .cn-sidebar-nav__item[aria-current="page"] { background-color: {color.bg-surface}; box-shadow: inset 2px 0 0 {color.bg-action}; }
.cn-sidebar-nav__item:focus-visible { outline: none; box-shadow: {shadow.focus}; z-index: {z.raised}; }
.cn-sidebar-nav__item[aria-disabled="true"] { opacity: {opacity.disabled}; cursor: not-allowed; pointer-events: none; }
.cn-sidebar-nav__item[data-level="2"] { padding-inline-start: {space.10}; padding-inline-end: {space.3}; }
.cn-sidebar-nav[data-size="sm"] .cn-sidebar-nav__item[data-level="2"] { padding-inline-start: {space.8}; }
details.cn-sidebar-nav__group > summary::-webkit-details-marker { display: none; }
details.cn-sidebar-nav__group > summary::marker { content: ""; }
details.cn-sidebar-nav__group[open] > summary .cn-sidebar-nav__chevron { transform: scaleY(-1); }
details.cn-sidebar-nav__group > .cn-sidebar-nav__item + .cn-sidebar-nav__item { margin-top: {space.0.5}; }`,
  examples: [
    ex('Simple list', `<nav class="cn-sidebar-nav" data-variant="default" data-size="md" aria-label="Main">${group('sn-main', null, MAIN())}</nav>`, '36px rows, 14px semibold, 20px icons; Dashboard is current (gray-50), Tasks carries a 22px count badge.'),
    ex('Sections with subheadings', `<nav class="cn-sidebar-nav" data-variant="default" data-size="md" aria-label="Main">${group('sn-general', 'General', item('Home', 'home') + item('Dashboard', 'calendar', ' aria-current="page"') + item('Tasks', 'check', '', '10'))}${group('sn-ws', 'Workspace', item('Projects', 'copy') + item('Reporting', 'inbox') + item('Users', 'user'))}${group('sn-acct', 'Account', item('Support', 'info') + item('Settings', 'settings'))}</nav>`, 'Groups 16px apart, each with a 12px semibold subheading.'),
    ex('Dividers and a collapsible parent', `<nav class="cn-sidebar-nav" data-variant="default" data-size="md" aria-label="Main">${group('sn-d1', null, item('Home', 'home') + item('Dashboard', 'calendar'))}<hr class="cn-sidebar-nav__divider">${group('sn-d2', null, parent('Projects', 'copy', true, item('All projects', null, ' data-level="2" aria-current="page"') + item('Shared with me', null, ' data-level="2"') + item('Archived', null, ' data-level="2"')) + item('Reporting', 'inbox') + item('Users', 'user'))}<hr class="cn-sidebar-nav__divider">${group('sn-d3', null, item('Support', 'info') + item('Settings', 'settings'))}</nav>`, 'A <details> group with a <summary> row: the chevron flips when open; child rows are indented to 40px.'),
    ex('Inset rail, small', `<nav class="cn-sidebar-nav" data-variant="inset" data-size="sm" aria-label="Settings">${group('sn-i1', 'Workspace', item('General', 'settings') + item('Members', 'user', ' aria-current="page"') + item('Billing', 'calendar'))}${group('sn-i2', 'Data', item('Imports', 'inbox') + item('Integrations', 'external') + item('API keys', 'copy'))}</nav>`, 'The rail is gray-50 with a trailing hairline; the current item uses a leading action-colored mark. 32px rows.'),
    ex('Disabled item and truncation', `<nav class="cn-sidebar-nav" data-variant="default" data-size="md" aria-label="Reports">${group('sn-r', 'Reports', item('Pipeline', 'arrow', ' aria-current="page"') + item('Enterprise procurement pipeline, Q3 review', 'calendar') + `<a class="cn-sidebar-nav__item" aria-disabled="true" title="Available on the Business plan">${icon('spark')}<span class="cn-sidebar-nav__label">Attribution</span></a>`)}</nav>`, 'Long labels truncate; the disabled item keeps its name and explains itself in a title or Tooltip.'),
  ],
  rules: [
    'Max 7 items per group and max 4 groups visible. If the nav needs more, the information architecture is wrong, not the component.',
    'Never one item per database table. Items are jobs and destinations ("Dashboard", "Reporting", "Billing"), grouped by who uses them and when.',
    'Labels are 1–2 words, sentence case, nouns. No verbs ("Manage members" → "Members"), no product jargon.',
    'Rows are 36px (sm 32px) with 8px padding and 2px between them; never change the height with padding.',
    'Icons are all-or-none within a group, 20px (16px at sm), fg-subtle; never emoji, never colored.',
    'Counts use the 22px badge and only for what needs action (unread, pending approvals, failed runs), never totals; hide the count at 0.',
    'Exactly one item carries aria-current="page" at any time, the deepest matching route; a collapsible parent stays open while a child is current.',
    'Width is fixed at 280px; the content never widens it. Long labels truncate with an ellipsis and get a title attribute.',
    'Two levels at most: a collapsible parent and its children. Deeper sections are Tabs on the page.',
    'The first group may go unlabeled (the home set); later groups get a subheading or a divider, not both.',
  ],
  a11y: [
    'Root is <nav aria-label="…"> naming the area ("Main", "Settings"); each group is role="group" with aria-labelledby pointing at its subheading.',
    'Items are real <a href> links; aria-current="page" marks the current destination and is the only selection state.',
    'Collapsible parents are <details>/<summary> so they work without JS; the chevron is decorative.',
    'Disabled items use aria-disabled="true", drop the href, and explain why in a title or Tooltip; they stay in the DOM so the structure is stable.',
    'Counts are read as part of the link text; add sr-only context when the number is ambiguous ("10 open tasks").',
    'Keyboard: Tab moves through items in order; no roving tabindex or arrow keys (this is a list of links, not a menu).',
  ],
  related: ['sidebar', 'topbar', 'tabs', 'breadcrumb', 'badge'],
};
