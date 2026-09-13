import type { ComponentSpec } from '../types.ts';
import { ex, ICON } from './_shared.ts';

const sizes = { sm: { box: '32px', icon: '{size.icon.sm}', radius: '{radius.md}' }, md: { box: '40px', icon: '{size.icon.md}', radius: '{radius.lg}' }, lg: { box: '48px', icon: '{size.icon.lg}', radius: '{radius.lg}' }, xl: { box: '56px', icon: '{size.icon.xl}', radius: '{radius.xl}' } };
const tone = (fill: string, fg: string, solid: string, ringA: string, ringB: string) => ({ fill, fg, solid, ringA, ringB });
const TONES = {
  brand: tone('{color.bg-accent-subtle}', '{color.fg-accent}', '{color.bg-action}', '{brand.50}', '{brand.100}'),
  gray: tone('{color.bg-muted}', '{color.fg-muted}', '{color.bg-inverse}', '{neutral.50}', '{neutral.100}'),
  success: tone('{color.bg-success-subtle}', '{color.fg-success}', '{color.bg-success}', '{green.50}', '{green.100}'),
  warning: tone('{color.bg-warning-subtle}', '{color.fg-warning}', '{color.bg-warning}', '{amber.50}', '{amber.100}'),
  error: tone('{color.bg-danger-subtle}', '{color.fg-danger}', '{color.bg-danger}', '{red.50}', '{red.100}'),
};
const compound = Object.entries(TONES).flatMap(([t, v]) => [
  { when: { tone: t, theme: 'light' }, block: { root: { 'background-color': v.fill, color: v.fg, 'border-inline-start': '2px solid currentColor' } } },
  { when: { tone: t, theme: 'dark' }, block: { root: { 'background-color': v.solid, color: t === 'brand' ? '{color.fg-on-action}' : t === 'gray' ? '{color.fg-inverse}' : '{white}' } } },
  { when: { tone: t, theme: 'outline' }, block: { root: { 'background-color': '{color.bg-surface}', color: v.fg, border: '1px solid currentColor', 'border-inline-start-width': '2px' } } },
]);

