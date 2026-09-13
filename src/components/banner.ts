import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// tone → soft (bg, border, fg) and solid (bg, fg)
const TONES: Record<string, { bg: string; border: string; fg: string; solidBg: string; solidFg: string }> = {
  neutral: { bg: '{color.bg-subtle}', border: '{color.border-default}', fg: '{color.fg-default}', solidBg: '{color.bg-inverse}', solidFg: '{color.fg-inverse}' },
  info: { bg: '{color.bg-info-subtle}', border: '{color.border-info}', fg: '{color.fg-info}', solidBg: '{color.bg-info}', solidFg: '{white}' },
  warning: { bg: '{color.bg-warning-subtle}', border: '{color.border-warning}', fg: '{color.fg-warning}', solidBg: '{color.bg-warning}', solidFg: '{neutral.950}' },
  danger: { bg: '{color.bg-danger-subtle}', border: '{color.border-danger}', fg: '{color.fg-danger}', solidBg: '{color.bg-danger}', solidFg: '{white}' },
  accent: { bg: '{color.bg-accent-subtle}', border: '{color.border-default}', fg: '{color.fg-accent}', solidBg: '{color.bg-accent}', solidFg: '{color.fg-on-accent}' },
};

const compound = Object.entries(TONES).flatMap(([t, v]) => [
  { when: { tone: t, variant: 'soft' }, block: { root: { 'background-color': v.bg, 'border-bottom-color': v.border, color: v.fg } } },
  { when: { tone: t, variant: 'solid' }, block: { root: { 'background-color': v.solidBg, 'border-bottom-color': 'transparent', color: v.solidFg } } },
]);

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-banner__icon');
const dismiss = `<button type="button" class="cn-banner__dismiss" aria-label="Dismiss">${ICON.x}</button>`;

