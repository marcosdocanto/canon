import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference table-card header: 20 × 24px padding (16 × 20 sm), a 16px semibold title with an
// optional gray "modern" badge 8px after it, a 14px gray-600 description 2px below, an optional
// 40px avatar or modern featured icon before the text, actions 12px apart on the right, and a
// gray-200 hairline that spans the card.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const SILHOUETTE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";

const btn = (label: string, variant: string, icon?: keyof typeof ICON, size = 'md') =>
  `<button type="button" class="cn-button" data-variant="${variant}" data-size="${size}">${icon ? ICON[icon].replace('cn-icon', 'cn-button__icon') : ''}<span class="cn-button__label">${label}</span></button>`;
const iconBtn = (label: string, i: keyof typeof ICON) =>
  `<button type="button" class="cn-icon-button" data-variant="ghost" data-size="sm" data-shape="square" aria-label="${label}">${ICON[i].replace('cn-icon', 'cn-icon-button__icon')}</button>`;
const content = (title: string, description: string, badge = '') =>
  `<div class="cn-card-header__content"><h2 class="cn-card-header__title">${title}${badge}</h2><p class="cn-card-header__description">${description}</p></div>`;
const badge = (text: string, tone = 'neutral') => `<span class="cn-badge cn-card-header__badge" data-tone="${tone}" data-variant="modern" data-size="sm" data-shape="square">${text}</span>`;
const actions = (inner: string) => `<div class="cn-card-header__actions">${inner}</div>`;
const tabs = (labels: string[], current = 0) =>
  `<div class="cn-card-header__tabs"><div class="cn-tabs" data-variant="underline" data-size="sm" data-orientation="horizontal" data-width="hug">${labels.map((l, i) => `<a href="#" class="cn-tabs__tab"${i === current ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</div></div>`;
const AVATAR = `<div class="cn-card-header__media"><span class="cn-avatar" data-size="md" data-shape="circle" data-tone="neutral" data-status="online" aria-hidden="true"><img class="cn-avatar__image" src="${SILHOUETTE}" alt=""><span class="cn-avatar__status"></span></span></div>`;
const FEATURED = (i: keyof typeof ICON) => `<div class="cn-card-header__media"><span class="cn-featured-icon" data-theme="modern" data-tone="gray" data-size="md" data-shape="square">${ICON[i].replace('cn-icon', 'cn-featured-icon__icon')}</span></div>`;
const card = (header: string, body: string) =>
  `<section class="cn-card" data-variant="default" data-padding="none" style="width:100%;max-width:720px">${header}<div class="cn-card__body" style="padding:var(--cn-space-5) var(--cn-space-6)"><p class="cn-text-body-md">${body}</p></div></section>`;

export const cardHeader: ComponentSpec = {
  name: 'CardHeader',
  slug: 'card-header',
  category: 'layout',
  description: 'The header row of a Card (the reference table-card header): 20 × 24px padding, a 16px semibold title with an optional gray badge, a 14px gray-600 description, an optional 40px avatar or modern featured icon before the text and the card\'s actions on the right, closed by a gray-200 hairline that spans the card.',
  usage: 'Use as the first child of a Card that holds a table, a list, a form section or a record. It names the card and carries its actions (Import, Add user, the "more" menu). For a page title use PageHeader; for a heading between two blocks of a page use SectionHeader. Put it in a Card with data-padding="none" so the hairline reaches the card edges.',
  anatomy: [
    { part: 'root', element: 'header', description: 'Wrapping flex row inside the Card: media, text block, actions; 16px gaps, aligned to the top, hairline below. Padding from size.' },
    { part: 'media', element: 'div', description: 'Optional 40px block before the text: a modern gray FeaturedIcon (md) or an Avatar md.', optional: true },
    { part: 'content', element: 'div', description: 'Column with 2px gap: title (with optional badge) then description. Grows to push actions right.' },
    { part: 'title', element: 'h2', description: '16px semibold in ink (heading-xs); a flex row so a Badge can follow the text 8px after it.' },
    { part: 'badge', element: 'span', description: 'A cn-badge (modern, gray, sm, square) inside the title after the text (add this class to the badge): "100 users", "Beta".', optional: true },
    { part: 'description', element: 'p', description: '14px supporting text in fg-muted.', optional: true },
    { part: 'actions', element: 'div', description: 'Row of Buttons or ghost IconButtons 12px apart; the "more" menu trigger is last.', optional: true },
    { part: 'tabs', element: 'div', description: 'Full-width slot under the text for an underline Tabs sm whose bar sits on the header hairline.', optional: true },
  ],
  props: {
    variant: {
      values: ['default', 'with-badge', 'with-media', 'with-tabs'],
      default: 'default',
      description: 'default = title, description, actions. with-badge = a Badge after the title (count or state of the card). with-media = a 40px avatar or featured icon before the text (a person, a company, a feature). with-tabs = underline Tabs under the text switch views of the card\'s content.',
    },
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 20px vertical, 24px horizontal padding (table cards, settings cards). sm = 16px × 20px for compact cards in a grid or a side column.',
    },
  },
  states: {},
  base: {
    root: {
      display: 'flex',
      'flex-wrap': 'wrap',
      'align-items': 'flex-start',
      'justify-content': 'space-between',
      'column-gap': '{space.4}',
      'row-gap': '{space.4}',
      width: '100%',
      'min-width': '0',
      'border-bottom': HAIRLINE,
      'background-color': '{color.bg-surface}',
      color: '{color.fg-default}',
    },
    media: {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.10}',
      height: '{space.10}',
    },
    content: { display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}', flex: '1 1 {space.48}', 'min-width': '0' },
    title: { display: 'flex', 'align-items': 'center', 'flex-wrap': 'wrap', gap: '{space.2}', ...typeStyle('heading-xs'), color: '{color.fg-default}', 'overflow-wrap': 'anywhere' },
    badge: { 'flex-shrink': '0' },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}' },
    actions: { display: 'flex', 'align-items': 'center', 'flex-wrap': 'wrap', gap: '{space.3}', 'flex-shrink': '0', 'max-width': '100%' },
    tabs: { 'flex-basis': '100%', 'min-width': '0', 'overflow-x': 'auto' },
  },
  variants: {
    variant: {
      default: { root: {} },
      'with-badge': { root: {} },
      'with-media': { root: {} },
      'with-tabs': { root: {} },
    },
    size: {
      sm: { root: { padding: '{space.4} {space.5}' }, tabs: { 'margin-bottom': 'calc({space.4} * -1)' } },
      md: { root: { padding: '{space.5} {space.6}' }, tabs: { 'margin-bottom': 'calc({space.5} * -1)' } },
    },
  },
  extraCss: `
.cn-card-header__tabs .cn-tabs[data-variant="underline"] { border-bottom: 0; min-width: max-content; margin-bottom: 0; }
@media (max-width: {breakpoint.md}) { .cn-card-header[data-size="md"] { padding: {space.5} {space.4}; } .cn-card-header[data-size="sm"] { padding: {space.4}; } }`,
  examples: [
    ex('Default (table card)', card(`<header class="cn-card-header" data-variant="default" data-size="md">${content('Team members', 'Manage your team members and their account permissions here.')}${actions(btn('Import', 'outline', 'inbox') + btn('Add user', 'primary', 'plus'))}</header>`, '24 members · 3 pending invites · Last change 2 hours ago by Daniel Costa.'), 'Card with data-padding="none" so the header hairline spans the full width; 20 × 24px padding, 16px semibold title.'),
    ex('With badge', card(`<header class="cn-card-header" data-variant="with-badge" data-size="md">${content('Team members', 'Manage your team members and their account permissions here.', badge('100 users'))}${actions(iconBtn('More actions', 'dots'))}</header>`, 'Maya Chen, Daniel Costa, Sofia Almeida and 97 others.'), 'A modern gray badge 8px after the title; a single ghost "more" IconButton on the right.'),
    ex('With avatar', card(`<header class="cn-card-header" data-variant="with-media" data-size="md">${AVATAR}${content('Maya Chen', 'maya@lumen.co')}${actions(iconBtn('Copy email', 'copy') + iconBtn('More actions', 'dots'))}</header>`, 'Product Manager · Lisbon, Portugal · Joined March 2024.'), 'A 40px Avatar with status before the text.'),
    ex('With tabs', card(`<header class="cn-card-header" data-variant="with-tabs" data-size="md">${content('Projects', 'Everything your team is working on right now.')}${actions(btn('New project', 'primary', 'plus', 'sm'))}${tabs(['All', 'Active', 'Archived'])}</header>`, '12 active projects, 4 archived this quarter.'), 'Underline Tabs sm under the text; their brand bar sits on the header hairline.'),
    ex('Small with featured icon', card(`<header class="cn-card-header" data-variant="with-media" data-size="sm">${FEATURED('inbox')}${content('Notifications', 'Choose how you get notified.')}${actions(btn('Edit', 'outline', undefined, 'sm'))}</header>`, 'Email and push for mentions and approvals; in-app only for the rest.'), 'sm padding (16 × 20) with a 40px modern gray FeaturedIcon.'),
  ],
  rules: [
    'Use inside a Card with data-padding="none" and give the body its own padding, so the header hairline reaches the card edges.',
    'Title is a noun phrase in sentence case, 1–3 words, 16px semibold; the description is one sentence in 14px muted. Never repeat the page title in a card title.',
    'Actions: one primary Button at most, outline for the rest, ghost IconButtons for copy / more; the "more" menu is always last, 12px apart.',
    'A Badge after the title is a modern gray sm badge with a count or a state of the card content, never decoration; one per title.',
    'with-media: an Avatar md for a person or company, a modern gray FeaturedIcon md for a feature or setting. Never both.',
    'with-tabs: Tabs are underline, sm, and switch views of the card\'s own content; their bar sits on the header hairline (the tabs lose their own line).',
    'md padding (20 × 24) on table and settings cards; sm (16 × 20) on cards narrower than 400px. Under 768px the horizontal padding drops to 16.',
    'Keep the header on one row when space allows. Let actions wrap below the content before the title or description becomes a narrow column.',
  ],
  a11y: [
    'Root is a <header> inside the Card <section>; the title heading level follows the page outline (h2 under a PageHeader h1).',
    'A Badge inside the title becomes part of the heading name; keep it short and meaningful.',
    'IconButtons in actions need aria-label; the "more" trigger exposes aria-haspopup="menu".',
    'Tabs under the header are route links with aria-current="page" or a role="tablist" with aria-selected.',
    'The featured icon is decorative (aria-hidden); an Avatar whose name is the title is aria-hidden too, so the name is not read twice.',
  ],
  related: ['card', 'section-header', 'page-header', 'badge', 'avatar', 'featured-icon', 'icon-button', 'tabs', 'table'],
};
