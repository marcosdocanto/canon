import type { ComponentSpec } from '../types.ts';
import { CONTROL, FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, SIZE_PROP, ex, ICON, typeStyle } from './_shared.ts';

// Numeric field with a unit suffix and a pair of square ghost stepper buttons separated by hairlines.
// The native spinner is hidden; the wrapper draws border, shadow and focus ring like Input.

const STEP_WIDTH = { sm: '{space.8}', md: '{space.9}', lg: '{space.10}' } as const;

const stepper = {
  ...RESET_BUTTON,
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  'flex-shrink': '0',
  'align-self': 'stretch',
  width: '{space.9}',
  'font-size': '{size.icon.md}',
  color: '{color.fg-subtle}',
  'border-inline-start': '{border.width.thin} solid {color.border-control}',
  ...TRANSITION_COLORS,
};

const sizeBlock = (s: 'sm' | 'md' | 'lg') => ({
  root: { height: CONTROL[s].height, 'border-radius': CONTROL[s].radius },
  field: { 'padding-inline': CONTROL[s].px, 'font-size': CONTROL[s].font },
  unit: { 'font-size': CONTROL[s].font },
  decrement: { width: STEP_WIDTH[s] },
  increment: { width: STEP_WIDTH[s] },
});

const MINUS = '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 8h10"/></svg>';
const steppers = (label: string, attrs = '') =>
  `<button type="button" class="cn-number-input__decrement" aria-label="Decrease ${label}" tabindex="-1"${attrs}>${MINUS}</button><button type="button" class="cn-number-input__increment" aria-label="Increase ${label}" tabindex="-1"${attrs}>${ICON.plus}</button>`;
const num = (o: { size?: string; variant?: string; label: string; value: string; unit?: string; attrs?: string; root?: string; stepAttrs?: string }) =>
  `<div class="cn-number-input" data-variant="${o.variant ?? 'stepper'}" data-size="${o.size ?? 'md'}"${o.root ?? ''} style="max-width:240px"><input class="cn-number-input__field" type="number" inputmode="decimal" value="${o.value}" aria-label="${o.label}"${o.attrs ?? ''}>${o.unit ? `<span class="cn-number-input__unit">${o.unit}</span>` : ''}${o.variant === 'plain' ? '' : steppers(o.label.toLowerCase(), o.stepAttrs)}</div>`;

