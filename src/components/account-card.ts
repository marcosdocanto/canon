import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Account card: the signed-in person as a row: 40px avatar with a presence dot,
// name and email, and a ⋯ button that opens the account Menu. Lives at the
// bottom of the Sidebar and the mobile drawer, and in account switchers.

const SELECTOR = '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6.25l3-3 3 3M5 9.75l3 3 3-3"/></svg>';
const LOGOUT = '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 13.5h-3a1 1 0 01-1-1v-9a1 1 0 011-1h3M10.5 11l3-3-3-3M13.5 8h-7"/></svg>';

const card = (o: { variant?: string; size?: string; initials: string; name: string; email: string; status?: string; attrs?: string; menu?: string }) =>
  `<div class="cn-account-card" data-variant="${o.variant ?? 'card'}" data-size="${o.size ?? 'md'}"${o.attrs ?? ''}><span class="cn-account-card__avatar" role="img" aria-label="${o.name}${o.status ? `, ${o.status}` : ''}">${o.initials}${o.status ? `<span class="cn-account-card__status" data-status="${o.status}"></span>` : ''}</span><div class="cn-account-card__content"><span class="cn-account-card__name">${o.name}</span><span class="cn-account-card__email">${o.email}</span></div>${o.menu ?? `<button type="button" class="cn-account-card__menu" aria-label="Account menu" aria-haspopup="menu" aria-expanded="false">${SELECTOR}</button>`}</div>`;

const wrap = (inner: string, width = '296px') => `<div style="width:100%;max-width:${width}">${inner}</div>`;
const menuItem = (label: string, icon: string, attrs = '') => `<button type="button" role="menuitem" class="cn-menu__item"${attrs}>${icon.replace('cn-icon', 'cn-menu__icon')}<span class="cn-menu__text">${label}</span></button>`;

