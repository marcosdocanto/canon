import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Tree view: nested rows (36px md / 32px sm) with a rotating chevron, a 20px
// folder or file icon, a label and an optional count, groups indented by 24px
// with an optional 1px guide line, and an optional checkbox per row.

const FOLDER = '<svg class="cn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.75 5.5A1.5 1.5 0 014.25 4h3.5l2 2h6a1.5 1.5 0 011.5 1.5v7A1.5 1.5 0 0115.75 16h-11.5a1.5 1.5 0 01-1.5-1.5v-9z"/></svg>';
const FILE = '<svg class="cn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.25 3h6.5l3.5 3.5V16a1 1 0 01-1 1h-9a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M11.5 3v4h4"/></svg>';
const CHECK = ICON.check.replace('cn-icon', 'cn-checkbox__indicator');

const checkbox = (label: string, checked: boolean, indeterminate = false) =>
  `<label class="cn-checkbox" data-size="sm"${indeterminate ? ' data-indeterminate' : ''}><input class="cn-checkbox__input" type="checkbox" aria-label="Select ${label}"${checked ? ' checked' : ''}><span class="cn-checkbox__control" aria-hidden="true">${CHECK}</span></label>`;

const node = (o: { label: string; level: number; kind: 'folder' | 'file'; expanded?: boolean; selected?: boolean; badge?: string; children?: string; check?: 'on' | 'off' | 'mixed'; disabled?: boolean }) =>
  `<li role="none"><div class="cn-tree-view__item" role="treeitem" aria-level="${o.level}"${o.expanded !== undefined ? ` aria-expanded="${o.expanded}"` : ''} aria-selected="${o.selected ? 'true' : 'false'}"${o.disabled ? ' aria-disabled="true"' : ''} tabindex="${o.selected ? '0' : '-1'}"><span class="cn-tree-view__toggle" aria-hidden="true">${ICON.chevronRight}</span>${o.check ? checkbox(o.label, o.check === 'on', o.check === 'mixed') : ''}<span class="cn-tree-view__icon">${o.kind === 'folder' ? FOLDER : FILE}</span><span class="cn-tree-view__label">${o.label}</span>${o.badge ? `<span class="cn-tree-view__badge">${o.badge}</span>` : ''}</div>${o.children ? `<ul class="cn-tree-view__group" role="group">${o.children}</ul>` : ''}</li>`;

const tree = (size: string, variant: string, inner: string, width = '320px') =>
  `<ul class="cn-tree-view" data-size="${size}" data-variant="${variant}" role="tree" aria-label="Lumen workspace files" style="width:100%;max-width:${width}">${inner}</ul>`;

const WORKSPACE = (check = false) => node({
  label: 'Lumen workspace', level: 1, kind: 'folder', expanded: true, check: check ? 'mixed' : undefined,
  children:
    node({ label: 'Brand', level: 2, kind: 'folder', expanded: true, check: check ? 'on' : undefined, children: node({ label: 'lumen-logo.svg', level: 3, kind: 'file', check: check ? 'on' : undefined }) + node({ label: 'brand-guidelines.pdf', level: 3, kind: 'file', check: check ? 'on' : undefined }) }) +
    node({ label: 'Marketing', level: 2, kind: 'folder', expanded: true, check: check ? 'off' : undefined, children: node({ label: 'Q3 campaign', level: 3, kind: 'folder', expanded: true, badge: '2', check: check ? 'off' : undefined, children: node({ label: 'landing-page.fig', level: 4, kind: 'file', selected: !check, check: check ? 'off' : undefined }) + node({ label: 'copy-deck.docx', level: 4, kind: 'file', check: check ? 'off' : undefined }) }) }) +
    node({ label: 'Finance', level: 2, kind: 'folder', expanded: false, badge: '24', check: check ? 'off' : undefined }),
});

