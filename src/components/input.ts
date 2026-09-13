import type { ComponentSpec } from '../types.ts';
import { CONTROL, SIZE_PROP, ex, ICON, typeStyle } from './_shared.ts';

// the reference text field, measure for measure: 36 / 40 / 44px tall, padding 8×12 (sm, md) and
// 10×14 (lg), 14px text (16px on lg; the reference also uses 16px on md — we keep 14px as the
// default UI size), a 1px inset gray-300 ring under shadow-xs, radius 8, 100ms linear transitions.
// Focus = brand ring, invalid = red-300 ring (red focus ring), disabled = whole control at 50%.

const TRANSITION_FAST = {
  'transition-property': 'box-shadow, background-color, color, opacity',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
/** the reference draws the border as a 1px inset ring so it never changes layout and stacks with shadow-xs. */
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const RING_REST = `${ring('{color.border-control}')}, {shadow.xs}`;
const RING_HOVER = `${ring('{color.border-control-hover}')}, {shadow.xs}`;
const RING_FOCUS = `${ring('{color.border-action}')}, {shadow.xs}, {shadow.focus}`;
const RING_INVALID = `${ring('{color.border-danger}')}, {shadow.xs}`;
const RING_INVALID_FOCUS = `${ring('{color.border-danger}')}, {shadow.xs}, {shadow.focus-danger}`;

/** px = horizontal padding, icon = leading icon size, pr = right inset of the shortcut chip. */
const SIZE = {
  sm: { px: '{space.3}', icon: '{size.icon.sm}', pr: '{space.1.5}', lh: '{type.body-md.lineHeight}' },
  md: { px: '{space.3}', icon: '{size.icon.md}', pr: '{space.2}', lh: '{type.body-md.lineHeight}' },
  lg: { px: '{space.3.5}', icon: '{size.icon.md}', pr: '{space.2.5}', lh: '{type.body-lg.lineHeight}' },
} as const;

const sizeBlock = (s: 'sm' | 'md' | 'lg') => ({
  root: { height: CONTROL[s].height },
  field: { 'padding-inline': SIZE[s].px, 'font-size': CONTROL[s].font, 'line-height': SIZE[s].lh },
  affix: { 'font-size': CONTROL[s].font, 'padding-inline-start': SIZE[s].px, 'padding-inline-end': s === 'sm' ? '{space.1.5}' : '{space.2}' },
  icon: { width: SIZE[s].icon, height: SIZE[s].icon, 'margin-inline-start': SIZE[s].px },
  tooltip: { 'margin-inline-end': SIZE[s].px },
  shortcut: { 'margin-inline-end': SIZE[s].pr },
});

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-input__icon');
const help = `<button type="button" class="cn-input__tooltip" aria-label="More information">${ICON.info}</button>`;
const shortcut = (keys = '⌘K') => `<span class="cn-input__shortcut" aria-hidden="true">${keys}</span>`;
const inp = (attrs: string, size = 'md', variant = 'default', before = '', after = '', style = 'max-width:320px') =>
  `<div class="cn-input" data-variant="${variant}" data-size="${size}" style="${style}">${before}<input class="cn-input__field" ${attrs}>${after}</div>`;
const row = (...items: string[]) => `<div style="display:flex;flex-direction:column;gap:var(--cn-space-4)">${items.join('')}</div>`;

export const input: ComponentSpec = {
  name: 'Input',
  slug: 'input',
  category: 'forms',
  description: 'Single-line text field: a white wrapper with a 1px gray-300 inset ring and shadow-xs, radius 8, 36 / 40 / 44px tall. Optional leading icon, inline prefix or suffix, a trailing help icon (tooltip) and a keyboard-shortcut chip. The wrapper carries the ring; the native input is bare.',
  usage: 'Free text, numbers, email, search, URLs. Pair with Field for label + hint + error. For choices use Select or Combobox; for multi-line text use Textarea.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Wrapper that draws the ring, background, radius, shadow-xs and the focus ring (:focus-within). Flex row, height from size.' },
    { part: 'icon', element: 'svg', description: 'Optional leading icon (search, mail): 16px on sm, 20px on md and lg, gray-500, inset by the horizontal padding; the text starts 8px after it (36 / 40 / 42px from the edge). Decorative.', optional: true },
    { part: 'affix', element: 'span', description: 'Optional inline prefix or suffix text ("https://", "USD", "kg") in the muted color, no fill and no rule: padded 12px on the outside (14px on lg) and 6–8px next to the text.', optional: true },
    { part: 'field', element: 'input', description: 'The native <input>. No border, no outline, fills the wrapper; padding 12px (14px on lg) on each side.' },
    { part: 'tooltip', element: 'button', description: 'Optional trailing 16px help icon that opens a Tooltip on hover/focus (aria-label = the tooltip text). Gray-500, darker on hover. When the field is invalid the same slot shows the alert icon in the danger color.', optional: true },
    { part: 'shortcut', element: 'span', description: 'Optional keyboard-shortcut chip at the trailing edge ("⌘K"): 12px medium gray-500 on white, 1px gray-200 ring, radius 4, padding 1px 4px, 6 / 8 / 10px from the edge. aria-hidden; hidden under 768px.', optional: true },
  ],
  props: {
    size: SIZE_PROP(['sm', 'md', 'lg']),
    variant: { values: ['default', 'filled'], default: 'default', description: 'default = white with the gray-300 ring and shadow-xs (the reference input; forms, dialogs, settings); filled = gray-50 fill without ring or shadow until focus, for dense toolbars and table filters (no reference equivalent).' },
  },
  states: {
    hover: { selector: ':hover:not([data-disabled])', description: 'Pointer over the field. The reference has no hover change; presets with a distinct border-control-hover strengthen the ring.', markup: 'native' },
    focus: { selector: ':focus-within', description: 'The inset ring turns to the brand color and the 4px brand focus ring appears around the wrapper (never on the input itself).', markup: 'native :focus-within on the wrapper' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Red-300 ring; on focus the ring stays red and the focus ring turns red. The help slot shows the alert icon in the danger color. Always accompanied by a Field error.', markup: 'aria-invalid="true" on the input, or data-invalid on the wrapper' },
    disabled: { selector: '[data-disabled], &:has(:disabled)', description: 'Whole control at 50% opacity, cursor not-allowed, same fill and ring.', markup: 'disabled on the input' },
    readonly: { selector: ':has([readonly])', description: 'Looks like default; text stays selectable and the focus ring still shows.', markup: 'readonly on the input' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'align-items': 'center',
      width: '100%',
      'min-width': '0',
      'background-color': '{color.bg-surface}',
      'border-radius': '{radius.control}',
      'box-shadow': RING_REST,
      color: '{color.fg-default}',
      ...TRANSITION_FAST,
    },
    field: {
      flex: '1 1 auto',
      'min-width': '0',
      height: '100%',
      margin: '0',
      'padding-block': '0',
      border: '0',
      outline: 'none',
      background: 'transparent',
      'box-shadow': 'none',
      ...typeStyle('body-md'),
      color: 'inherit',
    },
    icon: { 'flex-shrink': '0', color: '{color.fg-subtle}', 'pointer-events': 'none' },
    affix: {
      display: 'flex',
      'align-items': 'center',
      'align-self': 'stretch',
      'flex-shrink': '0',
      ...typeStyle('body-md'),
      color: '{color.fg-muted}',
      'white-space': 'nowrap',
      'user-select': 'none',
    },
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
      ...TRANSITION_FAST,
    },
    shortcut: {
      display: 'inline-flex',
      'align-items': 'center',
      'flex-shrink': '0',
      padding: '{space.px} {space.1}',
      'border-radius': '{radius.sm}',
      ...typeStyle('label-xs'),
      color: '{color.fg-subtle}',
      'background-color': '{color.bg-surface}',
      'box-shadow': ring('{color.border-default}'),
      'white-space': 'nowrap',
      'user-select': 'none',
      'pointer-events': 'none',
    },
    '@states': {
      hover: { root: { 'box-shadow': RING_HOVER } },
      focus: { root: { 'box-shadow': RING_FOCUS } },
      invalid: { root: { 'box-shadow': RING_INVALID }, tooltip: { color: '{color.fg-danger}' } },
      disabled: { root: { opacity: '{opacity.disabled}', cursor: 'not-allowed' }, field: { cursor: 'not-allowed' }, tooltip: { cursor: 'not-allowed' } },
    },
  },
  variants: {
    variant: {
      default: { root: {} },
      filled: {
        root: { 'background-color': '{color.bg-subtle}', 'box-shadow': 'none' },
        '@states': {
          hover: { root: { 'background-color': '{color.bg-muted}', 'box-shadow': 'none' } },
          focus: { root: { 'background-color': '{color.bg-surface}', 'box-shadow': RING_FOCUS } },
          invalid: { root: { 'box-shadow': RING_INVALID } },
        },
      },
    },
    size: { sm: sizeBlock('sm'), md: sizeBlock('md'), lg: sizeBlock('lg') },
  },
  extraCss: `
.cn-input .cn-input__field::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-input .cn-input__field:-webkit-autofill { border-radius: {radius.control}; -webkit-text-fill-color: {color.fg-default}; }
.cn-input:has([aria-invalid="true"]):focus-within, .cn-input[data-invalid]:focus-within { box-shadow: ${RING_INVALID_FOCUS}; }
.cn-input .cn-input__icon + .cn-input__field { padding-inline-start: {space.2}; }
.cn-input .cn-input__affix + .cn-input__field { padding-inline-start: 0; }
.cn-input .cn-input__field + .cn-input__affix { padding-inline-start: {space.2}; }
.cn-input[data-size="sm"] .cn-input__field + .cn-input__affix { padding-inline-start: {space.1.5}; }
.cn-input[data-size="lg"] .cn-input__field + .cn-input__affix { padding-inline-end: {space.3.5}; }
.cn-input:has(> .cn-input__tooltip) .cn-input__field, .cn-input:has(> .cn-input__shortcut) .cn-input__field { padding-inline-end: {space.2}; }
.cn-input .cn-input__tooltip .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; stroke-width: 2.25; }
.cn-input .cn-input__tooltip:hover, .cn-input .cn-input__tooltip:focus-visible { color: {color.fg-muted}; }
.cn-input .cn-input__tooltip:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-input[data-invalid] .cn-input__tooltip:hover, .cn-input:has([aria-invalid="true"]) .cn-input__tooltip:hover { color: {color.fg-danger}; }
.cn-input .cn-input__field[type="search"]::-webkit-search-decoration, .cn-input .cn-input__field[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; }
@media (max-width: {breakpoint.md}) { .cn-input .cn-input__shortcut { display: none; } }`,
  examples: [
    ex('Default', inp('type="email" placeholder="maya@lumen.app" aria-label="Work email"'), '40px tall, 12px padding, gray-300 ring and shadow-xs, radius 8.'),
    ex('Sizes', row(inp('type="text" placeholder="Small · 36px" aria-label="Small"', 'sm'), inp('type="text" placeholder="Medium · 40px" aria-label="Medium"', 'md'), inp('type="text" placeholder="Large · 44px" aria-label="Large"', 'lg')), '36 / 40 / 44px. Text is 14px on sm and md, 16px on lg; padding grows to 14px on lg.'),
    ex('With leading icon', row(inp('type="search" placeholder="Search workspaces…" aria-label="Search"', 'md', 'default', icon('search')), inp('type="search" placeholder="Filter members…" aria-label="Filter members"', 'sm', 'default', icon('search'))), 'Icon 20px (16px on sm), gray-500, inset by the padding; the text starts 8px after it.'),
    ex('With prefix and suffix', row(inp('type="url" placeholder="lumen.app" aria-label="Website"', 'md', 'default', '<span class="cn-input__affix">https://</span>'), inp('type="number" value="2500" aria-label="Monthly budget"', 'md', 'default', '<span class="cn-input__affix">USD</span>', '<span class="cn-input__affix">/ month</span>')), 'Inline affixes in the muted color, no fill and no rule; the text follows 8px after a prefix.'),
    ex('With help icon and shortcut', row(inp('type="text" placeholder="Workspace name" aria-label="Workspace name" aria-describedby="in-help"', 'md', 'default', '', help), inp('type="search" placeholder="Search…" aria-label="Search"', 'md', 'default', icon('search'), shortcut())), 'The help icon (16px, gray-500) sits 12px from the edge and opens a Tooltip; the ⌘K chip sits 8px from the edge and hides under 768px.'),
    ex('Filled (toolbar)', inp('type="text" placeholder="Filter…" aria-label="Filter"', 'sm', 'filled', '', '', 'max-width:240px'), 'Gray-50 fill without a ring; the ring appears on focus.'),
    ex('Invalid', inp('type="email" value="maya@lumen" aria-invalid="true" aria-label="Work email" aria-describedby="in-err"', 'md', 'default', '', help), 'Red-300 ring; the help slot turns into the danger alert icon. Pair with a Field error such as "Enter a complete address".'),
    ex('Disabled', inp('type="text" value="Lumen Studio" disabled aria-label="Workspace"'), 'Same fill and ring at 50% opacity, cursor not-allowed.'),
  ],
  recipes: [
    ex('Search with shortcut in a topbar', `<div style="display:flex;align-items:center;gap:var(--cn-space-3);max-width:560px">${inp('type="search" placeholder="Search projects, people, files…" aria-label="Search"', 'md', 'default', icon('search'), shortcut(), 'flex:1 1 auto')}<button type="button" class="cn-button" data-variant="outline" data-size="md"><span class="cn-button__label">Filters</span></button></div>`, 'A search field with a leading icon and the ⌘K chip next to an outline button of the same height.'),
  ],
  rules: [
    'Always inside a Field with a visible label, except search inputs with a leading icon and a placeholder that says what is searched.',
    'Placeholder is an example, not a label ("maya@lumen.app", not "Email").',
    'Width comes from the layout (100% of the Field). Never set a fixed pixel width; use max-width on the Field for short values.',
    'Sizes: md (40px) in forms and dialogs; sm (36px) inside toolbars, tables and filters; lg (44px) on marketing and auth screens where 16px text is wanted.',
    'Never change the height by adding padding. Height comes only from size: 36 / 40 / 44px with 12 / 12 / 14px horizontal padding.',
    'The help icon opens a Tooltip and never replaces the hint; the shortcut chip is decorative and only appears on fields that really have a global shortcut.',
    'Error state must show a Field error under the input; the red ring and icon alone are not enough.',
    'On mobile the font-size must be ≥ 16px to prevent Safari zoom: use size lg or the pattern in DESIGN.md.',
  ],
  a11y: [
    'Every input has an accessible name: a <label for> from the Field, or aria-label for standalone search.',
    'aria-invalid="true" and aria-describedby pointing to the Field error id when invalid.',
    'The help icon is a real <button> with aria-label equal to the tooltip text; the shortcut chip is aria-hidden (announce the shortcut in the tooltip or hint).',
    'Keep native type attributes (email, url, number, search) for keyboards and validation.',
    'The focus ring shows on the wrapper through :focus-within; never remove it on the input without the wrapper replacement.',
  ],
  related: ['field', 'textarea', 'select', 'combobox', 'kbd', 'tooltip'],
};
