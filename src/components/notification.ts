import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

const HAIRLINE = '{border.width.thin} solid {color.border-default}';

/** Inline icons for the featured-icon media slot (20px, stroke 1.5, aria-hidden). */
const SVG = {
  comment: '<svg class="cn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 5.5A2 2 0 015.5 3.5h9a2 2 0 012 2v6a2 2 0 01-2 2H8l-3.5 3v-3H5.5a2 2 0 01-2-2v-6z"/></svg>',
  checkCircle: '<svg class="cn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7.25"/><path d="M6.75 10.25l2.25 2.25 4.25-4.5"/></svg>',
  alert: '<svg class="cn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.25l7.25 12.5H2.75L10 3.25zM10 8v3.5M10 14v.5"/></svg>',
  upload: '<svg class="cn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 13.5a3.25 3.25 0 01-.5-6.46A4.5 4.5 0 0114.6 8.2a2.75 2.75 0 01-.6 5.3M10 16V9.5M7.25 12.25L10 9.5l2.75 2.75"/></svg>',
  spark: '<svg class="cn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.75l1.9 5.35 5.35 1.9-5.35 1.9L10 17.25l-1.9-5.35-5.35-1.9 5.35-1.9z"/></svg>',
};

/** 16:9 placeholder image: a muted surface with a simple "chart" silhouette, no network. */
const IMAGE = `<svg class="cn-notification__image" viewBox="0 0 368 207" role="img" aria-label="Preview of the new reporting dashboard"><rect width="368" height="207" style="fill:var(--cn-color-bg-subtle)"/><rect x="24" y="24" width="140" height="10" rx="5" style="fill:var(--cn-color-border-strong)"/><rect x="24" y="44" width="88" height="8" rx="4" style="fill:var(--cn-color-border-default)"/><path d="M24 160 L80 128 L136 142 L192 96 L248 110 L304 64 L344 80" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--cn-color-bg-action)"/><path d="M24 183h320" stroke-width="1" style="stroke:var(--cn-color-border-default)"/></svg>`;

const dismiss = `<button type="button" class="cn-notification__dismiss" aria-label="Dismiss">${ICON.x}</button>`;
const avatar = (initials: string, name: string) => `<span class="cn-notification__media" role="img" aria-label="${name}">${initials}</span>`;
const featured = (svg: string) => `<span class="cn-notification__media" aria-hidden="true">${svg}</span>`;
const actions = (secondary: string, primary: string) =>
  `<div class="cn-notification__actions"><button type="button" class="cn-button" data-variant="ghost" data-size="sm"><span class="cn-button__label">${secondary}</span></button><button type="button" class="cn-button" data-variant="link" data-size="sm"><span class="cn-button__label">${primary}</span></button></div>`;

const card = (variant: string, tone: string, inner: string) =>
  `<div class="cn-notification" data-variant="${variant}" data-tone="${tone}" role="status">${inner}</div>`;