export const treeView: ComponentSpec = {
  name: 'TreeView',
  slug: 'tree-view',
  category: 'data-display',
  description: 'A hierarchy of rows that expand and collapse: a chevron that rotates when open, a 20px folder or file icon, the label and an optional count, with nested groups indented 24px and an optional guide line. Rows are 36px (32px small), hover in bg-subtle, the selected row keeps the fill with a semibold label.',
  usage: 'Use for file systems, folder structures, nested categories and org charts where depth matters and people open branches on demand. For a flat list use List; for navigation with two levels use SidebarNav; for a table with expandable rows use Table.',
  anatomy: [
    { part: 'root', element: 'ul', description: 'The tree (role="tree", aria-label). A list; nested groups are <ul role="group"> after their parent row inside a <li role="none">.' },
    { part: 'item', element: 'div', description: 'One row (role="treeitem", aria-level, aria-expanded when it has children, aria-selected, roving tabindex). 36px tall, 8px horizontal padding, radius md, body-md.' },
    { part: 'toggle', element: 'span', description: '16px chevron on the left; rotates 90° when the row is aria-expanded="true"; invisible on leaf rows so labels stay aligned. aria-hidden.' },
    { part: 'icon', element: 'span', description: '20px folder or file icon in fg-muted.' },
    { part: 'label', element: 'span', description: 'The name, truncated with an ellipsis; semibold when the row is selected.' },
    { part: 'badge', element: 'span', description: 'Optional count pill at the end of the row (children, unread), label-xs in bg-subtle.', optional: true },
    { part: 'group', element: 'ul', description: 'The nested list of children (role="group"), indented by 24px; in the with-lines variant it draws a 1px guide under the parent chevron.', optional: true },
  ],
  props: {
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 36px rows with body-md text and 20px icons (file browsers, settings trees). sm = 32px rows with body-sm text and 16px icons for side panels and pickers.',
    },
    variant: {
      values: ['default', 'with-lines', 'with-checkbox'],
      default: 'default',
      description: 'default = indentation only. with-lines = a 1px guide line under each open parent so deep trees stay readable. with-checkbox = a sm Checkbox before the icon on every row for multi-select (moving files, choosing folders to sync); parents show indeterminate when only some children are checked.',
    },
  },
  states: {
    hover: { selector: ' .cn-tree-view__item:hover', description: 'Pointer over a row (on the item; extraCss): bg-subtle fill.', markup: 'native :hover on .cn-tree-view__item' },
    selected: { selector: ' .cn-tree-view__item[aria-selected="true"]', description: 'The chosen row (on the item; extraCss): bg-subtle fill, ink text, semibold label, ink icon.', markup: 'aria-selected="true" on .cn-tree-view__item' },
    expanded: { selector: ' .cn-tree-view__item[aria-expanded="true"]', description: 'An open parent (on the item; extraCss): the chevron rotates 90°. aria-expanded="false" hides the following group.', markup: 'aria-expanded="true|false" on .cn-tree-view__item' },
    focus: { selector: ' .cn-tree-view__item:focus-visible', description: 'Keyboard focus on a row shows the 3px ring (extraCss).', markup: 'native :focus-visible on .cn-tree-view__item' },
    disabled: { selector: ' .cn-tree-view__item[aria-disabled="true"]', description: 'A row that cannot be chosen (no permission): disabled text, no hover (extraCss).', markup: 'aria-disabled="true" on .cn-tree-view__item' },
  },
  base: {
    root: { display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}', width: '100%', 'min-width': '0', margin: '0', padding: '0', 'list-style': 'none', color: '{color.fg-default}' },
    item: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.2}',
      height: '{size.control.md}',
      'padding-inline': '{space.2}',
      'border-radius': '{radius.md}',
      ...typeStyle('body-md'),
      color: '{color.fg-default}',
      cursor: 'pointer',
      'user-select': 'none',
      'min-width': '0',
      outline: 'none',
      ...TRANSITION_COLORS,
    },
    toggle: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.md}',
      height: '{size.icon.md}',
      color: '{color.fg-subtle}',
      'transition-property': 'transform',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.standard}',
    },
    icon: { display: 'inline-flex', 'flex-shrink': '0', width: '{size.icon.lg}', height: '{size.icon.lg}', color: '{color.fg-muted}' },
    label: { flex: '1 1 auto', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    badge: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      height: '18px',
      'min-width': '18px',
      'padding-inline': '{space.1.5}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-subtle}',
      ...typeStyle('label-xs'),
      color: '{color.fg-subtle}',
      'font-variant-numeric': 'tabular-nums',
    },
    group: { position: 'relative', display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}', margin: '0', padding: '0', 'padding-inline-start': '{space.6}', 'list-style': 'none', 'min-width': '0' },
  },
  variants: {
    size: {
      sm: {
        item: { height: '{size.control.sm}', gap: '{space.1.5}', ...typeStyle('body-sm') },
        icon: { width: '{size.icon.md}', height: '{size.icon.md}' },
        badge: { height: '16px', 'min-width': '16px', 'font-size': '{font.size.2xs}', 'padding-inline': '{space.1}' },
        group: { 'padding-inline-start': '{space.5}' },
      },
      md: { root: {} },
    },
    variant: {
      default: { root: {} },
      'with-lines': { root: {} },
      'with-checkbox': { root: {} },
    },
  },
  extraCss: `
.cn-tree-view li { list-style: none; margin: 0; padding: 0; min-width: 0; }
.cn-tree-view__toggle .cn-icon, .cn-tree-view__icon .cn-icon { width: 100%; height: 100%; }
.cn-tree-view__item:hover:not([aria-disabled="true"]) { background-color: {color.bg-subtle}; }
.cn-tree-view__item:focus-visible { box-shadow: ${FOCUS_RING['box-shadow']}; position: relative; z-index: {z.raised}; }
.cn-tree-view__item[aria-selected="true"] { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-tree-view__item[aria-selected="true"] .cn-tree-view__label { font-weight: {font.weight.semibold}; }
.cn-tree-view__item[aria-selected="true"] .cn-tree-view__icon { color: {color.fg-default}; }
.cn-tree-view__item[aria-expanded="true"] .cn-tree-view__toggle { transform: rotate(90deg); }
.cn-tree-view__item:not([aria-expanded]) .cn-tree-view__toggle { visibility: hidden; }
.cn-tree-view__item[aria-expanded="false"] + .cn-tree-view__group { display: none; }
.cn-tree-view__item[aria-disabled="true"] { color: {color.fg-disabled}; cursor: not-allowed; }
.cn-tree-view__item[aria-disabled="true"] .cn-tree-view__icon { color: {color.fg-disabled}; }
.cn-tree-view[data-variant="with-lines"] .cn-tree-view__group::before { content: ''; position: absolute; top: 0; bottom: 0; inset-inline-start: calc({space.2} + {size.icon.md} / 2); width: {border.width.thin}; background-color: {color.border-default}; }
.cn-tree-view[data-variant="with-checkbox"] .cn-tree-view__item .cn-checkbox { flex-shrink: 0; }
.cn-tree-view[data-variant="with-checkbox"] .cn-tree-view__item .cn-checkbox__control { margin-top: 0; }
.cn-tree-view[data-variant="with-checkbox"] .cn-tree-view__item .cn-checkbox__input { top: 0; }`,
  examples: [
    ex('Three levels, one selected', tree('md', 'default', WORKSPACE()), 'Open folders rotate the chevron; the leaf rows hide it. "landing-page.fig" is selected; "Finance" is collapsed with a count.'),
    ex('With guide lines, small', tree('sm', 'with-lines', WORKSPACE(), '280px'), '32px rows and a 1px guide under every open parent.'),
    ex('With checkboxes (multi-select)', tree('md', 'with-checkbox', WORKSPACE(true), '360px'), 'The parent of a partially checked branch is indeterminate; checking a parent checks all of its children.'),
    ex('Disabled row', tree('md', 'default', node({ label: 'Shared with me', level: 1, kind: 'folder', expanded: true, selected: true, children: node({ label: 'Board deck (view only)', level: 2, kind: 'file' }) + node({ label: 'Legal', level: 2, kind: 'folder', disabled: true, badge: '3' }) }), '280px'), 'aria-disabled rows stay visible with a disabled color and no hover.'),
  ],
  rules: [
    'Rows show one name each, truncated with an ellipsis; the full name lives in a title or Tooltip. Never wrap a row onto two lines.',
    'Folders before files, both alphabetical, unless the user chose another sort. Do not mix sort orders between levels.',
    'Only parents get a chevron; leaves keep an invisible 16px slot so all labels at one level align.',
    'Exactly one selected row in single-select trees; the selected row is the one whose content is shown next to the tree.',
    'Counts in the badge are for children or unread items and update live; never use the badge for status words.',
    'Use with-lines when trees go deeper than three levels; at two levels the indentation is enough.',
    'with-checkbox is for choosing many nodes at once (move, sync, export); the row click still selects, only the box toggles.',
    'Deep trees (more than five levels) are a design smell: flatten with breadcrumbs or a search instead.',
    'sm inside side panels and pickers; md in a file browser or settings page where the tree is the main content.',
  ],
  a11y: [
    'Root has role="tree" and an aria-label; rows are role="treeitem" with aria-level, aria-expanded on parents and aria-selected; child lists are role="group" placed right after their parent row. Add aria-owns on the parent when your framework needs explicit ownership.',
    'Roving tabindex: one row is tabbable; Up/Down move, Right expands or moves into children, Left collapses or moves to the parent, Home/End jump, Enter activates, typing jumps to a matching name.',
    'The chevron and icons are aria-hidden; the label is the accessible name. Counts are read as text after the name.',
    'In with-checkbox each Checkbox has an aria-label "Select {name}"; Space toggles the box while the row keeps its own selection.',
    'Selection and hover are conveyed by fill and weight, never by color alone; the disabled state uses aria-disabled so the row is still announced.',
  ],
  related: ['list', 'sidebar-nav', 'checkbox', 'accordion', 'table'],
};
