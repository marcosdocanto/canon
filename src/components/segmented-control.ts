import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, ex, ICON, typeStyle } from './_shared.ts';

// the reference "button-border" rail: a gray-50 track with a 1px gray-200 ring and 4px padding,
// radius 10 (sm) / 12 (md), items with 14px semibold text (16px on md in the reference tabs — we keep
// 14px so the rail matches ButtonGroup), radius 6 / 8, gray-600 → the selected item lifts on white
// with shadow-sm and the default ink. Total heights 36 (sm) / 40 (md) so it sits next to a ButtonGroup.

const TRANSITION_FAST = {
  'transition-property': 'background-color, color, box-shadow, opacity',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-segmented-control__icon');
const item = (label: string, attrs = '', ic = '') => `<button type="button" role="radio" class="cn-segmented-control__item" ${attrs}>${ic}${label}</button>`;
const rail = (attrs: string, items: string, size = 'md', variant = 'default') => `<div class="cn-segmented-control" role="radiogroup" data-size="${size}" data-variant="${variant}" ${attrs}>${items}</div>`;

export const segmentedControl: ComponentSpec = {
  name: 'SegmentedControl',
  slug: 'segmented-control',
  category: 'forms',
  description: 'Single-choice group drawn as one rail: a gray-50 track with a hairline ring and 4px padding where the selected item lifts on a white surface with shadow-sm. Same heights (36 / 40px) and 14px semibold type as ButtonGroup, so the two sit side by side in a toolbar.',
  usage: 'Two to five mutually exclusive views or modes whose change is immediate (List / Board, Day / Week / Month, Monthly / Annual). For form data use Radio; for navigation between pages use Tabs; for actions on one object use ButtonGroup; for more than five options use Select.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The rail: inline-flex, gray-50 fill, 1px gray-200 inset ring, 4px padding, radius 10 (sm) / 12 (md), 4px between items. role="radiogroup" with an aria-label.' },
    { part: 'item', element: 'button', description: 'One option: <button role="radio" aria-checked>. 28px (sm) / 32px (md) tall, padding 10px, radius 6 / 8, 14px semibold gray-600 until selected.' },
    { part: 'icon', element: 'svg', description: 'Optional leading icon (16px on sm, 20px on md) inside an item, gray-500, or the only content with aria-label on the item. Decorative.', optional: true },
  ],
  props: {
    size: { values: ['sm', 'md'], default: 'md', description: 'md = 40px rail with 32px items (matches md controls and a md ButtonGroup); sm = 36px rail with 28px items for cards, tables and popovers.' },
    variant: { values: ['default', 'full'], default: 'default', description: 'default = items at their content width, the rail hugs them; full = the rail fills its container and every item takes an equal share (mobile sheets, narrow cards).' },
  },
  states: {
    selected: { selector: '[aria-checked="true"], &[data-selected]', description: 'On the __item (not the root): white surface, default ink, shadow-sm; the icon darkens. Exactly one per group.', markup: 'aria-checked="true" on the item button (data-selected also accepted)' },
    hover: { selector: ':hover:not(:disabled)', description: 'On an unselected __item: text turns to the default ink and the icon darkens; no background change.', markup: 'native :hover on the item' },
    focus: { selector: ':focus-visible', description: 'On the __item: the 4px brand ring on the item itself, raised above its neighbours.', markup: 'native :focus-visible on the item' },
    'item-disabled': { selector: ':disabled', description: 'On the __item: 50% opacity, cursor not-allowed; stays visible so the option is known to exist.', markup: 'disabled on the item button' },
    disabled: { selector: '[data-disabled]', description: 'Whole group at 50% opacity and not interactive.', markup: 'data-disabled on the root' },
  },
  base: {
    root: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.1}',
      'max-width': '100%',
      padding: '{space.1}',
      'background-color': '{color.bg-subtle}',
      'box-shadow': ring('{color.border-default}'),
      'border-radius': 'calc({radius.xl} - 2px)',
    },
    item: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      'white-space': 'nowrap',
      ...typeStyle('label-md'),
      color: '{color.fg-muted}',
      'border-radius': '{radius.md}',
      ...TRANSITION_FAST,
    },
    icon: { 'flex-shrink': '0', display: 'block', color: '{color.fg-subtle}', transition: 'inherit' },
    '@states': {
      disabled: { root: { opacity: '{opacity.disabled}', 'pointer-events': 'none' } },
    },
  },
  variants: {
    size: {
      sm: {
        root: { 'border-radius': 'calc({radius.xl} - 2px)' },
        item: { height: 'calc({size.control.sm} - {space.2})', 'padding-inline': '{space.2.5}', gap: '{space.1}', 'border-radius': '{radius.md}' },
        icon: { width: '{size.icon.sm}', height: '{size.icon.sm}' },
      },
      md: {
        root: { 'border-radius': '{radius.xl}' },
        item: { height: 'calc({size.control.md} - {space.2})', 'padding-inline': '{space.2.5}', gap: '{space.1.5}', 'border-radius': '{radius.lg}' },
        icon: { width: '{size.icon.md}', height: '{size.icon.md}' },
      },
    },
    variant: {
      default: { root: {} },
      full: { root: { display: 'flex', width: '100%' }, item: { flex: '1 1 0', 'min-width': '0' } },
    },
  },
  extraCss: `
.cn-segmented-control .cn-segmented-control__item[aria-checked="true"], .cn-segmented-control .cn-segmented-control__item[data-selected] { background-color: {color.bg-surface}; color: {color.fg-default}; box-shadow: {shadow.sm}; }
.cn-segmented-control .cn-segmented-control__item[aria-checked="true"] .cn-segmented-control__icon, .cn-segmented-control .cn-segmented-control__item[data-selected] .cn-segmented-control__icon { color: {color.fg-muted}; }
.cn-segmented-control .cn-segmented-control__item:hover:not(:disabled):not([aria-checked="true"]) { color: {color.fg-default}; }
.cn-segmented-control .cn-segmented-control__item:hover:not(:disabled):not([aria-checked="true"]) .cn-segmented-control__icon { color: {color.fg-muted}; }
.cn-segmented-control .cn-segmented-control__item:focus-visible { position: relative; z-index: {z.raised}; outline: none; box-shadow: {shadow.focus}; }
.cn-segmented-control .cn-segmented-control__item[aria-checked="true"]:focus-visible { box-shadow: {shadow.sm}, {shadow.focus}; }
.cn-segmented-control .cn-segmented-control__item:disabled { opacity: {opacity.disabled}; cursor: not-allowed; }
.cn-segmented-control .cn-segmented-control__item[aria-checked="true"] + .cn-segmented-control__item { margin-inline-start: 0; }`,
  examples: [
    ex('Default', rail('aria-label="View"', item('List', 'aria-checked="true" tabindex="0"') + item('Board', 'aria-checked="false" tabindex="-1"') + item('Timeline', 'aria-checked="false" tabindex="-1"')), '40px rail: gray-50 with a hairline ring and 4px padding; the selected item is white with shadow-sm.'),
    ex('With icons', rail('aria-label="Inbox view"', item('Inbox', 'aria-checked="true" tabindex="0"', icon('inbox')) + item('Calendar', 'aria-checked="false" tabindex="-1"', icon('calendar')) + item('People', 'aria-checked="false" tabindex="-1"', icon('user'))), '20px gray-500 icons, 6px before the label; darker on the selected item.'),
    ex('Icon-only', rail('aria-label="Layout"', item('', 'aria-checked="true" aria-label="List layout" tabindex="0"', icon('menu')) + item('', 'aria-checked="false" aria-label="Grid layout" tabindex="-1"', icon('home')) + item('', 'aria-checked="false" aria-label="Settings layout" tabindex="-1"', icon('settings'))), 'Every icon-only item carries an aria-label.'),
    ex('Full width', rail('aria-label="Billing cycle" style="max-width:360px"', item('Monthly', 'aria-checked="false" tabindex="-1"') + item('Annual · save 20%', 'aria-checked="true" tabindex="0"'), 'md', 'full')),
    ex('Small', rail('aria-label="Range"', item('Day', 'aria-checked="false" tabindex="-1"') + item('Week', 'aria-checked="true" tabindex="0"') + item('Month', 'aria-checked="false" tabindex="-1"') + item('Quarter', 'aria-checked="false" tabindex="-1"'), 'sm'), '36px rail with 28px items and radius 10.'),
    ex('Disabled item', rail('aria-label="Export format"', item('CSV', 'aria-checked="true" tabindex="0"') + item('Excel', 'aria-checked="false" tabindex="-1"') + item('PDF', 'aria-checked="false" tabindex="-1" disabled aria-disabled="true"')), 'PDF export is a Scale feature: the item stays visible at 50%.'),
    ex('Disabled group', rail('aria-label="View" data-disabled aria-disabled="true"', item('List', 'aria-checked="true" tabindex="-1" disabled') + item('Board', 'aria-checked="false" tabindex="-1" disabled'))),
  ],
  recipes: [
    ex('Next to a ButtonGroup in a toolbar', `<div style="display:flex;align-items:center;gap:var(--cn-space-3)">${rail('aria-label="View"', item('List', 'aria-checked="true" tabindex="0"') + item('Board', 'aria-checked="false" tabindex="-1"'))}<div class="cn-button-group" data-variant="attached" data-orientation="horizontal" role="group" aria-label="Range"><button type="button" class="cn-button" data-variant="outline" data-size="md" aria-pressed="true"><span class="cn-button__label">30 days</span></button><button type="button" class="cn-button" data-variant="outline" data-size="md" aria-pressed="false"><span class="cn-button__label">7 days</span></button></div></div>`, 'Both are 40px tall with 14px semibold labels; the rail is for a view, the group for a range.'),
  ],
  rules: [
    'Use for 2–5 mutually exclusive views or modes whose change is immediate. For form data use Radio; for page navigation use Tabs; for actions on one object use ButtonGroup.',
    'Labels are one or two words in sentence case, or an icon with aria-label. Keep every item in the same voice: all nouns or all icons, never mixed.',
    'One item is always selected; there is no empty state and no toggling off.',
    'variant="full" only inside narrow containers (mobile sheets, cards ≤ 400px) so each item stretches equally; default keeps items at content width.',
    'md (40px) matches md controls in a toolbar; sm (36px) sits inside tables, cards and popovers. Never place a SegmentedControl taller than the controls beside it.',
    'Maximum five items. Beyond that the choice becomes a Select or Tabs.',
    'Do not mix action buttons into the rail; put related actions in a ButtonGroup beside it, 12px away.',
  ],
  a11y: [
    'The root has role="radiogroup" with aria-label (or aria-labelledby); each item is a <button role="radio" aria-checked="true|false">.',
    'Roving tabindex: only the selected item has tabindex="0"; Left/Right (and Up/Down) move selection and check the new item, Home/End jump.',
    'Icon-only items require aria-label; the svg is aria-hidden.',
    'Disabled item: disabled plus aria-disabled="true"; a disabled group sets data-disabled and aria-disabled on the root.',
    'Selection change must not move focus or navigate. If it changes the URL, use Tabs instead.',
  ],
  related: ['radio', 'tabs', 'button-group', 'select'],
};
