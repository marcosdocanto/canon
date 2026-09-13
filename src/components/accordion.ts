import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, ex, ICON, typeStyle } from './_shared.ts';

// the reference FAQ accordion: full-width trigger rows (16 / 18px semibold ink) with a 20 / 24px
// gray-400 chevron or plus on the right, gray-200 hairlines, 16px gray-600 body text, 16 / 24px of
// vertical padding; optionally each item its own card.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const PLUS = '<svg class="cn-accordion__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path class="cn-accordion__icon-v" d="M8 3v10"/><path d="M3 8h10"/></svg>';

const item = (id: string, state: 'open' | 'closed', title: string, body: string, extra = '', icon = ICON.chevronDown.replace('cn-icon', 'cn-accordion__icon')) =>
  `<div class="cn-accordion__item" data-state="${state}"><h3 style="margin:0;font:inherit"><button type="button" class="cn-accordion__trigger" id="${id}-trigger" aria-expanded="${state === 'open'}" aria-controls="${id}-content"${extra}>${title}${icon}</button></h3><div class="cn-accordion__content" id="${id}-content" role="region" aria-labelledby="${id}-trigger">${body}</div></div>`;

const FAQ = (prefix: string, icon?: string) => [
  item(`${prefix}-1`, 'open', 'Is there a free trial available?', 'Yes, you can try Lumen for free for 30 days. If you want, we\'ll provide you with a free, personalized 30-minute onboarding call to get you up and running as soon as possible.', '', icon),
  item(`${prefix}-2`, 'closed', 'Can I change my plan later?', 'Of course. Our pricing scales with your company. Chat to our friendly team to find a solution that works for you.', '', icon),
  item(`${prefix}-3`, 'closed', 'What is your cancellation policy?', 'We understand that things change. You can cancel your plan at any time and we\'ll refund you the difference already paid.', '', icon),
].join('');

