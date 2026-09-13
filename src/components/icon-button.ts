import type { ComponentSpec, StyleBlock } from '../types.ts';
import { CONTROL, RESET_BUTTON, STATE, SIZE_PROP, ex, ICON } from './_shared.ts';

// the system icon-only button (Button with data-icon-only) plus the ButtonUtility
// used for close (×) and table-row actions: same box as Button (32–48px), 20px icon
// (16px on xs), a flat fill or a single inset border on filled/ringed intents.

const TRANSITION_FAST = {
  'transition-property': 'background-color, border-color, color, box-shadow, opacity',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const SHADOW_SOLID = '{shadow.control}, {shadow.xs}';
const shadowRinged = (color: string) => `${ring(color)}, ${SHADOW_SOLID}`;
const ICON_ON_SOLID = 'color-mix(in srgb, currentColor 60%, transparent)';
const ICON_ON_SOLID_HOVER = 'color-mix(in srgb, currentColor 70%, transparent)';

const solid = (bg: string, hoverBg: string, fg: string, focus: string): StyleBlock => ({
  root: { 'background-color': bg, color: fg, 'box-shadow': SHADOW_SOLID },
  icon: { color: ICON_ON_SOLID },
  '@states': {
    hover: { root: { 'background-color': hoverBg }, icon: { color: ICON_ON_SOLID_HOVER } },
    loading: { root: { 'background-color': hoverBg } },
    focus: { root: { 'box-shadow': `${SHADOW_SOLID}, ${focus}` } },
    pressed: { root: { 'background-color': hoverBg } },
  },
});
const bordered = (bg: string, ringColor: string, hoverBg: string, pressedBg: string): StyleBlock => ({
  root: { 'background-color': bg, color: '{color.fg-subtle}', 'box-shadow': shadowRinged(ringColor) },
  '@states': {
    hover: { root: { 'background-color': hoverBg, color: '{color.fg-muted}' } },
    loading: { root: { 'background-color': hoverBg } },
    focus: { root: { 'box-shadow': `${shadowRinged(ringColor)}, {shadow.focus}` } },
    pressed: { root: { 'background-color': pressedBg, color: '{color.fg-default}', 'box-shadow': shadowRinged(ringColor) } },
  },
});
const plain = (): StyleBlock => ({
  root: { 'background-color': 'transparent', color: '{color.fg-subtle}', 'box-shadow': 'none' },
  '@states': {
    hover: { root: { 'background-color': '{color.bg-subtle}', color: '{color.fg-muted}' } },
    loading: { root: { 'background-color': '{color.bg-subtle}' } },
    focus: { root: { 'box-shadow': '{shadow.focus}' } },
    pressed: { root: { 'background-color': '{color.bg-subtle}', color: '{color.fg-default}' } },
  },
});

const sizeBlock = (s: keyof typeof CONTROL): StyleBlock => ({
  root: { width: CONTROL[s].height, height: CONTROL[s].height },
  icon: { width: CONTROL[s].icon, height: CONTROL[s].icon },
  spinner: { width: CONTROL[s].icon, height: CONTROL[s].icon },
});

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-icon-button__icon');
const btn = (variant: string, size: string, shape: string, label: string, i: keyof typeof ICON, attrs = '') =>
  `<button type="button" class="cn-icon-button" data-variant="${variant}" data-size="${size}" data-shape="${shape}" aria-label="${label}"${attrs}>${icon(i)}</button>`;
const row = (...items: string[]) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--cn-space-3)">${items.join('')}</div>`;

