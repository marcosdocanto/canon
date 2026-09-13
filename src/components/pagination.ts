import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, ex, ICON, typeStyle } from './_shared.ts';

// the reference pagination: 36px page items (14px medium gray-500, radius 8 or full) that turn
// gray-50 with gray-700 text when hovered or current, 2px apart; secondary-style Previous / Next
// buttons at the ends; a hairline above with 20px of padding; "Page 1 of 10" for the minimal
// center type; a 36px button group; 8px dots and 40 × 6 lines for carousels and steps.

const TRANSITION_FAST = {
  'transition-property': 'background-color, border-color, color, box-shadow',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
/** Previous / Next look like the reference secondary button: white, gray-300 ring, skeuomorphic edge, shadow-xs. */
const SECONDARY_SHADOW = `${ring('{color.border-control}')}, {shadow.control}, {shadow.xs}`;

const ARROW_LEFT = '<svg class="cn-pagination__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4"/></svg>';
const ARROW_RIGHT = ICON.arrow.replace('cn-icon', 'cn-pagination__icon');
const CHEVRON_LEFT = '<svg class="cn-pagination__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4l-4 4 4 4"/></svg>';
const CHEVRON_RIGHT = ICON.chevronRight.replace('cn-icon', 'cn-pagination__icon');

const page = (n: number | string, current = false) => `<button type="button" class="cn-pagination__item"${current ? ' aria-current="page"' : ''}>${n}</button>`;
const ell = '<span class="cn-pagination__ellipsis" aria-hidden="true">…</span>';
const prev = (label = 'Previous', disabled = false, icon = ARROW_LEFT) => `<button type="button" class="cn-pagination__prev" aria-label="Previous page"${disabled ? ' disabled' : ''}${label ? '' : ' data-icon-only'}>${icon}${label ? `<span>${label}</span>` : ''}</button>`;
const next = (label = 'Next', disabled = false, icon = ARROW_RIGHT) => `<button type="button" class="cn-pagination__next" aria-label="Next page"${disabled ? ' disabled' : ''}${label ? '' : ' data-icon-only'}>${label ? `<span>${label}</span>` : ''}${icon}</button>`;
const summary = (text: string) => `<span class="cn-pagination__summary">${text}</span>`;
const pages = (inner: string) => `<div class="cn-pagination__pages">${inner}</div>`;
const nav = (variant: string, inner: string, extra = '', size = 'md', shape = 'square', align = 'center') =>
  `<nav class="cn-pagination" data-variant="${variant}" data-size="${size}" data-shape="${shape}" data-align="${align}" aria-label="Pagination"${extra}>${inner}</nav>`;
const TEN = pages(`${page(1, true)}${page(2)}${page(3)}${ell}${page(8)}${page(9)}${page(10)}`);

const control = {
  ...RESET_BUTTON,
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  'flex-shrink': '0',
  width: '{space.9}',
  height: '{space.9}',
  'border-radius': '{radius.control}',
  ...typeStyle('label-sm'),
  color: '{color.fg-subtle}',
  'font-variant-numeric': 'tabular-nums',
  ...TRANSITION_FAST,
};

const button = {
  ...RESET_BUTTON,
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  gap: '{space.1}',
  'flex-shrink': '0',
  height: '{space.9}',
  'min-width': '{space.9}',
  'padding-inline': '{space.3}',
  'border-radius': '{radius.control}',
  ...typeStyle('label-md'),
  'background-color': '{color.bg-surface}',
  color: '{color.fg-muted}',
  'box-shadow': SECONDARY_SHADOW,
  ...TRANSITION_FAST,
};

export const pagination: ComponentSpec = {
  name: 'Pagination',
  slug: 'pagination',
  category: 'navigation',
  description: 'Page controls of the reference: 36px page numbers (14px medium, gray-50 when current) with ellipses, secondary-style Previous / Next buttons at the ends on a hairline; a minimal "Page 1 of 10" center; a segmented button group; dots and lines for carousels.',
  usage: 'Use under a table or list whose total is known and larger than one page (page-default under page-level tables, minimal or button-group in a table card footer). Use simple or minimal when the total is unknown or the space is narrow. dots and line are for carousels and onboarding slides, never for data.',
  anatomy: [
    { part: 'root', element: 'nav', description: '<nav aria-label="Pagination">: a flex row, space-between, 12px gap; page-default and minimal add the hairline above with 20px of padding.' },
    { part: 'summary', element: 'span', description: 'The position in words, 14px medium gray-700 with tabular numbers: "Page 1 of 10" (minimal) or "1–10 of 240" (default).', optional: true },
    { part: 'pages', element: 'div', description: 'The centered row of page items, 2px apart (0 in button-group, 8 for dots and lines).', optional: true },
    { part: 'prev', element: 'button', description: 'Previous: a 36px secondary-style button (gray-300 ring, shadow-xs) with a 20px arrow and the word "Previous"; data-icon-only makes it a 36px square. Disabled on the first page, never hidden.' },
    { part: 'item', element: 'button', description: 'One page number, 36 × 36, 14px medium gray-500, radius 8 (or full); gray-50 with gray-700 text when hovered or current (aria-current="page").' },
    { part: 'ellipsis', element: 'span', description: 'The "…" standing in for skipped pages, 36 × 36, gray-600, aria-hidden.', optional: true },
    { part: 'next', element: 'button', description: 'Next: the mirror of prev. Disabled on the last page.' },
    { part: 'icon', element: 'svg', description: '20px arrow or chevron inside prev / next. Decorative.' },
    { part: 'dot', element: 'button', description: 'An 8px gray-200 dot (dots variant); brand-600 when current. aria-label "Slide N".', optional: true },
    { part: 'line', element: 'button', description: 'A 40 × 6 gray-200 bar (line variant); brand-600 when current.', optional: true },
  ],
  props: {
    variant: {
      values: ['default', 'simple', 'page-default', 'minimal', 'button-group', 'dots', 'line'],
      default: 'default',
      description: 'default = summary, prev, page items and next in one row (inline under a table). simple = summary + prev / next only, for unknown totals and narrow layouts. page-default = the reference page pagination: Previous at the left, numbers centered, Next at the right, on a hairline with 20px padding. minimal = Previous, "Page 1 of 10" and Next, same hairline (table card footers). button-group = the page items as one 36px segmented control with shared rings. dots = 8px dots for carousels. line = 40 × 6 bars for onboarding steps.',
    },
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 36px items and buttons (the reference). sm = 32px items and buttons for dense card footers and drawers.',
    },
    shape: {
      values: ['square', 'round'],
      default: 'square',
      description: 'square = radius 8 on page items (default). round = fully rounded page items (the reference rounded={true}).',
    },
    align: {
      values: ['left', 'center', 'right'],
      default: 'center',
      description: 'Where the pages or the summary sit in minimal, button-group, dots and line: left, center (default) or right. page-default is always Previous | pages | Next.',
    },
  },
  states: {
    current: { selector: ' .cn-pagination__item[aria-current="page"], & .cn-pagination__dot[aria-current="true"], & .cn-pagination__line[aria-current="true"]', description: 'The page being shown (on the ITEM, not the root): gray-50 fill with gray-700 text; dots and lines turn brand-600.', markup: 'aria-current="page" on the page item, aria-current="true" on a dot or line' },
    hover: { selector: ' .cn-pagination__item:hover, & .cn-pagination__prev:hover, & .cn-pagination__next:hover', description: 'Pointer over a page or a button: gray-50 fill and gray-700 text (the same look as current).', markup: 'native :hover' },
    focus: { selector: ' .cn-pagination__item:focus-visible, & .cn-pagination__prev:focus-visible, & .cn-pagination__next:focus-visible', description: 'Keyboard focus: the 4px brand ring around that control.', markup: 'native :focus-visible' },
    disabled: { selector: ' .cn-pagination__prev:disabled, & .cn-pagination__next:disabled', description: 'A button at a bound (first or last page): 50% opacity, no hover; stays visible so the layout never jumps.', markup: 'disabled (or aria-disabled="true" on links)' },
  },
  base: {
    root: {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      gap: '{space.3}',
      width: '100%',
      ...typeStyle('body-md'),
      color: '{color.fg-muted}',
    },
    summary: {
      ...typeStyle('label-sm'),
      color: '{color.fg-muted}',
      'font-variant-numeric': 'tabular-nums',
      'white-space': 'nowrap',
    },
    pages: { display: 'flex', 'align-items': 'center', gap: '{space.0.5}', 'min-width': '0', 'flex-wrap': 'wrap' },
    item: control,
    prev: button,
    next: button,
    ellipsis: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.9}',
      height: '{space.9}',
      color: '{color.fg-muted}',
      'user-select': 'none',
      'flex-shrink': '0',
    },
    icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', display: 'block', color: '{color.fg-subtle}', transition: 'inherit' },
    dot: { ...RESET_BUTTON, display: 'block', width: '{space.2}', height: '{space.2}', 'border-radius': '{radius.full}', 'background-color': '{color.border-default}', 'flex-shrink': '0', ...TRANSITION_FAST },
    line: { ...RESET_BUTTON, display: 'block', width: '{space.10}', height: '{space.1.5}', 'border-radius': '{radius.full}', 'background-color': '{color.border-default}', 'flex-shrink': '0', ...TRANSITION_FAST },
  },
  variants: {
    variant: {
      default: { root: { 'justify-content': 'flex-start', width: 'auto' } },
      simple: { root: { 'justify-content': 'flex-start', width: 'auto' }, item: { display: 'none' }, ellipsis: { display: 'none' }, pages: { display: 'none' } },
      'page-default': { root: { 'border-top': HAIRLINE, 'padding-top': '{space.5}' } },
      minimal: { root: { 'border-top': HAIRLINE, 'padding-top': '{space.5}' } },
      'button-group': { pages: { gap: '0', 'flex-wrap': 'nowrap', 'border-radius': '{radius.control}', 'box-shadow': '{shadow.xs}' }, item: { 'border-radius': '0', 'background-color': '{color.bg-surface}', color: '{color.fg-muted}', 'box-shadow': `${ring('{color.border-control}')}, {shadow.control}` }, ellipsis: { 'background-color': '{color.bg-surface}', 'box-shadow': `${ring('{color.border-control}')}, {shadow.control}` } },
      dots: { pages: { gap: '{space.2}' } },
      line: { pages: { gap: '{space.2}' } },
    },
    size: {
      sm: {
        item: { width: '{space.8}', height: '{space.8}' },
        prev: { height: '{space.8}', 'min-width': '{space.8}', 'padding-inline': '{space.2.5}' },
        next: { height: '{space.8}', 'min-width': '{space.8}', 'padding-inline': '{space.2.5}' },
        ellipsis: { width: '{space.8}', height: '{space.8}' },
        icon: { width: '{size.icon.sm}', height: '{size.icon.sm}' },
      },
      md: { root: {} },
    },
    shape: {
      square: { root: {} },
      round: { item: { 'border-radius': '{radius.full}' } },
    },
    align: {
      left: { root: {} },
      center: { root: {} },
      right: { root: {} },
    },
  },
  compound: [
    { when: { variant: 'minimal', align: 'left' }, block: { root: { 'justify-content': 'flex-start' }, summary: { order: '-1', 'margin-inline-end': 'auto' } } },
    { when: { variant: 'minimal', align: 'right' }, block: { root: { 'justify-content': 'flex-end' }, summary: { 'margin-inline-end': 'auto' } } },
    { when: { variant: 'button-group', align: 'left' }, block: { root: { 'justify-content': 'flex-start' } } },
    { when: { variant: 'button-group', align: 'right' }, block: { root: { 'justify-content': 'flex-end' } } },
    { when: { variant: 'dots', align: 'left' }, block: { root: { 'justify-content': 'flex-start' } } },
    { when: { variant: 'dots', align: 'right' }, block: { root: { 'justify-content': 'flex-end' } } },
    { when: { variant: 'line', align: 'left' }, block: { root: { 'justify-content': 'flex-start' } } },
    { when: { variant: 'line', align: 'right' }, block: { root: { 'justify-content': 'flex-end' } } },
    { when: { variant: 'dots', size: 'md' }, block: { dot: { width: '{space.2.5}', height: '{space.2.5}' } } },
    { when: { variant: 'line', size: 'md' }, block: { line: { height: '{space.2}' } } },
  ],
  extraCss: `
.cn-pagination__item:hover:not(:disabled):not([aria-disabled="true"]), .cn-pagination__item[aria-current="page"] { background-color: {color.bg-subtle}; color: {color.fg-muted}; }
.cn-pagination__item[aria-current="page"] { cursor: default; }
.cn-pagination__prev:hover:not(:disabled):not([aria-disabled="true"]), .cn-pagination__next:hover:not(:disabled):not([aria-disabled="true"]) { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-pagination__prev:hover:not(:disabled) .cn-pagination__icon, .cn-pagination__next:hover:not(:disabled) .cn-pagination__icon { color: {color.fg-muted}; }
.cn-pagination__prev[data-icon-only], .cn-pagination__next[data-icon-only] { padding-inline: 0; width: {space.9}; }
.cn-pagination[data-size="sm"] .cn-pagination__prev[data-icon-only], .cn-pagination[data-size="sm"] .cn-pagination__next[data-icon-only] { width: {space.8}; }
.cn-pagination__prev > span, .cn-pagination__next > span { padding-inline: {space.0.5}; }
.cn-pagination__item:focus-visible, .cn-pagination__prev:focus-visible, .cn-pagination__next:focus-visible, .cn-pagination__dot:focus-visible, .cn-pagination__line:focus-visible { outline: none; box-shadow: {shadow.focus}; z-index: {z.raised}; }
.cn-pagination__prev:focus-visible, .cn-pagination__next:focus-visible { box-shadow: ${SECONDARY_SHADOW}, {shadow.focus}; }
.cn-pagination__item:disabled, .cn-pagination__prev:disabled, .cn-pagination__next:disabled,
.cn-pagination__item[aria-disabled="true"], .cn-pagination__prev[aria-disabled="true"], .cn-pagination__next[aria-disabled="true"] { opacity: {opacity.disabled}; cursor: not-allowed; pointer-events: none; }
.cn-pagination[data-variant="button-group"] .cn-pagination__pages > * + * { margin-inline-start: -1px; }
.cn-pagination[data-variant="button-group"] .cn-pagination__pages > :first-child { border-start-start-radius: {radius.control}; border-end-start-radius: {radius.control}; }
.cn-pagination[data-variant="button-group"] .cn-pagination__pages > :last-child { border-start-end-radius: {radius.control}; border-end-end-radius: {radius.control}; }
.cn-pagination[data-variant="button-group"] .cn-pagination__item:hover:not(:disabled), .cn-pagination[data-variant="button-group"] .cn-pagination__item[aria-current="page"] { background-color: {color.bg-subtle}; color: {color.fg-default}; box-shadow: ${ring('{color.border-control}')}, {shadow.control}; }
.cn-pagination[data-variant="button-group"] .cn-pagination__item:focus-visible { box-shadow: ${ring('{color.border-control}')}, {shadow.control}, {shadow.focus}; }
.cn-pagination__dot[aria-current="true"], .cn-pagination__line[aria-current="true"] { background-color: {color.bg-action}; }
.cn-pagination__dot:hover:not([aria-current="true"]), .cn-pagination__line:hover:not([aria-current="true"]) { background-color: {color.border-control}; }
.cn-pagination[data-framed] .cn-pagination__pages { padding: {space.2}; border-radius: {radius.full}; background-color: {color.bg-surface}; box-shadow: ${ring('{color.border-default}')}, {shadow.xs}; }
@media (max-width: {breakpoint.md}) {
  .cn-pagination[data-variant="page-default"] .cn-pagination__pages { display: none; }
  .cn-pagination[data-variant="page-default"] .cn-pagination__prev > span, .cn-pagination[data-variant="page-default"] .cn-pagination__next > span { display: none; }
  .cn-pagination[data-variant="page-default"] .cn-pagination__prev, .cn-pagination[data-variant="page-default"] .cn-pagination__next { padding-inline: 0; width: {space.9}; }
}`,
  examples: [
    ex('Page default', `<div style="width:100%;max-width:720px">${nav('page-default', `${prev('Previous', true)}${TEN}${next()}`)}</div>`, 'Previous and Next at the ends (secondary-style, 36px), numbers centered 2px apart on a hairline with 20px of padding. Page 1 is current in gray-50.'),
    ex('Page default, rounded, middle page', `<div style="width:100%;max-width:720px">${nav('page-default', `${prev()}${pages(`${page(1)}${ell}${page(5)}${page(6, true)}${page(7)}${ell}${page(10)}`)}${next()}`, '', 'md', 'round')}</div>`, 'data-shape="round": fully rounded items. Seven slots: first, ellipsis, current ±1, ellipsis, last.'),
    ex('Minimal center', `<div style="width:100%;max-width:720px">${nav('minimal', `${prev('Previous', true)}${summary('Page 1 of 10')}${next()}`)}</div>`, 'Previous, "Page 1 of 10" and Next; the reference minimal center type for table card footers.'),
    ex('Minimal, right aligned, small', `<div style="width:100%;max-width:720px">${nav('minimal', `${summary('Page 3 of 10')}${prev('', false, CHEVRON_LEFT)}${next('', false, CHEVRON_RIGHT)}`, '', 'sm', 'square', 'right')}</div>`, 'The summary on the left, two 32px icon-only chevron buttons on the right (data-icon-only).'),
    ex('Button group', `<div style="width:100%;max-width:720px">${nav('button-group', `${pages(`${page(1, true)}${page(2)}${page(3)}${ell}${page(8)}${page(9)}${page(10)}`)}`, '', 'md', 'square', 'right')}</div>`, 'One 36px segmented control with shared gray-300 rings and shadow-xs; the current page is gray-50.'),
    ex('Default (inline) and simple', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-4)">${nav('default', `${summary('1–10 of 240')}${prev('', true, CHEVRON_LEFT)}${pages(`${page(1, true)}${page(2)}${page(3)}${ell}${page(24)}`)}${next('', false, CHEVRON_RIGHT)}`)}${nav('simple', `${summary('Showing 20 results')}${prev('', false, CHEVRON_LEFT)}${next('', false, CHEVRON_RIGHT)}`)}</div>`, 'default keeps everything in one inline row; simple hides the page items for cursor APIs and unknown totals.'),
    ex('Dots and lines (carousels)', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-6);align-items:flex-start">${nav('dots', pages(['1', '2', '3', '4', '5'].map((n, i) => `<button type="button" class="cn-pagination__dot" aria-label="Slide ${n}"${i === 1 ? ' aria-current="true"' : ''}></button>`).join('')), '', 'md', 'square', 'left')}${nav('line', pages(['1', '2', '3', '4'].map((n, i) => `<button type="button" class="cn-pagination__line" aria-label="Step ${n}"${i === 2 ? ' aria-current="true"' : ''}></button>`).join('')), '', 'md', 'square', 'left')}${nav('dots', pages(['1', '2', '3', '4'].map((n, i) => `<button type="button" class="cn-pagination__dot" aria-label="Slide ${n}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')), ' data-framed', 'sm', 'square', 'left')}</div>`, '10px dots (8px at sm) and 40 × 8 lines, gray-200 at rest and brand-600 when current; data-framed puts them on a white ringed pill.'),
    ex('Pages as links', `<div style="width:100%;max-width:720px"><nav class="cn-pagination" data-variant="page-default" data-size="md" data-shape="square" data-align="center" aria-label="Pagination"><a href="?page=1" class="cn-pagination__prev" aria-label="Previous page">${ARROW_LEFT}<span>Previous</span></a><div class="cn-pagination__pages"><a href="?page=1" class="cn-pagination__item">1</a><a href="?page=2" class="cn-pagination__item" aria-current="page">2</a><a href="?page=3" class="cn-pagination__item">3</a><a href="?page=4" class="cn-pagination__item">4</a><a href="?page=5" class="cn-pagination__item">5</a></div><a href="?page=3" class="cn-pagination__next" aria-label="Next page"><span>Next</span>${ARROW_RIGHT}</a></nav></div>`, 'When the page is in the URL, every control is an <a href> so pages are shareable and crawlable.'),
  ],
  rules: [
    'At most seven page slots: first, last, the current page with one neighbour on each side, and ellipses for the gaps.',
    'Page items are 36 × 36 (sm 32), 14px medium, 2px apart; the current page is gray-50 with darker text, the same look as hover. Never an inverse fill.',
    'Previous and Next are always present and always the secondary-button look; at a bound they are disabled, never removed, so the layout does not shift. Under 768px they become 36px icon-only buttons.',
    'page-default under page-level tables and lists; minimal or button-group in a table card footer (12 × 24px padding); simple for cursor APIs, unknown totals and drawers.',
    'The minimal summary reads "Page N of M" in 14px medium; the default summary reads "1–10 of 240". Never both.',
    'dots and line are for carousels and onboarding slides only (aria-current="true" on the current one); never for tables.',
    'The page-size selector ("10 per page") belongs to the table toolbar or the advanced card footer, not next to the page items.',
    'sm only inside cards and drawers; md under page-level tables.',
    'When the page number is part of the URL, render every control as a link; otherwise as buttons. Never mix.',
  ],
  a11y: [
    'Root is <nav aria-label="Pagination">; when there are several on a page, name them ("Customers pagination").',
    'The current page carries aria-current="page" and is announced as such; the gray fill is the visual cue, the attribute is the semantic one.',
    'Prev / Next have aria-label="Previous page" / "Next page" even when the word is visible; the arrows are aria-hidden.',
    'Ellipses are aria-hidden; screen readers hear the page numbers, not "dot dot dot".',
    'Disabled bounds use the disabled attribute on buttons or aria-disabled="true" on links (keep the href out of the tab order).',
    'Announce page changes: put the summary in an aria-live="polite" region when the table updates in place.',
    'Dots and lines are buttons with aria-label "Slide N" / "Step N" and aria-current="true" on the active one.',
  ],
  related: ['table', 'list', 'button-group', 'button', 'select'],
};
