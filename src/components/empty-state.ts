import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference empty state: a 512px centered column; a 48px modern gray featured icon (56 at lg)
// or an illustration in the header (16 / 20 / 20px below); content max 352px with a 16 / 18 / 20px
// semibold title and 14 / 14 / 16px gray-600 text (4 / 8 / 8px apart, 24 / 32 / 32px above the
// footer); actions 12px apart; optional search field and background pattern.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

const button = (label: string, variant: string, size = 'md', icon = '') =>
  `<button type="button" class="cn-button" data-variant="${variant}" data-size="${size}">${icon ? icon.replace('cn-icon', 'cn-button__icon') : ''}<span class="cn-button__label">${label}</span></button>`;
const featured = (i: keyof typeof ICON, size = 'lg') => `<span class="cn-featured-icon cn-empty-state__icon" data-theme="modern" data-tone="gray" data-size="${size}" data-shape="square">${ICON[i].replace('cn-icon', 'cn-featured-icon__icon')}</span>`;
/** A quiet inline illustration (a stack of documents) drawn with token variables. */
const ILLUSTRATION = `<svg class="cn-empty-state__illustration" viewBox="0 0 152 120" aria-hidden="true"><ellipse cx="76" cy="108" rx="60" ry="6" fill="var(--cn-color-bg-muted)"/><rect x="38" y="30" width="76" height="74" rx="8" fill="var(--cn-color-bg-surface)" stroke="var(--cn-color-border-control)" stroke-width="1.5"/><rect x="46" y="22" width="76" height="74" rx="8" fill="var(--cn-color-bg-surface)" stroke="var(--cn-color-border-control)" stroke-width="1.5"/><rect x="54" y="14" width="76" height="74" rx="8" fill="var(--cn-color-bg-surface)" stroke="var(--cn-color-border-control)" stroke-width="1.5"/><rect x="66" y="30" width="36" height="6" rx="3" fill="var(--cn-color-bg-muted)"/><rect x="66" y="44" width="52" height="6" rx="3" fill="var(--cn-color-bg-subtle)"/><rect x="66" y="58" width="44" height="6" rx="3" fill="var(--cn-color-bg-subtle)"/><circle cx="110" cy="80" r="14" fill="var(--cn-color-bg-action-subtle)" stroke="var(--cn-color-bg-action)" stroke-width="1.5"/><path d="M104.5 80.5l3.5 3.5 7-7.5" fill="none" stroke="var(--cn-color-bg-action)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SEARCH = `<div class="cn-empty-state__search cn-input" data-variant="default" data-size="md">${ICON.search.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="search" placeholder="Search" aria-label="Search" value="Osaka"></div>`;
const state = (o: { size?: string; variant?: string; header?: string; title: string; description?: string; actions?: string; search?: string; style?: string }) =>
  `<div class="cn-empty-state" data-size="${o.size ?? 'md'}" data-variant="${o.variant ?? 'default'}"${o.style ? ` style="${o.style}"` : ''}>${o.header ? `<div class="cn-empty-state__header">${o.header}</div>` : ''}<h3 class="cn-empty-state__title">${o.title}</h3>${o.description ? `<p class="cn-empty-state__description">${o.description}</p>` : ''}${o.search ?? ''}${o.actions ? `<div class="cn-empty-state__actions">${o.actions}</div>` : ''}</div>`;

export const emptyState: ComponentSpec = {
  name: 'EmptyState',
  slug: 'empty-state',
  category: 'feedback',
  description: 'What a region shows when it has nothing to show, in the reference layout: a modern gray featured icon (or a quiet illustration) above a short semibold title, one sentence of help capped at 352px and the actions that fill it. Centered, narrow, calm.',
  usage: 'Empty collections (no projects yet), empty filters and searches (no results), empty slots (no file uploaded) and drop zones. Not for errors (Alert) and not for loading (Skeleton).',
  anatomy: [
    { part: 'root', element: 'div', description: 'Centered column, max width 512px, padding from size. Plain, card or dashed frame.' },
    { part: 'header', element: 'div', description: 'Optional wrapper for the featured icon or illustration, 16 / 20 / 20px above the title (24 with an illustration).', optional: true },
    { part: 'icon', element: 'span', description: 'A FeaturedIcon (theme modern, tone gray, 48px; 56px at lg) that also carries this class; or a bare 24px line icon in fg-subtle for the smallest inline states. Decorative.', optional: true },
    { part: 'illustration', element: 'svg', description: 'An inline SVG illustration (≈152 × 120) drawn with token variables: documents, a cloud, a box, a credit card.', optional: true },
    { part: 'title', element: 'h3', description: '16 / 18 / 20px semibold in ink: what is empty, in plain words ("No projects yet").' },
    { part: 'description', element: 'p', description: 'One sentence, 14px (16px at lg) fg-muted, max 352px: why it is empty or what will fill it.', optional: true },
    { part: 'search', element: 'div', description: 'Optional search Input (max 352px) between the text and the actions for "no results" states, so the user can refine the query in place.', optional: true },
    { part: 'actions', element: 'div', description: 'Row of one primary Button and optionally one secondary (outline) Button, 12px apart, 24 / 32 / 32px below the text.', optional: true },
  ],
  props: {
    size: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'sm = inline in a card, table body or chart (16px title, 14px text, 48px icon, 4px text gap); md = a page section (18px title, 14px text, 48px icon, 8px gap); lg = a whole empty page (20px title, 16px text, 56px icon).',
    },
    variant: {
      values: ['default', 'card', 'dashed', 'illustration', 'with-search'],
      default: 'default',
      description: 'default = no frame, a featured icon in the header (inside a Card, table or panel); card = white with a gray-200 ring, shadow-xs and radius 12 (standalone on the canvas); dashed = dashed gray-300 border, transparent, for drop zones and "create your first" slots; illustration = an inline SVG illustration in the header instead of the icon (24px below it); with-search = a search field under the text for "no results" states.',
    },
  },
  states: {},
  base: {
    root: {
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      'text-align': 'center',
      gap: '{space.2}',
      padding: '{space.12} {space.6}',
      width: '100%',
      'max-width': 'calc({space.64} * 2)',
      'margin-inline': 'auto',
      color: '{color.fg-default}',
    },
    header: { position: 'relative', display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'margin-bottom': '{space.3}' },
    icon: { 'flex-shrink': '0', 'margin-bottom': '{space.3}' },
    illustration: { display: 'block', width: '152px', height: 'auto', 'max-width': '100%' },
    title: { ...typeStyle('heading-sm'), color: '{color.fg-default}', margin: '0', 'max-width': 'calc({space.64} + {space.24})' },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}', 'max-width': 'calc({space.64} + {space.24})', margin: '0' },
    search: { width: '100%', 'max-width': 'calc({space.64} + {space.24})', 'margin-top': '{space.4}' },
    actions: { display: 'flex', 'flex-wrap': 'wrap', 'justify-content': 'center', 'align-items': 'center', gap: '{space.3}', 'margin-top': '{space.6}' },
  },
  variants: {
    size: {
      sm: { root: { padding: '{space.8} {space.4}', gap: '{space.1}' }, header: { 'margin-bottom': '{space.3}' }, icon: { 'margin-bottom': '{space.3}' }, title: { ...typeStyle('heading-xs') }, actions: { 'margin-top': '{space.5}' } },
      md: { root: { padding: '{space.12} {space.6}' } },
      lg: { root: { padding: '{space.16} {space.8}' }, title: { 'font-size': '{font.size.xl}', 'line-height': '{font.lineHeight.normal}' }, description: { ...typeStyle('body-lg') } },
    },
    variant: {
      default: { root: {} },
      card: { root: { 'background-color': '{color.bg-surface}', 'box-shadow': `${ring('{color.border-default}')}, {shadow.xs}`, 'border-radius': '{radius.card}' } },
      dashed: { root: { 'background-color': 'transparent', border: '{border.width.thin} dashed {color.border-control}', 'border-radius': '{radius.card}' } },
      illustration: { header: { 'margin-bottom': '{space.4}' } },
      'with-search': { root: {} },
    },
  },
  extraCss: `
.cn-empty-state__header > .cn-empty-state__icon { margin-bottom: 0; }
svg.cn-empty-state__icon { width: {size.icon.lg}; height: {size.icon.lg}; color: {color.fg-subtle}; }
.cn-empty-state[data-size="lg"] .cn-featured-icon.cn-empty-state__icon { width: {space.14}; height: {space.14}; border-radius: {radius.xl}; }
.cn-empty-state[data-size="lg"] .cn-featured-icon.cn-empty-state__icon > .cn-featured-icon__icon { width: {size.icon.xl}; height: {size.icon.xl}; }
.cn-empty-state__title + .cn-empty-state__search, .cn-empty-state__description + .cn-empty-state__search { margin-top: {space.4}; }
.cn-empty-state__search + .cn-empty-state__actions { margin-top: {space.4}; }
.cn-empty-state[data-variant="dashed"] .cn-empty-state__icon { margin-bottom: {space.3}; }`,
  examples: [
    ex('No projects yet (default md)', state({ header: featured('copy'), title: 'No projects yet', description: 'Projects keep your team\'s work in one place. Create the first one or import from another tool.', actions: button('Import', 'outline') + button('New project', 'primary', 'md', ICON.plus) }), 'A 48px modern gray featured icon 20px above an 18px semibold title, 14px gray-600 text capped at 352px, two buttons 12px apart 32px below.'),
    ex('Illustration', state({ variant: 'illustration', header: ILLUSTRATION, title: 'You\'re all caught up', description: 'Every task assigned to you is done. New work will show up here as soon as a teammate assigns it.', actions: button('View all tasks', 'link-color', 'md') }), 'An inline SVG illustration (documents) in the header, 24px above the title.'),
    ex('No results, with search (sm)', state({ size: 'sm', variant: 'with-search', header: featured('search'), title: 'No customers found', description: 'Your search “Osaka” did not match any customers. Try a different name or clear the filters.', search: SEARCH, actions: button('Clear search', 'outline', 'sm') + button('New customer', 'primary', 'sm', ICON.plus) }), 'The search field sits between the text and the actions so the query can be refined in place; 16px title.'),
    ex('Drop zone (dashed)', state({ variant: 'dashed', header: featured('inbox', 'md'), title: 'Drop a CSV here', description: 'One customer per row, with at least a name and an email address.', actions: button('Choose file', 'outline'), style: 'max-width:512px' }), 'Dashed gray-300 frame with a 40px modern icon; the button is the keyboard path.'),
    ex('Whole page (lg, card)', state({ size: 'lg', variant: 'card', header: featured('inbox', 'xl'), title: 'Nothing waiting for you', description: 'Your team is working on 12 tasks. You will see reviews and approvals here as soon as they need a decision.', actions: button('See what the team is doing', 'outline') }), '56px icon, 20px title, 16px text; the white card frame when the empty state is the whole canvas region.'),
    ex('Inline in a chart or table body', `<div class="cn-empty-state" data-size="sm" data-variant="default">${ICON.search.replace('cn-icon', 'cn-empty-state__icon')}<h3 class="cn-empty-state__title">No results for “Osaka”</h3><p class="cn-empty-state__description">Try a wider region or clear the score filter.</p><div class="cn-empty-state__actions">${button('Clear filters', 'link-color', 'sm')}</div></div>`, 'The bare 24px line icon for the smallest inline states, no header wrapper.'),
  ],
  rules: [
    'Title says what is empty in the user\'s words ("No projects yet", "Nothing waiting for you"), never "No data", "Empty" or "404".',
    'Description is one sentence, 14px, capped at 352px, that says why or what will fill it; skip it when the title is enough.',
    'One primary action at most, and only if the user can fill the region from here; a second action is outline or link-color, 12px before it.',
    'The header holds one thing: a modern gray FeaturedIcon (48px, 56 at lg), an illustration, or a file icon. Never a colored disc, never an emoji.',
    'Filter-empty ("No results for X") is size sm with the with-search variant, keeps the filters visible and offers "Clear search"; it never uses a card or dashed frame.',
    'Use dashed only for drop zones and "create the first one" slots; card only when the empty state is the whole canvas region; illustration for onboarding moments, not for every empty table.',
    'Loading is not empty: show a Skeleton until the data arrives, then the EmptyState if it is truly empty.',
    'Do not center the empty state vertically in a tall page; keep it at the top with its padding so it reads like content.',
  ],
  a11y: [
    'The title is a real heading at the level of the region it replaces (h2 for a page, h3 for a card); do not skip levels.',
    'The featured icon and illustration are aria-hidden; nothing in the empty state depends on them.',
    'When the empty state appears after a filter or search, announce it with aria-live="polite" on the region so the change is heard.',
    'Drop zones also work by keyboard: the "Choose file" Button opens the file picker; the dashed area is not the only way.',
    'A search field inside the empty state keeps the current query as its value and has an aria-label.',
  ],
  related: ['featured-icon', 'skeleton', 'alert', 'button', 'input', 'card', 'table', 'list', 'file-dropzone'],
};
