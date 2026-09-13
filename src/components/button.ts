import type { ComponentSpec, StyleBlock } from '../types.ts';
import { CONTROL, RESET_BUTTON, STATE, SIZE_PROP, ex, ICON, typeStyle } from './_shared.ts';

// Flat controls with an explicit hierarchy; all dimensions follow the active tokens.
const TRANSITION_FAST = {
  'transition-property': 'background-color, border-color, color, box-shadow, opacity, text-decoration-color',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};

/** Inset borders preserve dimensions across states. */
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
/** Optional token-defined depth; the Canon preset keeps both layers flat. */
const SHADOW_SOLID = '{shadow.control}, {shadow.xs}';
/** Bordered controls share the same optional depth tokens. */
const shadowRinged = (color: string) => `${ring(color)}, ${SHADOW_SOLID}`;
/** Icons keep the label contrast on both light and dark action fills. */
const ICON_ON_SOLID = 'currentColor';
const ICON_ON_SOLID_HOVER = 'currentColor';

/** Filled button (primary / primary-destructive). Loading = hover fill, for continuity. */
const solid = (bg: string, hoverBg: string, fg: string, focus: string): StyleBlock => ({
  root: { 'background-color': bg, color: fg, 'box-shadow': SHADOW_SOLID },
  icon: { color: ICON_ON_SOLID },
  '@states': {
    hover: { root: { 'background-color': hoverBg }, icon: { color: ICON_ON_SOLID_HOVER } },
    loading: { root: { 'background-color': hoverBg } },
    focus: { root: { 'box-shadow': `${SHADOW_SOLID}, ${focus}` } },
  },
});

/** Ringed button (secondary gray / secondary color / secondary destructive). */
const bordered = (o: { bg: string; ringColor: string; fg: string; hoverBg: string; hoverFg: string; icon: string; hoverIcon: string; focus: string }): StyleBlock => ({
  root: { 'background-color': o.bg, color: o.fg, 'box-shadow': shadowRinged(o.ringColor) },
  icon: { color: o.icon },
  '@states': {
    hover: { root: { 'background-color': o.hoverBg, color: o.hoverFg }, icon: { color: o.hoverIcon } },
    loading: { root: { 'background-color': o.hoverBg } },
    focus: { root: { 'box-shadow': `${shadowRinged(o.ringColor)}, ${o.focus}` } },
  },
});

/** Transparent button (tertiary gray / tertiary destructive). */
const plain = (o: { fg: string; hoverBg: string; hoverFg: string; icon: string; hoverIcon: string; focus: string }): StyleBlock => ({
  root: { 'background-color': 'transparent', color: o.fg, 'box-shadow': 'none' },
  icon: { color: o.icon },
  '@states': {
    hover: { root: { 'background-color': o.hoverBg, color: o.hoverFg }, icon: { color: o.hoverIcon } },
    loading: { root: { 'background-color': o.hoverBg } },
    focus: { root: { 'box-shadow': o.focus } },
  },
});

/** Link-styled button (link-color / link-gray / link-destructive): no padding, height = line-height, radius 4, underline only on hover. */
const linkLike = (o: { fg: string; hoverFg: string; decoration: string; icon: string; hoverIcon: string; focus: string }): StyleBlock => ({
  root: { 'background-color': 'transparent', color: o.fg, 'box-shadow': 'none', height: 'auto', 'padding-inline': '0', 'justify-content': 'normal', 'border-radius': '{radius.sm}' },
  label: { 'padding-inline': '0', 'text-decoration-line': 'underline', 'text-decoration-color': 'transparent', 'text-underline-offset': '3px' },
  icon: { color: o.icon },
  '@states': {
    hover: { root: { color: o.hoverFg }, label: { 'text-decoration-color': o.decoration }, icon: { color: o.hoverIcon } },
    focus: { root: { 'box-shadow': o.focus } },
  },
});

const LG = new Set(['lg', 'xl']);
const sizeBlock = (s: keyof typeof CONTROL): StyleBlock => ({
  root: {
    height: CONTROL[s].height,
    'padding-inline': CONTROL[s].px,
    'font-size': CONTROL[s].font,
    gap: '{space.2}',
    ...(LG.has(s) ? { 'line-height': '{font.lineHeight.normal}' } : {}),
  },
  label: LG.has(s) ? { 'text-underline-offset': '4px' } : {},
  icon: { width: CONTROL[s].icon, height: CONTROL[s].icon },
  spinner: { width: CONTROL[s].icon, height: CONTROL[s].icon },
});

