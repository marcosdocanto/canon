import type { ComponentSpec } from '../types.ts';
import { CONTROL, SIZE_PROP, ex, ICON, typeStyle } from './_shared.ts';

// the reference select trigger, measure for measure: 36 / 40 / 44px, padding 8px 10px 8px 12px (sm),
// 8×12 (md), 10×14 (lg); 14px text (16px on lg; the reference uses 16px on md too — we keep 14px
// as the default UI size); chevron 16px (20px on lg) in gray-500 at the trailing edge; 1px inset
// gray-300 ring under shadow-xs, radius 8; focus or open = brand ring; disabled = 50% opacity.

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

/** pl/pr = leading/trailing padding, icon = leading icon, chevron = trailing chevron size. */
const SIZE = {
  sm: { pl: '{space.3}', pr: '{space.2.5}', icon: '{size.icon.sm}', chevron: '{size.icon.sm}', lh: '{type.body-md.lineHeight}' },
  md: { pl: '{space.3}', pr: '{space.3}', icon: '{size.icon.md}', chevron: '{size.icon.sm}', lh: '{type.body-md.lineHeight}' },
  lg: { pl: '{space.3.5}', pr: '{space.3.5}', icon: '{size.icon.md}', chevron: '{size.icon.md}', lh: '{type.body-lg.lineHeight}' },
} as const;

const sizeBlock = (s: 'sm' | 'md' | 'lg') => ({
  root: { height: CONTROL[s].height },
  field: {
    'padding-inline-start': SIZE[s].pl,
    'padding-inline-end': `calc(${SIZE[s].pr} + ${SIZE[s].chevron} + {space.2})`,
    'font-size': CONTROL[s].font,
    'line-height': SIZE[s].lh,
  },
  icon: { width: SIZE[s].icon, height: SIZE[s].icon, 'inset-inline-start': SIZE[s].pl },
  chevron: { width: SIZE[s].chevron, height: SIZE[s].chevron, 'inset-inline-end': SIZE[s].pr },
});

const chevron = ICON.chevronDown.replace('cn-icon', 'cn-select__chevron');
const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-select__icon');
const sel = (attrs: string, options: string, size = 'md', variant = 'default', leading = '', style = 'max-width:280px') =>
  `<div class="cn-select" data-variant="${variant}" data-size="${size}" style="${style}">${leading}<select class="cn-select__field" ${attrs}>${options}</select>${chevron}</div>`;
const PEOPLE = '<option value="maya" selected>Maya Chen</option><option value="daniel">Daniel Costa</option><option value="sofia">Sofia Almeida</option><option value="lucas">Lucas Ferreira</option><option value="aisha">Aisha Khan</option><option value="noah">Noah Berg</option>';

