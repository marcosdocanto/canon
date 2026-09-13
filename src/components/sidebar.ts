import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

const item = (label: string, icon: string, current = false, badge = '') => `<a href="#" class="cn-sidebar__item"${current ? ' aria-current="page"' : ''}>${icon.replace('cn-icon', 'cn-sidebar__icon')}<span class="cn-sidebar__label">${label}</span>${badge ? `<span class="cn-sidebar__badge">${badge}</span>` : ''}</a>`;
const NAV = `${item('Home', ICON.home)}${item('Dashboard', ICON.calendar, true)}${item('Projects', ICON.copy)}${item('Tasks', ICON.check, false, '10')}${item('Reporting', ICON.inbox)}${item('Users', ICON.user)}`;
const FOOT = `${item('Support', ICON.info)}${item('Settings', ICON.settings)}`;
const LOGO = `<div class="cn-sidebar__brand"><span class="cn-sidebar__logo" aria-hidden="true"></span><span class="cn-sidebar__brand-name">Lumen</span></div>`;
const ACCOUNT = `<div class="cn-sidebar__account"><span class="cn-sidebar__avatar" aria-hidden="true">MC</span><div class="cn-sidebar__account-text"><span class="cn-sidebar__name">Maya Chen</span><span class="cn-sidebar__email">maya@lumen.co</span></div><button type="button" class="cn-sidebar__account-action" aria-label="Log out">${ICON.external}</button></div>`;
const SEARCH = `<div class="cn-sidebar__search cn-input" data-variant="default" data-size="md">${ICON.search.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="search" placeholder="Search" aria-label="Search"></div>`;

