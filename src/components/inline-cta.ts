import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Inline CTA: a bordered row inside content that asks for one thing: a 40px
// featured icon or avatar, a label-md title, a body-sm description, a ghost
// secondary + a link or primary action, an optional progress bar and a × to
// dismiss. The banner variant lines the actions up on the right.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';

const SVG = {
  spark: ICON.spark.replace('cn-icon', 'cn-featured-icon__icon'),
  drive: '<svg class="cn-featured-icon__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="8" cy="4" rx="5" ry="2"/><path d="M3 4v8c0 1.1 2.25 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.25 2 5 2s5-.9 5-2"/></svg>',
  mail: '<svg class="cn-featured-icon__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M2.5 4.5L8 8.5l5.5-4"/></svg>',
};

const featured = (svg: string, tone: string) => `<span class="cn-inline-cta__media"><span class="cn-featured-icon" data-theme="light" data-tone="${tone}" data-size="md" data-shape="square">${svg}</span></span>`;
const avatar = (initials: string, name: string) => `<span class="cn-inline-cta__media"><span class="cn-avatar" data-size="lg" data-shape="circle" data-tone="neutral" data-status="none" role="img" aria-label="${name}"><span class="cn-avatar__fallback" aria-hidden="true">${initials}</span></span></span>`;
const DISMISS = `<button type="button" class="cn-inline-cta__dismiss" aria-label="Dismiss">${ICON.x}</button>`;
const btn = (label: string, variant: string) => `<button type="button" class="cn-button" data-variant="${variant}" data-size="sm"><span class="cn-button__label">${label}</span></button>`;
const actions = (...buttons: string[]) => `<div class="cn-inline-cta__actions">${buttons.join('')}</div>`;
const progress = (pct: number, label: string) =>
  `<div class="cn-inline-cta__progress" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="cn-inline-cta__progress-fill" style="width:${pct}%"></div></div>`;
const content = (title: string, description: string, extra = '') => `<div class="cn-inline-cta__content"><div class="cn-inline-cta__title">${title}</div><p class="cn-inline-cta__description">${description}</p>${extra}</div>`;

const cta = (variant: string, tone: string, inner: string) =>
  `<div class="cn-inline-cta" data-variant="${variant}" data-tone="${tone}" role="region" aria-label="Notice" style="width:100%;max-width:640px">${inner}</div>`;

