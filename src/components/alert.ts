import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// tone → { soft bg (tint), soft border, featured-icon color }
const TONES: Record<string, { bg: string; border: string; fg: string }> = {
  neutral: { bg: '{color.bg-subtle}', border: '{color.border-control}', fg: '{color.fg-muted}' },
  brand: { bg: '{color.bg-action-subtle}', border: '{color.border-action}', fg: '{color.fg-accent}' },
  info: { bg: '{color.bg-info-subtle}', border: '{color.border-info}', fg: '{color.fg-info}' },
  success: { bg: '{color.bg-success-subtle}', border: '{color.border-success}', fg: '{color.fg-success}' },
  warning: { bg: '{color.bg-warning-subtle}', border: '{color.border-warning}', fg: '{color.fg-warning}' },
  danger: { bg: '{color.bg-danger-subtle}', border: '{color.border-danger}', fg: '{color.fg-danger}' },
};

// soft = tinted surface + tone border. Text stays neutral (title fg-default, description fg-muted) in every tone: only the icon, the border and the tint carry the color.
const compound = Object.entries(TONES).map(([t, v]) => ({
  when: { tone: t, variant: 'soft' },
  block: { root: { 'background-color': v.bg, 'border-color': v.border } },
}));

const icon = (name: keyof typeof ICON) => `<span class="cn-alert__icon" aria-hidden="true">${ICON[name]}</span>`;
const dismiss = `<button type="button" class="cn-alert__dismiss" aria-label="Dismiss">${ICON.x}</button>`;
const link = (label: string) => `<button type="button" class="cn-button" data-variant="link" data-size="sm"><span class="cn-button__label">${label}</span></button>`;
const actions = (a = 'Dismiss', b = 'View changes') => `<div class="cn-alert__actions">${link(a)}${link(b)}</div>`;

