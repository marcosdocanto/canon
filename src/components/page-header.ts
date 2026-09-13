import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

const btn = (v: string, label: string, icon = '') => `<button type="button" class="cn-button" data-variant="${v}" data-size="md">${icon}<span class="cn-button__label">${label}</span></button>`;

export const pageHeader: ComponentSpec = {
  name: 'PageHeader',
  slug: 'page-header',
  category: 'layout',
  description: 'Top of an application page: title, supporting text and the actions for the page, optionally with breadcrumbs above, a search field, an avatar, or tabs below. The "page header" pattern.',
  usage: 'Exactly one per page, directly under the top navigation. Put the page-level primary action here (at most one filled button). Section titles inside the page use SectionHeader.',
  anatomy: [
    { part: 'root', element: 'header', description: 'Flex row: content left, actions right; wraps on mobile.' },
    { part: 'crumbs', element: 'nav', description: 'Optional breadcrumb row above the title (uses Breadcrumb markup).', optional: true },
    { part: 'media', element: 'span', description: 'Optional 56px avatar or featured icon before the content.', optional: true },
    { part: 'content', element: 'div', description: 'Title + description column.' },
    { part: 'title', element: 'h1', description: 'heading-lg (30/38 semibold). One h1 per page.' },
    { part: 'description', element: 'p', description: 'body-lg (16/24) in fg-muted. One sentence.' },
    { part: 'actions', element: 'div', description: 'Right-aligned row of buttons; on mobile it stacks under the content.' },
    { part: 'search', element: 'div', description: 'Optional search Input in the actions row (width 320).', optional: true },
    { part: 'tabs', element: 'div', description: 'Optional Tabs (underline) below, bleeding to the header edges.', optional: true },
  ],
  props: {
    variant: { values: ['simple', 'with-search', 'with-tabs', 'with-avatar', 'centered'], default: 'simple', description: 'simple = title/description/actions; with-search = a search field before the actions; with-tabs = tabs under the header; with-avatar = 56px media block before the title (profile pages); centered = title and description centered, no actions (informational pages).' },
    divider: { values: ['yes', 'no'], default: 'yes', description: 'yes = 1px hairline under the header (or under the tabs).' },
  },
  states: {},
  base: {
    root: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '{space.4} {space.6}', 'padding-bottom': '{space.5}' },
    crumbs: { 'flex-basis': '100%', 'margin-bottom': '{space.2}' },
    media: { 'flex-shrink': '0' },
    content: { display: 'flex', 'flex-direction': 'column', gap: '{space.1}', 'min-width': '0', flex: '1 1 320px' },
    title: { ...typeStyle('heading-lg'), color: '{color.fg-default}' },
    description: { ...typeStyle('body-lg'), color: '{color.fg-muted}' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.3}', 'flex-shrink': '0', 'flex-wrap': 'wrap' },
    search: { width: '320px', 'max-width': '100%' },
    tabs: { 'flex-basis': '100%', 'min-width': '0', 'max-width': '100%', 'margin-top': '{space.2}' },
  },
  variants: {
    variant: {
      simple: { root: {} },
      'with-search': { root: {} },
      'with-tabs': { root: { 'padding-bottom': '0' } },
      'with-avatar': { root: {} },
      centered: { root: { 'flex-direction': 'column', 'align-items': 'center', 'text-align': 'center' }, content: { 'align-items': 'center', flex: '0 1 auto', 'max-width': '640px' } },
    },
    divider: { yes: { root: { 'border-bottom': '{border.width.thin} solid {color.border-default}' } }, no: { root: {} } },
  },
  extraCss: `
.cn-page-header[data-variant="with-avatar"] { align-items: center; }
.cn-page-header[data-variant="with-avatar"] .cn-page-header__content { flex-direction: row; align-items: center; gap: {space.4}; }
.cn-page-header[data-variant="with-avatar"] .cn-page-header__title + .cn-page-header__description { margin-top: 0; }
.cn-page-header[data-variant="with-tabs"] .cn-page-header__tabs .cn-tabs { margin-bottom: -1px; }
@media (max-width: {breakpoint.md}) { .cn-page-header { padding-bottom: {space.4}; } .cn-page-header .cn-page-header__actions { width: 100%; } .cn-page-header .cn-page-header__actions .cn-button { flex: 1 1 auto; } .cn-page-header .cn-page-header__search { width: 100%; } }`,
  examples: [
    ex('Simple', `<header class="cn-page-header" data-variant="simple" data-divider="yes"><div class="cn-page-header__content"><h1 class="cn-page-header__title">Team members</h1><p class="cn-page-header__description">Manage your team members and their account permissions here.</p></div><div class="cn-page-header__actions">${btn('outline', 'Secondary')}${btn('primary', 'Add member', ICON.plus.replace('cn-icon', 'cn-button__icon'))}</div></header>`),
    ex('With breadcrumbs and search', `<header class="cn-page-header" data-variant="with-search" data-divider="yes"><nav class="cn-page-header__crumbs cn-breadcrumb" data-size="sm" aria-label="Breadcrumb"><ol class="cn-breadcrumb__list"><li class="cn-breadcrumb__item"><a class="cn-breadcrumb__link" href="#">Home</a></li><li class="cn-breadcrumb__separator" aria-hidden="true">${ICON.chevronRight}</li><li class="cn-breadcrumb__item"><a class="cn-breadcrumb__link" href="#">Settings</a></li><li class="cn-breadcrumb__separator" aria-hidden="true">${ICON.chevronRight}</li><li class="cn-breadcrumb__item"><span class="cn-breadcrumb__current" aria-current="page">Team</span></li></ol></nav><div class="cn-page-header__content"><h1 class="cn-page-header__title">Team</h1><p class="cn-page-header__description">Invite and manage the people who work with you.</p></div><div class="cn-page-header__actions"><div class="cn-page-header__search cn-input" data-variant="default" data-size="md">${ICON.search.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="search" placeholder="Search" aria-label="Search team"></div>${btn('primary', 'Invite')}</div></header>`),
    ex('With tabs', `<header class="cn-page-header" data-variant="with-tabs" data-divider="yes"><div class="cn-page-header__content"><h1 class="cn-page-header__title">Settings</h1><p class="cn-page-header__description">Manage your account settings and preferences.</p></div><div class="cn-page-header__actions">${btn('outline', 'Discard')}${btn('primary', 'Save changes')}</div><div class="cn-page-header__tabs"><div class="cn-tabs" data-variant="underline" data-size="md" role="tablist"><button type="button" class="cn-tabs__tab" role="tab" aria-selected="true">My details</button><button type="button" class="cn-tabs__tab" role="tab" aria-selected="false">Profile</button><button type="button" class="cn-tabs__tab" role="tab" aria-selected="false">Password</button><button type="button" class="cn-tabs__tab" role="tab" aria-selected="false">Team</button><button type="button" class="cn-tabs__tab" role="tab" aria-selected="false">Plan</button><button type="button" class="cn-tabs__tab" role="tab" aria-selected="false">Billing</button></div></div></header>`),
    ex('With avatar', `<header class="cn-page-header" data-variant="with-avatar" data-divider="yes"><div class="cn-page-header__content"><span class="cn-page-header__media cn-avatar" data-size="xl" data-shape="circle" data-tone="accent" data-status="online"><span class="cn-avatar__fallback">MC</span><span class="cn-avatar__status"></span></span><div><h1 class="cn-page-header__title">Maya Chen</h1><p class="cn-page-header__description">maya@lumen.co</p></div></div><div class="cn-page-header__actions">${btn('outline', 'Share')}${btn('outline', 'View profile')}${btn('primary', 'Edit')}</div></header>`),
    ex('Centered (informational)', `<header class="cn-page-header" data-variant="centered" data-divider="no"><div class="cn-page-header__content"><h1 class="cn-page-header__title">Release notes</h1><p class="cn-page-header__description">All the latest the system updates, improvements, and fixes.</p></div></header>`),
  ],
  rules: [
    'The title is the h1 and matches the navigation item that brought the user here.',
    'Description is optional and never longer than one sentence.',
    'At most one primary button; secondary actions are outline; overflow goes into a ⋯ IconButton with a Menu.',
    '20px below the header (the padding) then 32px to the first section when there is a divider; with tabs, the tab list sits on the divider line.',
    'On mobile (< 768) actions move under the content and stretch full width.',
  ],
  a11y: ['One h1 per page; the breadcrumb nav has aria-label="Breadcrumb".', 'Search fields have an aria-label when the placeholder is the only label.'],
  related: ['section-header', 'breadcrumb', 'tabs', 'button', 'input', 'avatar'],
};
