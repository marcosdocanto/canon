import type { ComponentSpec } from '../types.ts';
import { ex } from './_shared.ts';

const SIZE_ICON: Record<string, string> = { xs: '{size.icon.xs}', sm: '{size.icon.sm}', md: '{size.icon.md}', lg: '{size.icon.lg}', xl: '{size.icon.xl}' };
const TONE_COLOR: Record<string, string> = { current: 'currentColor', muted: '{color.fg-subtle}', action: '{color.fg-action}', 'on-action': '{color.fg-on-action}' };

export const spinner: ComponentSpec = {
  name: 'Spinner',
  slug: 'spinner',
  category: 'feedback',
  description: 'Small rotating ring for a wait without a known duration. A 2px current-color circle with one transparent quarter, spinning at 0.7s; it inherits the text color so it fits inside buttons, rows and empty states.',
  usage: 'Use next to a short sentence while something loads and no layout is known yet ("Searching 212 companies…"), or inside a control that is busy. For loading content whose shape is known use Skeleton; for a measurable task use Progress. Never use more than one spinner in view.',
  anatomy: [
    { part: 'root', element: 'span', description: 'The ring. role="status"; contains a visually hidden label (.cn-sr-only) so screen readers announce what is happening.' },
  ],
  props: {
    size: {
      values: ['xs', 'sm', 'md', 'lg', 'xl'],
      default: 'md',
      description: 'Diameter from the icon scale: xs 12px (inside badges), sm 14px (inside sm buttons and table rows), md 16px (default, inline with body text), lg 20px (empty states), xl 24px (page-level loading).',
    },
    tone: {
      values: ['current', 'muted', 'action', 'on-action'],
      default: 'current',
      description: 'current = inherits the text color (default, inside buttons and rows); muted = subtle grey for quiet loading; action = the action color for a primary wait; on-action = the text color used on filled action surfaces.',
    },
  },
  states: {},
  base: {
    root: {
      display: 'inline-block',
      'flex-shrink': '0',
      width: '{size.icon.md}',
      height: '{size.icon.md}',
      'border-radius': '{radius.full}',
      border: '{border.width.medium} solid currentColor',
      'border-right-color': 'transparent',
      color: 'currentColor',
      'vertical-align': 'middle',
      animation: 'cn-spinner-spin 0.7s linear infinite',
    },
  },
  variants: {
    size: Object.fromEntries(Object.entries(SIZE_ICON).map(([s, v]) => [s, { root: { width: v, height: v, ...(s === 'xs' || s === 'sm' ? { 'border-width': '1.5px' } : {}) } }])),
    tone: Object.fromEntries(Object.entries(TONE_COLOR).map(([t, c]) => [t, { root: { color: c } }])),
  },
  extraCss: `
@keyframes cn-spinner-spin { to { transform: rotate(360deg); } }`,
  examples: [
    ex('Default (md, current color)', `<span class="cn-spinner" data-size="md" data-tone="current" role="status"><span class="cn-sr-only">Loading</span></span>`),
    ex('Sizes', `<span class="cn-spinner" data-size="xs" data-tone="current" role="status"><span class="cn-sr-only">Loading</span></span> <span class="cn-spinner" data-size="sm" data-tone="current" role="status"><span class="cn-sr-only">Loading</span></span> <span class="cn-spinner" data-size="md" data-tone="current" role="status"><span class="cn-sr-only">Loading</span></span> <span class="cn-spinner" data-size="lg" data-tone="current" role="status"><span class="cn-sr-only">Loading</span></span> <span class="cn-spinner" data-size="xl" data-tone="current" role="status"><span class="cn-sr-only">Loading</span></span>`),
    ex('Muted with a sentence', `<div style="display:inline-flex;align-items:center;gap:var(--cn-space-2);color:var(--cn-color-fg-muted)"><span class="cn-spinner" data-size="sm" data-tone="muted" role="status"><span class="cn-sr-only">Loading</span></span><span class="cn-text-body-sm">Searching 212 companies in Japan…</span></div>`),
    ex('Action tone', `<span class="cn-spinner" data-size="lg" data-tone="action" role="status"><span class="cn-sr-only">Verifying</span></span>`),
    ex('On a filled action surface', `<span style="display:inline-flex;align-items:center;gap:var(--cn-space-2);padding:var(--cn-space-2) var(--cn-space-3);border-radius:var(--cn-radius-md);background:var(--cn-color-bg-action);color:var(--cn-color-fg-on-action)"><span class="cn-spinner" data-size="sm" data-tone="on-action" role="status"><span class="cn-sr-only">Sending</span></span><span class="cn-text-label-md">Sending…</span></span>`, 'Inside a real Button use data-loading instead; the Button draws its own spinner.'),
  ],
  rules: [
    'One spinner in view at a time. Several loading areas share one spinner at the top of the region, or use Skeleton.',
    'Pair it with a sentence that names what is happening ("Searching 212 companies…"); a lone spinner is only acceptable inside a control.',
    'Do not show it for waits under 300ms; flashing spinners feel slower than nothing.',
    'Inside a Button use data-loading; the Button already has its own spinner sized to the control.',
    'Size follows the text it sits next to: sm with body-sm, md with body-md, lg/xl only in empty states and page-level loading.',
    'Tone current by default; muted for background loading; action only for a primary wait the user asked for.',
    'Never place a spinner inside a Toast or a Badge.',
  ],
  a11y: [
    'role="status" on the ring with a visually hidden text (.cn-sr-only) that says what is loading.',
    'When the wait ends, update the same live region with the result ("38 companies found") so the change is announced.',
    'The animation stops under prefers-reduced-motion (base.css); the static ring remains visible.',
    'Do not put the spinner inside aria-hidden containers when it is the only feedback.',
  ],
  related: ['progress', 'skeleton', 'button'],
};
