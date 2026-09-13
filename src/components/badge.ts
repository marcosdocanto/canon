import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

/** "utility" colors per hue: bg = 50, text = 700, ring = 200, addon (dot / icon) = 500, solid = 600. */
type Tone = { bg: string; fg: string; ring: string; addon: string; solidBg: string; solidFg: string };
const mix = (a: string, b: string, pct: number) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
const scale = (s: string): Tone => ({ bg: `{${s}.50}`, fg: `{${s}.700}`, ring: `{${s}.200}`, addon: `{${s}.500}`, solidBg: `{${s}.600}`, solidFg: '{white}' });
/** Hues our primitives do not carry (gray-blue, indigo, pink, orange) are mixed from two neighbouring scales. */
const mixed = (a: string, b: string, pct: number): Tone => ({
  bg: mix(`{${a}.50}`, `{${b}.50}`, pct),
  fg: mix(`{${a}.700}`, `{${b}.700}`, pct),
  ring: mix(`{${a}.200}`, `{${b}.200}`, pct),
  addon: mix(`{${a}.500}`, `{${b}.500}`, pct),
  solidBg: mix(`{${a}.600}`, `{${b}.600}`, pct),
  solidFg: '{white}',
});

const TONES: Record<string, Tone> = {
  neutral: { bg: '{color.bg-subtle}', fg: '{color.fg-muted}', ring: '{color.border-default}', addon: '{color.fg-subtle}', solidBg: '{color.bg-inverse}', solidFg: '{color.fg-inverse}' },
  accent: scale('brand'),
  success: scale('green'),
  warning: scale('amber'),
  danger: scale('red'),
  info: scale('blue'),
  'gray-blue': mixed('neutral', 'blue', 72),
  'blue-light': { bg: '{blue.50}', fg: '{blue.600}', ring: '{blue.100}', addon: '{blue.400}', solidBg: '{blue.500}', solidFg: '{white}' },
  blue: scale('blue'),
  indigo: mixed('brand', 'blue', 55),
  purple: scale('brand'),
  pink: mixed('red', 'brand', 58),
  orange: mixed('red', 'amber', 50),
};

const compound = Object.entries(TONES).flatMap(([tone, t]) => [
  { when: { tone, variant: 'soft' }, block: { root: { 'background-color': t.bg, color: t.fg, 'border-color': t.ring } } },
  { when: { tone, variant: 'outline' }, block: { root: { 'background-color': 'transparent', color: t.fg, 'border-color': t.ring } } },
  { when: { tone, variant: 'solid' }, block: { root: { 'background-color': t.solidBg, color: t.solidFg, 'border-color': t.solidBg } } },
]);

const b = (text: string, tone = 'neutral', variant = 'soft', size = 'md', shape = 'square', inner = '') =>
  `<span class="cn-badge" data-tone="${tone}" data-variant="${variant}" data-size="${size}" data-shape="${shape}">${inner}${text}</span>`;
const DOT = '<span class="cn-badge__dot"></span>';
const icon = (name: keyof typeof ICON) => ICON[name].replace('cn-icon', 'cn-badge__icon');
const AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";
const avatar = (name: string) => `<img class="cn-badge__avatar" src="${AVATAR}" alt="" data-name="${name}">`;
const x = (label: string) => `<button type="button" class="cn-badge__x" aria-label="Remove ${label}">${ICON.x}</button>`;