export const accordion: ComponentSpec = {
  name: 'Accordion',
  slug: 'accordion',
  category: 'data-display',
  description: 'Stacked disclosure sections in the reference FAQ style: a full-width semibold trigger row with a chevron (or plus) that flips on the right, and muted body text that shows under it when open. Gray-200 hairlines between items; optional separated or card framing.',
  usage: 'Secondary content people open on demand: FAQ, advanced settings, details of a step, long explanations under a summary. Not for primary navigation (Tabs) and not for hiding required form fields.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Column of items.' },
    { part: 'item', element: 'div', description: 'One section. Carries data-state="open|closed", which drives the icon and hides the content. Hairline below.' },
    { part: 'trigger', element: 'button', description: 'Full-width <button aria-expanded aria-controls> inside a heading element. Semibold ink label left, icon right; padding 16 / 24px by size.' },
    { part: 'icon', element: 'svg', description: '20 / 24px chevron-down (rotates 180° when open) or plus (its vertical bar hides when open) at the end of the trigger, fg-subtle.' },
    { part: 'icon-v', element: 'path', description: 'The vertical bar of the plus icon; hidden when the item is open so the plus becomes a minus.', optional: true },
    { part: 'content', element: 'div', description: 'The revealed panel: role="region", fg-muted body text, prose width, padding below. Hidden when the item is closed.' },
  ],
  props: {
    variant: {
      values: ['default', 'separated', 'card'],
      default: 'default',
      description: 'default = items divided by hairlines, no frame (inside a Card or a page section); separated = each item is its own card (radius 12, ring) with a 16px gap (settings groups, FAQ on the canvas); card = the whole list in one card frame with items divided.',
    },
    size: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'sm = 14px semibold triggers with 12px padding and 14px body (dense settings); md = 16px semibold triggers, 16px padding, 16px body (the default in cards and drawers); lg = 18px semibold triggers, 24px padding, 16px body with a 24px icon (the reference FAQ section).',
    },
  },
  states: {
    open: { selector: ' > [data-state="open"]', description: 'On an item, not the root: the chevron is rotated (or the plus becomes a minus) and the content is visible.', markup: 'data-state="open" on the item and aria-expanded="true" on its trigger' },
    closed: { selector: ' > [data-state="closed"]', description: 'On an item: the content is display none.', markup: 'data-state="closed" on the item and aria-expanded="false" on its trigger' },
    hover: { selector: ' > * > * > button:hover', description: 'On the trigger: the icon darkens; no background change.', markup: 'native :hover on the trigger' },
    focus: { selector: ' > * > * > button:focus-visible', description: 'On the trigger: the 4px brand ring.', markup: 'native :focus-visible on the trigger' },
    disabled: { selector: ' > * > * > button:disabled', description: 'On the trigger: 50% opacity, cannot open.', markup: 'disabled on the trigger button' },
  },
  base: {
    root: { display: 'flex', 'flex-direction': 'column', width: '100%', 'min-width': '0', color: '{color.fg-default}' },
    item: { 'border-bottom': HAIRLINE, 'min-width': '0' },
    trigger: {
      ...RESET_BUTTON,
      display: 'flex',
      'align-items': 'flex-start',
      'justify-content': 'space-between',
      gap: '{space.4}',
      width: '100%',
      padding: '{space.4} 0',
      ...typeStyle('heading-xs'),
      'text-align': 'left',
      color: '{color.fg-default}',
      'border-radius': '{radius.sm}',
      'transition-property': 'color, box-shadow',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    icon: {
      width: '{size.icon.md}',
      height: '{size.icon.md}',
      'flex-shrink': '0',
      'margin-top': '{space.0.5}',
      color: '{color.fg-subtle}',
      'transition-property': 'transform, color',
      'transition-duration': '{motion.duration.normal}',
      'transition-timing-function': '{motion.easing.standard}',
    },
    'icon-v': { 'transition-property': 'opacity', 'transition-duration': '{motion.duration.fast}', 'transition-timing-function': '{motion.easing.linear}' },
    content: {
      padding: '0 {space.10} {space.4} 0',
      ...typeStyle('body-lg'),
      color: '{color.fg-muted}',
      'max-width': '{size.container.prose}',
    },
  },
  variants: {
    variant: {
      default: { root: {} },
      separated: {
        root: { gap: '{space.4}' },
        item: { 'border-bottom': '0', 'box-shadow': ring('{color.border-default}'), 'border-radius': '{radius.card}', 'background-color': '{color.bg-surface}', 'padding-inline': '{space.6}' },
      },
      card: {
        root: { 'box-shadow': `${ring('{color.border-default}')}, {shadow.xs}`, 'border-radius': '{radius.card}', 'background-color': '{color.bg-surface}', overflow: 'hidden' },
        item: { 'padding-inline': '{space.6}' },
      },
    },
    size: {
      sm: { trigger: { padding: '{space.3} 0', ...typeStyle('label-md') }, icon: { width: '{size.icon.sm}', height: '{size.icon.sm}', 'margin-top': '{space.0.5}' }, content: { padding: '0 {space.8} {space.3} 0', ...typeStyle('body-md') } },
      md: { root: {} },
      lg: { trigger: { padding: '{space.6} 0', ...typeStyle('heading-sm') }, icon: { width: '{size.icon.lg}', height: '{size.icon.lg}' }, content: { padding: '0 {space.12} {space.6} 0' } },
    },
  },
  extraCss: `
.cn-accordion__item[data-state="open"] > * > .cn-accordion__trigger .cn-accordion__icon { transform: rotate(180deg); }
.cn-accordion__item[data-state="open"] > * > .cn-accordion__trigger .cn-accordion__icon:has(.cn-accordion__icon-v) { transform: none; }
.cn-accordion__item[data-state="open"] > * > .cn-accordion__trigger .cn-accordion__icon-v { opacity: 0; }
.cn-accordion__item[data-state="closed"] > .cn-accordion__content { display: none; }
.cn-accordion__trigger:hover .cn-accordion__icon { color: {color.fg-muted}; }
.cn-accordion__trigger:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-accordion__trigger:disabled { opacity: {opacity.disabled}; cursor: not-allowed; }
.cn-accordion[data-variant="default"] > .cn-accordion__item:last-child, .cn-accordion[data-variant="card"] > .cn-accordion__item:last-child { border-bottom: 0; }
.cn-accordion[data-variant="default"] > .cn-accordion__item:first-child > * > .cn-accordion__trigger { padding-top: 0; }`,
  examples: [
    ex('Default (md), first item open', `<div class="cn-accordion" data-variant="default" data-size="md" style="max-width:640px">${FAQ('faq-a')}</div>`, '16px semibold triggers on gray-200 hairlines, 20px chevron, 16px muted body.'),
    ex('FAQ (lg) with plus / minus icons', `<div class="cn-accordion" data-variant="default" data-size="lg" style="max-width:768px">${FAQ('faq-b', PLUS)}</div>`, 'The reference FAQ section: 18px semibold, 24px padding, a 24px plus that becomes a minus when open.'),
    ex('Separated', `<div class="cn-accordion" data-variant="separated" data-size="md" style="max-width:640px">${FAQ('faq-c')}</div>`, 'Each item is its own card (radius 12, gray-200 ring), 16px apart; use on the canvas.'),
    ex('Card, small, with a disabled item', `<div class="cn-accordion" data-variant="card" data-size="sm" style="max-width:560px">${item('faq-d-1', 'open', 'Approval rules', 'Every outgoing message needs one approval. Replies to an approved thread can be auto-approved per conversation.')}${item('faq-d-2', 'closed', 'Sending window', 'Messages go out between 08:00 and 18:00 in the recipient\'s time zone.')}${item('faq-d-3', 'closed', 'Custom signatures (Business plan)', 'Upgrade to edit signatures per sender.', ' disabled')}</div>`, 'One card frame with 14px triggers; the disabled trigger stays readable.'),
  ],
  rules: [
    'Every item carries data-state="open|closed" and its trigger aria-expanded; never leave the state implicit.',
    'Trigger labels are short noun phrases or questions in sentence case (≤ 10 words); no icons before the label, only the chevron or plus after it. One icon style per accordion.',
    'Content is prose or a small form, capped at prose width with a 40px right inset so it never runs under the icon; it is not a place for tables or lists of records.',
    'Default to all items closed except when there is one obvious first item; open at most one item by default.',
    'Allow several items open at once unless the content is mutually exclusive; do not force single-open behavior for FAQs.',
    'No hover background on the trigger; only the icon darkens. Focus ring on keyboard focus only.',
    'default inside cards and sections; separated on the canvas for long lists; card for a compact block of 2–4 items; lg only for FAQ sections on marketing and help pages.',
    'Do not nest accordions.',
  ],
  a11y: [
    'The trigger is a <button> inside a heading (h2–h4 at the right level) with aria-expanded and aria-controls pointing to the content id.',
    'The content has role="region" and aria-labelledby pointing to the trigger id.',
    'Keyboard: Enter/Space toggle; Tab moves between triggers. Arrow-key navigation is optional and must not trap focus.',
    'Closed content is display none, so it is removed from the tab order and the accessibility tree; do not use visibility tricks that keep it focusable.',
    'Disabled triggers stay visible and readable; if the reason matters, say it in the label ("(Business plan)").',
  ],
  related: ['tabs', 'card', 'list', 'description-list', 'divider'],
};
