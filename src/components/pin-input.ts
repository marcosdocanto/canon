import type { ComponentSpec } from '../types.ts';
import { TRANSITION_COLORS, SIZE_PROP, ex, typeStyle } from './_shared.ts';

// One-time-code entry: a row of square cells, one character each, the digit painted in the action
// color at display size. Cells are square: 48 / 64 / 80px; type is heading-xl / display-md / display-lg
// (the closest composite styles to the reference's display sizes).

const SIZES = {
  sm: { box: '{space.12}', type: 'heading-xl', separator: 'heading-md' },
  md: { box: '{space.16}', type: 'display-md', separator: 'heading-lg' },
  lg: { box: '{space.20}', type: 'display-lg', separator: 'heading-xl' },
} as const;

const cell = (i: number, total: number, value = '', attrs = '') =>
  `<input class="cn-pin-input__cell" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" placeholder="0"${i === 1 ? ' autocomplete="one-time-code"' : ''} aria-label="Digit ${i} of ${total}"${value ? ` value="${value}" data-filled` : ''}${attrs}>`;
const SEP = '<span class="cn-pin-input__separator" aria-hidden="true">-</span>';
const pin = (attrs: string, digits: string[], separatorAfter = 0, cellAttrs = '') =>
  `<div class="cn-pin-input" ${attrs} role="group" aria-label="Verification code">${digits.map((d, i) => cell(i + 1, digits.length, d, cellAttrs) + (separatorAfter && i + 1 === separatorAfter ? SEP : '')).join('')}</div>`;

