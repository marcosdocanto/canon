import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// key/value pairs in the reference's detail rhythm: 14px medium gray-600 terms on a 160px column,
// 14px ink values, gray-200 hairlines with 12px of padding, or stacked pairs 4px apart.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';

const pair = (term: string, detail: string) =>
  `<div class="cn-description-list__item"><dt class="cn-description-list__term">${term}</dt><dd class="cn-description-list__detail">${detail}</dd></div>`;

const WORKSPACE = [
  pair('Workspace', 'Lumen'),
  pair('Workspace ID', '<code class="cn-text-code-sm">ws_8f2a91c4</code>'),
  pair('Owner', 'Maya Chen'),
  pair('Plan', '<span class="cn-badge" data-tone="accent" data-variant="soft" data-size="sm">Business</span>'),
  pair('Created', 'March 12, 2024'),
].join('');

const dl = (layout: string, size: string, divided: string, body: string, style = 'width:100%;max-width:560px') =>
  `<dl class="cn-description-list" data-layout="${layout}" data-size="${size}" data-divided="${divided}" style="${style}">${body}</dl>`;

export const descriptionList: ComponentSpec = {
  name: 'DescriptionList',
  slug: 'description-list',
  category: 'data-display',
  description: 'Key/value pairs: a 14px medium muted term and its ink value, side by side on a 160px column or stacked, divided by gray-200 hairlines. The quiet way to show the facts of one record.',
  usage: 'Details of one entity (a workspace, an invoice header, a customer profile) in drawers, cards and detail pages. For many records use Table; for a list of things use List.',
  anatomy: [
    { part: 'root', element: 'dl', description: 'The <dl>. Column of items; the layout prop decides how each pair sits.' },
    { part: 'item', element: 'div', description: 'One pair. A <div> wrapping the dt and dd so they can be laid out as a row.' },
    { part: 'term', element: 'dt', description: 'The key. 14px medium fg-muted, sentence case, no colon.' },
    { part: 'detail', element: 'dd', description: 'The value. 14px in ink; may hold a Badge, a code value, a link or an Avatar with a name.' },
  ],
  props: {
    layout: {
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
      description: 'horizontal = term on a 160px column, value beside it (drawers, detail pages, ≥ 360px wide); vertical = term above the value, 4px apart (narrow columns, card grids, mobile).',
    },
    size: { values: ['sm', 'md'], default: 'md', description: 'md = 14px term and value (default); sm = 12px, for dense cards and summaries.' },
    divided: { values: ['yes', 'no'], default: 'yes', description: 'yes = a gray-200 hairline between pairs with 12px of vertical padding (scannable lists of 4+ facts); no = pairs separated by an 8px gap only (2–3 facts inside a card).' },
  },
  states: {},
  base: {
    root: { display: 'flex', 'flex-direction': 'column', margin: '0', 'min-width': '0', color: '{color.fg-default}' },
    item: { display: 'grid', 'min-width': '0' },
    term: { ...typeStyle('label-sm'), color: '{color.fg-muted}', 'min-width': '0' },
    detail: { ...typeStyle('body-md'), color: '{color.fg-default}', margin: '0', 'min-width': '0', 'overflow-wrap': 'anywhere' },
  },
  variants: {
    layout: {
      horizontal: { item: { 'grid-template-columns': '{space.40} minmax(0, 1fr)', 'column-gap': '{space.4}', 'align-items': 'baseline' } },
      vertical: { item: { 'grid-template-columns': 'minmax(0, 1fr)', 'row-gap': '{space.1}' } },
    },
    size: {
      sm: { term: { 'font-size': '{font.size.xs}' }, detail: { 'font-size': '{font.size.xs}' } },
      md: { term: { 'font-size': '{font.size.sm}' }, detail: { 'font-size': '{font.size.sm}' } },
    },
    divided: {
      yes: { root: { gap: '0' }, item: { 'padding-block': '{space.3}' } },
      no: { root: { gap: '{space.2}' }, item: { 'padding-block': '0' } },
    },
  },
  compound: [
    { when: { layout: 'horizontal', size: 'sm' }, block: { item: { 'grid-template-columns': '{space.32} minmax(0, 1fr)' } } },
    { when: { divided: 'yes', size: 'sm' }, block: { item: { 'padding-block': '{space.2}' } } },
    { when: { layout: 'vertical', divided: 'no' }, block: { root: { gap: '{space.4}' } } },
  ],
  extraCss: `
.cn-description-list[data-divided="yes"] > .cn-description-list__item + .cn-description-list__item { border-top: ${HAIRLINE}; }
.cn-description-list[data-divided="yes"] > .cn-description-list__item:first-child { padding-top: 0; }
.cn-description-list[data-divided="yes"] > .cn-description-list__item:last-child { padding-bottom: 0; }
.cn-description-list__detail > .cn-avatar-label-group { display: inline-flex; }`,
  examples: [
    ex('Horizontal, divided', dl('horizontal', 'md', 'yes', WORKSPACE), '160px term column, 14px medium muted terms, ink values, hairlines with 12px of padding.'),
    ex('Vertical (narrow columns)', dl('vertical', 'md', 'yes', WORKSPACE, 'width:100%;max-width:280px'), 'Term above the value, 4px apart.'),
    ex('Compact inside a card', `<section class="cn-card" data-variant="default" data-padding="sm" style="width:100%;max-width:360px"><div class="cn-card__body">${dl('horizontal', 'sm', 'no', [pair('Plan', 'Business · $2,900 / month'), pair('Seats', '12 of 15 used'), pair('Renews', 'October 1, 2026')].join(''), '')}</div></section>`, 'size sm, no dividers: three facts as a quiet block.'),
    ex('Values with components', dl('horizontal', 'md', 'yes', [pair('Owner', '<span class="cn-avatar-label-group" data-size="sm"><span class="cn-avatar" data-size="xs" data-shape="circle" data-tone="neutral" data-status="none" role="img" aria-label="Maya Chen"><span class="cn-avatar__fallback" aria-hidden="true">MC</span></span><span class="cn-avatar-label-group__text"><span class="cn-avatar-label-group__name">Maya Chen</span></span></span>'), pair('Status', '<span class="cn-badge" data-tone="success" data-variant="soft" data-size="sm"><span class="cn-badge__dot"></span>Active</span>'), pair('Website', '<a href="#" class="cn-link">lumen.co</a>'), pair('Notes', 'Prefers email over Slack. Decision maker is the head of product, not the CEO.')].join(''))),
  ],
  rules: [
    'Terms are sentence-case nouns with no trailing colon ("Workspace ID", not "Workspace ID:"), 14px medium muted.',
    'Keep terms short (1–3 words) so they fit the 160px column; if a term needs a sentence, it is not a key/value pair.',
    'Values are facts in ink, not paragraphs. A value longer than two lines belongs in a section of its own.',
    'Empty values show an em dash ("—") in fg-subtle, never a blank cell and never the word "null" or "N/A".',
    'Order pairs by how people look things up (identity first, then status, then dates), not by the database schema.',
    'Use horizontal at ≥ 360px of width; below that, or in card grids, switch to vertical.',
    'divided="yes" for 4 or more pairs; "no" for 2–3 pairs inside a card that already has a frame.',
    'Values may hold one component (Badge sm, avatar label group, code, Link) but not buttons; actions live in the surface\'s header.',
  ],
  a11y: [
    'Use the real <dl>/<dt>/<dd> elements; the wrapping <div> per pair is valid HTML and keeps the term/detail association.',
    'Do not put interactive controls in dd besides links; a control needs a labelled form field.',
    'Abbreviated terms (ID, VAT) get an <abbr title> or the expansion in the value on first use.',
  ],
  related: ['table', 'list', 'card', 'badge', 'stat', 'avatar'],
};
