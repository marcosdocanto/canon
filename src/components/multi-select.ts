import type { ComponentSpec } from '../types.ts';
import { CONTROL, FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, SIZE_PROP, ex, ICON, typeStyle } from './_shared.ts';

// Combobox that keeps several values: the chosen items sit as chips inside the field box and the
// listbox under it shows a checkbox square on every option. The chips box draws the border and ring;
// the root only positions the listbox.

const sizeBlock = (s: 'sm' | 'md' | 'lg', chipH: string, chipFont: string) => ({
  chips: { 'min-height': CONTROL[s].height, 'border-radius': CONTROL[s].radius, 'padding-inline-end': `calc(${CONTROL[s].px} + ${CONTROL[s].icon} + {space.1})` },
  chip: { height: chipH, 'font-size': chipFont },
  field: { height: chipH, 'font-size': CONTROL[s].font },
  icon: { width: CONTROL[s].icon, height: CONTROL[s].icon, 'inset-inline-end': CONTROL[s].px, top: `calc((${CONTROL[s].height} - ${CONTROL[s].icon}) / 2)` },
});

const chevron = ICON.chevronDown.replace('cn-icon', 'cn-multi-select__icon');
const chip = (label: string, attrs = '') =>
  `<span class="cn-multi-select__chip">${label}<button type="button" class="cn-multi-select__chip-remove" aria-label="Remove ${label}"${attrs}>${ICON.x}</button></span>`;
const option = (id: string, label: string, attrs = '') =>
  `<li class="cn-multi-select__option" role="option" id="${id}" ${attrs}><span class="cn-multi-select__option-check" aria-hidden="true">${ICON.check}</span>${label}</li>`;
const box = (o: { root: string; chips: string[]; input: string; id: string; body?: string; removeAttrs?: string }) =>
  `<div class="cn-multi-select" ${o.root}><div class="cn-multi-select__chips">${o.chips.map((c) => chip(c, o.removeAttrs)).join('')}<input class="cn-multi-select__field" type="text" role="combobox" aria-autocomplete="list" aria-controls="${o.id}-list" ${o.input}>${chevron}</div><ul class="cn-multi-select__listbox" role="listbox" aria-multiselectable="true" id="${o.id}-list">${o.body ?? ''}</ul></div>`;

const PEOPLE = option('ms-owner-maya', 'Maya Chen', 'aria-selected="true"') + option('ms-owner-daniel', 'Daniel Costa', 'aria-selected="true"') + option('ms-owner-sofia', 'Sofia Almeida', 'aria-selected="false" data-highlighted') + option('ms-owner-lucas', 'Lucas Ferreira', 'aria-selected="false"') + option('ms-owner-aisha', 'Aisha Khan (on leave)', 'aria-selected="false" aria-disabled="true"');

