import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// Credit card: a decorative 316px card at the standard 1.586 ratio with a logo,
// a chip, a masked number, holder name, expiry and a generic network mark. It
// represents a saved payment method; it never shows a full card number.

const CHIP = '<svg class="cn-credit-card__chip" viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="1" width="30" height="22" rx="4" style="fill:currentColor;fill-opacity:.18"/><path d="M1 9h9a3 3 0 013 3v0a3 3 0 01-3 3H1M31 9h-9a3 3 0 00-3 3v0a3 3 0 003 3h9M13 1v8M19 1v8M13 15v8M19 15v8"/></svg>';
const MARK = '<svg class="cn-credit-card__brand" viewBox="0 0 40 24" aria-hidden="true"><circle cx="14" cy="12" r="11" style="fill:currentColor;fill-opacity:.55"/><circle cx="26" cy="12" r="11" style="fill:currentColor;fill-opacity:.35"/></svg>';
const LOGO = '<span class="cn-credit-card__logo"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.5l2.4 6.1 6.1 2.4-6.1 2.4L10 18.5l-2.4-6.1L1.5 10l6.1-2.4z"/></svg>Lumen</span>';

const card = (variant: string, size: string, o: { last4: string; name: string; expiry: string }) =>
  `<div class="cn-credit-card" data-variant="${variant}" data-size="${size}" role="img" aria-label="Lumen card ending in ${o.last4}, ${o.name}, expires ${o.expiry}"><div class="cn-credit-card__header">${LOGO}${CHIP}</div><div class="cn-credit-card__number">•••• •••• •••• ${o.last4}</div><div class="cn-credit-card__footer"><div class="cn-credit-card__holder"><span><span class="cn-credit-card__caption">Card holder</span><span class="cn-credit-card__name">${o.name}</span></span><span><span class="cn-credit-card__caption">Expires</span><span class="cn-credit-card__expiry">${o.expiry}</span></span></div>${MARK}</div></div>`;

const row = (...items: string[]) => `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-4);align-items:flex-start">${items.join('')}</div>`;