export const accountCard: ComponentSpec = {
  name: 'AccountCard',
  slug: 'account-card',
  category: 'data-display',
  description: 'The signed-in person as a row: a 40px avatar with a presence dot, name in label-md, email in body-sm muted, and a ⋯ button that opens the account Menu. A hairline card at the bottom of the Sidebar, a plain row inside menus, or a compact row in account switchers.',
  usage: 'Use wherever the current account is shown with a way to act on it: the bottom of the Sidebar and the mobile drawer, the header of the account Menu, the rows of a workspace switcher. Not for other people in lists (use List with an Avatar) and not for a profile page header (PageHeader).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The row: flex, 12px gap and padding, bg-surface, hairline, radius card, shadow-xs. Relative so a Menu can anchor to it.' },
    { part: 'avatar', element: 'span', description: '40px circle with initials or an <img>; relative so the status dot sits on its edge. role="img" + aria-label including presence.' },
    { part: 'status', element: 'span', description: '10px presence dot at the bottom-right of the avatar with a 2px surface ring; data-status="online|away|busy|offline" colors it.', optional: true },
    { part: 'content', element: 'div', description: 'Name over email, fills the row, truncates.' },
    { part: 'name', element: 'span', description: 'label-md, one line, ellipsis.' },
    { part: 'email', element: 'span', description: 'body-sm muted, one line, ellipsis.' },
    { part: 'menu', element: 'button', description: '32px ghost button with a 16px up/down selector icon that opens the account Menu. aria-label "Account menu", aria-haspopup, aria-expanded.', optional: true },
  ],
  props: {
    variant: {
      values: ['card', 'plain', 'compact'],
      default: 'card',
      description: 'card = hairline card with shadow-xs, the Sidebar account card. plain = no border or shadow, 8px padding, for the header of a Menu or a Popover. compact = 8px padding, 32px avatar and smaller text for rows in an account switcher.',
    },
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 40px avatar, label-md name, body-sm email (sidebars, drawers). sm = 32px avatar, label-sm name, body-xs email for dense panels and popovers.',
    },
  },
  states: {
    hover: { selector: '[data-interactive]:hover', description: 'Pointer over a clickable card (only when the whole row is the trigger, marked data-interactive): subtle fill.', markup: 'data-interactive on the root and native :hover' },
    selected: { selector: '[aria-selected="true"], &[data-selected]', description: 'The current account in a switcher: action-colored border and a 1px ring.', markup: 'aria-selected="true" (inside a listbox) or data-selected on the root' },
    menuHover: { selector: ' .cn-account-card__menu:hover', description: 'Pointer over the ⋯ button (extraCss): subtle fill, ink icon.', markup: 'native :hover on .cn-account-card__menu' },
    menuOpen: { selector: ' .cn-account-card__menu[aria-expanded="true"]', description: 'The account Menu is open (extraCss): the button keeps the subtle fill.', markup: 'aria-expanded="true" on .cn-account-card__menu' },
    menuFocus: { selector: ' .cn-account-card__menu:focus-visible', description: 'Keyboard focus on the ⋯ button shows the focus ring (extraCss).', markup: 'native :focus-visible on .cn-account-card__menu' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'align-items': 'center',
      gap: '{space.3}',
      width: '100%',
      'min-width': '0',
      padding: '{space.3}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-default}',
      'border-radius': '{radius.card}',
      'box-shadow': '{shadow.xs}',
      color: '{color.fg-default}',
      ...TRANSITION_COLORS,
    },
    avatar: {
      position: 'relative',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.10}',
      height: '{space.10}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-subtle}',
      color: '{color.fg-muted}',
      ...typeStyle('label-sm'),
      'letter-spacing': '{font.letterSpacing.wide}',
      'text-transform': 'uppercase',
      'user-select': 'none',
    },
    status: {
      position: 'absolute',
      bottom: '0',
      right: '0',
      width: '{space.2.5}',
      height: '{space.2.5}',
      'border-radius': '{radius.full}',
      'background-color': '{color.fg-subtle}',
      'box-shadow': '0 0 0 {border.width.medium} {color.bg-surface}',
    },
    content: { flex: '1 1 auto', 'min-width': '0', display: 'flex', 'flex-direction': 'column', gap: '{space.0.5}' },
    name: { ...typeStyle('label-md'), 'line-height': '{font.lineHeight.snug}', color: '{color.fg-default}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    email: { ...typeStyle('body-sm'), color: '{color.fg-muted}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    menu: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.8}',
      height: '{space.8}',
      'border-radius': '{radius.md}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
    '@states': {
      hover: { root: { 'background-color': '{color.bg-subtle}', cursor: 'pointer' } },
      selected: { root: { 'border-color': '{color.border-action}', 'box-shadow': '0 0 0 {border.width.thin} {color.border-action}' } },
    },
  },
  variants: {
    variant: {
      card: { root: {} },
      plain: { root: { border: '0', 'box-shadow': 'none', 'background-color': 'transparent', padding: '{space.2}' } },
      compact: {
        root: { padding: '{space.2}', gap: '{space.2.5}' },
        avatar: { width: '{space.8}', height: '{space.8}', 'font-size': '{font.size.2xs}' },
        status: { width: '{space.2}', height: '{space.2}' },
        name: { ...typeStyle('label-sm'), 'line-height': '{font.lineHeight.snug}' },
        email: { ...typeStyle('body-xs') },
      },
    },
    size: {
      md: { root: {} },
      sm: {
        avatar: { width: '{space.8}', height: '{space.8}', 'font-size': '{font.size.2xs}' },
        status: { width: '{space.2}', height: '{space.2}' },
        name: { ...typeStyle('label-sm'), 'line-height': '{font.lineHeight.snug}' },
        email: { ...typeStyle('body-xs') },
      },
    },
  },
  extraCss: `
.cn-account-card__avatar > img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
.cn-account-card__status[data-status="online"] { background-color: {color.bg-success}; }
.cn-account-card__status[data-status="away"] { background-color: {color.bg-warning}; }
.cn-account-card__status[data-status="busy"] { background-color: {color.bg-danger}; }
.cn-account-card__status[data-status="offline"] { background-color: {color.fg-subtle}; }
.cn-account-card__menu .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-account-card__menu:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-account-card__menu[aria-expanded="true"] { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-account-card__menu:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-account-card[data-variant="plain"][data-selected], .cn-account-card[data-variant="plain"][aria-selected="true"] { background-color: {color.bg-subtle}; border: 0; box-shadow: none; }`,
  examples: [
    ex('Card (sidebar)', wrap(card({ initials: 'MC', name: 'Maya Chen', email: 'maya@lumen.co', status: 'online' })), 'The bottom-of-sidebar card: 40px avatar with a presence dot, name, email, and the selector button that opens the account Menu.'),
    ex('Plain (inside a menu or popover)', wrap(card({ variant: 'plain', initials: 'DC', name: 'Daniel Costa', email: 'daniel@lumen.co', status: 'away', menu: '' })), 'No border or shadow, 8px padding; the surrounding panel provides the frame.'),
    ex('Compact rows in a switcher', wrap(`<div role="listbox" aria-label="Switch account" style="display:flex;flex-direction:column;gap:var(--cn-space-1)">${card({ variant: 'compact', initials: 'MC', name: 'Maya Chen', email: 'maya@lumen.co', status: 'online', attrs: ' role="option" aria-selected="true"', menu: '' })}${card({ variant: 'compact', initials: 'LD', name: 'Lumen Design', email: 'design@lumen.co', attrs: ' role="option" aria-selected="false" data-interactive', menu: '' })}${card({ variant: 'compact', initials: 'SA', name: 'Sofia Almeida', email: 'sofia@lumen.co', status: 'busy', attrs: ' role="option" aria-selected="false" data-interactive', menu: '' })}</div>`), 'aria-selected="true" draws the action-colored ring; the other rows are clickable (data-interactive).'),
    ex('Small size and presence values', wrap(`<div style="display:flex;flex-direction:column;gap:var(--cn-space-3)">${card({ size: 'sm', initials: 'AK', name: 'Aisha Khan', email: 'aisha@lumen.co', status: 'online' })}${card({ size: 'sm', initials: 'NB', name: 'Noah Berg', email: 'noah@lumen.co', status: 'offline' })}</div>`), 'sm = 32px avatar, label-sm name, body-xs email. online · away · busy · offline.'),
  ],
  recipes: [
    ex('With the account menu open', `<div class="cn-menu-anchor" style="width:100%;max-width:296px;min-height:232px">${card({ initials: 'MC', name: 'Maya Chen', email: 'maya@lumen.co', status: 'online', menu: `<button type="button" class="cn-account-card__menu" id="acct-menu-trigger" aria-label="Account menu" aria-haspopup="menu" aria-expanded="true" aria-controls="acct-menu">${SELECTOR}</button>` })}<div class="cn-menu" data-size="md" role="menu" id="acct-menu" aria-labelledby="acct-menu-trigger" data-state="open" data-floating style="width:100%">${menuItem('View profile', ICON.user)}${menuItem('Settings', ICON.settings)}<div class="cn-menu__separator" role="separator"></div>${menuItem('Log out', LOGOUT)}</div></div>`, 'The Menu anchors to the card with .cn-menu-anchor + data-floating and spans its width. Log out is last, after a separator.'),
  ],
  rules: [
    'Shows the signed-in person only: their own name, their own email. Other people are List rows with an Avatar.',
    'One action: the selector button opens the account Menu (profile, settings, switch account, log out). Never add a second button to the row.',
    'Presence dots only when the product has real-time presence; otherwise omit the status part rather than showing everyone online.',
    'card in the Sidebar and the mobile drawer; plain as the header of the account Menu or a Popover; compact for the rows of an account switcher.',
    'Name and email truncate with an ellipsis; the full values are in the avatar\'s aria-label and the Menu header. Never wrap to two lines.',
    'A clickable whole row (data-interactive) is for switchers only; in the Sidebar the row is static and the button is the trigger.',
    'The selected account in a switcher gets the action-colored ring; hover uses the subtle fill. Never both on the same row.',
    'Keep the avatar neutral (initials on bg-subtle or the photo); the accent tone is reserved for the AI agent.',
  ],
  a11y: [
    'The avatar carries role="img" and an aria-label with the full name and presence ("Maya Chen, online"); the dot alone is decorative.',
    'The menu button has aria-label "Account menu", aria-haspopup="menu", aria-expanded and aria-controls pointing at the Menu; Escape closes the menu and returns focus to it.',
    'In a switcher the rows are role="option" inside role="listbox" with aria-selected; Up/Down move, Enter selects.',
    'Name and email are plain text so they are read in order; do not hide them with CSS in narrow layouts, truncate instead.',
    'Contrast: name in fg-default, email in fg-muted (AA on bg-surface and bg-subtle).',
  ],
  related: ['sidebar', 'mobile-header', 'menu', 'avatar', 'popover', 'list'],
};
