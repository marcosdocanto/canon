import type { ComponentSpec } from '../types.ts';
import { CONTROL, FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, SIZE_PROP, ex, ICON, typeStyle } from './_shared.ts';

// Token field: chips wrap inside one bordered box, followed by a bare input that grows to fill
// the last line. Enter / comma turns the text into a chip; Backspace on an empty input removes the last one.

const sizeBlock = (s: 'sm' | 'md' | 'lg', o: { pad: string; chip: string; chipFont: string; gap: string }) => ({
  root: { 'min-height': CONTROL[s].height, padding: o.pad, gap: o.gap, 'border-radius': CONTROL[s].radius },
  tag: { height: o.chip, 'font-size': o.chipFont },
  field: { height: o.chip, 'font-size': CONTROL[s].font },
});

const chip = (label: string, attrs = '') =>
  `<span class="cn-tags-input__tag">${label}<button type="button" class="cn-tags-input__tag-remove" aria-label="Remove ${label}"${attrs}>${ICON.x}</button></span>`;
const box = (o: { size?: string; tags: string[]; input: string; root?: string; removeAttrs?: string }) =>
  `<div class="cn-tags-input" data-size="${o.size ?? 'md'}"${o.root ?? ''} style="max-width:420px">${o.tags.map((t) => chip(t, o.removeAttrs)).join('')}<input class="cn-tags-input__field" type="text" ${o.input}></div>`;