export const creditCard: ComponentSpec = {
  name: 'CreditCard',
  slug: 'credit-card',
  category: 'media',
  description: 'A decorative payment card at the real 1.586 ratio: logo and chip on top, a masked number in the middle, holder and expiry at the bottom next to a generic network mark. Four finishes (brand, dark, light, outline) and two sizes.',
  usage: 'Use in billing settings, checkout summaries and the payment-method picker to show which saved card is in use. It is an illustration of a record, not a form: editing happens in a Dialog with real Inputs. Never render a full card number.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The card: 316px wide (256 in sm), aspect-ratio 1.586, radius 2xl, 24px padding, flex column with the number centered vertically. role="img" with an aria-label that names the card.' },
    { part: 'header', element: 'div', description: 'Top row: logo on the left, chip on the right.' },
    { part: 'logo', element: 'span', description: 'Issuer or product wordmark, label-md semibold with a 20px mark.' },
    { part: 'chip', element: 'svg', description: 'The 32px contact chip drawn in currentColor at reduced opacity.' },
    { part: 'number', element: 'div', description: 'The masked number "•••• •••• •••• 4242" in numeric-md, tabular figures and wider tracking.' },
    { part: 'footer', element: 'div', description: 'Bottom row: holder block on the left, network mark on the right.' },
    { part: 'holder', element: 'div', description: 'Name and expiry side by side, each under a tiny caption.' },
    { part: 'caption', element: 'span', description: 'Kicker-voice caption above name and expiry ("Card holder", "Expires").' },
    { part: 'name', element: 'span', description: 'Cardholder name in label-sm, wide tracking, truncated.' },
    { part: 'expiry', element: 'span', description: 'MM/YY in numeric-md.' },
    { part: 'brand', element: 'svg', description: 'A generic 40px network mark (two overlapping circles in currentColor). Replace with the real network logo when known.' },
  ],
  props: {
    variant: {
      values: ['brand', 'dark', 'light', 'outline'],
      default: 'brand',
      description: 'brand = action-colored card with on-action text, the default card of the product. dark = inverse surface (ink in light theme, near-white in dark theme). light = surface with a hairline and shadow-xs, for lists of several cards. outline = transparent with a strong hairline, the "add a card" or placeholder look.',
    },
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 316px wide, 24px padding, 16px number (settings pages, checkout). sm = 256px, 16px padding, 13px number for pickers, drawers and mobile.',
    },
  },
  states: {
    selected: { selector: '[aria-selected="true"], &[data-selected]', description: 'The chosen card in a picker: a 2px action-colored ring outside the card.', markup: 'aria-selected="true" (inside a listbox) or data-selected on the root' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': 'space-between',
      width: '316px',
      'max-width': '100%',
      'aspect-ratio': '1.586',
      padding: '{space.6}',
      'border-radius': '{radius.2xl}',
      overflow: 'hidden',
      isolation: 'isolate',
      'background-color': '{color.bg-action}',
      color: '{color.fg-on-action}',
      'user-select': 'none',
      'flex-shrink': '0',
    },
    header: { display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '{space.4}' },
    logo: { display: 'inline-flex', 'align-items': 'center', gap: '{space.2}', ...typeStyle('label-md'), 'font-weight': '{font.weight.semibold}', 'letter-spacing': '{font.letterSpacing.tight}' },
    chip: { display: 'block', width: '{size.icon.2xl}', height: 'auto', 'flex-shrink': '0' },
    number: { ...typeStyle('numeric-md'), 'font-size': '{font.size.lg}', 'letter-spacing': '{font.letterSpacing.wider}', 'font-variant-numeric': 'tabular-nums', 'white-space': 'nowrap' },
    footer: { display: 'flex', 'align-items': 'flex-end', 'justify-content': 'space-between', gap: '{space.4}', 'min-width': '0' },
    holder: { display: 'flex', 'align-items': 'flex-end', gap: '{space.6}', 'min-width': '0' },
    caption: { display: 'block', ...typeStyle('kicker'), opacity: '{opacity.muted}', 'margin-bottom': '{space.1.5}' },
    name: { display: 'block', ...typeStyle('label-sm'), 'letter-spacing': '{font.letterSpacing.wide}', 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis', 'max-width': '160px' },
    expiry: { display: 'block', ...typeStyle('numeric-md'), 'font-variant-numeric': 'tabular-nums' },
    brand: { display: 'block', width: '{space.10}', height: 'auto', 'flex-shrink': '0' },
    '@states': {
      selected: { root: { 'box-shadow': '0 0 0 {border.width.medium} {color.border-action}' } },
    },
  },
  variants: {
    variant: {
      brand: { root: { 'background-color': '{color.bg-action}', color: '{color.fg-on-action}' } },
      dark: { root: { 'background-color': '{color.bg-inverse}', color: '{color.fg-inverse}' } },
      light: { root: { 'background-color': '{color.bg-surface}', color: '{color.fg-default}', border: '{border.width.thin} solid {color.border-default}', 'box-shadow': '{shadow.xs}' } },
      outline: { root: { 'background-color': 'transparent', color: '{color.fg-default}', border: '{border.width.thin} solid {color.border-strong}' } },
    },
    size: {
      md: { root: { width: '316px', padding: '{space.6}' } },
      sm: {
        root: { width: '256px', padding: '{space.4}', 'border-radius': '{radius.xl}' },
        number: { 'font-size': '{font.size.sm}', 'letter-spacing': '{font.letterSpacing.wide}' },
        chip: { width: '{size.icon.xl}' },
        brand: { width: '{space.8}' },
        header: { gap: '{space.3}' },
        holder: { gap: '{space.4}' },
        caption: { 'margin-bottom': '{space.1}' },
      },
    },
  },
  extraCss: `
.cn-credit-card::before { content: ''; position: absolute; width: 240px; height: 240px; border-radius: {radius.full}; inset-inline-end: -88px; top: -128px; background-color: color-mix(in srgb, currentColor 8%, transparent); pointer-events: none; z-index: -1; }
.cn-credit-card[data-variant="outline"]::before { display: none; }
.cn-credit-card__logo > svg { width: {size.icon.lg}; height: {size.icon.lg}; flex-shrink: 0; }
.cn-credit-card[data-size="sm"] .cn-credit-card__logo { font-size: {font.size.sm}; }
.cn-credit-card[data-size="sm"] .cn-credit-card__logo > svg { width: {size.icon.md}; height: {size.icon.md}; }`,
  examples: [
    ex('Brand (default)', card('brand', 'md', { last4: '4242', name: 'Maya Chen', expiry: '09/29' }), 'The product card: action fill, on-action text, a quiet circle in the corner.'),
    ex('Dark', card('dark', 'md', { last4: '8210', name: 'Daniel Costa', expiry: '03/28' }), 'Inverse surface; flips to near-white in the dark theme.'),
    ex('Light', card('light', 'md', { last4: '1187', name: 'Sofia Almeida', expiry: '11/27' }), 'Surface with a hairline, for lists of several saved cards.'),
    ex('Outline', card('outline', 'md', { last4: '0093', name: 'Aisha Khan', expiry: '06/30' }), 'Transparent placeholder look for "add a card" states and disabled methods.'),
    ex('Small, selected in a picker', row(card('brand', 'sm', { last4: '4242', name: 'Maya Chen', expiry: '09/29' }).replace('role="img"', 'role="img" data-selected'), card('light', 'sm', { last4: '1187', name: 'Maya Chen', expiry: '11/27' })), '256px cards for pickers and mobile; data-selected adds the action-colored ring.'),
  ],
  rules: [
    'Decorative: the card is a picture of a saved payment method, never a form. Editing and adding cards happen in a Dialog with Inputs.',
    'Always mask the number as "•••• •••• •••• 4242": the last four digits only, never more, never the CVC, never an expiry that is not needed on screen.',
    'One brand card per screen; other saved cards use light or outline so the default method stands out.',
    'Keep the 1.586 ratio and the 316/256 widths; never stretch the card to a column. Center it or align it with the form above.',
    'The network mark is generic until the network is known; then use the real mark at 40px, never a colored badge.',
    'Names are shown as stored, truncated with an ellipsis after 160px; expiry is MM/YY.',
    'No gradients, foils or photos; the only decoration is the 8% circle in the corner.',
    'The card never opens anything on click by itself. In a picker, wrap it in a listbox option and use data-selected for the ring.',
  ],
  a11y: [
    'The root has role="img" and an aria-label that says it all: "Lumen card ending in 4242, Maya Chen, expires 09/29". The inner text is then decorative.',
    'When the card is an option in a picker, the option element carries the name and aria-selected; the card inside stays role="img".',
    'Contrast: on-action text on the action fill and fg-inverse on bg-inverse are AA by token design; the light and outline variants use fg-default.',
    'Do not expose the number as a table of digits; screen readers read the masked string with the last four digits.',
  ],
  related: ['card', 'description-list', 'dialog', 'input', 'badge'],
};
