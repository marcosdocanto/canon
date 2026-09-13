import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// Star rating for display: five stars painted amber when filled and border-strong when empty, a
// numeric value in label-sm and a muted count. The badge variant packs five 12px stars and the value
// into a hairline pill for testimonials and marketing cards.

const STAR = 'M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L10 14.9l-5.3 2.8 1.1-5.9L1.5 7.7l5.9-.8z';
const star = (filled: 'true' | 'half' | 'false') =>
  filled === 'half'
    ? `<svg class="cn-rating__star" data-filled="half" viewBox="0 0 20 20" aria-hidden="true"><path d="${STAR}"/><path d="${STAR}"/></svg>`
    : `<svg class="cn-rating__star" data-filled="${filled}" viewBox="0 0 20 20" aria-hidden="true"><path d="${STAR}"/></svg>`;
/** Five stars for a value between 0 and 5; a fraction ≥ .25 and < .75 renders a half star. */
const stars = (value: number) => Array.from({ length: 5 }, (_, i) => star(value >= i + 0.75 ? 'true' : value >= i + 0.25 ? 'half' : 'false')).join('');

const rate = (o: { variant?: string; size?: string; value: number; label: string; inner: string }) =>
  `<div class="cn-rating" data-variant="${o.variant ?? 'stars'}" data-size="${o.size ?? 'md'}" role="img" aria-label="${o.label}">${o.inner}</div>`;

