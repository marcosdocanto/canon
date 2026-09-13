import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, TRANSITION_COLORS, RESET_BUTTON, STATE, ex, ICON } from './_shared.ts';

export const closeButton: ComponentSpec = {
  name: 'CloseButton',
  slug: 'close-button',
  category: 'actions',
  description: 'The × that dismisses dialogs, drawers, alerts, toasts and chips. A square utility button with a grey icon and a subtle hover fill.',
  usage: 'Use only to dismiss the surface it sits in (top-right of dialogs/drawers/toasts, end of alerts/banners). It is never a "cancel" action in a footer; use a ghost Button there.',
  anatomy: [
    { part: 'root', element: 'button', description: 'Square hit area. Requires aria-label="Close".' },
    { part: 'icon', element: 'svg', description: 'The × icon, 20px (sm) or 24px (md/lg).' },
  ],
  props: {
    size: { values: ['xs', 'sm', 'md', 'lg'], default: 'sm', description: 'xs 24px (chips, badges) · sm 36px (alerts, toasts, cards) · md 44px (dialogs, drawers) · lg 48px.' },
    theme: { values: ['light', 'dark'], default: 'light', description: 'light = grey icon on light surfaces; dark = translucent white icon for dark or brand surfaces.' },
  },
  states: { hover: STATE.hover(), active: STATE.active(), focus: STATE.focus(), disabled: STATE.disabled() },
  base: {
    root: { ...RESET_BUTTON, display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'flex-shrink': '0', 'border-radius': '{radius.lg}', color: '{color.fg-subtle}', ...TRANSITION_COLORS },
    icon: { display: 'block', 'stroke-width': '2' },
    '@states': {
      focus: { root: FOCUS_RING },
      disabled: { root: { opacity: '{opacity.disabled}', cursor: 'not-allowed' } },
    },
  },
  variants: {
    size: {
      xs: { root: { width: '24px', height: '24px', 'border-radius': '{radius.sm}' }, icon: { width: '{size.icon.xs}', height: '{size.icon.xs}' } },
      sm: { root: { width: '{size.control.sm}', height: '{size.control.sm}' }, icon: { width: '{size.icon.md}', height: '{size.icon.md}' } },
      md: { root: { width: '{size.control.lg}', height: '{size.control.lg}' }, icon: { width: '{size.icon.lg}', height: '{size.icon.lg}' } },
      lg: { root: { width: '{size.control.xl}', height: '{size.control.xl}' }, icon: { width: '{size.icon.lg}', height: '{size.icon.lg}' } },
    },
    theme: {
      light: { root: {}, '@states': { hover: { root: { 'background-color': '{color.bg-subtle}', color: '{color.fg-muted}' } }, active: { root: { 'background-color': '{color.bg-muted}' } } } },
      dark: { root: { color: 'rgba(255, 255, 255, 0.7)' }, '@states': { hover: { root: { 'background-color': 'rgba(255, 255, 255, 0.1)', color: '{white}' } }, active: { root: { 'background-color': 'rgba(255, 255, 255, 0.16)' } } } },
    },
  },
  examples: [
    ex('Sizes', `<button type="button" class="cn-close-button" data-size="xs" data-theme="light" aria-label="Close">${ICON.x.replace('cn-icon', 'cn-close-button__icon')}</button> <button type="button" class="cn-close-button" data-size="sm" data-theme="light" aria-label="Close">${ICON.x.replace('cn-icon', 'cn-close-button__icon')}</button> <button type="button" class="cn-close-button" data-size="md" data-theme="light" aria-label="Close">${ICON.x.replace('cn-icon', 'cn-close-button__icon')}</button> <button type="button" class="cn-close-button" data-size="lg" data-theme="light" aria-label="Close">${ICON.x.replace('cn-icon', 'cn-close-button__icon')}</button>`),
    ex('Dark theme on an inverse surface', `<div style="background:var(--cn-color-bg-inverse);padding:var(--cn-space-3);border-radius:var(--cn-radius-lg)"><button type="button" class="cn-close-button" data-size="sm" data-theme="dark" aria-label="Close">${ICON.x.replace('cn-icon', 'cn-close-button__icon')}</button></div>`),
  ],
  rules: [
    'Always aria-label="Close" (or "Dismiss notification"), never a visible label.',
    'Position: top-right, aligned with the title baseline, with the same inset as the surface padding minus 8px so the icon aligns with the content edge.',
    'sm inside cards, alerts, toasts and chips; md/lg only in dialogs and drawers.',
    'Escape must trigger the same close action wherever a close button exists.',
  ],
  a11y: ['It is a real <button type="button"> with an accessible name.', 'Focus returns to the trigger that opened the surface after closing.'],
  related: ['dialog', 'drawer', 'toast', 'alert', 'icon-button'],
};
