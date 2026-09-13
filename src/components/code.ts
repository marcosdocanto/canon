import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, ex, ICON, typeStyle } from './_shared.ts';

// Code has no direct equivalent in the reference; it borrows the reference's conventions: inline
// chips share the Kbd look (12px mono on gray-50, 1px gray-200 ring, radius 4), blocks are the
// table-card surface (white, 1px gray-200 ring + shadow-xs, radius 12) with a gray-50 header in the
// table-head voice (12px semibold gray-500) and a 28px utility copy button.

const TRANSITION_FAST = {
  'transition-property': 'background-color, color, box-shadow',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const ring = (color: string) => `inset 0 0 0 1px ${color}`;

const inline = (text: string, size: 'sm' | 'md' = 'md') => `<code class="cn-code" data-variant="inline" data-size="${size}">${text}</code>`;
const copyButton = `<button type="button" class="cn-code__copy" aria-label="Copy code">${ICON.copy}</button>`;
const block = (attrs: string, body: string, header?: string) =>
  `<figure class="cn-code" data-variant="block" ${attrs}>${header !== undefined ? `<div class="cn-code__header"><span>${header}</span>${copyButton}</div>` : ''}<pre class="cn-code__pre"><code>${body}</code></pre></figure>`;

export const code: ComponentSpec = {
  name: 'Code',
  slug: 'code',
  category: 'typography',
  description: 'Monospace code, inline or as a block. Inline is a quiet chip in running text (gray-50, 1px gray-200 ring, radius 4); block is a card surface (white, hairline ring, shadow-xs, radius 12) with an optional file-name header and a copy button.',
  usage: 'Inline for literals inside a sentence: commands, file names, attribute values, token names. Block for multi-line snippets, config files and terminal output. Keyboard shortcuts are Kbd, not Code; numbers in tables use numeric-md, not Code.',
  anatomy: [
    { part: 'root', element: 'code', description: 'Inline: a <code> span. Block: a <figure> wrapping the header and the pre.' },
    { part: 'header', element: 'div', description: 'Optional bar above the code: file path or language in the table-head voice (12px semibold gray-500) keeping its case, since file paths are case-sensitive. Copy button on the right, bottom hairline, gray-50 fill, 44px tall.', optional: true },
    { part: 'pre', element: 'pre', description: 'The code in <pre><code>. 14px mono (12px on sm), 16px padding, scrolls horizontally, never wraps.' },
    { part: 'copy', element: 'button', description: '28px utility icon button (radius 6, 16px icon) in the header that copies the raw text. aria-label="Copy code".', optional: true },
  ],
  props: {
    variant: { values: ['inline', 'block'], default: 'inline', description: 'inline = chip inside text for a literal; block = full-width card surface with radius 12 for multi-line code, with optional header and copy button.' },
    size: { values: ['sm', 'md'], default: 'md', description: 'md = 12px inline and 14px block for docs and settings; sm = 11px inline and 12px block for tables, tooltips and popovers.' },
  },
  states: {},
  base: {
    root: { color: '{color.fg-default}' },
    header: {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      gap: '{space.2}',
      'min-height': '{size.control.lg}',
      padding: '{space.2} {space.2} {space.2} {space.4}',
      'background-color': '{color.bg-subtle}',
      'box-shadow': '0 1px 0 0 {color.border-default}',
      ...typeStyle('label-xs'),
      'font-weight': '{font.weight.semibold}',
      color: '{color.fg-subtle}',
    },
    pre: { margin: '0', overflow: 'auto', ...typeStyle('code-md'), color: '{color.fg-default}', 'tab-size': '2', 'white-space': 'pre' },
    copy: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: 'calc({size.control.xs} - {space.1})',
      height: 'calc({size.control.xs} - {space.1})',
      'border-radius': '{radius.md}',
      color: '{color.fg-subtle}',
      'font-size': '{size.icon.sm}',
      ...TRANSITION_FAST,
    },
  },
  variants: {
    variant: {
      inline: {
        root: {
          display: 'inline',
          ...typeStyle('code-sm'),
          'background-color': '{color.bg-subtle}',
          'box-shadow': ring('{color.border-default}'),
          'border-radius': '{radius.sm}',
          padding: '{space.px} {space.1}',
          'overflow-wrap': 'anywhere',
          'vertical-align': 'baseline',
        },
      },
      block: {
        root: {
          display: 'flex',
          'flex-direction': 'column',
          width: '100%',
          'min-width': '0',
          'background-color': '{color.bg-surface}',
          'box-shadow': `${ring('{color.border-default}')}, {shadow.xs}`,
          'border-radius': '{radius.card}',
          overflow: 'hidden',
        },
      },
    },
    size: {
      sm: { root: { 'font-size': '{font.size.2xs}' }, pre: { 'font-size': '{font.size.xs}', padding: '{space.3}' } },
      md: { root: { 'font-size': '{font.size.xs}' }, pre: { 'font-size': '{font.size.sm}', padding: '{space.4}' } },
    },
  },
  extraCss: `
.cn-code .cn-code__pre code { font: inherit; color: inherit; background: none; padding: 0; border: 0; box-shadow: none; }
.cn-code .cn-code__copy .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; }
.cn-code .cn-code__copy:hover { background-color: {color.bg-muted}; color: {color.fg-muted}; }
.cn-code .cn-code__copy:focus-visible { outline: none; box-shadow: {shadow.focus}; color: {color.fg-muted}; }`,
  examples: [
    ex('Inline', inline('npm install -g @lumen/canon'), '12px mono on gray-50 with a gray-200 ring, radius 4.'),
    ex('Inline in a sentence', `<p class="cn-text-body-md" style="max-width:560px">Run ${inline('canon build')} after editing ${inline('design/tokens.json')}; the gallery at ${inline('dist/preview.html')} reloads on its own.</p>`),
    ex('Block with file name and copy', block('data-size="md" style="max-width:560px"', `{\n  "name": "Lumen",\n  "prefix": "ui",\n  "brand": "#B4309F",\n  "radiusScale": 1,\n  "controlHeight": 40\n}`, 'design/system.json'), 'A card surface with a gray-50 header (12px semibold gray-500) and a 28px copy button.'),
    ex('Block, terminal (no header)', block('data-size="md" style="max-width:560px"', `$ canon init "Lumen" --prefix ui\n✓ built 86 files → design/dist\n$ canon install\n✓ DESIGN.md, CLAUDE.md block and lint hook installed`)),
    ex('Block, small', block('data-size="sm" style="max-width:480px"', `.ui-button[data-variant="primary"] {\n  background-color: var(--ui-color-bg-action);\n  color: var(--ui-color-fg-on-action);\n}`, 'components.css'), '12px mono with 12px padding for tables and popovers.'),
    ex('Inline, small', `<span class="cn-text-body-sm" style="color:var(--cn-color-fg-muted)">Token ${inline('{color.bg-action}', 'sm')} uses the action color defined for the current theme.</span>`),
  ],
  rules: [
    'Inline code is for literals the reader might type or see verbatim: commands, file names, attribute values, token names. Never for emphasis.',
    'Block code never wraps; it scrolls horizontally. Keep lines under 80 characters in docs and trim leading indentation.',
    'The header shows the file path or the language in its original case (design/system.json, not DESIGN/SYSTEM.JSON). Omit it for terminal commands and one-liners.',
    'One copy button per block, in the header, 28px utility. It copies the raw text (not the rendered HTML) and confirms with a short "Copied" tooltip.',
    'Escape HTML inside <code> (&lt; &gt; &amp;); never inject raw user content.',
    'md in docs, settings and dialogs; sm inside tables, tooltips and popovers. Code does not scale with the surrounding heading.',
    'Syntax highlighting, if any, uses fg-default, fg-muted, fg-accent and fg-info only. No rainbow palettes, no background per token.',
  ],
  a11y: [
    'Use the semantic elements: <code> inline and <pre><code> for blocks, so screen readers announce code.',
    'The copy button has aria-label="Copy code" and a visible focus ring; announce "Copied" in a live region after the click.',
    'When a block overflows horizontally, give the <pre> tabindex="0" so keyboard users can scroll it.',
    'Never convey meaning by color alone in highlighted code; keep textual markers (+ / − in diffs).',
  ],
  related: ['kbd', 'prose', 'tooltip'],
};
