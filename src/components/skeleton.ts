import type { ComponentSpec } from '../types.ts';
import { ex } from './_shared.ts';

export const skeleton: ComponentSpec = {
  name: 'Skeleton',
  slug: 'skeleton',
  category: 'feedback',
  description: 'Grey placeholder shapes that hold the layout while content loads: text lines, a circle, a rectangle or a card, with a slow shimmer sweeping across. Same size as the content they stand in for, so nothing jumps when it arrives.',
  usage: 'Use when the shape of the incoming content is known (a list, a card, a profile header) and the wait is over ~300ms. For a wait with no known layout use Spinner; for a measurable task use Progress. Never leave skeletons on screen after an error; replace them with an empty state or an Alert.',
  anatomy: [
    { part: 'root', element: 'div', description: 'One placeholder block. aria-hidden="true"; the region around it carries aria-busy. Size comes from the variant plus inline width/height.' },
  ],
  props: {
    variant: {
      values: ['text', 'circle', 'rect', 'card'],
      default: 'text',
      description: 'text = one line, 1em tall, radius sm, full width (set width inline for the last line); circle = 40px avatar placeholder, radius full; rect = a box with radius md for images, inputs and buttons (size inline); card = radius xl, min-height 120px, for a whole card.',
    },
  },
  states: {},
  base: {
    root: {
      display: 'block',
      'flex-shrink': '0',
      'background-color': '{color.bg-muted}',
      'background-image': 'linear-gradient(90deg, {color.bg-muted} 0%, {color.bg-subtle} 50%, {color.bg-muted} 100%)',
      'background-size': '200% 100%',
      'border-radius': '{radius.md}',
      animation: 'cn-skeleton-shimmer 1.4s ease-in-out infinite',
    },
  },
  variants: {
    variant: {
      text: { root: { height: '1em', width: '100%', 'border-radius': '{radius.sm}' } },
      circle: { root: { width: '{size.icon.2xl}', height: '{size.icon.2xl}', 'border-radius': '{radius.full}' } },
      rect: { root: { 'border-radius': '{radius.md}' } },
      card: { root: { 'border-radius': '{radius.xl}', 'min-height': '120px', width: '100%' } },
    },
  },
  extraCss: `
@keyframes cn-skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.cn-skeleton + .cn-skeleton[data-variant="text"] { margin-top: {space.2}; }`,
  examples: [
    ex('Text lines', `<div style="width:320px" aria-busy="true"><div class="cn-skeleton" data-variant="text" aria-hidden="true"></div><div class="cn-skeleton" data-variant="text" aria-hidden="true"></div><div class="cn-skeleton" data-variant="text" aria-hidden="true" style="width:60%"></div></div>`, 'Consecutive text skeletons space themselves 8px apart. The last line is shorter.'),
    ex('Circle', `<div class="cn-skeleton" data-variant="circle" aria-hidden="true"></div>`),
    ex('Rect (image or control)', `<div class="cn-skeleton" data-variant="rect" aria-hidden="true" style="width:240px;height:36px"></div>`),
    ex('Card', `<div class="cn-skeleton" data-variant="card" aria-hidden="true" style="width:320px;height:140px"></div>`),
  ],
  recipes: [
    ex('List row (circle + two lines)', `<div style="display:flex;align-items:center;gap:var(--cn-space-3);width:360px" aria-busy="true"><div class="cn-skeleton" data-variant="circle" aria-hidden="true"></div><div style="flex:1;min-width:0"><div class="cn-skeleton" data-variant="text" aria-hidden="true" style="width:45%"></div><div class="cn-skeleton" data-variant="text" aria-hidden="true" style="width:70%;height:0.85em"></div></div></div>`, 'Mirrors a prospect row: avatar, name, one line of meta. Repeat it 3–5 times, never more.'),
    ex('Card with header', `<section class="cn-card" data-variant="default" data-padding="md" style="max-width:360px" aria-busy="true"><div class="cn-card__body"><div class="cn-skeleton" data-variant="text" aria-hidden="true" style="width:40%;height:1.25em"></div><div class="cn-skeleton" data-variant="text" aria-hidden="true" style="width:80%"></div><div class="cn-skeleton" data-variant="text" aria-hidden="true" style="width:65%"></div><div class="cn-skeleton" data-variant="rect" aria-hidden="true" style="width:120px;height:32px;margin-top:var(--cn-space-4)"></div></div></section>`),
  ],
  rules: [
    'Match the real content: same widths, same line count, same avatar size. A skeleton that does not match the layout causes a jump and is worse than a spinner.',
    'Show 3–5 rows for a list, never the whole page. Below the fold the real content can arrive silently.',
    'Do not show skeletons for waits under 300ms, and keep them at least 500ms once shown to avoid flicker.',
    'One shimmer rhythm for the whole page (1.4s); all skeletons animate in sync because they share one keyframe.',
    'Vary text widths (100%, 60%, 80%); identical lines look like a table, not text.',
    'Never put skeletons inside a Button, a Badge or a Toast.',
    'Errors replace skeletons with an Alert or an empty state; they never stay on screen.',
  ],
  a11y: [
    'aria-hidden="true" on every skeleton; put aria-busy="true" on the region that is loading and remove it when content arrives.',
    'Announce the loaded state through a live region only when the wait was long (more than a few seconds).',
    'The shimmer stops under prefers-reduced-motion (base.css); the grey shapes remain.',
  ],
  related: ['spinner', 'progress', 'card'],
};
