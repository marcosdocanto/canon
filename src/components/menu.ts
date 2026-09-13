import type { ComponentSpec } from '../types.ts';
import { STATE, ex, ICON, typeStyle } from './_shared.ts';

// the reference dropdown: a 248px white panel, radius 8, 1px ring + shadow-lg, 4px vertical
// padding; items 36px tall (padding 8 × 10 inside a 6px gutter, radius 6, 14px medium gray-700),
// 16px gray-400 icons 8px before the label, 12px gray-500 shortcut on the right, gray-200
// separators 4px apart, gray-50 when highlighted, red for destructive, 50% when disabled.

const TRANSITION_FAST = {
  'transition-property': 'background-color, color, box-shadow',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const HAIRLINE = '{border.width.thin} solid {color.border-default}';

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-menu__icon');
const CHECK = ICON.check.replace('cn-icon', 'cn-menu__check');
const item = (label: string, i: keyof typeof ICON | null = null, shortcut = '', attrs = '') =>
  `<button type="button" role="menuitem" class="cn-menu__item"${attrs}>${i ? icon(i) : ''}<span class="cn-menu__text">${label}</span>${shortcut ? `<kbd class="cn-menu__shortcut">${shortcut}</kbd>` : ''}</button>`;
const check = (role: 'menuitemcheckbox' | 'menuitemradio', label: string, checked: boolean, attrs = '') =>
  `<div role="${role}" tabindex="-1" aria-checked="${checked}" class="cn-menu__item"${attrs}>${CHECK}<span class="cn-menu__text">${label}</span></div>`;
const SEP = '<div class="cn-menu__separator" role="separator"></div>';
const label = (id: string, text: string) => `<div class="cn-menu__label" id="${id}">${text}</div>`;
const AVATAR_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";
const person = (name: string, checked = false) =>
  `<div role="menuitemradio" tabindex="-1" aria-checked="${checked}" class="cn-menu__item"><img class="cn-menu__avatar" src="${AVATAR_SRC}" alt=""><span class="cn-menu__text">${name}</span>${CHECK}</div>`;
const HEADER = `<div class="cn-menu__header cn-avatar-label-group" data-size="md"><span class="cn-avatar" data-size="md" data-shape="circle" data-tone="neutral" data-status="online" role="img" aria-label="Maya Chen, online"><span class="cn-avatar__fallback" aria-hidden="true">MC</span><span class="cn-avatar__status"></span></span><div class="cn-avatar-label-group__text"><span class="cn-avatar-label-group__name">Maya Chen</span><span class="cn-avatar-label-group__email">maya@lumen.co</span></div></div>`;

export const menu: ComponentSpec = {
  name: 'Menu',
  slug: 'menu',
  category: 'overlays',
  description: 'The dropdown panel of the reference: a 248px raised white surface (radius 8, hairline ring, shadow-lg) of 36px items with 16px icons, right-aligned shortcuts, gray-200 separators, section labels, an optional account-card header and a destructive last item. Styles the panel only; positioning is a separate anchor layer.',
  usage: 'Use for a short list of actions on one object (row actions, "More" in a card header, the account menu) and for grouped option toggles (sort, view, switch account). Not for navigation (SidebarNav), not for picking a form value (Select / Combobox), not for anything that needs a search field (CommandPalette).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The panel: role="menu", 248px wide, bg-surface-raised, gray-200 ring, radius 8, shadow-lg, 4px vertical and 6px horizontal padding. data-state="open|closed".' },
    { part: 'header', element: 'div', description: 'Optional account card at the top: an Avatar md with the avatar label group (name + email), 12px padding, hairline below; bleeds to the panel edges.', optional: true },
    { part: 'group', element: 'div', description: 'role="group" wrapping related items, optionally labelled.', optional: true },
    { part: 'label', element: 'div', description: 'Section heading in 12px semibold fg-subtle, padding 6 × 10 (4 below): "Sort by", "Switch account". Referenced by the group\'s aria-labelledby.', optional: true },
    { part: 'item', element: 'button', description: 'One action or option: role="menuitem" | "menuitemcheckbox" | "menuitemradio". 36px tall, padding 8 × 10, radius 6, 14px medium gray-700. Holds icon / avatar / check + text + shortcut or chevron.' },
    { part: 'icon', element: 'svg', description: '16px leading icon, fg-subtle. All items in a group have one, or none do.', optional: true },
    { part: 'avatar', element: 'img', description: '20px round avatar in the leading slot (account switchers, assignees).', optional: true },
    { part: 'check', element: 'svg', description: '16px brand check mark of checkbox / radio items, in the leading slot (or trailing after an avatar); invisible until aria-checked="true" so text stays aligned.', optional: true },
    { part: 'text', element: 'span', description: 'The item label; grows and truncates.', optional: true },
    { part: 'shortcut', element: 'kbd', description: 'Keyboard shortcut in 12px medium fg-subtle, pushed to the end. Only for shortcuts that really work.', optional: true },
    { part: 'chevron', element: 'svg', description: '16px chevron-right at the end of an item that opens a submenu.', optional: true },
    { part: 'separator', element: 'div', description: 'A 1px gray-200 rule bleeding to the panel edges, 4px above and below. role="separator".', optional: true },
  ],
  props: {
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 36px items, 14px medium; the reference. sm = 32px items (padding 6 × 8) for dense table row menus and toolbars.',
    },
  },
  states: {
    open: STATE.open(),
    closed: { selector: '[data-state="closed"]', description: 'Hidden. The panel stays in the DOM for focus management but is display: none.', markup: 'data-state="closed"' },
    highlighted: { selector: ' .cn-menu__item[data-highlighted], & .cn-menu__item:hover', description: 'The item under the pointer or reached by arrow keys (on the ITEM): gray-50 fill, text one step darker.', markup: 'data-highlighted on the item (keyboard) or native :hover' },
    checked: { selector: ' .cn-menu__item[aria-checked="true"]', description: 'A checkbox / radio item that is on: the brand check mark becomes visible.', markup: 'aria-checked="true" on a role="menuitemcheckbox|menuitemradio" item' },
    danger: { selector: ' .cn-menu__item[data-danger]', description: 'Destructive action: fg-danger text and icon, danger-subtle fill when highlighted. Always last, after a separator.', markup: 'data-danger on the item' },
    disabled: { selector: ' .cn-menu__item[aria-disabled="true"]', description: 'Not available now: 50% opacity, cursor not-allowed, no hover. Stays visible and focusable so the user learns it exists.', markup: 'aria-disabled="true" on the item' },
  },
  base: {
    root: {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.0.5}',
      width: 'calc({space.56} + {space.6})',
      'max-width': '100%',
      padding: '{space.1} {space.1.5}',
      'background-color': '{color.bg-surface-raised}',
      border: HAIRLINE,
      'border-radius': '{radius.panel}',
      'box-shadow': '{shadow.lg}',
      color: '{color.fg-default}',
      outline: 'none',
    },
    header: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.3}',
      padding: '{space.3} {space.4}',
      margin: 'calc({space.1} * -1) calc({space.1.5} * -1) {space.1}',
      'border-bottom': HAIRLINE,
      'min-width': '0',
    },
    group: { display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}' },
    label: {
      ...typeStyle('label-xs'),
      'font-weight': '{font.weight.semibold}',
      color: '{color.fg-subtle}',
      padding: '{space.1.5} {space.2.5} {space.1}',
      'user-select': 'none',
    },
    item: {
      appearance: 'none',
      '-webkit-appearance': 'none',
      border: '0',
      margin: '0',
      background: 'none',
      font: 'inherit',
      'text-align': 'start',
      width: '100%',
      display: 'flex',
      'align-items': 'center',
      gap: '{space.2}',
      'flex-shrink': '0',
      height: '{space.9}',
      padding: '{space.2} {space.2.5}',
      'border-radius': '{radius.md}',
      ...typeStyle('label-sm'),
      color: '{color.fg-muted}',
      'text-decoration': 'none',
      cursor: 'pointer',
      'user-select': 'none',
      'white-space': 'nowrap',
      outline: 'none',
      ...TRANSITION_FAST,
    },
    icon: { width: '{size.icon.sm}', height: '{size.icon.sm}', 'flex-shrink': '0', color: '{color.fg-subtle}', transition: 'inherit' },
    avatar: { width: '{size.icon.md}', height: '{size.icon.md}', 'border-radius': '{radius.full}', 'object-fit': 'cover', 'flex-shrink': '0', 'background-color': '{color.bg-muted}', 'max-width': 'none' },
    check: { width: '{size.icon.sm}', height: '{size.icon.sm}', 'flex-shrink': '0', visibility: 'hidden', color: '{brand.600}' },
    text: { flex: '1 1 auto', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis' },
    shortcut: {
      ...typeStyle('label-xs'),
      color: '{color.fg-subtle}',
      'margin-inline-start': 'auto',
      'padding-inline': '{space.1} {space.1}',
      'flex-shrink': '0',
    },
    chevron: { width: '{size.icon.sm}', height: '{size.icon.sm}', 'flex-shrink': '0', 'margin-inline-start': 'auto', color: '{color.fg-subtle}' },
    separator: {
      height: '0',
      'border-top': HAIRLINE,
      margin: '{space.1} calc({space.1.5} * -1)',
    },
    '@states': {
      open: { root: { display: 'flex' } },
      closed: { root: { display: 'none' } },
    },
  },
  variants: {
    size: {
      sm: {
        item: { height: '{space.8}', padding: '{space.1.5} {space.2}' },
        label: { padding: '{space.1} {space.2} {space.1}' },
      },
      md: { root: {} },
    },
  },
  extraCss: `
.cn-menu__item[data-highlighted], .cn-menu__item:hover:not([aria-disabled="true"]), .cn-menu__item:focus-visible { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-menu__item[data-highlighted] .cn-menu__icon, .cn-menu__item:hover:not([aria-disabled="true"]) .cn-menu__icon { color: {color.fg-muted}; }
.cn-menu__item:focus-visible { box-shadow: inset 0 0 0 2px {brand.500}; }
.cn-menu__item[data-danger] { color: {color.fg-danger}; }
.cn-menu__item[data-danger] .cn-menu__icon { color: {red.500}; }
.cn-menu__item[data-danger][data-highlighted], .cn-menu__item[data-danger]:hover:not([aria-disabled="true"]), .cn-menu__item[data-danger]:focus-visible { background-color: {color.bg-danger-subtle}; color: {color.fg-danger}; }
.cn-menu__item[aria-disabled="true"] { opacity: {opacity.disabled}; cursor: not-allowed; }
.cn-menu__item[aria-checked="true"] .cn-menu__check { visibility: visible; }
.cn-menu__item > .cn-menu__avatar + .cn-menu__text + .cn-menu__check { margin-inline-start: auto; }
.cn-menu-anchor { position: relative; display: inline-block; }
.cn-menu[data-floating] { position: absolute; top: calc(100% + {space.1}); inset-inline-start: 0; z-index: {z.dropdown}; }
.cn-menu[data-floating][data-align="end"] { inset-inline-start: auto; inset-inline-end: 0; }
.cn-menu[data-floating][data-side="top"] { top: auto; bottom: calc(100% + {space.1}); }`,
  examples: [
    ex('Actions on one object', `<div class="cn-menu" data-size="md" role="menu" aria-label="Project actions" data-state="open">${item('View project', 'external', '↵')}${item('Edit', 'settings', '⌘E')}${item('Duplicate', 'copy', '⌘D')}${item('Move to…', 'arrow')}${SEP}${item('Delete', 'trash', '⌫', ' data-danger')}</div>`, '248px panel; verbs in sentence case, "…" when the item opens a dialog. Delete is last, after a separator, in red.'),
    ex('Account menu with header', `<div class="cn-menu" data-size="md" role="menu" aria-label="Account" data-state="open">${HEADER}${item('View profile', 'user', '⌘K→P')}${item('Settings', 'settings', '⌘S')}${item('Keyboard shortcuts', 'info', '?')}${SEP}<div class="cn-menu__group" role="group" aria-labelledby="menu-switch">${label('menu-switch', 'Switch account')}${person('Maya Chen', true)}${person('Daniel Costa')}</div>${SEP}${item('Log out', 'external', '⌥⇧Q')}</div>`, 'The header is the account card (Avatar md + name + email); the "Switch account" section uses 20px avatars with the check on the right.'),
    ex('Grouped options with checks', `<div class="cn-menu" data-size="md" role="menu" aria-label="View options" data-state="open"><div class="cn-menu__group" role="group" aria-labelledby="menu-sort">${label('menu-sort', 'Sort by')}${check('menuitemradio', 'Newest first', true)}${check('menuitemradio', 'Oldest first', false)}${check('menuitemradio', 'Name', false)}</div>${SEP}<div class="cn-menu__group" role="group" aria-labelledby="menu-show">${label('menu-show', 'Show')}${check('menuitemcheckbox', 'Archived projects', true)}${check('menuitemcheckbox', 'Only mine', false)}</div></div>`, 'The brand check occupies the leading slot even when hidden, so labels align.'),
    ex('Submenu, highlighted and disabled items', `<div class="cn-menu" data-size="md" role="menu" aria-label="Row actions" data-state="open">${item('Assign to…', 'user', '', ' data-highlighted')}<button type="button" role="menuitem" class="cn-menu__item" aria-haspopup="menu" aria-expanded="false">${icon('inbox')}<span class="cn-menu__text">Share</span>${ICON.chevronRight.replace('cn-icon', 'cn-menu__chevron')}</button>${item('Snooze', 'calendar', 'S')}${item('Mark as done', 'check', 'E', ' aria-disabled="true"')}</div>`, 'data-highlighted is what keyboard navigation sets; a submenu item ends in a chevron; disabled items stay visible at 50%.'),
    ex('Small', `<div class="cn-menu" data-size="sm" role="menu" aria-label="Cell actions" data-state="open">${item('Copy', 'copy', '⌘C')}${item('Paste', 'inbox', '⌘V')}${SEP}${item('Clear', 'trash', '', ' data-danger')}</div>`, '32px items for dense tables.'),
    ex('Closed (in the DOM, hidden)', `<div class="cn-menu" data-size="md" role="menu" aria-label="Hidden menu" data-state="closed">${item('You should not see this', 'info')}</div><span class="cn-text-body-sm">data-state="closed" renders nothing.</span>`),
  ],
  recipes: [
    ex('Anchored to a trigger', `<div class="cn-menu-anchor" style="min-height:220px"><button type="button" class="cn-icon-button" data-variant="outline" data-size="md" data-shape="square" aria-label="More actions" aria-haspopup="menu" aria-expanded="true" aria-controls="menu-anchored" id="menu-anchored-trigger">${ICON.dots.replace('cn-icon', 'cn-icon-button__icon')}</button><div class="cn-menu" data-size="md" role="menu" id="menu-anchored" aria-labelledby="menu-anchored-trigger" data-state="open" data-floating>${item('Rename', 'settings')}${item('Duplicate', 'copy', '⌘D')}${SEP}${item('Delete', 'trash', '', ' data-danger')}</div></div>`, 'Wrap trigger + panel in .cn-menu-anchor; data-floating positions the panel 4px under the trigger. Add data-align="end" to right-align, data-side="top" to flip.'),
  ],
  rules: [
    'Max 7 items per group and about 12 in total. Beyond that, the object has too many actions; move rare ones into a dialog or a settings page.',
    'Items are verbs in sentence case ("Duplicate", "Move to…"); "…" when the item opens a dialog. Options (sort, show) are nouns with checks.',
    'Items are 36px (sm 32) with 14px medium text; icons 16px fg-subtle, all-or-none within a group; shortcuts 12px on the right only when the key really works.',
    'Destructive actions are last, after a separator, marked data-danger, and always confirm.',
    'The panel is 248px wide (or wider to fit the trigger when the trigger is a full-width control); never narrower.',
    'Position with .cn-menu-anchor + data-floating (4px below the trigger, aligned to its start; data-align="end" to align to its end, data-side="top" to flip). One open menu at a time.',
    'The account header is the only place for an avatar label group inside a menu; items use 20px avatars.',
    'No submenus deeper than one level; the chevron item opens a second panel to the side.',
    'Disabled items stay visible with aria-disabled and explain themselves in a Tooltip; hiding them makes the menu feel unstable.',
    'The panel styles only; put backdrop, focus trap and scroll lock in the app layer, never in the component.',
  ],
  a11y: [
    'Root has role="menu" and aria-labelledby pointing at the trigger (or aria-label). The trigger has aria-haspopup="menu", aria-expanded and aria-controls.',
    'Items are role="menuitem", "menuitemcheckbox" or "menuitemradio" with aria-checked; groups are role="group" with aria-labelledby; separators are role="separator".',
    'Keyboard: Down/Up move highlight (wrapping), Home/End jump, Enter/Space activate, Right opens a submenu, Esc closes and returns focus to the trigger, typing jumps to a matching item.',
    'Only one item is tabbable (roving tabindex); highlight is set with data-highlighted and reflected by aria-activedescendant or focus.',
    'Disabled items use aria-disabled="true" and remain focusable so they can be announced; never the disabled attribute.',
    'Avatars inside items are decorative (alt=""); the text names the person.',
  ],
  related: ['icon-button', 'button-group', 'command-palette', 'popover', 'select', 'avatar'],
};
