import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, STATE, ex, ICON, typeStyle } from './_shared.ts';

const close = `<button type="button" class="cn-dialog__close" aria-label="Close">${ICON.x}</button>`;
const icon = (name: keyof typeof ICON) => `<span class="cn-dialog__icon">${ICON[name]}</span>`;

export const dialog: ComponentSpec = {
  name: 'Dialog',
  slug: 'dialog',
  category: 'overlays',
  description: 'Modal panel centered over a scrim for one decision or one short task. Raised white surface, radius-2xl, shadow-lg; header with a required title, a scrolling body, and a subtle footer where the single primary action sits last.',
  usage: 'Use when the user must decide or complete something before continuing: confirm a deletion, name a new search, pick between two plans. Not for details of a list item (use Drawer, which keeps the list visible), not for hints (Tooltip/Popover), and never as a container for a whole page of settings.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The panel. role="dialog" aria-modal="true" aria-labelledby → title. data-state="open|closed". Rendered inside .cn-dialog-backdrop in the app.' },
    { part: 'header', element: 'header', description: 'Icon (optional) + title/description on the left, close button top-right. No bottom border.' },
    { part: 'icon', element: 'span', description: '32px circle before the title: subtle fill and muted icon by default; danger fill and icon in variant="destructive".', optional: true },
    { part: 'title', element: 'h2', description: 'heading-md. Required. A question or a short verb phrase: "Delete this search?", "Name your shortlist".' },
    { part: 'description', element: 'p', description: 'body-sm muted, one or two sentences with the consequence.', optional: true },
    { part: 'close', element: 'button', description: '32px ghost icon button with an X in the top-right. aria-label="Close".', optional: true },
    { part: 'body', element: 'div', description: 'body-md content: a field, a short form, a summary. Scrolls when the panel hits max-height.' },
    { part: 'footer', element: 'footer', description: 'Subtle background, top hairline, right-aligned: ghost cancel first, then one primary (or danger) Button.' },
  ],
  props: {
    size: {
      values: ['sm', 'md', 'lg', 'xl'],
      default: 'md',
      description: 'Max width of the panel. sm = 400px for a yes/no confirmation; md = 520px for one field or a short form (default); lg = 640px for a form with several fields; xl = 800px for a two-column layout or a preview. Pick two sizes per app and stick to them.',
    },
    variant: {
      values: ['default', 'destructive'],
      default: 'default',
      description: 'default = neutral header icon (or none); destructive = the header icon turns danger (red circle) and the footer’s primary action is a danger Button. Use only for irreversible actions.',
    },
  },
  states: {
    open: STATE.open(),
    closed: { selector: '[data-state="closed"]', description: 'Hidden (display none). The backdrop is removed at the same time.', markup: 'data-state="closed"' },
    closeHover: { selector: ' .cn-dialog__close:hover', description: 'Pointer over the close button: subtle fill. Styled in extraCss because it lives on a child.', markup: 'native :hover on .cn-dialog__close' },
    closeFocus: { selector: ' .cn-dialog__close:focus-visible', description: 'Keyboard focus on the close button shows the focus ring. Styled in extraCss.', markup: 'native :focus-visible on .cn-dialog__close' },
  },
  base: {
    root: {
      display: 'flex',
      'flex-direction': 'column',
      width: '100%',
      'max-width': '520px',
      'max-height': 'calc(100vh - {space.16})',
      'background-color': '{color.bg-surface-raised}',
      border: '{border.width.thin} solid {color.border-default}',
      'border-radius': '{radius.2xl}',
      'box-shadow': '{shadow.lg}',
      color: '{color.fg-default}',
      overflow: 'hidden',
      ...typeStyle('body-md'),
    },
    header: { display: 'flex', 'align-items': 'flex-start', 'justify-content': 'space-between', gap: '{space.4}', padding: '{space.6} {space.6} 0' },
    icon: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.2xl}',
      height: '{size.icon.2xl}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-subtle}',
      color: '{color.fg-muted}',
    },
    title: { ...typeStyle('heading-md'), color: '{color.fg-default}' },
    description: { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'margin-top': '{space.1}' },
    close: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.2xl}',
      height: '{size.icon.2xl}',
      'margin-block': 'calc({space.1} * -1)',
      'margin-inline-end': 'calc({space.2} * -1)',
      'border-radius': '{radius.md}',
      color: '{color.fg-subtle}',
      ...TRANSITION_COLORS,
    },
    body: { flex: '1 1 auto', 'min-height': '0', overflow: 'auto', padding: '{space.6}', ...typeStyle('body-md') },
    footer: {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'flex-end',
      gap: '{space.2}',
      padding: '{space.4} {space.6}',
      'border-top': '{border.width.thin} solid {color.border-subtle}',
      'background-color': '{color.bg-subtle}',
    },
    '@states': {
      open: { root: { animation: 'cn-dialog-enter {motion.duration.slow} {motion.easing.out} both' } },
      closed: { root: { display: 'none' } },
    },
  },
  variants: {
    size: {
      sm: { root: { 'max-width': '400px' } },
      md: { root: { 'max-width': '520px' } },
      lg: { root: { 'max-width': '640px' } },
      xl: { root: { 'max-width': '800px' } },
    },
    variant: {
      default: { root: {} },
      destructive: { icon: { 'background-color': '{color.bg-danger-subtle}', color: '{color.fg-danger}' } },
    },
  },
  extraCss: `
.cn-dialog-backdrop { position: fixed; inset: 0; background: {color.bg-overlay}; display: grid; place-items: center; padding: {space.6}; z-index: {z.modal}; }
.cn-dialog[data-state="closed"] { display: none; }
@keyframes cn-dialog-enter { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
.cn-dialog .cn-dialog__icon .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-dialog .cn-dialog__close .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-dialog .cn-dialog__close:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-dialog .cn-dialog__close:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }`,
  examples: [
    ex('Default (md)', `<div class="cn-dialog" data-size="md" data-variant="default" data-state="open" role="dialog" aria-modal="true" aria-labelledby="dlg-name-title"><header class="cn-dialog__header"><div><h2 class="cn-dialog__title" id="dlg-name-title">Name your shortlist</h2><p class="cn-dialog__description">You can rename it later from the list header.</p></div>${close}</header><div class="cn-dialog__body"><div class="cn-input" data-variant="default" data-size="md"><input class="cn-input__field" type="text" value="Japan · frozen seafood · Q4" aria-label="Shortlist name"></div></div><footer class="cn-dialog__footer"><button type="button" class="cn-button" data-variant="ghost" data-size="md"><span class="cn-button__label">Cancel</span></button><button type="button" class="cn-button" data-variant="primary" data-size="md"><span class="cn-button__label">Create shortlist</span></button></footer></div>`),
    ex('Destructive (sm)', `<div class="cn-dialog" data-size="sm" data-variant="destructive" data-state="open" role="dialog" aria-modal="true" aria-labelledby="dlg-delete-title"><header class="cn-dialog__header"><div style="display:flex;gap:var(--cn-space-3);align-items:flex-start">${icon('trash')}<div><h2 class="cn-dialog__title" id="dlg-delete-title">Delete this search?</h2><p class="cn-dialog__description">“Germany · industrial pumps” and its 38 prospects will be removed. This cannot be undone.</p></div></div>${close}</header><footer class="cn-dialog__footer"><button type="button" class="cn-button" data-variant="ghost" data-size="md"><span class="cn-button__label">Cancel</span></button><button type="button" class="cn-button" data-variant="danger" data-size="md"><span class="cn-button__label">Delete search</span></button></footer></div>`, 'The only dialog that ends with a danger Button. Cancel stays first and ghost.'),
    ex('With header icon (md)', `<div class="cn-dialog" data-size="md" data-variant="default" data-state="open" role="dialog" aria-modal="true" aria-labelledby="dlg-pause-title"><header class="cn-dialog__header"><div style="display:flex;gap:var(--cn-space-3);align-items:flex-start">${icon('calendar')}<div><h2 class="cn-dialog__title" id="dlg-pause-title">Pause outreach until Monday?</h2><p class="cn-dialog__description">Drafts stay ready; nothing is sent until 08:00 on 15 Sep in each buyer’s timezone.</p></div></div>${close}</header><footer class="cn-dialog__footer"><button type="button" class="cn-button" data-variant="ghost" data-size="md"><span class="cn-button__label">Keep sending</span></button><button type="button" class="cn-button" data-variant="primary" data-size="md"><span class="cn-button__label">Pause until Monday</span></button></footer></div>`),
    ex('Large with scrolling body (lg)', `<div class="cn-dialog" data-size="lg" data-variant="default" data-state="open" role="dialog" aria-modal="true" aria-labelledby="dlg-plan-title" style="max-height:360px"><header class="cn-dialog__header"><div><h2 class="cn-dialog__title" id="dlg-plan-title">Review the outreach plan</h2><p class="cn-dialog__description">12 companies · 3 waves · first wave tomorrow 09:00 JST</p></div>${close}</header><div class="cn-dialog__body"><p>Wave 1 (4 companies): Nakamura Trading Co., Hoffmann GmbH, Lagos Fresh Ltd., Marisco del Sur.</p><p style="margin-top:var(--cn-space-3)">Wave 2 (4 companies): Busan Cold Chain, Norsk Havfisk AS, Valencia Congelados, Pacific Reef Foods.</p><p style="margin-top:var(--cn-space-3)">Wave 3 (4 companies): Tokyo Maruha, Baltic Seafood OÜ, Dalian Ocean Trade, Cape Fisheries.</p><p style="margin-top:var(--cn-space-3)">Each company receives one email and one follow-up after 4 business days. Replies are drafted by the agent and wait for your approval.</p></div><footer class="cn-dialog__footer"><button type="button" class="cn-button" data-variant="ghost" data-size="md"><span class="cn-button__label">Back</span></button><button type="button" class="cn-button" data-variant="primary" data-size="md"><span class="cn-button__label">Start outreach</span></button></footer></div>`, 'max-height is inline here only to show the body scrolling; in the app it comes from calc(100vh - 64px).'),
  ],
  rules: [
    'A title is required and is the accessible name. Write it as the question being answered or the task being done.',
    'Exactly one primary action, last in the footer. Cancel (or the escape hatch) comes first as a ghost Button, labelled with what it does ("Keep sending"), not "Cancel" when a better verb exists.',
    'variant="destructive": header icon in danger colors and the primary becomes a danger Button. Never two filled buttons.',
    'Render the panel inside .cn-dialog-backdrop (fixed, scrim, centered, z modal). The panel itself is never position: fixed.',
    'Escape and the backdrop click close the dialog unless the body has unsaved input; then ask.',
    'Pick at most two sizes per app (typically sm for confirmations and md for forms). xl is for previews only.',
    'The body scrolls; header and footer stay put. Never let the whole panel exceed the viewport.',
    'Do not stack dialogs. A dialog that needs another step becomes a stepper inside the same dialog or a full page.',
    'Enter: scale 0.98 → 1 with fade, 260ms; the scrim fades in at the same time.',
  ],
  a11y: [
    'role="dialog" aria-modal="true" aria-labelledby pointing to the title (and aria-describedby to the description when present).',
    'Focus is trapped inside while open; on open it goes to the first control (or the cancel button for destructive dialogs) and returns to the trigger on close.',
    'Escape closes. The close button has aria-label="Close" and is the last element in the header.',
    'Everything behind the dialog gets inert (or aria-hidden) while it is open; body scroll is locked.',
  ],
  related: ['drawer', 'popover', 'alert', 'button', 'input'],
};
