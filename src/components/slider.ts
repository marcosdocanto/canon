import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// the reference slider: 8px gray-200 rail with a brand-600 fill, a 24px white thumb with a 2px brand
// ring and shadow-md (grab / grabbing cursor), and an optional value label — bottom (16px medium
// under the thumb) or top (a floating white chip with shadow-lg and a hairline ring above it).
// Focus = 4px brand ring on the thumb; disabled = whole control at 50%.

const THUMB = `box-sizing: border-box; width: {space.6}; height: {space.6}; border-radius: {radius.full}; background-color: {white}; border: 0; box-shadow: inset 0 0 0 2px {color.bg-action}, {shadow.md}; cursor: grab; transition: box-shadow {motion.duration.fast} {motion.easing.linear};`;
const TRACK = `height: {space.2}; border-radius: {radius.full}; background: linear-gradient(to right, {color.bg-action} var(--cn-slider-fill), {color.border-default} var(--cn-slider-fill));`;
const THUMB_FOCUS = `box-shadow: inset 0 0 0 2px {color.bg-action}, {shadow.md}, {shadow.focus};`;
/** Where the floating labels sit: under the thumb centre, clamped so they never leave the track. */
const LABEL_LEFT = 'clamp({space.3}, var(--cn-slider-fill), calc(100% - {space.3}))';

const slider_ = (attrs: string, fill: string, value = '', label = 'right', style = 'max-width:360px', root = '') =>
  `<div class="cn-slider" data-label="${label}" style="--cn-slider-fill: ${fill};${style}" ${root}><input class="cn-slider__field" type="range" ${attrs}>${value ? `<output class="cn-slider__value" for="${attrs.match(/id="([^"]+)"/)?.[1] ?? ''}">${value}</output>` : ''}</div>`;

