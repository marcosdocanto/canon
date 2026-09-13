import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference text field wrapper: label → control → hint stacked 6px apart. Label 14px medium in
// the default ink with an optional brand asterisk (2px away) and a 16px help icon; hint 14px muted
// (12px on sm) that turns to the danger color when invalid. Nothing else: no colon, no bold.

const inp = (id: string, attrs: string, size: 'sm' | 'md' | 'lg' = 'md', affix = '') =>
  `<div class="cn-input" data-variant="default" data-size="${size}">${affix}<input class="cn-input__field" id="${id}" ${attrs}></div>`;
const REQUIRED = '<span class="cn-field__required" aria-hidden="true">*</span>';
const help = (text: string) => `<button type="button" class="cn-field__tooltip" aria-label="${text}">${ICON.info}</button>`;
const fld = (id: string, label: string, control: string, o: { hint?: string; error?: string; root?: string; size?: string; layout?: string; style?: string; labelExtra?: string } = {}) =>
  `<div class="cn-field" data-layout="${o.layout ?? 'vertical'}" data-size="${o.size ?? 'md'}" ${o.root ?? ''} style="${o.style ?? 'max-width:360px'}"><label class="cn-field__label" for="${id}">${label}${o.labelExtra ?? ''}</label><div class="cn-field__control">${control}</div>${o.hint ? `<p class="cn-field__helper" id="${id}-hint">${o.hint}</p>` : ''}${o.error ? `<p class="cn-field__error" id="${id}-error">${o.error}</p>` : ''}</div>`;

