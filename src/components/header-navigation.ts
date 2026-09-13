import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

const navItem = (label: string, current = false, dropdown = false) => `<a href="#" class="cn-header-navigation__item"${current ? ' aria-current="page"' : ''}>${label}${dropdown ? ICON.chevronDown.replace('cn-icon', 'cn-header-navigation__chevron') : ''}</a>`;
const NAV = `${navItem('Home', true)}${navItem('Products', false, true)}${navItem('Resources', false, true)}${navItem('Pricing')}`;
const LOGO = `<a href="#" class="cn-header-navigation__logo"><span class="cn-header-navigation__mark" aria-hidden="true"></span>Lumen</a>`;
const ACTIONS = `<div class="cn-header-navigation__actions"><button type="button" class="cn-button" data-variant="ghost" data-size="lg"><span class="cn-button__label">Log in</span></button><button type="button" class="cn-button" data-variant="primary" data-size="lg"><span class="cn-button__label">Sign up</span></button></div>`;
const menuItem = (title: string, desc: string, icon: string) => `<a href="#" class="cn-header-navigation__menu-item">${icon.replace('cn-icon', 'cn-header-navigation__menu-icon')}<span class="cn-header-navigation__menu-text"><span class="cn-header-navigation__menu-title">${title}</span><span class="cn-header-navigation__menu-desc">${desc}</span></span></a>`;