export const rating: ComponentSpec = {
  name: 'Rating',
  slug: 'rating',
  category: 'data-display',
  description: 'Read-only star rating: five stars (filled amber, half, or empty in the hairline color), an optional numeric value and a muted count. The badge variant packs five small stars and the value into a hairline pill; inline shows one star with the number for dense rows.',
  usage: 'Display reviews, satisfaction scores and quality grades next to a product, a vendor or a testimonial. It is not an input: for collecting a rating use a Radio group of stars. Do not use stars for anything that is not a rating (priority, importance).',
  anatomy: [
    { part: 'root', element: 'div', description: 'Inline row (flex, align center, gap space.1). role="img" with aria-label "4.5 out of 5 stars, 128 reviews". Carries data-variant and data-size.' },
    { part: 'star', element: 'svg', description: 'One star. data-filled="true" paints it amber, "false" the hairline color, "half" splits it with a clip on the right half. 16px (sm) or 20px (md); 12px inside the badge.' },
    { part: 'value', element: 'span', description: 'The number ("4.5"), label-sm, tabular. Follows the stars with a small gap.', optional: true },
    { part: 'count', element: 'span', description: 'Muted body-sm context: "(128 reviews)", "from 1,240 reviews".', optional: true },
    { part: 'badge', element: 'span', description: 'Hairline pill (surface fill, radius full, padding-inline space.2) holding five 12px stars and the value. Used by the badge variant.', optional: true },
  ],
  props: {
    variant: {
      values: ['stars', 'badge', 'inline'],
      default: 'stars',
      description: 'stars = five stars with an optional value and count, for product pages and vendor cards; badge = a pill with five small stars and the value, followed by muted text, for testimonials and marketing proof lines; inline = a single star plus the value (and count), for table cells, list rows and compact cards.',
    },
    size: { values: ['sm', 'md'], default: 'md', description: 'md = 20px stars with label-sm value (cards, headers); sm = 16px stars with label-xs value (rows, dense lists). The badge always uses 12px stars.' },
  },
  states: {},
  base: {
    root: { display: 'inline-flex', 'align-items': 'center', gap: '{space.1}', 'vertical-align': 'middle', color: '{color.fg-default}' },
    star: { display: 'block', 'flex-shrink': '0', width: '{size.icon.lg}', height: '{size.icon.lg}', fill: '{color.border-strong}' },
    value: { 'margin-inline-start': '{space.1}', ...typeStyle('label-sm'), 'font-variant-numeric': 'tabular-nums', color: '{color.fg-default}' },
    count: { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'white-space': 'nowrap' },
    badge: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.0.5}',
      height: '{space.6}',
      'padding-inline': '{space.2}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-default}',
      'border-radius': '{radius.full}',
      'box-shadow': '{shadow.xs}',
      'white-space': 'nowrap',
    },
  },
  variants: {
    variant: {
      stars: { root: {} },
      badge: { root: { gap: '{space.2}' }, star: { width: '{size.icon.xs}', height: '{size.icon.xs}' }, value: { ...typeStyle('label-xs'), 'margin-inline-start': '{space.1}' } },
      inline: { root: { gap: '{space.1.5}' }, value: { 'margin-inline-start': '0' } },
    },
    size: {
      sm: { star: { width: '{size.icon.md}', height: '{size.icon.md}' }, value: { 'font-size': '{font.size.xs}' }, count: { 'font-size': '{font.size.xs}' } },
      md: { star: { width: '{size.icon.lg}', height: '{size.icon.lg}' } },
    },
  },
  extraCss: `
.cn-rating .cn-rating__star[data-filled="true"] { fill: {amber.400}; }
.cn-rating .cn-rating__star[data-filled="half"] path:last-child { fill: {amber.400}; clip-path: inset(0 50% 0 0); }
.cn-rating[data-variant="badge"] .cn-rating__star { width: {size.icon.xs}; height: {size.icon.xs}; }`,
  examples: [
    ex('Stars with value and count', rate({ value: 4.5, label: '4.5 out of 5 stars, 128 reviews', inner: `${stars(4.5)}<span class="cn-rating__value">4.5</span><span class="cn-rating__count">(128 reviews)</span>` }), 'Four filled stars, one half star, the number and the count.'),
    ex('Stars only', rate({ value: 5, label: '5 out of 5 stars', inner: stars(5) }), 'When the number is shown elsewhere (a heading, a table column).'),
    ex('Badge (proof line)', rate({ variant: 'badge', value: 4.9, label: '4.9 out of 5 stars from 1,240 reviews', inner: `<span class="cn-rating__badge">${stars(4.9)}<span class="cn-rating__value">4.9</span></span><span class="cn-rating__count">from 1,240 reviews</span>` }), 'Five 12px stars and the value inside a hairline pill, the count as muted text after it.'),
    ex('Inline (rows and cells)', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-2);align-items:flex-start">${rate({ variant: 'inline', value: 4.8, label: '4.8 out of 5 stars, 312 reviews', inner: `${star('true')}<span class="cn-rating__value">4.8</span><span class="cn-rating__count">(312)</span>` })}${rate({ variant: 'inline', size: 'sm', value: 3.6, label: '3.6 out of 5 stars, 41 reviews', inner: `${star('true')}<span class="cn-rating__value">3.6</span><span class="cn-rating__count">(41)</span>` })}</div>`, 'One star and the number; the count in parentheses.'),
    ex('Sizes', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-2);align-items:flex-start">${rate({ size: 'sm', value: 4, label: '4 out of 5 stars', inner: `${stars(4)}<span class="cn-rating__value">4.0</span>` })}${rate({ size: 'md', value: 4, label: '4 out of 5 stars', inner: `${stars(4)}<span class="cn-rating__value">4.0</span>` })}</div>`, '16px stars (sm) and 20px stars (md).'),
    ex('Low and empty', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-2);align-items:flex-start">${rate({ value: 2.3, label: '2.3 out of 5 stars, 9 reviews', inner: `${stars(2.3)}<span class="cn-rating__value">2.3</span><span class="cn-rating__count">(9 reviews)</span>` })}${rate({ value: 0, label: 'No ratings yet', inner: `${stars(0)}<span class="cn-rating__count">No ratings yet</span>` })}</div>`, 'Empty stars stay visible in the hairline color so the scale is always readable.'),
  ],
  recipes: [
    ex('Testimonial header', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-2);max-width:420px">${rate({ variant: 'badge', value: 5, label: '5 out of 5 stars', inner: `<span class="cn-rating__badge">${stars(5)}<span class="cn-rating__value">5.0</span></span>` })}<p class="cn-text-body-md" style="margin:0">“Lumen found the buyers we had been chasing for two years in one afternoon.”</p><p class="cn-text-body-sm" style="margin:0;color:var(--cn-color-fg-muted)">Elena Rossi, Head of Procurement</p></div>`, 'Badge above the quote, attribution in muted text below.'),
  ],
  rules: [
    'Always five stars. Fill from the left; a fraction from .25 to .75 is a half star, never a partial fill at other widths.',
    'Filled stars are amber, empty stars the hairline color. Never recolor stars by brand or by score; the number carries the nuance.',
    'Show the value with one decimal ("4.5", "4.0") and the count with a thousands separator ("1,240 reviews"). Round the value, never the count.',
    'stars on product and vendor pages; inline in tables, lists and compact cards; badge only on marketing and testimonial blocks.',
    'With fewer than 5 reviews show the count and no value; with 0 show empty stars and "No ratings yet".',
    'Rating is display only. Collecting a rating is a form control (Radio group of stars) with its own focus and keyboard behavior.',
    'Sizes match the surrounding text: sm next to body-sm, md next to body-md and headings.',
  ],
  a11y: [
    'The root is role="img" with aria-label that states the score and the count ("4.5 out of 5 stars, 128 reviews"); the stars are aria-hidden.',
    'The visible value and count repeat the aria-label content, so sighted and screen-reader users get the same information.',
    'Color is not the only cue: filled and empty stars differ in luminance and the number is always available nearby or in the label.',
  ],
  related: ['badge', 'stat', 'card', 'radio'],
};
