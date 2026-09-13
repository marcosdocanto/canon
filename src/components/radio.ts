import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// the reference radio button: 16px circle (sm) or 20px (md) with a 1px inset gray-300 ring on white,
// brand-600 fill with a white 6 / 8px dot when selected, 8 / 12px to a 14 / 16px medium label with a
// muted supporting line; circle nudged 2px down. Focus = 4px brand ring; disabled = circle at 50%
// (gray-100 when unselected). Groups stack 16px apart.

const TRANSITION_FAST = {
  'transition-property': 'background-color, box-shadow, color, opacity',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

/** label wrapper → hidden input → circle → text (+ optional description) */
const rd = (root: string, input: string, label: string, description = '', variant = 'default') =>
  `<label class="cn-radio" data-variant="${variant}" ${root}><input class="cn-radio__input" type="radio" ${input}><span class="cn-radio__control" aria-hidden="true"><span class="cn-radio__indicator"></span></span><span class="cn-radio__label">${label}</span>${description ? `<span class="cn-radio__description">${description}</span>` : ''}</label>`;
const stack = (...items: string[]) => `<div style="display:flex;flex-direction:column;gap:var(--cn-space-4)">${items.join('')}</div>`;

export const radio: ComponentSpec = {
  name: 'Radio',
  slug: 'radio',
  category: 'forms',
  description: 'One-of-many choice: a 16px (sm) or 20px (md) circle with a gray-300 ring that fills with the brand color and shows a white dot, next to a medium label and a muted supporting line. Same anatomy as Checkbox; always used in a named group of 2–5 options.',
  usage: 'Pick exactly one option when all options should be visible and compared (billing cycle, priority, delivery method). For more than 5 options use Select; for an on/off setting use Switch; for a view toggle in a toolbar use SegmentedControl. The card variant turns each option into a selectable bordered card.',
  anatomy: [
    { part: 'root', element: 'label', description: 'The <label> wrapping everything: hit target and accessible name. inline-grid: circle in column 1, text in column 2, 8px (sm) or 12px (md) apart.' },
    { part: 'input', element: 'input', description: 'Native <input type="radio" name="…">, visually hidden but focusable. Options of one question share the same name.' },
    { part: 'control', element: 'span', description: 'The visible circle: white with a 1px gray-300 inset ring, radius full, nudged 2px down to align with the first text line. aria-hidden.' },
    { part: 'indicator', element: 'span', description: 'The white inner dot (6px on sm, 8px on md). Hidden until checked.' },
    { part: 'label', element: 'span', description: '14px (sm) or 16px (md) medium text in the default ink. A noun phrase in sentence case, no period.' },
    { part: 'description', element: 'span', description: 'Optional supporting line under the label, same size, regular weight, muted: price, consequence or example.', optional: true },
  ],
  props: {
    size: { values: ['sm', 'md'], default: 'sm', description: 'sm = 16px circle with a 14px label: forms, dialogs, tables (the reference default); md = 20px circle with a 16px label: touch screens, onboarding and prominent choices.' },
    variant: { values: ['default', 'card'], default: 'default', description: 'default = bare circle and text; card = the whole option is a selectable card (white, 1px gray-200 ring, radius 12, 16px padding) whose ring turns into a 2px brand ring when selected. Use cards for plans and tiers where the description matters.' },
  },
  states: {
    checked: { selector: ':has(:checked)', description: 'Circle fills with the brand color and shows the white dot. A card gets a 2px brand ring.', markup: 'checked attribute on the input' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Red-300 ring on every option of a required group with no selection. Pair with an error message under the group.', markup: 'aria-invalid="true" on the inputs, or data-invalid on each root' },
    focus: { selector: ':has(:focus-visible)', description: 'Keyboard focus shows the 4px brand ring on the circle (on the whole card in the card variant).', markup: 'native :focus-visible on the input' },
    disabled: { selector: '[data-disabled], &:has(:disabled)', description: 'Circle at 50% opacity (gray-100 fill when unselected), cursor not-allowed on the whole row; the text keeps its color. A checked disabled option keeps its dot.', markup: 'disabled on the input' },
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
      'border-radius': '{radius.full}',
      color: '{color.fg-on-action}',
      ...TRANSITION_FAST,
    },
    indicator: { display: 'none', 'border-radius': '{radius.full}', 'background-color': 'currentColor', 'flex-shrink': '0', 'pointer-events': 'none' },
    label: { 'grid-column': '2', ...typeStyle('label-sm'), color: '{color.fg-default}', 'user-select': 'none' },
    description: { 'grid-column': '2', ...typeStyle('body-md'), color: '{color.fg-muted}' },
    '@states': {
      checked: { control: { 'background-color': '{color.bg-action}', 'box-shadow': ring('{color.bg-action}') }, indicator: { display: 'block' } },
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
        control: { width: '{size.icon.sm}', height: '{size.icon.sm}' },
        indicator: { width: '{space.1.5}', height: '{space.1.5}' },
      },
      md: {
        root: { 'column-gap': '{space.3}', 'row-gap': '{space.0.5}' },
        input: { width: '{size.icon.md}', height: '{size.icon.md}' },
        control: { width: '{size.icon.md}', height: '{size.icon.md}' },
        indicator: { width: '{space.2}', height: '{space.2}' },
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
.cn-radio:has(:checked):has(:focus-visible) .cn-radio__control { box-shadow: inset 0 0 0 1px {color.bg-action}, {shadow.focus}; }
.cn-radio[data-invalid]:has(:focus-visible) .cn-radio__control, .cn-radio:has([aria-invalid="true"]):has(:focus-visible) .cn-radio__control { box-shadow: inset 0 0 0 1px {color.border-danger}, {shadow.focus-danger}; }
.cn-radio[data-variant="card"]:has(:checked):has(:focus-visible) { box-shadow: inset 0 0 0 2px {color.bg-action}, {shadow.focus}; }
.cn-radio[data-variant="card"]:has(:checked):has(:focus-visible) .cn-radio__control { box-shadow: inset 0 0 0 1px {color.bg-action}; }
.cn-radio-group { display: flex; flex-direction: column; gap: {space.4}; min-width: 0; margin: 0; padding: 0; border: 0; }
.cn-radio-group__label { font-family: {type.label-sm.family}; font-size: {type.label-sm.size}; font-weight: {type.label-sm.weight}; line-height: {type.label-sm.lineHeight}; letter-spacing: {type.label-sm.letterSpacing}; color: {color.fg-default}; margin-bottom: {space.0.5}; }
.cn-radio-group[data-orientation="horizontal"] { flex-direction: row; flex-wrap: wrap; row-gap: {space.3}; column-gap: {space.6}; }
.cn-radio-group[data-orientation="horizontal"] .cn-radio-group__label { flex-basis: 100%; margin-bottom: 0; }`,
  examples: [
    ex('Default (unchecked)', rd('data-size="sm"', 'name="ex-cycle" value="monthly"', 'Monthly'), '16px circle, gray-300 ring; 14px medium label 8px away.'),
    ex('Checked', rd('data-size="sm"', 'name="ex-checked" value="annual" checked', 'Annual'), 'Brand-600 fill with a 6px white dot.'),
    ex('With supporting text', rd('data-size="sm"', 'name="ex-desc" value="team" checked', 'Team', '$99 per seat, billed monthly.'), 'The supporting line is the same size, regular weight, muted.'),
    ex('Medium', rd('data-size="md"', 'name="ex-md" value="scale" checked', 'Scale', 'Unlimited seats, SSO and audit log.'), '20px circle with an 8px dot; 16px text 12px away with a 2px gap between lines.'),
    ex('Invalid', rd('data-size="sm" data-invalid', 'name="ex-invalid" value="wire" aria-invalid="true" required', 'Wire transfer'), 'Every option of the group gets data-invalid; the error message sits under the group.'),
    ex('Disabled', stack(rd('data-size="sm"', 'name="ex-disabled" value="card" checked disabled', 'Company card', 'Locked by Aisha Khan, your finance admin.'), rd('data-size="sm"', 'name="ex-disabled" value="invoice" disabled', 'Invoice')), 'The circle fades to 50% (gray-100 when unselected); the text keeps its color.'),
    ex('Card', stack(rd('data-size="sm"', 'name="ex-card" value="starter"', 'Starter — $29/mo', 'Up to 5 members and 3 projects.', 'card'), rd('data-size="sm"', 'name="ex-card" value="team" checked', 'Team — $99/mo', 'Unlimited members, 20 projects and shared libraries.', 'card')), 'A selectable card: 1px gray-200 ring, radius 12, 16px padding; a 2px brand ring when selected.'),
  ],
  recipes: [
    ex('Radio group (stacked)', `<div class="cn-radio-group" role="radiogroup" aria-labelledby="rg-billing"><div class="cn-radio-group__label" id="rg-billing">Billing cycle</div>${rd('data-size="sm"', 'name="billing" value="monthly"', 'Monthly', '$99 per seat, cancel anytime.')}${rd('data-size="sm"', 'name="billing" value="annual" checked', 'Annual', '$79 per seat, billed once a year. Save 20%.')}</div>`, 'A label names the question; options stack 16px apart; one is always checked.'),
    ex('Radio group (horizontal)', `<div class="cn-radio-group" role="radiogroup" aria-labelledby="rg-priority" data-orientation="horizontal"><div class="cn-radio-group__label" id="rg-priority">Priority</div>${rd('data-size="sm"', 'name="priority" value="low"', 'Low')}${rd('data-size="sm"', 'name="priority" value="normal" checked', 'Normal')}${rd('data-size="sm"', 'name="priority" value="high"', 'High')}</div>`, 'Horizontal only for short one-word options without descriptions.'),
    ex('Plans as cards', `<div class="cn-radio-group" role="radiogroup" aria-labelledby="rg-plan" style="max-width:420px"><div class="cn-radio-group__label" id="rg-plan">Plan</div>${rd('data-size="sm"', 'name="plan" value="starter"', 'Starter — $29/mo', 'Up to 5 members and 3 projects.', 'card')}${rd('data-size="sm"', 'name="plan" value="team" checked', 'Team — $99/mo', 'Unlimited members, 20 projects and shared libraries.', 'card')}${rd('data-size="sm"', 'name="plan" value="enterprise"', 'Enterprise', 'SSO, audit log and a named contact. Talk to Noah Berg.', 'card')}</div>`, 'Cards stack 16px apart; the whole card is the hit target and shows the focus ring.'),
  ],
  rules: [
    'A radio group has 2–5 options and always one selected (pre-select the safest or most common). No selection is a validation error, not a state.',
    'Wrap options in .cn-radio-group with a label; never a loose row of radios without a visible question.',
    'Options are parallel noun phrases in sentence case ("Monthly", "Annual"), never questions or verbs. Put price and consequence in the supporting line.',
    'Stacked 16px apart by default; horizontal (data-orientation="horizontal", 24px column gap) only for one-word options without descriptions.',
    'If choosing an option reveals more fields, put them directly under that option indented by the label column (8px + circle width), not at the end of the group.',
    'Use SegmentedControl instead when the choice is a view/mode in a toolbar; use Select when there are more than 5 options.',
    'sm (16px) in forms and dialogs; md (20px) on touch screens and onboarding. Cards for plans and tiers where the description matters.',
  ],
  a11y: [
    'Each option is a <label> wrapping a native <input type="radio">; every input of the group shares the same name so arrow keys move between them.',
    'The group container has role="radiogroup" (or is a <fieldset> with <legend>) and aria-labelledby pointing at the group label.',
    'Keyboard: Tab enters the group on the checked option; Up/Down and Left/Right move and select; Space selects when nothing is checked.',
    'Invalid: aria-invalid="true" on every input plus aria-describedby pointing at the error under the group.',
    'The circle and dot are aria-hidden; state comes from the native input, so no aria-checked is needed.',
  ],
  related: ['checkbox', 'switch', 'segmented-control', 'select', 'field'],
};
