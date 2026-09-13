import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

const btn = (v: string, label: string, size = 'md') => `<button type="button" class="cn-button" data-variant="${v}" data-size="${size}"><span class="cn-button__label">${label}</span></button>`;

export const sectionHeader: ComponentSpec = {
  name: 'SectionHeader',
  slug: 'section-header',
  category: 'layout',
  description: 'Heading row of a section inside a page or a card: title, supporting text, optional badge, tabs or search, and section-level actions. Smaller than PageHeader.',
  usage: 'Above tables, forms, lists and settings groups. Use inside Card as its header row when the card holds a data set. Do not use for the page title (PageHeader).',
  anatomy: [
    { part: 'root', element: 'div', description: 'Flex row with a bottom hairline (divider prop).' },
    { part: 'content', element: 'div', description: 'Title + description column.' },
    { part: 'title', element: 'h2', description: 'heading-sm (18/28 semibold) with optional inline badge.' },
    { part: 'badge', element: 'span', description: 'Optional count/status badge after the title (Badge markup).', optional: true },
    { part: 'description', element: 'p', description: 'body-md in fg-muted.' },
    { part: 'actions', element: 'div', description: 'Right-aligned buttons (sm or md).' },
    { part: 'tabs', element: 'div', description: 'Optional Tabs (pill/button variant) in the actions slot or below.', optional: true },
    { part: 'search', element: 'div', description: 'Optional search Input (width 280) in the actions slot.', optional: true },
  ],
  props: {
    variant: { values: ['default', 'with-badge', 'with-tabs', 'with-search', 'card'], default: 'default', description: 'default; with-badge = count/status next to the title; with-tabs = filter tabs on the right; with-search = search input on the right; card = padding for use as a Card header (20/24px) with the divider.' },
    divider: { values: ['yes', 'no'], default: 'yes', description: 'Hairline under the header.' },
  },
  states: {},
  base: {
    root: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '{space.4}', 'padding-bottom': '{space.5}' },
    content: { display: 'flex', 'flex-direction': 'column', gap: '{space.1}', 'min-width': '0', flex: '1 1 280px' },
    title: { ...typeStyle('heading-sm'), color: '{color.fg-default}', display: 'flex', 'align-items': 'center', gap: '{space.2}', 'flex-wrap': 'wrap' },
    badge: { 'flex-shrink': '0' },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.3}', 'flex-shrink': '0', 'flex-wrap': 'wrap' },
    tabs: { 'flex-shrink': '0' },
    search: { width: '280px', 'max-width': '100%' },
  },
  variants: {
    variant: {
      default: { root: {} },
      'with-badge': { root: {} },
      'with-tabs': { root: {} },
      'with-search': { root: {} },
      card: { root: { padding: '{space.5} {space.6}' } },
    },
    divider: { yes: { root: { 'border-bottom': '{border.width.thin} solid {color.border-default}' } }, no: { root: { 'padding-bottom': '0' } } },
  },
  extraCss: `
.cn-section-header[data-variant="card"][data-divider="no"] { padding-bottom: {space.5}; }
@media (max-width: {breakpoint.md}) { .cn-section-header .cn-section-header__actions { width: 100%; } .cn-section-header .cn-section-header__search { width: 100%; } }`,
  examples: [
    ex('Default', `<div class="cn-section-header" data-variant="default" data-divider="yes"><div class="cn-section-header__content"><h2 class="cn-section-header__title">Personal info</h2><p class="cn-section-header__description">Update your photo and personal details here.</p></div><div class="cn-section-header__actions">${btn('outline', 'Cancel')}${btn('primary', 'Save')}</div></div>`),
    ex('With badge', `<div class="cn-section-header" data-variant="with-badge" data-divider="yes"><div class="cn-section-header__content"><h2 class="cn-section-header__title">Team members <span class="cn-section-header__badge cn-badge" data-tone="accent" data-variant="soft" data-size="sm">100 users</span></h2><p class="cn-section-header__description">Manage your team members and their account permissions here.</p></div><div class="cn-section-header__actions">${btn('outline', 'Download all')}${btn('primary', 'Add user')}</div></div>`),
    ex('With tabs', `<div class="cn-section-header" data-variant="with-tabs" data-divider="yes"><div class="cn-section-header__content"><h2 class="cn-section-header__title">Vendor movements</h2><p class="cn-section-header__description">Keep track of vendor and their security ratings.</p></div><div class="cn-section-header__tabs cn-tabs" data-variant="pill" data-size="sm" role="tablist"><button type="button" class="cn-tabs__tab" role="tab" aria-selected="true">12 months</button><button type="button" class="cn-tabs__tab" role="tab" aria-selected="false">30 days</button><button type="button" class="cn-tabs__tab" role="tab" aria-selected="false">7 days</button><button type="button" class="cn-tabs__tab" role="tab" aria-selected="false">24 hours</button></div></div>`),
    ex('With search', `<div class="cn-section-header" data-variant="with-search" data-divider="yes"><div class="cn-section-header__content"><h2 class="cn-section-header__title">Invoices</h2><p class="cn-section-header__description">Pick an account plan that fits your workflow.</p></div><div class="cn-section-header__actions"><div class="cn-section-header__search cn-input" data-variant="default" data-size="md">${ICON.search.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="search" placeholder="Search" aria-label="Search invoices"></div>${btn('outline', 'Filters')}</div></div>`),
    ex('As a card header', `<section class="cn-card" data-variant="default" data-padding="none" style="max-width:640px"><div class="cn-section-header" data-variant="card" data-divider="yes"><div class="cn-section-header__content"><h2 class="cn-section-header__title">Notifications</h2><p class="cn-section-header__description">Choose what you want to be notified about.</p></div><div class="cn-section-header__actions">${btn('ghost', 'Reset', 'sm')}</div></div><div class="cn-card__body" style="padding:var(--cn-space-6)"><p class="cn-text-body-md">Card content</p></div></section>`),
  ],
  rules: [
    'Title is an h2 (or h3 inside a card that already has an h2). Never a page title.',
    'Description one sentence; omit rather than repeat the title.',
    'Actions on the right are sm inside cards, md on the page. At most one primary.',
    '20px padding below, hairline divider, then 24px (space.6) to the content.',
  ],
  a11y: ['Headings keep document order: h1 (page) → h2 (section) → h3 (card inside a section).', 'Filter tabs use role="tablist" only when they switch panels; otherwise use a SegmentedControl.'],
  related: ['page-header', 'card', 'tabs', 'badge', 'input'],
};
