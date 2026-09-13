import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

const MARK: Record<string, string> = {
  neutral: '{color.fg-subtle}',
  accent: '{color.bg-accent}',
  success: '{color.bg-success}',
  warning: '{color.bg-warning}',
  danger: '{color.bg-danger}',
};

export const kicker: ComponentSpec = {
  name: 'Kicker',
  slug: 'kicker',
  category: 'typography',
  description: 'The signature eyebrow: mono, uppercase, letter-spaced, muted, with an optional 6×6 brand square before the text. It sits above a title and names the type of thing the title is.',
  usage: 'Above a page title, a card title or a section title ("Prospect", "Step 2 of 4", "Agent report"). Not for status (Badge), not for counts (Counter), not for form labels (Field). Never clickable: if it filters it is a Tag, if it acts it is a Button.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Inline-flex row carrying the kicker type style and the muted color. <div> above block titles, <span> when inline.' },
    { part: 'mark', element: 'span', description: 'Optional 6×6px square before the text, radius 1.5px, filled with the tone color (brand accent by default). Empty, decorative.', optional: true },
  ],
  props: {
    mark: { values: ['none', 'square', 'dot'], default: 'none', description: 'none = plain text (section subheading); square = 6px brand square before the text (Vero family signature); dot = round marker.' },
    tone: {
      values: ['neutral', 'accent', 'success', 'warning', 'danger'],
      default: 'accent',
      description: 'Color of the mark only; the text always stays fg-subtle. accent = the brand square (default: page and card titles); neutral = grey square for secondary sections; success/warning/danger = the section is about a state ("Verified", "Needs review", "Blocked").',
    },
    size: {
      values: ['sm', 'md'],
      default: 'sm',
      description: 'sm = 11px, the canonical kicker above card titles and inside tables (equals the kicker type style, so markup without data-size renders sm); md = 12px for page-level eyebrows and marketing sections.',
    },
  },
  states: {},
  base: {
    root: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.2}',
      ...typeStyle('kicker'),
      'text-transform': 'uppercase',
      color: '{color.fg-subtle}',
      'max-width': '100%',
    },
    mark: { width: '6px', height: '6px', 'border-radius': '1.5px', 'background-color': '{color.bg-accent}', 'flex-shrink': '0' },
  },
  variants: {
    mark: { none: { mark: { display: 'none' } }, square: { mark: { display: 'inline-block' } }, dot: { mark: { display: 'inline-block', 'border-radius': '{radius.full}' } } },
    tone: Object.fromEntries(Object.entries(MARK).map(([t, c]) => [t, { mark: { 'background-color': c } }])),
    size: {
      sm: { root: { 'font-size': '{font.size.2xs}' } },
      md: { root: { 'font-size': '{font.size.xs}', gap: '{space.2.5}' }, mark: { width: '7px', height: '7px' } },
    },
  },
  examples: [
    ex('With mark', `<div class="cn-kicker" data-tone="accent" data-size="sm"><span class="cn-kicker__mark"></span>Prospect</div>`),
    ex('Text only', `<div class="cn-kicker" data-tone="accent" data-size="sm">Step 2 of 4 · Sourcing</div>`, 'No mark for secondary eyebrows and inline uses.'),
    ex('Tones', `<div class="cn-kicker" data-tone="accent" data-size="sm"><span class="cn-kicker__mark"></span>Prospect</div> <div class="cn-kicker" data-tone="neutral" data-size="sm"><span class="cn-kicker__mark"></span>Archive</div> <div class="cn-kicker" data-tone="success" data-size="sm"><span class="cn-kicker__mark"></span>Verified</div> <div class="cn-kicker" data-tone="warning" data-size="sm"><span class="cn-kicker__mark"></span>Needs review</div> <div class="cn-kicker" data-tone="danger" data-size="sm"><span class="cn-kicker__mark"></span>Blocked</div>`, 'Only the mark changes color. The text is always muted.'),
    ex('Page-level (md)', `<div class="cn-kicker" data-tone="accent" data-size="md"><span class="cn-kicker__mark"></span>Agent report</div>`),
  ],
  recipes: [
    ex('Above a title', `<div><div class="cn-kicker" data-tone="accent" data-size="sm"><span class="cn-kicker__mark"></span>Prospect</div><h2 class="cn-text-heading-lg" style="margin-top:var(--cn-space-2)">Nakamura Trading Co.</h2><p class="cn-text-body-sm" style="color:var(--cn-color-fg-muted);margin-top:var(--cn-space-1)">Osaka, Japan · Importer of frozen seafood</p></div>`, 'Kicker names the type, the title names the thing. space.2 between them.'),
  ],
  rules: [
    'One kicker per title, directly above it, with space.2 between them. Never two kickers stacked.',
    'The kicker names the TYPE of thing; the title names the thing: "Prospect / Nakamura Trading Co.", never "Nakamura / Prospect".',
    '1–3 words. Write the source in sentence case ("Needs review"); the CSS uppercases it.',
    'The text is always fg-subtle. Never color the text; tone colors only the mark.',
    'Never a badge: no background, no border, no pill. Never clickable.',
    'The mark goes only on the primary kicker of a surface (page title, card title). Inline and table uses go without the mark.',
    'Do not use the kicker as a form label; Field labels are label-md in sentence case.',
    'Column headers, chart legends and stat labels already speak in this voice through their own parts; do not nest a Kicker inside them.',
  ],
  a11y: [
    'The mark is an empty decorative span; screen readers skip it. Do not put text or an icon inside it.',
    'The kicker is plain text, not a heading: no heading role, no aria-level. It is associated with the title by reading order.',
    'Uppercasing is CSS, so assistive tech reads the source case ("Prospect", not letter by letter).',
    'fg-subtle at 11px medium mono meets AA on canvas and surface; do not place kickers on tinted or dark backgrounds.',
  ],
  related: ['badge', 'card', 'stat', 'table', 'divider'],
};
