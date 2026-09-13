import type { ComponentSpec } from '../types.ts';
import { TRANSITION_ALL, ex, typeStyle } from './_shared.ts';

// a board in the reference's card language: transparent columns with a 14px semibold title, a
// 22px count badge and an owner badge; cards as small white cards (radius 12, gray-200 ring,
// shadow-xs, 16px padding) with a 14px medium title, a muted meta line and a status + avatar
// footer; gray-50 drop zones.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

const badge = (text: string, tone: string, dot = false) =>
  `<span class="cn-badge" data-tone="${tone}" data-variant="soft" data-size="sm">${dot ? '<span class="cn-badge__dot"></span>' : ''}${text}</span>`;
const avatar = (t: string, name: string) =>
  `<span class="cn-avatar" data-size="xs" data-shape="circle" data-tone="neutral" data-status="none" role="img" aria-label="${name}"><span class="cn-avatar__fallback" aria-hidden="true">${t}</span></span>`;

const card = (title: string, meta: string, status: string, owner: [string, string], extra = '') =>
  `<article class="cn-kanban__card" tabindex="0"${extra}><h4 class="cn-kanban__card-title">${title}</h4><div class="cn-kanban__card-meta">${meta}</div><div class="cn-kanban__card-footer">${status}${avatar(owner[0], owner[1])}</div></article>`;

const column = (owner: string, title: string, ownerLabel: string, cards: string[], bodyExtra = '') =>
  `<section class="cn-kanban__column" data-owner="${owner}" aria-label="${title}, ${cards.length} tasks"><header class="cn-kanban__column-header"><h3 class="cn-kanban__column-title">${title}</h3><span class="cn-kanban__column-count">${cards.length}</span><span class="cn-kanban__column-owner">${ownerLabel}</span></header><div class="cn-kanban__column-body"${bodyExtra}>${cards.join('')}</div></section>`;

const MAYA: [string, string] = ['MC', 'Maya Chen'];
const DANIEL: [string, string] = ['DC', 'Daniel Costa'];
const SOFIA: [string, string] = ['SA', 'Sofia Almeida'];
const LUCAS: [string, string] = ['LF', 'Lucas Ferreira'];

const BOARD = (density: string, dragging = false) =>
  `<div class="cn-kanban" data-density="${density}" role="list" aria-label="Q3 launch board">${column('agent', 'In progress', 'Engineering', [
    card('Migrate billing to usage-based plans', 'LUM-241 · Due Sep 19', badge('In progress', 'accent', true), DANIEL),
    card('Design the new onboarding checklist', 'LUM-233 · Due Sep 15', badge('In review', 'accent', true), SOFIA, dragging ? ' data-state="dragging"' : ''),
    card('Rate-limit the public API', 'LUM-228 · Due Sep 22', badge('In progress', 'accent', true), LUCAS),
  ])}${column('you', 'Waiting on you', 'Product', [
    card('Approve pricing page copy', 'LUM-250 · Due today', badge('Needs approval', 'warning'), MAYA),
    card('Review Q3 roadmap', 'LUM-247 · Due Sep 12', badge('Review', 'neutral'), MAYA),
  ], dragging ? ' data-over' : '')}${column('action', 'Blocked', 'Needs action', [
    card('SSO login fails for Okta tenants', 'LUM-252 · Reported 2h ago', badge('Blocked', 'danger'), DANIEL),
    card('Invoice emails delayed', 'LUM-249 · Reported yesterday', badge('Overdue', 'warning'), LUCAS),
  ])}</div>`;

