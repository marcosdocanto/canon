import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference avatar group: stacked avatars (xs 24 · sm 32 · md 40 · lg 48) overlapping by
// 4 / 8 / 8 / 12px, each with a 1.5px surface ring, ending in a "+N" gray disc and optionally
// the dashed add button.

const SIZE: Record<string, { box: string; font: string; overlap: string; icon: string }> = {
  xs: { box: '{space.6}', font: '{font.size.xs}', overlap: '{space.1}', icon: '{size.icon.sm}' },
  sm: { box: '{space.8}', font: '{font.size.sm}', overlap: '{space.2}', icon: '{size.icon.sm}' },
  md: { box: '{space.10}', font: '{font.size.md}', overlap: '{space.2}', icon: '{size.icon.md}' },
  lg: { box: '{space.12}', font: '{font.size.lg}', overlap: '{space.3}', icon: '{size.icon.md}' },
};

const RING = '0 0 0 1.5px {color.bg-surface}';
const SILHOUETTE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";

const person = (size: string, text: string, name: string, image = false) =>
  `<span class="cn-avatar cn-avatar-group__item" data-size="${size}" data-shape="circle" data-tone="neutral" data-status="none" role="img" aria-label="${name}">${image ? `<img class="cn-avatar__image" src="${SILHOUETTE}" alt="">` : `<span class="cn-avatar__fallback" aria-hidden="true">${text}</span>`}</span>`;

const PEOPLE: [string, string][] = [['MC', 'Maya Chen'], ['DC', 'Daniel Costa'], ['SA', 'Sofia Almeida'], ['LF', 'Lucas Ferreira'], ['AK', 'Aisha Khan']];

const group = (size: string, count: number, overflow?: string, label?: string, images = false, add = false) =>
  `<div class="cn-avatar-group" data-size="${size}" role="group" aria-label="${label ?? `Assigned to ${PEOPLE.slice(0, count).map((p) => p[1]).join(', ')}`}">${PEOPLE.slice(0, count).map(([t, n], i) => person(size, t, n, images && i % 2 === 0)).join('')}${overflow ? `<span class="cn-avatar-group__overflow">${overflow}</span>` : ''}${add ? `<button type="button" class="cn-avatar-group__add" aria-label="Add person">${ICON.plus.replace('cn-icon', 'cn-avatar-group__icon')}</button>` : ''}</div>`;

