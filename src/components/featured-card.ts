import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Featured card: the small promo / usage card at the bottom of a sidebar: a
// bg-subtle card with a label-sm title, a body-sm description, an optional 8px
// progress bar or 16:9 image, a ghost "Dismiss" + link "Upgrade plan" row and a
// 20px × in the corner.

const IMAGE = `<svg viewBox="0 0 320 180" role="img" aria-label="Lumen on a phone"><rect width="320" height="180" style="fill:var(--cn-color-bg-muted)"/><rect x="118" y="20" width="84" height="176" rx="14" style="fill:var(--cn-color-bg-surface)"/><rect x="128" y="36" width="64" height="8" rx="4" style="fill:var(--cn-color-border-strong)"/><rect x="128" y="52" width="40" height="6" rx="3" style="fill:var(--cn-color-border-default)"/><rect x="128" y="72" width="64" height="44" rx="6" style="fill:var(--cn-color-bg-subtle)"/><path d="M134 106l14-12 12 8 12-16 20 12" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--cn-color-bg-action)"/><rect x="128" y="126" width="64" height="10" rx="5" style="fill:var(--cn-color-bg-action)"/></svg>`;

const DISMISS = `<button type="button" class="cn-featured-card__dismiss" aria-label="Dismiss">${ICON.x}</button>`;
const actions = (secondary: string, primary: string) =>
  `<div class="cn-featured-card__actions"><button type="button" class="cn-button" data-variant="ghost" data-size="sm"><span class="cn-button__label">${secondary}</span></button><button type="button" class="cn-button" data-variant="link-color" data-size="sm"><span class="cn-button__label">${primary}</span></button></div>`;
const progress = (pct: number, label: string) =>
  `<div class="cn-featured-card__progress" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="cn-featured-card__progress-fill" style="width:${pct}%"></div></div>`;

const card = (variant: string, tone: string, inner: string) =>
  `<div class="cn-featured-card" data-variant="${variant}" data-tone="${tone}" role="complementary" aria-label="Sidebar notice" style="width:100%;max-width:264px">${inner}</div>`;

