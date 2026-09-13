import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex } from './_shared.ts';

// A small panel: an 8-column grid of round swatches and a hex field with a preview swatch and an
// eyedropper button. Selection is a ring drawn with box-shadow so the swatch never changes size.

const EYEDROPPER = '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.75 2.25l3 3-1.5 1.5-.75-.75L6 11.5 3.5 12.5 4.5 10l5.5-5.5-.75-.75z"/><path d="M9.25 5.25l1.5 1.5"/></svg>';

const swatch = (name: string, cssVar: string, selected = false) =>
  `<button type="button" class="cn-color-picker__swatch" role="option" aria-selected="${selected}" aria-label="${name}" style="background:var(--cn-${cssVar})"></button>`;
const GRID: [string, string][] = [
  ['Ink', 'neutral-950'], ['Slate', 'neutral-700'], ['Stone', 'neutral-400'], ['Mist', 'neutral-200'],
  ['Brand 800', 'brand-800'], ['Brand 600', 'brand-600'], ['Brand 400', 'brand-400'], ['Brand 200', 'brand-200'],
  ['Red 600', 'red-600'], ['Red 400', 'red-400'], ['Amber 500', 'amber-500'], ['Amber 300', 'amber-300'],
  ['Green 600', 'green-600'], ['Green 400', 'green-400'], ['Blue 600', 'blue-600'], ['Blue 400', 'blue-400'],
];
const grid = (selected?: string) => `<div class="cn-color-picker__swatches" role="listbox" aria-label="Preset colors">${GRID.map(([n, v]) => swatch(n, v, n === selected)).join('')}</div>`;
const field = (hex: string, previewVar: string, attrs = '') =>
  `<div class="cn-color-picker__field"><div class="cn-input" data-variant="default" data-size="sm"><span class="cn-color-picker__swatch" data-preview aria-hidden="true" style="background:var(--cn-${previewVar})"></span><input class="cn-input__field" type="text" value="${hex}" aria-label="Hex color" spellcheck="false" autocapitalize="characters" maxlength="7"${attrs}></div><button type="button" class="cn-color-picker__eyedropper" aria-label="Pick a color from the screen">${EYEDROPPER}</button></div>`;
const picker = (size: string, inner: string) => `<div class="cn-color-picker" data-size="${size}" role="group" aria-label="Color">${inner}</div>`;

