import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// the reference shortcut chip: 12px medium sans text in gray-600 on white, a 1px gray-300 inset
// ring, radius 4, padding 1px 4px, at least 20×20. Flat — no keycap edge, no mono.

const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const k = (key: string, size: 'sm' | 'md' = 'md') => `<kbd class="cn-kbd" data-size="${size}">${key}</kbd>`;

export const kbd: ComponentSpec = {
  name: 'Kbd',
  slug: 'kbd',
  category: 'typography',
  description: 'A keyboard key drawn as the reference shortcut chip: 12px medium text on white with a 1px gray-300 ring, radius 4, 20px tall. Several in a row spell a shortcut (⌘ K).',
  usage: 'Show keyboard shortcuts in menus, tooltips, the command palette, input trailers and onboarding hints. Not for code (Code) and never as a button: a Kbd is not clickable.',
  anatomy: [
    { part: 'root', element: 'kbd', description: 'One key: a symbol (⌘ ⇧ ⌥) or a short word (Esc, Enter, K). One Kbd per key; put them side by side for a chord.' },
  ],
  props: {
    size: { values: ['sm', 'md'], default: 'md', description: 'md = 20px tall with 12px text, for menus, inputs, docs and the command palette (the reference chip); sm = 18px tall with 11px text inside tooltips and table cells.' },
  },
  states: {},
  base: {
    root: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'box-sizing': 'border-box',
      'min-width': '{space.5}',
      height: '{space.5}',
      padding: '{space.px} {space.1}',
      ...typeStyle('label-xs'),
      color: '{color.fg-muted}',
      'background-color': '{color.bg-surface}',
      'box-shadow': ring('{color.border-control}'),
      'border-radius': '{radius.sm}',
      'vertical-align': 'middle',
      'white-space': 'nowrap',
      'user-select': 'none',
    },
  },
  variants: {
    size: {
      sm: { root: { height: '18px', 'min-width': '18px', padding: '{space.px} 3px', 'font-size': '{font.size.2xs}' } },
      md: { root: {} },
    },
  },
  extraCss: `
.cn-kbd + .cn-kbd { margin-inline-start: {space.1}; }`,
  examples: [
    ex('Single key', k('⌘'), '20×20 minimum, 12px medium gray-600, 1px gray-300 ring, radius 4.'),
    ex('Chord', `${k('⌘')}${k('K')}`, 'Modifiers first, then the key, 4px between them.'),
    ex('Named keys', `<span style="display:inline-flex;gap:var(--cn-space-4);align-items:center">${k('Esc')}<span>${k('⇧')}${k('⌘')}${k('P')}</span>${k('Enter')}${k('Tab')}</span>`, 'Words stretch the chip; the padding stays 1px 4px.'),
    ex('In a sentence', `<p class="cn-text-body-md" style="max-width:560px">Press ${k('⌘')}${k('K')} to open the command palette, ${k('/')} to search projects, or ${k('Esc')} to close any panel.</p>`),
    ex('Small in a hint', `<span class="cn-text-body-sm" style="color:var(--cn-color-fg-muted)">Save ${k('⌘', 'sm')}${k('S', 'sm')}</span>`, '18px tall with 11px text for tooltips and table cells.'),
  ],
  recipes: [
    ex('Menu item with shortcut', `<div style="width:240px;display:flex;flex-direction:column;gap:var(--cn-space-0-5)">${[['Duplicate', '⌘', 'D'], ['Archive', '⌘', 'E'], ['Delete', '⌘', '⌫']].map(([label, m, key], i) => `<div class="cn-text-body-md" style="display:flex;align-items:center;justify-content:space-between;gap:var(--cn-space-6);height:36px;padding:0 var(--cn-space-2-5);border-radius:var(--cn-radius-md);${i === 0 ? 'background:var(--cn-color-bg-subtle)' : ''}"><span>${label}</span><span>${k(m, 'sm')}${k(key, 'sm')}</span></div>`).join('')}</div>`, 'Shortcut right-aligned, size sm; the label stays the primary text.'),
  ],
  rules: [
    'One key per Kbd. A shortcut is a row of Kbds 4px apart, in the order pressed: modifiers first (⌃ ⌥ ⇧ ⌘), then the key.',
    'Use platform symbols on macOS (⌘ ⌥ ⇧ ⌃ ⏎ ⌫ ⎋) and words on Windows/Linux (Ctrl, Alt, Shift, Enter). Detect the platform; never show both.',
    'Letters are uppercase (K, not k); named keys are capitalized words (Esc, Tab, Space, Enter), never abbreviations like "Ret".',
    'Kbd sits at the end of a menu item, tooltip, palette row or input, right-aligned. It never appears inside a button label.',
    'Never use Kbd for pointer input (clicks, gestures) or for code; that is Code.',
    'md by default; sm where the surrounding text is 12px (tooltips, table cells, dense menu rows).',
  ],
  a11y: [
    'Use the <kbd> element; screen readers read its text, so add aria-label on symbol keys ("Command", "Shift", "Escape").',
    'A shortcut hint is supplementary: the same action must be reachable by pointer and through the menu.',
    'Keep gray-600 on white; at 11–12px medium it meets AA. Do not lighten Kbd text to gray-500.',
  ],
  related: ['code', 'tooltip', 'menu', 'command-palette', 'input'],
};
