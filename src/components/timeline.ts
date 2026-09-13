import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

// the reference activity feed: events down a 2px gray-200 line, an 8px dot (or a 32px avatar)
// per event, a 14px semibold ink title, a 12px gray-500 time and 14px gray-600 detail; the
// current event pulses in brand, completed events are green, failures red.

const RING = '0 0 0 1.5px {color.bg-surface}';
const SILHOUETTE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";

const event = (time: string, title: string, description: string, extra = '', avatar = '') =>
  `<li class="cn-timeline__item"${extra}>${avatar ? `<span class="cn-timeline__avatar cn-avatar" data-size="sm" data-shape="circle" data-tone="neutral" data-status="none" aria-hidden="true"><img class="cn-avatar__image" src="${SILHOUETTE}" alt=""></span>` : '<span class="cn-timeline__marker" aria-hidden="true"></span>'}<span class="cn-timeline__line" aria-hidden="true"></span><time class="cn-timeline__time" datetime="2026-09-11">${time}</time><span class="cn-timeline__title">${title}</span>${description ? `<span class="cn-timeline__description">${description}</span>` : ''}</li>`;

const RELEASE = [
  event('Sep 8 · 09:12', 'Release branch created', 'v2.4.0 cut from main by Daniel Costa.', ' data-state="complete"'),
  event('Sep 8 · 09:40', '12 pull requests merged', '8 features, 4 fixes.', ' data-state="complete"'),
  event('Sep 9 · 14:05', 'Staging deploy approved', 'Sofia Almeida signed off on the design review.', ' data-state="complete"'),
  event('Sep 11 · 08:31', 'Production rollout in progress', '25% of workspaces migrated; no errors so far.', ' data-state="current"'),
].join('');