export const colorPicker: ComponentSpec = {
  name: 'ColorPicker',
  slug: 'color-picker',
  category: 'forms',
  description: 'A compact panel for choosing a color: an 8-column grid of round swatches, and a hex Input with a preview swatch and an eyedropper button. The selected swatch shows an action-colored ring.',
  usage: 'Use for brand colors, labels, tags and chart series where a curated palette is enough. Offer the hex field for exact values and the eyedropper when the browser supports it. Not for full-spectrum editing (a design tool); for a fixed set of 3–6 colors use a Radio group of swatches inline.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The panel (flex column, gap space.3): 280px wide (240 on sm), padding space.4, surface-raised, hairline, radius panel, shadow-lg. role="group" with an aria-label. Carries data-size.' },
    { part: 'swatches', element: 'div', description: '8-column grid, gap space.2. role="listbox" aria-label "Preset colors".' },
    { part: 'swatch', element: 'button', description: 'One 24px round swatch (20px on sm) with a hairline; its color is an inline background. role="option" aria-selected, aria-label naming the color. With data-preview it is the 16px preview inside the hex field.' },
    { part: 'field', element: 'div', description: 'Row (flex, gap space.2) with the hex Input (size sm, leading preview swatch) and the eyedropper button.' },
    { part: 'eyedropper', element: 'button', description: 'Square outline icon button (control height sm) with a pipette icon. aria-label "Pick a color from the screen". Hide it when the EyeDropper API is unavailable.' },
  ],
  props: {
    size: { values: ['sm', 'md'], default: 'md', description: 'md = 24px swatches in a 280px panel (default); sm = 20px swatches in a 240px panel for popovers inside dense settings.' },
  },
  states: {
    selected: { selector: ' .cn-color-picker__swatch[aria-selected="true"]', description: 'On the __swatch: a 2px action-colored ring (box-shadow, offset by the panel surface) marks the current color. Styled in extraCss because it lives on a child.', markup: 'aria-selected="true" on the swatch' },
    swatchHover: { selector: ' .cn-color-picker__swatch:hover', description: 'On the __swatch: the hairline strengthens. Styled in extraCss.', markup: 'native :hover on a swatch' },
    swatchFocus: { selector: ' .cn-color-picker__swatch:focus-visible', description: 'On the __swatch: the focus ring. Styled in extraCss.', markup: 'native :focus-visible on a swatch' },
    eyedropperHover: { selector: ' .cn-color-picker__eyedropper:hover', description: 'On the __eyedropper: subtle fill and default ink. Styled in extraCss.', markup: 'native :hover on the eyedropper' },
  },
  base: {
    root: {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.3}',
      width: 'calc({space.64} + {space.6})',
      'max-width': '100%',
      padding: '{space.4}',
      'background-color': '{color.bg-surface-raised}',
      border: '{border.width.thin} solid {color.border-default}',
      'border-radius': '{radius.panel}',
      'box-shadow': '{shadow.lg}',
      color: '{color.fg-default}',
      'z-index': '{z.popover}',
    },
    swatches: { display: 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'justify-items': 'center', gap: '{space.2}' },
    swatch: {
      ...RESET_BUTTON,
      display: 'block',
      'flex-shrink': '0',
      width: '{space.6}',
      height: '{space.6}',
      'border-radius': '{radius.full}',
      'box-shadow': 'inset 0 0 0 1px {color.border-default}',
      'background-color': '{color.bg-muted}',
      ...TRANSITION_COLORS,
    },
    field: { display: 'flex', 'align-items': 'center', gap: '{space.2}' },
    eyedropper: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.control.sm}',
      height: '{size.control.sm}',
      'font-size': '{size.icon.md}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-control}',
      'border-radius': '{radius.control}',
      'box-shadow': '{shadow.xs}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
  },
  variants: {
    size: {
      sm: { root: { width: 'calc({space.56} + {space.4})', padding: '{space.3}', gap: '{space.2.5}' }, swatches: { gap: '{space.1.5}' }, swatch: { width: '{space.5}', height: '{space.5}' } },
      md: { swatch: { width: '{space.6}', height: '{space.6}' } },
    },
  },
  extraCss: `
.cn-color-picker .cn-color-picker__swatch:hover { box-shadow: inset 0 0 0 1px {color.border-strong}; }
.cn-color-picker .cn-color-picker__swatch[aria-selected="true"] { box-shadow: 0 0 0 2px {color.bg-surface-raised}, 0 0 0 4px {color.border-action}; }
.cn-color-picker .cn-color-picker__swatch:focus-visible { ${Object.entries(FOCUS_RING).map(([k, v]) => `${k}: ${v}`).join('; ')}; }
.cn-color-picker .cn-color-picker__swatch[aria-selected="true"]:focus-visible { box-shadow: 0 0 0 2px {color.bg-surface-raised}, 0 0 0 4px {color.border-action}, {shadow.focus}; }
.cn-color-picker .cn-input .cn-color-picker__swatch[data-preview] { width: {space.4}; height: {space.4}; margin-inline-start: {space.3}; cursor: default; pointer-events: none; }
.cn-color-picker .cn-input .cn-color-picker__swatch[data-preview] + .cn-input__field { padding-inline-start: {space.2}; font-family: {font.family.mono}; text-transform: uppercase; }
.cn-color-picker .cn-input { flex: 1 1 auto; min-width: 0; }
.cn-color-picker .cn-color-picker__eyedropper:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-color-picker .cn-color-picker__eyedropper:focus-visible { outline: none; box-shadow: {shadow.focus}; border-color: {color.border-action}; }`,
  examples: [
    ex('Swatch grid with hex field', picker('md', grid('Brand 600') + field('#B4309F', 'brand-600')), 'Sixteen preset swatches in two rows; Brand 600 is selected and previewed in the hex field. Swatch colors are inline backgrounds using the primitive scale variables.'),
    ex('Custom value (no swatch match)', picker('md', grid() + field('#1E9E6A', 'green-600')), 'A typed hex that matches no preset: no swatch is selected, the preview shows the typed color.'),
    ex('Small', picker('sm', grid('Blue 600') + field('#2563EB', 'blue-600')), '20px swatches in a 240px panel.'),
    ex('Invalid hex', picker('md', grid() + field('#12G', 'neutral-200', ' aria-invalid="true" aria-describedby="hex-error"')) .replace('</div></div>', `</div><p class="cn-text-body-sm" id="hex-error" style="margin:0;color:var(--cn-color-fg-danger)">Enter 6 hex digits, like #B4309F.</p></div>`), 'The hex Input takes the invalid state; the message sits under the row.'),
  ],
  rules: [
    'Exactly 8 swatches per row and 1–3 rows (8–24 colors). Order them by hue family, darkest to lightest, neutrals first.',
    'The swatch color is the only inline style allowed (style="background:…"), preferably a primitive scale variable so the palette follows the theme.',
    'Selection is a ring, not a checkmark or a size change: aria-selected="true" draws the 2px action ring offset by the panel surface.',
    'The hex field always mirrors the selection: clicking a swatch writes its hex; typing a valid hex selects a matching swatch or clears the selection.',
    'Accept #RGB and #RRGGBB, normalize to uppercase #RRGGBB on blur, and mark the field invalid (with a message) otherwise.',
    'Show the eyedropper only when window.EyeDropper exists; never render a disabled eyedropper.',
    'The panel is statically positioned by the component; the app anchors it under its trigger (a swatch button or an Input) with an 8px offset and closes it on Escape.',
    'One ColorPicker per popover; never inline in a form, where a Radio group of swatches is lighter.',
  ],
  a11y: [
    'The swatch grid is role="listbox" with role="option" swatches; each has an aria-label naming the color ("Brand 600") and aria-selected. Arrow keys move between swatches, Enter or Space select.',
    'The hex input has an accessible name ("Hex color") and aria-invalid plus aria-describedby when the value is not a valid hex.',
    'The preview swatch inside the field is aria-hidden; the hex text is the accessible value.',
    'The eyedropper is a real <button> with aria-label; it announces the picked color by updating the hex input.',
    'Color is never the only cue for selection: the ring and the hex value both change.',
  ],
  related: ['input', 'popover', 'icon-button', 'radio'],
};
