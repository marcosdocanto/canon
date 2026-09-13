import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// the reference toggle: sm 36×20 track with a 16px thumb, md 44×24 with a 20px thumb (2px inset),
// gray-100 track with a hairline ring when off, brand-600 when on (brand-700 on hover), white thumb
// with shadow-sm sliding 16 / 20px; 150ms linear. Slim: a thin 32×16 / 40×20 track with the thumb
// overhanging it, a 1px gray-300 thumb border that turns brand when on. Focus = 4px brand ring on
// the track; disabled = track at 50%. Label 14 / 16px medium, muted supporting line, 8 / 12px gap.

const TRACK_MOTION = {
  'transition-property': 'background-color, box-shadow, opacity',
  'transition-duration': '{motion.duration.normal}',
  'transition-timing-function': '{motion.easing.linear}',
};
const THUMB_MOTION = {
  'transition-property': 'transform, border-color, background-color',
  'transition-duration': '{motion.duration.normal}',
  'transition-timing-function': '{motion.easing.standard}',
};
const ring = (width: string, color: string) => `inset 0 0 0 ${width} ${color}`;

/** label wrapper → hidden input → track (with thumb) → text (+ optional description) */
const sw = (root: string, input: string, label: string, description = '', variant = 'default') =>
  `<label class="cn-switch" data-variant="${variant}" ${root}><input class="cn-switch__input" type="checkbox" role="switch" ${input}><span class="cn-switch__track" aria-hidden="true"><span class="cn-switch__thumb"></span></span><span class="cn-switch__label">${label}</span>${description ? `<span class="cn-switch__description">${description}</span>` : ''}</label>`;
const stack = (...items: string[]) => `<div style="display:flex;flex-direction:column;gap:var(--cn-space-4)">${items.join('')}</div>`;

