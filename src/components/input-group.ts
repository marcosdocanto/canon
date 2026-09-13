import type { ComponentSpec } from '../types.ts';
import { CONTROL, FOCUS_RING, TRANSITION_COLORS, SIZE_PROP, ex, ICON, typeStyle } from './_shared.ts';

// Input with addons on either side: a text prefix/suffix, a bare <select>, a leading icon or a
// trailing Button. The wrapper draws the one border, radius, shadow and focus ring; every addon
// is separated from the field by a hairline and inherits the wrapper's height.

const sizeBlock = (s: 'sm' | 'md' | 'lg') => ({
  root: { height: CONTROL[s].height, 'border-radius': CONTROL[s].radius },
  field: { 'padding-inline': CONTROL[s].px, 'font-size': CONTROL[s].font },
  addon: { 'font-size': CONTROL[s].font },
  select: { 'font-size': CONTROL[s].font },
  icon: { width: CONTROL[s].icon, height: CONTROL[s].icon, 'margin-inline-start': CONTROL[s].px },
});

const chevron = ICON.chevronDown.replace('cn-icon', 'cn-input-group__icon');
const search = ICON.search.replace('cn-icon', 'cn-input-group__icon');
const copyIcon = ICON.copy.replace('cn-icon', 'cn-button__icon');

const group = (inner: string, attrs = 'data-size="md"') => `<div class="cn-input-group" ${attrs} style="max-width:360px">${inner}</div>`;
const field = (attrs: string) => `<input class="cn-input-group__field" type="text" ${attrs}>`;
const addon = (text: string) => `<span class="cn-input-group__addon">${text}</span>`;
const select = (label: string, options: string[]) =>
  `<select class="cn-input-group__select" aria-label="${label}">${options.map((o, i) => `<option${i === 0 ? ' selected' : ''}>${o}</option>`).join('')}</select>${chevron}`;
const copyButton = `<button type="button" class="cn-button cn-input-group__button" data-variant="ghost" data-size="sm">${copyIcon}<span class="cn-button__label">Copy</span></button>`;

