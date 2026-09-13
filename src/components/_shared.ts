// Shared fragments so every component agrees on sizing, focus and motion.
import type { Declarations, StateSpec, PropSpec, Example } from '../types.ts';

export const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type Size = (typeof SIZES)[number];

/** Height / horizontal padding / font / icon / gap for a control of a size. */
export const CONTROL: Record<Size, { height: string; px: string; font: string; icon: string; gap: string; radius: string }> = {
  xs: { height: '{size.control.xs}', px: '{size.controlPadding.xs}', font: '{font.control.xs}', icon: '{size.controlIcon.xs}', gap: '{space.1}', radius: '{radius.control}' },
  sm: { height: '{size.control.sm}', px: '{size.controlPadding.sm}', font: '{font.control.sm}', icon: '{size.controlIcon.sm}', gap: '{space.1.5}', radius: '{radius.control}' },
  md: { height: '{size.control.md}', px: '{size.controlPadding.md}', font: '{font.control.md}', icon: '{size.controlIcon.md}', gap: '{space.2}', radius: '{radius.control}' },
  lg: { height: '{size.control.lg}', px: '{size.controlPadding.lg}', font: '{font.control.lg}', icon: '{size.controlIcon.lg}', gap: '{space.2}', radius: '{radius.control}' },
  xl: { height: '{size.control.xl}', px: '{size.controlPadding.xl}', font: '{font.control.xl}', icon: '{size.controlIcon.xl}', gap: '{space.2.5}', radius: '{radius.control}' },
};

export const FOCUS_RING: Declarations = {
  outline: 'none',
  'box-shadow': '{shadow.focus}',
};

export const FOCUS_RING_DANGER: Declarations = {
  outline: 'none',
  'box-shadow': '{shadow.focus-danger}',
};

export const TRANSITION_COLORS: Declarations = {
  'transition-property': 'background-color, border-color, color, box-shadow, opacity',
  'transition-duration': '{motion.duration.normal}',
  'transition-timing-function': '{motion.easing.standard}',
};

export const TRANSITION_ALL: Declarations = {
  'transition-property': 'background-color, border-color, color, box-shadow, opacity, transform',
  'transition-duration': '{motion.duration.normal}',
  'transition-timing-function': '{motion.easing.standard}',
};

/** Typography declarations from a composite type style ref name (e.g. 'label-md'). */
export function typeStyle(name: string): Declarations {
  return {
    'font-family': `{type.${name}.family}`,
    'font-size': `{type.${name}.size}`,
    'font-weight': `{type.${name}.weight}`,
    'line-height': `{type.${name}.lineHeight}`,
    'letter-spacing': `{type.${name}.letterSpacing}`,
    'text-transform': `{type.${name}.transform}`,
  };
}

export const RESET_BUTTON: Declarations = {
  appearance: 'none',
  '-webkit-appearance': 'none',
  border: '0',
  margin: '0',
  padding: '0',
  background: 'none',
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  'text-decoration': 'none',
  'user-select': 'none',
  '-webkit-tap-highlight-color': 'transparent',
};

export const STATE = {
  hover: (extra = ''): StateSpec => ({ selector: `:hover:not(:disabled):not([aria-disabled="true"])${extra}`, description: 'Pointer over the element (mouse only; never the only cue).', markup: 'native :hover' }),
  active: (): StateSpec => ({ selector: ':active:not(:disabled):not([aria-disabled="true"])', description: 'While pressed.', markup: 'native :active' }),
  focus: (): StateSpec => ({ selector: ':focus-visible', description: 'Keyboard focus. Shows the 3px ring; never on mouse click.', markup: 'native :focus-visible' }),
  disabled: (): StateSpec => ({ selector: ':disabled, &[aria-disabled="true"]', description: 'Not interactive. Reduced opacity, no hover, cursor not-allowed.', markup: 'disabled attribute (or aria-disabled="true")' }),
  loading: (): StateSpec => ({ selector: '[data-loading]', description: 'Async action in flight. Shows the spinner, hides the label visually, keeps width.', markup: 'data-loading attribute' }),
  invalid: (): StateSpec => ({ selector: '[aria-invalid="true"]', description: 'Validation failed. Danger border + danger focus ring; pair with a FieldError.', markup: 'aria-invalid="true"' }),
  checked: (): StateSpec => ({ selector: ':checked', description: 'Selected.', markup: 'checked attribute' }),
  selected: (): StateSpec => ({ selector: '[aria-selected="true"], &[data-selected]', description: 'Selected item.', markup: 'aria-selected="true" or data-selected' }),
  current: (): StateSpec => ({ selector: '[aria-current="page"], &[data-active]', description: 'The current item (navigation).', markup: 'aria-current="page" or data-active' }),
  open: (): StateSpec => ({ selector: '[data-state="open"]', description: 'Expanded / visible.', markup: 'data-state="open"' }),
};

export const SIZE_PROP = (values: readonly string[] = SIZES, def = 'md'): PropSpec => ({
  values: [...values],
  default: def,
  description: 'Control height and its matching padding, font and icon size.',
});

export const ex = (title: string, html: string, description?: string): Example => ({ title, html: html.trim(), description });

/** Inline SVG icons used in examples so the gallery renders without a font. */
export const ICON = {
  plus: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
  arrow: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
  check: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg>',
  x: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  chevronDown: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>',
  chevronRight: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4l4 4-4 4"/></svg>',
  search: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>',
  info: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 7v4M8 5v.5"/></svg>',
  warning: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5l6 11H2l6-11zM8 7v3M8 11.5v.5"/></svg>',
  dots: '<svg class="cn-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3.5" cy="8" r="1.25"/><circle cx="8" cy="8" r="1.25"/><circle cx="12.5" cy="8" r="1.25"/></svg>',
  spark: '<svg class="cn-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z"/></svg>',
  menu: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 5h10M3 8h10M3 11h10"/></svg>',
  calendar: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 7h11M5.5 2v3M10.5 2v3"/></svg>',
  home: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 7.5L8 3l5.5 4.5V13a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V7.5z"/></svg>',
  user: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="5.5" r="2.75"/><path d="M2.75 13.5c.6-2.6 2.6-4 5.25-4s4.65 1.4 5.25 4"/></svg>',
  inbox: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 9.5h3l1 2h3l1-2h3M2.5 9.5V4a1 1 0 011-1h9a1 1 0 011 1v5.5M2.5 9.5V12a1 1 0 001 1h9a1 1 0 001-1V9.5"/></svg>',
  settings: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="2"/><path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05"/></svg>',
  external: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3.5H3.5v9h9V9M9.5 3h3.5v3.5M13 3L7.5 8.5"/></svg>',
  trash: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>',
  copy: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3.5a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h2"/></svg>',
};
