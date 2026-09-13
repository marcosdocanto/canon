import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// the reference checkbox: 16px box with radius 4 (sm) or 20px with radius 6 (md), 1px inset gray-300
// ring on white, brand-600 fill with a white 12 / 14px check (or a dash when indeterminate), 8 / 12px
// to a 14 / 16px medium label with a muted supporting line; box nudged 2px down to sit on the first
// line. Focus = 4px brand ring on the box; disabled = box at 50% (gray-100 when unchecked).

const TRANSITION_FAST = {
  'transition-property': 'background-color, box-shadow, color, opacity',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

/** the reference check: 14-unit viewBox, 2px stroke, round caps. */
const check = '<svg class="cn-checkbox__indicator" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.6666 3.5L5.24992 9.91667L2.33325 7"/></svg>';

/** label wrapper → hidden input → box → text (+ optional description) */
const cb = (root: string, input: string, label: string, description = '', variant = 'default') =>
  `<label class="cn-checkbox" data-variant="${variant}" ${root}><input class="cn-checkbox__input" type="checkbox" ${input}><span class="cn-checkbox__control" aria-hidden="true">${check}</span><span class="cn-checkbox__label">${label}</span>${description ? `<span class="cn-checkbox__description">${description}</span>` : ''}</label>`;
const stack = (...items: string[]) => `<div style="display:flex;flex-direction:column;gap:var(--cn-space-3)">${items.join('')}</div>`;

export const checkbox: ComponentSpec = {
  name: 'Checkbox',
  slug: 'checkbox',
  category: 'forms',
  description: 'Yes/no or multi-select choice: a 16px (sm) or 20px (md) box with a gray-300 ring that fills with the brand color and shows a white check, next to a medium label and a muted supporting line. The native input stays in the DOM (invisible but focusable) so every state is CSS-only via :has().',
  usage: 'Independent options that take effect on save (permissions, filters, consent) and multi-select lists. For one-of-many use Radio; for a setting that applies immediately use Switch. Always with a visible label; never a lone box. The card variant turns each option into a selectable bordered card.',
  anatomy: [
    { part: 'root', element: 'label', description: 'The <label> wrapping everything: it is the hit target and gives the input its name. inline-grid: box in column 1, text in column 2, 8px (sm) or 12px (md) apart.' },
    { part: 'input', element: 'input', description: 'Native <input type="checkbox">, visually hidden (opacity 0, positioned over the box) but focusable. Carries checked, disabled, aria-invalid.' },
    { part: 'control', element: 'span', description: 'The visible box: white with a 1px gray-300 inset ring, radius 4 (sm) or 6 (md), nudged 2px down to align with the first text line. aria-hidden; purely decorative.' },
    { part: 'indicator', element: 'svg', description: 'The white check (12px on sm, 14px on md) inside the box. Hidden until checked; replaced by a dash when indeterminate.' },
    { part: 'label', element: 'span', description: '14px (sm) or 16px (md) medium text in the default ink. Sentence case, no period, states the positive outcome.' },
    { part: 'description', element: 'span', description: 'Optional supporting line under the label, same size, regular weight, muted: consequence or scope of the option.', optional: true },
  ],
  props: {
    size: { values: ['sm', 'md'], default: 'sm', description: 'sm = 16px box (radius 4) with a 14px label: forms, settings, tables (the reference default); md = 20px box (radius 6) with a 16px label: touch screens, onboarding and prominent options.' },
    variant: { values: ['default', 'card'], default: 'default', description: 'default = bare box and text; card = the whole option is a selectable card (white, 1px gray-200 ring, radius 12, 16px padding) whose ring turns into a 2px brand ring when checked. Use cards for plans, roles and add-ons where the description matters.' },
  },
  states: {
    checked: { selector: ':has(:checked)', description: 'Box fills with the brand color and shows the white check. A card gets a 2px brand ring.', markup: 'checked attribute on the input' },
    indeterminate: { selector: '[data-indeterminate], &:has(:indeterminate)', description: 'Partial selection (a "Select all" over a mixed group): brand fill with a dash instead of the check.', markup: 'data-indeterminate on the root, plus input.indeterminate = true in JS' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Red-300 ring on the box, for a required acceptance that was skipped. Pair with a visible error message next to the group.', markup: 'aria-invalid="true" on the input, or data-invalid on the root' },
    focus: { selector: ':has(:focus-visible)', description: 'Keyboard focus on the hidden input shows the 4px brand ring on the box (on the whole card in the card variant).', markup: 'native :focus-visible on the input' },
    disabled: { selector: '[data-disabled], &:has(:disabled)', description: 'Box at 50% opacity (gray-100 fill when unchecked), cursor not-allowed on the whole row; the text keeps its color. A checked disabled box keeps its check.', markup: 'disabled on the input' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'inline-grid',
      'grid-template-columns': 'auto minmax(0, 1fr)',
      'column-gap': '{space.2}',
      'row-gap': '0',
      'align-items': 'start',
      'max-width': '100%',
      color: '{color.fg-default}',
      cursor: 'pointer',
      '-webkit-tap-highlight-color': 'transparent',
    },
    input: { position: 'absolute', top: '{space.0.5}', left: '0', margin: '0', padding: '0', opacity: '0', cursor: 'pointer' },
    control: {
      position: 'relative',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      'grid-column': '1',
      'grid-row': '1',
      'margin-top': '{space.0.5}',
      'background-color': '{color.bg-surface}',
      'box-shadow': ring('{color.border-control}'),
      'border-radius': '{radius.sm}',
      color: '{color.fg-on-action}',
      ...TRANSITION_FAST,
    },
    indicator: { display: 'none', 'flex-shrink': '0', 'pointer-events': 'none' },
    label: { 'grid-column': '2', ...typeStyle('label-sm'), color: '{color.fg-default}', 'user-select': 'none' },
    description: { 'grid-column': '2', ...typeStyle('body-md'), color: '{color.fg-muted}' },
    '@states': {
      checked: { control: { 'background-color': '{color.bg-action}', 'box-shadow': ring('{color.bg-action}') }, indicator: { display: 'block' } },
      indeterminate: { control: { 'background-color': '{color.bg-action}', 'box-shadow': ring('{color.bg-action}') }, indicator: { display: 'none' } },
      invalid: { control: { 'box-shadow': ring('{color.border-danger}') } },
      focus: { control: { 'box-shadow': `${ring('{color.border-action}')}, {shadow.focus}` } },
      disabled: {
        root: { cursor: 'not-allowed' },
        input: { cursor: 'not-allowed' },
        control: { 'background-color': '{color.bg-muted}', opacity: '{opacity.disabled}' },
      },
    },
  },
  variants: {
    size: {
      sm: {
        input: { width: '{size.icon.sm}', height: '{size.icon.sm}' },
        control: { width: '{size.icon.sm}', height: '{size.icon.sm}', 'border-radius': '{radius.sm}' },
        indicator: { width: '{size.icon.xs}', height: '{size.icon.xs}' },
      },
      md: {
        root: { 'column-gap': '{space.3}', 'row-gap': '{space.0.5}' },
        input: { width: '{size.icon.md}', height: '{size.icon.md}' },
        control: { width: '{size.icon.md}', height: '{size.icon.md}', 'border-radius': '{radius.md}' },
        indicator: { width: '{space.3.5}', height: '{space.3.5}' },
        label: { ...typeStyle('label-lg'), 'font-weight': '{font.weight.medium}' },
        description: { ...typeStyle('body-lg') },
      },
    },
    variant: {
      default: { root: {} },
      card: {
        root: {
          display: 'grid',
          width: '100%',
          padding: '{space.4}',
          'background-color': '{color.bg-surface}',
          'border-radius': '{radius.card}',
          'box-shadow': ring('{color.border-default}'),
          ...TRANSITION_FAST,
        },
        input: { top: '{space.4}', left: '{space.4}' },
        '@states': {
          checked: { root: { 'box-shadow': 'inset 0 0 0 2px {color.bg-action}' } },
          focus: { root: { 'box-shadow': `${ring('{color.border-default}')}, {shadow.focus}` }, control: { 'box-shadow': ring('{color.border-control}') } },
          invalid: { root: { 'box-shadow': ring('{color.border-danger}') } },
          disabled: { root: { 'background-color': '{color.bg-subtle}' } },
        },
      },
    },
  },
  extraCss: `
.cn-checkbox:has(:checked):has(:focus-visible) .cn-checkbox__control, .cn-checkbox[data-indeterminate]:has(:focus-visible) .cn-checkbox__control { box-shadow: inset 0 0 0 1px {color.bg-action}, {shadow.focus}; }
.cn-checkbox[data-indeterminate] .cn-checkbox__control::after, .cn-checkbox:has(:indeterminate) .cn-checkbox__control::after { content: ''; display: block; width: {space.1.5}; height: 2px; border-radius: {radius.full}; background-color: currentColor; }
.cn-checkbox[data-size="md"][data-indeterminate] .cn-checkbox__control::after, .cn-checkbox[data-size="md"]:has(:indeterminate) .cn-checkbox__control::after { width: {space.2}; }
.cn-checkbox[data-invalid]:has(:focus-visible) .cn-checkbox__control, .cn-checkbox:has([aria-invalid="true"]):has(:focus-visible) .cn-checkbox__control { box-shadow: inset 0 0 0 1px {color.border-danger}, {shadow.focus-danger}; }
.cn-checkbox[data-variant="card"]:has(:checked):has(:focus-visible) { box-shadow: inset 0 0 0 2px {color.bg-action}, {shadow.focus}; }
.cn-checkbox[data-variant="card"]:has(:checked):has(:focus-visible) .cn-checkbox__control { box-shadow: inset 0 0 0 1px {color.bg-action}; }`,
  examples: [
    ex('Default', cb('data-size="sm"', '', 'Send me a weekly digest'), '16px box, radius 4, gray-300 ring; 14px medium label 8px away.'),
    ex('Checked', cb('data-size="sm"', 'checked', 'Notify me when Daniel Costa comments'), 'Brand-600 fill with a 12px white check.'),
    ex('With supporting text', cb('data-size="sm"', 'checked', 'Require two-factor authentication', 'Members must verify with an authenticator app every 30 days.'), 'The supporting line is the same size, regular weight, muted.'),
    ex('Medium', cb('data-size="md"', 'checked', 'Share usage analytics with Lumen', 'Helps us prioritise what to build next. Never includes your content.'), '20px box, radius 6, 14px check, 16px text 12px away with a 2px gap between lines.'),
    ex('Indeterminate (select all)', cb('data-size="sm" data-indeterminate', 'aria-label="Select all members"', 'Select all', '3 of 8 members selected'), 'Set input.indeterminate = true in JS and mirror it with data-indeterminate for CSS.'),
    ex('Invalid', cb('data-size="sm" data-invalid', 'aria-invalid="true" required', 'I agree to the Terms of Service and the Data Processing Agreement'), 'Red-300 ring. Show the error ("Accept the terms to continue") under the group, not inside the label.'),
    ex('Disabled', stack(cb('data-size="sm"', 'checked disabled', 'Unlimited seats', 'Included in the Scale plan.'), cb('data-size="sm"', 'disabled', 'Dedicated IP address')), 'The box fades to 50% (gray-100 when unchecked); the text keeps its color.'),
    ex('Card', stack(cb('data-size="sm"', 'checked', 'Research', 'Interviews, notes and evidence for Sofia Almeida’s team.', 'card'), cb('data-size="sm"', '', 'Design', 'Files, prototypes and the review queue.', 'card')), 'A selectable card: 1px gray-200 ring, radius 12, 16px padding; a 2px brand ring when checked.'),
  ],
  recipes: [
    ex('Permission group', `<div role="group" aria-labelledby="perm-label" style="display:flex;flex-direction:column;gap:var(--cn-space-3);max-width:420px"><div class="cn-text-label-sm" id="perm-label">Member permissions</div>${cb('data-size="sm"', 'checked', 'View projects and conversations')}${cb('data-size="sm"', 'checked', 'Publish updates', 'Posts go out under the member’s own name.')}${cb('data-size="sm"', '', 'Approve invoices above $10,000')}${cb('data-size="sm"', 'disabled', 'Manage billing', 'Owners only.')}</div>`, 'A label names the group; options stack 12px apart; the locked one stays visible but disabled.'),
    ex('Add-ons as cards', `<div role="group" aria-labelledby="addons-label" style="display:flex;flex-direction:column;gap:var(--cn-space-3);max-width:420px"><div class="cn-text-label-sm" id="addons-label">Add-ons</div>${cb('data-size="sm"', 'checked', 'Priority support · $49/mo', 'A named contact and a 4-hour response time.', 'card')}${cb('data-size="sm"', '', 'Audit log export · $19/mo', 'Stream every event to your SIEM.', 'card')}${cb('data-size="sm"', 'disabled', 'SSO enforcement', 'Included in the Enterprise plan.', 'card')}</div>`, 'Cards stack 12px apart; the whole card is the hit target and shows the focus ring.'),
  ],
  rules: [
    'Use a checkbox for options that take effect on save. For an immediate effect use Switch; for one-of-many use Radio.',
    'The label states the positive outcome ("Send me a weekly digest"), never a negation ("Do not send…") and never an "Enable/Disable" prefix.',
    'Labels are sentence case without a period; the supporting line is one full sentence with a period.',
    'Stack checkboxes vertically 12px apart (16px between cards). Never place more than two side by side.',
    'Indeterminate is only for a parent that summarizes children ("Select all"). Set input.indeterminate in JS and mirror it with data-indeterminate; clicking it checks everything.',
    'Invalid is reserved for a required acceptance (terms, consent). Put the error message under the group, in fg-danger, and clear it as soon as the box is checked.',
    'sm (16px) in forms, settings and tables; md (20px) on touch screens, onboarding and prominent options. Cards for plans, roles and add-ons where the description matters.',
    'Keep the native input in the DOM. The box is decorative (aria-hidden); never rebuild the checkbox with a div and onClick.',
  ],
  a11y: [
    'The root is a <label> wrapping the input, so the text is the accessible name and the whole row (or card) is the hit target.',
    'The visible box is aria-hidden; checked, focus and disabled come from the native input via :has(), so assistive tech sees a normal checkbox.',
    'A native checkbox announces "mixed" on its own once input.indeterminate is true; do not add aria-checked to it.',
    'Groups get role="group" (or a <fieldset>) with aria-labelledby pointing at the group label.',
    'Keep descriptions inside the label; if they contain links or run long, move them out and connect them with aria-describedby.',
  ],
  related: ['radio', 'switch', 'field'],
};