export const avatarGroup: ComponentSpec = {
  name: 'AvatarGroup',
  slug: 'avatar-group',
  category: 'data-display',
  description: 'A row of overlapping avatars for the people on one thing, each separated by a 1.5px surface ring, ending in a "+3" gray disc when there are more than fit and optionally the dashed add button.',
  usage: 'Assignees, participants, watchers: several people in one slot (a table cell, a card footer, a header). One person is an Avatar, not a group of one. Not for companies or integrations.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Inline-flex row, role="group" with an aria-label that summarizes who is in it.' },
    { part: 'item', element: 'span', description: 'An Avatar root that also carries this class. Gets the 1.5px surface ring and the negative overlap; the group\'s data-size overrides the avatar size.' },
    { part: 'overflow', element: 'span', description: 'The "+N" disc, same size as the avatars, gray-50 with a gray-200 ring and 12–16px semibold gray-500 text. A <button> when it opens the full list.', optional: true },
    { part: 'add', element: 'button', description: 'The add button: a dashed gray-300 circle on white with a plus icon, same size as the avatars, 8px after the row.', optional: true },
    { part: 'icon', element: 'svg', description: 'The 16 / 20px plus icon inside the add button.', optional: true },
  ],
  props: {
    size: {
      values: ['xs', 'sm', 'md', 'lg'],
      default: 'md',
      description: 'Avatar size inside the group: xs 24px (table cells, kanban cards), sm 32px (list rows, card footers), md 40px (default: card headers), lg 48px (page headers). Pass the same value as data-size on each avatar so initials scale too.',
    },
  },
  states: {},
  base: {
    root: { display: 'inline-flex', 'align-items': 'center', 'flex-shrink': '0', 'vertical-align': 'middle' },
    item: { position: 'relative', 'flex-shrink': '0', 'box-shadow': RING },
    overflow: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      position: 'relative',
      'flex-shrink': '0',
      'padding-inline': '{space.1}',
      'padding-block': '0',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-subtle}',
      color: '{color.fg-subtle}',
      ...typeStyle('label-xs'),
      'font-weight': '{font.weight.semibold}',
      'font-variant-numeric': 'tabular-nums',
      'white-space': 'nowrap',
      'user-select': 'none',
      'box-shadow': `${RING}, inset 0 0 0 1px {color.border-default}`,
    },
    add: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      appearance: 'none',
      margin: '0',
      padding: '0',
      'margin-inline-start': '{space.2}',
      'border-radius': '{radius.full}',
      border: '{border.width.thin} dashed {color.border-control}',
      'background-color': '{color.bg-surface}',
      color: '{color.fg-subtle}',
      cursor: 'pointer',
      'transition-property': 'background-color, color, box-shadow',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    icon: { display: 'block', 'flex-shrink': '0' },
  },
  variants: {
    size: Object.fromEntries(Object.entries(SIZE).map(([s, v]) => [s, {
      item: { width: v.box, height: v.box },
      overflow: { 'min-width': v.box, height: v.box, 'font-size': v.font },
      add: { width: v.box, height: v.box },
      icon: { width: v.icon, height: v.icon },
    }])),
  },
  extraCss: `
.cn-avatar-group > .cn-avatar-group__item + .cn-avatar-group__item, .cn-avatar-group > .cn-avatar-group__item + .cn-avatar-group__overflow { margin-inline-start: calc({space.2} * -1); }
.cn-avatar-group[data-size="xs"] > .cn-avatar-group__item + .cn-avatar-group__item, .cn-avatar-group[data-size="xs"] > .cn-avatar-group__item + .cn-avatar-group__overflow { margin-inline-start: calc({space.1} * -1); }
.cn-avatar-group[data-size="lg"] > .cn-avatar-group__item + .cn-avatar-group__item, .cn-avatar-group[data-size="lg"] > .cn-avatar-group__item + .cn-avatar-group__overflow { margin-inline-start: calc({space.3} * -1); }
.cn-avatar-group > :nth-child(1) { z-index: 6; }
.cn-avatar-group > :nth-child(2) { z-index: 5; }
.cn-avatar-group > :nth-child(3) { z-index: 4; }
.cn-avatar-group > :nth-child(4) { z-index: 3; }
.cn-avatar-group > :nth-child(5) { z-index: 2; }
.cn-avatar-group > :nth-child(6) { z-index: 1; }
.cn-avatar-group > .cn-avatar-group__add { z-index: 0; }
button.cn-avatar-group__overflow { appearance: none; border: 0; margin: 0; cursor: pointer; margin-inline-start: calc({space.2} * -1); }
button.cn-avatar-group__overflow:hover { background-color: {color.bg-muted}; color: {color.fg-muted}; }
button.cn-avatar-group__overflow:focus-visible { outline: none; box-shadow: ${RING}, {shadow.focus}; }
.cn-avatar-group__add:hover { background-color: {color.bg-subtle}; color: {color.fg-muted}; }
.cn-avatar-group__add:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-avatar-group__add:disabled { opacity: {opacity.disabled}; cursor: not-allowed; }`,
  examples: [
    ex('Three people', group('md', 3, undefined, undefined, true), '40px avatars overlapping by 8px, each with the 1.5px surface ring; the first is drawn on top.'),
    ex('Five visible, then overflow', group('md', 5, '+3', 'Assigned to Maya Chen, Daniel Costa, Sofia Almeida, Lucas Ferreira, Aisha Khan and 3 others', true), 'Never more than five avatars; the gray disc carries the rest.'),
    ex('Sizes', `<div style="display:flex;align-items:center;gap:var(--cn-space-6);flex-wrap:wrap">${group('xs', 3, '+2')} ${group('sm', 3, '+2')} ${group('md', 3, '+2')} ${group('lg', 3, '+2')}</div>`, 'xs 24 · sm 32 · md 40 · lg 48; the overlap is 4 / 8 / 8 / 12px.'),
    ex('With the add button', group('md', 4, undefined, 'Maya Chen, Daniel Costa, Sofia Almeida, Lucas Ferreira', true, true), 'The dashed add button sits 8px after the row, same size as the avatars.'),
    ex('Overflow as a button', `<div class="cn-avatar-group" data-size="sm" role="group" aria-label="8 participants">${PEOPLE.slice(0, 4).map(([t, n]) => person('sm', t, n)).join('')}<button type="button" class="cn-avatar-group__overflow" aria-label="Show all 8 participants">+4</button></div>`, 'Only when clicking reveals the full list.'),
  ],
  rules: [
    'Maximum five visible avatars. Beyond that, the overflow disc shows the remaining count ("+3"); never a second row.',
    'Source order is relevance order: owner first, then assignees by recency. The first avatar is drawn on top so it is fully visible.',
    'One size and one shape per group; pass the group size as data-size on every avatar as well.',
    'Initials inside a group are fine at sm and up; at xs use a single letter so the 4px overlap does not clip them. Photos are unaffected.',
    'The overflow disc is a <span> unless clicking it opens the full list; then it is a <button> with aria-label "Show all N people".',
    'The add button belongs to groups the user can edit (assignees, members); never in read-only cells.',
    'The rings are bg-surface: place groups on surface or canvas, not on tinted fills.',
    'No status dots inside a group; the overlap hides them. Show presence in the expanded list instead.',
    'A group of one is an Avatar. A group of zero is nothing (or "Unassigned" text), never an empty disc.',
  ],
  a11y: [
    'root has role="group" and an aria-label summarizing the members ("Assigned to Maya Chen, Daniel Costa and 3 others") so it is not read one avatar at a time; each avatar keeps its own label.',
    'The overflow count is real text and is announced; as a button it needs an aria-label with the total count.',
    'The add button needs aria-label ("Add person") and is the only focusable element besides an overflow button.',
    'Overlap is visual only; the DOM order is the meaningful order.',
  ],
  related: ['avatar', 'list', 'table', 'kanban', 'card-header'],
};
