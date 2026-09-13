import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference header navigation: a 64px bar on a gray-200 hairline, a 1280px container with
// 32px side padding, the logo 16px before a row of 32px nav pills (radius 6, 14px semibold,
// gray-50 when hovered or current), actions 12px apart on the right; an optional second 64px tier
// with more pills or underline tabs whose bar sits on the tier's hairline.

const TRANSITION_FAST = {
  'transition-property': 'background-color, color, box-shadow',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const HAIRLINE = '{border.width.thin} solid {color.border-default}';

const item = (label: string, current = false, i?: keyof typeof ICON) =>
  `<a href="#" class="cn-topbar__item"${current ? ' aria-current="page"' : ''}>${i ? ICON[i].replace('cn-icon', 'cn-topbar__icon') : ''}${label}</a>`;
const iconItem = (label: string, i: keyof typeof ICON, count = '') =>
  `<a href="#" class="cn-topbar__item" data-icon-only aria-label="${label}">${ICON[i].replace('cn-icon', 'cn-topbar__icon')}${count ? `<span class="cn-topbar__count">${count}</span>` : ''}</a>`;
const btn = (label: string, variant: string) =>
  `<button type="button" class="cn-button" data-variant="${variant}" data-size="sm"><span class="cn-button__label">${label}</span></button>`;
const AVATAR = `<button type="button" class="cn-avatar" data-size="md" data-shape="circle" data-tone="neutral" data-status="online" aria-label="Account: Maya Chen" aria-haspopup="menu" tabindex="0"><span class="cn-avatar__fallback" aria-hidden="true">MC</span><span class="cn-avatar__status"></span></button>`;
const SEARCH = `<div class="cn-topbar__search cn-input" data-variant="default" data-size="sm">${ICON.search.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="search" placeholder="Search" aria-label="Search"><kbd class="cn-kbd">⌘K</kbd></div>`;
const BRAND = `<a href="#" class="cn-topbar__brand"><span class="cn-topbar__logo" aria-hidden="true"></span>Lumen</a>`;
const NAV = `<nav class="cn-topbar__nav" aria-label="Primary">${item('Home')}${item('Dashboard', true)}${item('Projects')}${item('Tasks')}${item('Reporting')}${item('Users')}</nav>`;
const ACTIONS = `<div class="cn-topbar__actions">${iconItem('Settings', 'settings')}${iconItem('Notifications', 'inbox', '3')}${AVATAR}</div>`;
const routeTabs = (current: number, labels: string[]) =>
  `<div class="cn-tabs" data-variant="underline" data-size="sm" data-orientation="horizontal" data-width="hug">${labels.map((l, i) => `<a href="#" class="cn-tabs__tab"${i === current ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</div>`;

export const topbar: ComponentSpec = {
  name: 'Topbar',
  slug: 'topbar',
  category: 'navigation',
  description: 'The application header of the reference: a 64px bar on a hairline with the logo, a row of 32px navigation pills, a search field and the account on the right; optionally a second 64px tier with more pills or underline tabs. Sticky, opaque or translucent.',
  usage: 'One per app, at the top of every authenticated page when the app has 3–6 top-level destinations and no Sidebar. Holds the product mark, the primary navigation, global search and the account. Page titles, breadcrumbs and filters do not live here; they belong to the PageHeader below.',
  anatomy: [
    { part: 'root', element: 'header', description: 'Full-width sticky bar on a surface with a gray-200 hairline below; z-index sticky.' },
    { part: 'inner', element: 'div', description: 'The 64px row: a 1280px container with 32px side padding (16 on mobile), items vertically centered, 16px gap.' },
    { part: 'brand', element: 'a', description: 'Logo mark + product name (label-lg semibold, 24px tall), links to the home view; 16px before the nav.' },
    { part: 'logo', element: 'span', description: 'The 24px brand mark (an image, an inline SVG or the placeholder square).', optional: true },
    { part: 'nav', element: 'nav', description: 'Primary navigation: a row of items 2px apart. May instead hold an underline Tabs sm whose bar sits on the topbar hairline.' },
    { part: 'item', element: 'a', description: 'One nav pill: 32px tall (padding 6 × 8), radius 6, 14px semibold gray-700; gray-50 when hovered or current. Icon-only pills are 36 × 36 (data-icon-only + aria-label).' },
    { part: 'icon', element: 'svg', description: '20px icon inside an item, fg-subtle; darkens with the label. Decorative.', optional: true },
    { part: 'count', element: 'span', description: 'Unread count on an icon-only item: a 14px red circle with 10px bold white text, top-right.', optional: true },
    { part: 'search', element: 'div', description: 'Global search: an Input sm with a ⌘K Kbd, max 280px, in the actions row.', optional: true },
    { part: 'actions', element: 'div', description: 'Right side, 12px gap: search, icon-only items (settings, notifications), one outline and one primary Button at most, then the account Avatar (a button with aria-haspopup="menu").' },
    { part: 'secondary', element: 'div', description: 'Optional second tier under the first: a 64px row on its own hairline holding nav items, or an underline Tabs sm (data-nav="tabs") whose bar sits on the tier\'s hairline (padding 12 × 32, 0 bottom).', optional: true },
  ],
  props: {
    variant: {
      values: ['solid', 'translucent'],
      default: 'solid',
      description: 'solid = opaque surface; the default for app shells. translucent = 85% surface with a 12px backdrop blur so scrolling content shows faintly through; only over a plain canvas that scrolls beneath it, never over images or maps.',
    },
    align: {
      values: ['start', 'center'],
      default: 'start',
      description: 'start = brand, then nav, actions pushed right (the reference "simple" header). center = nav centered between a flexible brand block and a flexible actions block (the reference "centered" header).',
    },
  },
  states: {
    current: { selector: ' .cn-topbar__item[aria-current="page"]', description: 'The destination the user is on (on the ITEM): gray-50 fill, gray-800 text, gray-500 icon; gray-100 when also hovered.', markup: 'aria-current="page" on the item' },
    hover: { selector: ' .cn-topbar__item:hover', description: 'Pointer over an item: gray-50 fill, darker text and icon.', markup: 'native :hover on the item' },
    focus: { selector: ' .cn-topbar__item:focus-visible, & .cn-topbar__brand:focus-visible', description: 'Keyboard focus on an item or the brand: the 4px brand ring.', markup: 'native :focus-visible' },
  },
  base: {
    root: {
      position: 'sticky',
      top: '0',
      'z-index': '{z.sticky}',
      width: '100%',
      'background-color': '{color.bg-surface}',
      'border-bottom': HAIRLINE,
      color: '{color.fg-default}',
    },
    inner: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.4}',
      height: '{space.16}',
      width: '100%',
      'max-width': '{size.container.xl}',
      'margin-inline': 'auto',
      'padding-inline': '{space.8}',
      'min-width': '0',
    },
    brand: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.2.5}',
      'flex-shrink': '0',
      height: '{space.6}',
      ...typeStyle('label-lg'),
      color: '{color.fg-default}',
      'text-decoration': 'none',
      'white-space': 'nowrap',
      'border-radius': '{radius.xs}',
    },
    logo: { width: '{space.6}', height: '{space.6}', 'border-radius': '{radius.md}', 'background-color': '{color.bg-action}', 'flex-shrink': '0' },
    nav: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.0.5}',
      'min-width': '0',
    },
    item: {
      position: 'relative',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      gap: '{space.1}',
      'flex-shrink': '0',
      height: '{space.8}',
      padding: '{space.1.5} {space.2}',
      'border-radius': '{radius.md}',
      ...typeStyle('label-md'),
      color: '{color.fg-muted}',
      'text-decoration': 'none',
      'white-space': 'nowrap',
      'user-select': 'none',
      cursor: 'pointer',
      ...TRANSITION_FAST,
    },
    icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', color: '{color.fg-subtle}', transition: 'inherit' },
    count: {
      position: 'absolute',
      top: '-1px',
      right: '-1px',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.3.5}',
      height: '{space.3.5}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-danger}',
      color: '{white}',
      'font-size': '10px',
      'font-weight': '{font.weight.bold}',
      'line-height': '1',
      'box-shadow': '0 0 0 1.5px {color.bg-surface}',
    },
    search: { width: '100%', 'max-width': '280px' },
    actions: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.3}',
      'flex-shrink': '0',
      'margin-inline-start': 'auto',
    },
    secondary: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.8}',
      height: '{space.16}',
      width: '100%',
      'max-width': '{size.container.xl}',
      'margin-inline': 'auto',
      'padding-inline': '{space.8}',
      'border-top': HAIRLINE,
    },
  },
  variants: {
    variant: {
      solid: { root: {} },
      translucent: {
        root: {
          'background-color': 'color-mix(in srgb, {color.bg-surface} 85%, transparent)',
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
        },
      },
    },
    align: {
      start: { root: {} },
      center: { inner: { gap: '{space.8}' }, brand: { flex: '1 1 0' }, actions: { flex: '1 1 0', 'justify-content': 'flex-end', 'margin-inline-start': '0' } },
    },
  },
  extraCss: `
.cn-topbar__item:hover, .cn-topbar__item[aria-current="page"] { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-topbar__item:hover .cn-topbar__icon, .cn-topbar__item[aria-current="page"] .cn-topbar__icon { color: {color.fg-muted}; }
.cn-topbar__item[aria-current="page"]:hover { background-color: {color.bg-muted}; }
.cn-topbar__item[data-icon-only] { width: {space.9}; height: {space.9}; padding: 0; }
.cn-topbar__item:focus-visible, .cn-topbar__brand:focus-visible { outline: none; box-shadow: {shadow.focus}; z-index: {z.raised}; }
.cn-topbar__actions > .cn-topbar__item + .cn-topbar__item { margin-inline-start: calc({space.3} * -1 + {space.0.5}); }
.cn-topbar__nav .cn-tabs[data-variant="underline"], .cn-topbar__secondary .cn-tabs[data-variant="underline"] { border-bottom: 0; margin-bottom: -1px; }
.cn-topbar__nav .cn-tabs[data-variant="underline"] { align-self: flex-end; }
.cn-topbar__secondary[data-nav="tabs"] { height: auto; padding: {space.3} {space.8} 0; align-items: flex-end; }
.cn-topbar__search .cn-kbd { margin-inline-end: {space.2}; }
@media (max-width: {breakpoint.lg}) { .cn-topbar .cn-topbar__inner, .cn-topbar .cn-topbar__secondary { padding-inline: {space.4}; } .cn-topbar .cn-topbar__nav, .cn-topbar .cn-topbar__search { display: none; } }`,
  examples: [
    ex('Simple header', `<header class="cn-topbar" data-variant="solid" data-align="start"><div class="cn-topbar__inner">${BRAND}${NAV}<div class="cn-topbar__actions">${SEARCH}${iconItem('Settings', 'settings')}${iconItem('Notifications', 'inbox', '3')}${AVATAR}</div></div></header>`, '64px bar, 1280px container with 32px padding. Dashboard is current (gray-50 pill); notifications carry the 14px red count.'),
    ex('Dual tier with tabs', `<header class="cn-topbar" data-variant="solid" data-align="start"><div class="cn-topbar__inner">${BRAND}${NAV}${ACTIONS}</div><div class="cn-topbar__secondary" data-nav="tabs">${routeTabs(1, ['Overview', 'Customers', 'Invoices', 'Files', 'Settings'])}</div></header>`, 'The second tier holds underline Tabs sm whose brand bar sits on the tier\'s hairline.'),
    ex('Dual tier with pills and search', `<header class="cn-topbar" data-variant="solid" data-align="start"><div class="cn-topbar__inner">${BRAND}${NAV}${ACTIONS}</div><div class="cn-topbar__secondary"><nav class="cn-topbar__nav" aria-label="Secondary">${item('All projects', true)}${item('Shared with me')}${item('Archived')}</nav><div class="cn-topbar__actions">${SEARCH}</div></div></header>`, 'A second 64px row of pills with the search on its right.'),
    ex('Centered, translucent', `<header class="cn-topbar" data-variant="translucent" data-align="center"><div class="cn-topbar__inner">${BRAND}${NAV}<div class="cn-topbar__actions">${iconItem('Search', 'search')}${iconItem('Notifications', 'inbox')}${AVATAR}</div></div></header>`, 'Nav centered between the brand and the actions; 85% surface with a 12px blur over scrolling content.'),
    ex('Minimal (marketing / auth)', `<header class="cn-topbar" data-variant="solid" data-align="start"><div class="cn-topbar__inner">${BRAND}<div class="cn-topbar__actions">${btn('Log in', 'ghost')}${btn('Sign up', 'primary')}</div></div></header>`, 'No nav at all; brand left, two actions right.'),
  ],
  rules: [
    'Exactly one Topbar per app, 64px per tier, sticky. Secondary navigation is the second tier, a Sidebar or page-level Tabs; never a third bar.',
    'The brand is the 24px mark plus the product name (label-lg semibold) and always links to the home view.',
    'Nav items are 32px pills, 2px apart, 14px semibold; labels are the product\'s top-level nouns ("Projects", "Reporting"), never verbs. The current one carries aria-current="page".',
    'Actions hold at most: search (280px), two icon-only items, one outline and one primary Button, then the account Avatar. Everything else goes into a Menu behind the account or a ⋯ item.',
    'Global search lives in actions as an Input sm with the ⌘K Kbd and opens the CommandPalette; it is not a page filter.',
    'Page titles, breadcrumbs, filters and tabs of the current page live in the PageHeader below the topbar, never inside it.',
    'translucent only when content scrolls beneath the bar on a plain canvas; on app shells with a Sidebar and over images use solid.',
    'Under 1024px the nav and search hide; use the Sidebar\'s mobile header (menu button + drawer) instead of squeezing pills.',
  ],
  a11y: [
    'Root is a <header> (banner landmark); the nav slot is a <nav aria-label="Primary"> of plain links with aria-current="page"; a second tier gets aria-label="Secondary".',
    'Provide a "Skip to content" link as the first focusable element before the topbar, visible on focus.',
    'The brand link has an accessible name (the visible text, or aria-label when it is only a logo image).',
    'Icon-only items carry aria-label; the notification count is read with it ("Notifications, 3 unread") by adding the number to the label or an sr-only span.',
    'The account avatar is a <button aria-haspopup="menu" aria-expanded>; the menu it opens is a Menu.',
    'Because the bar is sticky, set scroll-padding-top on the html element to the total topbar height (64 or 128px).',
  ],
  related: ['tabs', 'sidebar', 'sidebar-nav', 'input', 'kbd', 'avatar', 'menu', 'command-palette'],
};
