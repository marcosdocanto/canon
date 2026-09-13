import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, STATE, ex, ICON, typeStyle } from './_shared.ts';

const close = `<button type="button" class="cn-drawer__close" aria-label="Close">${ICON.x}</button>`;

export const drawer: ComponentSpec = {
  name: 'Drawer',
  slug: 'drawer',
  category: 'overlays',
  description: 'Side panel that slides in over the page for the detail of one item while the list stays visible behind the scrim. Raised surface, a hairline on the inner edge, shadow-lg; sticky header and footer with a scrolling body.',
  usage: 'Use for the detail of a list or table row (a prospect, a conversation, an agent run), for editing one record, and for filters on mobile. Not for confirmations (use Dialog) and never as a replacement for a page: if the content has its own navigation, it is a page.',
  anatomy: [
    { part: 'root', element: 'aside', description: 'The panel. role="dialog" aria-modal="true" aria-labelledby → title. data-state="open|closed", data-side, data-size. Rendered inside .cn-drawer-backdrop in the app; in the gallery it is shown bounded with an inline height.' },
    { part: 'header', element: 'header', description: 'Title/description on the left, close button on the right. Bottom hairline. Does not scroll.' },
    { part: 'title', element: 'h2', description: 'heading-md. Names the item ("Nakamura Trading Co.") or the task ("Edit agent").' },
    { part: 'description', element: 'p', description: 'body-sm muted, one line of context under the title.', optional: true },
    { part: 'close', element: 'button', description: '32px ghost icon button with an X in the header. aria-label="Close".' },
    { part: 'body', element: 'div', description: 'The scrolling area. Padding space-6; content is sections, description lists, a timeline, a form.' },
    { part: 'footer', element: 'footer', description: 'Subtle background, top hairline, right-aligned actions: ghost first, one primary last. Only when the drawer edits something.', optional: true },
  ],
  props: {
    side: {
      values: ['right', 'left', 'bottom'],
      default: 'right',
      description: 'Edge the drawer slides in from. right = detail of a list item (default, the Vera pattern); left = navigation or filters; bottom = a sheet on mobile: full width, 80vh tall, rounded top corners.',
    },
    size: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Width for right/left drawers. sm = 360px for a short detail or filters; md = 480px for the detail of a record (default); lg = 640px for a conversation or an editor. Ignored for side="bottom".',
    },
  },
  states: {
    open: STATE.open(),
    closed: { selector: '[data-state="closed"]', description: 'Hidden (display none); the backdrop is removed at the same time.', markup: 'data-state="closed"' },
    closeHover: { selector: ' .cn-drawer__close:hover', description: 'Pointer over the close button: subtle fill. Styled in extraCss because it lives on a child.', markup: 'native :hover on .cn-drawer__close' },
    closeFocus: { selector: ' .cn-drawer__close:focus-visible', description: 'Keyboard focus on the close button shows the focus ring. Styled in extraCss.', markup: 'native :focus-visible on .cn-drawer__close' },
  },
  base: {
    root: {
      display: 'flex',
      'flex-direction': 'column',
      width: '480px',
      'max-width': '100vw',
      height: '100%',
      'background-color': '{color.bg-surface-raised}',
      'border-inline-start': '{border.width.thin} solid {color.border-default}',
      'box-shadow': '{shadow.lg}',
      color: '{color.fg-default}',
      overflow: 'hidden',
      ...typeStyle('body-md'),
    },
    header: {
      display: 'flex',
      'align-items': 'flex-start',
      'justify-content': 'space-between',
      gap: '{space.4}',
      padding: '{space.5} {space.6}',
      'border-bottom': '{border.width.thin} solid {color.border-subtle}',
      'flex-shrink': '0',
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
    body: { flex: '1 1 auto', 'min-height': '0', overflow: 'auto', padding: '{space.6}' },
    footer: {
      display: 'flex',
      'flex-wrap': 'wrap',
      'align-items': 'center',
      'justify-content': 'flex-end',
      gap: '{space.2}',
      padding: '{space.4} {space.6}',
      'border-top': '{border.width.thin} solid {color.border-subtle}',
      'background-color': '{color.bg-subtle}',
      'flex-shrink': '0',
    },
    '@states': {
      closed: { root: { display: 'none' } },
    },
  },
  variants: {
    side: {
      right: {
        root: {},
        '@states': { open: { root: { animation: 'cn-drawer-in-right {motion.duration.slow} {motion.easing.out} both' } } },
      },
      left: {
        root: { 'border-inline-start': '0', 'border-inline-end': '{border.width.thin} solid {color.border-default}' },
        '@states': { open: { root: { animation: 'cn-drawer-in-left {motion.duration.slow} {motion.easing.out} both' } } },
      },
      bottom: {
        root: { width: '100%', 'max-width': '100vw', height: '80vh', 'border-inline-start': '0', 'border-top': '{border.width.thin} solid {color.border-default}', 'border-radius': '{radius.2xl} {radius.2xl} 0 0' },
        '@states': { open: { root: { animation: 'cn-drawer-in-bottom {motion.duration.slow} {motion.easing.out} both' } } },
      },
    },
    size: {
      sm: { root: { width: '360px' } },
      md: { root: { width: '480px' } },
      lg: { root: { width: '640px' } },
    },
  },
  compound: [
    { when: { side: 'bottom', size: 'sm' }, block: { root: { width: '100%' } } },
    { when: { side: 'bottom', size: 'md' }, block: { root: { width: '100%' } } },
    { when: { side: 'bottom', size: 'lg' }, block: { root: { width: '100%' } } },
  ],
  extraCss: `
.cn-drawer-backdrop { position: fixed; inset: 0; background: {color.bg-overlay}; z-index: {z.modal}; display: flex; justify-content: flex-end; align-items: stretch; }
.cn-drawer-backdrop[data-side="left"] { justify-content: flex-start; }
.cn-drawer-backdrop[data-side="bottom"] { flex-direction: column; justify-content: flex-end; }
@keyframes cn-drawer-in-right { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
@keyframes cn-drawer-in-left { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
@keyframes cn-drawer-in-bottom { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.cn-drawer .cn-drawer__close .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-drawer .cn-drawer__close:hover { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-drawer .cn-drawer__close:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }`,
  examples: [
    ex('Right, md (item detail)', `<aside class="cn-drawer" data-side="right" data-size="md" data-state="open" role="dialog" aria-modal="true" aria-labelledby="drw-nakamura" style="height:420px"><header class="cn-drawer__header"><div><h2 class="cn-drawer__title" id="drw-nakamura">Nakamura Trading Co.</h2><p class="cn-drawer__description">Osaka, Japan · Importer of frozen seafood · <span class="cn-badge" data-tone="success" data-variant="soft" data-size="sm">Verified</span></p></div>${close}</header><div class="cn-drawer__body"><p><strong>Why it fits</strong><br>Imports 1,200 t/year of frozen shrimp from Ecuador and Vietnam; two decision makers found; replied to a similar offer in 2025.</p><p style="margin-top:var(--cn-space-4)"><strong>Last activity</strong><br>Email opened 3 days ago · No reply yet · Follow-up scheduled for Tuesday 09:00 JST.</p><p style="margin-top:var(--cn-space-4)"><strong>Contacts</strong><br>Kenji Nakamura, Purchasing Director · Aiko Sato, Import Coordinator.</p></div><footer class="cn-drawer__footer"><button type="button" class="cn-button" data-variant="ghost" data-size="md"><span class="cn-button__label">Archive</span></button><button type="button" class="cn-button" data-variant="primary" data-size="md"><span class="cn-button__label">Send follow-up now</span></button></footer></aside>`, 'height:420px is inline only so the gallery shows the bounded panel; in the app it fills the backdrop.'),
    ex('Left, sm (filters)', `<aside class="cn-drawer" data-side="left" data-size="sm" data-state="open" role="dialog" aria-modal="true" aria-labelledby="drw-filters" style="height:360px"><header class="cn-drawer__header"><div><h2 class="cn-drawer__title" id="drw-filters">Filters</h2><p class="cn-drawer__description">38 of 214 prospects match</p></div>${close}</header><div class="cn-drawer__body"><div class="cn-input" data-variant="default" data-size="sm">${ICON.search.replace('cn-icon', 'cn-input__icon')}<input class="cn-input__field" type="search" placeholder="Country or product…" aria-label="Filter prospects"></div><p style="margin-top:var(--cn-space-4);color:var(--cn-color-fg-muted)">Japan · South Korea · Frozen seafood · Replied</p></div><footer class="cn-drawer__footer"><button type="button" class="cn-button" data-variant="ghost" data-size="md"><span class="cn-button__label">Clear all</span></button><button type="button" class="cn-button" data-variant="primary" data-size="md"><span class="cn-button__label">Show 38</span></button></footer></aside>`),
    ex('Bottom sheet (mobile)', `<div style="width:100%;max-width:420px"><aside class="cn-drawer" data-side="bottom" data-size="md" data-state="open" role="dialog" aria-modal="true" aria-labelledby="drw-sheet" style="height:300px"><header class="cn-drawer__header"><div><h2 class="cn-drawer__title" id="drw-sheet">Approve this reply?</h2><p class="cn-drawer__description">Drafted by the agent 2 minutes ago</p></div>${close}</header><div class="cn-drawer__body">“Thank you for your interest, Nakamura-san. We can supply 40 t of frozen shrimp per month from October, CIF Osaka. Would a call on Thursday suit you?”</div><footer class="cn-drawer__footer"><button type="button" class="cn-button" data-variant="ghost" data-size="md"><span class="cn-button__label">Edit</span></button><button type="button" class="cn-button" data-variant="primary" data-size="md"><span class="cn-button__label">Approve and send</span></button></footer></aside></div>`, 'Bottom drawers are full width, 80vh tall, with rounded top corners. The wrapper is inline here only to bound the example.'),
    ex('Large, read-only (no footer)', `<aside class="cn-drawer" data-side="right" data-size="lg" data-state="open" role="dialog" aria-modal="true" aria-labelledby="drw-run" style="height:360px"><header class="cn-drawer__header"><div><h2 class="cn-drawer__title" id="drw-run">Agent run · 11 Sep, 09:14</h2><p class="cn-drawer__description">Prospecting · Japan · frozen seafood · 4 min 12 s</p></div>${close}</header><div class="cn-drawer__body"><p>Read 3 replies from Nakamura, Hoffmann and Lagos Fresh. Drafted 3 answers. Flagged Hoffmann as “asks for a price list” — waiting for your file.</p><p style="margin-top:var(--cn-space-4)">Searched 212 companies, verified 38, discarded 174 (no trade data or wrong product).</p></div></aside>`),
  ],
  rules: [
    'The detail of a list item opens in a drawer, never in a new page. The list stays visible behind the scrim so the user keeps their place.',
    'One level deep only: a drawer never opens another drawer. A link inside a drawer that needs more space closes it and navigates.',
    'Render the panel inside .cn-drawer-backdrop with the same data-side; the panel itself is never position: fixed.',
    'Header is sticky and carries the item name; the body scrolls; the footer appears only when the drawer edits something (ghost first, one primary last).',
    'Width comes from size; never set it inline. Below 640px every drawer becomes full width (right/left) or a bottom sheet.',
    'Close on Escape, on the close button and on scrim click, unless the body has unsaved edits; then ask.',
    'Deep-link the open drawer (?prospect=123) so refresh and share keep it open.',
    'Enter: 16px slide from its side with fade, 260ms; leave is the reverse at 180ms.',
  ],
  a11y: [
    'role="dialog" aria-modal="true" with aria-labelledby on the title.',
    'Focus moves to the close button (read-only drawers) or the first field (edit drawers) on open, and returns to the row that opened it on close.',
    'Focus is trapped inside while open; the page behind is inert.',
    'The close button has aria-label="Close"; Escape closes.',
  ],
  related: ['dialog', 'popover', 'card', 'button', 'badge'],
};
