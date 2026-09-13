import type { ComponentSpec, Declarations } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Rich text editor: an Input-like frame (border-control, radius card, focus ring
// on :focus-within) with a wrapping toolbar of 32px ghost tool buttons grouped by
// hairlines, a block-type Select, a contenteditable area with a placeholder and
// prose styles, and an optional footer with a character count and actions.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const decl = (d: Declarations) => Object.entries(d).map(([k, v]) => `${k}: ${v};`).join(' ');

const glyph = (text: string, attrs = '') => `<svg class="cn-icon" viewBox="0 0 16 16" aria-hidden="true"><text x="8" y="12" text-anchor="middle" font-size="12" fill="currentColor" font-family="inherit" ${attrs}>${text}</text></svg>`;
const SVG = {
  bold: glyph('B', 'font-weight="700"'),
  italic: glyph('I', 'font-style="italic" font-weight="500"'),
  underline: glyph('U', 'text-decoration="underline" font-weight="500"'),
  h1: glyph('H1', 'font-size="9" font-weight="700"'),
  h2: glyph('H2', 'font-size="9" font-weight="700"'),
  bullets: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 4h7M6 8h7M6 12h7"/><circle cx="3" cy="4" r=".9" fill="currentColor" stroke="none"/><circle cx="3" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r=".9" fill="currentColor" stroke="none"/></svg>',
  numbers: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 4h7M6.5 8h7M6.5 12h7M2.25 3l1-.5v3M2 9.25a1 1 0 011.75.5c0 .8-1.75 1.25-1.75 2.25h2"/></svg>',
  link: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9.5l3-3M7 11.25l-1.25 1.25a2.12 2.12 0 01-3-3L4 8.25M9 4.75l1.25-1.25a2.12 2.12 0 013 3L12 7.75"/></svg>',
  image: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><circle cx="6" cy="7" r="1"/><path d="M13.5 10.5l-3-3-4 4"/></svg>',
};

const tool = (svg: string, label: string, pressed?: boolean, extra = '') =>
  `<button type="button" class="cn-rich-text-editor__tool" aria-label="${label}"${pressed !== undefined ? ` aria-pressed="${pressed}"` : ''}${extra}>${svg}</button>`;
const group = (...tools: string[]) => `<div class="cn-rich-text-editor__tool-group" role="group">${tools.join('')}</div>`;
const SELECT = `<div class="cn-rich-text-editor__select"><div class="cn-select" data-variant="filled" data-size="sm"><select class="cn-select__field" aria-label="Block type"><option value="p" selected>Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="quote">Quote</option></select>${ICON.chevronDown.replace('cn-icon', 'cn-select__chevron')}</div></div>`;
const TOOLBAR = (full = true) =>
  `<div class="cn-rich-text-editor__toolbar" role="toolbar" aria-label="Formatting">${full ? SELECT : ''}${group(tool(SVG.bold, 'Bold', false), tool(SVG.italic, 'Italic', false), tool(SVG.underline, 'Underline', false))}${full ? group(tool(SVG.h1, 'Heading 1', false), tool(SVG.h2, 'Heading 2', false)) : ''}${full ? group(tool(SVG.bullets, 'Bulleted list', true), tool(SVG.numbers, 'Numbered list', false)) : ''}${group(tool(SVG.link, 'Insert link'), full ? tool(SVG.image, 'Insert image') : '')}</div>`;
const CONTENT = `<h3>Release notes — September</h3><p>This month we shipped the new reporting workspace and a faster search index. Highlights:</p><ul><li>Custom dashboards for every workspace</li><li>Search results in under 200 ms</li><li>Exports to CSV and Google Sheets</li></ul><p>Read the <a href="#">full changelog</a> or reply to this note with questions.</p>`;

const editor = (variant: string, size: string, inner: string, attrs = '', width = '640px') =>
  `<div class="cn-rich-text-editor" data-variant="${variant}" data-size="${size}"${attrs} style="width:100%;max-width:${width}">${inner}</div>`;
const area = (content: string, attrs = '') => `<div class="cn-rich-text-editor__area" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Note" data-placeholder="Write something…"${attrs}>${content}</div>`;

export const richTextEditor: ComponentSpec = {
  name: 'RichTextEditor',
  slug: 'rich-text-editor',
  category: 'forms',
  description: 'A formatted-text field: the Input frame (control border, radius card, shadow-xs, focus ring on :focus-within) with a wrapping toolbar of 32px ghost tool buttons separated into groups by hairlines, a block-type Select, a contenteditable area with a placeholder and prose styles, and an optional footer with a character count and actions.',
  usage: 'Use where people write more than a note: descriptions, announcements, email bodies, comments with formatting. Keep the toolbar to what the destination can render. For plain multi-line text use Textarea; for code use Code; for read-only formatted text use Prose.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The frame: bg-surface, control border, radius card, shadow-xs, flex column, overflow hidden. Focus ring on :focus-within; data-invalid and data-disabled for those states.' },
    { part: 'toolbar', element: 'div', description: 'role="toolbar": wrapping row of tool groups and the block-type select, 8px padding, bottom hairline.' },
    { part: 'tool-group', element: 'div', description: 'A cluster of related tools (inline styles, headings, lists, inserts); every group after the first gets a hairline on its left.' },
    { part: 'tool', element: 'button', description: '32px ghost icon button (28px in sm). Toggles carry aria-pressed; actions (link, image) do not.' },
    { part: 'select', element: 'div', description: 'Wrapper for a filled sm Select of block types (Paragraph, Heading 1–3, Quote); 160px wide.', optional: true },
    { part: 'area', element: 'div', description: 'The contenteditable (role="textbox", aria-multiline): min-height 160px, 16px padding, body-md, prose styles for headings, lists, links and quotes. Shows data-placeholder while empty.' },
    { part: 'footer', element: 'div', description: 'Optional bottom row with a top hairline: character count on the left, actions on the right.', optional: true },
    { part: 'count', element: 'span', description: 'Character count in body-xs tabular ("412 / 2,000"); fg-danger when over the limit.', optional: true },
    { part: 'actions', element: 'div', description: 'Right-aligned row of sm Buttons (ghost Cancel, primary Save).', optional: true },
  ],
  props: {
    variant: {
      values: ['default', 'minimal', 'with-footer'],
      default: 'default',
      description: 'default = full toolbar (block type, inline styles, headings, lists, link, image) above a 160px area. minimal = inline styles and link only, no hairline under the toolbar, a 96px area: comments and short descriptions. with-footer = default plus a footer with a character count and Cancel/Save actions, for notes that are saved explicitly.',
    },
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 32px tools, 16px area padding, body-md text (forms and full pages). sm = 28px tools, 12px padding, body-sm text for side panels and comment boxes.',
    },
  },
  states: {
    focus: { selector: ':focus-within', description: 'Writing or using the toolbar: the border becomes action-colored and the 3px ring appears on the frame.', markup: 'native :focus-within on the root' },
    invalid: { selector: '[data-invalid]', description: 'Validation failed (required, over the limit): danger border, danger ring while focused. Pair with a Field error.', markup: 'data-invalid on the root plus aria-invalid="true" on the area' },
    disabled: { selector: '[data-disabled]', description: 'Read-only or locked: grey fill, disabled text, tools at 50% and inert, area not editable.', markup: 'data-disabled on the root plus contenteditable="false" on the area' },
    toolHover: { selector: ' .cn-rich-text-editor__tool:hover', description: 'Pointer over a tool (extraCss): subtle fill, ink icon.', markup: 'native :hover on .cn-rich-text-editor__tool' },
    toolPressed: { selector: ' .cn-rich-text-editor__tool[aria-pressed="true"]', description: 'A formatting toggle that applies to the selection (extraCss): subtle fill and ink icon at rest.', markup: 'aria-pressed="true" on .cn-rich-text-editor__tool' },
    toolFocus: { selector: ' .cn-rich-text-editor__tool:focus-visible', description: 'Keyboard focus on a tool shows the focus ring (extraCss).', markup: 'native :focus-visible on .cn-rich-text-editor__tool' },
    toolDisabled: { selector: ' .cn-rich-text-editor__tool:disabled', description: 'A tool that does not apply now (extraCss): 50% opacity, not-allowed.', markup: 'disabled on .cn-rich-text-editor__tool' },
  },
  base: {
    root: {
      display: 'flex',
      'flex-direction': 'column',
      width: '100%',
      'min-width': '0',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-control}',
      'border-radius': '{radius.card}',
      'box-shadow': '{shadow.xs}',
      color: '{color.fg-default}',
      overflow: 'hidden',
      ...TRANSITION_COLORS,
    },
    toolbar: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: '{space.1}', padding: '{space.2}', 'border-bottom': HAIRLINE },
    'tool-group': { display: 'flex', 'align-items': 'center', gap: '{space.0.5}' },
    tool: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.8}',
      height: '{space.8}',
      'border-radius': '{radius.md}',
      color: '{color.fg-muted}',
      ...TRANSITION_COLORS,
    },
    select: { display: 'inline-flex', flex: '0 0 auto', width: '160px', 'max-width': '100%' },
    area: {
      'min-height': '{space.40}',
      padding: '{space.4}',
      ...typeStyle('body-md'),
      color: '{color.fg-default}',
      outline: 'none',
      'overflow-wrap': 'anywhere',
      'caret-color': '{color.bg-action}',
      cursor: 'text',
    },
    footer: { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '{space.3}', padding: '{space.2} {space.3}', 'border-top': HAIRLINE, ...typeStyle('body-xs'), color: '{color.fg-muted}' },
    count: { 'font-variant-numeric': 'tabular-nums', 'white-space': 'nowrap' },
    actions: { display: 'flex', 'align-items': 'center', gap: '{space.2}' },
    '@states': {
      focus: { root: { ...FOCUS_RING, 'border-color': '{color.border-action}' } },
      invalid: { root: { 'border-color': '{color.border-danger}' }, count: { color: '{color.fg-danger}' } },
      disabled: { root: { 'background-color': '{color.bg-disabled}', color: '{color.fg-disabled}', 'border-color': '{color.border-disabled}', 'box-shadow': 'none' }, area: { color: '{color.fg-disabled}', cursor: 'not-allowed' } },
    },
  },
  variants: {
    variant: {
      default: { root: {} },
      minimal: { toolbar: { 'border-bottom': '0', 'padding-bottom': '0' }, area: { 'min-height': '{space.24}' } },
      'with-footer': { root: {} },
    },
    size: {
      sm: {
        toolbar: { padding: '{space.1.5}', gap: '{space.0.5}' },
        tool: { width: '{space.7}', height: '{space.7}' },
        select: { width: '140px' },
        area: { padding: '{space.3}', 'min-height': '{space.32}', ...typeStyle('body-sm') },
        footer: { padding: '{space.1.5} {space.2.5}' },
      },
      md: { root: {} },
    },
  },
  extraCss: `
.cn-rich-text-editor__tool .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-rich-text-editor__tool:hover:not(:disabled) { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-rich-text-editor__tool[aria-pressed="true"] { background-color: {color.bg-subtle}; color: {color.fg-default}; }
.cn-rich-text-editor__tool:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-rich-text-editor__tool:disabled { opacity: {opacity.disabled}; cursor: not-allowed; }
.cn-rich-text-editor__tool-group + .cn-rich-text-editor__tool-group { margin-inline-start: {space.1}; padding-inline-start: {space.1.5}; border-inline-start: ${HAIRLINE}; }
.cn-rich-text-editor__select + .cn-rich-text-editor__tool-group { margin-inline-start: {space.1}; padding-inline-start: {space.1.5}; border-inline-start: ${HAIRLINE}; }
.cn-rich-text-editor__area:empty::before { content: attr(data-placeholder); color: {color.fg-placeholder}; pointer-events: none; }
.cn-rich-text-editor__area > * + * { margin-top: {space.3}; }
.cn-rich-text-editor__area h1 { ${decl(typeStyle('heading-lg'))} }
.cn-rich-text-editor__area h2 { ${decl(typeStyle('heading-md'))} }
.cn-rich-text-editor__area h3 { ${decl(typeStyle('heading-sm'))} }
.cn-rich-text-editor__area ul { list-style: disc; padding-inline-start: {space.5}; }
.cn-rich-text-editor__area ol { list-style: decimal; padding-inline-start: {space.5}; }
.cn-rich-text-editor__area li + li { margin-top: {space.1}; }
.cn-rich-text-editor__area a { color: {color.fg-link}; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: {color.border-strong}; }
.cn-rich-text-editor__area a:hover { color: {color.fg-link-hover}; text-decoration-color: currentColor; }
.cn-rich-text-editor__area strong { font-weight: {font.weight.semibold}; }
.cn-rich-text-editor__area blockquote { border-inline-start: {border.width.medium} solid {color.border-strong}; padding-inline-start: {space.3}; color: {color.fg-muted}; }
.cn-rich-text-editor__area img { max-width: 100%; border-radius: {radius.md}; }
.cn-rich-text-editor[data-invalid]:focus-within { border-color: {color.border-danger}; box-shadow: {shadow.focus-danger}; }
.cn-rich-text-editor[data-disabled] .cn-rich-text-editor__tool { opacity: {opacity.disabled}; pointer-events: none; }
.cn-rich-text-editor[data-disabled] .cn-rich-text-editor__toolbar, .cn-rich-text-editor[data-disabled] .cn-rich-text-editor__footer { border-color: {color.border-disabled}; }`,
  examples: [
    ex('Default with content', editor('default', 'md', `${TOOLBAR()}${area(CONTENT)}`), 'Block-type select, inline styles, headings, lists, link and image. The bulleted-list tool is pressed because the caret sits in the list.'),
    ex('Minimal, small, empty', editor('minimal', 'sm', `${TOOLBAR(false)}${area('')}`, '', '480px'), 'Inline styles and link only; the placeholder comes from data-placeholder.'),
    ex('With footer (count and actions)', editor('with-footer', 'md', `${TOOLBAR()}${area(CONTENT)}<div class="cn-rich-text-editor__footer"><span class="cn-rich-text-editor__count" aria-live="polite">412 / 2,000</span><div class="cn-rich-text-editor__actions"><button type="button" class="cn-button" data-variant="ghost" data-size="sm"><span class="cn-button__label">Cancel</span></button><button type="button" class="cn-button" data-variant="primary" data-size="sm"><span class="cn-button__label">Save note</span></button></div></div>`), 'The count turns fg-danger over the limit and the frame becomes invalid.'),
    ex('Invalid and disabled', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-4);width:100%;max-width:640px">${editor('with-footer', 'sm', `${TOOLBAR(false)}${area('<p>Thanks for the update, looping in the finance team so they can confirm the invoice dates before we publish the notes to every workspace and send the customer digest that goes out on Friday morning.</p>', ' aria-invalid="true"')}<div class="cn-rich-text-editor__footer"><span class="cn-rich-text-editor__count" aria-live="polite">212 / 200</span></div>`, ' data-invalid', '640px')}${editor('minimal', 'sm', `${TOOLBAR(false)}${area('<p>This announcement was published on Sep 9 and can no longer be edited.</p>', ' contenteditable="false"')}`, ' data-disabled', '640px')}</div>`, 'data-invalid draws the danger border; data-disabled greys the frame and makes the tools inert.'),
  ],
  rules: [
    'Offer only what the destination renders: an email body gets inline styles and links; a document gets headings and lists too. Never a toolbar with twenty tools.',
    'Group tools by kind (block type, inline, headings, lists, inserts) with the hairline between groups; keep the same order in every editor of the product.',
    'Toggles (bold, italic, lists) show aria-pressed for the current selection; actions (link, image) open a small Dialog or Popover, never a browser prompt.',
    'The area starts at 160px (96px minimal) and grows with content; never an inner scrollbar unless the editor sits in a fixed-height panel.',
    'Placeholders are an example of the expected content ("Write the release notes…"), not a label; the label lives in the Field.',
    'Show a character count only with a hard limit; over the limit the count turns danger and the frame becomes invalid, but typing is not blocked.',
    'Paste keeps only the formatting the toolbar offers; strip colors, fonts and sizes.',
    'Save explicitly with a footer (with-footer) when the text is a record; autosave with a status line when it is a draft. Never both.',
    'sm inside comment boxes and side panels; md in forms and full pages.',
  ],
  a11y: [
    'The area is role="textbox" with aria-multiline="true" and an accessible name (a Field label or aria-label); set aria-invalid and aria-describedby with the error when invalid.',
    'The toolbar is role="toolbar" with an aria-label; Tab enters it once, Left/Right move between tools, and the tools are real <button>s with aria-label.',
    'Formatting toggles expose aria-pressed; the block-type Select is a native <select> so it works everywhere.',
    'Keyboard shortcuts (Cmd/Ctrl+B, I, U, K) mirror the toolbar and are listed in a Tooltip on each tool.',
    'Announce the character count with aria-live="polite" and say "over the limit" in the Field error, not only in color.',
  ],
  related: ['textarea', 'field', 'select', 'icon-button', 'prose', 'code'],
};