export const inlineCta: ComponentSpec = {
  name: 'InlineCta',
  slug: 'inline-cta',
  category: 'feedback',
  description: 'A bordered row inside content that asks for one thing: a 40px featured icon or avatar, a label-md title, a body-sm description, a ghost secondary and a link or primary action, an optional progress bar and a × to dismiss. Tones tint the surface for brand, warning and success.',
  usage: 'Use between content blocks when the next step lives right there: upgrade to unlock a feature, verify an email before sending, free up storage, act on an invitation. For sidebar nudges use FeaturedCard; for page-wide messages use Banner; for form errors use Alert.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The row: bg-surface, hairline, radius card, 16px padding, shadow-xs, flex with 16px gaps, relative for the ×.' },
    { part: 'media', element: 'span', description: 'Wrapper for a 40px FeaturedIcon (system prompts) or a lg Avatar (a person\'s action).', optional: true },
    { part: 'content', element: 'div', description: 'Title, description and, in the stacked variants, the actions and progress.' },
    { part: 'title', element: 'div', description: 'label-md title, one line: what is offered or needed ("Verify your email address").' },
    { part: 'description', element: 'p', description: 'body-sm muted, one or two lines: why, and the concrete number when there is one.' },
    { part: 'progress', element: 'div', description: '8px track (bg-muted, radius full) under the description for used-of-limit prompts. role="progressbar".', optional: true },
    { part: 'progress-fill', element: 'div', description: 'The action-colored fill; width is the inline percentage.', optional: true },
    { part: 'actions', element: 'div', description: 'Row of sm Buttons: ghost secondary first, then one link-color or primary action. Inside the content, or beside it in the banner variant.' },
    { part: 'dismiss', element: 'button', description: '28px button with a 20px × in the top-right corner (or at the end of the banner row). aria-label "Dismiss".', optional: true },
  ],
  props: {
    variant: {
      values: ['default', 'with-progress', 'with-avatar', 'banner'],
      default: 'default',
      description: 'default = featured icon, text, actions under the text. with-progress = adds an 8px progress bar between the description and the actions (storage, seats, quota). with-avatar = a person\'s avatar instead of the icon, for invitations and requests from someone. banner = one line: text on the left, actions on the right, × at the end; for wide content areas.',
    },
    tone: {
      values: ['neutral', 'brand', 'warning', 'success'],
      default: 'neutral',
      description: 'neutral = white surface with a hairline, for housekeeping (storage, invites). brand = action-subtle surface for upgrades and new features. warning = warning-subtle surface for something that blocks a next step (verify, expiring). success = success-subtle surface for a completed action that has a follow-up (accepted, connected).',
    },
  },
  states: {
    dismissHover: { selector: ' .cn-inline-cta__dismiss:hover', description: 'Pointer over the × (extraCss): subtle fill, ink icon.', markup: 'native :hover on .cn-inline-cta__dismiss' },
    dismissFocus: { selector: ' .cn-inline-cta__dismiss:focus-visible', description: 'Keyboard focus on the × shows the focus ring (extraCss).', markup: 'native :focus-visible on .cn-inline-cta__dismiss' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'align-items': 'flex-start',
      gap: '{space.4}',
      width: '100%',
      'min-width': '0',
      padding: '{space.4}',
      'background-color': '{color.bg-surface}',
      border: HAIRLINE,
      'border-radius': '{radius.card}',
      'box-shadow': '{shadow.xs}',
      color: '{color.fg-default}',
    },
    media: { display: 'inline-flex', 'flex-shrink': '0' },
    content: { flex: '1 1 auto', 'min-width': '0', display: 'flex', 'flex-direction': 'column', gap: '{space.1}', 'padding-inline-end': '{space.8}' },
    title: { ...typeStyle('label-md'), 'line-height': '{font.lineHeight.normal}', color: '{color.fg-default}', 'overflow-wrap': 'anywhere' },
    description: { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'overflow-wrap': 'anywhere' },
    progress: { width: '100%', height: '{space.2}', 'margin-top': '{space.2}', 'border-radius': '{radius.full}', 'background-color': '{color.bg-muted}', overflow: 'hidden' },
    'progress-fill': { height: '100%', width: '0', 'border-radius': '{radius.full}', 'background-color': '{color.bg-action}', 'transition-property': 'width', 'transition-duration': '{motion.duration.slow}', 'transition-timing-function': '{motion.easing.standard}' },
    actions: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.3}', 'margin-top': '{space.2}' },
    dismiss: {
      ...RESET_BUTTON,
      position: 'absolute',
      top: '{space.2}',
      'inset-inline-end': '{space.2}',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.7}',
      height: '{space.7}',
      'border-radius': '{radius.md}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
  },
  variants: {
    variant: {
      default: { root: {} },
      'with-progress': { root: {} },
      'with-avatar': { root: {} },
      banner: {
        root: { 'align-items': 'center', 'flex-wrap': 'wrap' },
        content: { flex: '1 1 12rem', 'padding-inline-end': '0' },
        actions: { 'margin-top': '0', 'margin-inline-start': 'auto', 'flex-shrink': '1', 'flex-wrap': 'wrap' },
        dismiss: { position: 'static', 'flex-shrink': '0' },
      },
    },
    tone: {
      neutral: { root: {} },
      brand: { root: { 'background-color': '{color.bg-action-subtle}', 'border-color': 'transparent' } },
      warning: { root: { 'background-color': '{color.bg-warning-subtle}', 'border-color': '{color.border-warning}' } },
      success: { root: { 'background-color': '{color.bg-success-subtle}', 'border-color': '{color.border-success}' } },
    },
  },
  extraCss: `
.cn-inline-cta__dismiss .cn-icon { width: {size.icon.lg}; height: {size.icon.lg}; }
.cn-inline-cta__dismiss:hover { background-color: color-mix(in srgb, {color.fg-default} 8%, transparent); color: {color.fg-default}; }
.cn-inline-cta__dismiss:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-inline-cta__actions > .cn-button[data-variant="ghost"]:first-child { margin-inline-start: calc(-1 * {size.controlPadding.sm}); }
.cn-inline-cta[data-variant="banner"] .cn-inline-cta__actions > .cn-button[data-variant="ghost"]:first-child { margin-inline-start: 0; }`,
  examples: [
    ex('Upgrade to Pro (brand)', cta('default', 'brand', `${featured(SVG.spark, 'brand')}${content('Upgrade to Pro', 'Unlimited dashboards, 30-day history and priority support for your whole team.', actions(btn('Dismiss', 'ghost'), btn('Upgrade plan', 'primary')))}${DISMISS}`), 'A featured icon, two lines and a primary action on the action-subtle surface.'),
    ex('Storage with progress', cta('with-progress', 'neutral', `${featured(SVG.drive, 'gray')}${content('Storage almost full', '128 GB of 150 GB used. Uploads pause at 100%.', progress(85, 'Storage used') + actions(btn('Dismiss', 'ghost'), btn('Manage storage', 'link-color')))}${DISMISS}`), 'The number is in the text; the bar shows it. Neutral surface for housekeeping.'),
    ex('Verify your email (warning banner)', cta('banner', 'warning', `${featured(SVG.mail, 'warning')}${content('Verify your email address', 'We sent a link to maya@lumen.co. It expires in 24 hours.')}${actions(btn('Resend link', 'link'), btn('Open inbox', 'outline'))}${DISMISS}`), 'One line on wide content: text left, actions right, × at the end.'),
    ex('With avatar (success)', cta('with-avatar', 'success', `${avatar('DC', 'Daniel Costa')}${content('Daniel Costa accepted your invite', 'He now has access to the Q3 launch plan workspace.', actions(btn('Dismiss', 'ghost'), btn('View profile', 'link-color')))}${DISMISS}`), 'A person\'s action shows their avatar instead of an icon.'),
  ],
  rules: [
    'One ask per row: the title names it, the description gives the reason and the number, the last action does it.',
    'At most two actions: a ghost sm secondary ("Dismiss", "Later") first and one link-color or primary sm action last. Primary only for the one conversion of the page.',
    'Featured icon for system prompts, avatar for a person\'s action; never both, never an image.',
    'Tone follows meaning: brand for upgrades and launches, warning for something that blocks the next step, success for a completed action with a follow-up, neutral for housekeeping.',
    'Progress appears only with a real limit and the used-of-total in the description; the fill stays action-colored, the text carries the warning.',
    'Use banner only when the row is wider than 640px; below that the actions wrap under the text (default).',
    'Every InlineCta is dismissible unless the ask blocks the page (then it is a Banner). Remember the dismissal per user.',
    'Place it next to what it talks about (above the upload list, under the email field), never at the top of every page.',
  ],
  a11y: [
    'The row is a labelled region (role="region" + aria-label) or a plain <section>; use role="status" only when it appears in response to an action.',
    'Featured icons are aria-hidden; avatars with initials carry role="img" + aria-label with the person\'s name.',
    'The progress bar has role="progressbar" with aria-valuenow/min/max and an aria-label; the same number is in the description.',
    'The × has aria-label "Dismiss" and is the last Tab stop in the row; actions are real <button>s or links.',
    'Tone is never the only signal: the title says "Verify", "Upgrade" or "Accepted" in words.',
  ],
  related: ['featured-card', 'banner', 'alert', 'featured-icon', 'avatar', 'button'],
};