export const switchSpec: ComponentSpec = {
  name: 'Switch',
  slug: 'switch',
  category: 'forms',
  description: 'On/off toggle that applies immediately: a 36×20 (sm) or 44×24 (md) pill track with a white thumb that slides right while the track turns from gray-100 to the brand color. A slim variant shrinks the track under an overhanging bordered thumb.',
  usage: 'Settings that take effect the moment they change (notifications, dark mode, auto-approve) and feature flags. If the change needs a Save button use Checkbox; if it is a choice between two named options use SegmentedControl or Radio.',
  anatomy: [
    { part: 'root', element: 'label', description: 'The <label> wrapping everything: hit target and accessible name. inline-grid: track in column 1, text in column 2, 8px (sm) or 12px (md) apart.' },
    { part: 'input', element: 'input', description: 'Native <input type="checkbox" role="switch">, visually hidden (opacity 0 over the track) but focusable.' },
    { part: 'track', element: 'span', description: 'The pill: 36×20 (sm) or 44×24 (md) with a 2px inset, radius full, gray-100 with a hairline ring when off, brand when on. Slim: 32×16 / 40×20 with no inset. aria-hidden.' },
    { part: 'thumb', element: 'span', description: 'White circle (16px sm / 20px md) with shadow-sm that translates by its own width when on. Slim: shadow-xs and a 1px gray-300 border that turns brand when on.' },
    { part: 'label', element: 'span', description: '14px (sm) or 16px (md) medium text in the default ink. Names the thing being turned on ("Email digest").' },
    { part: 'description', element: 'span', description: 'Optional supporting line under the label, same size, regular weight, muted: what happens when it is on.', optional: true },
  ],
  props: {
    size: { values: ['sm', 'md'], default: 'sm', description: 'sm = 36×20 track with a 16px thumb and a 14px label: settings rows, tables, popovers (the reference default); md = 44×24 track with a 20px thumb and a 16px label: touch screens and prominent settings.' },
    variant: { values: ['default', 'slim'], default: 'default', description: 'default = the thumb sits inside the track with a 2px inset; slim = a thinner track (32×16 / 40×20) with the bordered thumb overhanging it, for dense rows and table cells.' },
  },
  states: {
    hover: { selector: ':hover', description: 'When on, the track takes the brand hover color (slim: the thumb border does). Off has no hover change. Disabled wins over it.', markup: 'native :hover on the label' },
    checked: { selector: ':has(:checked)', description: 'On: the track turns to the brand color and the thumb slides right by its own width.', markup: 'checked attribute on the input' },
    focus: { selector: ':has(:focus-visible)', description: 'Keyboard focus shows the 4px brand ring around the track.', markup: 'native :focus-visible on the input' },
    disabled: { selector: '[data-disabled], &:has(:disabled)', description: 'Track at 50% opacity, cursor not-allowed on the whole row; the text keeps its color and the on/off position stays readable.', markup: 'disabled on the input' },
  },
  base: {
    root: {
      position: 'relative',
      display: 'inline-grid',
      'grid-template-columns': 'auto minmax(0, 1fr)',
      'column-gap': '{space.2}',
      'row-gap': '0',
      'align-items': 'start',
      'max-width': '100%',
      color: '{color.fg-default}',
      cursor: 'pointer',
      '-webkit-tap-highlight-color': 'transparent',
    },
    input: { position: 'absolute', top: '0', left: '0', margin: '0', padding: '0', opacity: '0', cursor: 'pointer' },
    track: {
      position: 'relative',
      display: 'block',
      'grid-column': '1',
      'grid-row': '1',
      'flex-shrink': '0',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-muted}',
      'box-shadow': ring('0.5px', '{color.border-default}'),
      ...TRACK_MOTION,
    },
    thumb: {
      position: 'absolute',
      top: '{space.0.5}',
      left: '{space.0.5}',
      'box-sizing': 'border-box',
      'border-radius': '{radius.full}',
      'background-color': '{white}',
      'box-shadow': '{shadow.sm}',
      transform: 'translateX(0)',
      ...THUMB_MOTION,
    },
    label: { 'grid-column': '2', ...typeStyle('label-sm'), color: '{color.fg-default}', 'user-select': 'none' },
    description: { 'grid-column': '2', ...typeStyle('body-md'), color: '{color.fg-muted}' },
    '@states': {
      checked: { track: { 'background-color': '{color.bg-action}' } },
      focus: { track: { 'box-shadow': `${ring('0.5px', '{color.border-default}')}, {shadow.focus}` } },
      disabled: { root: { cursor: 'not-allowed' }, input: { cursor: 'not-allowed' }, track: { opacity: '{opacity.disabled}' } },
    },
  },
  variants: {
    size: {
      sm: {
        input: { width: '{space.9}', height: '{space.5}' },
        track: { width: '{space.9}', height: '{space.5}' },
        thumb: { width: '{space.4}', height: '{space.4}' },
        '@states': { checked: { thumb: { transform: 'translateX({space.4})' } } },
      },
      md: {
        root: { 'column-gap': '{space.3}', 'row-gap': '{space.0.5}' },
        input: { width: '{space.11}', height: '{space.6}' },
        track: { width: '{space.11}', height: '{space.6}' },
        thumb: { width: '{space.5}', height: '{space.5}' },
        label: { ...typeStyle('label-lg'), 'font-weight': '{font.weight.medium}' },
        description: { ...typeStyle('body-lg') },
        '@states': { checked: { thumb: { transform: 'translateX({space.5})' } } },
      },
    },
    variant: {
      default: { root: {} },
      slim: {
        track: { 'margin-top': '{space.0.5}', 'box-shadow': ring('1px', '{color.border-default}') },
        thumb: { top: '0', left: '0', 'box-shadow': '{shadow.xs}', border: '{border.width.thin} solid {color.border-control}' },
        '@states': {
          checked: { track: { 'box-shadow': ring('1px', 'transparent') }, thumb: { 'border-color': '{color.bg-action}' } },
          focus: { track: { 'box-shadow': `${ring('1px', '{color.border-default}')}, {shadow.focus}` } },
        },
      },
    },
  },
  compound: [
    { when: { variant: 'slim', size: 'sm' }, block: { input: { top: '{space.0.5}', width: '{space.8}', height: '{space.4}' }, track: { width: '{space.8}', height: '{space.4}' } } },
    { when: { variant: 'slim', size: 'md' }, block: { input: { top: '{space.0.5}', width: '{space.10}', height: '{space.5}' }, track: { width: '{space.10}', height: '{space.5}' } } },
  ],
  extraCss: `
.cn-switch:hover:has(:checked):not(:has(:disabled)) .cn-switch__track { background-color: {color.bg-action-hover}; }
.cn-switch:has(:checked):has(:focus-visible) .cn-switch__track { box-shadow: inset 0 0 0 0.5px {color.border-default}, {shadow.focus}; }
.cn-switch[data-variant="slim"]:has(:checked):has(:focus-visible) .cn-switch__track { box-shadow: inset 0 0 0 1px transparent, {shadow.focus}; }
.cn-switch[data-variant="slim"]:hover:has(:checked):not(:has(:disabled)) .cn-switch__thumb { border-color: {color.bg-action-hover}; }`,
  examples: [
    ex('Off', sw('data-size="sm"', '', 'Email digest'), '36×20 gray-100 track with a hairline ring; 16px white thumb with shadow-sm.'),
    ex('On', sw('data-size="sm"', 'checked', 'Desktop notifications'), 'Brand-600 track, thumb slid 16px to the right; brand-700 on hover.'),
    ex('With supporting text', sw('data-size="sm"', 'checked', 'Auto-approve replies', 'Lumen posts follow-ups without waiting for your review when the request only asks for documents.'), 'Supporting line: same size, regular weight, muted.'),
    ex('Medium', sw('data-size="md"', 'checked', 'Share usage analytics', 'Helps us prioritise what to build next.'), '44×24 track with a 20px thumb; 16px text 12px away.'),
    ex('Slim', stack(sw('data-size="sm"', '', 'Show archived', '', 'slim'), sw('data-size="sm"', 'checked', 'Compact rows', '', 'slim'), sw('data-size="md"', 'checked', 'Live cursors', 'Teammates see where you are editing.', 'slim')), 'A thin track under an overhanging bordered thumb: 32×16 (sm) and 40×20 (md). The thumb border turns brand when on.'),
    ex('Disabled', stack(sw('data-size="sm"', 'checked disabled', 'SSO enforced', 'Managed by your identity provider.'), sw('data-size="sm"', 'disabled', 'Public profile')), 'The track fades to 50%; the text keeps its color.'),
  ],
  recipes: [
    ex('Settings rows', `<div style="width:100%;max-width:480px;display:flex;flex-direction:column">${[
      ['Email digest', 'A summary of new comments every weekday at 8:00.', 'checked'],
      ['Desktop notifications', 'Only for projects you follow.', 'checked'],
      ['Sounds', 'Play a chime when Maya Chen mentions you.', ''],
    ].map(([t, d, c], i) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--cn-space-4);padding:var(--cn-space-4) 0;${i ? 'border-top:1px solid var(--cn-color-border-default)' : ''}"><div><div class="cn-text-label-sm">${t}</div><div class="cn-text-body-md" style="color:var(--cn-color-fg-muted)">${d}</div></div>${sw('data-size="sm"', c, `<span class="cn-sr-only">${t}</span>`)}</div>`).join('')}</div>`, 'Text left, switch right, one row per setting with a hairline between rows. The switch keeps a visually hidden label so it stays named.'),
  ],
  rules: [
    'A switch applies immediately; there is no Save button after it. If the change needs a submit, use a Checkbox.',
    'The label names the thing being turned on ("Email digest"), not the action ("Enable email digest") and not a question.',
    'Never use a switch for a choice between two named options (Monthly / Annual): that is a SegmentedControl or a Radio group.',
    'In settings lists the text sits left and the switch right, one row per setting, 16px vertical padding and a hairline between rows.',
    'Do not add "On" / "Off" text next to the track; position and color are the state. Confirm with a toast only when the change has side effects (emails sent, data deleted).',
    'sm (36×20) everywhere by default; md (44×24) on touch screens and prominent settings; slim inside dense rows and table cells.',
    'Motion: thumb and track change together in 150ms; nothing else animates.',
  ],
  a11y: [
    'The input is a native checkbox with role="switch": screen readers announce on/off and Space toggles it.',
    'The root <label> gives the accessible name. When the text lives elsewhere (settings row), keep a cn-sr-only label inside or use aria-labelledby.',
    'The focus ring appears on the track through :has(:focus-visible); never remove it.',
    'Disabled switches stay readable (track at 50%, text unchanged); say in the supporting line why the setting is locked.',
  ],
  related: ['checkbox', 'radio', 'segmented-control'],
};