export const select: ComponentSpec = {
  name: 'Select',
  slug: 'select',
  category: 'forms',
  description: 'Native <select> dressed as the reference select trigger: the Input ring, radius 8 and heights (36 / 40 / 44px), an optional leading icon and a gray-500 chevron at the trailing edge. The dropdown itself is the operating system menu.',
  usage: 'Choose one option from a short, known list (5–15 items: owner, plan, status, sort order). Under 5 options use Radio or SegmentedControl; for long or searchable lists, icons or supporting text in the rows, use Combobox; for multiple choices use Checkboxes. Pair with Field for label and hint.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Wrapper that draws the ring, background, radius, shadow-xs and the focus ring (:focus-within). Position: relative for the icon and chevron.' },
    { part: 'icon', element: 'svg', description: 'Optional leading icon (16px on sm, 20px on md and lg) absolutely placed at the padding edge in gray-500; the text starts 8px after it. Decorative, pointer-events: none.', optional: true },
    { part: 'field', element: 'select', description: 'The native <select> with appearance: none. Fills the wrapper; the trailing padding reserves room for the chevron.' },
    { part: 'chevron', element: 'svg', description: 'Chevron-down, 16px (20px on lg), gray-500, absolutely placed 10 / 12 / 14px from the trailing edge. Decorative, pointer-events: none.' },
  ],
  props: {
    size: SIZE_PROP(['sm', 'md', 'lg']),
    variant: { values: ['default', 'filled'], default: 'default', description: 'default = white with the gray-300 ring and shadow-xs (the reference trigger; forms); filled = gray-50 fill without ring or shadow until focus (toolbars, table filters, sort controls — no reference equivalent).' },
  },
  states: {
    hover: { selector: ':hover:not([data-disabled])', description: 'Pointer over the trigger. The reference has no hover change; presets with a distinct border-control-hover strengthen the ring.', markup: 'native' },
    focus: { selector: ':focus-within', description: 'Focused or open: the inset ring turns to the brand color and the 4px brand focus ring appears.', markup: 'native :focus-within on the wrapper' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Red-300 ring; red focus ring on focus. Always accompanied by a Field error.', markup: 'aria-invalid="true" on the select, or data-invalid on the wrapper' },
    disabled: { selector: '[data-disabled], &:has(select:disabled)', description: 'Whole control at 50% opacity, cursor not-allowed. Scoped to the <select> so a disabled placeholder <option> does not trigger it.', markup: 'disabled on the select' },
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
      appearance: 'none',
      '-webkit-appearance': 'none',
      flex: '1 1 auto',
      width: '100%',
      'min-width': '0',
      height: '100%',
      margin: '0',
      'padding-block': '0',
      border: '0',
      outline: 'none',
      background: 'transparent',
      'border-radius': '{radius.control}',
      ...typeStyle('body-md'),
      'font-weight': '{font.weight.medium}',
      color: 'inherit',
      cursor: 'pointer',
      'white-space': 'nowrap',
      'text-overflow': 'ellipsis',
    },
    icon: {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      'flex-shrink': '0',
      color: '{color.fg-subtle}',
      'pointer-events': 'none',
    },
    chevron: {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      'flex-shrink': '0',
      color: '{color.fg-subtle}',
      'stroke-width': '2.25',
      'pointer-events': 'none',
    },
    '@states': {
      hover: { root: { 'box-shadow': RING_HOVER } },
      focus: { root: { 'box-shadow': RING_FOCUS } },
      invalid: { root: { 'box-shadow': RING_INVALID } },
      disabled: { root: { opacity: '{opacity.disabled}', cursor: 'not-allowed' }, field: { cursor: 'not-allowed' } },
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
.cn-select .cn-select__field::-ms-expand { display: none; }
.cn-select .cn-select__field:has(option[value=""]:checked) { color: {color.fg-placeholder}; font-weight: {font.weight.regular}; }
.cn-select:has([aria-invalid="true"]):focus-within, .cn-select[data-invalid]:focus-within { box-shadow: ${RING_INVALID_FOCUS}; }
.cn-select .cn-select__icon + .cn-select__field { padding-inline-start: calc({space.3} + {size.icon.md} + {space.2}); }
.cn-select[data-size="sm"] .cn-select__icon + .cn-select__field { padding-inline-start: calc({space.3} + {size.icon.sm} + {space.2}); }
.cn-select[data-size="lg"] .cn-select__icon + .cn-select__field { padding-inline-start: calc({space.3.5} + {size.icon.md} + {space.2}); }`,
  examples: [
    ex('Default', sel('aria-label="Owner"', PEOPLE), '40px tall, 12px padding, medium text, 16px gray-500 chevron 12px from the edge.'),
    ex('Sizes', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-4)">${sel('aria-label="Owner (small)"', PEOPLE, 'sm')}${sel('aria-label="Owner (medium)"', PEOPLE, 'md')}${sel('aria-label="Owner (large)"', PEOPLE, 'lg')}</div>`, '36 / 40 / 44px; the chevron grows to 20px and the padding to 14px on lg.'),
    ex('With leading icon', sel('aria-label="Assignee"', PEOPLE, 'md', 'default', icon('user')), 'A 20px gray-500 icon at the padding edge; the text starts 8px after it.'),
    ex('With placeholder option', sel('aria-label="Plan"', '<option value="" selected disabled>Select a plan</option><option value="starter">Starter — $29/mo</option><option value="team">Team — $99/mo</option><option value="scale">Scale — $299/mo</option>'), 'An empty-value disabled option renders in the placeholder color at regular weight.'),
    ex('Filled, small (toolbar sort)', sel('aria-label="Sort by"', '<option value="recent" selected>Sort: most recent</option><option value="name">Sort: name</option><option value="owner">Sort: owner</option>', 'sm', 'filled', '', 'max-width:200px')),
    ex('Invalid', sel('aria-invalid="true" aria-label="Region"', '<option value="" selected disabled>Select a region</option><option value="eu">Europe (Frankfurt)</option><option value="us">United States (Oregon)</option><option value="br">South America (São Paulo)</option>'), 'Pair with a Field error such as "Choose a region to continue".'),
    ex('Disabled', sel('disabled aria-label="Currency"', '<option value="usd" selected>USD — US dollar</option><option value="eur">EUR — Euro</option>')),
  ],
  rules: [
    'Use for 5–15 known options. Fewer: Radio or SegmentedControl (all options visible). More, or user-generated lists: Combobox with search.',
    'The first option is either a real default or a disabled placeholder with value="" ("Select a plan"); never "Select…" as a selectable option.',
    'Option labels are nouns in sentence case, 1–4 words; put the unit or price after an em dash ("Team — $99/mo").',
    'Always inside a Field with a visible label, except sort/filter selects in a toolbar (variant="filled", size="sm") whose label is in the option text ("Sort: most recent").',
    'Width comes from the layout; set max-width on the Field for short values (currency, region).',
    'Sizes: md (40px) in forms; sm (36px) in toolbars and tables; lg (44px) on marketing and auth screens. Never change the height with padding.',
    'Keep the native <select>. If the menu needs search, avatars, supporting text or groups with headers, use Combobox.',
  ],
  a11y: [
    'Every select has an accessible name: a <label for> from the Field or aria-label for toolbar selects.',
    'Use <optgroup label> for grouped options instead of fake heading options.',
    'aria-invalid="true" plus aria-describedby pointing at the Field error id when invalid.',
    'The icon and chevron are aria-hidden and pointer-events: none; the select itself receives the click and the keyboard (Alt+Down / typing to jump).',
  ],
  related: ['input', 'field', 'combobox', 'radio', 'segmented-control'],
};
