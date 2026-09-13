import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference file upload: a white dropzone with a 1px gray-200 ring, radius 12, 16×24px padding,
// a centered 40px modern featured icon, "Click to upload" (brand link) + "or drag and drop" (14px
// muted) and a 12px hint; drag-over = 2px brand ring; disabled = gray-50. Files list as bordered
// cards (radius 12, 16px padding, 12px gap): 40px file icon, medium name, size · status row, an 8px
// progress bar, a utility delete button top-right; failed rows get a 2px red ring and "Try again".

const TRANSITION_FAST = {
  'transition-property': 'box-shadow, background-color, color, opacity',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const ring = (width: string, color: string) => `inset 0 0 0 ${width} ${color}`;

const UPLOAD_PATH = '<path d="M8 10.5V3M4.5 6.5L8 3l3.5 3.5M2.5 11v1.5a1 1 0 001 1h9a1 1 0 001-1V11"/>';
const svg16 = (cls: string, body: string, sw = '1.5') => `<svg class="${cls}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const featured = `<span class="cn-featured-icon" data-theme="modern" data-tone="gray" data-size="md" data-shape="square">${svg16('cn-featured-icon__icon', UPLOAD_PATH)}</span>`;
const FILE_ICON = '<svg class="cn-file-dropzone__file-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5h13l9 9v19a2 2 0 01-2 2H11a2 2 0 01-2-2V7a2 2 0 012-2z"/><path d="M24 5v9h9"/></svg>';
const STATUS_ICON = {
  complete: svg16('cn-icon', '<circle cx="8" cy="8" r="6.25"/><path d="M5.5 8.25l1.75 1.75 3.5-3.5"/>', '1.75'),
  uploading: svg16('cn-icon', UPLOAD_PATH, '1.75'),
  failed: svg16('cn-icon', '<circle cx="8" cy="8" r="6.25"/><path d="M6 6l4 4M10 6l-4 4"/>', '1.75'),
};
const STATUS_TEXT = { complete: 'Complete', uploading: 'Uploading…', failed: 'Failed' };

const deleteButton = (name: string) => `<button type="button" class="cn-icon-button" data-variant="utility" data-size="xs" data-shape="square" aria-label="Delete ${name}">${ICON.trash.replace('cn-icon', 'cn-icon-button__icon')}</button>`;
const progress = (name: string, pct: number) => `<div class="cn-progress" data-size="lg" data-tone="action" role="progressbar" aria-label="Uploading ${name}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="cn-progress__track"><div class="cn-progress__indicator" style="width:${pct}%"></div></div></div>`;

const fileRow = (name: string, size: string, state: keyof typeof STATUS_TEXT, pct: number) =>
  `<li class="cn-file-dropzone__file" data-state="${state}">${FILE_ICON}<div class="cn-file-dropzone__file-body"><span class="cn-file-dropzone__file-name">${name}</span><div class="cn-file-dropzone__file-meta"><span class="cn-file-dropzone__file-size">${size}</span><span class="cn-file-dropzone__file-divider" aria-hidden="true"></span><span class="cn-file-dropzone__file-status">${STATUS_ICON[state]}${STATUS_TEXT[state]}</span></div>${state === 'failed' ? `<div class="cn-file-dropzone__file-retry"><button type="button" class="cn-button" data-variant="danger-link" data-size="sm"><span class="cn-button__label">Try again</span></button></div>` : `<div class="cn-file-dropzone__file-progress">${progress(name, pct)}<span class="cn-file-dropzone__file-percent">${pct}%</span></div>`}</div><div class="cn-file-dropzone__file-actions">${deleteButton(name)}</div></li>`;

const TITLE = '<span class="cn-file-dropzone__action">Click to upload</span> or drag and drop';
const zone = (root: string, input: string, hint: string, files = '', title = TITLE) =>
  `<div class="cn-file-dropzone" ${root}><input class="cn-file-dropzone__input" type="file" ${input}>${featured}<div class="cn-file-dropzone__text"><span class="cn-file-dropzone__title">${title}</span><span class="cn-file-dropzone__hint">${hint}</span></div>${files ? `<ul class="cn-file-dropzone__files">${files}</ul>` : ''}</div>`;

export const fileDropzone: ComponentSpec = {
  name: 'FileDropzone',
  slug: 'file-dropzone',
  category: 'forms',
  description: 'Upload target: a white card with a 1px gray-200 ring and radius 12, a centered 40px featured icon, "Click to upload or drag and drop" and a hint of accepted types. The native file input covers the whole zone, so click and drop work without extra JS. Selected files list under the text as bordered cards with progress and a delete button.',
  usage: 'Any file upload in a form or dialog (documents, spreadsheets, a logo). For a single small image next to a preview use size="sm". Not for pasting text or URLs, and not as a full-page drop overlay (that is a separate layer).',
  anatomy: [
    { part: 'root', element: 'div', description: 'The zone: white, 1px gray-200 inset ring, radius 12, padding 16×24 (md) or 16 (sm), centered column with a 12px gap. Carries data-state="idle|dragover", data-invalid, data-disabled.' },
    { part: 'input', element: 'input', description: 'Native <input type="file"> stretched over the whole zone at opacity 0. Carries accept, multiple, disabled, aria-invalid.' },
    { part: 'icon', element: 'svg', description: 'The upload-cloud icon. Put it inside a FeaturedIcon (theme modern, tone gray, size md = 40px, radius 8); on its own it renders as a 20px muted icon.', optional: true },
    { part: 'text', element: 'div', description: 'Centered text block: the title line and the hint, 4px apart.' },
    { part: 'title', element: 'span', description: 'The first line, 14px muted: the action ("Click to upload") followed by "or drag and drop" (or "Release to upload" while dragging).' },
    { part: 'action', element: 'span', description: 'The brand link-colored words inside the title ("Click to upload"): 14px semibold, underlined when the zone is hovered. Not a button — the input above it takes the click.' },
    { part: 'hint', element: 'span', description: '12px muted line: accepted types and size limit ("SVG, PNG, JPG or GIF (max. 800×400px)"). Turns to the danger color and carries the rejection reason when invalid.' },
    { part: 'files', element: 'ul', description: 'List of selected files under the text, full width, 12px between rows, raised above the input so its buttons are clickable.', optional: true },
    { part: 'file', element: 'li', description: 'One file card: white, 1px gray-200 ring, radius 12, 16px padding, 12px gap between icon, body and actions. data-state="uploading|complete|failed"; failed rows get a 2px red ring.', optional: true },
    { part: 'file-icon', element: 'svg', description: '40×40 file-type icon, muted, does not shrink.', optional: true },
    { part: 'file-body', element: 'div', description: 'Name, meta row, progress or retry stacked; takes the remaining width.', optional: true },
    { part: 'file-name', element: 'span', description: 'The file name, 14px medium, truncated with an ellipsis.', optional: true },
    { part: 'file-meta', element: 'div', description: 'Row 2px under the name: size, a 1×12px divider and the status, 8px apart, 14px muted.', optional: true },
    { part: 'file-size', element: 'span', description: 'Formatted size ("1.2 MB"), 14px muted, tabular.', optional: true },
    { part: 'file-divider', element: 'span', description: 'A 1×12px gray-300 rule between size and status.', optional: true },
    { part: 'file-status', element: 'span', description: '16px icon + word, 14px medium, 4px apart: "Uploading…" muted, "Complete" green, "Failed" red (colors follow data-state on the row).', optional: true },
    { part: 'file-progress', element: 'div', description: 'Row 4px under the meta: a Progress bar (size lg = 8px track) with the percentage at the right, 12px apart.', optional: true },
    { part: 'file-percent', element: 'span', description: 'The percentage next to the bar, 14px medium, tabular.', optional: true },
    { part: 'file-retry', element: 'div', description: 'Row 6px under the meta on failed rows holding a danger-link sm "Try again" button.', optional: true },
    { part: 'file-actions', element: 'div', description: 'Top-right slot for the utility xs delete button, pulled 8px into the padding so the icon aligns with the content edge.', optional: true },
  ],
  props: {
    size: { values: ['sm', 'md'], default: 'md', description: 'md = padding 16×24 with the 40px featured icon (documents in forms and dialogs, the reference dropzone); sm = padding 16 all round for a single avatar, logo or attachment next to a preview.' },
  },
  states: {
    dragover: { selector: '[data-state="dragover"]', description: 'A file is being dragged over the zone: the ring becomes 2px in the brand color.', markup: 'data-state="dragover" on the root (set on dragenter, cleared on dragleave/drop)' },
    hover: { selector: ':hover:not([data-disabled])', description: 'Pointer over the zone: the action words underline, like a link. Nothing else changes.', markup: 'native :hover' },
    focus: { selector: ':has(> input:focus-visible)', description: 'Keyboard focus on the file input (not on a row button) shows the 4px brand ring around the zone.', markup: 'native :focus-visible on the input' },
    invalid: { selector: '[data-invalid], &:has([aria-invalid="true"])', description: 'A rejected file (type or size): the hint turns to the danger color and carries the reason.', markup: 'aria-invalid="true" on the input, or data-invalid on the root' },
    disabled: { selector: '[data-disabled], &:has(> input:disabled)', description: 'Gray-50 fill, cursor not-allowed, the featured icon at 50%, no drop. Scoped to the file input so a disabled row button does not trigger it.', markup: 'disabled on the input' },
    'file-failed': { selector: '[data-state="failed"]', description: 'On a __file row: 2px red ring, red status, "Try again" instead of the progress bar.', markup: 'data-state="failed" on the row' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      gap: '{space.3}',
      width: '100%',
      'min-width': '0',
      'background-color': '{color.bg-surface}',
      'border-radius': '{radius.card}',
      'box-shadow': ring('1px', '{color.border-default}'),
      color: '{color.fg-muted}',
      cursor: 'pointer',
      ...TRANSITION_FAST,
    },
    input: { position: 'absolute', inset: '0', width: '100%', height: '100%', margin: '0', padding: '0', opacity: '0', cursor: 'pointer' },
    icon: { display: 'block', width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', color: '{color.fg-muted}' },
    text: { display: 'flex', 'flex-direction': 'column', gap: '{space.1}', 'text-align': 'center', 'min-width': '0' },
    title: { display: 'flex', 'justify-content': 'center', 'flex-wrap': 'wrap', gap: '{space.1}', ...typeStyle('body-md'), color: '{color.fg-muted}' },
    action: { ...typeStyle('label-md'), color: '{color.fg-action}', 'text-decoration-line': 'underline', 'text-decoration-color': 'transparent', 'text-underline-offset': '3px', ...TRANSITION_FAST },
    hint: { ...typeStyle('body-sm'), color: '{color.fg-muted}', ...TRANSITION_FAST },
    files: { position: 'relative', 'z-index': '{z.raised}', display: 'flex', 'flex-direction': 'column', gap: '{space.3}', width: '100%', 'margin-top': '{space.1}', 'text-align': 'start', cursor: 'default' },
    file: {
      position: 'relative',
      display: 'flex',
      'align-items': 'flex-start',
      gap: '{space.3}',
      'min-width': '0',
      padding: '{space.4}',
      'background-color': '{color.bg-surface}',
      'border-radius': '{radius.card}',
      'box-shadow': ring('1px', '{color.border-default}'),
      color: '{color.fg-default}',
      'transition-property': 'box-shadow',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    'file-icon': { width: '{space.10}', height: '{space.10}', 'flex-shrink': '0', color: '{color.fg-subtle}' },
    'file-body': { flex: '1 1 auto', 'min-width': '0', display: 'flex', 'flex-direction': 'column' },
    'file-name': { display: 'block', ...typeStyle('label-sm'), color: '{color.fg-default}', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    'file-meta': { display: 'flex', 'align-items': 'center', gap: '{space.2}', 'margin-top': '{space.0.5}', ...typeStyle('body-md'), color: '{color.fg-muted}' },
    'file-size': { 'flex-shrink': '0', 'font-variant-numeric': 'tabular-nums' },
    'file-divider': { width: '{space.px}', height: '{space.3}', 'border-radius': '{radius.full}', 'background-color': '{color.border-control}', 'flex-shrink': '0' },
    'file-status': { display: 'inline-flex', 'align-items': 'center', gap: '{space.1}', ...typeStyle('label-sm'), color: '{color.fg-subtle}' },
    'file-progress': { display: 'flex', 'align-items': 'center', gap: '{space.3}', 'margin-top': '{space.1}', width: '100%' },
    'file-percent': { 'flex-shrink': '0', ...typeStyle('label-sm'), color: '{color.fg-muted}', 'font-variant-numeric': 'tabular-nums' },
    'file-retry': { 'margin-top': '{space.1.5}' },
    'file-actions': { 'align-self': 'flex-start', 'flex-shrink': '0', margin: 'calc(-1 * {space.2}) calc(-1 * {space.2}) 0 0' },
    '@states': {
      dragover: { root: { 'box-shadow': ring('2px', '{color.border-action}') } },
      hover: { action: { 'text-decoration-color': 'currentColor' } },
      focus: { root: { 'box-shadow': `${ring('1px', '{color.border-default}')}, {shadow.focus}` } },
      invalid: { hint: { color: '{color.fg-danger}' } },
      disabled: { root: { 'background-color': '{color.bg-subtle}', cursor: 'not-allowed', 'pointer-events': 'none' }, input: { cursor: 'not-allowed' }, icon: { opacity: '{opacity.disabled}' } },
      'file-failed': { file: { 'box-shadow': ring('2px', '{color.border-danger}') }, 'file-status': { color: '{color.fg-danger}' } },
    },
  },
  variants: {
    size: {
      sm: { root: { padding: '{space.4}', gap: '{space.2}' } },
      md: { root: { padding: '{space.4} {space.6}' } },
    },
  },
  extraCss: `
.cn-file-dropzone[data-disabled] .cn-featured-icon, .cn-file-dropzone:has(> input:disabled) .cn-featured-icon { opacity: {opacity.disabled}; }
.cn-file-dropzone .cn-file-dropzone__file[data-state="complete"] .cn-file-dropzone__file-status { color: {color.fg-success}; }
.cn-file-dropzone .cn-file-dropzone__file[data-state="uploading"] .cn-file-dropzone__file-status { color: {color.fg-subtle}; }
.cn-file-dropzone .cn-file-dropzone__file[data-state="complete"] .cn-file-dropzone__file-percent { color: {color.fg-muted}; }
.cn-file-dropzone .cn-file-dropzone__file-status .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; stroke-width: 2.5; }
.cn-file-dropzone .cn-file-dropzone__file-progress .cn-progress { flex: 1 1 auto; min-width: 0; }`,
  examples: [
    ex('Default', zone('data-size="md" data-state="idle" style="max-width:512px"', 'multiple accept=".pdf,.docx,.fig" aria-label="Upload files"', 'PDF, DOCX or FIG (max. 25 MB)'), 'White, 1px gray-200 ring, radius 12, 16×24 padding; 40px modern featured icon; "Click to upload" in the brand link color.'),
    ex('Drag over', zone('data-size="md" data-state="dragover" style="max-width:512px"', 'multiple accept=".pdf,.docx,.fig" aria-label="Upload files"', 'PDF, DOCX or FIG (max. 25 MB)', '', 'Release to upload'), 'The ring becomes 2px in the brand color; nothing else moves.'),
    ex('With files (complete, uploading, failed)', zone('data-size="md" data-state="idle" style="max-width:512px"', 'multiple accept=".pdf,.docx,.fig" aria-label="Upload files"', 'PDF, DOCX or FIG (max. 25 MB)', fileRow('brand-guidelines-v3.pdf', '1.2 MB', 'complete', 100) + fileRow('research-synthesis.fig', '348 KB', 'uploading', 60) + fileRow('interview-notes-daniel-costa.docx', '2.1 MB', 'failed', 0)), 'Rows are bordered cards with a 40px file icon, medium name, size · status, an 8px progress bar and a utility delete button; a failed row gets a 2px red ring and "Try again".'),
    ex('Small (single image)', zone('data-size="sm" data-state="idle" style="max-width:280px"', 'accept="image/png,image/jpeg" aria-label="Upload logo"', 'PNG or JPG, square, up to 2 MB'), '16px padding all round, for one asset next to its preview.'),
    ex('Invalid', zone('data-size="md" data-state="idle" data-invalid style="max-width:512px"', 'multiple accept=".pdf,.docx,.fig" aria-invalid="true" aria-label="Upload files"', 'archive.zip is not accepted. Upload PDF, DOCX or FIG (max. 25 MB).'), 'The hint turns to the danger color and starts with the rejected file.'),
    ex('Disabled', zone('data-size="md" data-state="idle" style="max-width:512px"', 'disabled aria-label="Upload files"', 'Uploads are paused while the project is archived.'), 'Gray-50 fill, cursor not-allowed, the featured icon at 50%.'),
  ],
  recipes: [
    ex('In a Field', `<div class="cn-field" data-layout="vertical" data-size="md" style="max-width:512px"><label class="cn-field__label" for="dz-docs">Supporting documents <span class="cn-field__optional">(optional)</span></label><div class="cn-field__control">${zone('data-size="md" data-state="idle"', 'id="dz-docs" multiple accept=".pdf,.docx,.fig" aria-describedby="dz-docs-hint"', 'PDF, DOCX or FIG (max. 25 MB)', fileRow('usability-report-q3.pdf', '212 KB', 'complete', 100))}</div><p class="cn-field__helper" id="dz-docs-hint">Visible to everyone in the Lumen workspace.</p></div>`, 'The Field label names the input through for/id; the hint says where the files go.'),
  ],
  rules: [
    'The whole area is the target: the file input covers the root, so a click anywhere opens the picker and a drop anywhere works. Do not add a separate "Browse" button.',
    'Title copy is "Click to upload" (brand link) + "or drag and drop"; while dragging over it may change to "Release to upload". Under 768px the second half may be dropped ("Click to upload and attach files").',
    'The hint always states accepted types and the size limit ("PDF, DOCX or FIG (max. 25 MB)"); when invalid it starts with the rejected file and keeps the same constraints in one sentence.',
    'Set data-state="dragover" on dragenter and clear it on dragleave and drop. The ring changes in 100ms; nothing pulses.',
    'Selected files list as cards 12px apart with name, size · status, an 8px progress bar with the percentage and a utility xs delete button. Failed rows set data-state="failed", get a 2px red ring and a danger-link "Try again".',
    'md in forms and dialogs, max-width 512px; sm for one small asset (avatar, logo) placed next to its preview.',
    'Never a full-page dropzone inside the app shell; use a page-level drop overlay for that and keep this component in the form.',
  ],
  a11y: [
    'The native <input type="file"> stays focusable: Tab reaches it, Enter or Space open the picker, and the ring shows on the zone through :has(:focus-visible).',
    'Give the input an accessible name that says what to upload ("Upload files"): a Field label with for/id, or aria-label.',
    'Use accept and multiple on the input so the OS picker and assistive tech know the constraints; repeat them in the hint.',
    'Delete buttons carry aria-label "Delete <file name>"; progress bars carry aria-label and aria-valuenow; announce completion or failure in a live region.',
    'Drag and drop is an enhancement: the picker must always work, including on touch devices.',
  ],
  related: ['field', 'featured-icon', 'progress', 'icon-button', 'button'],
};