export const slider: ComponentSpec = {
  name: 'Slider',
  slug: 'slider',
  category: 'forms',
  description: 'Native range input with an 8px gray-200 rail, a brand fill up to the current value and a 24px white thumb with a 2px brand ring and shadow-md. The value can sit at the right, under the thumb or in a floating chip above it.',
  usage: 'Pick a value from a continuous or coarse range where the feel matters more than the exact figure (a threshold, a budget band, opacity, volume). For exact numbers use Input type="number"; for a few discrete options use SegmentedControl or Radio. Pair with Field for the label.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Flex row holding the range input and, optionally, the readout. Carries --cn-slider-fill (the value as a percentage), data-label and data-disabled.' },
    { part: 'field', element: 'input', description: 'The native <input type="range">, 24px tall. Rail and thumb are styled through pseudo-elements; the fill comes from the --cn-slider-fill custom property.' },
    { part: 'value', element: 'output', description: 'Optional readout (<output for="<input id>">): right = 14px medium tabular text beside the track; bottom = 16px medium text centred under the thumb; top = a floating 12px semibold chip above the thumb (white, radius 8, shadow-lg, hairline ring).', optional: true },
  ],
  props: {
    label: { values: ['right', 'bottom', 'top', 'none'], default: 'right', description: 'Where the value readout sits. right = beside the track (default, tabular so it never jumps); bottom = centred under the thumb (the reference "bottom"); top = a floating chip above the thumb (the reference "top-floating"); none = hidden (put the value in the Field label instead).' },
  },
  states: {
    focus: { selector: ':has(:focus-visible)', description: 'Keyboard focus: the 4px brand ring around the thumb; the readout turns to the default ink.', markup: 'native :focus-visible on the input' },
    active: { selector: ':has(:active)', description: 'While dragging: the thumb shows the grabbing cursor.', markup: 'native :active on the input' },
    disabled: { selector: '[data-disabled], &:has(:disabled)', description: 'Whole control at 50% opacity, cursor not-allowed.', markup: 'disabled on the input' },
  },
  base: {
    root: { position: 'relative', display: 'flex', 'align-items': 'center', gap: '{space.3}', width: '100%', 'min-width': '0', color: '{color.fg-default}' },
    field: {
      appearance: 'none',
      '-webkit-appearance': 'none',
      flex: '1 1 auto',
      width: '100%',
      'min-width': '0',
      height: '{space.6}',
      margin: '0',
      padding: '0',
      background: 'transparent',
      outline: 'none',
      cursor: 'pointer',
    },
    value: { ...typeStyle('label-sm'), color: '{color.fg-muted}', 'min-width': '{space.10}', 'text-align': 'end', 'flex-shrink': '0', 'white-space': 'nowrap', 'font-variant-numeric': 'tabular-nums' },
    '@states': {
      focus: { value: { color: '{color.fg-default}' } },
      active: { field: { cursor: 'grabbing' } },
      disabled: { root: { opacity: '{opacity.disabled}', cursor: 'not-allowed' }, field: { cursor: 'not-allowed' } },
    },
  },
  variants: {
    label: {
      right: { value: {} },
      bottom: {
        root: { 'margin-block-end': '{space.8}' },
        value: { position: 'absolute', top: 'calc(100% + {space.2})', left: LABEL_LEFT, transform: 'translateX(-50%)', 'min-width': '0', ...typeStyle('body-lg'), 'font-weight': '{font.weight.medium}', color: '{color.fg-default}', 'text-align': 'center' },
      },
      top: {
        root: { 'margin-block-start': '{space.10}' },
        value: {
          position: 'absolute',
          bottom: 'calc(100% + {space.2})',
          left: LABEL_LEFT,
          transform: 'translateX(-50%)',
          'min-width': '0',
          padding: '{space.1.5} {space.2}',
          'border-radius': '{radius.panel}',
          'background-color': '{color.bg-surface}',
          ...typeStyle('label-xs'),
          'font-weight': '{font.weight.semibold}',
          color: '{color.fg-muted}',
          'text-align': 'center',
          'box-shadow': '{shadow.lg}, inset 0 0 0 1px {color.border-default}',
        },
      },
      none: { value: { display: 'none' } },
    },
  },
  extraCss: `
.cn-slider { --cn-slider-fill: 0%; }
.cn-slider .cn-slider__field::-webkit-slider-runnable-track { ${TRACK} }
.cn-slider .cn-slider__field::-moz-range-track { ${TRACK} }
.cn-slider .cn-slider__field::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; margin-top: calc(({space.2} - {space.6}) / 2); ${THUMB} }
.cn-slider .cn-slider__field::-moz-range-thumb { ${THUMB} }
.cn-slider .cn-slider__field:active:not(:disabled)::-webkit-slider-thumb { cursor: grabbing; }
.cn-slider .cn-slider__field:active:not(:disabled)::-moz-range-thumb { cursor: grabbing; }
.cn-slider .cn-slider__field:focus-visible::-webkit-slider-thumb { ${THUMB_FOCUS} }
.cn-slider .cn-slider__field:focus-visible::-moz-range-thumb { ${THUMB_FOCUS} }
.cn-slider .cn-slider__field:disabled::-webkit-slider-thumb { cursor: not-allowed; }
.cn-slider .cn-slider__field:disabled::-moz-range-thumb { cursor: not-allowed; }`,
  examples: [
    ex('With value at the right', slider_('id="sl-score" min="0" max="100" step="1" value="40" aria-label="Minimum confidence"', '40%', '40%'), '8px gray-200 rail, brand fill, 24px white thumb with a 2px brand ring and shadow-md. Set --cn-slider-fill on the root to (value − min) ÷ (max − min).'),
    ex('Label under the thumb', slider_('id="sl-bottom" min="0" max="100" step="5" value="65" aria-label="Storage quota"', '65%', '65%', 'bottom'), 'The reference "bottom" label: 16px medium, centred under the thumb, 8px below the track.'),
    ex('Floating label above', slider_('id="sl-top" min="0" max="100" step="1" value="25" aria-label="Opacity"', '25%', '25%', 'top'), 'The reference "top-floating" label: a white chip with radius 8, shadow-lg and a hairline ring, 12px semibold.'),
    ex('Without readout', slider_('min="0" max="10" step="1" value="7" aria-label="Notification intensity" aria-valuetext="7 of 10"', '70%', '', 'none'), 'Put the value in the Field label or the captions instead.'),
    ex('Stepped (budget band)', slider_('id="sl-budget" min="5000" max="50000" step="5000" value="20000" aria-label="Monthly budget" aria-valuetext="$20,000"', '33.3%', '$20k'), 'Use step for coarse ranges; format the readout with its unit.'),
    ex('Disabled', slider_('id="sl-locked" min="0" max="100" value="60" disabled aria-label="Sending rate"', '60%', '60%', 'right', 'max-width:360px', 'data-disabled'), 'Whole control at 50% opacity.'),
  ],
  recipes: [
    ex('In a Field with range captions', `<div class="cn-field" data-layout="vertical" data-size="md" style="max-width:360px"><label class="cn-field__label" for="sl-threshold">Auto-publish confidence</label><div class="cn-field__control"><div class="cn-slider" data-label="right" style="--cn-slider-fill: 70%"><input class="cn-slider__field" id="sl-threshold" type="range" min="50" max="100" step="5" value="85" aria-describedby="sl-threshold-helper"><output class="cn-slider__value" for="sl-threshold">85%</output></div><div class="cn-text-body-sm" style="display:flex;justify-content:space-between;color:var(--cn-color-fg-subtle);margin-top:var(--cn-space-1)"><span>50% · more drafts</span><span>100% · safer</span></div></div><p class="cn-field__helper" id="sl-threshold-helper">Drafts below this confidence wait for Sofia Almeida’s approval.</p></div>`, 'Label from the Field, captions under the track in 12px, hint explains the consequence.'),
  ],
  rules: [
    'Set --cn-slider-fill on the root (or on the input for label="right") to (value − min) ÷ (max − min) × 100% and update it on every input event. Without it the rail shows no fill and the floating labels sit at the start.',
    'Always show the value somewhere: the readout (right, bottom or top), the Field label ("Threshold: 40") or captions. A slider without a number is a toy.',
    'Use step for coarse ranges (budget bands, percentages in fives). Never a slider for exact figures (prices, dates, quantities under 20): use Input type="number".',
    'The right readout is 14px medium, tabular, at least 40px wide so it does not jump between 9 and 10. Format with the unit ($20k, 85%).',
    'Bottom and top labels follow the thumb; leave 32px (bottom) or 40px (top) of room, which the variant reserves with a margin.',
    'Width comes from the Field: minimum 160px, ideal 240–360px, never full width on desktop.',
    'One slider per row. A two-thumb range is a separate component (RangeSlider), not two sliders side by side.',
    'Motion: none on the thumb position (it follows the pointer); only the focus ring transitions (100ms).',
  ],
  a11y: [
    'Keep the native <input type="range">: it exposes role slider with min, max and the current value for free.',
    'Give it an accessible name (Field label with for, or aria-label) and aria-valuetext when the number needs a unit ("$20,000", "7 of 10").',
    'Keyboard: arrows move one step, Page Up/Down ten steps, Home/End jump to the ends. Do not override these.',
    'The <output for> ties the readout to the input; update its text whenever the value changes.',
    'The 4px focus ring on the thumb must stay visible in both themes; never set outline: none without the ring.',
  ],
  related: ['input', 'field', 'segmented-control'],
};
