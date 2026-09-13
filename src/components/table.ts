import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference table: a card (radius 12, gray-200 ring, shadow-xs) with a gray-50 header row
// (44px, 12px medium gray-600 labels, 8 × 24px padding), 64px rows (72 with two-line avatar cells,
// 56 at sm) divided by gray-200 hairlines, 14px gray-600 cells with 16 × 24px padding, ink medium
// primary text, a 44px checkbox column, 12px sort arrows and gray-50 hover / selected rows.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const SORT = '<svg class="cn-table__sort" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4"/></svg>';
const SORT_BOTH = '<svg class="cn-table__sort" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6l3-3 3 3M5 10l3 3 3-3"/></svg>';
const HELP = ICON.info.replace('cn-icon', 'cn-table__help');
const SILHOUETTE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";

const ghost = (label: string) => `<button type="button" class="cn-button" data-variant="ghost" data-size="sm"><span class="cn-button__label">${label}</span></button>`;
const link = (label: string) => `<button type="button" class="cn-button" data-variant="link-color" data-size="sm"><span class="cn-button__label">${label}</span></button>`;
const badge = (text: string, tone: string, dot = false) => `<span class="cn-badge" data-tone="${tone}" data-variant="soft" data-size="sm">${dot ? '<span class="cn-badge__dot"></span>' : ''}${text}</span>`;
const th = (label: string, extra = '') => `<th class="cn-table__header-cell" scope="col"${extra}>${label}</th>`;
const td = (content: string, extra = '') => `<td class="cn-table__cell"${extra}>${content}</td>`;
const checkbox = (label: string, checked = false) => `<label class="cn-checkbox" data-size="md"><input class="cn-checkbox__input" type="checkbox"${checked ? ' checked' : ''} aria-label="${label}"><span class="cn-checkbox__control" aria-hidden="true"><svg class="cn-checkbox__indicator" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg></span></label>`;
const person = (initials: string, name: string, handle: string) =>
  `<div class="cn-avatar-label-group" data-size="md"><span class="cn-avatar" data-size="md" data-shape="circle" data-tone="neutral" data-status="none" aria-hidden="true"><img class="cn-avatar__image" src="${SILHOUETTE}" alt=""></span><div class="cn-avatar-label-group__text"><span class="cn-table__primary">${name}</span><span class="cn-table__secondary">${handle}</span></div></div>`;

const TEAM: [string, string, string, string, string, string][] = [
  ['MC', 'Maya Chen', '@maya', 'Product Manager', 'maya@lumen.co', 'Active'],
  ['DC', 'Daniel Costa', '@daniel', 'Engineering', 'daniel@lumen.co', 'Active'],
  ['SA', 'Sofia Almeida', '@sofia', 'Design', 'sofia@lumen.co', 'Offline'],
  ['LF', 'Lucas Ferreira', '@lucas', 'Frontend', 'lucas@lumen.co', 'Active'],
  ['AK', 'Aisha Khan', '@aisha', 'Backend', 'aisha@lumen.co', 'Active'],
];
const teamRow = ([i, n, h, role, email, status]: [string, string, string, string, string, string], k: number) =>
  `<tr class="cn-table__row"${k === 1 ? ' data-selected' : ''}><td class="cn-table__cell cn-table__checkbox">${checkbox(`Select ${n}`, k === 1)}</td>${td(person(i, n, h))}${td(badge(status, status === 'Active' ? 'success' : 'neutral', true))}${td(role)}${td(email)}${td(`<div style="display:flex;gap:var(--cn-space-1)">${badge('Design', 'accent')}${badge('Product', 'info')}${k % 2 ? badge('+2', 'neutral') : ''}</div>`)}<td class="cn-table__cell cn-table__actions">${ghost('Delete')}${link('Edit')}</td></tr>`;
const TEAM_HEAD = `<thead class="cn-table__head"><tr class="cn-table__row"><th class="cn-table__header-cell cn-table__checkbox" scope="col">${checkbox('Select all')}</th><th class="cn-table__header-cell" scope="col" aria-sort="ascending"><button type="button">Name${SORT}</button></th>${th(`<span>Status</span>${HELP}`)}<th class="cn-table__header-cell" scope="col"><button type="button">Role${SORT_BOTH}</button></th>${th('Email address')}${th('Teams')}<th class="cn-table__header-cell cn-table__actions" scope="col"><span class="cn-sr-only">Actions</span></th></tr></thead>`;

