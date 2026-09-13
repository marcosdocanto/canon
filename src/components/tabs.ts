import type { ComponentSpec, StyleBlock } from '../types.ts';
import { RESET_BUTTON, ex, ICON, typeStyle } from './_shared.ts';

// Selection persists as a rule or solid segment; hover stays a quieter surface change.

const TRANSITION_FAST = {
  'transition-property': 'background-color, border-color, color, box-shadow',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
// Draw the baseline inside the row so tabs never overhang its scroll area.
const BASELINE = 'inset 0 calc(-1 * {border.width.thin}) 0 {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

/** Persistent selection only; hover must not impersonate the current view. */
const on = (variant: string, tail = '') =>
  [`[aria-selected="true"]`, `[aria-current="page"]`]
    .map((s) => `.cn-tabs[data-variant="${variant}"] .cn-tabs__tab${s}${tail}`)
    .join(', ');

/** A gray-50 track holding white pills (button-border, and its older name "pill"). */
const track = (radius: string, padding: string): StyleBlock => ({
  root: { display: 'inline-flex', 'align-self': 'flex-start', gap: '{space.1}', padding, 'border-radius': radius, 'background-color': '{color.bg-subtle}', 'box-shadow': ring('{color.border-default}') },
});

const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-tabs__icon');
const tab = (label: string, selected: boolean, id: string, extra = '') =>
  `<button type="button" role="tab" class="cn-tabs__tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${selected}" tabindex="${selected ? '0' : '-1'}"${extra}>${label}</button>`;
const count = (n: string) => `<span class="cn-tabs__count">${n}</span>`;
const SETTINGS = ['My details', 'Profile', 'Password', 'Team', 'Plan', 'Billing'];
const list = (variant: string, size: string, id: string, labels = SETTINGS, current = 0, orientation = variant === 'line' ? 'vertical' : 'horizontal', width = 'hug') =>
  `<div class="cn-tabs" data-variant="${variant}" data-size="${size}" data-orientation="${orientation}" data-width="${width}" role="tablist" aria-label="Settings"${orientation === 'vertical' ? ' aria-orientation="vertical"' : ''}>${labels.map((l, i) => tab(l, i === current, `${id}-${i}`)).join('')}</div>`;

export const tabs: ComponentSpec = {
  name: 'Tabs',
  slug: 'tabs',
  category: 'navigation',
  description: 'A tablist that switches between views of the same object, in several emphasis levels: underline (2px brand bar on a hairline), button-brand (solid action segment), button-gray (gray-50 pill), button-border (white pill in a gray track) and button-minimal (ringed white pill in a gray track); line is a vertical list with a subtle selected fill. Labels are semibold, 14px (sm, 36 / 32px) or 16px (md, 44 / 36px), with optional icons and count badges.',
  usage: 'Use to switch between peer views of one thing: sections of a settings page, panes of a record, views of a card. Route-level tabs are links with aria-current="page"; in-page tabs are buttons with aria-selected. Not for sequential steps (Stepper), not for filters (Tag / SegmentedControl), not for more than about eight options (SidebarNav or a Select).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The tablist (role="tablist", aria-label). Flex row of tabs (column when data-orientation="vertical"); carries the bottom hairline for underline, or the gray-50 track for button-border / button-minimal / pill.' },
    { part: 'tab', element: 'button', description: 'One tab: <button role="tab"> for in-page views, <a aria-current="page"> for routes. Semibold text-quaternary label, radius 6, gap 8; holds text, optional icon, optional count badge.' },
    { part: 'icon', element: 'svg', description: 'Optional leading icon, 16px (sm) or 20px (md), fg-subtle. If one tab has an icon, all tabs in the list do. Decorative.', optional: true },
    { part: 'count', element: 'span', description: 'Optional count after the label: a 22px badge (12px medium) in gray; turns brand-tinted on the selected tab of underline / line / button-brand, stays a white "modern" badge elsewhere. Hidden under 768px. Only for numbers that call for action.', optional: true },
    { part: 'panel', element: 'div', description: 'The tabpanel (role="tabpanel", aria-labelledby the tab). A sibling AFTER the tablist, never inside it; padding-top separates it from the list.', optional: true },
  ],
  props: {
    variant: {
      values: ['underline', 'pill', 'enclosed', 'button-brand', 'button-gray', 'button-border', 'button-minimal', 'line'],
      default: 'underline',
      description: 'underline = the page-section default: 2px brand-600 bar under the selected tab on a full-width gray-200 hairline, brand-700 text when selected . button-brand = solid action segment with brand-700 text (settings sub-navigation, filters in a card). button-gray = gray-50 pill with gray-700 text (quiet toolbars). button-border = white pill with a fine outline inside a gray-50 track with a gray-200 ring (view switch in a card header). button-minimal = white pill with a control outline inside a gray-50 track, radius 8 (dense toolbars). line = vertical list with a subtle selected fill and action-colored text (settings side navigation; set data-orientation="vertical"). pill = the older name of button-border, kept for existing markup. enclosed = folder tabs that merge into the panel below (editor panes only).',
    },
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 16px medium labels: 44px button tabs, 36px underline tabs, 32px line tabs; the default for page sections and settings. sm = 14px medium labels: 36px button tabs, 32px underline tabs, 24px line tabs; inside cards, drawers and dense toolbars.',
    },
    orientation: {
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
      description: 'horizontal = a row (every variant except line). vertical = a column, 8px between tabs, labels aligned to the start; use with line, button-brand, button-gray, button-border or button-minimal for a settings side navigation.',
    },
    width: {
      values: ['hug', 'full'],
      default: 'hug',
      description: 'hug = tabs take the width of their labels (default). full = the list spans its container and every tab takes an equal share (mobile, card headers with 2–4 tabs); underline gaps grow from 12 to 16px.',
    },
  },
  states: {
    current: { selector: ' .cn-tabs__tab[aria-selected="true"], & .cn-tabs__tab[aria-current="page"]', description: 'The selected tab (lives on the TAB, not the root). underline: action-colored text and bottom rule; line: action-colored text and subtle fill; button-brand: action fill and on-action text; button-gray: gray-50 fill; button-border: white pill with a fine outline; button-minimal: white pill with a control outline; enclosed: surface fill with an open bottom.', markup: 'aria-selected="true" on a role="tab" button, or aria-current="page" on a link tab' },
    hover: { selector: ' .cn-tabs__tab:hover', description: 'Pointer over a tab: a subtle surface change; the selection bar stays on the current tab.', markup: 'native :hover on the tab' },
    focus: { selector: ' .cn-tabs__tab:focus-visible', description: 'Keyboard focus on a tab: the token-defined focus ring around that tab.', markup: 'native :focus-visible on the tab' },
    disabled: { selector: ' .cn-tabs__tab:disabled, & .cn-tabs__tab[aria-disabled="true"]', description: 'Tab cannot be chosen (feature off, no data yet). 50% opacity, no hover; keep the label so users know the view exists.', markup: 'disabled or aria-disabled="true" on the tab' },
  },
  base: {
    root: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.1}',
      'min-width': '0',
      'max-width': '100%',
    },
    tab: {
      ...RESET_BUTTON,
      position: 'relative',
      'z-index': '{z.raised}',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      gap: '{space.2}',
      'flex-shrink': '0',
      padding: '{space.2.5}',
      'border-radius': '{radius.md}',
      ...typeStyle('label-lg'),
      color: '{color.fg-subtle}',
      'white-space': 'nowrap',
      ...TRANSITION_FAST,
    },
    icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', display: 'block', color: '{color.fg-subtle}', transition: 'inherit' },
    count: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      height: '22px',
      'padding-inline': '{space.2}',
      'border-radius': '{radius.sm}',
      'background-color': '{color.bg-subtle}',
      'box-shadow': ring('{color.border-default}'),
      color: '{color.fg-muted}',
      ...typeStyle('label-xs'),
      'font-variant-numeric': 'tabular-nums',
      transition: 'inherit',
    },
  },
  variants: {
    variant: {
      underline: {
        root: { gap: '{space.3}', 'align-items': 'stretch', 'box-shadow': BASELINE },
        tab: { padding: '0 {space.0.5} {space.2.5}', 'border-radius': '0', 'border-bottom': '{border.width.medium} solid transparent' },
      },
      pill: track('{radius.control}', '{space.0.5}'),
      enclosed: {
        root: { 'box-shadow': BASELINE, 'align-items': 'flex-end', gap: '{space.1}' },
        tab: { 'border-width': '{border.width.thin}', 'border-style': 'solid', 'border-color': 'transparent', 'border-bottom-width': '0', 'border-radius': '{radius.control} {radius.control} 0 0' },
      },
      'button-brand': { root: { gap: '{space.1}' } },
      'button-gray': { root: { gap: '{space.1}' } },
      'button-border': track('{radius.control}', '{space.0.5}'),
      'button-minimal': { root: { display: 'inline-flex', 'align-self': 'flex-start', gap: '{space.0.5}', 'border-radius': '{radius.control}', 'background-color': '{color.bg-subtle}', 'box-shadow': ring('{color.border-default}') }, tab: { 'border-radius': '{radius.control}' } },
      line: {
        root: { 'flex-direction': 'column', 'align-items': 'stretch', gap: '{space.2}', width: 'max-content' },
        tab: { 'justify-content': 'flex-start', padding: '{space.1} {space.3.5} {space.1} {space.3}', 'border-radius': '0' },
      },
    },
    size: {
      sm: {
        tab: { padding: '{space.2} {space.2.5}', ...typeStyle('label-md'), gap: '{space.1.5}' },
        icon: { width: '{size.icon.sm}', height: '{size.icon.sm}' },
      },
      md: { root: {} },
    },
    orientation: {
      horizontal: { root: {} },
      vertical: { root: { 'flex-direction': 'column', 'align-items': 'stretch', gap: '{space.2}', width: 'max-content' }, tab: { 'justify-content': 'flex-start' } },
    },
    width: {
      hug: { root: {} },
      full: { root: { width: '100%', display: 'flex', 'align-self': 'stretch' }, tab: { flex: '1 1 0', 'min-width': '0' } },
    },
  },
  compound: [
    { when: { variant: 'underline', size: 'sm' }, block: { tab: { padding: '0 {space.0.5} {space.2.5}' } } },
    { when: { variant: 'line', size: 'sm' }, block: { tab: { padding: '{space.0.5} {space.3} {space.0.5} {space.2.5}' } } },
    { when: { variant: 'underline', width: 'full' }, block: { root: { gap: '{space.4}' } } },
    { when: { variant: 'pill', size: 'sm' }, block: { root: { 'border-radius': '{radius.control}', padding: '{space.0.5}' } } },
    { when: { variant: 'button-border', size: 'sm' }, block: { root: { 'border-radius': '{radius.control}', padding: '{space.0.5}' } } },
    { when: { variant: 'button-brand', orientation: 'vertical' }, block: { root: { gap: '{space.1}' } } },
    { when: { variant: 'button-gray', orientation: 'vertical' }, block: { root: { gap: '{space.1}' } } },
  ],
  extraCss: `
.cn-tabs__tab:hover:not(:disabled):not([aria-disabled="true"]):not([aria-selected="true"]):not([aria-current="page"]) { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-tabs:not([data-orientation="vertical"]):not([data-variant="line"]) { overflow-x: auto; }
.cn-tabs__panel { padding-top: {space.6}; outline: none; }
.cn-tabs__panel:focus-visible { box-shadow: {shadow.focus}; border-radius: {radius.sm}; }
${on('underline')} { color: {color.fg-action}; border-bottom-color: {color.bg-action}; }
${on('line')} { color: {color.fg-action}; background-color: {color.bg-action-subtle}; }
${on('button-brand')} { color: {color.fg-on-action}; background-color: {color.bg-action}; }
${on('button-gray')} { color: {color.fg-muted}; background-color: {color.bg-subtle}; }
${on('button-border')}, ${on('pill')} { color: {color.fg-default}; background-color: {color.bg-surface}; box-shadow: ${ring('{color.border-control}')}; }
${on('button-minimal')} { color: {color.fg-muted}; background-color: {color.bg-surface}; box-shadow: ${ring('{color.border-control}')}, {shadow.xs}; }
${on('enclosed')} { color: {color.fg-muted}; background-color: {color.bg-surface}; border-color: {color.border-default}; }
${on('underline', ' .cn-tabs__icon')}, ${on('line', ' .cn-tabs__icon')} { color: {color.fg-action}; }
${on('button-brand', ' .cn-tabs__icon')} { color: inherit; }
${on('button-gray', ' .cn-tabs__icon')}, ${on('button-border', ' .cn-tabs__icon')}, ${on('pill', ' .cn-tabs__icon')}, ${on('button-minimal', ' .cn-tabs__icon')}, ${on('enclosed', ' .cn-tabs__icon')} { color: {color.fg-default}; }
${on('underline', ' .cn-tabs__count')}, ${on('line', ' .cn-tabs__count')} { background-color: {color.bg-action-subtle}; box-shadow: none; color: {color.fg-action}; }
${on('button-brand', ' .cn-tabs__count')} { background-color: transparent; box-shadow: none; color: inherit; }
.cn-tabs[data-variant="button-gray"] .cn-tabs__count, .cn-tabs[data-variant="button-border"] .cn-tabs__count, .cn-tabs[data-variant="pill"] .cn-tabs__count, .cn-tabs[data-variant="button-minimal"] .cn-tabs__count, .cn-tabs[data-variant="enclosed"] .cn-tabs__count { background-color: {color.bg-surface}; box-shadow: ${ring('{color.border-control}')}, {shadow.xs}; }
.cn-tabs__tab:focus-visible { outline: 2px solid {color.border-action}; outline-offset: -2px; }
.cn-tabs[data-variant="underline"] .cn-tabs__tab:focus-visible, .cn-tabs[data-variant="line"] .cn-tabs__tab:focus-visible { border-radius: {radius.sm}; }
.cn-tabs__tab:disabled, .cn-tabs__tab[aria-disabled="true"] { opacity: {opacity.disabled}; cursor: not-allowed; pointer-events: none; }
@media (max-width: {breakpoint.md}) { .cn-tabs .cn-tabs__count { display: none; } }`,
  examples: [
    ex('Underline (default)', list('underline', 'md', 'u'), '16px medium labels, 36px tall; the selected tab is brand-700 with a 2px brand-600 bar on the gray-200 hairline.'),
    ex('Underline sm with icons and counts', `<div class="cn-tabs" data-variant="underline" data-size="sm" data-orientation="horizontal" data-width="hug" role="tablist" aria-label="Inbox">${tab(`${icon('inbox')}Unread${count('12')}`, true, 'in-0')}${tab(`${icon('user')}Mentions${count('3')}`, false, 'in-1')}${tab(`${icon('check')}Done`, false, 'in-2')}</div>`, '14px labels, 32px tall, 16px icons. The count of the selected tab turns brand-tinted; it hides below 768px.'),
    ex('Button brand', list('button-brand', 'sm', 'bb'), 'A solid action-colored segment marks selection; hover stays neutral.'),
    ex('Button gray', list('button-gray', 'sm', 'bg'), 'Same pill in gray-50 with gray-700 text.'),
    ex('Button border', list('button-border', 'sm', 'bo', ['All', 'Active', 'Archived']), 'A quiet track with 2px inset spacing holds a flat, outlined selected segment.'),
    ex('Button minimal', list('button-minimal', 'sm', 'bm', ['Day', 'Week', 'Month']), 'A compact neutral track; the selected segment uses the surface fill and a control outline.'),
    ex('Line (vertical)', `<div style="display:flex;gap:var(--cn-space-8);align-items:flex-start">${list('line', 'md', 'ln')}${list('button-brand', 'sm', 'lv', SETTINGS, 2, 'vertical')}</div>`, 'line = subtle selected fill and action-colored text, 32px rows; any button variant becomes a column with data-orientation="vertical".'),
    ex('Full width', `<div style="width:100%;max-width:480px">${list('underline', 'sm', 'fw', ['Overview', 'Activity', 'Files', 'Notes'], 1, 'horizontal', 'full')}</div>`, 'data-width="full": every tab takes an equal share and the underline gaps grow to 16px.'),
    ex('Pill and enclosed (kept for existing markup)', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-6);align-items:flex-start">${list('pill', 'md', 'pl', ['Overview', 'Activity', 'Files'])}${list('enclosed', 'md', 'en', ['Preview', 'HTML', 'CSS', 'React'], 1)}</div>`, 'pill is the same look as button-border, with token-defined corners and 2px inset spacing. enclosed is the folder tab for editor panes.'),
    ex('With panel', `<div style="width:100%;max-width:560px">${list('underline', 'md', 'pn', ['Steps', 'Replies', 'Settings'])}<div class="cn-tabs__panel" role="tabpanel" id="panel-pn-0" aria-labelledby="tab-pn-0" tabindex="0"><p class="cn-text-body-md">4 steps over 9 days. The next email goes out Thursday at 09:00 to 38 customers.</p></div></div>`, 'The panel is a sibling after the tablist with padding-top 24px.'),
    ex('Route tabs with a disabled tab', `<div class="cn-tabs" data-variant="underline" data-size="md" data-orientation="horizontal" data-width="hug" aria-label="Reports"><a href="#" class="cn-tabs__tab" aria-current="page">Customers</a><a href="#" class="cn-tabs__tab">Invoices</a><a href="#" class="cn-tabs__tab">Files</a><a class="cn-tabs__tab" aria-disabled="true" title="Available on the Business plan">Attribution</a></div>`, 'Links with aria-current="page" when each tab is a URL; no tablist role. The disabled tab keeps its label at 50% opacity.'),
  ],
  rules: [
    '2–8 tabs. With one there is nothing to switch; beyond eight use SidebarNav or a Select.',
    'Labels are 1–3 words in sentence case, nouns ("My details", "Billing"). Never verbs, never trailing punctuation.',
    'Exactly one tab is selected at all times; the first one by default. Never start with nothing selected.',
    'Heights come only from size: md = 44px button tabs / 36px underline / 32px line; sm = 36 / 32 / 24. Never add padding to change them.',
    'Counts are the 22px badge (count part); only for numbers that ask for action (unread, waiting, failed). Totals belong in the panel.',
    'Icons are all-or-none within one list, leading, 16px at sm and 20px at md, fg-subtle at rest and brand or ink when selected.',
    'underline for page sections and settings pages; button-brand or button-gray for a sub-navigation inside a page; button-border / button-minimal for a view switch inside a card header or toolbar; line (vertical) for a settings side navigation; enclosed only for editor panes with a visible panel border.',
    'Hover uses a quiet fill. The selection rule or solid segment appears only on the current tab.',
    'Tabs switch views of the same object. Different pages are links with aria-current="page"; a sequential flow is a Stepper.',
    'Never nest a tablist inside a tabpanel. A second level of navigation is a SidebarNav or a button-* Tabs inside the card, not tabs under tabs.',
    'Tabs never wrap onto a second line. On narrow screens use data-width="full" with ≤ 4 tabs, or let the tablist scroll horizontally. Focus stays inside the tab so it remains visible in the scroll area.',
  ],
  a11y: [
    'In-page tabs: root role="tablist" with aria-label, tabs are <button role="tab" aria-selected aria-controls>, panels are role="tabpanel" aria-labelledby, tabindex="0".',
    'Roving tabindex: only the selected tab is in the tab order (tabindex="0"); Left/Right (Up/Down when vertical) move focus, Home/End jump, Enter/Space or automatic activation selects.',
    'Route tabs are plain <a href> with aria-current="page" inside a <nav>; do NOT add role="tab" to links that navigate.',
    'Disabled tabs use aria-disabled="true" (stay perceivable) and a title or Tooltip with the reason.',
    'Selection is conveyed by text color and the bar or pill, never by color alone; the count keeps its number in text and hides only visually on mobile.',
    'Vertical lists set aria-orientation="vertical" on the tablist so arrow-key direction matches.',
  ],
  related: ['topbar', 'sidebar-nav', 'segmented-control', 'stepper', 'badge'],
};
