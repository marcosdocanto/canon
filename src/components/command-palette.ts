import type { ComponentSpec } from '../types.ts';
import { STATE, ex, ICON, typeStyle } from './_shared.ts';

// the reference command menu: a 640px surface (radius 16, shadow-xl), a 56px search row, groups
// with 12px medium gray-500 labels, 40px options (14px medium, 16px gray-400 icon, radius 6,
// gray-50 when highlighted) or 64px stacked user rows with a 40px avatar, kbd chips for
// shortcuts, and a 52px footer legend on a hairline.

const TRANSITION_FAST = {
  'transition-property': 'background-color, color, box-shadow',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-command-palette__item-icon');
const SEARCH = ICON.search.replace('cn-icon', 'cn-command-palette__icon');
const key = (k: string) => `<kbd class="cn-command-palette__key">${k}</kbd>`;
const item = (id: string, label: string, i: keyof typeof ICON, meta = '', shortcut = '', attrs = '') =>
  `<div role="option" id="${id}" class="cn-command-palette__item" aria-selected="${attrs.includes('data-highlighted') ? 'true' : 'false'}"${attrs}>${icon(i)}<span class="cn-command-palette__item-label">${label}</span>${meta ? `<span class="cn-command-palette__item-meta">${meta}</span>` : ''}${shortcut ? shortcut.split(' ').map((s) => `<kbd class="cn-command-palette__item-shortcut">${s}</kbd>`).join('') : ''}</div>`;
const person = (id: string, initials: string, name: string, handle: string, status: 'online' | 'offline', attrs = '', size = 'md') =>
  `<div role="option" id="${id}" class="cn-command-palette__item" aria-selected="${attrs.includes('data-highlighted') ? 'true' : 'false'}"${attrs}><span class="cn-command-palette__item-avatar cn-avatar" data-size="${size}" data-shape="circle" data-tone="neutral" data-status="${status}" aria-hidden="true"><span class="cn-avatar__fallback">${initials}</span><span class="cn-avatar__status"></span></span><span class="cn-command-palette__item-text"><span class="cn-command-palette__item-label">${name}</span><span class="cn-command-palette__item-meta">${handle}</span></span></div>`;
const groupLabel = (id: string, text: string) => `<div class="cn-command-palette__group-label" id="${id}" role="presentation">${text}</div>`;
const group = (id: string, text: string, items: string) => `<div class="cn-command-palette__group" role="group" aria-labelledby="${id}">${groupLabel(id, text)}${items}</div>`;
const FOOTER = `<footer class="cn-command-palette__footer"><span>${key('↑')}${key('↓')}to navigate</span><span>${key('↵')}to select</span><span>${key('esc')}to close</span></footer>`;
const search = (value: string, active: string, listId = 'cp-list') =>
  `<div class="cn-command-palette__search">${SEARCH}<input class="cn-command-palette__input" type="text" role="combobox" aria-expanded="true" aria-controls="${listId}" aria-activedescendant="${active}" aria-autocomplete="list" aria-label="Search people, pages and commands" placeholder="Search…" value="${value}" autocomplete="off" spellcheck="false">${key('⌘K')}</div>`;
const panel = (variant: string, inner: string) => `<div class="cn-command-palette" data-variant="${variant}" role="dialog" aria-modal="true" aria-label="Command menu" data-state="open">${inner}</div>`;

export const commandPalette: ComponentSpec = {
  name: 'CommandPalette',
  slug: 'command-palette',
  category: 'overlays',
  description: 'The ⌘K menu of the reference: a 640px raised surface with a 56px search row on top, grouped results (40px options, or 64px stacked people rows with avatars) in the middle and a 52px key legend at the bottom. Styles the panel only; the fixed backdrop is a separate layer.',
  usage: 'Use as the one global launcher of the app: jump to any record, person or page and run any command by typing. Opened with ⌘K / Ctrl+K from anywhere and from the search field in the Topbar or Sidebar. Not a replacement for a page\'s search Input, not a Menu (no typing) and not a Select.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The panel: role="dialog" aria-modal, 640px wide (max 100%), bg-surface-raised, hairline ring, radius 16, shadow-xl. data-state="open|closed".' },
    { part: 'search', element: 'div', description: 'The 56px search row with a hairline below: 20px search icon, bare input, ⌘K key chip.' },
    { part: 'icon', element: 'svg', description: '20px search icon, fg-subtle, leading the input. Decorative.' },
    { part: 'input', element: 'input', description: 'The bare text field, 16px, no border. role="combobox" controlling the list, aria-activedescendant pointing at the highlighted option.' },
    { part: 'list', element: 'div', description: 'role="listbox": scrolling results (max 360px), 8px padding, groups of options.' },
    { part: 'group', element: 'div', description: 'role="group" with aria-labelledby its label.', optional: true },
    { part: 'group-label', element: 'div', description: 'Group heading in 12px medium fg-subtle, padding 8 × 8 (4 below): "Recent", "People", "Commands".', optional: true },
    { part: 'item', element: 'div', description: 'role="option": a 40px row (64px in stacked), radius 6, padding 8 × 8, 14px medium; gray-50 when highlighted. Holds icon or avatar + label + optional meta + optional shortcut.' },
    { part: 'item-icon', element: 'svg', description: '16px leading icon, fg-subtle: what kind of thing this is (person, page, command).', optional: true },
    { part: 'item-avatar', element: 'span', description: 'A 32px Avatar (40px in stacked) in the leading slot of people rows, with its status dot.', optional: true },
    { part: 'item-text', element: 'span', description: 'Column of label + meta for stacked rows.', optional: true },
    { part: 'item-label', element: 'span', description: 'The name of the thing or the command, 14px medium fg-default. Fills the row and truncates.' },
    { part: 'item-meta', element: 'span', description: '14px fg-muted context after (or under) the label: "@maya", "Settings".', optional: true },
    { part: 'item-shortcut', element: 'kbd', description: 'Key chip (12px medium fg-subtle, radius 4, gray-200 ring, padding 1 × 4) showing the global shortcut of a command; one chip per key.', optional: true },
    { part: 'empty', element: 'div', description: 'Centered muted message shown instead of the list when nothing matches; echoes the query.', optional: true },
    { part: 'footer', element: 'footer', description: '52px legend on a hairline: ↑↓ to navigate · ↵ to select · esc to close.' },
    { part: 'key', element: 'kbd', description: 'One key chip in the search row or footer: 12px medium fg-subtle on bg-surface with a gray-200 ring.' },
  ],
  props: {
    variant: {
      values: ['default', 'stacked'],
      default: 'default',
      description: 'default = 40px rows with the meta after the label (commands, pages, quick jumps). stacked = 64px rows with a 40px avatar and the meta under the label (people and records with two lines).',
    },
  },
  states: {
    open: STATE.open(),
    closed: { selector: '[data-state="closed"]', description: 'Hidden. The panel is display: none; the backdrop layer is removed by the app.', markup: 'data-state="closed"' },
    highlighted: { selector: ' .cn-command-palette__item[data-highlighted]', description: 'The option the arrow keys are on (on the ITEM): gray-50 fill, darker icon. Exactly one, the first result by default.', markup: 'data-highlighted on the option' },
    selected: { selector: ' .cn-command-palette__item[aria-selected="true"]', description: 'The option referenced by aria-activedescendant; same look as highlighted so pointer and keyboard agree.', markup: 'aria-selected="true" on the option' },
    disabled: { selector: ' .cn-command-palette__item[aria-disabled="true"]', description: 'A command not available in this context: 50% opacity, no hover; still listed so it can be discovered.', markup: 'aria-disabled="true" on the option' },
  },
  base: {
    root: {
      display: 'flex',
      'flex-direction': 'column',
      width: '{size.container.sm}',
      'max-width': '100%',
      'background-color': '{color.bg-surface-raised}',
      'border-radius': '{radius.overlay}',
      'box-shadow': `${ring('{color.border-default}')}, {shadow.xl}`,
      overflow: 'hidden',
      color: '{color.fg-default}',
    },
    search: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.3}',
      height: '{space.14}',
      'padding-inline': '{space.5}',
      'border-bottom': HAIRLINE,
      'flex-shrink': '0',
    },
    icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', color: '{color.fg-subtle}' },
    input: {
      flex: '1 1 auto',
      'min-width': '0',
      height: '100%',
      border: '0',
      outline: 'none',
      background: 'transparent',
      padding: '0',
      ...typeStyle('body-lg'),
      color: '{color.fg-default}',
    },
    list: {
      'max-height': 'calc({space.64} + {space.24} + {space.2})',
      'overflow-y': 'auto',
      'overscroll-behavior': 'contain',
      padding: '{space.2}',
    },
    group: { display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}' },
    'group-label': {
      ...typeStyle('label-xs'),
      color: '{color.fg-subtle}',
      padding: '{space.2} {space.2} {space.1}',
      'user-select': 'none',
    },
    item: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.2}',
      height: '{space.10}',
      padding: '{space.2}',
      'border-radius': '{radius.md}',
      ...typeStyle('label-sm'),
      color: '{color.fg-default}',
      cursor: 'pointer',
      'user-select': 'none',
      'white-space': 'nowrap',
      outline: 'none',
      ...TRANSITION_FAST,
    },
    'item-icon': { width: '{size.icon.sm}', height: '{size.icon.sm}', 'flex-shrink': '0', color: '{color.fg-subtle}', transition: 'inherit' },
    'item-avatar': { 'flex-shrink': '0' },
    'item-text': { display: 'flex', 'flex-direction': 'column', flex: '1 1 auto', 'min-width': '0' },
    'item-label': { flex: '1 1 auto', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', ...typeStyle('label-sm'), color: '{color.fg-default}' },
    'item-meta': { ...typeStyle('body-md'), color: '{color.fg-muted}', 'flex-shrink': '0', overflow: 'hidden', 'text-overflow': 'ellipsis' },
    'item-shortcut': {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'min-width': '{space.5}',
      padding: '{space.px} {space.1}',
      'border-radius': '{radius.sm}',
      'background-color': '{color.bg-surface}',
      'box-shadow': ring('{color.border-default}'),
      ...typeStyle('label-xs'),
      color: '{color.fg-subtle}',
      'flex-shrink': '0',
    },
    empty: {
      padding: '{space.10} {space.6}',
      'text-align': 'center',
      ...typeStyle('body-md'),
      color: '{color.fg-muted}',
    },
    footer: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.4}',
      height: 'calc({space.12} + {space.1})',
      'padding-inline': '{space.5}',
      'background-color': '{color.bg-surface}',
      'border-top': HAIRLINE,
      ...typeStyle('body-sm'),
      color: '{color.fg-muted}',
      'flex-shrink': '0',
      'user-select': 'none',
    },
    key: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'min-width': '{space.5}',
      padding: '{space.px} {space.1}',
      'border-radius': '{radius.sm}',
      'background-color': '{color.bg-surface}',
      'box-shadow': ring('{color.border-default}'),
      ...typeStyle('label-xs'),
      color: '{color.fg-subtle}',
      'margin-inline-end': '{space.1}',
      'vertical-align': 'middle',
      'flex-shrink': '0',
    },
    '@states': {
      open: { root: { display: 'flex' } },
      closed: { root: { display: 'none' } },
    },
  },
  variants: {
    variant: {
      default: { root: {} },
      stacked: { item: { height: '{space.16}', gap: '{space.3}', padding: '{space.3} {space.2}' } },
    },
  },
  extraCss: `
.cn-command-palette__input::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-command-palette__search .cn-command-palette__key { margin-inline-end: 0; }
.cn-command-palette__item[data-highlighted], .cn-command-palette__item[aria-selected="true"], .cn-command-palette__item:hover:not([aria-disabled="true"]) { background-color: {color.bg-subtle}; }
.cn-command-palette__item[data-highlighted] .cn-command-palette__item-icon, .cn-command-palette__item[aria-selected="true"] .cn-command-palette__item-icon { color: {color.fg-muted}; }
.cn-command-palette__item:focus-visible { box-shadow: inset 0 0 0 2px {brand.500}; }
.cn-command-palette__item[aria-disabled="true"] { opacity: {opacity.disabled}; cursor: not-allowed; }
.cn-command-palette__item > .cn-command-palette__item-shortcut:first-of-type { margin-inline-start: auto; }
.cn-command-palette__item-text .cn-command-palette__item-meta { flex-shrink: 1; }
.cn-command-palette__footer > span { display: inline-flex; align-items: center; gap: {space.0.5}; }
.cn-command-palette__footer > span + span { margin-inline-start: {space.2}; }
.cn-command-palette-backdrop { position: fixed; inset: 0; z-index: {z.overlay}; display: flex; align-items: flex-start; justify-content: center; padding: 15vh {space.4} {space.4}; background-color: {color.bg-overlay}; backdrop-filter: blur(6px); }`,
  examples: [
    ex('Actions', panel('default', `${search('', 'cp-a1')}<div class="cn-command-palette__list" role="listbox" id="cp-list" aria-label="Suggestions">${group('cp-g-recent', 'Recent', item('cp-a1', 'Lumen website redesign', 'copy', 'Project', '', ' data-highlighted') + item('cp-a2', 'Q3 invoices', 'inbox', 'Folder'))}${group('cp-g-goto', 'Go to', item('cp-a3', 'Dashboard', 'home', '', 'G H') + item('cp-a4', 'Calendar', 'calendar', '', 'G C') + item('cp-a5', 'Settings', 'settings', '', 'G S'))}${group('cp-g-cmd', 'Commands', item('cp-a6', 'New project', 'plus', '', '⌘ N') + item('cp-a7', 'Invite teammate', 'user', '', '⌘ I') + item('cp-a8', 'Import CSV', 'inbox', 'Business plan', '', ' aria-disabled="true"'))}</div>${FOOTER}`), 'Before typing: recent things, navigation with G-prefixed shortcuts, then commands. The first option is highlighted; a disabled command stays listed.'),
    ex('People (stacked)', panel('stacked', `${search('so', 'cp-p1', 'cp-list-p')}<div class="cn-command-palette__list" role="listbox" id="cp-list-p" aria-label="People">${group('cp-g-people', 'People', person('cp-p1', 'SA', 'Sofia Almeida', '@sofia · Design', 'online', ' data-highlighted') + person('cp-p2', 'TS', 'Tomás Silva', '@tomas · Engineering', 'offline') + person('cp-p3', 'NB', 'Noah Berg', '@noah · Product design', 'online'))}</div>${FOOTER}`), 'data-variant="stacked": 64px rows with a 40px Avatar, the name over the handle.'),
    ex('Results for a query', panel('default', `${search('inv', 'cp-r1', 'cp-list-r')}<div class="cn-command-palette__list" role="listbox" id="cp-list-r" aria-label="Results">${group('cp-g-res', 'Results', item('cp-r1', 'INV-0042 · Aisha Khan', 'inbox', 'Invoice', '', ' data-highlighted') + item('cp-r2', 'Invoices', 'copy', 'Page'))}${group('cp-g-act', 'Actions', item('cp-r3', 'Create invoice “inv”', 'plus', '', '⌘ N') + item('cp-r4', 'Search files for “inv”', 'search'))}</div>${FOOTER}`), 'Matching records first, then actions built from the query.'),
    ex('Empty (nothing matches)', panel('default', `${search('zzzq', '', 'cp-list-e')}<div class="cn-command-palette__empty" role="status">No results for “zzzq”. Try a person, a page or a command.</div>${FOOTER}`), 'The query is echoed back; the footer stays.'),
  ],
  rules: [
    'One palette per app, opened with ⌘K / Ctrl+K from anywhere and from the search field in the Topbar or Sidebar. It is the only global launcher.',
    'The panel is 640px wide with a 56px search row; options are 40px (stacked 64px) with 14px medium labels, 16px icons or 32 / 40px avatars, radius 6.',
    'The placeholder is short ("Search…") and the search row carries the ⌘K chip so people learn the shortcut.',
    'Group order is fixed: matching records first, then people, then navigation ("Go to"), then commands. Max 4 groups visible, 5–7 options each; the rest is reachable by typing.',
    'The first option is always highlighted so ↵ does something immediately. Highlight follows the pointer and the arrow keys, never both at once.',
    'Always render an empty state that echoes the query and suggests what to type; never an empty list.',
    'The footer legend is always visible; shortcuts on options appear only when they work globally, one key chip per key.',
    'Labels are the name of the thing (record title, page title, command verb); meta says what and where it is. No descriptions longer than a few words.',
    'Render inside .cn-command-palette-backdrop: fixed, overlay z-index, 6px blur, panel top-aligned at 15vh; never vertically centered.',
    'The panel is the component; open/close, focus trap, filtering and scroll lock live in the app layer.',
  ],
  a11y: [
    'Root is role="dialog" aria-modal="true" with an aria-label; opening moves focus into the input, closing returns it to where the user was.',
    'The input is role="combobox" with aria-expanded, aria-controls (the listbox), aria-autocomplete="list" and aria-activedescendant pointing at the highlighted option.',
    'The list is role="listbox"; groups are role="group" aria-labelledby their label; options are role="option" with aria-selected on the highlighted one.',
    'Keyboard: ↑/↓ move the highlight (wrapping across groups), ↵ runs the option, Esc closes, typing filters; focus stays in the input the whole time.',
    'Announce result counts with an aria-live="polite" region ("4 results") and use role="status" on the empty state.',
    'Avatars in people rows are decorative (aria-hidden); the label names the person and the meta carries the status in words when it matters.',
    'Key chips are read naturally ("↑ ↓ to navigate"); do not rely on glyphs alone for commands with shortcuts.',
  ],
  related: ['menu', 'input', 'dialog', 'topbar', 'kbd', 'avatar'],
};