export const pinInput: ComponentSpec = {
  name: 'PinInput',
  slug: 'pin-input',
  category: 'forms',
  description: 'A row of square one-character cells for a verification code. Each cell is a native input with a "0" placeholder; the typed digit renders large, centered, in the action color. Focus moves cell to cell.',
  usage: 'Use for one-time passcodes, 2FA codes and short confirmation codes (4 or 6 digits) sent by email or SMS. Not for phone numbers, card numbers or anything the user copies from a document: use Input with inputmode there.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The row (flex, gap space.2). role="group" with an aria-label; carries data-size, data-length, data-invalid, data-disabled.' },
    { part: 'cell', element: 'input', description: 'One <input maxlength="1" inputmode="numeric">: square, centered display text in fg-action, hairline, radius lg, shadow-xs. Set data-filled once it holds a character.' },
    { part: 'separator', element: 'span', description: 'A muted "-" between the two halves of a 6-digit code. aria-hidden.', optional: true },
  ],
  props: {
    size: SIZE_PROP(['sm', 'md', 'lg']),
    length: { values: ['4', '6'], default: '6', description: '4 = short codes (app confirmations, kiosk PINs), rendered as one group with a wider gap; 6 = the common SMS / authenticator code, rendered as two groups of three with a separator between them.' },
  },
  states: {
    focus: { selector: ' .cn-pin-input__cell:focus', description: 'On the __cell (not the root): the focused cell shows the action border and the ring. Styled in extraCss because it lives on a child.', markup: 'native :focus on a cell' },
    filled: { selector: ' .cn-pin-input__cell[data-filled]', description: 'On the __cell: the cell holds a character; the border strengthens so the progress is visible at a glance. Styled in extraCss.', markup: 'data-filled on the cell (set it whenever value is not empty)' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Wrong or expired code: every cell takes the danger border, the focused cell the danger ring. Pair with a message under the row.', markup: 'aria-invalid="true" on the cells, or data-invalid on the root' },
    disabled: { selector: '[data-disabled], &:has(input:disabled)', description: 'While the code is being verified or after too many attempts: grey cells, disabled text, cursor not-allowed.', markup: 'disabled on the cells' },
  },
  base: {
    root: { display: 'inline-flex', 'align-items': 'center', gap: '{space.2}', 'max-width': '100%' },
    cell: {
      'box-sizing': 'border-box',
      'flex-shrink': '1',
      'min-width': '0',
      'aspect-ratio': '1',
      margin: '0',
      padding: '0',
      'text-align': 'center',
      ...typeStyle('display-md'),
      'line-height': '{font.lineHeight.none}',
      color: '{color.fg-action}',
      'caret-color': '{color.fg-action}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-control}',
      'border-radius': '{radius.lg}',
      'box-shadow': '{shadow.xs}',
      outline: 'none',
      ...TRANSITION_COLORS,
    },
    separator: {
      'flex-shrink': '0',
      'padding-inline': '{space.1}',
      ...typeStyle('heading-lg'),
      'line-height': '{font.lineHeight.none}',
      color: '{color.fg-placeholder}',
      'user-select': 'none',
    },
    '@states': {
      invalid: { cell: { 'border-color': '{color.border-danger}' } },
      disabled: {
        root: { cursor: 'not-allowed' },
        cell: { 'background-color': '{color.bg-disabled}', color: '{color.fg-disabled}', 'border-color': '{color.border-disabled}', 'box-shadow': 'none', cursor: 'not-allowed' },
        separator: { color: '{color.fg-disabled}' },
      },
    },
  },
  variants: {
    size: Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, {
      cell: { width: v.box, height: 'auto', ...typeStyle(v.type), 'line-height': '{font.lineHeight.none}' },
      separator: { ...typeStyle(v.separator), 'line-height': '{font.lineHeight.none}' },
    }])),
    length: {
      '4': { root: { gap: '{space.3}' } },
      '6': { root: { gap: '{space.2}' } },
    },
  },
  extraCss: `
.cn-pin-input .cn-pin-input__cell::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-pin-input .cn-pin-input__cell::-webkit-outer-spin-button, .cn-pin-input .cn-pin-input__cell::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.cn-pin-input .cn-pin-input__cell[data-filled] { border-color: {color.border-strong}; }
.cn-pin-input .cn-pin-input__cell:focus { border-color: {color.border-action}; box-shadow: {shadow.focus}; outline: none; }
.cn-pin-input[data-invalid] .cn-pin-input__cell:focus, .cn-pin-input:has([aria-invalid="true"]) .cn-pin-input__cell:focus { border-color: {color.border-danger}; box-shadow: {shadow.focus-danger}; }
.cn-pin-input[data-invalid] .cn-pin-input__cell[data-filled], .cn-pin-input:has([aria-invalid="true"]) .cn-pin-input__cell[data-filled] { border-color: {color.border-danger}; }
@media (max-width: {breakpoint.sm}) {
  .cn-pin-input[data-length="6"] { gap: {space.1}; }
  .cn-pin-input .cn-pin-input__separator { padding-inline: 0; }
  .cn-pin-input[data-size] .cn-pin-input__cell { font-size: {font.size.2xl}; }
}`,
  examples: [
    ex('Six digits, half entered', pin('data-size="md" data-length="6"', ['4', '8', '2', '', '', ''], 3), 'Two groups of three with a separator. Filled cells carry data-filled; the empty ones show the "0" placeholder.'),
    ex('Four digits', pin('data-size="md" data-length="4"', ['', '', '', '']), 'A single group with a wider gap and no separator.'),
    ex('Complete', pin('data-size="md" data-length="6"', ['7', '3', '1', '9', '0', '5'], 3), 'All six cells filled: the form can submit automatically.'),
    ex('Sizes', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-4);align-items:flex-start">${pin('data-size="sm" data-length="4"', ['2', '6', '', ''])}${pin('data-size="md" data-length="4"', ['2', '6', '', ''])}${pin('data-size="lg" data-length="4"', ['2', '6', '', ''])}</div>`, '48 / 64 / 80px cells with heading-xl / display-md / display-lg digits.'),
    ex('Invalid', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-2);align-items:flex-start">${pin('data-size="md" data-length="6" data-invalid', ['4', '8', '2', '1', '1', '9'], 3, ' aria-invalid="true" aria-describedby="pin-error"')}<p class="cn-text-body-sm" id="pin-error" style="color:var(--cn-color-fg-danger);margin:0">That code has expired. We sent a new one to maya.chen@lumen.co.</p></div>`, 'Every cell takes the danger border; the message under the row says what to do next.'),
    ex('Disabled (verifying)', pin('data-size="md" data-length="6"', ['7', '3', '1', '9', '0', '5'], 3, ' disabled'), 'Locked while the code is checked; the digits stay visible.'),
  ],
  rules: [
    'One character per cell, numeric keyboard on mobile (inputmode="numeric", pattern="[0-9]*"), and autocomplete="one-time-code" on the first cell so the OS can offer the SMS code.',
    'Typing a digit moves focus to the next cell; Backspace on an empty cell moves back and clears the previous one; pasting a full code fills every cell at once.',
    'Submit automatically when the last cell is filled, and show the disabled state while verifying; never make the user press a button after typing six digits.',
    'Six digits are displayed as 3 + 3 with a separator; four digits as one group. Do not use other lengths or mix sizes in one form.',
    'Mark filled cells with data-filled so the border tells the progress without reading the digits.',
    'On error, keep the digits, set the invalid state and put a plain sentence under the row ("That code has expired. We sent a new one."). Clear the error on the next keystroke.',
    'Sizes: md on auth screens; sm inside dialogs and settings panels; lg only on a dedicated verification page.',
    'The digit is painted in the action color; the placeholder "0" in the placeholder color. Never dim the typed digit.',
  ],
  a11y: [
    'The root is role="group" with aria-label ("Verification code"); each cell has aria-label "Digit n of 6" so the position is announced.',
    'Cells are native inputs: focus, disabled and invalid come from the platform. Do not rebuild them with contenteditable divs.',
    'When invalid, set aria-invalid="true" on the cells and aria-describedby on the group (or the cells) pointing at the error message id.',
    'The separator is aria-hidden; it has no meaning beyond grouping.',
    'Focus ring appears on the focused cell only; moving focus programmatically must keep the ring visible.',
  ],
  related: ['input', 'field', 'input-group', 'number-input'],
};
