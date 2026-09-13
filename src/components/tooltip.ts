import type { ComponentSpec } from '../types.ts';
import { STATE, ex, typeStyle } from './_shared.ts';

export const tooltip: ComponentSpec = {
  name: 'Tooltip',
  slug: 'tooltip',
  category: 'overlays',
  description: 'Small inverse-colored label that names or explains a control on hover and focus. One short sentence, a 6px arrow toward the trigger, nothing interactive inside.',
  usage: 'Use to name icon-only buttons and to add a hint to truncated values or abbreviations. Not for content the user needs to act on or copy (use Popover), not for long explanations (use helper text), and not as the only place a label lives on touch devices.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The panel. role="tooltip", id referenced by the trigger’s aria-describedby. Positioned by the app; the component styles it in place.' },
    { part: 'arrow', element: 'span', description: '6px square rotated 45°, same background as the panel, placed on the edge facing the trigger according to data-side.', optional: true },
  ],
  props: {
    side: {
      values: ['top', 'right', 'bottom', 'left'],
      default: 'top',
      description: 'Which side of the trigger the tooltip sits on; only moves the arrow. top is the default; use bottom under a topbar, left/right next to a sidebar.',
    },
  },
  states: {
    open: STATE.open(),
    closed: { selector: '[data-state="closed"]', description: 'Hidden. The panel is removed from view (display none).', markup: 'data-state="closed"' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'inline-block',
      width: 'max-content',
      'max-width': '240px',
      padding: '{space.1.5} {space.2}',
      'background-color': '{color.bg-inverse}',
      color: '{color.fg-inverse}',
      'border-radius': '{radius.md}',
      'box-shadow': '{shadow.md}',
      ...typeStyle('body-xs'),
      'z-index': '{z.tooltip}',
      'pointer-events': 'none',
    },
    arrow: {
      position: 'absolute',
      width: '6px',
      height: '6px',
      'background-color': '{color.bg-inverse}',
      transform: 'rotate(45deg)',
    },
    '@states': {
      open: { root: { animation: 'cn-tooltip-enter {motion.duration.fast} {motion.easing.standard} both' } },
      closed: { root: { display: 'none' } },
    },
  },
  variants: {
    side: {
      top: { arrow: { bottom: '-3px', left: 'calc(50% - 3px)' } },
      bottom: { arrow: { top: '-3px', left: 'calc(50% - 3px)' } },
      left: { arrow: { right: '-3px', top: 'calc(50% - 3px)' } },
      right: { arrow: { left: '-3px', top: 'calc(50% - 3px)' } },
    },
  },
  extraCss: `
@keyframes cn-tooltip-enter { from { opacity: 0; } to { opacity: 1; } }`,
  examples: [
    ex('Top (default)', `<div class="cn-tooltip" data-side="top" data-state="open" role="tooltip" id="tip-archive">Archive this prospect<span class="cn-tooltip__arrow"></span></div>`),
    ex('Bottom', `<div class="cn-tooltip" data-side="bottom" data-state="open" role="tooltip" id="tip-refresh">Refreshed nightly at 02:00 UTC<span class="cn-tooltip__arrow"></span></div>`),
    ex('Left', `<div class="cn-tooltip" data-side="left" data-state="open" role="tooltip" id="tip-verified">Verified with 3 public sources<span class="cn-tooltip__arrow"></span></div>`),
    ex('Right, wrapping at 240px', `<div class="cn-tooltip" data-side="right" data-state="open" role="tooltip" id="tip-score">Fit score combines trade volume, product match and reply history.<span class="cn-tooltip__arrow"></span></div>`),
  ],
  recipes: [
    ex('Icon button with its tooltip (static)', `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:var(--cn-space-1)"><div class="cn-tooltip" data-side="top" data-state="open" role="tooltip" id="tip-copy">Copy company ID<span class="cn-tooltip__arrow"></span></div><button type="button" class="cn-button" data-variant="outline" data-size="sm" aria-describedby="tip-copy"><span class="cn-button__label">Copy</span></button></div>`, 'The trigger points to the tooltip with aria-describedby; the tooltip never contains the trigger’s label alone if the button has visible text.'),
  ],
  rules: [
    'Text only, at most one sentence, no period at the end unless it is two sentences (then it is too long).',
    'Never put links, buttons or inputs inside a tooltip. If it must be clicked, it is a Popover.',
    'Show after a 300ms hover delay and immediately on keyboard focus; hide on pointer leave, blur or Escape.',
    'Tooltips are not the only label on touch: every icon-only control also has aria-label, and mobile-only elements do not rely on tooltips at all.',
    'Prefer side="top". Use bottom under a fixed topbar and left/right for controls at the screen edge. Let the positioning library flip when there is no room.',
    'Max width 240px; wrapping is fine, scrolling is not.',
    'The panel is inverse-colored in both themes (dark on light, light on dark); never tone it.',
    'Do not show a tooltip that repeats the visible label of a text button.',
  ],
  a11y: [
    'role="tooltip" on the panel and aria-describedby on the trigger pointing to its id.',
    'Opens on focus as well as hover; a control that can be hovered must be reachable by keyboard.',
    'Escape closes it and returns nothing else; focus never moves into the tooltip.',
    'Inverse colors keep AA contrast in both themes; body-xs is the minimum size, never smaller.',
  ],
  related: ['popover', 'icon-button', 'button'],
};