const INVOICES: [string, string, string, string][] = [
  ['INV-0041', 'Dec 1, 2025', '$2,400.00', 'Paid'],
  ['INV-0042', 'Jan 1, 2026', '$2,400.00', 'Paid'],
  ['INV-0043', 'Feb 1, 2026', '$2,900.00', 'Overdue'],
  ['INV-0044', 'Mar 1, 2026', '$2,900.00', 'Pending'],
];
const FILES: [string, string, string, string][] = [
  ['Brand guidelines.pdf', '2.4 MB', 'Sofia Almeida', 'Jan 4, 2026'],
  ['Q3 roadmap.xlsx', '720 KB', 'Maya Chen', 'Jan 2, 2026'],
  ['Onboarding video.mp4', '16 MB', 'Noah Berg', 'Dec 18, 2025'],
  ['Customer list.csv', '96 KB', 'Elena Rossi', 'Dec 12, 2025'],
  ['Pricing page.fig', '4.1 MB', 'Tomás Silva', 'Dec 9, 2025'],
  ['Release notes.md', '12 KB', 'Lucas Ferreira', 'Dec 2, 2025'],
];

export const table: ComponentSpec = {
  name: 'Table',
  slug: 'table',
  category: 'data-display',
  description: 'Rows of records in the reference table: a gray-50 header row with 12px medium labels, 64px rows (72 with avatars) on gray-200 hairlines, 14px gray-600 cells with ink medium primary text, a checkbox column, sortable headers and gray-50 hover / selected rows; optionally framed as a card (radius 12, ring, shadow-xs).',
  usage: 'Collections of similar records that people scan and compare (team members, customers, invoices, files). For rows with one line of text and an avatar use List; for key/value pairs use DescriptionList; for a handful of visual items use Cards. Put the table in a Card with a CardHeader and a Pagination footer, or use variant="card" standalone.',
  anatomy: [
    { part: 'root', element: 'table', description: 'The <table>: width 100%, separate borders with zero spacing so radii and sticky headers work; 14px text in fg-muted. Add data-interactive when rows open something and data-sticky to pin the header inside a scroll container.' },
    { part: 'caption', element: 'caption', description: 'Optional visible name of the table (14px medium fg-muted) above the header, left-aligned; prefer a CardHeader.', optional: true },
    { part: 'head', element: 'thead', description: 'Header row group: gray-50 fill, 44px tall (36 at compact), gray-200 hairline below.' },
    { part: 'header-cell', element: 'th', description: 'Column header: 12px medium fg-muted, 8 × 24px padding, no wrap, scope="col". Sortable headers wrap their text in a <button> and carry aria-sort; a help icon may follow the label.' },
    { part: 'help', element: 'svg', description: '16px help-circle after a header label, fg-subtle, with a Tooltip explaining the column.', optional: true },
    { part: 'body', element: 'tbody', description: 'The data rows.' },
    { part: 'row', element: 'tr', description: 'One record, 64px (56 compact, 72 comfortable). data-selected (or aria-selected inside a grid) fills it gray-50; hover fills it gray-50 only when the table is data-interactive.' },
    { part: 'cell', element: 'td', description: 'A value: 14px fg-muted, 16 × 24px padding (12 × 20 compact), gray-200 hairline below, vertical-align middle. data-align="right" for numbers (tabular figures), "center" for icons.' },
    { part: 'primary', element: 'span', description: 'The identifying text of a row (a name), 14px medium in ink; stack it over a secondary line inside an avatar label group.', optional: true },
    { part: 'secondary', element: 'span', description: 'The supporting line under the primary text (handle, email), 14px fg-muted.', optional: true },
    { part: 'checkbox', element: 'td', description: 'The 44px selection column (add this class alongside the cell / header-cell class): 24px left padding, 0 right, a Checkbox md; the next cell pulls its padding to 12px.', optional: true },
    { part: 'footer', element: 'tfoot', description: 'Optional totals row group: gray-50 fill, hairline above, medium weight.', optional: true },
    { part: 'sort', element: 'svg', description: '12px arrow after a sortable header\'s text (stroke 3). The unsorted chevron-selector shows on hover; the arrow shows when aria-sort is set and flips for ascending.', optional: true },
    { part: 'actions', element: 'td', description: 'The last cell, right-aligned, holding one or two sm ghost / link Buttons or a ⋯ IconButton with a Menu. Add this class alongside the cell class (and on its header cell).', optional: true },
  ],
  props: {
    density: {
      values: ['compact', 'default', 'comfortable'],
      default: 'default',
      description: 'Row height and cell padding: compact = 56px rows, 36px header, 12 × 20px cells (the reference sm); default = 64px rows, 44px header, 16 × 24px cells; comfortable = 72px rows for two-line avatar cells (the reference md).',
    },
    variant: {
      values: ['default', 'striped', 'bordered', 'card'],
      default: 'default',
      description: 'default = hairlines between rows only (inside a Card with padding none); striped = alternate rows gray-50, for wide tables with many columns; bordered = full grid lines, for numeric matrices; card = the table draws its own frame: radius 12, gray-200 ring, shadow-xs, for standalone tables on the canvas.',
    },
  },
  states: {
    rowHover: { selector: '[data-interactive] tbody tr:hover', description: 'On a body row, not the root: gray-50 fill while hovered. Only when the root has data-interactive (rows open a record).', markup: 'data-interactive on the <table>; native :hover on the row' },
    rowSelected: { selector: 'tr[data-selected], tr[aria-selected="true"]', description: 'On a body row: gray-50 fill (the reference highlights selected rows like hovered ones); the checkbox shows the selection.', markup: 'data-selected on the <tr> (aria-selected="true" inside role="grid")' },
    sorted: { selector: 'th[aria-sort]', description: 'On a header cell: the sort arrow is visible; ascending flips it.', markup: 'aria-sort="ascending|descending" on the <th>' },
    sticky: { selector: '[data-sticky]', description: 'Header cells stick to the top of the nearest scroll container.', markup: 'data-sticky on the <table>, inside a container with overflow auto' },
  },
  base: {
    root: {
      width: '100%',
      'border-collapse': 'separate',
      'border-spacing': '0',
      ...typeStyle('body-md'),
      color: '{color.fg-muted}',
      'text-align': 'left',
    },
    caption: {
      ...typeStyle('label-sm'),
      color: '{color.fg-muted}',
      'text-align': 'left',
      'caption-side': 'top',
      'padding-bottom': '{space.3}',
    },
    head: { 'background-color': '{color.bg-subtle}' },
    'header-cell': {
      ...typeStyle('label-xs'),
      color: '{color.fg-muted}',
      padding: '{space.2} {space.6}',
      height: '{space.11}',
      'border-bottom': HAIRLINE,
      'background-color': '{color.bg-subtle}',
      'white-space': 'nowrap',
      'text-align': 'left',
      'vertical-align': 'middle',
    },
    help: { display: 'inline-block', width: '{size.icon.sm}', height: '{size.icon.sm}', 'margin-inline-start': '{space.1}', 'vertical-align': 'middle', color: '{color.fg-subtle}', 'stroke-width': '2' },
    body: { color: '{color.fg-muted}' },
    row: {
      height: '{space.16}',
      'transition-property': 'background-color',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    cell: {
      padding: '{space.4} {space.6}',
      'border-bottom': HAIRLINE,
      'vertical-align': 'middle',
      color: '{color.fg-muted}',
    },
    primary: { display: 'block', ...typeStyle('label-sm'), color: '{color.fg-default}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    secondary: { display: 'block', ...typeStyle('body-md'), color: '{color.fg-muted}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    checkbox: { width: '{space.11}', 'padding-inline': '{space.6} 0' },
    footer: { 'background-color': '{color.bg-subtle}' },
    sort: {
      display: 'inline-block',
      width: '{size.icon.xs}',
      height: '{size.icon.xs}',
      'margin-inline-start': '{space.1}',
      'vertical-align': 'middle',
      color: '{color.fg-subtle}',
      'stroke-width': '3',
      opacity: '0',
      'transition-property': 'opacity, transform',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    actions: { 'text-align': 'right', 'white-space': 'nowrap' },
  },
  variants: {
    density: {
      compact: { row: { height: '{space.14}' }, cell: { padding: '{space.3} {space.5}' }, 'header-cell': { height: '{space.9}', padding: '{space.2} {space.5}' }, checkbox: { width: '{space.9}', 'padding-inline': '{space.5} 0' } },
      default: { row: { height: '{space.16}' }, cell: { padding: '{space.4} {space.6}' }, 'header-cell': { height: '{space.11}' } },
      comfortable: { row: { height: 'calc({space.16} + {space.2})' }, cell: { padding: '{space.4} {space.6}' }, 'header-cell': { height: '{space.11}' } },
    },
    variant: {
      default: { root: {} },
      striped: { root: {} },
      bordered: { root: { 'box-shadow': ring('{color.border-default}'), 'border-radius': '{radius.card}' } },
      card: { root: { 'box-shadow': `${ring('{color.border-default}')}, {shadow.xs}`, 'border-radius': '{radius.card}', 'background-color': '{color.bg-surface}' } },
    },
  },
  extraCss: `
.cn-table[data-density] .cn-table__head .cn-table__row, .cn-table__head .cn-table__row { height: auto; }
.cn-table[data-interactive] .cn-table__body .cn-table__row { cursor: pointer; }
.cn-table[data-interactive] .cn-table__body .cn-table__row:hover .cn-table__cell { background-color: {color.bg-subtle}; }
.cn-table .cn-table__body .cn-table__row[data-selected] .cn-table__cell, .cn-table .cn-table__body .cn-table__row[aria-selected="true"] .cn-table__cell { background-color: {color.bg-subtle}; }
.cn-table[data-sticky] .cn-table__header-cell { position: sticky; top: 0; z-index: {z.sticky}; }
.cn-table__header-cell[data-align="right"], .cn-table__cell[data-align="right"] { text-align: right; font-variant-numeric: tabular-nums; }
.cn-table__header-cell[data-align="center"], .cn-table__cell[data-align="center"] { text-align: center; }
.cn-table__header-cell:hover .cn-table__sort, .cn-table__header-cell[aria-sort] .cn-table__sort { opacity: 1; }
.cn-table__header-cell[aria-sort="ascending"] .cn-table__sort { transform: rotate(180deg); }
.cn-table__header-cell > button { appearance: none; border: 0; padding: 0; margin: 0; background: none; font: inherit; color: inherit; letter-spacing: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: {space.1}; border-radius: {radius.sm}; }
.cn-table__header-cell > button .cn-table__sort { margin-inline-start: 0; }
.cn-table__header-cell > button:focus-visible { outline: none; box-shadow: inset 0 0 0 2px {brand.500}; }
.cn-table__checkbox + .cn-table__cell, .cn-table__checkbox + .cn-table__header-cell { padding-inline-start: {space.3}; }
.cn-table__checkbox .cn-checkbox { display: inline-flex; vertical-align: middle; }
.cn-table__footer .cn-table__cell { background-color: {color.bg-subtle}; border-bottom: 0; border-top: ${HAIRLINE}; font-weight: {font.weight.medium}; color: {color.fg-default}; }
.cn-table__actions > * + * { margin-inline-start: {space.1}; }
.cn-table__cell .cn-avatar-label-group { display: flex; }
.cn-table[data-variant="striped"] .cn-table__body .cn-table__row:nth-child(even) .cn-table__cell { background-color: {color.bg-subtle}; }
.cn-table[data-variant="striped"][data-interactive] .cn-table__body .cn-table__row:hover .cn-table__cell { background-color: {color.bg-muted}; }
.cn-table[data-variant="bordered"] .cn-table__header-cell, .cn-table[data-variant="bordered"] .cn-table__cell { border-inline-end: ${HAIRLINE}; }
.cn-table[data-variant="bordered"] .cn-table__header-cell:last-child, .cn-table[data-variant="bordered"] .cn-table__cell:last-child { border-inline-end: 0; }
.cn-table[data-variant="card"] .cn-table__head .cn-table__row:first-child .cn-table__header-cell:first-child, .cn-table[data-variant="bordered"] .cn-table__head .cn-table__row:first-child .cn-table__header-cell:first-child { border-start-start-radius: {radius.card}; }
.cn-table[data-variant="card"] .cn-table__head .cn-table__row:first-child .cn-table__header-cell:last-child, .cn-table[data-variant="bordered"] .cn-table__head .cn-table__row:first-child .cn-table__header-cell:last-child { border-start-end-radius: {radius.card}; }
.cn-table[data-variant="card"] > :last-child > .cn-table__row:last-child > .cn-table__cell, .cn-table[data-variant="bordered"] > :last-child > .cn-table__row:last-child > .cn-table__cell { border-bottom: 0; }
.cn-table[data-variant="card"] > :last-child > .cn-table__row:last-child > .cn-table__cell:first-child, .cn-table[data-variant="bordered"] > :last-child > .cn-table__row:last-child > .cn-table__cell:first-child { border-end-start-radius: {radius.card}; }
.cn-table[data-variant="card"] > :last-child > .cn-table__row:last-child > .cn-table__cell:last-child, .cn-table[data-variant="bordered"] > :last-child > .cn-table__row:last-child > .cn-table__cell:last-child { border-end-end-radius: {radius.card}; }
.cn-card[data-padding="none"] > .cn-table > :last-child > .cn-table__row:last-child > .cn-table__cell { border-bottom: 0; }`,
  examples: [
    ex('Team members (card, comfortable, sorted, one selected)', `<div style="width:100%;overflow-x:auto" role="region" tabindex="0" aria-label="Scrollable table"><table class="cn-table" data-density="comfortable" data-variant="card" data-interactive>${TEAM_HEAD}<tbody class="cn-table__body">${TEAM.map((r, i) => teamRow(r, i)).join('')}</tbody></table></div>`, 'The reference team table: 44px gray-50 header, 72px rows with a 40px avatar and two lines (primary ink medium, secondary muted), a 44px checkbox column, Name sorted ascending, Role sortable on hover, a help icon on Status, ghost + link actions.'),
    ex('Invoices (default density, in a Card with header and pagination)', `<section class="cn-card" data-variant="default" data-padding="none" style="width:100%;max-width:720px"><header class="cn-card-header" data-variant="with-badge" data-size="md"><div class="cn-card-header__content"><h2 class="cn-card-header__title">Invoices<span class="cn-badge cn-card-header__badge" data-tone="neutral" data-variant="modern" data-size="sm" data-shape="square">4</span></h2><p class="cn-card-header__description">Billing history for the Lumen workspace.</p></div><div class="cn-card-header__actions">${ghost('Download all')}</div></header><div style="width:100%;overflow-x:auto" role="region" tabindex="0" aria-label="Invoices"><table class="cn-table" data-density="default" data-variant="default"><thead class="cn-table__head"><tr class="cn-table__row">${th('Invoice')}${th('Date')}${th('Amount', ' data-align="right"')}${th('Status')}<th class="cn-table__header-cell cn-table__actions" scope="col"><span class="cn-sr-only">Actions</span></th></tr></thead><tbody class="cn-table__body">${INVOICES.map(([id, date, amount, status]) => `<tr class="cn-table__row">${td(`<span class="cn-table__primary">${id}</span>`)}${td(date)}${td(amount, ' data-align="right"')}${td(badge(status, status === 'Paid' ? 'success' : status === 'Overdue' ? 'danger' : 'warning'))}<td class="cn-table__cell cn-table__actions">${link('Download')}</td></tr>`).join('')}</tbody></table></div><footer class="cn-card__footer"><nav class="cn-pagination" data-variant="minimal" data-size="sm" data-shape="square" data-align="center" aria-label="Invoices pagination" style="border-top:0;padding-top:0"><button type="button" class="cn-pagination__prev" aria-label="Previous page" disabled><span>Previous</span></button><span class="cn-pagination__summary">Page 1 of 3</span><button type="button" class="cn-pagination__next" aria-label="Next page"><span>Next</span></button></nav></footer></section>`, '64px rows; the Card supplies the frame, a CardHeader names it and a minimal Pagination closes it. Numbers right-aligned and tabular.'),
    ex('Files (compact, striped)', `<div style="width:100%;overflow-x:auto" role="region" tabindex="0" aria-label="Scrollable table"><table class="cn-table" data-density="compact" data-variant="striped"><thead class="cn-table__head"><tr class="cn-table__row">${th('File name')}${th('Size', ' data-align="right"')}${th('Uploaded by')}${th('Last modified')}</tr></thead><tbody class="cn-table__body">${FILES.map(([n, s, by, d]) => `<tr class="cn-table__row">${td(`<span class="cn-table__primary">${n}</span>`)}${td(s, ' data-align="right"')}${td(by)}${td(d)}</tr>`).join('')}</tbody></table></div>`, '56px rows, 36px header, 12 × 20px cells (the reference sm); even rows gray-50.'),
    ex('Bordered with totals and a sticky header (scrolls)', `<div style="width:100%;max-height:224px;overflow:auto;border-radius:var(--cn-radius-card)" tabindex="0" aria-label="Files, scrollable"><table class="cn-table" data-density="compact" data-variant="bordered" data-sticky><thead class="cn-table__head"><tr class="cn-table__row">${th('File name')}${th('Size', ' data-align="right"')}${th('Uploaded by')}</tr></thead><tbody class="cn-table__body">${FILES.map(([n, s, by]) => `<tr class="cn-table__row">${td(n)}${td(s, ' data-align="right"')}${td(by)}</tr>`).join('')}</tbody><tfoot class="cn-table__footer"><tr class="cn-table__row">${td('6 files')}${td('23.3 MB', ' data-align="right"')}${td('')}</tr></tfoot></table></div>`, 'Full grid lines for numeric matrices; scroll the container and the header stays.'),
  ],
  rules: [
    'Column headers are 12px medium, sentence case, 1–2 words, no trailing colon; never uppercase.',
    'Row heights come from density only: 56 / 64 / 72px; comfortable for cells with an avatar and two lines, compact for dense operational tables.',
    'The first column identifies the row: primary text in ink medium (name, ID) over an optional secondary line, inside an avatar label group when there is a picture. It is the widest and the only one that may truncate.',
    'Numbers are right-aligned with data-align="right" (tabular figures) and never truncated; text is left-aligned; center only icons and checkboxes.',
    'The selection column is the 44px checkbox cell with a Checkbox md; the header checkbox selects all. Selected rows fill gray-50, like hover.',
    'Row hover only when rows open something (data-interactive); the fill is gray-50 and never changes the row height.',
    'Actions live in the last column, right-aligned, as at most two sm ghost / link Buttons or one ⋯ IconButton with a Menu, visible at rest (never only on hover).',
    'Statuses in cells are Badge sm with a dot; people are the avatar label group; never an icon without text.',
    'One sorted column at a time, shown by aria-sort and the 12px arrow; the chevron-selector appears on hover for other sortable columns.',
    'Empty or loading tables replace the body with an EmptyState or Skeleton rows; never render a bare header.',
    'Use variant="card" for standalone tables on the canvas; inside a Card with padding="none" use the default variant so the card supplies the frame.',
  ],
  a11y: [
    'A real <table> with <th scope="col"> in the header (and scope="row" on the identifying cell when useful). Never a grid of divs.',
    'Name the table with a CardHeader (aria-labelledby), a visible caption or aria-label.',
    'Sortable headers contain a <button>; aria-sort on the <th> reflects the current order. The button label names the column; announce the next order in a visually hidden hint if needed.',
    'Row checkboxes have aria-label "Select {name}"; the header checkbox "Select all". aria-selected on rows is valid only inside role="grid"; in plain tables use data-selected plus the checkbox.',
    'Interactive rows also need a focusable element per row (a link or button in the identifying cell); the row hover is not the only affordance.',
    'A scroll container with a sticky header gets tabindex="0" and an aria-label so keyboard users can scroll it.',
  ],
  related: ['card', 'card-header', 'pagination', 'list', 'description-list', 'badge', 'avatar', 'checkbox', 'button', 'empty-state', 'skeleton'],
};