export const multiSelect: ComponentSpec = {
  name: 'MultiSelect',
  slug: 'multi-select',
  category: 'forms',
  description: 'A Combobox that keeps several values: chosen items sit as chips inside the field, and the listbox below shows a checkbox square on every option so the selection reads as a list of ticks. Typing filters; Enter toggles; Backspace removes the last chip.',
  usage: 'Pick several items from a known list: assignees, tags from a fixed set, regions, products. For free-typed values use TagsInput; for one value use Select or Combobox; for 2–6 options that fit on screen use a Checkbox group. Pair with Field for the label.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Wrapper (position: relative) holding the chips box and the listbox. Carries data-size, data-state="open|closed", data-invalid, data-disabled.' },
    { part: 'chips', element: 'div', description: 'The bordered field box (flex, wrap, min-height = control height): draws background, hairline, radius, shadow-xs and the focus ring on :focus-within. Holds the chips, the input and the chevron.' },
    { part: 'chip', element: 'span', description: 'One selected value: surface fill, hairline, radius md, 24px tall, body-sm, with its remove button.' },
    { part: 'chip-remove', element: 'button', description: '16px × button at the end of a chip. aria-label "Remove {value}".' },
    { part: 'field', element: 'input', description: 'The bare text input with role="combobox" (flex 1, min-width 80px). Filters the list; never holds a committed value.' },
    { part: 'icon', element: 'svg', description: 'Chevron-down absolutely placed at the end of the first line; rotates when open. Decorative.' },
    { part: 'listbox', element: 'ul', description: 'The panel under the box: surface-raised, hairline, radius panel, shadow-lg, padding space.1, 36px rows, scrolls after 256px. Hidden unless the root has data-state="open". role="listbox" aria-multiselectable="true".' },
    { part: 'option', element: 'li', description: 'One row: checkbox square, then the label. role="option" with a unique id and aria-selected; data-highlighted for the keyboard cursor; aria-disabled="true" when not selectable.' },
    { part: 'option-check', element: 'span', description: '16px checkbox square at the start of the row (hairline, radius sm) that fills with the action color and shows the check when the option is selected. Contains the check svg.' },
    { part: 'empty', element: 'li', description: 'Muted "No results" row rendered instead of options when the filter matches nothing.', optional: true },
  ],
  props: {
    size: SIZE_PROP(['sm', 'md', 'lg']),
  },
  states: {
    hover: { selector: ':hover:not([data-disabled])', description: 'Chips box border strengthens.', markup: 'native :hover' },
    focus: { selector: ':focus-within', description: 'Chips box border becomes the action color and the ring appears. Focus stays on the input while the list is open.', markup: 'native :focus-within on the root' },
    open: { selector: '[data-state="open"]', description: 'The listbox is visible under the box and the chevron points up.', markup: 'data-state="open" on the root and aria-expanded="true" on the input' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Required selection missing or over the limit: danger border, danger ring on focus. Pair with a Field error.', markup: 'aria-invalid="true" on the input, or data-invalid on the root' },
    disabled: { selector: '[data-disabled], &:has(input:disabled)', description: 'Grey fill, disabled chips and chevron, not interactive.', markup: 'disabled on the input (and on the chip remove buttons)' },
    highlighted: { selector: ' .cn-multi-select__option[data-highlighted]', description: 'On the __option: the row under the keyboard cursor or pointer, bg-subtle. Exactly one at a time. Styled in extraCss.', markup: 'data-highlighted on the option; mirror it with aria-activedescendant on the input' },
    selected: { selector: ' .cn-multi-select__option[aria-selected="true"]', description: 'On the __option: a chosen value; the checkbox square fills with the action color and shows the check, the label turns medium. Styled in extraCss.', markup: 'aria-selected="true" on the option' },
    'option-disabled': { selector: ' .cn-multi-select__option[aria-disabled="true"]', description: 'On the __option: not selectable, disabled ink, skipped by the keyboard. Styled in extraCss.', markup: 'aria-disabled="true" on the option' },
  },
  base: {
    root: { position: 'relative', display: 'block', width: '100%', 'min-width': '0', color: '{color.fg-default}' },
    chips: {
      position: 'relative',
      display: 'flex',
      'flex-wrap': 'wrap',
      'align-items': 'center',
      gap: '{space.1}',
      width: '100%',
      'min-height': CONTROL.md.height,
      padding: '{space.1.5}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-control}',
      'border-radius': '{radius.control}',
      'box-shadow': '{shadow.xs}',
      cursor: 'text',
      ...TRANSITION_COLORS,
    },
    chip: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.1}',
      height: '{space.6}',
      'max-width': '100%',
      'padding-inline': '{space.2}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-default}',
      'border-radius': '{radius.md}',
      ...typeStyle('body-sm'),
      'line-height': '{font.lineHeight.none}',
      color: '{color.fg-default}',
      'white-space': 'nowrap',
      cursor: 'default',
    },
    'chip-remove': {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.4}',
      height: '{space.4}',
      'margin-inline-end': 'calc({space.1} * -1)',
      'border-radius': '{radius.sm}',
      'font-size': '{size.icon.xs}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
    field: {
      flex: '1 1 {space.20}',
      'min-width': '{space.20}',
      height: '{space.6}',
      margin: '0',
      padding: '0 {space.1}',
      border: '0',
      outline: 'none',
      background: 'transparent',
      ...typeStyle('body-md'),
      'line-height': '{font.lineHeight.none}',
      color: 'inherit',
    },
    icon: {
      position: 'absolute',
      color: '{color.fg-subtle}',
      'pointer-events': 'none',
      'transition-property': 'transform, color',
      'transition-duration': '{motion.duration.normal}',
      'transition-timing-function': '{motion.easing.standard}',
    },
    listbox: {
      display: 'none',
      margin: '{space.1} 0 0',
      padding: '{space.1}',
      'max-height': '{space.64}',
      'overflow-y': 'auto',
      'background-color': '{color.bg-surface-raised}',
      border: '{border.width.thin} solid {color.border-default}',
      'border-radius': '{radius.panel}',
      'box-shadow': '{shadow.lg}',
      'list-style': 'none',
    },
    option: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.2.5}',
      height: '{space.9}',
      'padding-inline': '{space.2.5}',
      'border-radius': '{radius.md}',
      ...typeStyle('body-sm'),
      color: '{color.fg-default}',
      'white-space': 'nowrap',
      overflow: 'hidden',
      cursor: 'pointer',
      'user-select': 'none',
    },
    'option-check': {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.md}',
      height: '{size.icon.md}',
      'font-size': '{size.icon.xs}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-strong}',
      'border-radius': '{radius.sm}',
      color: '{color.fg-on-action}',
      ...TRANSITION_COLORS,
    },
    empty: { display: 'block', padding: '{space.2} {space.2.5}', ...typeStyle('body-sm'), color: '{color.fg-muted}' },
    '@states': {
      hover: { chips: { 'border-color': '{color.border-control-hover}' } },
      focus: { chips: { ...FOCUS_RING, 'border-color': '{color.border-action}' } },
      open: { listbox: { display: 'block' }, icon: { transform: 'rotate(180deg)' } },
      invalid: { chips: { 'border-color': '{color.border-danger}' } },
      disabled: {
        chips: { 'background-color': '{color.bg-disabled}', color: '{color.fg-disabled}', 'border-color': '{color.border-disabled}', 'box-shadow': 'none', cursor: 'not-allowed' },
        chip: { color: '{color.fg-disabled}', 'background-color': 'transparent', 'border-color': '{color.border-disabled}' },
        'chip-remove': { color: '{color.fg-disabled}', 'pointer-events': 'none' },
        field: { cursor: 'not-allowed' },
        icon: { color: '{color.fg-disabled}' },
      },
    },
  },
  variants: {
    size: {
      sm: sizeBlock('sm', '{space.5}', '{font.size.xs}'),
      md: sizeBlock('md', '{space.6}', '{font.size.sm}'),
      lg: sizeBlock('lg', '{space.7}', '{font.size.md}'),
    },
  },
  extraCss: `
.cn-multi-select .cn-multi-select__field::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-multi-select[data-invalid]:focus-within .cn-multi-select__chips, .cn-multi-select:has([aria-invalid="true"]):focus-within .cn-multi-select__chips { box-shadow: {shadow.focus-danger}; border-color: {color.border-danger}; }
.cn-multi-select .cn-multi-select__chip-remove .cn-icon { stroke-width: 2; }
.cn-multi-select .cn-multi-select__chip-remove:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-multi-select .cn-multi-select__chip-remove:focus-visible { outline: none; box-shadow: {shadow.focus}; color: {color.fg-default}; }
.cn-multi-select .cn-multi-select__option-check .cn-icon { display: none; stroke-width: 2.5; }
.cn-multi-select .cn-multi-select__option[data-highlighted], .cn-multi-select .cn-multi-select__option:hover { background-color: {color.bg-subtle}; }
.cn-multi-select .cn-multi-select__option[aria-selected="true"] { font-weight: {font.weight.medium}; }
.cn-multi-select .cn-multi-select__option[aria-selected="true"] .cn-multi-select__option-check { background-color: {color.bg-action}; border-color: {color.bg-action}; }
.cn-multi-select .cn-multi-select__option[aria-selected="true"] .cn-multi-select__option-check .cn-icon { display: block; }
.cn-multi-select .cn-multi-select__option[aria-disabled="true"] { color: {color.fg-disabled}; cursor: not-allowed; background-color: transparent; }
.cn-multi-select .cn-multi-select__option[aria-disabled="true"] .cn-multi-select__option-check { background-color: {color.bg-disabled}; border-color: {color.border-disabled}; }`,
  examples: [
    ex('Closed with values', box({ root: 'data-size="md" data-state="closed" style="max-width:360px"', chips: ['Maya Chen', 'Daniel Costa'], input: 'aria-expanded="false" placeholder="Add people…" aria-label="Assignees"', id: 'ms-closed' }), 'Chips inside the box, the input after them, the chevron at the end of the first line.'),
    ex('Open with options', box({ root: 'data-size="md" data-state="open" style="max-width:360px"', chips: ['Maya Chen', 'Daniel Costa'], input: 'aria-expanded="true" value="" aria-label="Assignees" aria-activedescendant="ms-owner-sofia"', id: 'ms-owner', body: PEOPLE }), 'Maya and Daniel are selected (filled squares), Sofia is highlighted by the keyboard, Aisha is disabled.'),
    ex('Open, no results', box({ root: 'data-size="md" data-state="open" style="max-width:360px"', chips: ['Europe'], input: 'aria-expanded="true" value="Antarc" aria-label="Regions"', id: 'ms-region', body: '<li class="cn-multi-select__empty" role="presentation">No regions match “Antarc”</li>' })),
    ex('Empty (placeholder)', box({ root: 'data-size="md" data-state="closed" style="max-width:360px"', chips: [], input: 'aria-expanded="false" placeholder="Select products…" aria-label="Products"', id: 'ms-empty' }), 'Without chips it looks like a Combobox of the same size.'),
    ex('Small and large', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-3);max-width:360px">${box({ root: 'data-size="sm" data-state="closed"', chips: ['Japan', 'Norway'], input: 'aria-expanded="false" placeholder="Add a country…" aria-label="Countries (small)"', id: 'ms-sm' })}${box({ root: 'data-size="lg" data-state="closed"', chips: ['Japan', 'Norway'], input: 'aria-expanded="false" placeholder="Add a country…" aria-label="Countries (large)"', id: 'ms-lg' })}</div>`),
    ex('Invalid', box({ root: 'data-size="md" data-state="closed" data-invalid style="max-width:360px"', chips: [], input: 'aria-expanded="false" aria-invalid="true" placeholder="Add at least one reviewer…" aria-label="Reviewers"', id: 'ms-invalid' }), 'Pair with a Field error such as "Pick at least one reviewer".'),
    ex('Disabled', box({ root: 'data-size="md" data-state="closed" style="max-width:360px"', chips: ['Elena Rossi', 'Tomás Silva'], input: 'aria-expanded="false" disabled aria-label="Approvers"', id: 'ms-disabled', removeAttrs: ' disabled' })),
  ],
  rules: [
    'Values come from the list only; typing filters, it never creates. If users must add their own values, use TagsInput.',
    'Selected items render as chips in the box in selection order and stay ticked in the list; removing a chip unticks the option and vice versa.',
    'The listbox renders in the flow directly under the box (margin-top space.1) inside the root; toggle data-state="open|closed" on the root. Move it to a popper layer only when it would be clipped.',
    'Options are 36px rows with a 16px checkbox square first; show at most 7 before scrolling (max-height 256px).',
    'Exactly one option is highlighted at a time (data-highlighted) and follows keyboard and pointer; Enter or Space toggles it without closing the list.',
    'When nothing matches, render the empty row ("No regions match “…”"); never an empty panel and never close the list.',
    'State the limit in the helper text when one exists ("Up to 5 reviewers") and mark the box invalid when it is exceeded, not silently ignore the click.',
    'Sizes: md in forms; sm in filter bars; lg on onboarding screens. Chips are 20 / 24 / 28px tall.',
  ],
  a11y: [
    'The input has role="combobox", aria-expanded, aria-controls="<listbox id>", aria-autocomplete="list" and aria-activedescendant pointing at the highlighted option id.',
    'The list has role="listbox" aria-multiselectable="true"; each option has role="option", a unique id and aria-selected="true|false". Disabled options use aria-disabled="true".',
    'Keyboard: Down/Up move the highlight, Enter or Space toggle it, Escape closes, Backspace on an empty input removes the last chip. Focus stays on the input the whole time.',
    'Each chip remove button is a real <button> with aria-label "Remove {value}"; announce changes in a live region ("Daniel Costa removed, 1 selected").',
    'The checkbox square is decorative (aria-hidden); the state is carried by aria-selected on the option.',
  ],
  related: ['combobox', 'select', 'tags-input', 'checkbox', 'field'],
};