export const kanban: ComponentSpec = {
  name: 'Kanban',
  slug: 'kanban',
  category: 'data-display',
  description: 'A board of columns with draggable cards. Columns are transparent with a header that names the stage, its count badge and who owns it; cards are small white cards (radius 12, gray-200 ring, shadow-xs) with a 14px medium title, a muted meta line and a footer of status Badge + Avatar.',
  usage: 'Work that moves through stages and is owned by someone at each stage: tasks, deals, tickets. When the stage does not matter, use a List; when people compare many fields, use a Table.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Horizontal row of columns, 24px apart, scrolls sideways, columns aligned to the top.' },
    { part: 'column', element: 'section', description: 'One stage: 320px wide (288 compact), transparent. data-owner="agent|you|action" colors the owner badge.' },
    { part: 'column-header', element: 'header', description: 'Row with title, count and owner badge, 8px apart, 36px tall.' },
    { part: 'column-title', element: 'h3', description: 'Stage name, 14px semibold in ink.' },
    { part: 'column-count', element: 'span', description: 'Number of cards in a 22px gray badge (12px medium, gray-50, gray-200 ring).' },
    { part: 'column-owner', element: 'span', description: 'Owner badge pushed to the right (12px medium, radius 6): "Engineering", "Product", "Needs action". Color follows data-owner on the column.' },
    { part: 'column-body', element: 'div', description: 'Drop zone holding the cards 12px apart, min height 128px, radius 12. data-over shows a dashed gray-300 outline on gray-50 while a card hovers over it.' },
    { part: 'card', element: 'article', description: 'One item: white, gray-200 ring, shadow-xs, radius 12, 16px padding, grab cursor, focusable. data-state="dragging" lifts it.' },
    { part: 'card-title', element: 'h4', description: 'The thing\'s name, 14px medium in ink, up to two lines.' },
    { part: 'card-meta', element: 'div', description: 'One line of context, 14px fg-muted ("LUM-241 · Due Sep 19").' },
    { part: 'card-footer', element: 'div', description: 'Status (Badge sm) on the left, owner (Avatar xs) on the right, 8px above.' },
  ],
  props: {
    density: {
      values: ['compact', 'default'],
      default: 'default',
      description: 'default = 320px columns, 16px card padding, 12px between cards (boards with up to ~8 cards per column); compact = 288px columns, 12px card padding, 8px between cards, for boards with many cards.',
    },
  },
  states: {
    cardHover: { selector: ' > * > * > article:hover', description: 'On a card, not the root: the ring darkens to gray-300.', markup: 'native :hover on the card' },
    cardFocus: { selector: ' > * > * > article:focus-visible', description: 'On a card: the 4px brand focus ring (cards are focusable for keyboard moves).', markup: 'tabindex="0" on the card; native :focus-visible' },
    cardDragging: { selector: ' > * > * > [data-state="dragging"]', description: 'On a card while it is being dragged: shadow-lg, 1° tilt, grabbing cursor.', markup: 'data-state="dragging" on the card' },
    columnOver: { selector: ' > * > [data-over]', description: 'On a column body while a card is dragged over it: dashed gray-300 border on a gray-50 fill.', markup: 'data-over on the column body' },
  },
  base: {
    root: {
      display: 'flex',
      'align-items': 'flex-start',
      gap: '{space.6}',
      width: '100%',
      'min-width': '0',
      'overflow-x': 'auto',
      'padding-bottom': '{space.2}',
      color: '{color.fg-default}',
    },
    column: {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.3}',
      flex: '0 0 calc({space.64} + {space.16})',
      'min-width': '0',
      'background-color': 'transparent',
    },
    'column-header': {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.2}',
      padding: '0 {space.1}',
      'min-height': '{space.9}',
    },
    'column-title': { ...typeStyle('label-md'), color: '{color.fg-default}', margin: '0' },
    'column-count': {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      height: '22px',
      'min-width': '22px',
      'padding-inline': '{space.2}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-subtle}',
      'box-shadow': ring('{color.border-default}'),
      ...typeStyle('label-xs'),
      color: '{color.fg-muted}',
      'font-variant-numeric': 'tabular-nums',
    },
    'column-owner': {
      ...typeStyle('label-xs'),
      'margin-inline-start': 'auto',
      height: '22px',
      display: 'inline-flex',
      'align-items': 'center',
      padding: '0 {space.2}',
      'border-radius': '{radius.md}',
      'background-color': '{color.bg-subtle}',
      'box-shadow': ring('{color.border-default}'),
      color: '{color.fg-muted}',
      'white-space': 'nowrap',
    },
    'column-body': {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.3}',
      'min-height': '{space.32}',
      'border-radius': '{radius.card}',
      border: '{border.width.thin} dashed transparent',
      ...TRANSITION_ALL,
    },
    card: {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.1}',
      padding: '{space.4}',
      'background-color': '{color.bg-surface}',
      'box-shadow': `${ring('{color.border-default}')}, {shadow.xs}`,
      'border-radius': '{radius.card}',
      cursor: 'grab',
      'min-width': '0',
      ...TRANSITION_ALL,
    },
    'card-title': { ...typeStyle('label-sm'), color: '{color.fg-default}', margin: '0', 'overflow-wrap': 'anywhere' },
    'card-meta': { display: 'flex', 'align-items': 'center', 'flex-wrap': 'wrap', gap: '{space.2}', ...typeStyle('body-md'), color: '{color.fg-muted}' },
    'card-footer': { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '{space.2}', 'margin-top': '{space.2}' },
  },
  variants: {
    density: {
      compact: {
        column: { flex: '0 0 calc({space.64} + {space.8})', gap: '{space.2}' },
        'column-body': { gap: '{space.2}' },
        card: { padding: '{space.3}', gap: '{space.0.5}' },
        'card-footer': { 'margin-top': '{space.1.5}' },
      },
      default: { card: { padding: '{space.4}' } },
    },
  },
  extraCss: `
.cn-kanban__column[data-owner="agent"] .cn-kanban__column-owner { background-color: {brand.50}; box-shadow: ${ring('{brand.200}')}; color: {brand.700}; }
.cn-kanban__column[data-owner="you"] .cn-kanban__column-owner { background-color: {color.bg-subtle}; box-shadow: ${ring('{color.border-default}')}; color: {color.fg-default}; }
.cn-kanban__column[data-owner="action"] .cn-kanban__column-owner { background-color: {amber.50}; box-shadow: ${ring('{amber.200}')}; color: {amber.700}; }
.cn-kanban__column-body[data-over] { border-color: {color.border-control}; background-color: {color.bg-subtle}; }
.cn-kanban__card:hover { box-shadow: ${ring('{color.border-control}')}, {shadow.xs}; }
.cn-kanban__card:focus-visible { outline: none; box-shadow: ${ring('{color.border-control}')}, {shadow.focus}; }
.cn-kanban__card[data-state="dragging"] { box-shadow: ${ring('{color.border-control}')}, {shadow.lg}; transform: rotate(1deg); opacity: 0.9; cursor: grabbing; }
.cn-kanban__card:active { cursor: grabbing; }`,
  examples: [
    ex('Board: in progress, waiting on you, blocked', BOARD('default'), 'Each column names its owner in a badge and shows its count. Cards carry a status Badge and the person responsible.'),
    ex('Compact, mid-drag', BOARD('compact', true), 'The second card is being dragged; the "Waiting on you" column shows the drop zone.'),
  ],
  rules: [
    'Every column names an owner with data-owner: agent (a team is working on it), you (waiting for the user) or action (something went wrong or is overdue). The owner badge is the reader\'s first question answered.',
    'Column titles are stages or owners, 1–3 words; the count badge is always shown, even when zero.',
    'Cards show exactly: title (14px medium), one meta line, one status Badge sm and one Avatar xs. No descriptions, no buttons, no menus on the card; open the record for details.',
    'Card height comes from content only; do not force equal heights or add images.',
    'Columns are 320px (288px compact) and never stretch; the board scrolls sideways. Keep it to 3–6 columns.',
    'Drop feedback is the dashed column body (data-over) and the lifted card (data-state="dragging"); do not add insertion lines or ghost cards.',
    'Empty columns keep their min-height so there is somewhere to drop; show "Nothing here" in fg-subtle 14px when a column is empty for a while.',
    'Status tone follows the owner: brand (with dot) while a team works, warning when the user must act, danger for failures, neutral otherwise.',
  ],
  a11y: [
    'The board is role="list" of columns; each column is a <section> with an aria-label that includes its title and count; each card is an <article> with a heading.',
    'Cards are focusable (tabindex="0"). Provide a keyboard way to move a card (a "Move to…" action in the record or a menu on Enter); drag and drop is never the only way.',
    'Announce moves with a polite live region ("Approve pricing page copy moved to In progress").',
    'Owner and status are text (the owner badge, the status badge), never only a color; the dot is reinforcement.',
  ],
  related: ['badge', 'avatar', 'card', 'list', 'counter'],
};