export const badge: ComponentSpec = {
  name: 'Badge',
  slug: 'badge',
  category: 'data-display',
  description: 'Small status label with compact corners (or an optional pill): 12/14px medium text, a 1px ring one step darker than the fill, optional dot, icon, avatar or close button. The tone carries meaning, the variant carries emphasis.',
  usage: 'Statuses, categories and counts next to a title, in a table cell, inside a tab or a nav item. Not for actions (use Button) and not for selectable or removable filters (use Tag) — the close button here only dismisses a label.',
  anatomy: [
    { part: 'root', element: 'span', description: 'The pill (or square). Sizes sm 22 / md 24 / lg 28px tall; text is medium weight, never uppercase.' },
    { part: 'dot', element: 'span', description: 'Optional 6px status dot before the text in the tone\'s addon color. Use for live states (online, running).', optional: true },
    { part: 'icon', element: 'svg', description: 'Optional 12px icon before or after the text, in the tone\'s addon color. Decorative.', optional: true },
    { part: 'avatar', element: 'img', description: 'Optional 16px round image (a person, a flag, a logo) before the text.', optional: true },
    { part: 'x', element: 'button', description: 'Optional 16px close button after the text (12px × icon). Needs aria-label "Remove {text}".', optional: true },
  ],
  props: {
    tone: {
      values: ['neutral', 'accent', 'success', 'warning', 'danger', 'info', 'gray-blue', 'blue-light', 'blue', 'indigo', 'purple', 'pink', 'orange'],
      default: 'neutral',
      description: 'Meaning. neutral (gray) for categories; accent (brand) for brand/AI; success/warning/danger (error) for state; info = blue. The extra hues (gray-blue, blue-light, blue, indigo, purple, pink, orange) are the system\'s decorative palette for labels and tags: use them only for user-chosen categories, never for state.',
    },
    variant: {
      values: ['soft', 'outline', 'solid', 'modern'],
      default: 'soft',
      description: 'soft = tinted fill with a ring one step darker (the system pill-color / color); modern = white fill, gray ring and shadow-xs, only the dot/icon takes the tone color; outline = ring only, transparent fill; solid = filled, for one emphasized status per row at most.',
    },
    shape: {
      values: ['pill', 'square'],
      default: 'square',
      description: 'square = compact token-defined corners (default); pill = fully rounded, for an explicitly round visual family.',
    },
    size: { values: ['sm', 'md', 'lg'], default: 'md', description: 'sm 22px tall with 12px text (tables, tabs, nav items); md 24px with 14px text (default); lg 28px with 14px text (page headers, cards).' },
  },
  states: {},
  base: {
    root: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.1.5}',
      'flex-shrink': '0',
      'box-sizing': 'border-box',
      height: '{space.6}',
      'padding-inline': '{space.2.5}',
      ...typeStyle('label-sm'),
      'border-radius': '{radius.sm}',
      border: '{border.width.thin} solid transparent',
      'white-space': 'nowrap',
      'vertical-align': 'middle',
    },
    dot: { width: '6px', height: '6px', 'border-radius': '{radius.full}', 'flex-shrink': '0', 'background-color': '{color.fg-subtle}' },
    icon: { width: '{size.icon.xs}', height: '{size.icon.xs}', 'flex-shrink': '0', 'stroke-width': '2', color: '{color.fg-subtle}' },
    avatar: { width: '{space.4}', height: '{space.4}', 'border-radius': '{radius.full}', 'object-fit': 'cover', 'flex-shrink': '0', 'max-width': 'none', 'background-color': '{color.bg-muted}' },
    x: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.4}',
      height: '{space.4}',
      'border-radius': '{radius.full}',
      'flex-shrink': '0',
      opacity: '{opacity.muted}',
      ...TRANSITION_COLORS,
    },
  },
  variants: {
    tone: Object.fromEntries(Object.entries(TONES).map(([t, v]) => [t, { dot: { 'background-color': v.addon }, icon: { color: v.addon } }])),
    variant: {
      soft: { root: {} },
      outline: { root: {} },
      solid: { root: {}, dot: { 'background-color': 'currentColor' }, icon: { color: 'currentColor' } },
      modern: { root: { 'background-color': '{color.bg-surface}', color: '{color.fg-muted}', 'border-color': '{color.border-control}', 'box-shadow': '{shadow.xs}' } },
    },
    shape: {
      pill: { root: { 'border-radius': '{radius.full}' }, x: { 'border-radius': '{radius.full}' } },
      square: { root: { 'border-radius': '{radius.md}' }, x: { 'border-radius': '3px' } },
    },
    size: {
      sm: { root: { height: '22px', 'padding-inline': '{space.2}', gap: '{space.1}', ...typeStyle('label-xs') } },
      md: { root: { height: '{space.6}', 'padding-inline': '{space.2.5}' } },
      lg: { root: { height: '{space.7}', 'padding-inline': '{space.3}' } },
    },
  },
  compound: [
    ...compound,
    { when: { shape: 'square', size: 'sm' }, block: { root: { 'padding-inline': '{space.1.5}' } } },
    { when: { shape: 'square', size: 'md' }, block: { root: { 'padding-inline': '{space.2}' } } },
    { when: { shape: 'square', size: 'lg' }, block: { root: { 'padding-inline': '{space.2.5}', 'border-radius': '{radius.lg}' } } },
  ],
  extraCss: `
.cn-badge__x { color: currentColor; }
.cn-badge__x:hover { opacity: 1; background-color: color-mix(in srgb, currentColor 12%, transparent); }
.cn-badge__x:focus-visible { outline: none; opacity: 1; box-shadow: {shadow.focus}; }
.cn-badge__x .cn-icon { width: {size.icon.xs}; height: {size.icon.xs}; stroke-width: 2; }
/* the system trims the padding on the side that carries a dot, icon, avatar or close button. */
.cn-badge:has(> .cn-badge__dot:first-child), .cn-badge:has(> .cn-badge__icon:first-child) { padding-inline-start: {space.2}; }
.cn-badge[data-size="sm"]:has(> .cn-badge__dot:first-child), .cn-badge[data-size="sm"]:has(> .cn-badge__icon:first-child) { padding-inline-start: {space.1.5}; }
.cn-badge[data-size="lg"]:has(> .cn-badge__dot:first-child), .cn-badge[data-size="lg"]:has(> .cn-badge__icon:first-child) { padding-inline-start: {space.2.5}; }
.cn-badge:has(> .cn-badge__icon:last-child) { padding-inline-end: {space.2}; }
.cn-badge[data-size="sm"]:has(> .cn-badge__icon:last-child) { padding-inline-end: {space.1.5}; }
.cn-badge[data-size="lg"]:has(> .cn-badge__icon:last-child) { padding-inline-end: {space.2.5}; }
.cn-badge:has(> .cn-badge__icon) { gap: {space.1}; }
.cn-badge[data-size="sm"]:has(> .cn-badge__icon) { gap: {space.0.5}; }
.cn-badge:has(> .cn-badge__avatar:first-child) { padding-inline-start: {space.1}; }
.cn-badge[data-size="sm"]:has(> .cn-badge__avatar:first-child) { padding-inline-start: 3px; }
.cn-badge[data-size="lg"]:has(> .cn-badge__avatar:first-child) { padding-inline-start: {space.1.5}; }
.cn-badge[data-shape="square"]:has(> .cn-badge__avatar:first-child) { padding-inline-start: {space.1.5}; }
.cn-badge[data-shape="square"][data-size="sm"]:has(> .cn-badge__avatar:first-child) { padding-inline-start: {space.1}; }
.cn-badge[data-shape="square"][data-size="lg"]:has(> .cn-badge__avatar:first-child) { padding-inline-start: {space.2}; }
.cn-badge:has(> .cn-badge__x:last-child) { padding-inline-end: {space.1}; gap: {space.0.5}; }
.cn-badge[data-size="sm"]:has(> .cn-badge__x:last-child) { padding-inline-end: 3px; }
.cn-badge[data-size="lg"]:has(> .cn-badge__x:last-child) { padding-inline-end: {space.1.5}; }`,
  examples: [
    ex('Colors (pill, soft)', ['neutral', 'accent', 'danger', 'warning', 'success', 'info', 'gray-blue', 'blue-light', 'blue', 'indigo', 'purple', 'pink', 'orange'].map((t) => b('Label', t)).join(' '), 'Order: gray, brand, error, warning, success, then the decorative hues.'),
    ex('Sizes', `${b('Label', 'accent', 'soft', 'sm')} ${b('Label', 'accent', 'soft', 'md')} ${b('Label', 'accent', 'soft', 'lg')}`, 'sm 22px · md 24px · lg 28px.'),
    ex('Types: pill-color, badge-color, badge-modern', `${b('Label', 'success', 'soft', 'md', 'pill')} ${b('Label', 'success', 'soft', 'md', 'square')} ${b('Label', 'success', 'modern', 'md', 'square')} ${b('Label', 'success', 'modern', 'lg', 'square')}`, 'square = 6px radius (8px at lg); modern = white with a gray ring and shadow-xs.'),
    ex('With dot', `${b('Active', 'success', 'soft', 'md', 'pill', DOT)} ${b('Processing', 'accent', 'soft', 'md', 'square', DOT)} ${b('Online', 'success', 'modern', 'md', 'square', DOT)} ${b('Offline', 'neutral', 'modern', 'sm', 'square', DOT)}`, 'In the modern type only the dot takes the color.'),
    ex('With icon', `${b('Verified', 'success', 'soft', 'md', 'pill', icon('check'))} ${b('Needs attention', 'warning', 'soft', 'md', 'square', icon('warning'))} <span class="cn-badge" data-tone="accent" data-variant="modern" data-size="md" data-shape="square">Open${icon('arrow')}</span>`, 'Leading or trailing, 12px, addon color.'),
    ex('With avatar', `${b('Maya Chen', 'neutral', 'soft', 'md', 'pill', avatar('Maya Chen'))} ${b('Daniel Costa', 'neutral', 'modern', 'md', 'square', avatar('Daniel Costa'))} ${b('Sofia Almeida', 'accent', 'soft', 'lg', 'pill', avatar('Sofia Almeida'))}`),
    ex('With x', `<span class="cn-badge" data-tone="neutral" data-variant="soft" data-size="md" data-shape="pill">Design${x('Design')}</span> <span class="cn-badge" data-tone="accent" data-variant="soft" data-size="md" data-shape="square">Reporting${x('Reporting')}</span> <span class="cn-badge" data-tone="neutral" data-variant="modern" data-size="lg" data-shape="square">the system${x('the system')}</span>`),
    ex('Outline and solid', `${b('Draft', 'neutral', 'outline')} ${b('Overdue', 'danger', 'solid')} ${b('Live', 'success', 'solid', 'sm', 'pill', DOT)} ${b('New', 'accent', 'outline', 'md', 'square')}`),
  ],
  rules: [
    'Text is 1–2 words in sentence case, medium weight, never uppercase.',
    'One solid badge per row at most. Everything else soft, modern or outline.',
    'Tone is meaning, not decoration: success = done/healthy, warning = needs attention, danger = failed/blocked, info = new/informational, accent = brand or AI-generated, neutral = category. The decorative hues are for user-defined labels only.',
    'Modern badges keep gray text whatever the tone; only the dot or icon takes the color. Use them on tinted backgrounds where a colored fill would clash.',
    'sm inside tables, tabs and nav items; md next to titles; lg in page headers and cards. Match the size of the text next to it.',
    'Never make the badge itself clickable. If it filters, it is a Tag; if it acts, it is a Button. The × only dismisses a label.',
  ],
  a11y: [
    'The text must carry the meaning; the dot, icon and tone are reinforcement. "Working" not just a green dot.',
    'The close button needs aria-label "Remove {text}" and is the only focusable thing in a badge.',
    'Live states with a dot may also use aria-live on the containing region, not on the badge.',
    'Avatar images inside badges are decorative (alt="") because the text names the person.',
  ],
  related: ['tag', 'kicker', 'counter'],
};
