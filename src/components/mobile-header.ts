import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Mobile header: the 64px bar that replaces the Sidebar below the lg breakpoint
// (logo left, 40px hamburger right, bottom hairline) and the slide-in drawer it
// opens: logo row, 48px nav items, support/settings and the account card at the
// bottom. The drawer is rendered statically here (absolute, never fixed).

const MENU = '<svg class="cn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const X = '<svg class="cn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const BELL = '<svg class="cn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20a2 2 0 004 0"/></svg>';
const LOGOUT = '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 13.5h-3a1 1 0 01-1-1v-9a1 1 0 011-1h3M10.5 11l3-3-3-3M13.5 8h-7"/></svg>';

const LOGO = `<a href="#" class="cn-mobile-header__logo" aria-label="Lumen home"><span class="cn-mobile-header__mark" aria-hidden="true"></span><span class="cn-mobile-header__brand">Lumen</span></a>`;
const toggle = (open: boolean) => `<button type="button" class="cn-mobile-header__toggle" aria-label="${open ? 'Close menu' : 'Open menu'}" aria-expanded="${open}" aria-controls="mh-drawer">${open ? X : MENU}</button>`;
const navItem = (label: string, icon: string, current = false, badge = '') =>
  `<a href="#" class="cn-mobile-header__item"${current ? ' aria-current="page"' : ''}>${icon.replace('cn-icon', 'cn-mobile-header__icon')}<span class="cn-mobile-header__label">${label}</span>${badge ? `<span class="cn-mobile-header__badge">${badge}</span>` : ''}</a>`;
const ACCOUNT = `<div class="cn-mobile-header__account"><span class="cn-mobile-header__avatar" role="img" aria-label="Maya Chen">MC</span><div class="cn-mobile-header__account-text"><span class="cn-mobile-header__name">Maya Chen</span><span class="cn-mobile-header__email">maya@lumen.co</span></div><button type="button" class="cn-mobile-header__account-action" aria-label="Log out">${LOGOUT}</button></div>`;
const DRAWER = `<div class="cn-mobile-header__scrim" aria-hidden="true"></div><nav class="cn-mobile-header__drawer" id="mh-drawer" aria-label="Main"><div class="cn-mobile-header__drawer-header">${LOGO}<button type="button" class="cn-close-button" data-size="sm" data-theme="light" aria-label="Close menu">${ICON.x.replace('cn-icon', 'cn-close-button__icon')}</button></div><div class="cn-mobile-header__nav">${navItem('Home', ICON.home)}${navItem('Dashboard', ICON.calendar, true)}${navItem('Projects', ICON.copy)}${navItem('Tasks', ICON.check, false, '10')}${navItem('Reporting', ICON.inbox)}${navItem('Users', ICON.user)}</div><div class="cn-mobile-header__footer">${navItem('Support', ICON.info)}${navItem('Settings', ICON.settings)}${ACCOUNT}</div></nav>`;

const phone = (inner: string, tall = false) => `<div style="width:100%;max-width:375px${tall ? ';min-height:640px' : ''}">${inner}</div>`;
const header = (variant: string, inner: string) => `<header class="cn-mobile-header" data-variant="${variant}">${inner}</header>`;

