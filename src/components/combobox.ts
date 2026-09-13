import type { ComponentSpec } from '../types.ts';
import { CONTROL, SIZE_PROP, ex, ICON, typeStyle } from './_shared.ts';

// the reference select / combobox: the Input ring on the field (36 / 40 / 44px), a 16px chevron
// (20px on lg) at the trailing edge, and the popover listbox — radius 8, white, shadow-lg with a 1px
// gray-200 ring, 4px vertical padding, rows of 36 / 40 / 44px with radius 6, 8px gap, medium label,
// muted supporting text, gray-50 highlight and a brand check on the right of the selected row.

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
  sm: { pl: '{space.3}', pr: '{space.2.5}', chevron: '{size.icon.sm}', icon: '{size.icon.sm}', lh: '{type.body-md.lineHeight}', rowPy: '{space.2}', listPx: '{space.1}', listMax: '224px', avatar: '{space.5}' },
  md: { pl: '{space.3}', pr: '{space.3}', chevron: '{size.icon.sm}', icon: '{size.icon.md}', lh: '{type.body-md.lineHeight}', rowPy: '{space.2}', listPx: '{space.1.5}', listMax: '{space.64}', avatar: '{space.6}' },
  lg: { pl: '{space.3.5}', pr: '{space.3.5}', chevron: '{size.icon.md}', icon: '{size.icon.md}', lh: '{type.body-lg.lineHeight}', rowPy: '{space.2.5}', listPx: '{space.1.5}', listMax: '320px', avatar: '{space.6}' },
} as const;

const sizeBlock = (s: 'sm' | 'md' | 'lg') => ({
  input: {
    height: CONTROL[s].height,
    'padding-inline-start': SIZE[s].pl,
    'padding-inline-end': `calc(${SIZE[s].pr} + ${SIZE[s].chevron} + {space.2})`,
    'font-size': CONTROL[s].font,
    'line-height': SIZE[s].lh,
  },
  icon: { width: SIZE[s].chevron, height: SIZE[s].chevron, top: `calc((${CONTROL[s].height} - ${SIZE[s].chevron}) / 2)`, 'inset-inline-end': SIZE[s].pr },
  'leading-icon': { width: SIZE[s].icon, height: SIZE[s].icon, top: `calc((${CONTROL[s].height} - ${SIZE[s].icon}) / 2)`, 'inset-inline-start': SIZE[s].pl },
  listbox: { 'padding-inline': SIZE[s].listPx, 'max-height': SIZE[s].listMax },
  option: { height: CONTROL[s].height, 'padding-block': SIZE[s].rowPy, 'font-size': CONTROL[s].font, 'line-height': SIZE[s].lh },
  'option-icon': { width: SIZE[s].icon, height: SIZE[s].icon },
  'option-check': { width: SIZE[s].icon, height: SIZE[s].icon },
  'option-avatar': { width: SIZE[s].avatar, height: SIZE[s].avatar },
  'option-supporting': { 'font-size': CONTROL[s].font, 'margin-inline-start': s === 'sm' ? '{space.1.5}' : '{space.2}' },
});

const chevron = ICON.chevronDown.replace('cn-icon', 'cn-combobox__icon');
const check = ICON.check.replace('cn-icon', 'cn-combobox__option-check');
const leading = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-combobox__leading-icon');
const optIcon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-combobox__option-icon');
const AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";
const avatar = `<img class="cn-combobox__option-avatar" src="${AVATAR}" alt="">`;

const option = (id: string, label: string, attrs = '', before = '', supporting = '') =>
  `<li class="cn-combobox__option" role="option" id="${id}" ${attrs}>${before}${label}${supporting ? `<span class="cn-combobox__option-supporting">${supporting}</span>` : ''}${check}</li>`;

const box = (attrs: { root: string; input: string; id: string; body?: string; leading?: string }) =>
  `<div class="cn-combobox" ${attrs.root}>${attrs.leading ?? ''}<input class="cn-combobox__input" type="text" role="combobox" aria-autocomplete="list" aria-controls="${attrs.id}-list" ${attrs.input}>${chevron}<ul class="cn-combobox__listbox" role="listbox" id="${attrs.id}-list">${attrs.body ?? ''}</ul></div>`;

const PEOPLE = [
  ['maya', 'Maya Chen', 'Design'],
  ['daniel', 'Daniel Costa', 'Product'],
  ['sofia', 'Sofia Almeida', 'Research'],
  ['lucas', 'Lucas Ferreira', 'Engineering'],
] as const;