export const featuredIcon: ComponentSpec = {
  name: 'FeaturedIcon',
  slug: 'featured-icon',
  category: 'media',
  description: 'A compact icon frame with a leading edge and a clipped corner. Introduces a dialog, an empty state or a meaningful section.',
  usage: 'Use at the top of a dialog, an empty state, a feature card or a step. One per block. Never as a decorative bullet in lists and never next to a title inside a table row (use a plain 20px icon there).',
  anatomy: [
    { part: 'root', element: 'span', description: 'The container. Size, radius and theme live here.' },
    { part: 'icon', element: 'svg', description: 'The icon, sized by the container size (16/20/24/28). Stroke 1.5, currentColor.' },
  ],
  props: {
    theme: { values: ['light', 'dark', 'modern', 'outline'], default: 'outline', description: 'outline = a fine frame with a stronger leading edge (default); light = a quiet tinted surface; dark = solid fill with contrasting icon; modern = a neutral surface with a fine border.' },
    tone: { values: ['brand', 'gray', 'success', 'warning', 'error'], default: 'brand', description: 'Color family. gray for neutral/system, success/warning/error for status dialogs.' },
    size: { values: ['sm', 'md', 'lg', 'xl'], default: 'md', description: 'Container 32 / 40 / 48 / 56px with icon 16 / 20 / 24 / 28.' },
    shape: { values: ['square', 'circle'], default: 'square', description: 'square = compact corners with a clipped upper corner; circle = an optional round silhouette. Use square throughout a view.' },
  },
  states: {},
  base: {
    root: { position: 'relative', display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'flex-shrink': '0', 'vertical-align': 'middle' },
    icon: { display: 'block', 'stroke-width': '1.5' },
  },
  variants: {
    theme: {
      light: { root: {} },
      dark: { root: {} },
      modern: { root: { 'background-color': '{color.bg-surface}', color: '{color.fg-muted}', border: '{border.width.thin} solid {color.border-default}', 'box-shadow': 'none' } },
      outline: { root: {} },
    },
    tone: Object.fromEntries(Object.keys(TONES).map((t) => [t, { root: {} }])),
    size: Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, { root: { width: v.box, height: v.box, 'border-radius': v.radius }, icon: { width: v.icon, height: v.icon } }])),
    shape: { square: { root: {} }, circle: { root: { 'border-radius': '{radius.full}' } } },
  },
  compound: [...compound, { when: { theme: 'modern', tone: 'gray' }, block: { root: { color: '{color.fg-muted}' } } }],
  extraCss: `
.cn-featured-icon:not([data-shape="circle"]) { clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%); }
.cn-featured-icon[data-theme="outline"]:not([data-shape="circle"])::after { content: ""; position: absolute; width: 10px; height: 1px; top: 2px; right: -2px; transform: rotate(45deg); background: currentColor; }`,
  examples: [
    ex('Framed icons (default)', `<span class="cn-featured-icon" data-theme="outline" data-tone="brand" data-size="md" data-shape="square">${ICON.spark.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="outline" data-tone="gray" data-size="md" data-shape="square">${ICON.settings.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="outline" data-tone="success" data-size="md" data-shape="square">${ICON.check.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="outline" data-tone="warning" data-size="md" data-shape="square">${ICON.warning.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="outline" data-tone="error" data-size="md" data-shape="square">${ICON.trash.replace('cn-icon', 'cn-featured-icon__icon')}</span>`),
    ex('Dark and modern', `<span class="cn-featured-icon" data-theme="dark" data-tone="brand" data-size="md" data-shape="square">${ICON.spark.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="dark" data-tone="error" data-size="md" data-shape="square">${ICON.trash.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="modern" data-tone="gray" data-size="md" data-shape="square">${ICON.inbox.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="modern" data-tone="gray" data-size="lg" data-shape="square">${ICON.search.replace('cn-icon', 'cn-featured-icon__icon')}</span>`),
    ex('Outline frames (dialogs and alerts)', `<span class="cn-featured-icon" data-theme="outline" data-tone="brand" data-size="md" data-shape="square">${ICON.check.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="outline" data-tone="error" data-size="md" data-shape="square">${ICON.warning.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="outline" data-tone="success" data-size="md" data-shape="square">${ICON.check.replace('cn-icon', 'cn-featured-icon__icon')}</span>`),
    ex('Sizes', `<span class="cn-featured-icon" data-theme="light" data-tone="brand" data-size="sm" data-shape="square">${ICON.spark.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="light" data-tone="brand" data-size="md" data-shape="square">${ICON.spark.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="light" data-tone="brand" data-size="lg" data-shape="square">${ICON.spark.replace('cn-icon', 'cn-featured-icon__icon')}</span> <span class="cn-featured-icon" data-theme="light" data-tone="brand" data-size="xl" data-shape="square">${ICON.spark.replace('cn-icon', 'cn-featured-icon__icon')}</span>`),
  ],
  rules: [
    'One featured icon per block, always above or left of a title. It introduces; it never decorates.',
    'Dialogs: lg (48px) light or outline; empty states: lg/xl; feature cards on marketing pages: md/lg light or dark; alerts: sm outline frame.',
    'Tone follows meaning: brand for neutral product actions, error for destructive confirmations, success for completed, warning for caution, gray for system/info.',
    'The icon is always an outline icon from the set with stroke 1.5 and currentColor. Never emoji, never a filled icon.',
    'Do not put featured icons in table rows, list items or badges.',
  ],
  a11y: ['Decorative: the icon carries aria-hidden and the title next to it names the content.', 'If it must convey a status alone (rare), add role="img" and aria-label to the root.'],
  related: ['empty-state', 'dialog', 'alert', 'card'],
};