export const iconButton: ComponentSpec = {
  name: 'IconButton',
  slug: 'icon-button',
  category: 'actions',
  description: 'A square (or round) button holding exactly one icon: icon-only button and its utility button. Same intents and sizes as Button, width equals height, the icon sits in a muted gray until hover, and the accessible name lives in aria-label.',
  usage: 'Use for a frequent, unambiguous action next to content: close, more actions, copy, delete a row, toggle a panel. If the icon needs a caption to be understood, use a Button with a label instead. Toggles (pin, bookmark, show calendar) use aria-pressed. Always pair with a Tooltip that repeats the aria-label.',
  anatomy: [
    { part: 'root', element: 'button', description: 'The interactive element. <button type="button"> with a mandatory aria-label; <a> only when it navigates.' },
    { part: 'icon', element: 'svg', description: 'The single icon, 20px (16px on xs). Decorative: aria-hidden="true". No text inside the button.' },
    { part: 'spinner', element: 'span', description: 'Shown only while data-loading; the icon becomes invisible, the button keeps its size.', optional: true },
  ],
  props: {
    variant: {
      values: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'utility'],
      default: 'ghost',
      description: 'ghost = default for toolbars, table rows and card headers: transparent, gray-400 icon, gray-50 fill on hover (Tertiary icon-only). utility = the same colors in a smaller 6px-radius box for close (×) buttons, table-row and file-list actions (ButtonUtility tertiary: 28px on xs, 32px on sm). outline = white with a gray-300 ring when it stands alone on the canvas (Secondary icon-only). secondary = gray-50 fill with a ring next to a filled action. primary = the one filled action (rare: a "+" that is the main action on a small screen). danger = destructive, always behind a confirm.',
    },
    size: SIZE_PROP(),
    shape: {
      values: ['square', 'circle'],
      default: 'square',
      description: 'square = 8px radius (6px for utility), sits in toolbars and rows next to Buttons; circle = fully round, for avatars and floating actions. Do not mix shapes in one row.',
    },
  },
  states: {
    hover: STATE.hover(),
    active: { selector: ':active:not(:disabled):not([aria-disabled="true"])', description: 'While pressed. has no distinct pressed style: it keeps the hover colors.', markup: 'native :active' },
    focus: { selector: ':focus-visible', description: 'Keyboard focus. The 4px brand ring (red for danger) is added under the existing ring and shadow.', markup: 'native :focus-visible' },
    disabled: { selector: ':disabled, &[aria-disabled="true"]', description: 'Not interactive. Whole button at 50% opacity, cursor not-allowed, no hover.', markup: 'disabled attribute (or aria-disabled="true")' },
    loading: STATE.loading(),
    pressed: { selector: '[aria-pressed="true"]', description: 'Toggle is on. Gray-50 fill + default ink so the state is visible at rest, not only on hover. Use with ghost, utility or outline.', markup: 'aria-pressed="true" (toggle buttons only)' },
  },
  base: {
    root: {
      ...RESET_BUTTON,
      position: 'relative',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      padding: '0',
      color: '{color.fg-subtle}',
      'border-radius': '{radius.control}',
      ...TRANSITION_FAST,
    },
    icon: { 'flex-shrink': '0', display: 'block', 'pointer-events': 'none', transition: 'inherit' },
    spinner: {
      display: 'none',
      position: 'absolute',
      inset: '0',
      margin: 'auto',
      'border-radius': '{radius.full}',
      border: '2px solid currentColor',
      'border-right-color': 'transparent',
      animation: 'icon-button-spin 0.7s linear infinite',
    },
    '@states': {
      focus: { root: { outline: 'none', 'box-shadow': '{shadow.focus}' } },
      disabled: { root: { opacity: '{opacity.disabled}', cursor: 'not-allowed' } },
      loading: {
        root: { cursor: 'progress', 'pointer-events': 'none' },
        icon: { visibility: 'hidden' },
        spinner: { display: 'block' },
      },
      pressed: { root: { 'background-color': '{color.bg-subtle}', color: '{color.fg-default}' } },
    },
  },
  variants: {
    variant: {
      primary: solid('{color.bg-action}', '{color.bg-action-hover}', '{color.fg-on-action}', '{shadow.focus}'),
      secondary: bordered('{color.bg-subtle}', '{color.border-control}', '{color.bg-muted}', '{color.bg-muted}'),
      outline: bordered('{color.bg-surface}', '{color.border-control}', '{color.bg-subtle}', '{color.bg-subtle}'),
      ghost: plain(),
      danger: solid('{color.bg-danger}', '{color.bg-danger-hover}', '{white}', '{shadow.focus-danger}'),
      utility: { ...plain(), root: { ...(plain().root as Record<string, string>), 'border-radius': '{radius.md}' } },
    },
    size: {
      xs: sizeBlock('xs'),
      sm: sizeBlock('sm'),
      md: sizeBlock('md'),
      lg: sizeBlock('lg'),
      xl: sizeBlock('xl'),
    },
    shape: {
      square: { root: {} },
      circle: { root: { 'border-radius': '{radius.full}' } },
    },
  },
  // ButtonUtility: xs 28×28 with a 16px icon, sm 32×32 with a 20px icon.
  compound: [
    { when: { variant: 'utility', size: 'xs' }, block: { root: { width: 'calc({size.control.xs} - {space.1})', height: 'calc({size.control.xs} - {space.1})' } } },
    { when: { variant: 'utility', size: 'sm' }, block: { root: { width: '{size.control.xs}', height: '{size.control.xs}' } } },
  ],
  extraCss: `
@keyframes icon-button-spin { to { transform: rotate(360deg); } }
.cn-icon-button[data-shape="circle"]::before { border-radius: {radius.full}; }`,
  examples: [
    ex('Ghost (toolbar default)', btn('ghost', 'md', 'square', 'More actions', 'dots'), 'Transparent, gray-400 icon; gray-50 fill and a darker icon on hover.'),
    ex('Intents', row(btn('primary', 'md', 'square', 'Add member', 'plus'), btn('secondary', 'md', 'square', 'Settings', 'settings'), btn('outline', 'md', 'square', 'Copy link', 'copy'), btn('ghost', 'md', 'square', 'Search', 'search'), btn('danger', 'md', 'square', 'Delete row', 'trash')), 'Same colors as Button. Ghost is the default because most icon buttons sit inside toolbars and rows.'),
    ex('Utility (close and row actions)', row(btn('utility', 'xs', 'square', 'Delete file', 'trash'), btn('utility', 'sm', 'square', 'Close', 'x'), btn('utility', 'md', 'square', 'Close panel', 'x')), 'ButtonUtility: 28px (xs) and 32px (sm) boxes with a 6px radius, for file rows, tags and dialog headers.'),
    ex('Circle', row(btn('ghost', 'md', 'circle', 'Close', 'x'), btn('outline', 'md', 'circle', 'Open profile', 'user'), btn('primary', 'lg', 'circle', 'New message', 'plus')), 'Round for avatars and floating actions.'),
    ex('Pressed (toggle)', row(btn('outline', 'md', 'square', 'Show calendar', 'calendar', ' aria-pressed="true"'), btn('outline', 'md', 'square', 'Show inbox', 'inbox', ' aria-pressed="false"'), btn('ghost', 'md', 'square', 'Pin to sidebar', 'spark', ' aria-pressed="true"')), 'aria-pressed="true" keeps the gray-50 fill at rest so the on state is visible without hovering.'),
    ex('Sizes', row(btn('outline', 'xs', 'square', 'Search', 'search'), btn('outline', 'sm', 'square', 'Search', 'search'), btn('outline', 'md', 'square', 'Search', 'search'), btn('outline', 'lg', 'square', 'Search', 'search'), btn('outline', 'xl', 'square', 'Search', 'search')), '32 / 36 / 40 / 44 / 48px; the icon is 20px except on xs (16px).'),
    ex('Loading', `<button type="button" class="cn-icon-button" data-variant="primary" data-size="md" data-shape="square" aria-label="Sending" data-loading aria-busy="true"><span class="cn-icon-button__spinner" aria-hidden="true"></span>${icon('arrow')}</button>`),
    ex('Disabled', row(btn('outline', 'md', 'square', 'Delete row', 'trash', ' disabled'), btn('ghost', 'md', 'square', 'More actions', 'dots', ' disabled'))),
  ],
  recipes: [
    ex('Row actions in a card header', `<div style="display:flex;gap:var(--cn-space-1)">${btn('ghost', 'sm', 'square', 'Copy ID', 'copy')}${btn('ghost', 'sm', 'square', 'Open in new tab', 'external')}${btn('ghost', 'sm', 'square', 'More actions', 'dots')}</div>`, 'Ghost, size sm, 4px apart. The "more" menu is always last.'),
  ],
  rules: [
    'aria-label is mandatory and names the action, not the icon: "Delete row", not "Trash".',
    'Always pair with a Tooltip that shows the same text as aria-label; hover reveals what keyboard users already hear.',
    'Ghost inside toolbars, table rows and card headers; utility for close buttons and file-list actions; outline when the button stands alone on the canvas; primary only when the icon action is the main action of the region.',
    'No text inside an IconButton. The moment it needs a caption, it is a Button with a leading icon.',
    'Toggles set aria-pressed and use ghost, utility or outline; the icon keeps its meaning in both states (a pin stays a pin, it does not become a cross).',
    'Icon size comes from size; never scale the svg by hand or pad the button to change its footprint.',
    'Touch targets: md (40px) or larger on mobile and in touch-first screens; xs/sm are for dense desktop rows only.',
    'One shape per row. Square next to Buttons; circle for avatars and floating actions.',
    'Destructive icon actions (danger, or a ghost trash icon) always confirm before acting.',
  ],
  a11y: [
    'Use <button type="button"> with aria-label (or aria-labelledby). An icon alone has no accessible name.',
    'The svg is aria-hidden="true" and focusable="false"; the name comes from the button.',
    'Toggle buttons expose aria-pressed="true|false" and keep the same aria-label in both states.',
    'Focus ring on :focus-visible only, as a 4px box-shadow ring; never outline: none without a replacement.',
    'While loading set aria-busy="true" and keep the aria-label; disabled removes it from the tab order.',
  ],
  related: ['button', 'button-group', 'menu', 'tooltip'],
};
