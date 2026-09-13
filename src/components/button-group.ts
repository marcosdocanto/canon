import type { ComponentSpec } from '../types.ts';
import { CONTROL, ex, ICON } from './_shared.ts';

// the system ButtonGroup: attached secondary-gray buttons (36/40/44px) whose 1px
// rings overlap by 1px, outer corners 8px, inner corners square, shadow-xs on the
// container, selected item (aria-pressed) in the gray-50 hover fill.

const outline = (label: string, attrs = '', leading = '', size = 'md') =>
  `<button type="button" class="cn-button" data-variant="outline" data-size="${size}"${attrs}>${leading}<span class="cn-button__label">${label}</span></button>`;
const iconBtn = (label: string, i: keyof typeof ICON, variant = 'outline', attrs = '') =>
  `<button type="button" class="cn-icon-button" data-variant="${variant}" data-size="md" data-shape="square" aria-label="${label}"${attrs}>${ICON[i].replace('cn-icon', 'cn-icon-button__icon')}</button>`;
const group = (attrs: string, children: string) => `<div class="cn-button-group" data-variant="attached" data-orientation="horizontal" ${attrs}>${children}</div>`;

export const buttonGroup: ComponentSpec = {
  name: 'ButtonGroup',
  slug: 'button-group',
  category: 'actions',
  description: 'A row (or column) of related Buttons. Attached groups fuse into one control by squaring the inner corners and overlapping the 1px rings (the reference button group); spaced groups just keep a consistent gap.',
  usage: 'Use attached for actions that belong to one object (Assign · Snooze · Archive), for split buttons (action + chevron menu) and for a toggle group where one option is on (aria-pressed on the selected child). Use spaced for a row of independent toolbar actions. For a rail-style single choice use SegmentedControl.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Inline-flex container with role="group" and an aria-label. Children are outline Buttons or IconButtons of the same size; attached groups carry the shadow-xs and the 8px outer radius.' },
  ],
  props: {
    variant: {
      values: ['attached', 'spaced'],
      default: 'attached',
      description: 'attached = no gap, inner corners squared, rings overlap by 1px so the group reads as one control (the reference ButtonGroup); spaced = 12px gap, every button keeps its own radius and shadow.',
    },
    orientation: {
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
      description: 'horizontal = a row (toolbars, headers, split buttons); vertical = a stacked column (zoom controls, ordering, side rails). Vertical attached groups stretch children to the same width.',
    },
  },
  states: {},
  base: {
    root: {
      position: 'relative',
      'z-index': '{z.base}',
      display: 'inline-flex',
      'align-items': 'stretch',
      'flex-wrap': 'nowrap',
      'vertical-align': 'middle',
      'max-width': '100%',
    },
  },
  variants: {
    variant: {
      attached: { root: { gap: '0', 'border-radius': '{radius.control}', 'box-shadow': '{shadow.xs}' } },
      spaced: { root: { gap: '{space.3}', 'flex-wrap': 'wrap' } },
    },
    orientation: {
      horizontal: { root: { 'flex-direction': 'row' } },
      vertical: { root: { 'flex-direction': 'column', 'align-items': 'stretch' } },
    },
  },
  extraCss: `
.cn-button-group > .cn-button { flex-shrink: 1; min-width: 0; height: auto; min-height: {size.control.md}; white-space: normal; }
.cn-button-group > .cn-button > .cn-button__label { min-width: 0; overflow-wrap: anywhere; }
${Object.entries(CONTROL).map(([size, control]) => `.cn-button-group > .cn-button[data-size="${size}"] { min-height: ${control.height}; }`).join('\n')}
.cn-button-group[data-variant="attached"][data-orientation="horizontal"] > .cn-button:not(:first-child),
.cn-button-group[data-variant="attached"][data-orientation="horizontal"] > .cn-icon-button:not(:first-child) { border-start-start-radius: 0; border-end-start-radius: 0; margin-inline-start: -1px; }
.cn-button-group[data-variant="attached"][data-orientation="horizontal"] > .cn-button:not(:last-child),
.cn-button-group[data-variant="attached"][data-orientation="horizontal"] > .cn-icon-button:not(:last-child) { border-start-end-radius: 0; border-end-end-radius: 0; }
.cn-button-group[data-variant="attached"][data-orientation="vertical"] > .cn-button:not(:first-child),
.cn-button-group[data-variant="attached"][data-orientation="vertical"] > .cn-icon-button:not(:first-child) { border-start-start-radius: 0; border-start-end-radius: 0; margin-block-start: -1px; }
.cn-button-group[data-variant="attached"][data-orientation="vertical"] > .cn-button:not(:last-child),
.cn-button-group[data-variant="attached"][data-orientation="vertical"] > .cn-icon-button:not(:last-child) { border-end-start-radius: 0; border-end-end-radius: 0; }
.cn-button-group[data-variant="attached"] > .cn-button::before,
.cn-button-group[data-variant="attached"] > .cn-icon-button::before { border-radius: inherit; }
.cn-button-group[data-variant="attached"] > .cn-button:hover,
.cn-button-group[data-variant="attached"] > .cn-button:focus-visible,
.cn-button-group[data-variant="attached"] > .cn-button[aria-pressed="true"],
.cn-button-group[data-variant="attached"] > .cn-icon-button:hover,
.cn-button-group[data-variant="attached"] > .cn-icon-button:focus-visible,
.cn-button-group[data-variant="attached"] > .cn-icon-button[aria-pressed="true"] { z-index: {z.raised}; }
/* the reference: items carry the ring + skeuomorphic pair only; the container carries the single shadow-xs. */
.cn-button-group[data-variant="attached"] > .cn-button[data-variant="outline"],
.cn-button-group[data-variant="attached"] > .cn-icon-button[data-variant="outline"] { box-shadow: inset 0 0 0 1px {color.border-control}, {shadow.control}; }
.cn-button-group[data-variant="attached"] > .cn-button[data-variant="outline"]:focus-visible,
.cn-button-group[data-variant="attached"] > .cn-icon-button[data-variant="outline"]:focus-visible { box-shadow: inset 0 0 0 1px {color.border-control}, {shadow.control}, {shadow.focus}; }
.cn-button-group[data-variant="attached"] > .cn-button[data-variant="primary"],
.cn-button-group[data-variant="attached"] > .cn-icon-button[data-variant="primary"] { box-shadow: {shadow.control}; }
.cn-button-group[data-variant="attached"] > .cn-button[data-variant="primary"]:focus-visible,
.cn-button-group[data-variant="attached"] > .cn-icon-button[data-variant="primary"]:focus-visible { box-shadow: {shadow.control}, {shadow.focus}; }
.cn-button-group[data-variant="attached"] > .cn-button[aria-pressed="true"],
.cn-button-group[data-variant="attached"] > .cn-icon-button[aria-pressed="true"] { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-button-group[data-variant="attached"] > .cn-button[aria-pressed="true"] .cn-button__icon,
.cn-button-group[data-variant="attached"] > .cn-icon-button[aria-pressed="true"] .cn-icon-button__icon { color: {color.fg-muted}; }
.cn-button-group[data-variant="attached"] > .cn-button:disabled { opacity: 1; color: color-mix(in srgb, {color.fg-muted} 50%, transparent); }
.cn-button-group[data-variant="attached"] > .cn-button:disabled > * { opacity: {opacity.disabled}; }
.cn-button-group[data-orientation="vertical"] > .cn-button { justify-content: flex-start; }`,
  examples: [
    ex('Attached (actions on one object)', group('role="group" aria-label="Conversation actions"', outline('Assign') + outline('Snooze') + outline('Archive')), 'Outline buttons fuse into one control: inner corners squared, rings overlap by 1px, shadow-xs on the group.'),
    ex('Toggle group (one option on)', group('role="group" aria-label="Range"', outline('12 months', ' aria-pressed="true"') + outline('30 days', ' aria-pressed="false"') + outline('7 days', ' aria-pressed="false"') + outline('24 hours', ' aria-pressed="false"')), 'The reference ButtonGroup: the selected child (aria-pressed="true") sits in the gray-50 fill with default ink.'),
    ex('With leading icons', group('role="group" aria-label="View"', outline('Text', '', ICON.menu.replace('cn-icon', 'cn-button__icon')) + outline('Grid', ' aria-pressed="true"', ICON.home.replace('cn-icon', 'cn-button__icon')) + outline('Calendar', '', ICON.calendar.replace('cn-icon', 'cn-button__icon'))), 'Icons are gray-400 at rest and gray-500 on the selected item.'),
    ex('Split button', group('role="group" aria-label="Send invite"', `<button type="button" class="cn-button" data-variant="primary" data-size="md"><span class="cn-button__label">Send invite</span></button>` + iconBtn('More send options', 'chevronDown', 'primary', ' aria-haspopup="menu" aria-expanded="false"')), 'The only case where an attached group is primary: the main action plus a chevron that opens a Menu.'),
    ex('Attached icon buttons', group('role="group" aria-label="Row actions"', iconBtn('Copy ID', 'copy') + iconBtn('Open in new tab', 'external') + iconBtn('Delete', 'trash'))),
    ex('Sizes', `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--cn-space-4)">${group('role="group" aria-label="Range small"', outline('Day', ' aria-pressed="true"', '', 'sm') + outline('Week', '', '', 'sm') + outline('Month', '', '', 'sm'))}${group('role="group" aria-label="Range medium"', outline('Day', ' aria-pressed="true"') + outline('Week') + outline('Month'))}${group('role="group" aria-label="Range large"', outline('Day', ' aria-pressed="true"', '', 'lg') + outline('Week', '', '', 'lg') + outline('Month', '', '', 'lg'))}</div>`, '36 / 40 / 44px, from the children\'s size.'),
    ex('Spaced', `<div class="cn-button-group" data-variant="spaced" data-orientation="horizontal" role="group" aria-label="List tools">${outline('Filter', '', ICON.menu.replace('cn-icon', 'cn-button__icon'))}${outline('Sort')}${outline('Export', '', ICON.external.replace('cn-icon', 'cn-button__icon'))}</div>`, 'Independent tools keep their own radius; 12px apart.'),
    ex('Vertical attached with a disabled child', `<div class="cn-button-group" data-variant="attached" data-orientation="vertical" role="group" aria-label="Reorder">${outline('Move up')}${outline('Move down')}${outline('Remove', ' disabled')}</div>`, 'Children stretch to the widest label; text aligns to the start. A disabled child fades its content, not its ring.'),
  ],
  rules: [
    'Group only actions that act on the same object or belong to the same tool. Cancel and Save are not a group; they are an action row.',
    'All children share one size and the outline variant. The single exception is the split button: primary action + primary chevron.',
    'Attached groups hold 2–5 children. Beyond that, use a toolbar of spaced groups or move the rest into a Menu.',
    'Attached = one control (the corners say so). Spaced = several controls. Do not attach unrelated tools just to save space.',
    'A toggle group marks exactly one child with aria-pressed="true" (a range, a view). For a rail with a lifted white item use SegmentedControl instead.',
    'Vertical groups are rare: zoom controls, reorder handles, a rail of icon actions. Never a vertical group of text actions in a form.',
    'Do not mix Button and IconButton sizes inside one group; the heights must match exactly for the rings to overlap cleanly.',
    'Disabled children stay in the group (the layout must not jump); the reason shows in a Tooltip.',
  ],
  a11y: [
    'The root has role="group" and an aria-label naming what the actions act on ("Conversation actions").',
    'Every child is a real <button>; IconButtons keep their aria-label. The group adds no keyboard behavior (Tab moves between children).',
    'Toggle children expose aria-pressed="true|false"; a split button chevron exposes aria-haspopup="menu" and aria-expanded with its own aria-label.',
    'Focus rings are raised above neighbours (z-index) so the ring is never clipped by the next button.',
  ],
  related: ['button', 'icon-button', 'segmented-control', 'menu'],
};