export const field: ComponentSpec = {
  name: 'Field',
  slug: 'field',
  category: 'forms',
  description: 'Label, control and one line of hint or error text stacked 6px apart (the reference text-field rhythm). The label is 14px medium with an optional brand asterisk and help icon; the hint is 14px muted and turns red when the field is invalid. It owns the words around a control so every form reads the same way.',
  usage: 'Wrap every Input, Textarea, Select, Combobox, Slider and FileDropzone in a Field so it gets a visible label and a place for hint and error text. Do not wrap Checkbox, Radio or Switch (they carry their own label; group them with a radio-group or a fieldset). Use layout="horizontal" only on settings pages where many short fields stack under one another.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The wrapper: a 6px vertical stack by default; a label-column grid in horizontal layout. Carries data-invalid and data-disabled.' },
    { part: 'label', element: 'label', description: 'Visible label with for="<control id>": 14px medium in the default ink, a flex row with 2px gaps for the asterisk and help icon. Sentence case, no trailing colon, 1–4 words ("Company name").' },
    { part: 'required', element: 'span', description: 'Optional brand asterisk right after the label text (2px away) marking a required field; turns red when invalid. aria-hidden — the control carries required.', optional: true },
    { part: 'tooltip', element: 'button', description: 'Optional 16px help icon after the label that opens a Tooltip on hover/focus (aria-label = the tooltip text). Gray-500, darker on hover.', optional: true },
    { part: 'optional', element: 'span', description: 'Muted "(optional)" marker inside the label, regular weight, for forms that mark optional fields instead of required ones.', optional: true },
    { part: 'control', element: 'div', description: 'Slot holding exactly one control (an Input, Select, Textarea, Combobox…). No styling besides min-width: 0.' },
    { part: 'helper', element: 'p', description: 'The hint: one short line under the control, 14px (12px on sm) muted: format, example or limit ("Shown on invoices"). Hidden while the field is invalid.', optional: true },
    { part: 'error', element: 'p', description: 'Validation message in the same size as the hint, in the danger color (an optional 16px icon may lead it). Hidden until data-invalid is on the root; give it an id and reference it from the control with aria-describedby.', optional: true },
  ],
  props: {
    layout: { values: ['vertical', 'horizontal'], default: 'vertical', description: 'vertical = label above the control (forms, dialogs, onboarding); horizontal = label in a fixed 192px left column with the control on the right (settings pages with many short fields).' },
    size: { values: ['sm', 'md'], default: 'md', description: 'md = 14px label and 14px hint, pairs with md/lg controls; sm = 14px label and 12px hint, pairs with sm controls in dense panels and filters (the reference size="sm" hint).' },
  },
  states: {
    invalid: { selector: '[data-invalid]', description: 'Shows the error in the danger color, hides the hint and turns the asterisk red. Set together with aria-invalid="true" on the control.', markup: 'data-invalid on the root' },
    disabled: { selector: '[data-disabled]', description: 'The control fades on its own (50% opacity); the label and hint stay readable and the label shows the not-allowed cursor. Set together with disabled on the control.', markup: 'data-disabled on the root' },
  },
  base: {
    root: { display: 'flex', 'flex-direction': 'column', 'align-items': 'stretch', gap: '{space.1.5}', width: '100%', 'min-width': '0' },
    label: { display: 'flex', 'align-items': 'center', gap: '{space.0.5}', ...typeStyle('label-sm'), color: '{color.fg-default}', cursor: 'default' },
    required: { color: '{brand.600}', 'user-select': 'none' },
    tooltip: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.sm}',
      height: '{size.icon.sm}',
      margin: '0',
      padding: '0',
      border: '0',
      background: 'none',
      'border-radius': '{radius.sm}',
      color: '{color.fg-subtle}',
      cursor: 'pointer',
      'transition-property': 'color, box-shadow',
      'transition-duration': '{motion.duration.slow}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    optional: { 'font-weight': '{font.weight.regular}', color: '{color.fg-subtle}', 'margin-inline-start': '{space.0.5}' },
    control: { 'min-width': '0' },
    helper: { ...typeStyle('body-md'), color: '{color.fg-muted}' },
    error: { display: 'none', 'align-items': 'flex-start', gap: '{space.1.5}', ...typeStyle('body-md'), color: '{color.fg-danger}' },
    '@states': {
      invalid: { helper: { display: 'none' }, error: { display: 'flex' }, required: { color: '{color.fg-danger}' } },
      disabled: { label: { cursor: 'not-allowed' } },
    },
  },
  variants: {
    layout: {
      vertical: { root: {} },
      horizontal: {
        root: { display: 'grid', 'grid-template-columns': '{space.48} minmax(0, 1fr)', 'column-gap': '{space.6}', 'row-gap': '{space.1.5}', 'align-items': 'start' },
        label: { 'grid-column': '1', 'grid-row': '1', 'padding-block-start': '{space.2.5}' },
        control: { 'grid-column': '2', 'grid-row': '1' },
        helper: { 'grid-column': '2' },
        error: { 'grid-column': '2' },
      },
    },
    size: {
      sm: { helper: { ...typeStyle('body-sm') }, error: { ...typeStyle('body-sm') } },
      md: { helper: {}, error: {} },
    },
  },
  extraCss: `
.cn-field .cn-field__tooltip .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; stroke-width: 2.25; }
.cn-field .cn-field__tooltip:hover, .cn-field .cn-field__tooltip:focus-visible { color: {color.fg-muted}; }
.cn-field .cn-field__tooltip:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-field .cn-field__error .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; flex-shrink: 0; margin-top: {space.0.5}; }
.cn-field[data-layout="horizontal"][data-size="sm"] .cn-field__label { padding-block-start: {space.2}; }
@media (max-width: {breakpoint.sm}) {
  .cn-field[data-layout="horizontal"] { grid-template-columns: minmax(0, 1fr); gap: {space.1.5}; }
  .cn-field[data-layout="horizontal"] .cn-field__label, .cn-field[data-layout="horizontal"] .cn-field__control, .cn-field[data-layout="horizontal"] .cn-field__helper, .cn-field[data-layout="horizontal"] .cn-field__error { grid-column: 1; grid-row: auto; }
  .cn-field[data-layout="horizontal"] .cn-field__label, .cn-field[data-layout="horizontal"][data-size="sm"] .cn-field__label { padding-block-start: 0; }
}`,
  examples: [
    ex('Vertical (default)', fld('field-company', 'Company name', inp('field-company', 'type="text" placeholder="Lumen Studio" aria-describedby="field-company-hint"'), { hint: 'The legal name that appears on invoices.' }), 'Label 14px medium, 6px, the control, 6px, a 14px muted hint.'),
    ex('Required with help icon', fld('field-email', 'Work email', inp('field-email', 'type="email" placeholder="maya@lumen.app" required aria-describedby="field-email-hint"'), { hint: 'We only send billing receipts here.', labelExtra: REQUIRED + help('Used to sign in and to receive receipts') }), 'The brand asterisk sits 2px after the label; the 16px help icon opens a Tooltip.'),
    ex('Optional marker', fld('field-site', 'Website', inp('field-site', 'type="url" placeholder="lumen.app"', 'md', '<span class="cn-input__affix">https://</span>'), { labelExtra: ' <span class="cn-field__optional">(optional)</span>' }), 'For forms that mark optional fields instead of required ones.'),
    ex('Invalid', fld('field-email2', 'Work email', inp('field-email2', 'type="email" value="maya@lumen" aria-invalid="true" required aria-describedby="field-email2-error"'), { root: 'data-invalid', hint: 'We only send billing receipts here.', error: 'Enter a complete address, like maya@lumen.app.', labelExtra: REQUIRED }), 'The error replaces the hint in the danger color and the asterisk turns red; the text says how to fix it.'),
    ex('Horizontal (settings page)', fld('field-display', 'Display name', inp('field-display', 'type="text" value="Maya Chen"'), { layout: 'horizontal', hint: 'Shown to teammates in comments and activity.', style: 'max-width:640px' }), 'A 192px label column; the label aligns with the 40px control.'),
    ex('Disabled', fld('field-plan', 'Plan', inp('field-plan', 'type="text" value="Team (annual)" disabled'), { root: 'data-disabled', hint: 'Managed by Aisha Khan, your billing admin.' }), 'The control fades; the words stay readable.'),
    ex('Small', fld('field-min', 'Minimum order value', inp('field-min', 'type="number" value="5000"', 'sm', '<span class="cn-input__affix">USD</span>'), { size: 'sm', hint: 'Orders below this value are hidden.', style: 'max-width:280px' }), 'A 14px label with a 12px hint, for sm controls.'),
  ],
  recipes: [
    ex('Settings section', `<section class="cn-card" data-variant="default" data-padding="md" style="max-width:640px;width:100%"><header class="cn-card__header"><div><h3 class="cn-card__title">Workspace</h3><p class="cn-card__description">Name and region are visible to every member.</p></div></header><div class="cn-card__body" style="display:flex;flex-direction:column;gap:var(--cn-space-5)">${fld('ws-name', 'Workspace name', inp('ws-name', 'type="text" value="Lumen Studio"'), { layout: 'horizontal', style: '' })}${fld('ws-slug', 'URL', inp('ws-slug', 'type="text" value="lumen-studio"', 'md', '<span class="cn-input__affix">app.lumen.app/</span>'), { layout: 'horizontal', hint: 'Lowercase letters, numbers and dashes.', style: '' })}${fld('ws-region', 'Data region', inp('ws-region', 'type="text" value="Europe (Frankfurt)" disabled'), { layout: 'horizontal', root: 'data-disabled', hint: 'Contact support to migrate regions.', style: '' })}</div><footer class="cn-card__footer" style="justify-content:flex-end"><button type="button" class="cn-button" data-variant="primary" data-size="sm"><span class="cn-button__label">Save changes</span></button></footer></section>`, 'Horizontal fields inside a Card, stacked 20px apart. One primary action in the footer.'),
  ],
  rules: [
    'Every control gets a visible label. Placeholder text is an example value, never the label.',
    'Labels are 1–4 words in sentence case with no colon. Name what goes in the field ("Work email"), not the action ("Enter your email").',
    'Pick one convention per form: mark required fields with the brand asterisk, or mark optional ones with "(optional)". Never both.',
    'Hint text is one sentence in present tense that answers "what format" or "why do you need it". If it needs two lines, the label or the flow is wrong.',
    'Invalid: set data-invalid on the Field AND aria-invalid="true" on the control. The error replaces the hint and says how to fix it ("Enter a complete address"), not just "Invalid".',
    'The help icon carries context that does not fit the hint (why, where it is used); it never replaces the hint or the error.',
    'Use one layout per form. Horizontal settings fields have a 192px label column and stack vertically below 640px of available width.',
    'Fields stack 20px apart; two related short fields (city + postal code) may share a row 16px apart.',
    'Constrain short values (postal code, quantity, currency) with max-width on the Field, not on the control.',
  ],
  a11y: [
    'The <label for> references the control id, so clicking the label focuses the control and screen readers announce it.',
    'The asterisk is aria-hidden; put required on the control (or aria-required) so the requirement is announced.',
    'The help icon is a real <button> with aria-label equal to the tooltip text; the tooltip is referenced with aria-describedby.',
    'When invalid, the control has aria-invalid="true" and aria-describedby pointing at the error id; when valid, aria-describedby points at the hint id.',
    'The error text is static in the flow. Announce submit results with a separate live region, not by making every error aria-live.',
  ],
  related: ['input', 'textarea', 'select', 'combobox', 'checkbox', 'radio', 'tooltip'],
};