export const headerNavigation: ComponentSpec = {
  name: 'HeaderNavigation',
  slug: 'header-navigation',
  category: 'navigation',
  description: 'Marketing website header: 80px bar with logo, text links (with optional mega menu), and Log in / Sign up actions; collapses to a hamburger on mobile. "header navigation".',
  usage: 'Top of every marketing page (landing, pricing, about, blog). Inside the product use Topbar or Sidebar instead.',
  anatomy: [
    { part: 'root', element: 'header', description: 'Full-width bar, 80px, bottom hairline (transparent when over a hero).' },
    { part: 'container', element: 'div', description: 'Centered 1280px row with 32px side padding.' },
    { part: 'logo', element: 'a', description: 'Logo mark + wordmark, links home.' },
    { part: 'mark', element: 'span', description: '32px mark.' },
    { part: 'nav', element: 'nav', description: 'The text links, 8px apart.' },
    { part: 'item', element: 'a', description: '16px semibold link, 40px tall, fg-muted → fg-default; current is fg-default.' },
    { part: 'chevron', element: 'svg', description: 'Dropdown indicator, 20px.' },
    { part: 'actions', element: 'div', description: 'Right side: Log in (ghost) and Sign up (primary), lg size.' },
    { part: 'toggle', element: 'button', description: 'Hamburger IconButton shown under 1024px.' },
    { part: 'menu', element: 'div', description: 'Mega menu panel: white, radius 12, shadow-lg, 2–3 columns of menu items.', optional: true },
    { part: 'menu-item', element: 'a', description: 'Icon + title + description row, 12px radius, hover bg-subtle.' },
    { part: 'menu-icon', element: 'svg', description: '24px icon in brand color.' },
    { part: 'menu-text', element: 'span', description: 'Title and description column.' },
    { part: 'menu-title', element: 'span', description: 'label-md semibold.' },
    { part: 'menu-desc', element: 'span', description: 'body-md fg-muted.' },
  ],
  props: {
    variant: { values: ['default', 'transparent', 'with-menu'], default: 'default', description: 'default = white with bottom hairline; transparent = no background/border (over a hero); with-menu = shows the mega menu panel open under the bar (static preview).' },
    theme: { values: ['light', 'dark'], default: 'light', description: 'dark = gray-950 bar with light text (dark landing pages).' },
  },
  states: {
    hover: { selector: ' .cn-header-navigation__item:hover', description: 'Link darkens.', markup: 'native' },
    current: { selector: ' .cn-header-navigation__item[aria-current="page"]', description: 'Current section is fg-default.', markup: 'aria-current="page"' },
    open: { selector: '[data-state="open"]', description: 'Mega menu visible.', markup: 'data-state="open" on the root' },
  },
  base: {
    root: { position: 'relative', 'background-color': '{color.bg-surface}', 'border-bottom': '{border.width.thin} solid {color.border-default}' },
    container: { display: 'flex', 'align-items': 'center', gap: '{space.10}', height: '80px', 'max-width': '{size.container.xl}', 'margin-inline': 'auto', 'padding-inline': '{space.8}' },
    logo: { display: 'inline-flex', 'align-items': 'center', gap: '{space.2.5}', ...typeStyle('label-lg'), 'font-size': '{font.size.lg}', color: '{color.fg-default}', 'text-decoration': 'none', 'flex-shrink': '0' },
    mark: { width: '32px', height: '32px', 'border-radius': '{radius.lg}', 'background-color': '{color.bg-action}' },
    nav: { display: 'flex', 'align-items': 'center', gap: '{space.2}', flex: '1 1 auto' },
    item: { display: 'inline-flex', 'align-items': 'center', gap: '{space.1}', height: '40px', 'padding-inline': '{space.3}', 'border-radius': '{radius.md}', ...typeStyle('label-lg'), color: '{color.fg-muted}', 'text-decoration': 'none', 'transition-property': 'color, background-color', 'transition-duration': '{motion.duration.fast}', 'transition-timing-function': '{motion.easing.standard}' },
    chevron: { width: '{size.icon.md}', height: '{size.icon.md}', color: '{color.fg-subtle}' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.3}', 'flex-shrink': '0' },
    toggle: { display: 'none', appearance: 'none', border: '0', background: 'none', padding: '0', width: '40px', height: '40px', 'border-radius': '{radius.md}', color: '{color.fg-muted}', cursor: 'pointer', 'align-items': 'center', 'justify-content': 'center', 'margin-inline-start': 'auto' },
    menu: { display: 'none', position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: '{size.container.md}', 'max-width': 'calc(100% - {space.8})', 'margin-top': '{space.2}', padding: '{space.5}', 'background-color': '{color.bg-surface-raised}', border: '{border.width.thin} solid {color.border-default}', 'border-radius': '{radius.card}', 'box-shadow': '{shadow.lg}', 'grid-template-columns': 'repeat(2, minmax(0, 1fr))', gap: '{space.2}', 'z-index': '{z.dropdown}' },
    'menu-item': { display: 'flex', gap: '{space.4}', 'align-items': 'flex-start', padding: '{space.3}', 'border-radius': '{radius.lg}', 'text-decoration': 'none', color: 'inherit', 'transition-property': 'background-color', 'transition-duration': '{motion.duration.fast}', 'transition-timing-function': '{motion.easing.standard}' },
    'menu-icon': { width: '{size.icon.lg}', height: '{size.icon.lg}', color: '{brand.600}', 'flex-shrink': '0', 'margin-top': '2px' },
    'menu-text': { display: 'flex', 'flex-direction': 'column', gap: '{space.1}', 'min-width': '0' },
    'menu-title': { ...typeStyle('label-md'), 'font-size': '{font.size.md}', color: '{color.fg-default}' },
    'menu-desc': { ...typeStyle('body-md'), color: '{color.fg-muted}' },
    '@states': {
      hover: { item: { color: '{color.fg-default}' } },
      current: { item: { color: '{color.fg-default}' } },
      open: { menu: { display: 'grid' } },
    },
  },
  variants: {
    variant: {
      default: { root: {} },
      transparent: { root: { 'background-color': 'transparent', 'border-bottom-color': 'transparent' } },
      'with-menu': { root: {}, menu: { display: 'grid', position: 'relative', top: 'auto', left: 'auto', transform: 'none', 'margin-inline': 'auto', 'margin-bottom': '{space.6}' } },
    },
    theme: {
      light: { root: {} },
      dark: { root: { 'background-color': '{neutral.950}', 'border-bottom-color': '{neutral.800}' }, logo: { color: '{white}' }, item: { color: '{neutral.300}' }, chevron: { color: '{neutral.500}' }, toggle: { color: '{neutral.300}' }, '@states': { hover: { item: { color: '{white}' } }, current: { item: { color: '{white}' } } } },
    },
  },
  extraCss: `
.cn-header-navigation__mark { clip-path: polygon(0 0, 100% 0, 100% 22%, 27% 22%, 27% 78%, 100% 78%, 100% 100%, 0 100%); border-radius: 0; }
.cn-header-navigation__item:hover .cn-header-navigation__chevron { color: currentColor; }
.cn-header-navigation__menu-item:hover { background-color: {color.bg-subtle}; }
.cn-header-navigation[data-theme="dark"] .cn-button[data-variant="ghost"] { color: {neutral.300}; }
.cn-header-navigation[data-theme="dark"] .cn-button[data-variant="ghost"]:hover { background-color: {neutral.800}; color: {white}; }
@media (max-width: {breakpoint.lg}) { .cn-header-navigation .cn-header-navigation__nav, .cn-header-navigation .cn-header-navigation__actions { display: none; } .cn-header-navigation .cn-header-navigation__toggle { display: inline-flex; } .cn-header-navigation .cn-header-navigation__container { height: 64px; padding-inline: {space.4}; } }`,
  examples: [
    ex('Default', `<header class="cn-header-navigation" data-variant="default" data-theme="light"><div class="cn-header-navigation__container">${LOGO}<nav class="cn-header-navigation__nav" aria-label="Main">${NAV}</nav>${ACTIONS}<button type="button" class="cn-header-navigation__toggle" aria-label="Open menu">${ICON.menu}</button></div></header>`),
    ex('With mega menu open', `<header class="cn-header-navigation" data-variant="with-menu" data-theme="light" data-state="open"><div class="cn-header-navigation__container">${LOGO}<nav class="cn-header-navigation__nav" aria-label="Main">${navItem('Home')}${navItem('Products', true, true)}${navItem('Resources', false, true)}${navItem('Pricing')}</nav>${ACTIONS}<button type="button" class="cn-header-navigation__toggle" aria-label="Open menu">${ICON.menu}</button></div><div class="cn-header-navigation__menu">${menuItem('Analytics', 'Get a better understanding of your traffic.', ICON.calendar)}${menuItem('Engagement', 'Speak directly to your customers.', ICON.inbox)}${menuItem('Security', 'Your customers’ data will be safe and secure.', ICON.check)}${menuItem('Integrations', 'Connect with third-party tools.', ICON.copy)}${menuItem('Automations', 'Build strategic funnels that will convert.', ICON.spark)}${menuItem('Reports', 'Get detailed reports with the click of a button.', ICON.home)}</div></header>`),
    ex('Transparent over a hero surface', `<div style="background:var(--cn-color-bg-subtle)"><header class="cn-header-navigation" data-variant="transparent" data-theme="light"><div class="cn-header-navigation__container">${LOGO}<nav class="cn-header-navigation__nav" aria-label="Main">${NAV}</nav>${ACTIONS}<button type="button" class="cn-header-navigation__toggle" aria-label="Open menu">${ICON.menu}</button></div></header></div>`),
    ex('Dark', `<header class="cn-header-navigation" data-variant="default" data-theme="dark"><div class="cn-header-navigation__container">${LOGO}<nav class="cn-header-navigation__nav" aria-label="Main">${NAV}</nav>${ACTIONS}<button type="button" class="cn-header-navigation__toggle" aria-label="Open menu">${ICON.menu}</button></div></header>`),
  ],
  rules: [
    '80px tall on desktop, 64 on mobile; 1280px container with 32px padding; logo left, links after a 40px gap, actions right.',
    'Links: 16px semibold gray; ≤ 5 items; dropdown items show a chevron and open a mega menu with icon + title + one-line description rows.',
    'Actions: exactly "Log in" (tertiary/ghost, lg) and one primary CTA (lg). Never two filled buttons.',
    'Below 1024px, links and actions hide behind the hamburger; the mobile menu lists the same links stacked, then the two actions full width.',
    'Transparent variant only over a hero whose background guarantees contrast.',
  ],
  a11y: ['<header> + <nav aria-label="Main">; dropdown triggers use aria-expanded; the mega menu is reachable by keyboard and closes with Escape.', 'The hamburger is a labelled button.'],
  related: ['topbar', 'button', 'mobile-header', 'menu'],
};