export const mobileHeader: ComponentSpec = {
  name: 'MobileHeader',
  slug: 'mobile-header',
  category: 'navigation',
  description: 'The 64px top bar that replaces the Sidebar on small screens: logo on the left, a 40px hamburger on the right, a bottom hairline; plus the 296px drawer it opens with a logo row, 48px navigation items, the support and settings group and the account card at the bottom. The drawer is positioned under the bar (absolute), never fixed.',
  usage: 'Use as the app header below the lg breakpoint, paired with the Sidebar above it. Not for marketing sites (HeaderNavigation has its own mobile menu) and not as a page header inside content (PageHeader).',
  anatomy: [
    { part: 'root', element: 'header', description: 'The 64px bar: flex, space-between, 16px horizontal padding, bg-surface, bottom hairline; relative so the drawer anchors to it.' },
    { part: 'logo', element: 'a', description: 'Link to home holding the mark and the wordmark. aria-label "Lumen home".' },
    { part: 'mark', element: 'span', description: '28px action-colored square mark (replace with the real logo).' },
    { part: 'brand', element: 'span', description: 'The product name, label-md semibold.' },
    { part: 'actions', element: 'div', description: 'Optional cluster before the toggle (search, notifications) as ghost IconButtons.', optional: true },
    { part: 'toggle', element: 'button', description: '40px hamburger button with a 24px icon; aria-expanded and aria-controls point at the drawer; shows an × when open.' },
    { part: 'scrim', element: 'div', description: 'The overlay under the bar that dims the page while the drawer is open (bg-overlay). Hidden when closed.', optional: true },
    { part: 'drawer', element: 'nav', description: 'The 296px panel under the bar: bg-surface, right hairline, shadow-xl, 16px padding, flex column. aria-label "Main". Hidden when closed.', optional: true },
    { part: 'drawer-header', element: 'div', description: 'First row of the drawer: the logo again and a CloseButton.', optional: true },
    { part: 'nav', element: 'div', description: 'Main list of nav items, 4px apart, fills the drawer.', optional: true },
    { part: 'item', element: 'a', description: '48px navigation link: 24px icon, 16px semibold label, optional count. aria-current="page" on the current one.', optional: true },
    { part: 'icon', element: 'svg', description: '24px icon in fg-subtle before the label.', optional: true },
    { part: 'label', element: 'span', description: 'The item text, truncated.', optional: true },
    { part: 'badge', element: 'span', description: 'Trailing count pill (22px, bg-subtle, body-xs).', optional: true },
    { part: 'footer', element: 'div', description: 'Bottom group: Support and Settings items above the account card; top hairline.', optional: true },
    { part: 'account', element: 'div', description: 'Account card: 40px avatar, name + email, log-out button, in a hairline card.', optional: true },
    { part: 'avatar', element: 'span', description: '40px circle with initials; role="img" + aria-label.', optional: true },
    { part: 'account-text', element: 'div', description: 'Name and email column.', optional: true },
    { part: 'name', element: 'span', description: 'label-sm, truncated.', optional: true },
    { part: 'email', element: 'span', description: 'body-sm muted, truncated.', optional: true },
    { part: 'account-action', element: 'button', description: '36px utility button (log out). aria-label required.', optional: true },
  ],
  props: {
    variant: {
      values: ['simple', 'with-drawer-open'],
      default: 'simple',
      description: 'simple = the bar only; the drawer and scrim are hidden (the resting state). with-drawer-open = the drawer and scrim are shown under the bar and the toggle shows ×; the app switches to this state when the toggle is pressed.',
    },
  },
  states: {
    expanded: { selector: ' .cn-mobile-header__toggle[aria-expanded="true"]', description: 'The toggle while the drawer is open (on the toggle; extraCss): subtle fill and ink icon.', markup: 'aria-expanded="true" on .cn-mobile-header__toggle' },
    current: { selector: ' .cn-mobile-header__item[aria-current="page"]', description: 'The current destination (on the item; extraCss): subtle fill, ink text.', markup: 'aria-current="page" on .cn-mobile-header__item' },
    hover: { selector: ' .cn-mobile-header__item:hover, & .cn-mobile-header__toggle:hover', description: 'Pointer over an item or the toggle (extraCss): subtle fill.', markup: 'native :hover' },
    focus: { selector: ' .cn-mobile-header__item:focus-visible, & .cn-mobile-header__toggle:focus-visible, & .cn-mobile-header__logo:focus-visible', description: 'Keyboard focus shows the ring on links and buttons (extraCss).', markup: 'native :focus-visible' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      gap: '{space.3}',
      height: '{space.16}',
      width: '100%',
      'padding-inline': '{space.4}',
      'background-color': '{color.bg-surface}',
      'border-bottom': '{border.width.thin} solid {color.border-default}',
      color: '{color.fg-default}',
    },
    logo: { display: 'inline-flex', 'align-items': 'center', gap: '{space.2}', color: '{color.fg-default}', 'text-decoration': 'none', 'border-radius': '{radius.sm}' },
    mark: { width: '{space.7}', height: '{space.7}', 'border-radius': '{radius.md}', 'background-color': '{color.bg-action}', 'flex-shrink': '0' },
    brand: { ...typeStyle('label-md'), 'font-weight': '{font.weight.semibold}' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.1}', 'margin-inline-start': 'auto' },
    toggle: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.10}',
      height: '{space.10}',
      'margin-inline-end': 'calc(-1 * {space.2})',
      'border-radius': '{radius.control}',
      color: '{color.fg-muted}',
      ...TRANSITION_COLORS,
    },
    scrim: { display: 'none', position: 'absolute', top: '100%', 'inset-inline': '0', height: '560px', 'background-color': '{color.bg-overlay}', 'z-index': '{z.overlay}' },
    drawer: {
      display: 'none',
      position: 'absolute',
      top: '100%',
      'inset-inline-start': '0',
      'z-index': '{z.modal}',
      width: '100%',
      'max-width': '296px',
      height: '560px',
      'flex-direction': 'column',
      gap: '{space.4}',
      padding: '{space.4}',
      'background-color': '{color.bg-surface}',
      'border-inline-end': '{border.width.thin} solid {color.border-default}',
      'box-shadow': '{shadow.xl}',
      overflow: 'auto',
    },
    'drawer-header': { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '{space.3}', 'min-height': '{space.9}' },
    nav: { display: 'flex', 'flex-direction': 'column', gap: '{space.1}', flex: '1 1 auto', 'min-height': '0' },
    item: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.3}',
      height: '{space.12}',
      'padding-inline': '{space.3}',
      'border-radius': '{radius.md}',
      ...typeStyle('body-lg'),
      'font-weight': '{font.weight.semibold}',
      color: '{color.fg-muted}',
      'text-decoration': 'none',
      ...TRANSITION_COLORS,
    },
    icon: { width: '{size.icon.xl}', height: '{size.icon.xl}', 'flex-shrink': '0', color: '{color.fg-subtle}' },
    label: { flex: '1 1 auto', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    badge: { display: 'inline-flex', 'align-items': 'center', height: '22px', 'padding-inline': '{space.2}', 'border-radius': '{radius.full}', 'background-color': '{color.bg-subtle}', border: '{border.width.thin} solid {color.border-default}', ...typeStyle('body-xs'), 'font-weight': '{font.weight.medium}', color: '{color.fg-muted}' },
    footer: { display: 'flex', 'flex-direction': 'column', gap: '{space.1}', 'margin-top': 'auto', 'padding-top': '{space.4}', 'border-top': '{border.width.thin} solid {color.border-default}' },
    account: { display: 'flex', 'align-items': 'center', gap: '{space.3}', padding: '{space.3}', 'margin-top': '{space.3}', 'border-radius': '{radius.card}', border: '{border.width.thin} solid {color.border-default}', 'background-color': '{color.bg-surface}', 'box-shadow': '{shadow.xs}' },
    avatar: { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'flex-shrink': '0', width: '{space.10}', height: '{space.10}', 'border-radius': '{radius.full}', 'background-color': '{color.bg-subtle}', color: '{color.fg-muted}', ...typeStyle('label-sm'), 'letter-spacing': '{font.letterSpacing.wide}', 'user-select': 'none' },
    'account-text': { display: 'flex', 'flex-direction': 'column', 'min-width': '0', flex: '1 1 auto' },
    name: { ...typeStyle('label-sm'), 'line-height': '{font.lineHeight.snug}', color: '{color.fg-default}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    email: { ...typeStyle('body-sm'), color: '{color.fg-muted}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    'account-action': { ...RESET_BUTTON, display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'flex-shrink': '0', width: '{space.9}', height: '{space.9}', 'border-radius': '{radius.md}', color: '{color.fg-subtle}', ...TRANSITION_COLORS },
  },
  variants: {
    variant: {
      simple: { drawer: { display: 'none' }, scrim: { display: 'none' } },
      'with-drawer-open': { drawer: { display: 'flex' }, scrim: { display: 'block' } },
    },
  },
  extraCss: `
.cn-mobile-header__toggle .cn-icon { width: {size.icon.xl}; height: {size.icon.xl}; }
.cn-mobile-header__toggle:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-mobile-header__toggle[aria-expanded="true"] { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-mobile-header__toggle:focus-visible, .cn-mobile-header__logo:focus-visible, .cn-mobile-header__item:focus-visible, .cn-mobile-header__account-action:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-mobile-header__item:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-mobile-header__item[aria-current="page"] { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-mobile-header__item[aria-current="page"] .cn-mobile-header__icon { color: {color.fg-muted}; }
.cn-mobile-header__account-action .cn-icon { width: {size.icon.lg}; height: {size.icon.lg}; }
.cn-mobile-header__account-action:hover { background-color: {color.bg-subtle}; color: {color.fg-muted}; }`,
  examples: [
    ex('Simple', phone(header('simple', `${LOGO}${toggle(false)}`)), 'The resting bar: logo left, hamburger right, hairline below. The drawer is in the DOM but hidden.'),
    ex('With the drawer open', phone(header('with-drawer-open', `${LOGO}${toggle(true)}${DRAWER}`), true), 'The toggle becomes ×, the scrim dims the page and the 296px drawer slides in under the bar: logo row, 48px items, Support/Settings and the account card.'),
    ex('With actions', phone(header('simple', `${LOGO}<div class="cn-mobile-header__actions"><button type="button" class="cn-icon-button" data-variant="ghost" data-size="md" data-shape="square" aria-label="Search">${ICON.search.replace('cn-icon', 'cn-icon-button__icon')}</button><button type="button" class="cn-icon-button" data-variant="ghost" data-size="md" data-shape="square" aria-label="Notifications, 3 unread">${BELL.replace('cn-icon', 'cn-icon-button__icon')}</button></div>${toggle(false)}`)), 'Up to two ghost IconButtons before the toggle; more goes into the drawer.'),
  ],
  rules: [
    'Show the MobileHeader below the lg breakpoint and the Sidebar above it; never both at once.',
    'The bar is 64px with the logo on the left and the hamburger on the right; at most two icon actions between them.',
    'The drawer mirrors the Sidebar exactly: same items, same order, same account card. Do not add mobile-only destinations.',
    'Items are 48px so they are comfortable to tap; the current one has the subtle fill and aria-current="page".',
    'Opening the drawer swaps the hamburger for an ×, adds the scrim and locks page scroll; closing restores focus to the toggle.',
    'Counts use the badge part; never red dots for ordinary counts.',
    'In the app, position the drawer as a fixed layer in the app shell; the component itself only styles the panel under the bar.',
    'Escape and a tap on the scrim close the drawer; swiping left may close it but is never the only way.',
  ],
  a11y: [
    'The toggle is a <button> with aria-label ("Open menu" / "Close menu"), aria-expanded and aria-controls pointing at the drawer id.',
    'The drawer is a <nav aria-label="Main">; the current item carries aria-current="page". While open, focus moves into the drawer and stays there until it closes.',
    'The scrim is aria-hidden; the CloseButton inside the drawer duplicates the toggle for screen-reader users who are inside the panel.',
    'Initials avatars carry role="img" with the full name; the log-out button has an aria-label.',
    'Touch targets are at least 40px (toggle) and 48px (items); the logo link has an aria-label because the mark alone has no name.',
  ],
  related: ['sidebar', 'sidebar-nav', 'account-card', 'close-button', 'icon-button', 'drawer'],
};
