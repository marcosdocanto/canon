import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

const TONE_FILL: Record<string, string> = {
  action: '{color.bg-action}',
  accent: '{color.bg-accent}',
  success: '{color.bg-success}',
  warning: '{color.bg-warning}',
  danger: '{color.bg-danger}',
};

export const progress: ComponentSpec = {
  name: 'Progress',
  slug: 'progress',
  category: 'feedback',
  description: 'Horizontal bar that shows how much of a known task is done: a muted track, a filled indicator whose width is the value, and an optional label/value line above. Indeterminate mode slides a short segment when the total is unknown.',
  usage: 'Use for tasks with a measurable share: an import, seats used of a plan, steps of an onboarding. Use the indeterminate state only briefly, while the total is being computed. For a wait without a value use Spinner; for loading content use Skeleton.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Wrapper: header + track stacked with a 6px gap. role="progressbar" with aria-valuenow/min/max, or aria-busy in indeterminate mode.' },
    { part: 'header', element: 'div', description: 'Optional line above the track: label on the left, value on the right, body-xs muted.', optional: true },
    { part: 'label', element: 'span', description: 'What is being measured ("Importing prospects", "Seats used").', optional: true },
    { part: 'value', element: 'span', description: 'The number, tabular ("42%", "12 / 40").', optional: true },
    { part: 'track', element: 'div', description: 'The full-width muted bar, radius full, clips the indicator.' },
    { part: 'indicator', element: 'div', description: 'The filled part. Width comes from an inline style (style="width:42%") and transitions smoothly.' },
  ],
  props: {
    size: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Track height. sm = 2px for inside table rows and cards; md = 4px default; lg = 8px for a page-level task (import, onboarding).',
    },
    tone: {
      values: ['action', 'accent', 'success', 'warning', 'danger'],
      default: 'action',
      description: 'Fill color. action = default; accent = an agent is working on it; success = completed; warning = near a limit (≥ 80%); danger = over the limit or failed.',
    },
  },
  states: {
    indeterminate: { selector: '[data-state="indeterminate"]', description: 'Total unknown: a 40%-wide segment slides across the track in a loop. No aria-valuenow; aria-busy="true".', markup: 'data-state="indeterminate" on the root (omit the inline width)' },
  },
  base: {
    root: { display: 'flex', 'flex-direction': 'column', gap: '{space.1.5}', width: '100%', 'min-width': '0' },
    header: { display: 'flex', 'align-items': 'baseline', 'justify-content': 'space-between', gap: '{space.3}', ...typeStyle('body-xs'), color: '{color.fg-muted}' },
    label: { 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    value: { 'flex-shrink': '0', 'font-variant-numeric': 'tabular-nums', color: '{color.fg-default}' },
    track: { position: 'relative', width: '100%', height: '4px', 'background-color': '{color.bg-muted}', 'border-radius': '{radius.full}', overflow: 'hidden' },
    indicator: {
      height: '100%',
      width: '0',
      'background-color': '{color.bg-action}',
      'border-radius': '{radius.full}',
      'transition-property': 'width',
      'transition-duration': '{motion.duration.slow}',
      'transition-timing-function': '{motion.easing.standard}',
    },
    '@states': {
      indeterminate: {
        indicator: { width: '40%', animation: 'cn-progress-slide 1.2s {motion.easing.standard} infinite' },
      },
    },
  },
  variants: {
    size: {
      sm: { track: { height: '2px' } },
      md: { track: { height: '4px' } },
      lg: { track: { height: '8px' } },
    },
    tone: Object.fromEntries(Object.entries(TONE_FILL).map(([t, color]) => [t, { indicator: { 'background-color': color } }])),
  },
  extraCss: `
@keyframes cn-progress-slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }`,
  examples: [
    ex('Default with label and value', `<div class="cn-progress" data-size="md" data-tone="action" role="progressbar" aria-labelledby="prg-import" aria-valuenow="42" aria-valuemin="0" aria-valuemax="100" style="max-width:360px"><div class="cn-progress__header"><span class="cn-progress__label" id="prg-import">Importing prospects</span><span class="cn-progress__value">42%</span></div><div class="cn-progress__track"><div class="cn-progress__indicator" style="width:42%"></div></div></div>`),
    ex('Large, accent (agent working)', `<div class="cn-progress" data-size="lg" data-tone="accent" role="progressbar" aria-labelledby="prg-verify" aria-valuenow="118" aria-valuemin="0" aria-valuemax="212" style="max-width:360px"><div class="cn-progress__header"><span class="cn-progress__label" id="prg-verify">Verifying companies</span><span class="cn-progress__value">118 / 212</span></div><div class="cn-progress__track"><div class="cn-progress__indicator" style="width:56%"></div></div></div>`),
    ex('Warning near a limit', `<div class="cn-progress" data-size="md" data-tone="warning" role="progressbar" aria-labelledby="prg-seats" aria-valuenow="34" aria-valuemin="0" aria-valuemax="40" style="max-width:360px"><div class="cn-progress__header"><span class="cn-progress__label" id="prg-seats">Seats used</span><span class="cn-progress__value">34 / 40</span></div><div class="cn-progress__track"><div class="cn-progress__indicator" style="width:85%"></div></div></div>`),
    ex('Success, complete', `<div class="cn-progress" data-size="md" data-tone="success" role="progressbar" aria-labelledby="prg-done" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="max-width:360px"><div class="cn-progress__header"><span class="cn-progress__label" id="prg-done">Export</span><span class="cn-progress__value">Done</span></div><div class="cn-progress__track"><div class="cn-progress__indicator" style="width:100%"></div></div></div>`),
    ex('Small, no header (inside a row)', `<div class="cn-progress" data-size="sm" data-tone="danger" role="progressbar" aria-label="Bounce rate" aria-valuenow="12" aria-valuemin="0" aria-valuemax="100" style="max-width:160px"><div class="cn-progress__track"><div class="cn-progress__indicator" style="width:12%"></div></div></div>`),
    ex('Indeterminate', `<div class="cn-progress" data-size="md" data-tone="action" data-state="indeterminate" role="progressbar" aria-labelledby="prg-prep" aria-busy="true" style="max-width:360px"><div class="cn-progress__header"><span class="cn-progress__label" id="prg-prep">Preparing the search…</span></div><div class="cn-progress__track"><div class="cn-progress__indicator"></div></div></div>`),
  ],
  rules: [
    'Width comes from the layout; the indicator width is the only inline style allowed (style="width:42%").',
    'Always show the value when the user can act on it (seats, quota). Show "Done" instead of 100% when the task is finished.',
    'Tone follows the value, not the brand: switch to warning at ≥ 80% of a limit and to danger when the limit is exceeded or the task failed.',
    'accent means an agent is doing the work. Do not use it for user-driven uploads.',
    'Indeterminate for at most a few seconds; if the total stays unknown, replace it with a Spinner and a sentence.',
    'Sizes: sm inside rows and cards, md by default, lg for one page-level task at a time.',
    'Never animate the indicator on first paint; only transitions between updates (260ms).',
  ],
  a11y: [
    'role="progressbar" with aria-valuenow, aria-valuemin and aria-valuemax; use aria-valuetext when the number alone is unclear ("34 of 40 seats").',
    'Name it with aria-labelledby pointing to the label, or aria-label when there is no visible label.',
    'Indeterminate: omit aria-valuenow and set aria-busy="true" on the region being loaded.',
    'Color is never the only signal: the value text or the label states warning/danger conditions.',
  ],
  related: ['spinner', 'skeleton', 'agent-presence', 'badge'],
};
