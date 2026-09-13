import type { ComponentSpec } from '../types.ts';
import { CONTROL, SIZE_PROP, ex, typeStyle } from './_shared.ts';

// the reference textarea: padding 12px (sm) / 12×14px (md, lg), 14px/20px text (16px/24px on lg;
// the reference uses 16px on md too — we keep 14px as the default UI size), 1px inset gray-300
// ring under shadow-xs, radius 8, focus = brand ring, invalid = red-300 ring, disabled = 50%.
// Height comes from rows (rows="3" by default in our forms; the browser default is 2).

const TRANSITION_FAST = {
  'transition-property': 'box-shadow, background-color, color, opacity',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const RING_REST = `${ring('{color.border-control}')}, {shadow.xs}`;
const RING_HOVER = `${ring('{color.border-control-hover}')}, {shadow.xs}`;
const RING_FOCUS = `${ring('{color.border-action}')}, {shadow.xs}, {shadow.focus}`;
const RING_INVALID = `${ring('{color.border-danger}')}, {shadow.xs}`;
const RING_INVALID_FOCUS = `${ring('{color.border-danger}')}, {shadow.xs}, {shadow.focus-danger}`;

const SIZE = {
  sm: { px: '{space.3}', py: '{space.3}', lh: '{type.body-md.lineHeight}' },
  md: { px: '{space.3.5}', py: '{space.3}', lh: '{type.body-md.lineHeight}' },
  lg: { px: '{space.3.5}', py: '{space.3}', lh: '{type.body-lg.lineHeight}' },
} as const;

const sizeBlock = (s: 'sm' | 'md' | 'lg') => ({
  field: { 'padding-inline': SIZE[s].px, 'padding-block': SIZE[s].py, 'font-size': CONTROL[s].font, 'line-height': SIZE[s].lh },
});

const ta = (attrs: string, body = '', size = 'md', resize = 'vertical', style = 'max-width:480px') =>
  `<div class="cn-textarea" data-size="${size}" data-resize="${resize}" style="${style}"><textarea class="cn-textarea__field" rows="3" ${attrs}>${body}</textarea></div>`;

export const textarea: ComponentSpec = {
  name: 'Textarea',
  slug: 'textarea',
  category: 'forms',
  description: 'Multi-line text field with the same ring, radius 8, shadow-xs and focus ring as Input. Padding 12px (sm) or 12×14px (md, lg); the height comes from rows. The wrapper carries the ring; the native textarea is bare.',
  usage: 'Free-form text longer than one line: notes, messages, descriptions, addresses. For one line use Input; for rich formatting use an editor component. Pair with Field for label, hint and a character count.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Wrapper that draws the ring, background, radius, shadow-xs and the focus ring (:focus-within).' },
    { part: 'field', element: 'textarea', description: 'The native <textarea>. No border, no outline, fills the wrapper. Set rows to size it (3 in forms); the wrapper grows with it and with a vertical resize.' },
  ],
  props: {
    size: SIZE_PROP(['sm', 'md', 'lg']),
    resize: { values: ['none', 'vertical'], default: 'vertical', description: 'vertical = the user can drag the corner to make it taller (default for notes and messages); none = fixed height, for inputs with a strict length or inside dense layouts.' },
  },
  states: {
    hover: { selector: ':hover:not([data-disabled])', description: 'Pointer over the field. The reference has no hover change; presets with a distinct border-control-hover strengthen the ring.', markup: 'native' },
    focus: { selector: ':focus-within', description: 'The inset ring turns to the brand color and the 4px brand focus ring appears around the wrapper.', markup: 'native :focus-within on the wrapper' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Red-300 ring; on focus the focus ring turns red. Always accompanied by a Field error.', markup: 'aria-invalid="true" on the textarea, or data-invalid on the wrapper' },
    disabled: { selector: '[data-disabled], &:has(:disabled)', description: 'Whole control at 50% opacity, cursor not-allowed, no resize handle.', markup: 'disabled on the textarea' },
  },
  base: {
    root: {
      display: 'flex',
      width: '100%',
      'min-width': '0',
      'background-color': '{color.bg-surface}',
      'border-radius': '{radius.control}',
      'box-shadow': RING_REST,
      color: '{color.fg-default}',
      ...TRANSITION_FAST,
    },
    field: {
      display: 'block',
      flex: '1 1 auto',
      width: '100%',
      'min-width': '0',
      margin: '0',
      border: '0',
      outline: 'none',
      background: 'transparent',
      'box-shadow': 'none',
      'border-radius': '{radius.control}',
      ...typeStyle('body-md'),
      color: 'inherit',
      resize: 'vertical',
      'scroll-padding-block': '{space.3}',
    },
    '@states': {
      hover: { root: { 'box-shadow': RING_HOVER } },
      focus: { root: { 'box-shadow': RING_FOCUS } },
      invalid: { root: { 'box-shadow': RING_INVALID } },
      disabled: { root: { opacity: '{opacity.disabled}', cursor: 'not-allowed' }, field: { cursor: 'not-allowed', resize: 'none' } },
    },
  },
  variants: {
    size: { sm: sizeBlock('sm'), md: sizeBlock('md'), lg: sizeBlock('lg') },
    resize: {
      none: { field: { resize: 'none' } },
      vertical: { field: { resize: 'vertical' } },
    },
  },
  extraCss: `
.cn-textarea .cn-textarea__field::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-textarea .cn-textarea__field:-webkit-autofill { border-radius: {radius.control}; -webkit-text-fill-color: {color.fg-default}; }
.cn-textarea:has([aria-invalid="true"]):focus-within, .cn-textarea[data-invalid]:focus-within { box-shadow: ${RING_INVALID_FOCUS}; }`,
  examples: [
    ex('Default', ta('placeholder="Describe the change for the release notes…" aria-label="Description"'), 'Three rows, 12×14px padding, gray-300 ring and shadow-xs, radius 8.'),
    ex('With content', ta('aria-label="Notes"', 'Daniel Costa asked for the onboarding checklist to be split by role. Maya Chen will draft the designer track before the Friday review.'), 'The wrapper grows with rows; drag the corner to make it taller.'),
    ex('Sizes', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-4)">${ta('placeholder="Small · 12px padding, 14px text" aria-label="Small"', '', 'sm', 'vertical', 'max-width:480px')}${ta('placeholder="Medium · 12×14px padding, 14px text" aria-label="Medium"', '', 'md')}${ta('placeholder="Large · 12×14px padding, 16px text" aria-label="Large"', '', 'lg')}</div>`, 'sm 12px all round; md and lg 12px vertical, 14px horizontal. Text is 16px on lg.'),
    ex('Fixed height', ta('placeholder="Internal note (not visible to the client)" aria-label="Internal note"', '', 'sm', 'none', 'max-width:360px'), 'resize="none" hides the handle for strict layouts.'),
    ex('Invalid', ta('aria-invalid="true" aria-label="Description" aria-describedby="ta-err"', 'ok'), 'Red-300 ring. Pair with a Field error such as "Write at least 40 characters".'),
    ex('Disabled', ta('disabled aria-label="Terms"', 'Standard terms apply to this workspace and cannot be edited after the plan is signed.'), 'Same fill and ring at 50% opacity; no resize handle.'),
  ],
  recipes: [
    ex('With character count', `<div class="cn-field" data-layout="vertical" data-size="md" style="max-width:480px"><label class="cn-field__label" for="ta-bio">Public description</label><div class="cn-field__control"><div class="cn-textarea" data-size="md" data-resize="vertical"><textarea class="cn-textarea__field" id="ta-bio" rows="3" maxlength="240" aria-describedby="ta-bio-helper">Lumen helps product teams turn research into decisions: interviews, notes and evidence in one workspace.</textarea></div></div><p class="cn-field__helper" id="ta-bio-helper" style="display:flex;justify-content:space-between;gap:var(--cn-space-3)"><span>Shown on your public profile.</span><span class="cn-tabular">109 / 240</span></p></div>`, 'The count lives in the Field hint, right-aligned, tabular numerals. Turn it to fg-danger only when the limit is exceeded.'),
  ],
  rules: [
    'Start at 3 rows (rows="3"); use 4–6 only for the primary text of a screen (a message composer). Never taller than the viewport.',
    'Vertical resize only. Horizontal resize breaks the layout; disable resize entirely (resize="none") when the height is a design constraint.',
    'Always inside a Field with a visible label. Use the hint for the limit and the tone expected ("Visible to the client").',
    'Width comes from the layout (100% of the Field). Set max-width on the Field, never a fixed width on the wrapper.',
    'Show a character count only when there is a hard limit, as "109 / 240" in the hint. Do not block typing at the limit; mark the field invalid.',
    'Sizes match the Inputs around it: md in forms, sm in side panels and comment threads, lg on marketing and auth screens.',
  ],
  a11y: [
    'Every textarea has an accessible name: a <label for> from the Field, or aria-label when standalone.',
    'aria-invalid="true" and aria-describedby pointing to the Field error id when invalid.',
    'Keep the native resize handle keyboard-independent: the height must never be required to read the content (the textarea scrolls).',
    'A character limit is announced through the hint text; do not rely on maxlength alone.',
  ],
  related: ['input', 'field', 'select'],
};