export const notification: ComponentSpec = {
  name: 'Notification',
  slug: 'notification',
  category: 'feedback',
  description: 'An in-app notification card: a 400px raised white panel with an optional avatar or featured icon on the left, a semibold title, one or two lines of supporting text, a timestamp and up to two text actions. Unlike Toast it is not timed: it sits in a notification panel or feed until dismissed.',
  usage: 'Use in a notifications drawer, a bell-menu panel or an inbox list to tell a person something happened that they may act on later: a mention, a comment, an upload finishing, a product announcement. Not for transient confirmations (Toast), not for page-level warnings (Alert or Banner) and not for anything that needs a decision now (Dialog).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The card. 400px wide (max 100%), raised surface, hairline, radius card, shadow-lg, padding 16. Flex row: media, content, then the absolutely-positioned dismiss button. role="status".' },
    { part: 'media', element: 'span', description: 'Optional 40px slot on the left: an avatar circle with initials (with-avatar) or a featured icon square/circle holding a 20px icon (with-featured-icon). Tone colors the featured icon.', optional: true },
    { part: 'content', element: 'div', description: 'Title, description, time, optional progress, image and actions. Flexes to fill; keeps 32px of right padding clear for the dismiss button.' },
    { part: 'title', element: 'div', description: 'label-md (14 semibold), one line: who did what ("Maya Chen commented on your post") or what happened ("Export ready").' },
    { part: 'description', element: 'p', description: 'body-md muted, one or two lines: the comment excerpt, the file name, the change summary.', optional: true },
    { part: 'time', element: 'time', description: 'body-sm subtle timestamp under the description ("2 minutes ago"). Use a <time datetime>.', optional: true },
    { part: 'progress', element: 'div', description: 'Optional upload/processing row: an 8px track with the action-colored fill plus a percentage label (label-sm muted). Set the fill width inline and mirror it in aria-valuenow.', optional: true },
    { part: 'progress-track', element: 'div', description: 'The 8px rounded track (bg-muted) inside the progress row. role="progressbar".', optional: true },
    { part: 'progress-fill', element: 'div', description: 'The filled portion of the track. Width is the percentage (inline style).', optional: true },
    { part: 'image', element: 'img', description: 'Optional full-width 16:9 image under the text (product announcements). Radius md, object-fit cover.', optional: true },
    { part: 'actions', element: 'div', description: 'Row of at most two Buttons: a ghost sm ("Dismiss", "Later") then a link sm ("View changes", "Reply").', optional: true },
    { part: 'dismiss', element: 'button', description: '36px ghost icon button with a 20px X, absolutely positioned in the top-right corner (8px inset). aria-label="Dismiss".', optional: true },
  ],
  props: {
    variant: {
      values: ['default', 'with-avatar', 'with-featured-icon', 'with-image', 'with-progress', 'with-actions'],
      default: 'default',
      description: 'default = text only (title, description, time); with-avatar = a 40px avatar of the person who acted, for social events (comments, mentions, invites); with-featured-icon = a 40px featured icon for system events (payment, export, sync); with-image = a full-width 16:9 image below the text, for announcements; with-progress = a progress row for uploads and long jobs; with-actions = the text plus a Dismiss + primary-link action row (any variant may also carry actions).',
    },
    tone: {
      values: ['neutral', 'success', 'warning', 'danger'],
      default: 'neutral',
      description: 'Colors the featured icon only; the card stays white. neutral = informational (grey icon in a hairline square); success = something completed (green tinted circle); warning = needs attention soon (amber); danger = something failed (red). Avatars and images ignore the tone.',
    },
  },
  states: {
    dismissHover: { selector: ' .cn-notification__dismiss:hover', description: 'Pointer over the dismiss button: subtle fill, default ink. Styled in extraCss because it lives on a child.', markup: 'native :hover on .cn-notification__dismiss' },
    dismissFocus: { selector: ' .cn-notification__dismiss:focus-visible', description: 'Keyboard focus on the dismiss button shows the focus ring. Styled in extraCss.', markup: 'native :focus-visible on .cn-notification__dismiss' },
    unread: { selector: '[data-unread]', description: 'Not yet seen: the title stays semibold and a 8px action-colored dot sits after the title. Clear the attribute when the panel is opened.', markup: 'data-unread on the root' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'align-items': 'flex-start',
      gap: '{space.4}',
      width: '400px',
      'max-width': '100%',
      padding: '{space.4}',
      'background-color': '{color.bg-surface-raised}',
      border: HAIRLINE,
      'border-radius': '{radius.card}',
      'box-shadow': '{shadow.lg}',
      color: '{color.fg-default}',
      ...typeStyle('body-md'),
    },
    media: {
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
      overflow: 'hidden',
      'user-select': 'none',
    },
    content: { flex: '1 1 auto', 'min-width': '0', 'padding-inline-end': '{space.8}' },
    title: { ...typeStyle('label-md'), color: '{color.fg-default}', 'overflow-wrap': 'anywhere' },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}', 'margin-top': '{space.1}', 'overflow-wrap': 'anywhere' },
    time: { display: 'block', ...typeStyle('body-sm'), color: '{color.fg-subtle}', 'margin-top': '{space.1}' },
    progress: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.3}',
      'margin-top': '{space.3}',
      ...typeStyle('label-sm'),
      color: '{color.fg-muted}',
      'font-variant-numeric': 'tabular-nums',
    },
    'progress-track': { flex: '1 1 auto', height: '{space.2}', 'border-radius': '{radius.full}', 'background-color': '{color.bg-muted}', overflow: 'hidden' },
    'progress-fill': { height: '100%', 'border-radius': '{radius.full}', 'background-color': '{color.bg-action}', 'transition-property': 'width', 'transition-duration': '{motion.duration.slow}', 'transition-timing-function': '{motion.easing.standard}' },
    image: { display: 'block', width: '100%', 'aspect-ratio': '16 / 9', 'object-fit': 'cover', 'border-radius': '{radius.md}', 'background-color': '{color.bg-subtle}', 'margin-top': '{space.3}' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.3}', 'margin-top': '{space.3}' },
    dismiss: {
      ...RESET_BUTTON,
      position: 'absolute',
      top: '{space.2}',
      right: '{space.2}',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.9}',
      height: '{space.9}',
      'border-radius': '{radius.md}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
    '@states': {
      unread: { title: { 'font-weight': '{font.weight.semibold}' } },
    },
  },
  variants: {
    variant: {
      default: { root: {} },
      'with-avatar': { media: { 'border-radius': '{radius.full}' } },
      'with-featured-icon': { media: { 'border-radius': '{radius.lg}', 'background-color': '{color.bg-surface}', border: HAIRLINE, 'box-shadow': '{shadow.xs}', color: '{color.fg-muted}' } },
      'with-image': { root: {} },
      'with-progress': { root: {} },
      'with-actions': { root: {} },
    },
    tone: {
      neutral: { media: {} },
      success: { media: { 'background-color': '{color.bg-success-subtle}', color: '{color.fg-success}', 'border-color': 'transparent', 'border-radius': '{radius.full}', 'box-shadow': 'none' } },
      warning: { media: { 'background-color': '{color.bg-warning-subtle}', color: '{color.fg-warning}', 'border-color': 'transparent', 'border-radius': '{radius.full}', 'box-shadow': 'none' } },
      danger: { media: { 'background-color': '{color.bg-danger-subtle}', color: '{color.fg-danger}', 'border-color': 'transparent', 'border-radius': '{radius.full}', 'box-shadow': 'none' } },
    },
  },
  extraCss: `
.cn-notification .cn-notification__media .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-notification .cn-notification__dismiss .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-notification .cn-notification__dismiss:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-notification .cn-notification__dismiss:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-notification .cn-notification__actions > .cn-button[data-variant="ghost"]:first-child { margin-inline-start: calc(-1 * {size.controlPadding.sm}); }
.cn-notification[data-unread] .cn-notification__title::after { content: ''; display: inline-block; width: {space.2}; height: {space.2}; margin-inline-start: {space.2}; border-radius: {radius.full}; background-color: {color.bg-action}; vertical-align: middle; }`,
  examples: [
    ex('Default (text only)', card('default', 'neutral', `<div class="cn-notification__content"><div class="cn-notification__title">Your export is ready</div><p class="cn-notification__description">prospects-q3.csv · 1.2 MB · 2,418 rows</p><time class="cn-notification__time" datetime="2026-09-11T09:41">Just now</time></div>${dismiss}`)),
    ex('With avatar and actions', card('with-avatar', 'neutral', `${avatar('OR', 'Maya Chen')}<div class="cn-notification__content"><div class="cn-notification__title">Maya Chen commented on your post</div><p class="cn-notification__description">“Looks great — can we ship the reporting tab on Monday instead of Friday?”</p><time class="cn-notification__time" datetime="2026-09-11T09:39">2 minutes ago</time>${actions('Dismiss', 'Reply')}</div>${dismiss}`), 'Social events show who acted. Two actions at most: a ghost Dismiss and one link action.'),
    ex('Featured icon, success tone', card('with-featured-icon', 'success', `${featured(SVG.checkCircle)}<div class="cn-notification__content"><div class="cn-notification__title">Payment received</div><p class="cn-notification__description">Nakamura Trading Co. paid invoice INV-3066 · $12,400.00</p><time class="cn-notification__time" datetime="2026-09-11T08:12">1 hour ago</time>${actions('Dismiss', 'View invoice')}</div>${dismiss}`)),
    ex('Upload in progress', card('with-progress', 'neutral', `${featured(SVG.upload)}<div class="cn-notification__content"><div class="cn-notification__title">Uploading design-system.fig</div><p class="cn-notification__description">1.4 MB of 2.3 MB · about 20 seconds left</p><div class="cn-notification__progress"><div class="cn-notification__progress-track" role="progressbar" aria-label="Upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="60"><div class="cn-notification__progress-fill" style="width:60%"></div></div><span>60%</span></div></div>${dismiss}`), 'The neutral featured icon is a hairline square ("modern"); toned icons become tinted circles.'),
    ex('With image (announcement)', card('with-image', 'neutral', `${featured(SVG.spark)}<div class="cn-notification__content"><div class="cn-notification__title">New feature: reporting</div><p class="cn-notification__description">Build custom dashboards from any search and share them with your team.</p><time class="cn-notification__time" datetime="2026-09-10T17:00">Yesterday</time>${IMAGE}${actions('Dismiss', 'Learn more')}</div>${dismiss}`), 'The image is an inline SVG placeholder here; in the app it is an <img> with alt text.'),
    ex('Warning with actions, unread', card('with-actions', 'warning', `${featured(SVG.alert)}<div class="cn-notification__content"><div class="cn-notification__title">Storage is 92% full</div><p class="cn-notification__description">Uploads will pause at 100%. Free up space or upgrade your plan.</p><time class="cn-notification__time" datetime="2026-09-11T07:30">3 hours ago</time>${actions('Later', 'Upgrade plan')}</div>${dismiss}`).replace('role="status"', 'role="status" data-unread'), 'data-unread adds the action-colored dot after the title.'),
  ],
  recipes: [
    ex('Danger tone, sync failed', card('with-featured-icon', 'danger', `${featured(SVG.alert)}<div class="cn-notification__content"><div class="cn-notification__title">Pipedrive sync failed</div><p class="cn-notification__description">14 deals were not updated. The token expired on Sep 9.</p><time class="cn-notification__time" datetime="2026-09-11T06:02">5 hours ago</time>${actions('Dismiss', 'Reconnect')}</div>${dismiss}`), 'Danger notifications report a background failure and offer the fix as the link action; anything needing an immediate decision is a Dialog instead.'),
    ex('Stack in a panel', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-3)">${card('with-avatar', 'neutral', `${avatar('PB', 'Daniel Costa')}<div class="cn-notification__content"><div class="cn-notification__title">Daniel Costa mentioned you in Q3 launch plan</div><time class="cn-notification__time" datetime="2026-09-11T09:20">20 minutes ago</time></div>${dismiss}`)}${card('with-avatar', 'neutral', `${avatar('LS', 'Sofia Almeida')}<div class="cn-notification__content"><div class="cn-notification__title">Sofia Almeida invited you to Brand refresh</div><time class="cn-notification__time" datetime="2026-09-11T08:55">45 minutes ago</time>${actions('Decline', 'Accept')}</div>${dismiss}`)}</div>`, 'Newest first, 12px apart, inside a drawer or a popover anchored to the bell icon.'),
  ],
  rules: [
    'Width is 400px (max 100%); the card never stretches to fill a wide panel. Panels and drawers are sized to the card, not the other way around.',
    'Title is one line, sentence case, no period: "{Person} {verb} {object}" for social events, "{Object} {state}" for system events.',
    'Description is at most two lines: a quoted excerpt, a file name with size, or the concrete change. Truncate long comments with an ellipsis and let the action open the full thing.',
    'Always show a timestamp (relative under 24h, absolute after) in a <time datetime>.',
    'At most two actions: a ghost sm secondary first ("Dismiss", "Later", "Decline") and one link sm primary last ("View changes", "Reply", "Accept").',
    'The card stays white in every tone; only the featured icon is tinted. Never tint the whole card or add a colored left bar.',
    'Avatar for people, featured icon for the system, image only for announcements. Never two media slots.',
    'Progress rows show a percentage and a plain-language remainder ("about 20 seconds left"); when the job ends the card becomes a success notification, it does not disappear.',
    'Unread state is a dot after the title plus semibold; clear it when the panel opens, never require a click per card.',
  ],
  a11y: [
    'role="status" on the card so new notifications are announced politely; the panel that holds them is a region labelled "Notifications".',
    'The dismiss button has aria-label="Dismiss" and is the last Tab stop inside the card; Escape inside the panel dismisses the focused card.',
    'Avatars with initials carry role="img" and aria-label="Full name"; featured icons and images used as decoration are aria-hidden.',
    'Progress uses role="progressbar" with aria-valuenow/min/max on the track and the percentage as visible text.',
    'The unread dot is decorative; expose "unread" in the accessible name or a visually hidden word so screen readers get it too.',
  ],
  related: ['toast', 'alert', 'banner', 'button', 'avatar', 'progress'],
};
