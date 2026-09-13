import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// status → dot fill, pill bg, pill fg
const STATUS: Record<string, { dot: string; pillBg: string; pillFg: string; label: string }> = {
  working: { dot: '{color.bg-accent}', pillBg: '{color.bg-accent-subtle}', pillFg: '{color.fg-accent}', label: 'Working' },
  waiting: { dot: '{color.bg-warning}', pillBg: '{color.bg-warning-subtle}', pillFg: '{color.fg-warning}', label: 'Waiting for you' },
  idle: { dot: '{color.fg-subtle}', pillBg: '{color.bg-subtle}', pillFg: '{color.fg-muted}', label: 'Idle' },
  offline: { dot: '{color.bg-muted}', pillBg: '{color.bg-subtle}', pillFg: '{color.fg-subtle}', label: 'Offline' },
};

const avatar = (initials?: string) => `<span class="cn-agent-presence__avatar">${initials ?? ICON.spark}<span class="cn-agent-presence__dot"></span></span>`;

export const agentPresence: ComponentSpec = {
  name: 'AgentPresence',
  slug: 'agent-presence',
  category: 'data-display',
  description: 'Shows an AI agent as a teammate: avatar with a status dot, the name, a state pill and a live line saying what it is doing right now. The accent color appears only here and only when an agent is working.',
  usage: 'Use wherever a user needs to know whether an agent is active and on what: the team rail, a conversation header, a run list, a kanban card. Not for human users (use Avatar) and not for static labels (use Badge). The activity line must be live; if there is nothing current, show the last run time instead.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The element. Chip is inline; row and card are a grid: avatar | name + state | time on the first line, activity on the second.' },
    { part: 'avatar', element: 'span', description: '24px circle (20px in sm) in the accent wash with the agent’s initials or the spark icon in fg-accent. Contains the dot.' },
    { part: 'dot', element: 'span', description: '8px status dot at the avatar’s bottom-right with a 2px surface ring. Pulses (halo) only when working.' },
    { part: 'name', element: 'span', description: 'label-sm, the agent’s name ("Vera", "Iris"). Never a role or a model name.' },
    { part: 'state', element: 'span', description: 'Kicker-style pill: "Working", "Waiting for you", "Idle", "Offline". Hidden in chip.', optional: true },
    { part: 'activity', element: 'span', description: 'body-xs muted, truncated, the live "now" line: "Reading 3 replies from Nakamura…". Hidden in chip.', optional: true },
    { part: 'time', element: 'span', description: 'code-sm subtle, how long the current state has lasted ("2m", "40m"). Hidden in chip.', optional: true },
  ],
  props: {
    variant: {
      values: ['chip', 'row', 'card'],
      default: 'row',
      description: 'chip = inline pill with avatar, name and dot only (inside text, headers, kanban cards); row = one line in a list with the state pill, activity and time (default); card = the row on a bordered surface with padding, for a team grid or a dashboard.',
    },
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 24px avatar, label-sm name (default); sm = 20px avatar, label-xs name, for dense tables and chips inside text.',
    },
    status: {
      values: ['working', 'waiting', 'idle', 'offline'],
      default: 'idle',
      description: 'working = the agent is acting right now: accent dot with a pulse and an accent pill; waiting = it needs the user (approval, a file): warning dot and pill; idle = available, nothing running: neutral; offline = paused or disconnected: muted dot and the whole element at 70% opacity.',
    },
  },
  states: {},
  base: {
    root: {
      display: 'grid',
      'grid-template-columns': 'auto auto 1fr auto',
      'grid-template-areas': '"avatar name state time" "avatar activity activity time"',
      'align-items': 'center',
      'column-gap': '{space.2}',
      'row-gap': '{space.0.5}',
      'min-width': '0',
      color: '{color.fg-default}',
      ...typeStyle('body-sm'),
    },
    avatar: {
      'grid-area': 'avatar',
      position: 'relative',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{size.icon.xl}',
      height: '{size.icon.xl}',
      'margin-inline-end': '{space.1}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-accent-subtle}',
      color: '{color.fg-accent}',
      ...typeStyle('label-xs'),
      'font-size': '{font.size.2xs}',
      'text-transform': 'uppercase',
      'letter-spacing': '{font.letterSpacing.wide}',
    },
    dot: {
      position: 'absolute',
      right: '-1px',
      bottom: '-1px',
      width: '8px',
      height: '8px',
      'border-radius': '{radius.full}',
      'background-color': '{color.fg-subtle}',
      'box-shadow': '0 0 0 2px {color.bg-surface}',
    },
    name: { 'grid-area': 'name', ...typeStyle('label-sm'), color: '{color.fg-default}', 'white-space': 'nowrap' },
    state: {
      'grid-area': 'state',
      'justify-self': 'start',
      display: 'inline-flex',
      'align-items': 'center',
      height: '{size.icon.lg}',
      'padding-inline': '{space.2}',
      'border-radius': '{radius.full}',
      ...typeStyle('kicker'),
      'text-transform': 'uppercase',
      'background-color': '{color.bg-subtle}',
      color: '{color.fg-muted}',
      'white-space': 'nowrap',
    },
    activity: { 'grid-area': 'activity', ...typeStyle('body-xs'), color: '{color.fg-muted}', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    time: { 'grid-area': 'time', 'align-self': 'start', ...typeStyle('code-sm'), color: '{color.fg-subtle}', 'white-space': 'nowrap', 'padding-top': '{space.0.5}' },
  },
  variants: {
    variant: {
      chip: {
        root: { display: 'inline-flex', 'align-items': 'center', gap: '{space.1.5}', height: '{size.control.xs}', 'padding-inline': '{space.1} {space.2.5}', 'border-radius': '{radius.full}', border: '{border.width.thin} solid {color.border-default}', 'background-color': '{color.bg-surface}', 'vertical-align': 'middle' },
        avatar: { width: '{size.icon.lg}', height: '{size.icon.lg}', 'margin-inline-end': '0' },
        dot: { width: '6px', height: '6px' },
        state: { display: 'none' },
        activity: { display: 'none' },
        time: { display: 'none' },
      },
      row: { root: { padding: '{space.2} 0' } },
      card: { root: { padding: '{space.4}', 'background-color': '{color.bg-surface}', border: '{border.width.thin} solid {color.border-default}', 'border-radius': '{radius.xl}' } },
    },
    size: {
      sm: { avatar: { width: '{size.icon.lg}', height: '{size.icon.lg}' }, name: { ...typeStyle('label-xs') }, state: { height: '{size.icon.md}', 'font-size': '9px' } },
      md: { root: {} },
    },
    status: Object.fromEntries(Object.entries(STATUS).map(([s, v]) => [s, {
      dot: { 'background-color': v.dot, ...(s === 'working' ? { animation: 'cn-agent-presence-pulse 1.8s {motion.easing.standard} infinite' } : {}) },
      state: { 'background-color': v.pillBg, color: v.pillFg },
      ...(s === 'offline' ? { root: { opacity: '{opacity.muted}' } } : {}),
    }])),
  },
  extraCss: `
@keyframes cn-agent-presence-pulse { 0% { box-shadow: 0 0 0 2px {color.bg-surface}, 0 0 0 2px color-mix(in srgb, {color.bg-accent} 45%, transparent); } 100% { box-shadow: 0 0 0 2px {color.bg-surface}, 0 0 0 8px transparent; } }
.cn-agent-presence .cn-agent-presence__avatar .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; }
.cn-agent-presence[data-variant="chip"] .cn-agent-presence__avatar .cn-icon { width: {size.icon.xs}; height: {size.icon.xs}; }`,
  examples: [
    ex('Row, working', `<div class="cn-agent-presence" data-variant="row" data-size="md" data-status="working" style="width:420px">${avatar()}<span class="cn-agent-presence__name">Vera</span><span class="cn-agent-presence__state">Working</span><span class="cn-agent-presence__activity">Reading 3 replies from Nakamura Trading Co.…</span><span class="cn-agent-presence__time">2m</span></div>`),
    ex('Row, waiting for you', `<div class="cn-agent-presence" data-variant="row" data-size="md" data-status="waiting" style="width:420px">${avatar('IR')}<span class="cn-agent-presence__name">Iris</span><span class="cn-agent-presence__state">Waiting for you</span><span class="cn-agent-presence__activity">2 drafts ready for approval · Hoffmann GmbH, Lagos Fresh</span><span class="cn-agent-presence__time">14m</span></div>`),
    ex('Row, idle', `<div class="cn-agent-presence" data-variant="row" data-size="md" data-status="idle" style="width:420px">${avatar('TH')}<span class="cn-agent-presence__name">Theo</span><span class="cn-agent-presence__state">Idle</span><span class="cn-agent-presence__activity">Last run 40 min ago · verified 38 companies</span><span class="cn-agent-presence__time">40m</span></div>`),
    ex('Row, offline', `<div class="cn-agent-presence" data-variant="row" data-size="md" data-status="offline" style="width:420px">${avatar('KA')}<span class="cn-agent-presence__name">Kai</span><span class="cn-agent-presence__state">Offline</span><span class="cn-agent-presence__activity">Paused until Monday 08:00</span><span class="cn-agent-presence__time">2d</span></div>`),
    ex('Chips', `<span class="cn-agent-presence" data-variant="chip" data-size="md" data-status="working">${avatar()}<span class="cn-agent-presence__name">Vera</span></span> <span class="cn-agent-presence" data-variant="chip" data-size="md" data-status="waiting">${avatar('IR')}<span class="cn-agent-presence__name">Iris</span></span> <span class="cn-agent-presence" data-variant="chip" data-size="sm" data-status="idle">${avatar('TH')}<span class="cn-agent-presence__name">Theo</span></span>`, 'Chips carry only avatar, dot and name. Use them inline: “Assigned to [Vera]”.'),
    ex('Card, working, sm', `<div class="cn-agent-presence" data-variant="card" data-size="sm" data-status="working" style="width:320px">${avatar()}<span class="cn-agent-presence__name">Vera</span><span class="cn-agent-presence__state">Working</span><span class="cn-agent-presence__activity">Drafting a reply to Marisco del Sur in Spanish…</span><span class="cn-agent-presence__time">45s</span></div>`),
  ],
  recipes: [
    ex('Team rail', `<div style="display:flex;flex-direction:column;width:420px;border:1px solid var(--cn-color-border-default);border-radius:var(--cn-radius-xl);background:var(--cn-color-bg-surface);padding:var(--cn-space-2) var(--cn-space-4)"><div class="cn-agent-presence" data-variant="row" data-size="md" data-status="working">${avatar()}<span class="cn-agent-presence__name">Vera</span><span class="cn-agent-presence__state">Working</span><span class="cn-agent-presence__activity">Searching importers in South Korea…</span><span class="cn-agent-presence__time">6m</span></div><div class="cn-agent-presence" data-variant="row" data-size="md" data-status="waiting">${avatar('IR')}<span class="cn-agent-presence__name">Iris</span><span class="cn-agent-presence__state">Waiting for you</span><span class="cn-agent-presence__activity">Needs the price list for Hoffmann GmbH</span><span class="cn-agent-presence__time">1h</span></div><div class="cn-agent-presence" data-variant="row" data-size="md" data-status="idle">${avatar('TH')}<span class="cn-agent-presence__name">Theo</span><span class="cn-agent-presence__state">Idle</span><span class="cn-agent-presence__activity">Last run today 07:00</span><span class="cn-agent-presence__time">3h</span></div></div>`, 'Rows stack with no divider; waiting agents sort above working ones because they need the user.'),
  ],
  rules: [
    'Orchid/accent means "an agent is working". This is the only place accent is used as a status; never use it for human users or for success.',
    'The activity line is live and concrete: verb + object + count ("Reading 3 replies from Nakamura…"). It updates in place without re-rendering the row.',
    'When nothing is happening, the activity line shows the last run ("Last run 40 min ago · verified 38 companies"), never "Nothing to do".',
    'Agents have a name and a task, not a personality: no "I", no emoji, no "thinking…", no model names.',
    'State pill text is fixed: Working / Waiting for you / Idle / Offline. Do not invent states; put details in the activity line.',
    'waiting sorts above working in any list: it is the one status that needs the user.',
    'Chips carry no activity; if the reader needs to know what the agent is doing, use a row.',
    'The pulse is the only motion: 1.8s halo on the dot while working, off under prefers-reduced-motion.',
  ],
  a11y: [
    'The status is text (the pill) and never only the dot color; chips keep the status in an aria-label on the root ("Vera, working").',
    'The activity line is a polite live region (aria-live="polite" on the list, not on each row) so screen readers hear changes without interruption.',
    'Time is relative and short ("2m"); pair it with a title attribute carrying the absolute time.',
    'Initials in the avatar are aria-hidden when the name is visible next to them.',
  ],
  related: ['avatar', 'badge', 'progress', 'card'],
};