export const inputGroup: ComponentSpec = {
  name: 'InputGroup',
  slug: 'input-group',
  category: 'forms',
  description: 'An Input with addons attached to one or both ends: a muted text prefix or suffix ("https://", "USD"), a bare select, a leading icon or a trailing Button. One hairline box, one shadow, one focus ring around everything.',
  usage: 'Use when a fixed part of the value belongs to the field: a protocol, a domain, a unit, a currency or a region selector, or when a "Copy" action must sit inside the field. For a lone prefix text the Input affix is enough; for a numeric stepper use NumberInput; for tokens use TagsInput. Pair with Field for the label.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The bordered wrapper (flex, stretch). Draws background, hairline, radius, shadow-xs and the focus ring on :focus-within. Carries data-size, data-invalid, data-disabled.' },
    { part: 'icon', element: 'svg', description: 'Decorative 20px icon: a leading icon before the field, or the chevron that follows a select addon. aria-hidden, pointer-events none.', optional: true },
    { part: 'addon', element: 'span', description: 'Static text addon such as "https://" or "USD": fg-muted, padding-inline space.3, separated from the field by a hairline. Leading when placed before the field, trailing when after.', optional: true },
    { part: 'select', element: 'select', description: 'A bare native <select> used as an addon (currency, region, protocol), followed by an icon element that draws the chevron. Leading or trailing.', optional: true },
    { part: 'field', element: 'input', description: 'The native <input>: no border, no outline, fills the remaining width.' },
    { part: 'button', element: 'button', description: 'A trailing Button (class cn-button, variant ghost, size sm) that also carries this part so it loses its radius and stretches to the group height. One per group, always last.', optional: true },
  ],
  props: {
    size: SIZE_PROP(['sm', 'md', 'lg']),
  },
  states: {
    hover: { selector: ':hover:not([data-disabled])', description: 'Border strengthens on the whole group.', markup: 'native :hover' },
    focus: { selector: ':focus-within', description: 'Border becomes the action color and the ring appears around the whole group, whichever child has focus.', markup: 'native :focus-within on the wrapper' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'Danger border, danger ring on focus. Always accompanied by a Field error.', markup: 'aria-invalid="true" on the input, or data-invalid on the wrapper' },
    disabled: { selector: '[data-disabled], &:has(input:disabled)', description: 'Grey fill, disabled text on every addon, not interactive. The trailing Button keeps full opacity but takes the disabled color.', markup: 'disabled on the input (and on the button)' },
  },
  base: {
    root: {
      display: 'flex',
      'align-items': 'stretch',
      width: '100%',
      'min-width': '0',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-control}',
      color: '{color.fg-default}',
      'box-shadow': '{shadow.xs}',
      overflow: 'hidden',
      ...TRANSITION_COLORS,
    },
    field: {
      flex: '1 1 auto',
      'min-width': '0',
      height: '100%',
      margin: '0',
      border: '0',
      outline: 'none',
      background: 'transparent',
      ...typeStyle('body-md'),
      'line-height': '{font.lineHeight.none}',
      color: 'inherit',
    },
    addon: {
      display: 'flex',
      'align-items': 'center',
      'flex-shrink': '0',
      'padding-inline': '{space.3}',
      color: '{color.fg-muted}',
      'background-color': '{color.bg-surface}',
      'border-inline-end': '{border.width.thin} solid {color.border-control}',
      ...typeStyle('body-md'),
      'line-height': '{font.lineHeight.none}',
      'white-space': 'nowrap',
      'user-select': 'none',
    },
    select: {
      appearance: 'none',
      '-webkit-appearance': 'none',
      'flex-shrink': '0',
      'align-self': 'stretch',
      margin: '0',
      border: '0',
      outline: 'none',
      background: 'transparent',
      'padding-inline-start': '{space.3}',
      'padding-inline-end': 'calc({space.2.5} + {size.controlIcon.md} + {space.2.5})',
      ...typeStyle('body-md'),
      'line-height': '{font.lineHeight.none}',
      color: '{color.fg-muted}',
      cursor: 'pointer',
      'border-inline-end': '{border.width.thin} solid {color.border-control}',
      ...TRANSITION_COLORS,
    },
    button: {
      'align-self': 'stretch',
      height: 'auto',
      'flex-shrink': '0',
      'border-radius': '0',
      'padding-inline': '{space.3}',
      'border-inline-start': '{border.width.thin} solid {color.border-control}',
    },
    icon: { 'flex-shrink': '0', 'align-self': 'center', color: '{color.fg-subtle}', 'pointer-events': 'none' },
    '@states': {
      hover: { root: { 'border-color': '{color.border-control-hover}' } },
      focus: { root: { ...FOCUS_RING, 'border-color': '{color.border-action}' } },
      invalid: { root: { 'border-color': '{color.border-danger}' } },
      disabled: {
        root: { 'background-color': '{color.bg-disabled}', color: '{color.fg-disabled}', 'border-color': '{color.border-disabled}', 'box-shadow': 'none', cursor: 'not-allowed' },
        field: { cursor: 'not-allowed' },
        addon: { color: '{color.fg-disabled}', 'background-color': 'transparent', 'border-color': '{color.border-disabled}' },
        select: { color: '{color.fg-disabled}', cursor: 'not-allowed', 'border-color': '{color.border-disabled}' },
        button: { 'border-color': '{color.border-disabled}' },
        icon: { color: '{color.fg-disabled}' },
      },
    },
  },
  variants: {
    size: { sm: sizeBlock('sm'), md: sizeBlock('md'), lg: sizeBlock('lg') },
  },
  extraCss: `
.cn-input-group .cn-input-group__field::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-input-group:has([aria-invalid="true"]):focus-within, .cn-input-group[data-invalid]:focus-within { box-shadow: {shadow.focus-danger}; border-color: {color.border-danger}; }
.cn-input-group .cn-input-group__icon:first-child + .cn-input-group__field { padding-inline-start: {space.2}; }
.cn-input-group .cn-input-group__field ~ .cn-input-group__addon, .cn-input-group .cn-input-group__field ~ .cn-input-group__select { border-inline-end: 0; border-inline-start: {border.width.thin} solid {color.border-control}; }
.cn-input-group .cn-input-group__select + .cn-input-group__icon { margin-inline-start: calc(({size.controlIcon.md} + {space.2.5}) * -1); margin-inline-end: 0; }
.cn-input-group .cn-input-group__select:hover:not(:disabled) { color: {color.fg-default}; }
.cn-input-group .cn-input-group__select:focus-visible { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-input-group .cn-input-group__button { box-shadow: none; }
.cn-input-group .cn-input-group__button:focus-visible { box-shadow: inset 0 0 0 2px {color.border-action}; }
.cn-input-group .cn-input-group__button:disabled { opacity: 1; color: {color.fg-disabled}; }`,
  examples: [
    ex('Leading text addon', group(`${addon('https://')}${field('placeholder="lumen.co" aria-label="Website"')}`), '"https://" sits in the muted addon; the user types only the host.'),
    ex('Trailing text addon', group(`${field('value="maya.chen" aria-label="Workspace handle"')}${addon('@lumen.co')}`), 'The domain is fixed, so it lives in the field instead of the helper text.'),
    ex('Leading select (currency)', group(`${select('Currency', ['USD', 'EUR', 'BRL', 'JPY'])}${field('inputmode="decimal" value="1,200.00" aria-label="Amount"')}`), 'A bare native select as an addon; the chevron is an icon element placed right after it.'),
    ex('Trailing button (copy)', group(`${field('value="https://app.lumen.co/invite/8f3k2p" readonly aria-label="Invite link"')}${copyButton}`), 'A ghost Button (size sm) that carries the __button part: no radius, stretched to the group, separated by a hairline.'),
    ex('Icon and trailing dropdown', group(`${search}${field('type="search" placeholder="Search prospects…" aria-label="Search prospects"')}${select('Region', ['All regions', 'Europe', 'Latin America', 'Asia-Pacific'])}`), 'Leading icon, then the field, then a select addon at the end.'),
    ex('Sizes', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-3);width:100%;min-width:0;max-width:360px">${group(`${addon('https://')}${field('placeholder="lumen.co" aria-label="Website (small)"')}`, 'data-size="sm"')}${group(`${addon('https://')}${field('placeholder="lumen.co" aria-label="Website (medium)"')}`, 'data-size="md"')}${group(`${addon('https://')}${field('placeholder="lumen.co" aria-label="Website (large)"')}`, 'data-size="lg"')}</div>`, 'sm / md / lg follow the control heights; addons stretch with the group.'),
    ex('Invalid', group(`${addon('https://')}${field('value="lumen" aria-invalid="true" aria-label="Website"')}`), 'Pair with a Field error such as "Enter a full domain, like lumen.co".'),
    ex('Disabled', group(`${select('Currency', ['USD'])}${field('value="1,200.00" disabled aria-label="Amount"')}`)),
  ],
  rules: [
    'One border for the whole group: the wrapper draws it; addons, the select and the button never draw their own outer border, only the hairline that separates them from the field.',
    'Text addons hold what the user must not type: protocol, domain, unit, currency code. If the addon changes the meaning of the value (currency, region), make it a select addon instead.',
    'At most one addon per side, and at most one Button per group, always trailing. A group with more than three children is a toolbar, not a field.',
    'The trailing Button is a ghost cn-button, size sm, whatever the group size; it also carries the __button part so it stretches and loses its radius.',
    'Addon labels are 1–2 words or a code ("USD", "@lumen.co", "https://"); never a full sentence.',
    'Sizes: md in forms; sm inside toolbars and tables; lg on marketing and auth screens.',
    'Width comes from the layout. The field takes the remaining width; addons keep their intrinsic width.',
    'Error state must show a Field error under the group; color alone is not enough.',
  ],
  a11y: [
    'The input has an accessible name (label for / aria-label). A text addon is visual: repeat its meaning in the label when it matters ("Website (https://)").',
    'A select addon needs its own aria-label ("Currency"); the chevron svg is aria-hidden.',
    'The trailing button is a real <button type="button"> with a verb label; it is a separate Tab stop after the input.',
    'aria-invalid="true" and aria-describedby pointing at the Field error id when invalid.',
    'Focus is shown on the whole group (:focus-within); the button shows an inset ring so it stays visible inside the clipped wrapper.',
  ],
  related: ['input', 'select', 'button', 'field', 'number-input', 'tags-input'],
};