export const banner: ComponentSpec = {
  name: 'Banner',
  slug: 'banner',
  category: 'feedback',
  description: 'Full-width strip at the top of the page or a section: one line of text, an optional icon, one action and a dismiss. Square corners, no shadow, a hairline at the bottom; it reads as part of the chrome, not as a card.',
  usage: 'Use for one notice that concerns the whole page or account: maintenance tonight, trial ending, a product announcement (tone accent), an outage (tone danger). Not for feedback on a specific element (use Alert) and not for transient confirmations (use Toast).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The strip. Spans the full width of its container; role="status" (or "alert" for danger).' },
    { part: 'icon', element: 'svg', description: '16px icon in the current text color. Decorative.', optional: true },
    { part: 'content', element: 'div', description: 'The message, one sentence, body-sm. Flexes to fill; may contain a <strong> lead.' },
    { part: 'actions', element: 'div', description: 'One link or outline Button (size sm) on the right.', optional: true },
    { part: 'dismiss', element: 'button', description: '24px ghost icon button with an X at the far end. aria-label="Dismiss".', optional: true },
  ],
  props: {
    tone: {
      values: ['neutral', 'info', 'warning', 'danger', 'accent'],
      default: 'neutral',
      description: 'neutral = housekeeping notice; info = something to know; warning = act before a deadline; danger = something is broken now; accent = brand announcement (new feature, launch) in the accent wash — never for status.',
    },
    variant: {
      values: ['soft', 'solid'],
      default: 'soft',
      description: 'soft = tinted background with dark tone text (default); solid = filled tone background with white text, reserved for danger (outage) and info (maintenance) when the notice must not be missed.',
    },
  },
  states: {
    dismissHover: { selector: ' .cn-banner__dismiss:hover', description: 'Pointer over the dismiss button: faint current-color wash. Styled in extraCss because it lives on a child.', markup: 'native :hover on .cn-banner__dismiss' },
    dismissFocus: { selector: ' .cn-banner__dismiss:focus-visible', description: 'Keyboard focus on the dismiss button shows the focus ring. Styled in extraCss.', markup: 'native :focus-visible on .cn-banner__dismiss' },
    sticky: { selector: '[data-sticky]', description: 'Sticks under the topbar while the page scrolls. Position only; styled in extraCss so examples stay static.', markup: 'data-sticky attribute on the root' },
  },
  base: {
    root: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.3}',
      width: '100%',
      'min-height': '{size.control.lg}',
      padding: '{space.2} {space.4}',
      'border-radius': '{radius.none}',
      'border-bottom': '{border.width.thin} solid {color.border-default}',
      'background-color': '{color.bg-subtle}',
      color: '{color.fg-default}',
      ...typeStyle('body-sm'),
      'box-shadow': 'none',
    },
    icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0' },
    content: { flex: '1 1 auto', 'min-width': '0' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.2}', 'flex-shrink': '0' },
    dismiss: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.xl}',
      height: '{size.icon.xl}',
      'margin-inline-end': 'calc({space.1} * -1)',
      'border-radius': '{radius.md}',
      color: 'inherit',
      opacity: '{opacity.muted}',
      ...TRANSITION_COLORS,
    },
  },
  variants: {
    tone: Object.fromEntries(Object.keys(TONES).map((t) => [t, { root: {} }])),
    variant: { soft: { root: {} }, solid: { root: {} } },
  },
  compound,
  extraCss: `
.cn-banner .cn-banner__dismiss .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; }
.cn-banner .cn-banner__dismiss:hover { opacity: 1; background-color: color-mix(in srgb, currentColor 12%, transparent); }
.cn-banner .cn-banner__dismiss:focus-visible { opacity: 1; outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-banner .cn-banner__actions .cn-button { color: inherit; }
.cn-banner[data-variant="solid"] .cn-banner__actions .cn-button[data-variant="outline"] { background-color: transparent; border-color: color-mix(in srgb, currentColor 40%, transparent); box-shadow: none; }
.cn-banner[data-variant="solid"] .cn-banner__actions .cn-button[data-variant="link"] { text-decoration-color: currentColor; }
.cn-banner[data-sticky] { position: sticky; top: 0; z-index: {z.sticky}; }`,
  examples: [
    ex('Neutral (soft)', `<div class="cn-banner" data-tone="neutral" data-variant="soft" role="status">${icon('info')}<div class="cn-banner__content"><strong>Scheduled maintenance</strong> on Saturday 14 Sep, 02:00–03:00 UTC. Outreach pauses during that hour.</div><div class="cn-banner__actions"><button type="button" class="cn-button" data-variant="link" data-size="sm"><span class="cn-button__label">Details</span></button></div>${dismiss}</div>`),
    ex('Info', `<div class="cn-banner" data-tone="info" data-variant="soft" role="status">${icon('info')}<div class="cn-banner__content">Your trial ends in 6 days. Add a payment method to keep your prospects and drafts.</div><div class="cn-banner__actions"><button type="button" class="cn-button" data-variant="outline" data-size="sm"><span class="cn-button__label">Add payment method</span></button></div>${dismiss}</div>`),
    ex('Warning', `<div class="cn-banner" data-tone="warning" data-variant="soft" role="status">${icon('warning')}<div class="cn-banner__content">The Gmail connection for <strong>sales@verolabs.com</strong> expires tomorrow. Reconnect to avoid a gap in replies.</div><div class="cn-banner__actions"><button type="button" class="cn-button" data-variant="outline" data-size="sm"><span class="cn-button__label">Reconnect</span></button></div></div>`),
    ex('Accent (announcement)', `<div class="cn-banner" data-tone="accent" data-variant="soft" role="status">${icon('spark')}<div class="cn-banner__content"><strong>New:</strong> agents now read replies in Japanese and German and draft answers in the buyer’s language.</div><div class="cn-banner__actions"><button type="button" class="cn-button" data-variant="link" data-size="sm"><span class="cn-button__label">See what changed</span></button></div>${dismiss}</div>`),
    ex('Danger (solid)', `<div class="cn-banner" data-tone="danger" data-variant="solid" role="alert">${icon('warning')}<div class="cn-banner__content">Email delivery is degraded since 09:12 UTC. Sent messages may arrive late; nothing is lost.</div><div class="cn-banner__actions"><button type="button" class="cn-button" data-variant="outline" data-size="sm"><span class="cn-button__label">Status page</span></button></div></div>`, 'solid is reserved for danger and info notices that must not be missed. No dismiss while the incident is open.'),
  ],
  rules: [
    'One banner per page at most. If a second notice appears, the more urgent one wins and the other waits.',
    'One sentence, ideally under 90 characters, with an optional <strong> lead. No title, no second line.',
    'One action at most (link or outline, size sm) plus the dismiss. Never a primary Button in a banner.',
    'No radius, no shadow, no margin: the banner touches the edges of its container and sits directly under the topbar.',
    'Use data-sticky only when the notice must stay visible while scrolling (an open incident). Sticky banners are never accent.',
    'variant="solid" only for tone danger or info. Never solid accent, warning or neutral.',
    'Danger banners for open incidents are not dismissible; they leave when the incident closes.',
    'Accent tone is for announcements only. It never signals a status or an error.',
  ],
  a11y: [
    'role="status" by default; role="alert" for danger banners inserted after page load.',
    'The banner is inside the header landmark or the first child of <main>, so screen readers meet it before the page content.',
    'The dismiss button needs aria-label="Dismiss"; the action must be a real <button> or <a href>.',
    'Solid variants keep AA contrast: white text on info/danger, ink text on warning.',
  ],
  related: ['alert', 'toast', 'topbar', 'button'],
};