export const tagsInput: ComponentSpec = {
  name: 'TagsInput',
  slug: 'tags-input',
  category: 'forms',
  description: 'An Input that holds many values as chips: emails, keywords, labels. One hairline box with the control height as its minimum; chips wrap, and a bare text field grows into the remaining space of the last line.',
  usage: 'Free-form lists typed by the user: invite emails, keywords, tags, domains. When the values must come from a known list use MultiSelect; for a single value use Input; for filters you toggle use Tag. Pair with Field for the label and helper ("Press Enter to add").',
  anatomy: [
    { part: 'root', element: 'div', description: 'The bordered box (flex, wrap, align center, gap space.1, padding space.1.5, min-height = control height). Draws background, hairline, radius, shadow-xs and the focus ring on :focus-within. Clicking anywhere focuses the field.' },
    { part: 'tag', element: 'span', description: 'One value chip: surface fill, hairline, radius md, 24px tall, body-sm text, followed by its remove button.' },
    { part: 'tag-remove', element: 'button', description: '16px button with an × icon at the end of a chip. aria-label "Remove {value}".' },
    { part: 'field', element: 'input', description: 'The bare text input (flex 1, min-width 80px): no border, no outline. Enter or comma commits the text as a chip.' },
  ],
  props: {
    size: SIZE_PROP(['sm', 'md', 'lg']),
  },
  states: {
    hover: { selector: ':hover:not([data-disabled])', description: 'Border strengthens.', markup: 'native :hover' },
    focus: { selector: ':focus-within', description: 'Border becomes the action color and the ring appears around the whole box.', markup: 'native :focus-within on the box' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'A value failed validation (bad email, duplicate, too many): danger border, danger ring on focus. Pair with a Field error.', markup: 'aria-invalid="true" on the input, or data-invalid on the box' },
    disabled: { selector: '[data-disabled], &:has(input:disabled)', description: 'Grey fill, chips and text in the disabled color, remove buttons inert.', markup: 'disabled on the input (and on the remove buttons)' },
    removeHover: { selector: ' .cn-tags-input__tag-remove:hover', description: 'On the __tag-remove button: subtle fill and default ink. Styled in extraCss because it lives on a child.', markup: 'native :hover on the remove button' },
    removeFocus: { selector: ' .cn-tags-input__tag-remove:focus-visible', description: 'On the __tag-remove button: its own focus ring. Styled in extraCss.', markup: 'native :focus-visible on the remove button' },
  },
  base: {
    root: {
      display: 'flex',
      'flex-wrap': 'wrap',
      'align-items': 'center',
      gap: '{space.1}',
      width: '100%',
      'min-width': '0',
      'min-height': CONTROL.md.height,
      padding: '{space.1.5}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-control}',
      'border-radius': '{radius.control}',
      color: '{color.fg-default}',
      'box-shadow': '{shadow.xs}',
      cursor: 'text',
      ...TRANSITION_COLORS,
    },
    tag: {
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
    'tag-remove': {
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
    '@states': {
      hover: { root: { 'border-color': '{color.border-control-hover}' } },
      focus: { root: { ...FOCUS_RING, 'border-color': '{color.border-action}' } },
      invalid: { root: { 'border-color': '{color.border-danger}' } },
      disabled: {
        root: { 'background-color': '{color.bg-disabled}', color: '{color.fg-disabled}', 'border-color': '{color.border-disabled}', 'box-shadow': 'none', cursor: 'not-allowed' },
        tag: { color: '{color.fg-disabled}', 'background-color': 'transparent', 'border-color': '{color.border-disabled}' },
        'tag-remove': { color: '{color.fg-disabled}', cursor: 'not-allowed', 'pointer-events': 'none' },
        field: { cursor: 'not-allowed' },
      },
    },
  },
  variants: {
    size: {
      sm: sizeBlock('sm', { pad: '{space.1}', chip: '{space.5}', chipFont: '{font.size.xs}', gap: '{space.1}' }),
      md: sizeBlock('md', { pad: '{space.1.5}', chip: '{space.6}', chipFont: '{font.size.sm}', gap: '{space.1}' }),
      lg: sizeBlock('lg', { pad: '{space.2}', chip: '{space.7}', chipFont: '{font.size.md}', gap: '{space.1.5}' }),
    },
  },
  extraCss: `
.cn-tags-input .cn-tags-input__field::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-tags-input:has([aria-invalid="true"]):focus-within, .cn-tags-input[data-invalid]:focus-within { box-shadow: {shadow.focus-danger}; border-color: {color.border-danger}; }
.cn-tags-input .cn-tags-input__tag-remove .cn-icon { stroke-width: 2; }
.cn-tags-input .cn-tags-input__tag-remove:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-tags-input .cn-tags-input__tag-remove:focus-visible { outline: none; box-shadow: {shadow.focus}; color: {color.fg-default}; }
.cn-tags-input .cn-tags-input__tag[data-invalid] { border-color: {color.border-danger}; color: {color.fg-danger}; }`,
  examples: [
    ex('Invite by email', box({ tags: ['maya.chen@lumen.co', 'daniel.costa@lumen.co', 'sofia.almeida@lumen.co'], input: 'placeholder="Add teammate…" aria-label="Invite by email" inputmode="email"' }), 'Chips wrap inside the box; the field grows into the rest of the last line.'),
    ex('Keywords', box({ tags: ['Frozen seafood', 'Importer', 'Japan'], input: 'placeholder="Add a keyword and press Enter" aria-label="Keywords"' })),
    ex('Empty', box({ tags: [], input: 'placeholder="Add domains, comma separated" aria-label="Allowed domains"' }), 'With no chips it looks exactly like an Input of the same size.'),
    ex('Sizes', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-3);max-width:420px">${box({ size: 'sm', tags: ['Osaka', 'Tokyo'], input: 'placeholder="Add a city…" aria-label="Cities (small)"' })}${box({ size: 'md', tags: ['Osaka', 'Tokyo'], input: 'placeholder="Add a city…" aria-label="Cities (medium)"' })}${box({ size: 'lg', tags: ['Osaka', 'Tokyo'], input: 'placeholder="Add a city…" aria-label="Cities (large)"' })}</div>`, 'Chips are 20 / 24 / 28px tall and the box keeps the control height as its minimum.'),
    ex('Invalid', box({ tags: ['aisha.khan@lumen.co'], input: 'value="noah.berg@lumen" aria-invalid="true" aria-label="Invite by email"', root: ' data-invalid' }) + `<p class="cn-text-body-sm" style="color:var(--cn-color-fg-danger);margin:var(--cn-space-1-5) 0 0">"noah.berg@lumen" is not a valid email address.</p>`, 'The box takes the danger border; the message names the bad value.'),
    ex('Disabled', box({ tags: ['lumen.co', 'lumen.dev'], input: 'disabled aria-label="Allowed domains"', removeAttrs: ' disabled' })),
  ],
  rules: [
    'Enter, comma and blur commit the typed text as a chip; Backspace on an empty field removes the last chip; pasting "a, b, c" creates three chips.',
    'Validate at commit time, not per keystroke: a bad value stays as text in the field with the invalid state and a message that quotes it.',
    'Chips show the value as typed (an email, a keyword), 1–4 words, never truncated; long values wrap to a new line instead.',
    'Clicking anywhere in the box focuses the field; the box, not the field, shows the focus ring.',
    'Set a maximum where one exists (seats, recipients) and say it in the helper text ("Up to 20 emails"); disable the field, not the remove buttons, when it is reached.',
    'Sizes: md in forms; sm in filter bars and dense panels; lg on onboarding screens.',
    'Never mix a TagsInput with a dropdown of suggestions in the same box; that is a MultiSelect.',
    'Width comes from the layout; never set a fixed width, and let the box grow in height as chips wrap.',
  ],
  a11y: [
    'The field has an accessible name (label for / aria-label); announce additions and removals in a visually hidden live region ("Added maya.chen@lumen.co, 4 recipients").',
    'Each remove button is a real <button> with aria-label "Remove {value}"; after removing, focus returns to the field.',
    'Chips themselves are not focusable; the keyboard interacts through the field (Backspace) and the remove buttons (Tab).',
    'When invalid, aria-invalid="true" on the field and aria-describedby pointing at the message id.',
  ],
  related: ['input', 'tag', 'multi-select', 'field', 'input-group'],
};