export const combobox: ComponentSpec = {
  name: 'Combobox',
  slug: 'combobox',
  category: 'forms',
  description: 'Text input that filters a list: an Input-ringed field with a trailing chevron and the reference popover listbox under it (radius 8, shadow-lg, 1px ring, 4px padding) whose rows are 36 / 40 / 44px with a gray-50 highlight and a brand check on the selected one.',
  usage: 'Choose one item from a long, searchable or user-generated list (people, workspaces, countries), or when rows need an avatar, icon or supporting text. For 5–15 plain options use Select; for free text with suggestions keep the Input; for multiple picks use a TagInput. Pair with Field for the label.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Wrapper (position: relative) that holds the input, the chevron and the listbox. Carries data-state="open|closed", data-invalid, data-disabled.' },
    { part: 'leading-icon', element: 'svg', description: 'Optional leading icon (16px on sm, 20px on md and lg) at the padding edge in gray-500; the text starts 8px after it. Decorative.', optional: true },
    { part: 'input', element: 'input', description: 'The text field with role="combobox": the Input ring, radius 8, shadow-xs; the trailing padding reserves room for the chevron.' },
    { part: 'icon', element: 'svg', description: 'Chevron-down, 16px (20px on lg), gray-500, absolutely placed 10 / 12 / 14px from the trailing edge; rotates 180° when open. Decorative, pointer-events: none.' },
    { part: 'listbox', element: 'ul', description: 'The popover: white, radius 8, shadow-lg with a 1px gray-200 ring, 4px vertical padding (4–6px horizontal), 4px under the input, scrolls after 224 / 256 / 320px. Hidden unless data-state="open".' },
    { part: 'option', element: 'li', description: 'One row: 36 / 40 / 44px, radius 6, padding 8px 10px 8px 8px, 8px gap, medium label. role="option" with a unique id, aria-selected and optional data-highlighted / aria-disabled.' },
    { part: 'option-icon', element: 'svg', description: 'Optional leading icon in the row (16px on sm, 20px on md and lg), gray-500.', optional: true },
    { part: 'option-avatar', element: 'img', description: 'Optional round avatar before the label (20px on sm, 24px on md and lg).', optional: true },
    { part: 'option-supporting', element: 'span', description: 'Optional muted text after the label (email, team, price), same size, regular weight.', optional: true },
    { part: 'option-check', element: 'svg', description: 'Check icon (16 / 20px) pushed to the right of the row in the brand color, shown only when aria-selected="true".' },
    { part: 'empty', element: 'li', description: 'Muted "No results" row rendered instead of options when the filter matches nothing.', optional: true },
  ],
  props: {
    size: SIZE_PROP(['sm', 'md', 'lg']),
  },
  states: {
    hover: { selector: ':hover:not([data-disabled])', description: 'Pointer over the field. The reference has no hover change; presets with a distinct border-control-hover strengthen the ring.', markup: 'native' },
    focus: { selector: ':focus-within', description: 'The inset ring turns to the brand color and the 4px brand focus ring appears. Focus never leaves the input while the list is open.', markup: 'native :focus-within on the root' },
    open: { selector: '[data-state="open"]', description: 'The listbox is visible under the input and the chevron points up.', markup: 'data-state="open" on the root and aria-expanded="true" on the input' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Red-300 ring; red focus ring on focus. Always accompanied by a Field error.', markup: 'aria-invalid="true" on the input, or data-invalid on the root' },
    disabled: { selector: '[data-disabled], &:has(input:disabled)', description: 'Whole control at 50% opacity, cursor not-allowed.', markup: 'disabled on the input' },
    highlighted: { selector: '[data-highlighted]', description: 'On the __option (not the root): the row under the keyboard cursor or pointer gets the gray-50 fill. Exactly one at a time.', markup: 'data-highlighted on the option; mirror it with aria-activedescendant on the input' },
    selected: { selector: '[aria-selected="true"]', description: 'On the __option: the current value, gray-50 fill with the brand check at the end.', markup: 'aria-selected="true" on the option' },
    'option-disabled': { selector: '[aria-disabled="true"]', description: 'On the __option: not selectable, 50% opacity, cursor not-allowed, skipped by the keyboard.', markup: 'aria-disabled="true" on the option' },
  },
  base: {
    root: { position: 'relative', display: 'block', width: '100%', 'min-width': '0', color: '{color.fg-default}' },
    'leading-icon': { position: 'absolute', color: '{color.fg-subtle}', 'pointer-events': 'none' },
    input: {
      display: 'block',
      width: '100%',
      'min-width': '0',
      margin: '0',
      'padding-block': '0',
      border: '0',
      ...typeStyle('body-md'),
      'background-color': '{color.bg-surface}',
      'border-radius': '{radius.control}',
      'box-shadow': RING_REST,
      color: '{color.fg-default}',
      outline: 'none',
      ...TRANSITION_FAST,
    },
    icon: {
      position: 'absolute',
      color: '{color.fg-subtle}',
      'stroke-width': '2.25',
      'pointer-events': 'none',
      'transition-property': 'transform, color',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    listbox: {
      display: 'none',
      margin: '{space.1} 0 0',
      'padding-block': '{space.1}',
      'overflow-x': 'hidden',
      'overflow-y': 'auto',
      'background-color': '{color.bg-surface}',
      'border-radius': '{radius.panel}',
      'box-shadow': `{shadow.lg}, ${ring('{color.border-default}')}`,
      'list-style': 'none',
      'z-index': '{z.dropdown}',
    },
    option: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.2}',
      'margin-block': '{space.px}',
      'padding-inline': '{space.2} {space.2.5}',
      'border-radius': '{radius.md}',
      ...typeStyle('body-md'),
      'font-weight': '{font.weight.medium}',
      color: '{color.fg-default}',
      'white-space': 'nowrap',
      overflow: 'hidden',
      cursor: 'pointer',
      'user-select': 'none',
      outline: 'none',
      ...TRANSITION_FAST,
    },
    'option-icon': { 'flex-shrink': '0', color: '{color.fg-subtle}' },
    'option-avatar': { 'flex-shrink': '0', 'border-radius': '{radius.full}', 'object-fit': 'cover', 'max-width': 'none', 'background-color': '{color.bg-muted}' },
    'option-supporting': { 'font-weight': '{font.weight.regular}', color: '{color.fg-muted}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    'option-check': { display: 'none', 'margin-inline-start': 'auto', 'flex-shrink': '0', color: '{brand.600}', 'stroke-width': '2' },
    empty: { display: 'block', 'padding-block': '{space.2}', 'padding-inline': '{space.2.5}', ...typeStyle('body-md'), color: '{color.fg-muted}' },
    '@states': {
      hover: { input: { 'box-shadow': RING_HOVER } },
      focus: { input: { 'box-shadow': RING_FOCUS } },
      open: { listbox: { display: 'block' }, icon: { transform: 'rotate(180deg)' } },
      invalid: { input: { 'box-shadow': RING_INVALID } },
      disabled: { root: { cursor: 'not-allowed' }, input: { opacity: '{opacity.disabled}', cursor: 'not-allowed' }, icon: { opacity: '{opacity.disabled}' }, 'leading-icon': { opacity: '{opacity.disabled}' } },
    },
  },
  variants: {
    size: { sm: sizeBlock('sm'), md: sizeBlock('md'), lg: sizeBlock('lg') },
  },
  extraCss: `
.cn-combobox .cn-combobox__input::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-combobox[data-invalid]:focus-within .cn-combobox__input, .cn-combobox:has([aria-invalid="true"]):focus-within .cn-combobox__input { box-shadow: ${RING_INVALID_FOCUS}; }
.cn-combobox .cn-combobox__leading-icon + .cn-combobox__input { padding-inline-start: calc({space.3} + {size.icon.md} + {space.2}); }
.cn-combobox[data-size="sm"] .cn-combobox__leading-icon + .cn-combobox__input { padding-inline-start: calc({space.3} + {size.icon.sm} + {space.2}); }
.cn-combobox[data-size="lg"] .cn-combobox__leading-icon + .cn-combobox__input { padding-inline-start: calc({space.3.5} + {size.icon.md} + {space.2}); }
.cn-combobox .cn-combobox__option[data-highlighted], .cn-combobox .cn-combobox__option:hover, .cn-combobox .cn-combobox__option[aria-selected="true"] { background-color: {color.bg-subtle}; }
.cn-combobox .cn-combobox__option[aria-selected="true"] .cn-combobox__option-check { display: block; }
.cn-combobox .cn-combobox__option[aria-disabled="true"] { opacity: {opacity.disabled}; cursor: not-allowed; background-color: transparent; }
.cn-combobox .cn-combobox__option:focus-visible { box-shadow: inset 0 0 0 2px {brand.500}; }`,
  examples: [
    ex('Closed (default)', box({ root: 'data-size="md" data-state="closed" style="max-width:320px"', input: 'aria-expanded="false" placeholder="Search people…" aria-label="Assignee"', id: 'cb-assignee' }), 'The Input ring, radius 8 and shadow-xs; a 16px gray-500 chevron 12px from the edge.'),
    ex('Open with options', box({
      root: 'data-size="md" data-state="open" style="max-width:320px"',
      input: 'aria-expanded="true" value="a" aria-label="Assignee" aria-activedescendant="cb-owner-daniel"',
      id: 'cb-owner',
      body: PEOPLE.map(([id, name, team], i) => option(`cb-owner-${id}`, name, i === 0 ? 'aria-selected="true"' : i === 1 ? 'aria-selected="false" data-highlighted' : 'aria-selected="false"', avatar, team)).join('') + option('cb-owner-aisha', 'Aisha Khan', 'aria-selected="false" aria-disabled="true"', avatar, 'On leave'),
    }), 'Maya is the current value (gray-50 fill and brand check), Daniel is highlighted by the keyboard, Aisha is disabled. Rows are 40px with 24px avatars and muted supporting text.'),
    ex('With leading icon and icons in rows', box({
      root: 'data-size="md" data-state="open" style="max-width:320px"',
      input: 'aria-expanded="true" value="" placeholder="Choose a view" aria-label="View"',
      id: 'cb-view',
      leading: leading('search'),
      body: option('cb-view-inbox', 'Inbox', 'aria-selected="true"', optIcon('inbox')) + option('cb-view-cal', 'Calendar', 'aria-selected="false"', optIcon('calendar')) + option('cb-view-people', 'People', 'aria-selected="false"', optIcon('user')),
    })),
    ex('Open, no results', box({
      root: 'data-size="md" data-state="open" style="max-width:320px"',
      input: 'aria-expanded="true" value="Zorbo" aria-label="Workspace"',
      id: 'cb-workspace',
      body: '<li class="cn-combobox__empty" role="presentation">No results for “Zorbo”</li>',
    })),
    ex('Sizes', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-4)">${box({ root: 'data-size="sm" data-state="open" style="max-width:280px"', input: 'aria-expanded="true" value="" placeholder="Small · 36px" aria-label="Small"', id: 'cb-sm', body: option('cb-sm-1', 'Sofia Almeida', 'aria-selected="true"') + option('cb-sm-2', 'Lucas Ferreira', 'aria-selected="false"') })}${box({ root: 'data-size="lg" data-state="open" style="max-width:360px"', input: 'aria-expanded="true" value="" placeholder="Large · 44px" aria-label="Large"', id: 'cb-lg', body: option('cb-lg-1', 'Noah Berg', 'aria-selected="true"') + option('cb-lg-2', 'Aisha Khan', 'aria-selected="false"') })}</div>`, 'Field and rows share the height: 36 / 40 / 44px. Text is 16px on lg; the chevron and check grow to 20px.'),
    ex('Invalid', box({ root: 'data-size="md" data-state="closed" style="max-width:320px"', input: 'aria-expanded="false" value="Lumen Labs" aria-invalid="true" aria-label="Workspace"', id: 'cb-invalid' }), 'Pair with a Field error such as "Pick a workspace from the list".'),
    ex('Disabled', box({ root: 'data-size="md" data-state="closed" style="max-width:320px"', input: 'aria-expanded="false" value="Europe (Frankfurt)" disabled aria-label="Data region"', id: 'cb-region' })),
  ],
  rules: [
    'Use a Combobox when the list is long (more than 15), user-generated, needs search, or when rows need an avatar, icon or supporting text; otherwise a Select. Typing filters the list; the value is always one of the options.',
    'The listbox renders in the flow 4px under the input inside the root. Toggle data-state="open|closed" on the root; the app moves it to a popper layer only when it would be clipped.',
    'Rows are 36 / 40 / 44px (same as the field) with radius 6 and one line of text. Show at most 5–7 before scrolling (224 / 256 / 320px).',
    'Exactly one option is highlighted at a time (data-highlighted) and follows keyboard and pointer; the selected one has aria-selected="true", the gray-50 fill and the brand check on the right.',
    'When nothing matches, render the empty row ("No results for “…”"), never an empty panel and never close the list.',
    'The chevron rotates when open. An optional clear (×) button goes before the chevron and appears only when there is a value.',
    'Placeholder is an instruction with an ellipsis ("Search people…"); the label lives in the Field.',
    'Never use a Combobox for multiple picks; that is a TagInput.',
  ],
  a11y: [
    'The input has role="combobox", aria-expanded, aria-controls="<listbox id>", aria-autocomplete="list" and aria-activedescendant pointing at the highlighted option id.',
    'The list has role="listbox"; each option has role="option", a unique id and aria-selected. Disabled options use aria-disabled="true" and are skipped by the keyboard.',
    'Keyboard: Down/Up move the highlight, Enter selects, Escape closes and restores the previous value, Home/End jump. Focus stays on the input the whole time.',
    'Announce the result count in a visually hidden live region ("4 results") whenever the filtered list changes.',
    'When invalid, aria-invalid="true" on the input and aria-describedby pointing at the Field error id.',
  ],
  related: ['select', 'input', 'field', 'menu', 'command-palette'],
};