export const featuredCard: ComponentSpec = {
  name: 'FeaturedCard',
  slug: 'featured-card',
  category: 'feedback',
  description: 'The small promo or usage card at the bottom of a sidebar: a bg-subtle card with a label-sm title, body-sm muted description, an optional 8px progress bar or 16:9 image, a ghost "Dismiss" and a link-color action, and a 20px × in the corner.',
  usage: 'Use for one gentle nudge that lives in navigation: plan usage, a trial countdown, a new app or feature, an invite prompt. One per sidebar, always dismissible. For page-level messages use Banner or Alert; for a row inside content use InlineCta.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The card: bg-subtle, radius card, 16px padding, flex column with 12px gaps, relative for the × button. 264px wide in a sidebar.' },
    { part: 'title', element: 'div', description: 'label-sm title, one line, with room on the right for the ×.' },
    { part: 'description', element: 'p', description: 'body-sm muted, one to three lines. Includes the number when there is one ("80% of 10 GB used").' },
    { part: 'progress', element: 'div', description: '8px track (bg-muted, radius full) for usage and countdowns. role="progressbar".', optional: true },
    { part: 'progress-fill', element: 'div', description: 'The action-colored fill; width is the inline percentage.', optional: true },
    { part: 'media', element: 'div', description: '16:9 image slot with radius md above the actions (announcements).', optional: true },
    { part: 'actions', element: 'div', description: 'Row of two sm Buttons: ghost "Dismiss" first, link-color action last.', optional: true },
    { part: 'dismiss', element: 'button', description: '24px hit area with a 20px × in the top-right corner. aria-label "Dismiss".', optional: true },
  ],
  props: {
    variant: {
      values: ['progress', 'image', 'text'],
      default: 'progress',
      description: 'progress = title, description and an 8px bar (storage used, seats, trial days left). image = title, description and a 16:9 picture (a new app, a feature launch). text = title and description only (invite your team, complete your profile).',
    },
    tone: {
      values: ['neutral', 'brand'],
      default: 'neutral',
      description: 'neutral = bg-subtle card, the everyday usage card. brand = bg-action-subtle with an action-colored title for the one promotional card (upgrade, trial). Never two brand cards in a sidebar.',
    },
  },
  states: {
    dismissHover: { selector: ' .cn-featured-card__dismiss:hover', description: 'Pointer over the × (extraCss): muted fill, ink icon.', markup: 'native :hover on .cn-featured-card__dismiss' },
    dismissFocus: { selector: ' .cn-featured-card__dismiss:focus-visible', description: 'Keyboard focus on the × shows the focus ring (extraCss).', markup: 'native :focus-visible on .cn-featured-card__dismiss' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.3}',
      width: '100%',
      'min-width': '0',
      padding: '{space.4}',
      'background-color': '{color.bg-subtle}',
      'border-radius': '{radius.card}',
      color: '{color.fg-default}',
    },
    title: { ...typeStyle('label-sm'), 'line-height': '{font.lineHeight.normal}', color: '{color.fg-default}', 'padding-inline-end': '{space.6}' },
    description: { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'margin-top': 'calc(-1 * {space.2})' },
    progress: { width: '100%', height: '{space.2}', 'border-radius': '{radius.full}', 'background-color': '{color.bg-muted}', overflow: 'hidden' },
    'progress-fill': { height: '100%', width: '0', 'border-radius': '{radius.full}', 'background-color': '{color.bg-action}', 'transition-property': 'width', 'transition-duration': '{motion.duration.slow}', 'transition-timing-function': '{motion.easing.standard}' },
    media: { display: 'block', width: '100%', 'aspect-ratio': '16 / 9', 'border-radius': '{radius.md}', overflow: 'hidden', 'background-color': '{color.bg-muted}' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.3}' },
    dismiss: {
      ...RESET_BUTTON,
      position: 'absolute',
      top: '{space.3}',
      'inset-inline-end': '{space.3}',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.6}',
      height: '{space.6}',
      'border-radius': '{radius.sm}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
  },
  variants: {
    variant: {
      progress: { root: {} },
      image: { root: {} },
      text: { root: {} },
    },
    tone: {
      neutral: { root: { 'background-color': '{color.bg-subtle}' } },
      brand: {
        root: { 'background-color': '{color.bg-action-subtle}' },
        title: { color: '{color.fg-action}' },
        progress: { 'background-color': 'color-mix(in srgb, {color.bg-action} 16%, transparent)' },
        dismiss: { color: '{color.fg-action}' },
      },
    },
  },
  extraCss: `
.cn-featured-card__dismiss .cn-icon { width: {size.icon.lg}; height: {size.icon.lg}; }
.cn-featured-card__dismiss:hover { background-color: {color.bg-muted}; color: {color.fg-default}; }
.cn-featured-card__dismiss:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-featured-card[data-tone="brand"] .cn-featured-card__dismiss:hover { background-color: color-mix(in srgb, {color.bg-action} 16%, transparent); }
.cn-featured-card__media > svg, .cn-featured-card__media > img { display: block; width: 100%; height: 100%; object-fit: cover; }
.cn-featured-card__actions > .cn-button[data-variant="ghost"]:first-child { margin-inline-start: calc(-1 * {size.controlPadding.sm}); }`,
  examples: [
    ex('Usage with progress', card('progress', 'neutral', `<div class="cn-featured-card__title">Used space</div><p class="cn-featured-card__description">Your team has used 80% of the available space. Need more?</p>${progress(80, 'Storage used')}${actions('Dismiss', 'Upgrade plan')}${DISMISS}`), 'The bottom-of-sidebar usage card: number in the text, bar below, two quiet actions.'),
    ex('Announcement with image, brand tone', card('image', 'brand', `<div class="cn-featured-card__title">Lumen for iOS is here</div><p class="cn-featured-card__description">Approve requests and reply to comments from your phone.</p><div class="cn-featured-card__media">${IMAGE}</div>${actions('Dismiss', 'Get the app')}${DISMISS}`), 'One brand-toned card per sidebar; the image is 16:9 with radius md.'),
    ex('Text only', card('text', 'neutral', `<div class="cn-featured-card__title">Invite your team</div><p class="cn-featured-card__description">Lumen works better together. Add teammates to share dashboards and approvals.</p>${actions('Dismiss', 'Send invites')}${DISMISS}`), 'A nudge with no bar or picture.'),
    ex('Trial countdown, brand tone', card('progress', 'brand', `<div class="cn-featured-card__title">Trial ends in 4 days</div><p class="cn-featured-card__description">10 of 14 days used. Keep your dashboards by choosing a plan.</p>${progress(71, 'Trial days used')}${actions('Dismiss', 'Choose a plan')}${DISMISS}`), 'Countdowns use the progress variant with the days in the description.'),
  ],
  rules: [
    'One featured card per sidebar, always at the bottom above the account card, always dismissible.',
    'Title in label-sm, one line, sentence case; description at most three lines and includes the number ("80% of 10 GB used").',
    'Exactly two actions: a ghost sm "Dismiss" first and one link-color sm action last. Never a primary button in the sidebar.',
    'The × dismisses for this session; the "Dismiss" button dismisses for good. Do not show the card again within 30 days.',
    'Progress fills with the action color and warns in the text, not by turning red; the sidebar is not the place for alarms.',
    'brand tone only for the one promotional card (upgrade, trial); usage and housekeeping cards are neutral.',
    'Images are 16:9, radius md, illustrative; never a screenshot with text small enough to need reading.',
    'Do not stack a FeaturedCard with a Banner about the same thing; pick the surface closest to where the action happens.',
  ],
  a11y: [
    'The card is a complementary region (role="complementary" or an <aside>) with an aria-label so it can be skipped.',
    'The progress bar carries role="progressbar" with aria-valuenow/min/max and an aria-label; the percentage also appears in the description text.',
    'The × has aria-label "Dismiss" and comes last in the tab order inside the card; Escape does nothing here (the card is not modal).',
    'Images have alt text or aria-label describing what is promoted; decorative art uses alt="".',
    'Both actions are real <button>s or links; the link-color action opens the page it names.',
  ],
  related: ['sidebar', 'inline-cta', 'banner', 'progress', 'button', 'close-button'],
};
