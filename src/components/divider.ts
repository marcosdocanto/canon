import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// the reference content dividers: a 1px gray-200 rule, optionally carrying text (14px medium
// gray-600), a heading, a button or a button group in the middle, at the start or at the end;
// single line, dual line (rules above and below the content) or a gray-50 fill band.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';

const SPACING: Record<string, string> = { none: '0', sm: '{space.2}', md: '{space.4}', lg: '{space.8}' };

const btn = (label: string, variant = 'outline', icon = '') => `<button type="button" class="cn-button" data-variant="${variant}" data-size="sm">${icon}<span class="cn-button__label">${label}</span></button>`;
const PLUS = '<svg class="cn-button__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>';
const para = (text: string) => `<p class="cn-text-body-md" style="color:var(--cn-color-fg-muted);margin:0">${text}</p>`;
const sep = (o: { variant?: string; spacing?: string; label?: string; inner: string; orientation?: string }) =>
  `<div class="cn-divider" data-orientation="${o.orientation ?? 'horizontal'}" data-variant="${o.variant ?? 'single'}" data-spacing="${o.spacing ?? 'md'}" data-label="${o.label ?? 'center'}" role="separator"><span class="cn-divider__content">${o.inner}</span></div>`;

export const divider: ComponentSpec = {
  name: 'Divider',
  slug: 'divider',
  category: 'layout',
  description: 'A 1px gray-200 hairline that separates. Horizontal between blocks, vertical between inline controls, or the reference content divider carrying text, a heading, a button or a button group on the line, between two lines, or on a gray-50 band.',
  usage: 'Between sections of a card or form, between groups in a toolbar or menu, to label a break ("Earlier", "Or continue with") or to place an action between two blocks ("Add step"). Not between every list row or table row (those components draw their own rules), and never as decoration.',
  anatomy: [
    { part: 'root', element: 'hr', description: 'An <hr> for a plain horizontal rule. A <div role="separator"> when vertical or when it carries content (add data-label="center|start|end").' },
    { part: 'content', element: 'span', description: 'Optional slot on the line: text, a heading, a Button or a ButtonGroup. Centered, or at the start / end with data-label.', optional: true },
    { part: 'label', element: 'span', description: 'Plain text inside the content slot: 14px medium fg-muted ("Earlier", "Or"). A heading uses a real h-tag with the heading-xs class instead.', optional: true },
  ],
  props: {
    orientation: {
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
      description: 'horizontal = full-width rule between stacked blocks; vertical = 1px column that stretches to the height of a flex row (toolbars, inline meta).',
    },
    variant: {
      values: ['single', 'dual', 'fill'],
      default: 'single',
      description: 'single = one hairline, with the content sitting on it (the default). dual = a hairline above and below the content row (44px with text, 56 with buttons), for section breaks that carry an action. fill = a gray-50 band (36 / 52px) holding the content, for sticky sub-headers and grouped feeds.',
    },
    spacing: {
      values: ['none', 'sm', 'md', 'lg'],
      default: 'md',
      description: 'Margin around the rule: none 0 (inside components that manage their own spacing), sm 8px (toolbars, dense cards), md 16px (default inside cards and forms), lg 32px (between page sections). Applies as margin-block when horizontal and margin-inline when vertical.',
    },
  },
  states: {},
  base: {
    root: {
      border: '0',
      'border-top': HAIRLINE,
      width: '100%',
      height: '0',
      margin: '0',
      'flex-shrink': '0',
      color: '{color.fg-muted}',
    },
    content: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.2}',
      'padding-inline': '{space.3}',
      'white-space': 'nowrap',
    },
    label: {
      ...typeStyle('label-sm'),
      color: '{color.fg-muted}',
      'white-space': 'nowrap',
    },
  },
  variants: {
    orientation: {
      horizontal: { root: { width: '100%', height: '0', 'border-top': HAIRLINE, 'border-inline-start': '0' } },
      vertical: { root: { width: '0', height: 'auto', 'min-height': '{space.4}', 'align-self': 'stretch', 'border-top': '0', 'border-inline-start': HAIRLINE } },
    },
    variant: {
      single: { root: {} },
      dual: { root: {} },
      fill: { root: {} },
    },
    spacing: Object.fromEntries(Object.entries(SPACING).map(([k, v]) => [k, { root: { 'margin-block': v } }])),
  },
  compound: Object.entries(SPACING).map(([k, v]) => ({ when: { orientation: 'vertical', spacing: k }, block: { root: { 'margin-block': '0', 'margin-inline': v } } })),
  extraCss: `
.cn-divider[data-label] { display: flex; align-items: center; width: 100%; border: 0; height: auto; }
.cn-divider[data-label]::before, .cn-divider[data-label]::after { content: ""; flex: 1 1 auto; height: 0; border-top: ${HAIRLINE}; }
.cn-divider[data-label="start"]::before { flex: 0 0 {space.4}; }
.cn-divider[data-label="end"]::after { flex: 0 0 {space.4}; }
.cn-divider[data-label][data-variant="dual"] { border-top: ${HAIRLINE}; border-bottom: ${HAIRLINE}; padding-block: {space.3}; }
.cn-divider[data-label][data-variant="dual"]::before, .cn-divider[data-label][data-variant="dual"]::after { border-top: 0; }
.cn-divider[data-label][data-variant="fill"] { background-color: {color.bg-subtle}; padding: {space.2} {space.1}; border-radius: {radius.md}; }
.cn-divider[data-label][data-variant="fill"]::before, .cn-divider[data-label][data-variant="fill"]::after { border-top: 0; }
.cn-divider[data-label="start"][data-variant="dual"]::before, .cn-divider[data-label="start"][data-variant="fill"]::before { flex: 0 0 0; }
.cn-divider[data-label="end"][data-variant="dual"]::after, .cn-divider[data-label="end"][data-variant="fill"]::after { flex: 0 0 0; }
.cn-divider__content > .cn-text-heading-xs { color: {color.fg-default}; }`,
  examples: [
    ex('Horizontal (default)', `<div style="width:100%;max-width:480px">${para('Lumen keeps every project, task and file in one workspace your team can search.')}<hr class="cn-divider" data-orientation="horizontal" data-variant="single" data-spacing="md">${para('Invite teammates, set roles and connect the tools you already use.')}</div>`, 'A plain <hr>: 1px gray-200 with 16px above and below.'),
    ex('With text', `<div style="width:100%;max-width:480px">${para('Sofia Almeida commented · 08:31')}${sep({ inner: '<span class="cn-divider__label">Earlier</span>' })}${para('Daniel Costa opened the pull request · Sep 9')}</div>`, '14px medium gray-600 text on the line, 12px of air each side. Use for time breaks and "or" separators.'),
    ex('Heading at the start, button at the end', `<div style="width:100%;max-width:560px">${sep({ label: 'start', spacing: 'sm', inner: '<h3 class="cn-text-heading-xs">Shipping details</h3>' })}${para('FOB Santos · 24 t · 1 × 40\' reefer')}${sep({ label: 'end', spacing: 'md', inner: btn('Add step', 'outline', PLUS) })}</div>`, 'data-label="start" / "end" keep a 16px stub of line before or after the content.'),
    ex('Button and button group in the middle', `<div style="width:100%;max-width:560px;display:flex;flex-direction:column;gap:var(--cn-space-4)">${sep({ spacing: 'none', inner: btn('Add step', 'outline', PLUS) })}${sep({ spacing: 'none', inner: `<div class="cn-button-group" data-variant="attached" data-orientation="horizontal" role="group" aria-label="Insert">${btn('Text', 'outline')}${btn('Image', 'outline')}${btn('Embed', 'outline')}</div>` })}</div>`, 'An action between two blocks: one outline Button, or a ButtonGroup.'),
    ex('Dual line and fill', `<div style="width:100%;max-width:560px;display:flex;flex-direction:column;gap:var(--cn-space-6)">${sep({ variant: 'dual', spacing: 'none', inner: '<span class="cn-divider__label">Today</span>' })}${sep({ variant: 'dual', spacing: 'none', label: 'end', inner: btn('Show 12 earlier events', 'ghost') })}${sep({ variant: 'fill', spacing: 'none', label: 'start', inner: '<span class="cn-divider__label">Yesterday</span>' })}</div>`, 'dual = rules above and below the content row; fill = a gray-50 band (radius 6) holding it.'),
    ex('Vertical in a toolbar', `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--cn-space-1)">${btn('Approve', 'primary')}${btn('Edit', 'ghost')}<div class="cn-divider" data-orientation="vertical" data-variant="single" data-spacing="sm" role="separator" aria-orientation="vertical"></div>${btn('Snooze', 'ghost')}${btn('Discard', 'ghost')}</div>`, 'Stretches to the row height; margin-inline from spacing.'),
    ex('Large spacing between sections', `<div style="width:100%;max-width:480px"><h3 class="cn-text-heading-sm">Company</h3>${para('Lumen · Lisbon, Portugal')}<hr class="cn-divider" data-orientation="horizontal" data-variant="single" data-spacing="lg"><h3 class="cn-text-heading-sm">Contacts</h3>${para('Maya Chen · Product Manager')}</div>`),
  ],
  rules: [
    'A divider separates two things that are both present; never end a block with one and never stack two.',
    'Do not add dividers between rows of List, Table, DescriptionList or Accordion; they draw their own rules.',
    'Spacing is a prop, never an ad-hoc margin: sm in toolbars and dense cards, md inside cards and forms, lg between page sections, none inside components that already space their children.',
    'Prefer whitespace over a divider when the two blocks already differ in type (a heading followed by a paragraph needs no rule).',
    'Text on the line is 14px medium muted, 1–3 words ("Earlier", "Or", "Today"); a heading on the line is a real h-tag in heading-xs; a labeled divider is not a section title on its own.',
    'One action on a divider at most: an outline or ghost sm Button, or one ButtonGroup; never a primary button.',
    'single by default; dual only when the divider carries an action between two long blocks; fill for sticky date bands in feeds.',
    'Vertical dividers only between inline controls or meta of the same height; never taller than the row.',
    'Always gray-200; never a stronger color, never thicker than 1px, never dashed (dashed is reserved for drop zones).',
  ],
  a11y: [
    'A plain horizontal rule is an <hr> (implicit role separator). A labeled or vertical one is a <div role="separator">; add aria-orientation="vertical" when vertical.',
    'The label is read as text; keep it meaningful on its own ("Earlier" is fine, "———" is not).',
    'A button or button group on the divider is focusable in the normal order; the separator role does not hide it.',
    'Decorative dividers inside a component that already conveys grouping may use aria-hidden="true" to reduce noise.',
  ],
  related: ['card', 'button', 'button-group', 'list', 'accordion', 'timeline'],
};