export const sidebar: ComponentSpec = {
  name: 'Sidebar',
  slug: 'sidebar',
  category: 'navigation',
  description: 'The application sidebar family of the system: a 280px column with logo, search, navigation items matching SidebarNav (36px, label-md, 20px icons), a bottom group and an account card; slim 68px rail; dual-tier rail + panel; sections with subheadings; dark theme.',
  usage: 'Primary navigation of an application with more than 5 destinations. For 3–5 destinations prefer the Topbar with tabs. Groups: main destinations at top, support/settings at the bottom, account card last. Never one item per database table; items are user tasks.',
  anatomy: [
    { part: 'root', element: 'nav', description: 'The column: flex column, full height, right hairline.' },
    { part: 'brand', element: 'div', description: 'Logo row at the top (32px logo + name).' },
    { part: 'logo', element: 'span', description: '32px brand mark.' },
    { part: 'brand-name', element: 'span', description: 'Product name, label-lg semibold (hidden in slim).' },
    { part: 'search', element: 'div', description: 'Optional search Input under the logo.', optional: true },
    { part: 'nav', element: 'div', description: 'Main list of items (flex column, gap 2px).' },
    { part: 'section', element: 'div', description: 'A group with a subheading (sections variant).', optional: true },
    { part: 'heading', element: 'div', description: 'Group subheading: label-xs in fg-subtle, 8px horizontal padding.', optional: true },
    { part: 'item', element: 'a', description: 'Nav item: 36px, 8px horizontal padding and gap, radius 6, label-md (14px medium by default), fg-muted; icon + label + optional badge.' },
    { part: 'icon', element: 'svg', description: '20px icon in fg-subtle (fg-muted when current).' },
    { part: 'label', element: 'span', description: 'The item text, truncated.' },
    { part: 'badge', element: 'span', description: 'Trailing count pill (22px, bg-subtle, body-xs).', optional: true },
    { part: 'divider', element: 'hr', description: 'Hairline between groups (dividers variant).', optional: true },
    { part: 'footer', element: 'div', description: 'Bottom group: support/settings items then the account card.' },
    { part: 'account', element: 'div', description: 'Account card: avatar 40, name + email, trailing log-out icon; bordered card in the default theme.' },
    { part: 'avatar', element: 'span', description: '40px circle with initials or image.' },
    { part: 'account-text', element: 'div', description: 'Name and email column.' },
    { part: 'name', element: 'span', description: 'label-sm semibold.' },
    { part: 'email', element: 'span', description: 'body-sm fg-muted, truncated.' },
    { part: 'account-action', element: 'button', description: '36px utility button (log out / ⋯).' },
    { part: 'rail', element: 'div', description: 'The 68px icon-only column of the dual-tier variant.', optional: true },
    { part: 'panel', element: 'div', description: 'The 256px second-tier panel of the dual-tier variant.', optional: true },
    { part: 'rail-item', element: 'a', description: '48px square icon button with a 20px icon in a rail.', optional: true },
  ],
  props: {
    variant: { values: ['simple', 'slim', 'dual-tier', 'sections', 'dividers'], default: 'simple', description: 'simple = one flat list (280px); slim = 68px icon rail with tooltips; dual-tier = 68px rail + 256px panel for the active area; sections = groups with subheadings; dividers = groups separated by hairlines.' },
    theme: { values: ['light', 'dark', 'brand'], default: 'light', description: 'light = white; dark = gray-950 surface with gray-800 borders; brand = brand-700 surface (marketing-style app).' },
  },
  states: {
    current: { selector: ' .cn-sidebar__item[aria-current="page"]', description: 'The active destination: subtle fill with action-colored text and icon.', markup: 'aria-current="page" on the item' },
    hover: { selector: ' .cn-sidebar__item:hover', description: 'Subtle fill.', markup: 'native' },
    focus: { selector: ' .cn-sidebar__item:focus-visible', description: 'Focus ring.', markup: 'native' },
  },
  base: {
    root: { display: 'flex', 'flex-direction': 'column', width: 'calc({space.64} + {space.6})', 'min-height': '640px', 'background-color': '{color.bg-surface}', 'border-inline-end': '{border.width.thin} solid {color.border-default}', padding: '{space.5} {space.4} {space.6}', gap: '{space.5}', 'flex-shrink': '0' },
    brand: { display: 'flex', 'align-items': 'center', gap: '{space.2.5}', 'padding-inline': '{space.2}', height: '32px' },
    logo: { width: '32px', height: '32px', 'border-radius': '{radius.lg}', 'background-color': '{color.bg-action}', 'flex-shrink': '0' },
    'brand-name': { ...typeStyle('label-lg'), color: '{color.fg-default}' },
    search: { width: '100%' },
    nav: { display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}', flex: '1 1 auto', 'min-height': '0' },
    section: { display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}', 'margin-top': '{space.4}' },
    heading: { ...typeStyle('label-xs'), color: '{color.fg-subtle}', padding: '0 {space.2} {space.1}' },
    item: { display: 'flex', 'align-items': 'center', gap: '{space.2}', height: '{space.9}', 'padding-inline': '{space.2}', 'border-radius': '{radius.md}', ...typeStyle('label-md'), color: '{color.fg-muted}', 'text-decoration': 'none', 'transition-property': 'background-color, color', 'transition-duration': '{motion.duration.fast}', 'transition-timing-function': '{motion.easing.standard}' },
    icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', color: '{color.fg-subtle}' },
    label: { flex: '1 1 auto', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    badge: { display: 'inline-flex', 'align-items': 'center', height: '22px', 'padding-inline': '{space.2}', 'border-radius': '{radius.full}', 'background-color': '{color.bg-subtle}', border: '{border.width.thin} solid {color.border-default}', ...typeStyle('body-xs'), 'font-weight': '{font.weight.medium}', color: '{color.fg-muted}' },
    divider: { border: '0', 'border-top': '{border.width.thin} solid {color.border-default}', margin: '{space.3} 0' },
    footer: { display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}', 'padding-top': '{space.4}' },
    account: { display: 'flex', 'align-items': 'center', gap: '{space.3}', padding: '{space.3}', 'margin-top': '{space.4}', 'border-radius': '{radius.card}', border: '{border.width.thin} solid {color.border-default}', 'background-color': '{color.bg-surface}', 'box-shadow': '{shadow.xs}' },
    avatar: { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', width: '40px', height: '40px', 'border-radius': '{radius.full}', 'background-color': '{color.bg-accent-subtle}', color: '{color.fg-accent}', ...typeStyle('label-sm'), 'flex-shrink': '0' },
    'account-text': { display: 'flex', 'flex-direction': 'column', 'min-width': '0', flex: '1 1 auto' },
    name: { ...typeStyle('label-sm'), color: '{color.fg-default}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    email: { ...typeStyle('body-sm'), color: '{color.fg-muted}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    'account-action': { appearance: 'none', border: '0', padding: '0', margin: '0', background: 'none', cursor: 'pointer', display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', width: '36px', height: '36px', 'border-radius': '{radius.md}', color: '{color.fg-subtle}', 'flex-shrink': '0' },
    rail: { display: 'flex', 'flex-direction': 'column', 'align-items': 'center', gap: '{space.1}', width: '68px', padding: '{space.5} {space.2.5}', 'border-inline-end': '{border.width.thin} solid {color.border-default}' },
    panel: { display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}', width: '256px', padding: '{space.5} {space.4}' },
    'rail-item': { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', width: '48px', height: '48px', 'border-radius': '{radius.md}', color: '{color.fg-subtle}' },
    '@states': {
      current: { item: { 'background-color': '{color.bg-action-subtle}', color: '{color.fg-action}' } },
      hover: { item: { 'background-color': '{color.bg-subtle}', color: '{color.fg-default}' } },
      focus: { item: { outline: 'none', 'box-shadow': '{shadow.focus}' } },
    },
  },
  variants: {
    variant: {
      simple: { root: {} },
      slim: { root: { width: '68px', 'align-items': 'center', padding: '{space.5} {space.2.5} {space.6}' }, item: { width: '48px', height: '48px', 'justify-content': 'center', 'padding-inline': '0' }, account: { padding: '0', border: '0', 'box-shadow': 'none', 'margin-top': '{space.4}' }, search: { display: 'none' } },
      'dual-tier': { root: { 'flex-direction': 'row', width: 'auto', padding: '0', gap: '0' } },
      sections: { root: {} },
      dividers: { root: {} },
    },
    theme: {
      light: { root: {} },
      dark: { root: { 'background-color': '{neutral.950}', 'border-color': '{neutral.800}', color: '{neutral.100}' }, 'brand-name': { color: '{white}' }, item: { color: '{neutral.100}' }, icon: { color: '{neutral.400}' }, heading: { color: '{neutral.500}' }, badge: { 'background-color': '{neutral.800}', 'border-color': '{neutral.700}', color: '{neutral.200}' }, divider: { 'border-color': '{neutral.800}' }, account: { 'border-color': '{neutral.800}', 'background-color': '{neutral.950}' }, name: { color: '{white}' }, email: { color: '{neutral.400}' }, rail: { 'border-color': '{neutral.800}' }, 'account-action': { color: '{neutral.400}' }, '@states': { current: { item: { 'background-color': '{neutral.800}', color: '{white}' } }, hover: { item: { 'background-color': '{neutral.800}', color: '{white}' } } } },
      brand: { root: { 'background-color': '{brand.700}', 'border-color': '{brand.600}', color: '{white}' }, 'brand-name': { color: '{white}' }, logo: { 'background-color': '{white}' }, item: { color: '{brand.100}' }, icon: { color: '{brand.300}' }, heading: { color: '{brand.300}' }, badge: { 'background-color': '{brand.600}', 'border-color': '{brand.500}', color: '{white}' }, divider: { 'border-color': '{brand.600}' }, account: { 'border-color': '{brand.600}', 'background-color': '{brand.700}' }, avatar: { 'background-color': '{brand.500}', color: '{white}' }, name: { color: '{white}' }, email: { color: '{brand.200}' }, 'account-action': { color: '{brand.200}' }, '@states': { current: { item: { 'background-color': '{brand.600}', color: '{white}' } }, hover: { item: { 'background-color': '{brand.600}', color: '{white}' } } } },
    },
  },
  extraCss: `
.cn-sidebar__logo { clip-path: polygon(0 0, 100% 0, 100% 22%, 27% 22%, 27% 78%, 100% 78%, 100% 100%, 0 100%); border-radius: 0; }
.cn-sidebar[data-variant="slim"] .cn-sidebar__label, .cn-sidebar[data-variant="slim"] .cn-sidebar__badge, .cn-sidebar[data-variant="slim"] .cn-sidebar__brand-name, .cn-sidebar[data-variant="slim"] .cn-sidebar__account-text, .cn-sidebar[data-variant="slim"] .cn-sidebar__account-action { display: none; }
.cn-sidebar[data-variant="slim"] .cn-sidebar__brand { padding-inline: 0; }
.cn-sidebar[data-variant="slim"] .cn-sidebar__footer { align-items: center; }
.cn-sidebar__rail-item > svg { width: {size.icon.md}; height: {size.icon.md}; }
.cn-sidebar[data-variant="dual-tier"] .cn-sidebar__rail-item[aria-current="page"], .cn-sidebar__rail-item:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-sidebar[data-variant="dual-tier"] .cn-sidebar__panel .cn-sidebar__heading { padding-inline: {space.2}; margin-bottom: {space.2}; font-size: {font.size.md}; font-weight: {font.weight.semibold}; color: {color.fg-default}; }
.cn-sidebar__item[aria-current="page"] .cn-sidebar__icon { color: inherit; }
.cn-sidebar[data-theme="dark"] .cn-sidebar__item[aria-current="page"] .cn-sidebar__icon, .cn-sidebar[data-theme="brand"] .cn-sidebar__item[aria-current="page"] .cn-sidebar__icon { color: currentColor; }
.cn-sidebar__account-action:hover { background-color: {color.bg-subtle}; color: {color.fg-muted}; }
.cn-sidebar[data-theme="dark"] .cn-sidebar__search .cn-input { background-color: {neutral.900}; border-color: {neutral.700}; color: {white}; }
.cn-sidebar[data-theme="brand"] .cn-sidebar__search .cn-input { background-color: {brand.600}; border-color: {brand.500}; color: {white}; }`,
  examples: [
    ex('Simple', `<nav class="cn-sidebar" data-variant="simple" data-theme="light" aria-label="Main">${LOGO}${SEARCH}<div class="cn-sidebar__nav">${NAV}</div><div class="cn-sidebar__footer">${FOOT}${ACCOUNT}</div></nav>`),
    ex('Sections with subheadings', `<nav class="cn-sidebar" data-variant="sections" data-theme="light" aria-label="Main">${LOGO}<div class="cn-sidebar__nav"><div class="cn-sidebar__section"><div class="cn-sidebar__heading">General</div>${item('Home', ICON.home)}${item('Dashboard', ICON.calendar, true)}${item('Tasks', ICON.check, false, '10')}</div><div class="cn-sidebar__section"><div class="cn-sidebar__heading">Workspace</div>${item('Projects', ICON.copy)}${item('Reporting', ICON.inbox)}${item('Users', ICON.user)}</div></div><div class="cn-sidebar__footer">${FOOT}${ACCOUNT}</div></nav>`),
    ex('Dividers', `<nav class="cn-sidebar" data-variant="dividers" data-theme="light" aria-label="Main">${LOGO}<div class="cn-sidebar__nav">${item('Home', ICON.home)}${item('Dashboard', ICON.calendar, true)}<hr class="cn-sidebar__divider">${item('Projects', ICON.copy)}${item('Tasks', ICON.check, false, '10')}${item('Reporting', ICON.inbox)}<hr class="cn-sidebar__divider">${item('Users', ICON.user)}</div><div class="cn-sidebar__footer">${FOOT}${ACCOUNT}</div></nav>`),
    ex('Slim rail', `<nav class="cn-sidebar" data-variant="slim" data-theme="light" aria-label="Main">${LOGO}<div class="cn-sidebar__nav">${item('Home', ICON.home)}${item('Dashboard', ICON.calendar, true)}${item('Projects', ICON.copy)}${item('Tasks', ICON.check)}${item('Reporting', ICON.inbox)}${item('Users', ICON.user)}</div><div class="cn-sidebar__footer">${FOOT}${ACCOUNT}</div></nav>`),
    ex('Dual tier', `<nav class="cn-sidebar" data-variant="dual-tier" data-theme="light" aria-label="Main"><div class="cn-sidebar__rail"><span class="cn-sidebar__logo" aria-hidden="true"></span><a href="#" class="cn-sidebar__rail-item" aria-label="Home">${ICON.home}</a><a href="#" class="cn-sidebar__rail-item" aria-current="page" aria-label="Projects">${ICON.copy}</a><a href="#" class="cn-sidebar__rail-item" aria-label="Reporting">${ICON.inbox}</a><a href="#" class="cn-sidebar__rail-item" aria-label="Settings">${ICON.settings}</a></div><div class="cn-sidebar__panel"><div class="cn-sidebar__heading">Projects</div>${item('All projects', ICON.copy, true, '24')}${item('Archived', ICON.inbox)}${item('Shared with me', ICON.user)}${item('Templates', ICON.calendar)}</div></nav>`),
    ex('Dark theme', `<nav class="cn-sidebar" data-variant="simple" data-theme="dark" aria-label="Main">${LOGO}${SEARCH}<div class="cn-sidebar__nav">${NAV}</div><div class="cn-sidebar__footer">${FOOT}${ACCOUNT}</div></nav>`),
    ex('Brand theme', `<nav class="cn-sidebar" data-variant="simple" data-theme="brand" aria-label="Main">${LOGO}<div class="cn-sidebar__nav">${NAV}</div><div class="cn-sidebar__footer">${FOOT}${ACCOUNT}</div></nav>`),
  ],
  rules: [
    'Width 280px, matching SidebarNav. Slim rail 68px. Dual tier 68 + 256. The sidebar never scrolls the page; its own nav scrolls.',
    'Items match SidebarNav: 36px tall with a 20px icon, 8px gap and horizontal padding, label-md typography, and 2px between rows. The current item uses action-colored text and a subtle surface; hover uses a quiet neutral fill.',
    'Order: logo, optional search, main items (≤ 7), sections, then the footer with Support/Settings and the account card.',
    'Counts use the badge part; never red dots for ordinary counts.',
    'On tablets collapse to the slim rail; on mobile replace with the MobileHeader drawer.',
  ],
  a11y: ['<nav aria-label="Main">; the current item carries aria-current="page".', 'Slim rail items are icon-only and need aria-label (and a Tooltip on hover).', 'The account log-out control is a labelled button.'],
  related: ['sidebar-nav', 'topbar', 'account-card', 'mobile-header', 'input'],
};
