import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Filter bar: the row above a table or list that holds search, dropdown filter
// buttons, a date range, sort, a list/grid view toggle, the result count and the
// active-filter chips. Everything inside is an existing control; this component
// only lays them out and styles the chips and the view toggle.

const SVG = {
  grid: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/></svg>',
  filter: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/></svg>',
  sort: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3v10M5 13l-2-2M5 13l2-2M11 13V3M11 3L9 5M11 3l2 2"/></svg>',
};

const bi = (name: keyof typeof ICON | 'grid' | 'filter' | 'sort') => (name in ICON ? ICON[name as keyof typeof ICON] : SVG[name as keyof typeof SVG]).replace('cn-icon', 'cn-button__icon');
const btn = (label: string, variant = 'outline', leading = '', trailing = '', size = 'sm') =>
  `<button type="button" class="cn-button" data-variant="${variant}" data-size="${size}">${leading}<span class="cn-button__label">${label}</span>${trailing}</button>`;
const dropdown = (label: string) => btn(label, 'outline', '', bi('chevronDown')).replace('class="cn-button"', 'class="cn-button" aria-haspopup="menu" aria-expanded="false"');

const SEARCH = `<div class="cn-filter-bar__search"><div class="cn-input" data-variant="default" data-size="sm">${ICON.search.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="search" placeholder="Search customers…" aria-label="Search customers"></div></div>`;
const chip = (key: string, value: string) =>
  `<span class="cn-filter-bar__chip"><span class="cn-filter-bar__chip-key">${key}:</span>${value}<button type="button" class="cn-filter-bar__chip-remove" aria-label="Remove filter ${key}: ${value}">${ICON.x}</button></span>`;
const VIEW = `<div class="cn-filter-bar__view" role="group" aria-label="Layout"><button type="button" class="cn-filter-bar__view-item" aria-pressed="true" aria-label="List view">${ICON.menu}</button><button type="button" class="cn-filter-bar__view-item" aria-pressed="false" aria-label="Grid view">${SVG.grid}</button></div>`;
const count = (n: string) => `<span class="cn-filter-bar__count" aria-live="polite">${n}</span>`;
const CLEAR = `<div class="cn-filter-bar__clear">${btn('Clear filters', 'link')}</div>`;
const DATE = `<div class="cn-filter-bar__date">${btn('Sep 1 – Sep 11, 2026', 'outline', bi('calendar'), bi('chevronDown')).replace('class="cn-button"', 'class="cn-button" aria-haspopup="dialog" aria-expanded="false"')}</div>`;
const SORT = `<div class="cn-filter-bar__sort">${btn('Sort: Newest', 'outline', bi('sort'), bi('chevronDown')).replace('class="cn-button"', 'class="cn-button" aria-haspopup="menu" aria-expanded="false"')}</div>`;

const tab = (label: string, selected: boolean, id: string, extra = '') =>
  `<button type="button" role="tab" class="cn-tabs__tab" id="fb-tab-${id}" aria-selected="${selected}" tabindex="${selected ? '0' : '-1'}">${label}${extra}</button>`;

const bar = (variant: string, align: string, inner: string) =>
  `<div class="cn-filter-bar" data-variant="${variant}" data-align="${align}" role="search" aria-label="Filter customers" style="width:100%">${inner}</div>`;

