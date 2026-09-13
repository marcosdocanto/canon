import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, STATE, ex, ICON, typeStyle } from './_shared.ts';

// the reference tag: a white chip with a gray-300 ring, radius 6 and 14px medium gray-700 text
// (12px at sm); sm 24 · md 28 · lg 32px tall; a leading checkbox (14 / 16 / 18), avatar (16)
// or 8px dot; a trailing count chip (radius 3, gray-100) or a close × (radius 3, gray-400);
// 50ms transitions, 4px focus ring.

const TRANSITION_TAG = {
  'transition-property': 'background-color, box-shadow, color',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const SELECTED = { 'background-color': '{color.bg-action-subtle}', 'box-shadow': ring('{color.border-action}'), color: '{color.fg-action}' };

/** Rest paint per tone × variant. */
const PAINT: Record<string, { bg: string; fg: string; ring: string }> = {
  'neutral:outline': { bg: '{color.bg-surface}', fg: '{color.fg-muted}', ring: '{color.border-control}' },
  'neutral:soft': { bg: '{color.bg-subtle}', fg: '{color.fg-muted}', ring: 'transparent' },
  'accent:outline': { bg: '{color.bg-surface}', fg: '{color.fg-accent}', ring: '{brand.300}' },
  'accent:soft': { bg: '{color.bg-accent-subtle}', fg: '{color.fg-accent}', ring: 'transparent' },
};

const compound = Object.entries(PAINT).map(([key, p]) => {
  const [tone, variant] = key.split(':');
  return {
    when: { tone, variant },
    block: {
      root: { 'background-color': p.bg, color: p.fg, 'box-shadow': ring(p.ring) },
      '@states': { selected: { root: SELECTED } },
    },
  };
});

const AVATAR_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";
const X = '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
const CHECK = '<svg class="cn-tag__check" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.67 3.5L5.25 9.92 2.33 7"/></svg>';

const mk = (label: string, o: { tone?: string; variant?: string; size?: string; before?: string; after?: string; attrs?: string; tag?: string } = {}) =>
  `<${o.tag ?? 'span'}${o.tag === 'button' ? ' type="button"' : ''} class="cn-tag" data-tone="${o.tone ?? 'neutral'}" data-variant="${o.variant ?? 'outline'}" data-size="${o.size ?? 'md'}"${o.attrs ?? ''}>${o.before ?? ''}<span class="cn-tag__label">${label}</span>${o.after ?? ''}</${o.tag ?? 'span'}>`;
const chip = (label: string, pressed: boolean, extra = '') => mk(label, { tag: 'button', attrs: ` aria-pressed="${pressed}"${extra}` });
const removable = (label: string, size = 'md', tone = 'neutral', variant = 'outline') => mk(label, { size, tone, variant, after: `<button type="button" class="cn-tag__remove" aria-label="Remove ${label}">${X}</button>` });
const counted = (label: string, n: string, size = 'md') => mk(label, { size, after: `<span class="cn-tag__count">${n}</span>` });
const checkbox = (label: string, checked: boolean, size = 'md', extra = '') => mk(label, { size, tag: 'button', attrs: ` role="checkbox" aria-checked="${checked}"${extra}`, before: `<span class="cn-tag__checkbox" aria-hidden="true">${CHECK}</span>` });
const withAvatar = (label: string, size = 'md') => mk(label, { size, before: `<img class="cn-tag__avatar" src="${AVATAR_SRC}" alt="">`, after: `<button type="button" class="cn-tag__remove" aria-label="Remove ${label}">${X}</button>` });
const withDot = (label: string, size = 'md') => mk(label, { size, before: '<span class="cn-tag__dot"></span>' });

export const tag: ComponentSpec = {
  name: 'Tag',
  slug: 'tag',
  category: 'data-display',
  description: 'The reference tag: a white chip with a gray-300 ring, radius 6 and 14px medium text (sm 24 · md 28 · lg 32px) that you can toggle or remove; leading checkbox, avatar or dot, trailing count chip or close ×. Unlike Badge it responds to focus and selection.',
  usage: 'Filter bars (toggle or checkbox tags), token fields and applied-filter rows (removable tags), multi-select values, keyword lists with counts. Not for statuses or categories that only inform (Badge), and not for actions with a verb (Button).',
  anatomy: [
    { part: 'root', element: 'span', description: 'A <span> for a value; a <button aria-pressed> (or role="checkbox" aria-checked with the checkbox part) when selectable. White, gray-300 ring, radius 6.' },
    { part: 'checkbox', element: 'span', description: 'Leading 14 / 16 / 18px checkbox (radius 4, gray-300 ring); brand-600 with a white check when the tag is checked.', optional: true },
    { part: 'check', element: 'svg', description: 'The 10 / 12 / 14px check inside the checkbox; hidden until checked.', optional: true },
    { part: 'avatar', element: 'img', description: 'Leading 16px round avatar with the 0.5px contrast ring.', optional: true },
    { part: 'dot', element: 'span', description: 'Leading 8px status dot, green-500 by default (override the color inline for other states).', optional: true },
    { part: 'icon', element: 'svg', description: 'Optional 12px leading icon (a flag, a spark for suggested values). Decorative.', optional: true },
    { part: 'label', element: 'span', description: 'The value text, sentence case, 1–3 words. Never truncated.' },
    { part: 'count', element: 'span', description: 'Trailing count chip: radius 3, gray-100, 12px medium (14px at lg), padding 0 × 4–6.', optional: true },
    { part: 'remove', element: 'button', description: 'Trailing close ×: radius 3, gray-400, 14 / 16 / 20px box with a 10 / 12 / 14px icon; gray-50 on hover. Its own focus target with aria-label "Remove {label}".', optional: true },
  ],
  props: {
    tone: { values: ['neutral', 'accent'], default: 'neutral', description: 'neutral = user-chosen values and filters (the reference); accent = values suggested by the assistant or tied to the brand (use sparingly, a few per view).' },
    variant: { values: ['outline', 'soft'], default: 'outline', description: 'outline = white with the gray-300 ring (the reference tag, on surfaces); soft = gray-50 fill with no ring (on the canvas, inside inputs, in dense rows).' },
    size: { values: ['sm', 'md', 'lg'], default: 'md', description: 'sm 24px with 12px text (table cells, dense filter rows); md 28px with 14px text (default); lg 32px with 14px text (filter bars next to 32px controls).' },
  },
  states: {
    hover: STATE.hover(),
    selected: { selector: '[data-selected], &[aria-pressed="true"], &[aria-checked="true"]', description: 'Toggled on. A pressed chip gets the brand tint; a checkbox tag fills its checkbox brand-600 with the white check.', markup: 'aria-pressed="true" on a button tag, aria-checked="true" on a role="checkbox" tag, or data-selected' },
    focus: STATE.focus(),
    disabled: STATE.disabled(),
  },
  base: {
    root: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      gap: '5px',
      height: '{space.7}',
      'padding-inline': '9px',
      'padding-block': '0',
      'border-radius': '{radius.md}',
      ...typeStyle('label-sm'),
      'background-color': '{color.bg-surface}',
      'box-shadow': ring('{color.border-control}'),
      color: '{color.fg-muted}',
      'white-space': 'nowrap',
      'vertical-align': 'middle',
      'max-width': '100%',
      cursor: 'default',
      ...TRANSITION_TAG,
    },
    checkbox: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.4}',
      height: '{space.4}',
      'border-radius': '{radius.sm}',
      'background-color': '{color.bg-surface}',
      'box-shadow': ring('{color.border-control}'),
      color: '{color.fg-on-action}',
      'margin-inline-start': '-5px',
      ...TRANSITION_TAG,
    },
    check: { width: '{size.icon.xs}', height: '{size.icon.xs}', display: 'block', opacity: '0', transition: 'inherit' },
    avatar: { width: '{space.4}', height: '{space.4}', 'border-radius': '{radius.full}', 'object-fit': 'cover', 'flex-shrink': '0', 'max-width': 'none', 'background-color': '{color.bg-muted}', 'box-shadow': 'inset 0 0 0 0.5px color-mix(in srgb, {black} 16%, transparent)', 'margin-inline-start': '-4px' },
    dot: { width: '{space.2}', height: '{space.2}', 'border-radius': '{radius.full}', 'flex-shrink': '0', 'background-color': '{green.500}', 'margin-inline-start': '-2px' },
    icon: { width: '{size.icon.xs}', height: '{size.icon.xs}', 'flex-shrink': '0', color: '{color.fg-subtle}' },
    label: { display: 'inline-block', 'min-width': '0' },
    count: {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      'padding-inline': '5px',
      'border-radius': '3px',
      'background-color': '{color.bg-muted}',
      ...typeStyle('label-xs'),
      color: '{color.fg-muted}',
      'font-variant-numeric': 'tabular-nums',
      'margin-inline-end': '-6px',
    },
    remove: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.4}',
      height: '{space.4}',
      padding: '0',
      'margin-inline-start': '-2px',
      'margin-inline-end': '-5px',
      'border-radius': '3px',
      color: '{color.fg-subtle}',
      ...TRANSITION_TAG,
    },
    '@states': {
      selected: { root: SELECTED, icon: { color: '{color.fg-action}' } },
      focus: { root: { outline: 'none', 'box-shadow': `${ring('{color.border-control}')}, {shadow.focus}` } },
      disabled: { root: { opacity: '{opacity.disabled}', cursor: 'not-allowed', 'pointer-events': 'none' } },
    },
  },
  variants: {
    tone: { neutral: { root: {} }, accent: { root: {} } },
    variant: { outline: { root: {} }, soft: { root: {} } },
    size: {
      sm: { root: { height: '{space.6}', 'padding-inline': '{space.2}', gap: '{space.1}', ...typeStyle('label-xs') }, checkbox: { width: '{space.3.5}', height: '{space.3.5}', 'margin-inline-start': '-3px' }, check: { width: '{space.2.5}', height: '{space.2.5}' }, avatar: { 'margin-inline-start': '-4px' }, count: { 'padding-inline': '{space.1}', 'margin-inline-end': '-4px' }, remove: { width: '{space.3.5}', height: '{space.3.5}', 'margin-inline-end': '-4px' }, icon: { width: '{space.2.5}', height: '{space.2.5}' } },
      md: { root: { height: '{space.7}', 'padding-inline': '9px' } },
      lg: { root: { height: '{space.8}', 'padding-inline': '{space.2.5}', gap: '{space.1.5}' }, checkbox: { width: '18px', height: '18px', 'margin-inline-start': '-5px' }, check: { width: '{space.3.5}', height: '{space.3.5}' }, avatar: { 'margin-inline-start': '-3px' }, count: { 'padding-inline': '{space.1.5}', ...typeStyle('label-sm'), 'margin-inline-end': '-6px' }, remove: { width: '{space.5}', height: '{space.5}', 'margin-inline-end': '-6px' } },
    },
  },
  compound,
  extraCss: `
button.cn-tag, a.cn-tag { cursor: pointer; }
button.cn-tag:hover:not(:disabled):not([aria-pressed="true"]):not([aria-checked="true"]) { background-color: {color.bg-subtle}; }
.cn-tag[aria-checked="true"] { background-color: {color.bg-surface}; box-shadow: ${ring('{color.border-control}')}; color: {color.fg-muted}; }
.cn-tag[aria-checked="true"] .cn-tag__checkbox, .cn-tag[data-selected] .cn-tag__checkbox { background-color: {color.bg-action}; box-shadow: ${ring('{color.bg-action}')}; }
.cn-tag[aria-checked="true"] .cn-tag__check, .cn-tag[data-selected] .cn-tag__check { opacity: 1; }
.cn-tag[aria-checked="true"]:focus-visible, .cn-tag[aria-checked="true"]:hover:not(:disabled) { background-color: {color.bg-surface}; }
.cn-tag[aria-checked="true"]:focus-visible { box-shadow: ${ring('{color.border-control}')}, {shadow.focus}; }
.cn-tag__remove .cn-icon { width: {size.icon.xs}; height: {size.icon.xs}; }
.cn-tag[data-size="sm"] .cn-tag__remove .cn-icon { width: {space.2.5}; height: {space.2.5}; }
.cn-tag[data-size="lg"] .cn-tag__remove .cn-icon { width: {space.3.5}; height: {space.3.5}; }
.cn-tag__remove:hover { background-color: {color.bg-subtle}; color: {color.fg-muted}; }
.cn-tag__remove:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-tag[data-selected] .cn-tag__remove, .cn-tag[aria-pressed="true"] .cn-tag__remove { color: {color.fg-action}; }
.cn-tag:disabled .cn-tag__remove, .cn-tag[aria-disabled="true"] .cn-tag__remove { pointer-events: none; }
.cn-tag[data-variant="soft"] .cn-tag__checkbox, .cn-tag[data-variant="soft"][aria-checked="true"] { box-shadow: ${ring('{color.border-control}')}; }`,
  examples: [
    ex('Sizes', `<div style="display:flex;align-items:center;gap:var(--cn-space-3)">${mk('Design', { size: 'sm' })}${mk('Design', { size: 'md' })}${mk('Design', { size: 'lg' })}</div>`, 'sm 24px (12px text) · md 28px · lg 32px (14px text). White, gray-300 ring, radius 6.'),
    ex('Removable values', `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-2)">${removable('Design')}${removable('Product')}${removable('Marketing')}${removable('Engineering', 'sm')}${removable('Sales', 'lg')}</div>`, 'The close × is a 16px (14 / 20) radius-3 button with its own focus ring; gray-50 on hover.'),
    ex('With count', `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-2)">${counted('Design', '5', 'sm')}${counted('Design', '5')}${counted('Design', '5', 'lg')}</div>`, 'The count chip: radius 3, gray-100, 12px medium (14px at lg).'),
    ex('Checkbox tags', `<div role="group" aria-label="Teams" style="display:flex;flex-wrap:wrap;gap:var(--cn-space-2)">${checkbox('Design', true)}${checkbox('Product', false)}${checkbox('Engineering', true)}${checkbox('Sales', false, 'md', ' disabled')}</div>`, 'A leading 16px checkbox (14 / 18 at sm / lg); checked = brand-600 with the white check. The tag stays white.'),
    ex('With avatar and with dot', `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-2)">${withAvatar('Maya Chen')}${withAvatar('Daniel Costa', 'lg')}${withDot('Online')}${withDot('Available', 'sm')}</div>`, 'A 16px avatar with the contrast ring; an 8px green dot for live states.'),
    ex('Selectable filter chips', `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-2)">${chip('All', true)}${chip('Active', false)}${chip('Archived', false)}${chip('Shared with me', false)}</div>`, 'aria-pressed="true" is the selected state: brand tint, brand ring and text.'),
    ex('Soft and accent', `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-2)">${removable('Draft', 'md', 'neutral', 'soft')}${mk('Suggested: Q3 launch', { tone: 'accent', variant: 'soft', before: ICON.spark.replace('cn-icon', 'cn-tag__icon'), after: `<button type="button" class="cn-tag__remove" aria-label="Remove Suggested: Q3 launch">${X}</button>` })}${mk('Lumen', { tone: 'accent' })}</div>`, 'soft = gray-50 fill, no ring; accent for assistant suggestions and brand-linked values.'),
    ex('Disabled', `<div style="display:flex;flex-wrap:wrap;gap:var(--cn-space-2)">${chip('Archived', false, ' disabled')}${mk('Locked filter', { attrs: ' aria-disabled="true"', after: `<button type="button" class="cn-tag__remove" aria-label="Remove Locked filter" disabled>${X}</button>` })}</div>`, '50% opacity, cursor not-allowed.'),
  ],
  rules: [
    'Tag is interactive or removable; Badge is not. If it cannot be toggled or removed, it is a Badge.',
    'Labels are nouns in sentence case, 1–3 words, never uppercase and never truncated.',
    'Heights come only from size: 24 / 28 / 32px with 8 / 9 / 10px side padding; the leading and trailing parts pull in by their margins, never by extra padding.',
    'Selectable tags are <button aria-pressed> (brand tint) or role="checkbox" with the checkbox part (white tag, brand checkbox); removable tags are a <span> with a remove <button> inside. A tag is never both selectable and removable.',
    'The remove button is always last, always has aria-label "Remove {label}", and is the only element with hover feedback inside a span tag.',
    'One leading part at most (checkbox, avatar, dot or icon) and one trailing part at most (count or ×).',
    'outline on surfaces (filter bars over white); soft on the canvas, inside inputs and in dense rows where rings would pile up.',
    'accent only for assistant-suggested or brand-linked values, and only a few per view. Never as decoration.',
    'Rows of tags wrap with an 8px gap and align to the start; do not right-align or justify them. One size per row.',
  ],
  a11y: [
    'Selectable: <button type="button" aria-pressed="true|false">, or role="checkbox" aria-checked with the checkbox part. Toggle the aria attribute, not only the data attribute.',
    'Removable: the remove button announces "Remove {label}"; after removing, move focus to the next tag or back to the input.',
    'Both the tag and its remove button are separate Tab stops with their own :focus-visible ring.',
    'Avatars inside tags are decorative (alt=""); the label names the person. A dot needs its meaning in the label ("Online").',
    'Disabled tags stay readable (opacity only). Use disabled on buttons and aria-disabled="true" on span tags.',
  ],
  related: ['badge', 'counter', 'input', 'checkbox', 'button', 'combobox'],
};