export const timeline: ComponentSpec = {
  name: 'Timeline',
  slug: 'timeline',
  category: 'data-display',
  description: 'Events in order down a thin vertical line: an 8px dot (or a 32px avatar) per event, a 12px timestamp, a 14px semibold title and a muted note. The current event pulses in brand; completed events are green; failures are red.',
  usage: 'Activity of one thing over time: a release, a conversation, an order, a support ticket. For a multi-step process the user walks through use Stepper; for a list of records use List.',
  anatomy: [
    { part: 'root', element: 'ol', description: 'Ordered list of events, oldest first (or newest first for activity feeds; be consistent per screen).' },
    { part: 'item', element: 'li', description: 'One event. Relative, left padding for the marker. data-state="complete|current" and data-tone="danger" color the marker.' },
    { part: 'marker', element: 'span', description: '8px dot on the line with a 1.5px surface ring. Gray-300 by default; green when complete, brand (pulsing) when current, red for failures.' },
    { part: 'avatar', element: 'span', description: 'Optional 32px Avatar in place of the dot (an Avatar root that also carries this class) for activity by a person; the line runs behind it.', optional: true },
    { part: 'line', element: 'span', description: '2px gray-200 rule from this marker to the next. Hidden on the last item.' },
    { part: 'time', element: 'time', description: 'When it happened, 12px medium fg-subtle. Use a <time datetime>. Relative ("2h ago") or absolute, consistent per screen.' },
    { part: 'title', element: 'span', description: 'What happened, 14px semibold in ink, past tense ("Staging deploy approved").' },
    { part: 'description', element: 'span', description: 'Optional one or two lines of detail, 14px fg-muted.', optional: true },
  ],
  props: {
    size: { values: ['sm', 'md'], default: 'md', description: 'md = 14px titles with 20px between events (detail pages, drawers); sm = 12px titles and time, tighter spacing (side panels, cards).' },
    variant: {
      values: ['default', 'compact'],
      default: 'default',
      description: 'default = time above the title, each event a small block; compact = time inline after the title on one line, description under it, for dense activity feeds.',
    },
  },
  states: {
    complete: { selector: ' > [data-state="complete"]', description: 'On an item, not the root: the marker is green.', markup: 'data-state="complete" on the item' },
    current: { selector: ' > [data-state="current"]', description: 'On an item: brand marker with a soft pulsing halo; the title is semibold brand.', markup: 'data-state="current" on the item (at most one per timeline)' },
    danger: { selector: ' > [data-tone="danger"]', description: 'On an item: red marker and title for a failure (bounce, rejection, error).', markup: 'data-tone="danger" on the item' },
  },
  base: {
    root: { display: 'flex', 'flex-direction': 'column', position: 'relative', margin: '0', padding: '0', 'list-style': 'none', 'min-width': '0', color: '{color.fg-default}' },
    item: {
      position: 'relative',
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.0.5}',
      'padding-inline-start': '{space.6}',
      'padding-bottom': '{space.5}',
      'min-width': '0',
    },
    marker: {
      position: 'absolute',
      left: '0',
      top: '{space.1.5}',
      width: '{space.2}',
      height: '{space.2}',
      'border-radius': '{radius.full}',
      'background-color': '{color.border-control}',
      'box-shadow': RING,
      'z-index': '{z.raised}',
    },
    avatar: { position: 'absolute', left: 'calc({space.4} * -1 + {space.1})', top: '0', 'z-index': '{z.raised}', 'box-shadow': RING },
    line: {
      position: 'absolute',
      left: '3px',
      top: '{space.4}',
      bottom: 'calc({space.1} * -1)',
      width: '{border.width.medium}',
      'border-radius': '{radius.full}',
      'background-color': '{color.border-default}',
    },
    time: { ...typeStyle('label-xs'), color: '{color.fg-subtle}', 'white-space': 'nowrap', 'font-variant-numeric': 'tabular-nums' },
    title: { ...typeStyle('label-md'), color: '{color.fg-default}' },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}' },
  },
  variants: {
    size: {
      sm: { item: { 'padding-bottom': '{space.4}', 'padding-inline-start': '{space.5}' }, title: { ...typeStyle('label-sm') }, description: { ...typeStyle('body-sm') }, marker: { top: '{space.1}' } },
      md: { item: { 'padding-bottom': '{space.5}' } },
    },
    variant: {
      default: { item: {} },
      compact: {
        item: { 'flex-direction': 'row', 'flex-wrap': 'wrap', 'align-items': 'baseline', 'column-gap': '{space.2}', 'row-gap': '{space.0.5}', 'padding-bottom': '{space.3}' },
        time: { order: '1' },
        description: { 'flex-basis': '100%', order: '2' },
      },
    },
  },
  compound: [
    { when: { size: 'sm', variant: 'compact' }, block: { item: { 'padding-bottom': '{space.2}' } } },
  ],
  extraCss: `
.cn-timeline__item:last-child .cn-timeline__line { display: none; }
.cn-timeline__item:has(> .cn-timeline__avatar) { padding-inline-start: {space.11}; }
.cn-timeline__item:has(> .cn-timeline__avatar) > .cn-timeline__avatar { left: 0; }
.cn-timeline__item:has(> .cn-timeline__avatar) > .cn-timeline__line { left: calc({space.4} - {border.width.thin}); top: {space.10}; }
.cn-timeline__item[data-state="complete"] .cn-timeline__marker { background-color: {color.bg-success}; }
.cn-timeline__item[data-state="current"] .cn-timeline__marker { background-color: {color.bg-action}; animation: cn-timeline-pulse 2s {motion.easing.standard} infinite; }
.cn-timeline__item[data-state="current"] .cn-timeline__title { color: {color.fg-action}; }
.cn-timeline__item[data-tone="danger"] .cn-timeline__marker { background-color: {color.bg-danger}; animation: none; }
.cn-timeline__item[data-tone="danger"] .cn-timeline__title { color: {color.fg-danger}; }
@keyframes cn-timeline-pulse {
  0% { box-shadow: ${RING}, 0 0 0 {border.width.medium} {color.bg-action-subtle}; }
  70% { box-shadow: ${RING}, 0 0 0 {space.2} transparent; }
  100% { box-shadow: ${RING}, 0 0 0 {space.2} transparent; }
}`,
  examples: [
    ex('Release activity, current event last', `<ol class="cn-timeline" data-size="md" data-variant="default" style="max-width:480px">${RELEASE}</ol>`, 'Three completed events (green dots), one current (brand, pulsing). 12px time over a 14px semibold title.'),
    ex('Compact feed with a failure', `<ol class="cn-timeline" data-size="md" data-variant="compact" style="max-width:480px">${event('08:31', 'Rollout resumed', '25% of workspaces migrated.', ' data-state="complete"')}${event('08:02', 'Rollout paused', 'Error rate above 1% in eu-west-1; Aisha Khan is investigating.', ' data-tone="danger"')}${event('Yesterday', 'Staging deploy approved by Sofia Almeida', '', ' data-state="complete"')}${event('Sep 9', '12 pull requests merged', '', ' data-state="complete"')}</ol>`, 'Time inline after the title; danger tone on the failure.'),
    ex('With avatars (activity by people)', `<ol class="cn-timeline" data-size="md" data-variant="default" style="max-width:480px">${event('2h ago', 'Maya Chen changed the due date', 'From Sep 12 to Sep 19.', '', 'MC')}${event('Yesterday', 'Daniel Costa commented', '“Ready for review once the API is deployed.”', '', 'DC')}${event('Sep 8', 'Sofia Almeida attached 2 files', 'Brand guidelines.pdf, Q3 roadmap.xlsx', '', 'SA')}</ol>`, 'A 32px Avatar replaces the dot; the 2px line runs between avatars.'),
    ex('Small, in a side panel', `<ol class="cn-timeline" data-size="sm" data-variant="default" style="max-width:320px">${event('Sep 11', 'Production rollout in progress', '25% of workspaces migrated.', ' data-state="current"')}${event('Sep 9', 'Staging deploy approved', '', ' data-state="complete"')}${event('Sep 8', 'Release branch created', '', ' data-state="complete"')}</ol>`, 'Newest first is fine for feeds; be consistent per screen.'),
  ],
  rules: [
    'Titles are short past-tense facts ("Staging deploy approved", "12 pull requests merged"), sentence case, no trailing period.',
    'Timestamps use a <time datetime> element in 12px medium; pick relative or absolute per screen and keep it consistent across all events.',
    'At most one data-state="current" per timeline; it is the only pulsing element on the page.',
    'Marker colors mean state: gray = happened, green = completed step, brand = happening now, red = failed. Never other colors.',
    'Use the avatar marker when the event is something a person did; the dot when it is something the system did. One marker style per timeline.',
    'Descriptions are one or two lines of detail; anything longer (a message body) links to the record.',
    'Keep one direction per screen: oldest first for a process, newest first for an activity feed.',
    'Do not put buttons or badges inside events; the timeline reports, the surface acts. A link inside the description is fine.',
    'Long timelines collapse older events behind a "Show 12 earlier events" link Button; do not render hundreds of events.',
  ],
  a11y: [
    'Use <ol> and <li> so the order and count are announced; the marker, avatar and line are aria-hidden decoration.',
    'State must be in the text, not only in the marker color: the title or description says "failed", "approved", "in progress".',
    'The pulse animation stops under prefers-reduced-motion (handled by the base stylesheet); the current item still stands out by color and weight.',
    '<time datetime> carries the machine-readable date so relative labels ("2h ago") remain meaningful.',
  ],
  related: ['stepper', 'list', 'badge', 'avatar', 'card'],
};