export const alert: ComponentSpec = {
  name: 'Alert',
  slug: 'alert',
  category: 'feedback',
  description: 'Callout with a featured icon (a 20px line icon inside two faint concentric rings), a semibold title, a one-line description, optional link actions and a close button. 16px padding, 12px radius; tinted (soft) or white (outline); in the flow of the page, floating with a shadow, or as a full-width bar.',
  usage: 'Use for messages tied to the content on screen: a failed sync, a plan limit, a confirmation after a form saves, a release note above a list. Not for transient feedback (use Toast), not for one-line page-wide notices (use Banner), and not for decisions that block the flow (use Dialog).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The callout surface. role="alert" for danger/warning that appear dynamically, role="status" otherwise. Carries data-tone, data-variant, data-layout.' },
    { part: 'icon', element: 'span', description: 'Featured icon, "outline" style: a 20px line icon (ICON.info / ICON.check / ICON.warning inside the span) in the tone color with two concentric 2px rings at 30% and 10% opacity (28px and 38px). aria-hidden.' },
    { part: 'content', element: 'div', description: 'Text column: title, description, actions. Flexes to fill; min-width 0 so long text wraps.' },
    { part: 'title', element: 'div', description: 'text-sm semibold (label-md), one line. Says what happened ("We’ve just released a new feature"), not "Error".' },
    { part: 'description', element: 'p', description: 'text-sm muted (body-md, fg-muted), one or two sentences under the title. Says what to do next.', optional: true },
    { part: 'actions', element: 'div', description: 'Row of link Buttons (size sm), 12px apart: a quiet one first ("Dismiss", gray) then the one that does something ("View changes", brand). At most two. Inside the content column, or a direct child of the root in the full-width layout (then it sits on the right).', optional: true },
    { part: 'dismiss', element: 'button', description: 'Close button in the top-right corner: 36px hit area, 20px X icon, fg-subtle, 8px from the edges. Requires aria-label="Dismiss".', optional: true },
  ],
  props: {
    tone: {
      values: ['neutral', 'brand', 'info', 'success', 'warning', 'danger'],
      default: 'neutral',
      description: 'Meaning. neutral = context or a tip (gray icon; "default"/"gray"); brand = product news and upsell (brand icon, brand tint); info = something to know, no action needed (blue); success = a completed action; warning = needs attention soon, nothing is broken; danger = failed or blocked, the user must act ("error").',
    },
    variant: {
      values: ['soft', 'outline'],
      default: 'soft',
      description: 'soft = tinted background (tone-50) with the tone border; outline = white surface with the neutral hairline and only the icon in the tone color ("default" alert; quieter, for lists of alerts or inside cards).',
    },
    layout: {
      values: ['inline', 'floating', 'full-width'],
      default: 'inline',
      description: 'inline = sits in the content flow above the thing it describes, no shadow (default); floating = the same card with shadow-lg, for alerts rendered over the page (bottom of the viewport, over a table); full-width = edge-to-edge bar with square corners, a bottom hairline and the actions on the right ("full-width" alert), placed directly under the topbar or at the top of a section.',
    },
  },
  states: {
    dismissHover: { selector: ' .cn-alert__dismiss:hover', description: 'Pointer over the close button: subtle fill, icon one step darker. Styled in extraCss because it lives on a child.', markup: 'native :hover on .cn-alert__dismiss' },
    dismissFocus: { selector: ' .cn-alert__dismiss:focus-visible', description: 'Keyboard focus on the close button shows the focus ring. Styled in extraCss.', markup: 'native :focus-visible on .cn-alert__dismiss' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'align-items': 'flex-start',
      gap: '{space.4}',
      width: '100%',
      padding: '{space.4}',
      'border-radius': '{radius.card}',
      border: '{border.width.thin} solid {color.border-control}',
      'background-color': '{color.bg-surface}',
      color: '{color.fg-default}',
      ...typeStyle('body-md'),
    },
    icon: {
      position: 'relative',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.md}',
      height: '{size.icon.md}',
      color: '{color.fg-muted}',
    },
    content: { flex: '1 1 auto', 'min-width': '0' },
    title: { ...typeStyle('label-md'), color: '{color.fg-default}' },
    description: { ...typeStyle('body-md'), 'margin-top': '{space.1}', color: '{color.fg-muted}' },
    actions: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.3}', 'margin-top': '{space.3}' },
    dismiss: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.control.sm}',
      height: '{size.control.sm}',
      'margin-block': 'calc({space.2} * -1)',
      'margin-inline-end': 'calc({space.2} * -1)',
      'border-radius': '{radius.control}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
      'transition-duration': '{motion.duration.fast}',
    },
  },
  variants: {
    tone: Object.fromEntries(Object.entries(TONES).map(([t, v]) => [t, { icon: { color: v.fg } }])),
    variant: {
      soft: { root: {} },
      outline: { root: { 'background-color': '{color.bg-surface}', 'border-color': '{color.border-control}' } },
    },
    layout: {
      inline: { root: {} },
      floating: { root: { 'box-shadow': '{shadow.lg}' } },
      'full-width': {
        root: { 'border-radius': '{radius.none}', 'border-inline': '0', 'border-top': '0', 'box-shadow': 'none', 'align-items': 'center', 'padding-inline': '{space.8}' },
        dismiss: { 'margin-block': '0' },
      },
    },
  },
  compound,
  extraCss: `
.cn-alert .cn-alert__icon .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-alert .cn-alert__icon::before, .cn-alert .cn-alert__icon::after { content: ''; position: absolute; border-radius: {radius.full}; border: {border.width.medium} solid currentColor; pointer-events: none; }
.cn-alert .cn-alert__icon::before { inset: -4px; opacity: 0.3; }
.cn-alert .cn-alert__icon::after { inset: -9px; opacity: 0.1; }
.cn-alert .cn-alert__dismiss .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-alert .cn-alert__dismiss:hover { background-color: {color.bg-subtle}; color: {color.fg-muted}; }
.cn-alert .cn-alert__dismiss:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-alert .cn-alert__actions .cn-button[data-variant="link"]:first-child:not(:last-child) { color: {color.fg-muted}; }
.cn-alert[data-layout="full-width"] > .cn-alert__actions { margin-top: 0; margin-inline-start: auto; flex-shrink: 0; }`,
  examples: [
    ex('Default (outline, neutral, inline)', `<div class="cn-alert" data-tone="neutral" data-variant="outline" data-layout="inline" role="status" style="max-width:640px">${icon('info')}<div class="cn-alert__content"><div class="cn-alert__title">We’ve just released a new feature</div><p class="cn-alert__description">Check out the all new dashboard view. Pages now load faster.</p>${actions()}</div>${dismiss}</div>`, 'The "default" alert: white surface, gray featured icon, two link actions (gray then brand), close button top-right.'),
    ex('Brand (soft)', `<div class="cn-alert" data-tone="brand" data-variant="soft" data-layout="inline" role="status" style="max-width:640px">${icon('spark')}<div class="cn-alert__content"><div class="cn-alert__title">We’ve just released a new feature</div><p class="cn-alert__description">Check out the all new dashboard view. Pages now load faster.</p>${actions()}</div>${dismiss}</div>`),
    ex('Info (soft)', `<div class="cn-alert" data-tone="info" data-variant="soft" data-layout="inline" role="status" style="max-width:640px">${icon('info')}<div class="cn-alert__content"><div class="cn-alert__title">A new export format is available</div><p class="cn-alert__description">You can now download reports as an Excel workbook with one sheet per team.</p></div>${dismiss}</div>`),
    ex('Success (soft)', `<div class="cn-alert" data-tone="success" data-variant="soft" data-layout="inline" role="status" style="max-width:640px">${icon('check')}<div class="cn-alert__content"><div class="cn-alert__title">Successfully updated profile</div><p class="cn-alert__description">Your changes have been saved and will appear in the team directory within a few minutes.</p>${actions('Dismiss', 'View profile')}</div>${dismiss}</div>`),
    ex('Warning (soft)', `<div class="cn-alert" data-tone="warning" data-variant="soft" data-layout="inline" role="alert" style="max-width:640px">${icon('warning')}<div class="cn-alert__content"><div class="cn-alert__title">Your trial ends in 3 days</div><p class="cn-alert__description">Add a payment method to keep your projects and team members after 14 Sep.</p>${actions('Dismiss', 'Upgrade plan')}</div>${dismiss}</div>`),
    ex('Danger (soft)', `<div class="cn-alert" data-tone="danger" data-variant="soft" data-layout="inline" role="alert" style="max-width:640px">${icon('warning')}<div class="cn-alert__content"><div class="cn-alert__title">There was a problem with that action</div><p class="cn-alert__description">We couldn’t save your changes. Check your connection and try again.</p>${actions('Dismiss', 'Try again')}</div></div>`, 'Danger alerts have no close button while the problem is open; they leave when it is fixed.'),
    ex('Floating (shadow-lg)', `<div class="cn-alert" data-tone="neutral" data-variant="outline" data-layout="floating" role="status" style="max-width:640px">${icon('info')}<div class="cn-alert__content"><div class="cn-alert__title">We’ve just released a new feature</div><p class="cn-alert__description">Check out the all new dashboard view. Pages now load faster.</p>${actions()}</div>${dismiss}</div>`, 'Same card with shadow-lg, for alerts rendered over the page (bottom of the viewport, above a table).'),
    ex('Full-width bar', `<div class="cn-alert" data-tone="neutral" data-variant="outline" data-layout="full-width" role="status">${icon('info')}<div class="cn-alert__content"><div class="cn-alert__title">We’ve just released a new feature</div><p class="cn-alert__description">Check out the all new dashboard view. Pages now load faster.</p></div>${actions()}${dismiss}</div>`, 'Edge to edge under the topbar: square corners, bottom hairline only, actions on the right as a direct child of the root.'),
  ],
  rules: [
    'Title says what happened in plain words ("We’ve just released a new feature"); the description says what to do next. Never "Error" or "Warning" as the title.',
    'Keep it to one title plus at most two sentences. If it needs more, link to a page.',
    'At most two actions, size sm, variant link: the quiet one first ("Dismiss", rendered gray), the useful one last ("View changes", brand). Never a primary or danger Button inside an Alert.',
    'Text stays neutral in every tone (title fg-default, description fg-muted). Only the icon, the border and the tint carry the color, so a soft danger alert is still readable.',
    'inline alerts sit at the top of the region they describe (above the form, inside the card); floating alerts are the same card with shadow-lg over the page; full-width bars go directly under the topbar or at the top of a section, never inside a card.',
    'Use soft by default. Use outline (the "default" alert) when several alerts stack, when the alert is inside another tinted surface, or when the message is neutral news.',
    'Only neutral, brand, info and success alerts are dismissible without resolving anything. Danger alerts disappear when the problem is fixed, not when the user closes them.',
    'Icon is required and comes from the tone: neutral/info/brand → ICON.info (or ICON.spark for brand news), success → ICON.check, warning/danger → ICON.warning. Wrap it in the icon span; the rings are drawn by CSS.',
    'Do not animate alerts in or out; they appear with the content.',
  ],
  a11y: [
    'role="alert" for warning/danger alerts inserted after load (assistive tech announces them immediately); role="status" for neutral/brand/info/success.',
    'The featured icon is decorative (aria-hidden on the span); the title carries the meaning, so color is never the only signal.',
    'The close button needs aria-label="Dismiss" and is the last focusable element inside the alert.',
    'Actions are real <button> or <a> elements in reading order after the description.',
  ],
  related: ['banner', 'toast', 'dialog', 'button', 'badge'],
};