export const numberInput: ComponentSpec = {
  name: 'NumberInput',
  slug: 'number-input',
  category: 'forms',
  description: 'A numeric Input with an optional unit suffix and, in the stepper variant, two square ghost buttons (−, +) separated by hairlines at the end. The native spinner is hidden; the wrapper draws the border and focus ring.',
  usage: 'Quantities, seats, weights, percentages and other numbers the user adjusts by small steps. For free numeric text (an invoice total, a phone number) use Input with inputmode; for a currency amount with a selector use InputGroup; for a value on a range use Slider.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The bordered wrapper (inline-flex, stretch): background, hairline, radius, shadow-xs, focus ring on :focus-within. Carries data-variant, data-size, data-invalid, data-disabled.' },
    { part: 'field', element: 'input', description: 'The native <input type="number" inputmode="decimal">. No border, tabular numerals, spinner hidden.' },
    { part: 'unit', element: 'span', description: 'Muted suffix after the value ("kg", "%", "seats"). Not part of the value.', optional: true },
    { part: 'decrement', element: 'button', description: 'Square ghost button with a minus icon, separated by a hairline. tabindex="-1" (keyboard users use the arrow keys). Disable it at min.', optional: true },
    { part: 'increment', element: 'button', description: 'Square ghost button with a plus icon, last child. Disable it at max.', optional: true },
  ],
  props: {
    size: SIZE_PROP(['sm', 'md', 'lg']),
    variant: { values: ['stepper', 'plain'], default: 'stepper', description: 'stepper = value plus the −/+ buttons (quantities, seats, anything adjusted in small steps); plain = value and unit only, no buttons (percentages, weights and other typed numbers where stepping makes no sense).' },
  },
  states: {
    hover: { selector: ':hover:not([data-disabled])', description: 'Border strengthens.', markup: 'native :hover' },
    focus: { selector: ':focus-within', description: 'Border becomes the action color and the ring appears (also when a stepper button is focused).', markup: 'native :focus-within on the wrapper' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Out of range or not a number: danger border, danger ring on focus. Pair with a Field error.', markup: 'aria-invalid="true" on the input, or data-invalid on the wrapper' },
    disabled: { selector: '[data-disabled], &:has(input:disabled)', description: 'Grey fill, disabled text and buttons, not interactive.', markup: 'disabled on the input (and on both buttons)' },
    stepHover: { selector: ' .cn-number-input__decrement:hover:not(:disabled)', description: 'On a stepper button: subtle fill and default ink. Same for __increment. Styled in extraCss.', markup: 'native :hover on a stepper button' },
    stepDisabled: { selector: ' .cn-number-input__decrement:disabled', description: 'On a stepper button at the min (or __increment at the max): disabled ink, no hover. Styled in extraCss.', markup: 'disabled on the button' },
  },
  base: {
    root: {
      display: 'inline-flex',
      'align-items': 'stretch',
      width: '100%',
      'max-width': '100%',
      'min-width': '0',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-control}',
      color: '{color.fg-default}',
      'box-shadow': '{shadow.xs}',
      overflow: 'hidden',
      ...TRANSITION_COLORS,
    },
    field: {
      flex: '1 1 auto',
      width: '100%',
      'min-width': '0',
      height: '100%',
      margin: '0',
      border: '0',
      outline: 'none',
      background: 'transparent',
      ...typeStyle('body-md'),
      'line-height': '{font.lineHeight.none}',
      'font-variant-numeric': 'tabular-nums',
      color: 'inherit',
      '-moz-appearance': 'textfield',
    },
    unit: {
      display: 'flex',
      'align-items': 'center',
      'flex-shrink': '0',
      'padding-inline-end': '{space.3}',
      color: '{color.fg-muted}',
      ...typeStyle('body-md'),
      'line-height': '{font.lineHeight.none}',
      'white-space': 'nowrap',
      'user-select': 'none',
    },
    decrement: stepper,
    increment: stepper,
    '@states': {
      hover: { root: { 'border-color': '{color.border-control-hover}' } },
      focus: { root: { ...FOCUS_RING, 'border-color': '{color.border-action}' } },
      invalid: { root: { 'border-color': '{color.border-danger}' } },
      disabled: {
        root: { 'background-color': '{color.bg-disabled}', color: '{color.fg-disabled}', 'border-color': '{color.border-disabled}', 'box-shadow': 'none', cursor: 'not-allowed' },
        field: { cursor: 'not-allowed' },
        unit: { color: '{color.fg-disabled}' },
        decrement: { color: '{color.fg-disabled}', cursor: 'not-allowed', 'border-color': '{color.border-disabled}' },
        increment: { color: '{color.fg-disabled}', cursor: 'not-allowed', 'border-color': '{color.border-disabled}' },
      },
    },
  },
  variants: {
    size: { sm: sizeBlock('sm'), md: sizeBlock('md'), lg: sizeBlock('lg') },
    variant: {
      stepper: { root: {} },
      plain: { decrement: { display: 'none' }, increment: { display: 'none' } },
    },
  },
  extraCss: `
.cn-number-input .cn-number-input__field::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-number-input .cn-number-input__field::-webkit-outer-spin-button, .cn-number-input .cn-number-input__field::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.cn-number-input:has([aria-invalid="true"]):focus-within, .cn-number-input[data-invalid]:focus-within { box-shadow: {shadow.focus-danger}; border-color: {color.border-danger}; }
.cn-number-input .cn-number-input__decrement:hover:not(:disabled), .cn-number-input .cn-number-input__increment:hover:not(:disabled) { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-number-input .cn-number-input__decrement:active:not(:disabled), .cn-number-input .cn-number-input__increment:active:not(:disabled) { background-color: {color.bg-muted}; }
.cn-number-input .cn-number-input__decrement:focus-visible, .cn-number-input .cn-number-input__increment:focus-visible { outline: none; box-shadow: inset 0 0 0 2px {color.border-action}; }
.cn-number-input .cn-number-input__decrement:disabled, .cn-number-input .cn-number-input__increment:disabled { color: {color.fg-disabled}; cursor: not-allowed; background-color: transparent; }`,
  examples: [
    ex('Stepper (default)', num({ label: 'Seats', value: '12', attrs: ' min="1" max="200" step="1"' }), 'Value on the left, −/+ at the end. Arrow keys step the value from the keyboard.'),
    ex('With unit', num({ label: 'Pallet weight', value: '480', unit: 'kg', attrs: ' min="0" step="10"' }), 'The unit is a muted suffix, not part of the value.'),
    ex('Plain (no stepper)', num({ variant: 'plain', label: 'Discount', value: '15', unit: '%', attrs: ' min="0" max="100"' }), 'For typed numbers where stepping makes no sense.'),
    ex('Sizes', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-3);max-width:240px">${num({ size: 'sm', label: 'Quantity', value: '3' })}${num({ size: 'md', label: 'Quantity', value: '3' })}${num({ size: 'lg', label: 'Quantity', value: '3' })}</div>`, 'Stepper buttons are 32 / 36 / 40px wide and always stretch to the field height.'),
    ex('At the minimum', num({ label: 'Seats', value: '1', attrs: ' min="1"', stepAttrs: '' }).replace('aria-label="Decrease seats" tabindex="-1"', 'aria-label="Decrease seats" tabindex="-1" disabled'), 'The decrement button is disabled at min; the increment at max.'),
    ex('Invalid', num({ label: 'Seats', value: '0', attrs: ' min="1" aria-invalid="true"' }), 'Pair with a Field error such as "Enter at least 1 seat".'),
    ex('Disabled', num({ label: 'Seats', value: '40', unit: 'seats', attrs: ' disabled', stepAttrs: ' disabled' })),
  ],
  rules: [
    'Use type="number" with inputmode="decimal" and real min / max / step attributes; the stepper buttons call stepDown() / stepUp() on the input, never their own arithmetic.',
    'Disable the decrement at min and the increment at max instead of clamping silently.',
    'The unit is a suffix after the value ("kg", "%", "seats"); a currency with a selector is an InputGroup, not a NumberInput.',
    'stepper for small-step adjustments (quantities, seats, days); plain for typed values (percentages, weights, prices). Do not add steppers to a value nobody increments by one.',
    'Numbers are right-aligned only in tables; inside forms they stay left-aligned like every other field.',
    'Width comes from the layout; cap it with max-width on the Field (120–240px) since numbers are short.',
    'Sizes: md in forms; sm in tables and toolbars; lg on marketing screens.',
    'Invalid must be accompanied by a Field error that states the allowed range ("Between 1 and 200").',
  ],
  a11y: [
    'The input has an accessible name (label for / aria-label); the stepper buttons say "Increase {name}" / "Decrease {name}".',
    'Stepper buttons use tabindex="-1": keyboard users step with Arrow Up/Down (native) and never need to tab through the buttons.',
    'Keep the native input so aria-valuemin / max come for free; when invalid set aria-invalid="true" and aria-describedby to the error id.',
    'Focus is shown on the wrapper (:focus-within); a clicked stepper shows an inset ring so it stays visible inside the clipped wrapper.',
  ],
  related: ['input', 'input-group', 'field', 'slider'],
};