export const filterBar: ComponentSpec = {
  name: 'FilterBar',
  slug: 'filter-bar',
  category: 'forms',
  description: 'The toolbar above a table or list: a 320px search, dropdown filter buttons with chevrons, a date-range button, sort, a list/grid toggle, the result count, and a wrapping row of active-filter chips with an × each. Composes Input, Button and Tabs; adds only the chips and the view toggle.',
  usage: 'Use above any collection view (customers, invoices, files) that can be searched, filtered or re-sorted. Not for form fields (Field), not for page-level tabs (Tabs on their own), and not inside a Card header (put a single search Input there).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The bar: flex row that wraps, 12px gaps, role="search" or a labelled toolbar. Width comes from the layout.' },
    { part: 'search', element: 'div', description: 'Wrapper for a sm Input with a leading search icon; 320px wide, shrinks to 200px.', optional: true },
    { part: 'group', element: 'div', description: 'A cluster of outline sm Buttons with trailing chevrons that open filter menus (Status, Plan, Owner).', optional: true },
    { part: 'chips', element: 'div', description: 'The wrapping row of active filters. Takes the full width so it sits under the controls.', optional: true },
    { part: 'chip', element: 'span', description: 'One active filter: 28px pill with a hairline, "Key: value" and a 16px × remove button.', optional: true },
    { part: 'chip-key', element: 'span', description: 'The muted "Status:" prefix inside a chip.', optional: true },
    { part: 'chip-remove', element: 'button', description: 'The 16px × that removes this filter. aria-label "Remove filter Status: Active".', optional: true },
    { part: 'date', element: 'div', description: 'Wrapper for the date-range button: outline sm Button with a leading calendar icon and a trailing chevron that opens a DatePicker.', optional: true },
    { part: 'sort', element: 'div', description: 'Wrapper for the sort control: an outline sm Button ("Sort: Newest") that opens a Menu of radio items.', optional: true },
    { part: 'view', element: 'div', description: 'The list/grid toggle: a hairline box of 32px icon buttons, role="group".', optional: true },
    { part: 'view-item', element: 'button', description: 'One icon button inside the view toggle; aria-pressed="true" on the active layout, aria-label naming it.', optional: true },
    { part: 'count', element: 'span', description: 'The result count in body-sm muted ("128 results"), aria-live so filtering announces the new number.', optional: true },
    { part: 'clear', element: 'div', description: 'Wrapper for the link sm "Clear filters" Button. Only rendered when at least one filter is active.', optional: true },
    { part: 'tabs', element: 'div', description: 'Wrapper for a Tabs component (underline for segments of the collection, pill for quick date ranges).', optional: true },
    { part: 'end', element: 'div', description: 'The trailing cluster (count, sort, view, clear). With align="between" it is pushed to the right edge.', optional: true },
  ],
  props: {
    variant: {
      values: ['simple', 'with-chips', 'with-date', 'with-tabs', 'dense'],
      default: 'simple',
      description: 'simple = search + filter buttons + count (most tables). with-chips = the same plus a second line of active-filter chips with × and a Clear link (when filters persist). with-date = quick-range pill Tabs + a date-range button for time-based data (invoices, analytics). with-tabs = underline Tabs that segment the collection ("All / Active / Trial") with search on the right. dense = 8px gaps and 24px chips for toolbars inside drawers and cards.',
    },
    align: {
      values: ['start', 'between'],
      default: 'start',
      description: 'start = everything flows from the left in one run. between = the end cluster (count, sort, view) is pushed to the right edge, leaving the middle empty. Use between on full-width pages, start inside narrower panels.',
    },
  },
  states: {
    chipRemoveHover: { selector: ' .cn-filter-bar__chip-remove:hover', description: 'Pointer over a chip\'s × (on the button; extraCss): muted fill, ink icon.', markup: 'native :hover on .cn-filter-bar__chip-remove' },
    chipRemoveFocus: { selector: ' .cn-filter-bar__chip-remove:focus-visible', description: 'Keyboard focus on a chip\'s × shows the focus ring (extraCss).', markup: 'native :focus-visible on .cn-filter-bar__chip-remove' },
    viewPressed: { selector: ' .cn-filter-bar__view-item[aria-pressed="true"]', description: 'The active layout in the view toggle (on the item; extraCss): subtle fill, ink icon.', markup: 'aria-pressed="true" on .cn-filter-bar__view-item' },
    viewHover: { selector: ' .cn-filter-bar__view-item:hover', description: 'Pointer over a layout button: subtle fill (extraCss).', markup: 'native :hover on .cn-filter-bar__view-item' },
    viewFocus: { selector: ' .cn-filter-bar__view-item:focus-visible', description: 'Keyboard focus on a layout button: an inset 2px ring (the toggle clips overflow) (extraCss).', markup: 'native :focus-visible on .cn-filter-bar__view-item' },
  },
  base: {
    root: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.3}', width: '100%', 'min-width': '0', color: '{color.fg-default}' },
    search: { flex: '0 1 320px', 'min-width': '200px', 'max-width': '100%' },
    group: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.2}', 'min-width': '0' },
    chips: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.2}', 'flex-basis': '100%', 'min-width': '0' },
    chip: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.1}',
      height: '{space.7}',
      padding: '0 {space.1} 0 {space.2.5}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-control}',
      'border-radius': '{radius.full}',
      'box-shadow': '{shadow.xs}',
      ...typeStyle('label-sm'),
      color: '{color.fg-default}',
      'white-space': 'nowrap',
    },
    'chip-key': { color: '{color.fg-muted}', 'font-weight': '{font.weight.regular}' },
    'chip-remove': {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.4}',
      height: '{space.4}',
      'margin-inline-start': '{space.0.5}',
      'border-radius': '{radius.full}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
    date: { display: 'inline-flex', 'flex-shrink': '0' },
    sort: { display: 'inline-flex', 'flex-shrink': '0' },
    view: {
      display: 'inline-flex',
      'align-items': 'stretch',
      'flex-shrink': '0',
      height: '{size.control.sm}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-control}',
      'border-radius': '{radius.control}',
      'box-shadow': '{shadow.xs}',
      overflow: 'hidden',
    },
    'view-item': {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{size.control.sm}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
    count: { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'white-space': 'nowrap', 'flex-shrink': '0', 'font-variant-numeric': 'tabular-nums' },
    clear: { display: 'inline-flex', 'flex-shrink': '0' },
    tabs: { display: 'flex', 'min-width': '0', flex: '0 1 auto' },
    end: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.3}', 'min-width': '0' },
  },
  variants: {
    variant: {
      simple: { root: {} },
      'with-chips': { root: {} },
      'with-date': { root: {} },
      'with-tabs': { root: {} },
      dense: {
        root: { gap: '{space.2}' },
        search: { flex: '0 1 240px', 'min-width': '160px' },
        chips: { gap: '{space.1.5}' },
        chip: { height: '{space.6}', padding: '0 {space.0.5} 0 {space.2}', ...typeStyle('label-xs') },
        end: { gap: '{space.2}' },
      },
    },
    align: {
      start: { end: { 'margin-inline-start': '0' } },
      between: { end: { 'margin-inline-start': 'auto' } },
    },
  },
  extraCss: `
.cn-filter-bar__chip-remove .cn-icon { width: {size.icon.xs}; height: {size.icon.xs}; stroke-width: 2; }
.cn-filter-bar__chip-remove:hover { background-color: {color.bg-muted}; color: {color.fg-default}; }
.cn-filter-bar__chip-remove:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-filter-bar__view-item + .cn-filter-bar__view-item { border-inline-start: {border.width.thin} solid {color.border-control}; }
.cn-filter-bar__view-item .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-filter-bar__view-item:hover { background-color: {color.bg-subtle}; color: {color.fg-muted}; }
.cn-filter-bar__view-item[aria-pressed="true"] { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-filter-bar__view-item:focus-visible { outline: none; box-shadow: inset 0 0 0 2px {color.ring-focus}; }
.cn-filter-bar__tabs .cn-tabs { max-width: 100%; }`,
  examples: [
    ex('Simple', bar('simple', 'start', `${SEARCH}<div class="cn-filter-bar__group">${dropdown('Status')}${dropdown('Plan')}${dropdown('Owner')}</div><div class="cn-filter-bar__end">${count('128 results')}</div>`), 'Search, three filter menus and the count in one run.'),
    ex('With chips', bar('with-chips', 'between', `${SEARCH}<div class="cn-filter-bar__group">${btn('Filters', 'outline', bi('filter'))}</div><div class="cn-filter-bar__end">${count('37 results')}${SORT}${VIEW}</div><div class="cn-filter-bar__chips">${chip('Status', 'Active')}${chip('Plan', 'Team')}${chip('Owner', 'Maya Chen')}${CLEAR}</div>`), 'Active filters wrap onto a second line as removable chips; Clear filters is a link Button at the end.'),
    ex('With date range', bar('with-date', 'between', `<div class="cn-filter-bar__tabs"><div class="cn-tabs" data-variant="pill" data-size="sm" role="tablist" aria-label="Quick ranges">${tab('12 months', false, '12m')}${tab('30 days', true, '30d')}${tab('7 days', false, '7d')}${tab('24 hours', false, '24h')}</div></div>${DATE}<div class="cn-filter-bar__end">${btn('Filters', 'outline', bi('filter'))}${SORT}</div>`), 'Quick ranges as pill Tabs, a custom range from the calendar button.'),
    ex('With tabs', bar('with-tabs', 'between', `<div class="cn-filter-bar__tabs"><div class="cn-tabs" data-variant="underline" data-size="md" role="tablist" aria-label="Customer segments">${tab('All', true, 'all', '<span class="cn-tabs__count">128</span>')}${tab('Active', false, 'active')}${tab('Trial', false, 'trial', '<span class="cn-tabs__count">9</span>')}${tab('Churned', false, 'churned')}</div></div><div class="cn-filter-bar__end">${SEARCH}${VIEW}</div>`), 'Tabs segment the collection; search and the view toggle sit on the right.'),
    ex('Dense', bar('dense', 'start', `${SEARCH}<div class="cn-filter-bar__group">${dropdown('Type')}${dropdown('Modified')}</div>${count('12 files')}<div class="cn-filter-bar__chips">${chip('Type', 'PDF')}${chip('Modified', 'Last 7 days')}${CLEAR}</div>`), '8px gaps and 24px chips for toolbars inside drawers and cards.'),
  ],
  rules: [
    'Order from left to right: search, filter menus, date range, then the end cluster: count, sort, view toggle. Never put the count first.',
    'Filter buttons are outline sm Buttons with a trailing chevron and open a Menu; the button label names the field ("Status"), never the value.',
    'Chips show "Key: value" and only appear for active filters; the Clear link appears with the first chip and disappears with the last.',
    'Search is 320px on pages, shrinks to 200px, and is the only Input in the bar. Put more fields in a filter Drawer.',
    'The count uses the exact number and the noun ("128 results", "12 files") and updates live; no "Showing" prefix.',
    'The view toggle has two or three layouts at most, icon-only, with one aria-pressed="true".',
    'Sort is a button labelled "Sort: {option}" that opens a Menu of radio items; never a bare Select in the bar.',
    'align="between" on full-width pages; align="start" inside panels narrower than 720px, where the bar wraps anyway.',
    'dense only inside drawers, cards and split views; on a page the default heights keep 36px targets.',
  ],
  a11y: [
    'Root is role="search" when it contains the search field, otherwise role="toolbar"; give it an aria-label naming the collection.',
    'Filter buttons expose aria-haspopup="menu" and aria-expanded; the date button aria-haspopup="dialog".',
    'Chip × buttons have aria-label "Remove filter {Key}: {value}"; removing one moves focus to the next chip or to the search field.',
    'The view toggle is role="group" with aria-label; each item has aria-pressed and an aria-label naming the layout.',
    'The count carries aria-live="polite" so screen readers hear the new number after filtering; keep the text short.',
  ],
  related: ['input', 'button', 'tabs', 'menu', 'tag', 'table', 'segmented-control'],
};
