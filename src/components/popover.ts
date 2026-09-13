import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, STATE, ex, ICON, typeStyle } from './_shared.ts';

const close = `<button type="button" class="cn-popover__close" aria-label="Close">${ICON.x}</button>`;

export const popover: ComponentSpec = {
  name: 'Popover',
  slug: 'popover',
  category: 'overlays',
  description: 'Small anchored panel with real content: a title, a short body, and at most two actions. Raised white surface, hairline, shadow-md and an optional arrow toward its trigger. The component styles the panel; the app positions it.',
  usage: 'Use for lightweight tasks next to their trigger: a quick filter, a date picker, a confirmation with one field, a preview card. Not for one-line hints (use Tooltip), not for flows that need the whole screen (use Dialog) and not for lists of commands (use Menu).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The panel. role="dialog" (or "region" when it is informational), data-state="open|closed", data-side for the arrow.' },
    { part: 'header', element: 'header', description: 'Title + description on the left, close button on the right. Optional when the body speaks for itself.', optional: true },
    { part: 'title', element: 'h3', description: 'heading-xs. Names the task ("Filter by country").', optional: true },
    { part: 'description', element: 'p', description: 'body-sm muted, one line under the title.', optional: true },
    { part: 'body', element: 'div', description: 'body-sm content: a short form, a list, a preview.' },
    { part: 'footer', element: 'footer', description: 'Right-aligned row: ghost cancel then one primary Button, size sm.', optional: true },
    { part: 'close', element: 'button', description: '24px ghost icon button with an X at the top-right. aria-label="Close".', optional: true },
    { part: 'arrow', element: 'span', description: '8px rotated square with the same surface and hairline, on the edge facing the trigger.', optional: true },
  ],
  props: {
    size: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Panel width. sm = 240px for a single control or a short list; md = 320px for a small form (default); lg = 400px for a preview or a two-column form.',
    },
    side: {
      values: ['top', 'right', 'bottom', 'left'],
      default: 'bottom',
      description: 'Which side of the trigger the panel opens on; moves the arrow and its border. bottom is the default for buttons in a toolbar.',
    },
  },
  states: {
    open: STATE.open(),
    closed: { selector: '[data-state="closed"]', description: 'Hidden (display none).', markup: 'data-state="closed"' },
    closeHover: { selector: ' .cn-popover__close:hover', description: 'Pointer over the close button: subtle fill. Styled in extraCss because it lives on a child.', markup: 'native :hover on .cn-popover__close' },
    closeFocus: { selector: ' .cn-popover__close:focus-visible', description: 'Keyboard focus on the close button shows the focus ring. Styled in extraCss.', markup: 'native :focus-visible on .cn-popover__close' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'flex-direction': 'column',
      width: '320px',
      'max-width': '100%',
      padding: '{space.4}',
      'background-color': '{color.bg-surface-raised}',
      border: '{border.width.thin} solid {color.border-default}',
      'border-radius': '{radius.lg}',
      'box-shadow': '{shadow.md}',
      color: '{color.fg-default}',
      ...typeStyle('body-sm'),
      'z-index': '{z.popover}',
    },
    header: { display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '{space.3}', 'margin-bottom': '{space.2}' },
    title: { ...typeStyle('heading-xs'), color: '{color.fg-default}' },
    description: { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'margin-top': '{space.0.5}' },
    body: { ...typeStyle('body-sm'), 'min-width': '0' },
    footer: { display: 'flex', 'align-items': 'center', 'justify-content': 'flex-end', gap: '{space.2}', 'margin-top': '{space.3}' },
    close: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.xl}',
      height: '{size.icon.xl}',
      'margin-block': 'calc({space.1} * -1)',
      'margin-inline-end': 'calc({space.1} * -1)',
      'border-radius': '{radius.md}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
    arrow: {
      position: 'absolute',
      width: '8px',
      height: '8px',
      'background-color': '{color.bg-surface-raised}',
      border: '{border.width.thin} solid {color.border-default}',
      transform: 'rotate(45deg)',
    },
    '@states': {
      open: { root: { animation: 'cn-popover-enter {motion.duration.normal} {motion.easing.out} both' } },
      closed: { root: { display: 'none' } },
    },
  },
  variants: {
    size: {
      sm: { root: { width: '240px' } },
      md: { root: { width: '320px' } },
      lg: { root: { width: '400px' } },
    },
    side: {
      top: { arrow: { bottom: '-5px', left: 'calc(50% - 4px)', 'border-top-color': 'transparent', 'border-left-color': 'transparent' } },
      bottom: { arrow: { top: '-5px', left: 'calc(50% - 4px)', 'border-bottom-color': 'transparent', 'border-right-color': 'transparent' } },
      left: { arrow: { right: '-5px', top: 'calc(50% - 4px)', 'border-bottom-color': 'transparent', 'border-left-color': 'transparent' } },
      right: { arrow: { left: '-5px', top: 'calc(50% - 4px)', 'border-top-color': 'transparent', 'border-right-color': 'transparent' } },
    },
  },
  extraCss: `
@keyframes cn-popover-enter { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.cn-popover .cn-popover__close .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; }
.cn-popover .cn-popover__close:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-popover .cn-popover__close:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }`,
  examples: [
    ex('Default (md, bottom)', `<div class="cn-popover" data-size="md" data-side="bottom" data-state="open" role="dialog" aria-labelledby="pop-filter-title"><span class="cn-popover__arrow"></span><header class="cn-popover__header"><div><h3 class="cn-popover__title" id="pop-filter-title">Filter by country</h3><p class="cn-popover__description">Prospects from these markets only.</p></div>${close}</header><div class="cn-popover__body"><div class="cn-input" data-variant="default" data-size="sm">${ICON.search.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="search" placeholder="Search countries…" aria-label="Search countries"></div><p style="margin-top:var(--cn-space-2);color:var(--cn-color-fg-muted)">Japan, South Korea, Germany selected.</p></div><footer class="cn-popover__footer"><button type="button" class="cn-button" data-variant="ghost" data-size="sm"><span class="cn-button__label">Clear</span></button><button type="button" class="cn-button" data-variant="primary" data-size="sm"><span class="cn-button__label">Apply</span></button></footer></div>`),
    ex('Small, top, no header', `<div class="cn-popover" data-size="sm" data-side="top" data-state="open" role="region" aria-label="Fit score"><span class="cn-popover__arrow"></span><div class="cn-popover__body"><strong>Fit score 82</strong><br>Trade volume ↑ · Product match ↑ · Replied twice in 2025.</div></div>`),
    ex('Large preview, right', `<div class="cn-popover" data-size="lg" data-side="right" data-state="open" role="dialog" aria-labelledby="pop-company-title"><span class="cn-popover__arrow"></span><header class="cn-popover__header"><div><h3 class="cn-popover__title" id="pop-company-title">Nakamura Trading Co.</h3><p class="cn-popover__description">Osaka, Japan · Importer of frozen seafood</p></div>${close}</header><div class="cn-popover__body">14 years active · 2 decision makers found · last outreach 3 days ago. <span class="cn-badge" data-tone="success" data-variant="soft" data-size="sm">Verified</span></div><footer class="cn-popover__footer"><button type="button" class="cn-button" data-variant="outline" data-size="sm"><span class="cn-button__label">Open profile</span></button></footer></div>`),
    ex('Left, confirmation', `<div class="cn-popover" data-size="md" data-side="left" data-state="open" role="dialog" aria-labelledby="pop-remove-title"><span class="cn-popover__arrow"></span><header class="cn-popover__header"><div><h3 class="cn-popover__title" id="pop-remove-title">Remove from shortlist?</h3><p class="cn-popover__description">You can add it back from the search results.</p></div></header><footer class="cn-popover__footer"><button type="button" class="cn-button" data-variant="ghost" data-size="sm"><span class="cn-button__label">Keep</span></button><button type="button" class="cn-button" data-variant="danger" data-size="sm"><span class="cn-button__label">Remove</span></button></footer></div>`),
  ],
  rules: [
    'One task per popover. If it needs more than one field group or a scrolling body, it is a Dialog or a Drawer.',
    'Width comes from size only; never set width inline. Height is content, max 60vh with an internal scroll on the body.',
    'Footer: ghost cancel first, then one primary (or danger) Button, both size sm. No footer for informational popovers.',
    'Opens on click (never on hover), closes on Escape, outside click, or the close button. The trigger gets aria-expanded.',
    'Position with a floating library; flip side when there is no room and keep the arrow centered on the trigger.',
    'Only one popover open at a time; opening another closes the first.',
    'Use the arrow when the popover is detached from its trigger by more than 4px; omit it when it hugs a toolbar.',
    'Enter animation: 4px slide + fade, 180ms; leave is fade only.',
  ],
  a11y: [
    'role="dialog" with aria-labelledby on the title when the popover contains controls; role="region" with aria-label when it is read-only.',
    'Focus moves to the first control inside on open and returns to the trigger on close.',
    'The trigger carries aria-expanded and aria-controls pointing to the panel id.',
    'Escape closes; Tab cycles inside a dialog popover; the close button has aria-label="Close".',
  ],
  related: ['tooltip', 'dialog', 'drawer', 'button', 'input'],
};
