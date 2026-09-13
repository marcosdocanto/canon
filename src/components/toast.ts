import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, STATE, ex, ICON, typeStyle } from './_shared.ts';

const TONE_ICON: Record<string, string> = {
  neutral: '{color.fg-muted}',
  success: '{color.fg-success}',
  warning: '{color.fg-warning}',
  danger: '{color.fg-danger}',
  info: '{color.fg-info}',
};

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-toast__icon');
const dismiss = `<button type="button" class="cn-toast__dismiss" aria-label="Dismiss">${ICON.x}</button>`;

export const toast: ComponentSpec = {
  name: 'Toast',
  slug: 'toast',
  category: 'feedback',
  description: 'Short-lived notification panel that slides in at the bottom-right corner: a raised white card with an icon, a title, one line of detail and at most one action. The component styles the panel; the fixed region that stacks toasts is a separate class.',
  usage: 'Use to confirm something the user just did ("Draft saved", "Invite sent") or to report a background event that needs no decision. Not for errors the user must act on (use Alert in place, or Dialog) and not for information that must persist (use Banner).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The panel. 360px wide, raised surface, shadow-lg. role="status"; data-state="open|closed".' },
    { part: 'icon', element: 'svg', description: '16px icon in the tone color, top-aligned with the title. Decorative.', optional: true },
    { part: 'content', element: 'div', description: 'Title + description + action. Flexes to fill.' },
    { part: 'title', element: 'div', description: 'label-md, one line: what happened ("Invite sent").' },
    { part: 'description', element: 'p', description: 'body-sm muted, one line of detail (who, when, how many).', optional: true },
    { part: 'action', element: 'div', description: 'One link or ghost Button (size sm) under the description: "Undo", "View".', optional: true },
    { part: 'dismiss', element: 'button', description: '24px ghost icon button with an X in the top-right corner. aria-label="Dismiss".', optional: true },
  ],
  props: {
    tone: {
      values: ['neutral', 'success', 'warning', 'danger', 'info'],
      default: 'neutral',
      description: 'Only the icon color changes; the panel stays white. neutral = plain confirmation; success = a completed action; warning = something to look at later; danger = a background failure that needs no immediate decision; info = a heads-up.',
    },
  },
  states: {
    open: STATE.open(),
    closed: { selector: '[data-state="closed"]', description: 'Removed from view (display none) after the auto-dismiss timer or the dismiss button.', markup: 'data-state="closed"' },
    dismissHover: { selector: ' .cn-toast__dismiss:hover', description: 'Pointer over the dismiss button: subtle fill. Styled in extraCss because it lives on a child.', markup: 'native :hover on .cn-toast__dismiss' },
    dismissFocus: { selector: ' .cn-toast__dismiss:focus-visible', description: 'Keyboard focus on the dismiss button shows the focus ring. Styled in extraCss.', markup: 'native :focus-visible on .cn-toast__dismiss' },
  },
  base: {
    root: {
      display: 'flex',
      'align-items': 'flex-start',
      gap: '{space.3}',
      width: '360px',
      'max-width': '100%',
      padding: '{space.3} {space.4}',
      'background-color': '{color.bg-surface-raised}',
      border: '{border.width.thin} solid {color.border-default}',
      'border-radius': '{radius.lg}',
      'box-shadow': '{shadow.lg}',
      color: '{color.fg-default}',
      ...typeStyle('body-sm'),
    },
    icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', 'margin-top': '1px', color: '{color.fg-muted}' },
    content: { flex: '1 1 auto', 'min-width': '0' },
    title: { ...typeStyle('label-md'), 'line-height': '{font.lineHeight.snug}' },
    description: { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'margin-top': '{space.1}' },
    action: { display: 'flex', 'align-items': 'center', gap: '{space.2}', 'margin-top': '{space.2}' },
    dismiss: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.xl}',
      height: '{size.icon.xl}',
      'margin-block': 'calc({space.1} * -1)',
      'margin-inline-end': 'calc({space.1} * -1)',
      'border-radius': '{radius.md}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
    '@states': {
      open: { root: { animation: 'cn-toast-enter {motion.duration.slow} {motion.easing.out} both' } },
      closed: { root: { display: 'none' } },
    },
  },
  variants: {
    tone: Object.fromEntries(Object.entries(TONE_ICON).map(([t, color]) => [t, { icon: { color } }])),
  },
  extraCss: `
.cn-toast-region { position: fixed; bottom: {space.6}; right: {space.6}; display: flex; flex-direction: column; gap: {space.2}; z-index: {z.toast}; pointer-events: none; }
.cn-toast-region > .cn-toast { pointer-events: auto; }
@keyframes cn-toast-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.cn-toast .cn-toast__dismiss .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; }
.cn-toast .cn-toast__dismiss:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-toast .cn-toast__dismiss:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }`,
  examples: [
    ex('Neutral', `<div class="cn-toast" data-tone="neutral" data-state="open" role="status">${icon('info')}<div class="cn-toast__content"><div class="cn-toast__title">Draft saved</div><p class="cn-toast__description">Reply to Nakamura Trading Co. · 2 seconds ago</p></div>${dismiss}</div>`),
    ex('Success with action', `<div class="cn-toast" data-tone="success" data-state="open" role="status">${icon('check')}<div class="cn-toast__content"><div class="cn-toast__title">Invite sent to Hoffmann GmbH</div><p class="cn-toast__description">They will receive it within a minute.</p><div class="cn-toast__action"><button type="button" class="cn-button" data-variant="link" data-size="sm"><span class="cn-button__label">Undo</span></button></div></div>${dismiss}</div>`),
    ex('Warning', `<div class="cn-toast" data-tone="warning" data-state="open" role="status">${icon('warning')}<div class="cn-toast__content"><div class="cn-toast__title">4 prospects skipped</div><p class="cn-toast__description">No verified email found. They stay in the list as “unreachable”.</p></div>${dismiss}</div>`),
    ex('Danger (background failure)', `<div class="cn-toast" data-tone="danger" data-state="open" role="status">${icon('warning')}<div class="cn-toast__content"><div class="cn-toast__title">Export failed</div><p class="cn-toast__description">The file was not generated. Try again from the Export menu.</p><div class="cn-toast__action"><button type="button" class="cn-button" data-variant="ghost" data-size="sm"><span class="cn-button__label">Retry</span></button></div></div>${dismiss}</div>`),
    ex('Info', `<div class="cn-toast" data-tone="info" data-state="open" role="status">${icon('info')}<div class="cn-toast__content"><div class="cn-toast__title">Nightly refresh finished</div><p class="cn-toast__description">37 new companies in Japan and South Korea.</p><div class="cn-toast__action"><button type="button" class="cn-button" data-variant="link" data-size="sm"><span class="cn-button__label">View</span></button></div></div>${dismiss}</div>`),
  ],
  recipes: [
    ex('Stack of two (static)', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-2)"><div class="cn-toast" data-tone="success" data-state="open" role="status">${icon('check')}<div class="cn-toast__content"><div class="cn-toast__title">Shortlist exported</div><p class="cn-toast__description">prospects-japan.xlsx · 1.2 MB</p></div>${dismiss}</div><div class="cn-toast" data-tone="neutral" data-state="open" role="status">${icon('info')}<div class="cn-toast__content"><div class="cn-toast__title">Agent paused</div><p class="cn-toast__description">Outreach resumes at 08:00 in the buyer’s timezone.</p></div>${dismiss}</div></div>`, 'In the app the same markup lives inside .cn-toast-region (fixed, bottom-right). Newest at the bottom.'),
  ],
  rules: [
    'Toasts auto-dismiss after 5 seconds (8 seconds when they carry an action). Hovering pauses the timer.',
    'At most 3 toasts visible; the oldest leaves when a fourth arrives.',
    'Never use a toast for an error that needs a decision. If the user must act, show an Alert next to the thing or a Dialog.',
    'Title is 2–5 words in past tense ("Invite sent"); description is one line with the concrete object, count or time.',
    'At most one action, variant link or ghost, size sm. "Undo" is the most valuable action a toast can offer.',
    'Render toasts inside .cn-toast-region (fixed, bottom-right, z toast). The panel itself is never position: fixed.',
    'The panel stays white in every tone; only the icon changes color. No tinted toasts.',
    'Enter animation is translateY(8px) → 0 with opacity, 260ms; leaving is opacity only. Both disappear under prefers-reduced-motion.',
  ],
  a11y: [
    'role="status" on the panel (polite); use aria-live="assertive" on the region only for danger toasts.',
    'The region is aria-label="Notifications"; toasts never steal focus when they appear.',
    'The dismiss button has aria-label="Dismiss"; Escape dismisses the most recent toast when a toast has focus.',
    'Pause the auto-dismiss timer while the toast or its action has focus or the pointer.',
  ],
  related: ['alert', 'banner', 'dialog', 'button'],
};
