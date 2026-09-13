import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, STATE, ex, ICON, typeStyle } from './_shared.ts';

// Resting surfaces stay flat; a subtle fill communicates selection.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const TRANSITION_FAST = {
  'transition-property': 'background-color, box-shadow, transform',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const btn = (label: string, variant: string) => `<button type="button" class="cn-button" data-variant="${variant}" data-size="sm"><span class="cn-button__label">${label}</span></button>`;

export const card: ComponentSpec = {
  name: 'Card',
  slug: 'card',
  category: 'layout',
  description: 'A bounded surface for one thing: an entity, a form section, a stat. A neutral surface, a fine outline and compact corners, with a subtle fill on selected cards.',
  usage: 'Group related content that stands alone (a customer, a settings section, a KPI). Do not use cards as a layout grid for everything; lists and tables are better for collections of similar rows. Use variant="interactive" only when the whole card is one link/action. Put a CardHeader first when the card needs a title with actions.',
  anatomy: [
    { part: 'root', element: 'section', description: 'The surface: surface fill, fine outline, token-defined corners; padding via the padding prop.' },
    { part: 'header', element: 'header', description: 'Title row with optional actions on the right, inside the padding (for a full-width hairline header use CardHeader with padding none).', optional: true },
    { part: 'title', element: 'h3', description: 'heading-sm (18/28 semibold). One per card.', optional: true },
    { part: 'description', element: 'p', description: '14px fg-muted, under the title.', optional: true },
    { part: 'actions', element: 'div', description: 'Right-aligned row of ghost / outline buttons in the header, 12px apart.', optional: true },
    { part: 'body', element: 'div', description: 'Main content.' },
    { part: 'footer', element: 'footer', description: 'Meta or actions on a gray-200 hairline, 16 × 24px padding (12 / 24 / 16 in a padding="none" card, pagination footer; add data-padding="none" on the footer itself to zero it); on a subtle surface.', optional: true },
  ],
  props: {
    variant: { values: ['default', 'outlined', 'elevated', 'interactive', 'ghost'], default: 'default', description: 'default = a flat surface with a fine outline; outlined = ring only, transparent background (on white canvases); elevated = shadow-md (only on a same-color canvas); interactive = whole card is one link or action: the edge strengthens and the surface changes on hover; ghost = no ring, gray-50 fill (a quiet group inside another card).' },
    padding: { values: ['none', 'sm', 'md', 'lg'], default: 'md', description: 'Inner padding of header/body/footer: none for tables, lists and media that bleed to the edge; sm 16px (compact cards in a grid); md 24px (default); lg 32px (hero cards and settings sections).' },
  },
  states: {
    hover: { selector: ':hover', description: 'Only interactive cards react: a stronger edge and subtle fill.', markup: 'native' },
    focus: STATE.focus(),
    selected: STATE.selected(),
  },
  base: {
    root: {
      display: 'flex',
      position: 'relative',
      'flex-direction': 'column',
      'background-color': '{color.bg-surface}',
      'box-shadow': ring('{color.border-default}'),
      'border-radius': '{radius.card}',
      color: '{color.fg-default}',
      'min-width': '0',
      overflow: 'hidden',
    },
    header: { display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '{space.4}' },
    title: { ...typeStyle('heading-sm'), color: '{color.fg-default}' },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}', 'margin-top': '{space.0.5}' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.3}', 'flex-shrink': '0' },
    body: { flex: '1 1 auto', 'min-width': '0' },
    footer: { 'background-color': '{color.bg-subtle}', display: 'flex', 'align-items': 'center', gap: '{space.3}', 'border-top': HAIRLINE, ...typeStyle('body-md'), color: '{color.fg-muted}' },
    '@states': {
      selected: { root: { 'box-shadow': ring('{color.border-action}'), 'background-color': '{color.bg-action-subtle}' } },
    },
  },
  variants: {
    variant: {
      default: { root: {} },
      outlined: { root: { 'background-color': 'transparent', 'box-shadow': ring('{color.border-default}') } },
      elevated: { root: { 'box-shadow': `${ring('{color.border-subtle}')}, {shadow.md}` } },
      interactive: {
        root: { cursor: 'pointer', ...TRANSITION_FAST },
        '@states': {
          hover: { root: { 'box-shadow': ring('{color.border-control-hover}'), 'background-color': '{color.bg-subtle}' } },
          focus: { root: { ...FOCUS_RING, 'box-shadow': `${ring('{color.border-control}')}, {shadow.focus}` } },
        },
      },
      ghost: { root: { 'background-color': '{color.bg-subtle}', 'box-shadow': 'none' } },
    },
    padding: {
      none: { header: { padding: '0' }, body: { padding: '0' }, footer: { padding: '{space.3} {space.6} {space.4}' } },
      sm: { header: { padding: '{space.4} {space.4} 0' }, body: { padding: '{space.4}' }, footer: { padding: '{space.3} {space.4}' } },
      md: { header: { padding: '{space.6} {space.6} 0' }, body: { padding: '{space.6}' }, footer: { padding: '{space.4} {space.6}' } },
      lg: { header: { padding: '{space.8} {space.8} 0' }, body: { padding: '{space.8}' }, footer: { padding: '{space.5} {space.8}' } },
    },
  },
  extraCss: `
.cn-card[data-padding="md"] .cn-card__header + .cn-card__body { padding-top: {space.5}; }
.cn-card[data-padding="sm"] .cn-card__header + .cn-card__body { padding-top: {space.4}; }
.cn-card[data-padding="lg"] .cn-card__header + .cn-card__body { padding-top: {space.6}; }
.cn-card[data-padding="none"] > .cn-card__footer[data-padding="none"] { padding: 0; }`,
  examples: [
    ex('Default with header and footer', `<section class="cn-card" data-variant="default" data-padding="md" style="max-width:400px"><header class="cn-card__header"><div><h3 class="cn-card__title">Lumen website redesign</h3><p class="cn-card__description">Marketing site · Due Sep 19</p></div><div class="cn-card__actions"><button type="button" class="cn-icon-button" data-variant="ghost" data-size="sm" data-shape="square" aria-label="More actions">${ICON.dots.replace('cn-icon', 'cn-icon-button__icon')}</button></div></header><div class="cn-card__body"><p class="cn-text-body-md">12 tasks, 4 in review. Sofia Almeida owns the design track, Daniel Costa the build.</p></div><footer class="cn-card__footer">Updated 2h ago by Maya Chen</footer></section>`, 'Flat surface, fine outline, 24px padding; the footer sits on a hairline.'),
    ex('With a CardHeader and a table-like body', `<section class="cn-card" data-variant="default" data-padding="none" style="max-width:480px"><header class="cn-card-header" data-variant="default" data-size="md"><div class="cn-card-header__content"><h2 class="cn-card-header__title">Team members</h2><p class="cn-card-header__description">Manage your team and their permissions.</p></div><div class="cn-card-header__actions">${btn('Add user', 'primary')}</div></header><div class="cn-card__body" style="padding:var(--cn-space-6)"><p class="cn-text-body-md">6 members · 1 invitation pending.</p></div><footer class="cn-card__footer">${btn('Previous', 'outline')}<span style="margin-inline:auto">Page 1 of 3</span>${btn('Next', 'outline')}</footer></section>`, 'padding="none" so the CardHeader hairline spans the card; the body sets its own 24px padding.'),
    ex('Interactive and selected', `<div style="display:flex;gap:var(--cn-space-6);flex-wrap:wrap"><a href="#" class="cn-card" data-variant="interactive" data-padding="md" style="width:280px"><div class="cn-card__body"><h3 class="cn-card__title">Open the workspace</h3><p class="cn-card__description">12 projects · 3 waiting for you</p></div></a><a href="#" class="cn-card" data-variant="interactive" data-padding="md" data-selected style="width:280px"><div class="cn-card__body"><h3 class="cn-card__title">Business plan</h3><p class="cn-card__description">$2,900 / month · 15 seats</p></div></a></div>`, 'Hover strengthens the outline; selection adds an action-tinted surface.'),
    ex('Sizes of padding', `<div style="display:flex;gap:var(--cn-space-6);flex-wrap:wrap;align-items:flex-start"><section class="cn-card" data-variant="default" data-padding="sm" style="width:200px"><div class="cn-card__body cn-text-body-md">sm · 16px</div></section><section class="cn-card" data-variant="default" data-padding="md" style="width:200px"><div class="cn-card__body cn-text-body-md">md · 24px</div></section><section class="cn-card" data-variant="default" data-padding="lg" style="width:200px"><div class="cn-card__body cn-text-body-md">lg · 32px</div></section></div>`),
    ex('Outlined, elevated and ghost', `<div style="display:flex;gap:var(--cn-space-6);flex-wrap:wrap;align-items:flex-start"><section class="cn-card" data-variant="outlined" data-padding="sm" style="width:220px"><div class="cn-card__body cn-text-body-md">Outlined: ring only, no fill or shadow.</div></section><section class="cn-card" data-variant="elevated" data-padding="sm" style="width:220px"><div class="cn-card__body cn-text-body-md">Elevated: shadow-md on a same-color canvas.</div></section><section class="cn-card" data-variant="ghost" data-padding="sm" style="width:220px"><div class="cn-card__body cn-text-body-md">Ghost: a quiet gray-50 group inside another card.</div></section></div>`),
  ],
  rules: [
    'Resting cards have a fine outline. Only floating layers use elevation; interactive cards respond through their edge and surface.',
    'One title per card. Use a CardHeader (padding none) when the title needs a hairline, a badge, media or tabs; the plain header part is for simple titled cards.',
    'Do not nest default cards inside default cards. Inside a card use ghost cards, dividers or plain groups.',
    'A collection of similar items is a list or a table inside one card, not a grid of cards. Cards for a grid only when each item is visual (media) or the number is ≤ 6.',
    'Padding is a prop, never ad-hoc: md 24px by default, sm 16px in dense grids, lg 32px for hero and settings cards, none when a table, list or media fills the card.',
    'Interactive cards contain no other interactive elements (no buttons inside a link) and show a stronger edge on hover; selected cards (radio cards) carry data-selected and use the selected outline and surface tokens.',
    'Footers hold meta or the pagination / actions row, on a hairline, on a subtle surface.',
  ],
  a11y: [
    'Interactive cards are an <a> (navigation) or a <button> (action), never a div with onClick; selectable cards are radios or checkboxes with the card as their label.',
    'Use <section> with an aria-labelledby pointing to the title when the card is a landmark of the page.',
    'The focus ring follows the active token on :focus-visible; the selected ring is separate and does not replace it.',
  ],
  related: ['card-header', 'section-header', 'stat', 'list', 'table', 'divider'],
};