const btn = (variant: string, label: string, attrs = '', leading = '', trailing = '', size = 'md') =>
  `<button type="button" class="cn-button" data-variant="${variant}" data-size="${size}"${attrs}>${leading}<span class="cn-button__label">${label}</span>${trailing}</button>`;
const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-button__icon');
const row = (...items: string[]) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--cn-space-3)">${items.join('')}</div>`;

export const button: ComponentSpec = {
  name: 'Button',
  slug: 'button',
  category: 'actions',
  description: 'Triggers an action. Eleven intents share one shape (the system button): flat filled primary with a clear pressed state, ringed secondaries, transparent tertiaries and link styles, each in gray, brand and destructive voices. The intent is a data attribute, never a different component.',
  usage: 'Use for actions (save, send, open a dialog). Use Link for navigation inside text. One primary button per view region; put it last (right) in a row of actions. Destructive actions use the danger* variants and always confirm.',
  anatomy: [
    { part: 'root', element: 'button', description: 'The interactive element. Always a <button type="button|submit"> or an <a role="button"> when it navigates. Add data-icon-only when it holds a single icon and a visually hidden label.' },
    { part: 'icon', element: 'svg', description: 'Optional leading or trailing icon, 20px (16px on xs). Decorative: aria-hidden. Matches the label on filled buttons; secondary icons use semantic foreground tokens.', optional: true },
    { part: 'label', element: 'span', description: 'The action label. Verb first ("Save changes"), sentence case, no trailing period.' },
    { part: 'spinner', element: 'span', description: 'Shown only while data-loading; replaces the icon slot, the label becomes invisible but keeps its width.', optional: true },
  ],
  props: {
    variant: {
      values: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'link', 'secondary-color', 'link-color', 'danger-outline', 'danger-ghost', 'danger-link'],
      default: 'primary',
      description: 'primary = the main filled action; outline = a single neutral edge; secondary = a quiet filled alternative; secondary-color = an action-colored outline; ghost = a transparent toolbar action. link and link-color align with text. The danger variants apply the same hierarchy to destructive actions.',
    },
    size: SIZE_PROP(),
    icon: { values: ['default', 'only'], default: 'default', description: 'only = square icon-only button (padding equals the vertical padding); requires aria-label.' },
  },
  states: {
    hover: STATE.hover(),
    active: { selector: ':active:not(:disabled):not([aria-disabled="true"])', description: 'While pressed: the primary action deepens to bg-action-active.', markup: 'native :active' },
    focus: { selector: ':focus-visible', description: 'Keyboard focus. The token-defined focus ring (red for danger*) is added under the existing ring and shadow; never on mouse click.', markup: 'native :focus-visible' },
    disabled: { selector: ':disabled, &[aria-disabled="true"]', description: 'Not interactive. Whole button at 50% opacity, cursor not-allowed, no hover.', markup: 'disabled attribute (or aria-disabled="true")' },
    loading: STATE.loading(),
  },
  base: {
    root: {
      ...RESET_BUTTON,
      position: 'relative',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      'white-space': 'nowrap',
      ...typeStyle('label-md'),
      'font-size': CONTROL.md.font,
      'border-radius': '{radius.control}',
      ...TRANSITION_FAST,
    },
    icon: { 'flex-shrink': '0', display: 'block', 'pointer-events': 'none', transition: 'inherit' },
    label: { display: 'inline-block', transition: 'inherit' },
    spinner: {
      display: 'none',
      position: 'absolute',
      inset: '0',
      margin: 'auto',
      'border-radius': '{radius.full}',
      border: '2px solid currentColor',
      'border-right-color': 'transparent',
      animation: 'cn-spin 0.7s linear infinite',
    },
    '@states': {
      focus: { root: { outline: 'none', 'box-shadow': '{shadow.focus}' } },
      disabled: { root: { opacity: '{opacity.disabled}', cursor: 'not-allowed' } },
      loading: {
        root: { cursor: 'progress', 'pointer-events': 'none' },
        label: { visibility: 'hidden' },
        icon: { visibility: 'hidden' },
        spinner: { display: 'block' },
      },
    },
  },
  // `size` is emitted before `variant` on purpose: link variants override height/padding
  // of the size rules without needing a compound per size.
  variants: {
    size: {
      xs: sizeBlock('xs'),
      sm: sizeBlock('sm'),
      md: sizeBlock('md'),
      lg: sizeBlock('lg'),
      xl: sizeBlock('xl'),
    },
    variant: {
      primary: solid('{color.bg-action}', '{color.bg-action-hover}', '{color.fg-on-action}', '{shadow.focus}'),
      secondary: bordered({ bg: '{color.bg-subtle}', ringColor: '{color.border-control}', fg: '{color.fg-muted}', hoverBg: '{color.bg-muted}', hoverFg: '{color.fg-default}', icon: '{color.fg-subtle}', hoverIcon: '{color.fg-muted}', focus: '{shadow.focus}' }),
      outline: bordered({ bg: '{color.bg-surface}', ringColor: '{color.border-control}', fg: '{color.fg-muted}', hoverBg: '{color.bg-subtle}', hoverFg: '{color.fg-default}', icon: '{color.fg-subtle}', hoverIcon: '{color.fg-muted}', focus: '{shadow.focus}' }),
      'secondary-color': bordered({ bg: '{color.bg-surface}', ringColor: '{color.border-action}', fg: '{color.fg-action}', hoverBg: '{color.bg-action-subtle}', hoverFg: '{color.fg-link-hover}', icon: '{brand.500}', hoverIcon: '{brand.600}', focus: '{shadow.focus}' }),
      ghost: plain({ fg: '{color.fg-muted}', hoverBg: '{color.bg-subtle}', hoverFg: '{color.fg-default}', icon: '{color.fg-subtle}', hoverIcon: '{color.fg-muted}', focus: '{shadow.focus}' }),
      link: linkLike({ fg: '{color.fg-muted}', hoverFg: '{color.fg-default}', decoration: '{color.fg-subtle}', icon: '{color.fg-subtle}', hoverIcon: '{color.fg-muted}', focus: '{shadow.focus}' }),
      'link-color': linkLike({ fg: '{color.fg-action}', hoverFg: '{color.fg-link-hover}', decoration: '{brand.500}', icon: '{brand.500}', hoverIcon: '{brand.600}', focus: '{shadow.focus}' }),
      danger: solid('{color.bg-danger}', '{color.bg-danger-hover}', '{white}', '{shadow.focus-danger}'),
      'danger-outline': bordered({ bg: '{color.bg-surface}', ringColor: '{color.border-danger}', fg: '{color.fg-danger}', hoverBg: '{color.bg-danger-subtle}', hoverFg: '{color.fg-danger}', icon: '{red.500}', hoverIcon: '{red.600}', focus: '{shadow.focus-danger}' }),
      'danger-ghost': plain({ fg: '{color.fg-danger}', hoverBg: '{color.bg-danger-subtle}', hoverFg: '{color.fg-danger}', icon: '{red.500}', hoverIcon: '{red.600}', focus: '{shadow.focus-danger}' }),
      'danger-link': linkLike({ fg: '{color.fg-danger}', hoverFg: '{color.fg-danger}', decoration: 'currentColor', icon: '{red.500}', hoverIcon: '{red.600}', focus: '{shadow.focus-danger}' }),
    },
  },
  extraCss: `
.cn-button[data-variant="primary"]:active:not(:disabled):not([aria-disabled="true"]) { background-color: {color.bg-action-active}; }
@keyframes cn-spin { to { transform: rotate(360deg); } }
.cn-button[data-icon-only] { padding-inline: 0; aspect-ratio: 1 / 1; }
.cn-button[data-icon-only] .cn-button__label:not(.cn-sr-only) { display: none; }`,
  examples: [
    ex('Primary', btn('primary', 'Save changes'), 'Flat action fill with a contrasting label. One primary action per view region.'),
    ex('Gray and brand hierarchy', row(btn('outline', 'Save changes'), btn('secondary-color', 'Save changes'), btn('ghost', 'Save changes'), btn('link', 'Save changes'), btn('link-color', 'Save changes')), 'outline = Secondary gray, secondary-color = Secondary color, ghost = Tertiary, link = Link gray, link-color = Link color.'),
    ex('Secondary (subtle fill)', btn('secondary', 'Save changes'), 'The secondary hover fill at rest. For dense toolbars where a white button would disappear.'),
    ex('Destructive', row(btn('danger', 'Delete'), btn('danger-outline', 'Delete'), btn('danger-ghost', 'Delete'), btn('danger-link', 'Delete')), 'Primary, secondary, tertiary and link destructive. Every one of them confirms before acting.'),
    ex('Sizes', row(btn('outline', 'Save changes', '', icon('plus'), '', 'xs'), btn('outline', 'Save changes', '', icon('plus'), '', 'sm'), btn('outline', 'Save changes', '', icon('plus'), '', 'md'), btn('outline', 'Save changes', '', icon('plus'), '', 'lg'), btn('outline', 'Save changes', '', icon('plus'), '', 'xl')), '32 / 36 / 40 / 44 / 48px. Text stays 14px up to md and becomes 16px on lg and xl; icons are 20px (16px on xs).'),
    ex('With icons and icon-only', row(btn('primary', 'Save changes', '', icon('plus')), btn('outline', 'Save changes', '', '', icon('arrow')), btn('outline', '<span class="cn-sr-only">Copy link</span>', ' data-icon-only aria-label="Copy link"', icon('copy')), btn('ghost', '<span class="cn-sr-only">More</span>', ' data-icon-only aria-label="More"', icon('dots'))), 'Leading icon = what the action is; trailing = where it goes. data-icon-only squares the padding (40×40 on md).'),
    ex('Loading', row(`<button type="button" class="cn-button" data-variant="primary" data-size="md" data-loading aria-busy="true"><span class="cn-button__spinner" aria-hidden="true"></span><span class="cn-button__label">Saving…</span></button>`, `<button type="button" class="cn-button" data-variant="outline" data-size="md" data-loading aria-busy="true"><span class="cn-button__spinner" aria-hidden="true"></span><span class="cn-button__label">Exporting…</span></button>`), 'The fill switches to the hover color, the label hides but keeps its width.'),
    ex('Disabled', row(btn('primary', 'Save changes', ' disabled'), btn('outline', 'Save changes', ' disabled'), btn('ghost', 'Save changes', ' disabled'), btn('danger', 'Delete', ' disabled')), 'Whole button at 50% opacity, cursor not-allowed.'),
  ],
  recipes: [
    ex('Action row (dialog footer)', `<div style="display:flex;gap:var(--cn-space-3);justify-content:flex-end">${btn('outline', 'Cancel')}${btn('primary', 'Confirm')}</div>`, 'Secondary gray first, primary last, 12px apart. Never two filled buttons.'),
  ],
  rules: [
    'Exactly one primary button per view region (a dialog, a page header, a form). If two actions feel primary, one of them is not.',
    'Labels are verbs in sentence case: "Save changes", "Send invite", "Delete". Never "OK", "Submit", "Click here".',
    'Icons are optional and decorative. Leading icon = what the action is (plus, upload); trailing icon = where it goes (arrow, external). Icon-only buttons set data-icon-only plus aria-label (or use IconButton).',
    'Never change the height by adding padding. Height comes only from size: 32 / 36 / 40 / 44 / 48px, padding 10 / 12 / 14 / 16 / 18px.',
    'Link variants (link, link-color, danger-link) have no padding and no height: they align with text. Use them for a low-emphasis action in a row of controls, never inside running text (that is Link).',
    'Loading: set data-loading and aria-busy="true"; keep the label in the DOM so width does not jump. The fill becomes the hover fill.',
    'Do not put two filled (primary + danger) buttons side by side. Danger actions live behind a confirm dialog.',
    'Full-width buttons only on mobile sheets and auth forms.',
  ],
  a11y: [
    'Use <button>. Only use <a> when the action navigates, and then it is a Link or a button-styled anchor with a real href.',
    'Icon-only buttons need an accessible name: aria-label on the button (or a cn-sr-only label inside), plus data-icon-only for the square padding.',
    'disabled removes it from the tab order; if the user needs to know why, keep it enabled and show the reason on click.',
    'Focus ring is shown on :focus-visible only, as a 4px box-shadow ring; never outline: none without replacement.',
  ],
  related: ['icon-button', 'button-group', 'link'],
};
