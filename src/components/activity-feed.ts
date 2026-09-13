import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Activity feed: a column of "who did what to which object, when" rows joined by a
// 2px connector under 32px avatars, with optional quoted comments, file attachments
// and a comment composer at the end. The compact density is the notification-feed
// version (24px avatars, one line per event).

const HAIRLINE = '{border.width.thin} solid {color.border-default}';

const FILE = '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5h4.5l3 3v8a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-11z"/><path d="M9 2.5v3h3"/></svg>';

const avatar = (initials: string, name: string) => `<span class="cn-activity-feed__avatar" role="img" aria-label="${name}">${initials}</span>`;
const comment = (text: string) => `<div class="cn-activity-feed__comment">${text}</div>`;
const attachment = (name: string, size: string) =>
  `<a href="#" class="cn-activity-feed__attachment"><span class="cn-activity-feed__attachment-icon" aria-hidden="true">${FILE}</span><span class="cn-activity-feed__attachment-name">${name}</span><span class="cn-activity-feed__attachment-size">${size}</span></a>`;

const item = (o: { initials: string; actor: string; action: string; target?: string; time: string; datetime: string; extra?: string }) =>
  `<article class="cn-activity-feed__item">${avatar(o.initials, o.actor)}<span class="cn-activity-feed__line" aria-hidden="true"></span><div class="cn-activity-feed__content"><div class="cn-activity-feed__header"><span class="cn-activity-feed__actor">${o.actor}</span><span class="cn-activity-feed__action">${o.action}</span>${o.target ? `<span class="cn-activity-feed__target">${o.target}</span>` : ''}<time class="cn-activity-feed__time" datetime="${o.datetime}">${o.time}</time></div>${o.extra ?? ''}</div></article>`;

const composer = `<div class="cn-activity-feed__composer">${avatar('LF', 'Lucas Ferreira')}<div class="cn-activity-feed__content"><div class="cn-textarea" data-size="sm" data-resize="none"><textarea class="cn-textarea__field" rows="2" placeholder="Leave a comment…" aria-label="Comment"></textarea></div><div class="cn-activity-feed__composer-actions"><button type="button" class="cn-button" data-variant="primary" data-size="sm"><span class="cn-button__label">Comment</span></button></div></div></div>`;

const feed = (variant: string, inner: string, width = '560px') =>
  `<div class="cn-activity-feed" data-variant="${variant}" role="feed" aria-label="Activity" aria-busy="false" style="width:100%;max-width:${width}">${inner}</div>`;

export const activityFeed: ComponentSpec = {
  name: 'ActivityFeed',
  slug: 'activity-feed',
  category: 'data-display',
  description: 'A vertical feed of events on one object or workspace: a 32px avatar, "actor did action to target" in one line with a subtle timestamp, joined by a 2px connector. Events can carry a quoted comment, a file attachment, and the feed can end with a comment composer.',
  usage: 'Use on a record page (a deal, a project, a document) or a workspace home to show what people and agents did, newest first or oldest first per screen. For a process with known steps use Timeline; for chat use Message; for system notifications a person can act on use Notification.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The feed column (role="feed"). Flex column; width comes from the layout.' },
    { part: 'item', element: 'article', description: 'One event: avatar on the left, content on the right, relative so the connector can hang under the avatar. 12px vertical padding.' },
    { part: 'avatar', element: 'span', description: '32px circle with initials (24px in compact). role="img" + aria-label with the actor name, or a real Avatar image.' },
    { part: 'line', element: 'span', description: 'The 2px connector from this avatar to the next one, border-default. aria-hidden; hidden automatically on the last item.' },
    { part: 'content', element: 'div', description: 'Column next to the avatar: header line first, then optional comment, attachment or composer fields.' },
    { part: 'header', element: 'div', description: 'The one-line sentence: actor, action, target, time. Wraps on narrow widths.' },
    { part: 'actor', element: 'span', description: 'Who did it, label-sm semibold in fg-default ("Maya Chen").' },
    { part: 'action', element: 'span', description: 'The verb phrase in body-sm muted ("commented on", "uploaded").' },
    { part: 'target', element: 'span', description: 'The object acted on, label-sm in fg-default ("Q3 launch plan"). Optional when the action is self-contained.', optional: true },
    { part: 'time', element: 'time', description: 'When, body-xs in fg-subtle, after the sentence. Always a <time datetime>.' },
    { part: 'comment', element: 'div', description: 'Quoted comment text in a bg-subtle card (radius lg, 12px padding, body-sm).', optional: true },
    { part: 'attachment', element: 'a', description: 'A file row: icon, name and size in a hairline card. A link to the file.', optional: true },
    { part: 'attachment-icon', element: 'span', description: '32px bg-subtle square holding a 16px file icon.', optional: true },
    { part: 'attachment-name', element: 'span', description: 'File name, label-sm, truncated.', optional: true },
    { part: 'attachment-size', element: 'span', description: 'Size or type, body-xs fg-subtle ("2.4 MB").', optional: true },
    { part: 'composer', element: 'div', description: 'The comment box at the end of the feed: the current user\'s avatar next to a Textarea and a Comment button.', optional: true },
    { part: 'composer-actions', element: 'div', description: 'Right-aligned row under the textarea holding the primary sm "Comment" button.', optional: true },
  ],
  props: {
    variant: {
      values: ['simple', 'with-comments', 'compact', 'with-composer'],
      default: 'simple',
      description: 'simple = one sentence per event with a 32px avatar (record pages). with-comments = the same rows plus quoted comment cards and file attachments (discussion on a document). compact = 24px avatars, tighter rows, for a notification-style feed in a side panel or popover. with-composer = the feed ends with a Textarea + Comment button so people can reply in place.',
    },
  },
  states: {
    busy: { selector: '[aria-busy="true"]', description: 'The feed is loading more events: content dims slightly. Set while fetching, clear when done.', markup: 'aria-busy="true" on the root' },
    attachmentHover: { selector: ' .cn-activity-feed__attachment:hover', description: 'Pointer over a file row (lives on the attachment, styled in extraCss): subtle fill and a stronger border.', markup: 'native :hover on .cn-activity-feed__attachment' },
    attachmentFocus: { selector: ' .cn-activity-feed__attachment:focus-visible', description: 'Keyboard focus on a file row shows the focus ring (extraCss).', markup: 'native :focus-visible on .cn-activity-feed__attachment' },
  },
  base: {
    root: { display: 'flex', 'flex-direction': 'column', width: '100%', 'min-width': '0', color: '{color.fg-default}' },
    item: { position: 'relative', display: 'flex', 'align-items': 'flex-start', gap: '{space.3}', 'padding-block': '{space.3}', 'min-width': '0' },
    avatar: {
      position: 'relative',
      'z-index': '{z.raised}',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      width: '{space.8}',
      height: '{space.8}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-subtle}',
      color: '{color.fg-muted}',
      ...typeStyle('label-xs'),
      'letter-spacing': '{font.letterSpacing.wide}',
      'text-transform': 'uppercase',
      'user-select': 'none',
      overflow: 'hidden',
    },
    line: {
      position: 'absolute',
      'inset-inline-start': 'calc({space.4} - {space.px})',
      top: 'calc({space.3} + {space.8} + {space.1})',
      bottom: 'calc(-1 * {space.2})',
      width: '{border.width.medium}',
      'border-radius': '{radius.full}',
      'background-color': '{color.border-default}',
    },
    content: { flex: '1 1 auto', 'min-width': '0', display: 'flex', 'flex-direction': 'column', gap: '{space.2}', 'padding-top': '{space.1.5}' },
    header: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'baseline', 'column-gap': '{space.1}', 'row-gap': '0', ...typeStyle('body-sm'), color: '{color.fg-muted}' },
    actor: { ...typeStyle('label-sm'), 'font-weight': '{font.weight.semibold}', 'line-height': '{font.lineHeight.normal}', color: '{color.fg-default}' },
    action: { color: '{color.fg-muted}' },
    target: { ...typeStyle('label-sm'), 'line-height': '{font.lineHeight.normal}', color: '{color.fg-default}' },
    time: { ...typeStyle('body-xs'), color: '{color.fg-subtle}', 'margin-inline-start': '{space.1}', 'white-space': 'nowrap' },
    comment: { 'background-color': '{color.bg-subtle}', 'border-radius': '{radius.lg}', padding: '{space.3}', ...typeStyle('body-sm'), color: '{color.fg-default}', 'overflow-wrap': 'anywhere' },
    attachment: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.3}',
      'align-self': 'flex-start',
      'max-width': '100%',
      padding: '{space.2.5} {space.3}',
      'background-color': '{color.bg-surface}',
      border: HAIRLINE,
      'border-radius': '{radius.lg}',
      color: '{color.fg-default}',
      'text-decoration': 'none',
      ...TRANSITION_COLORS,
    },
    'attachment-icon': { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'flex-shrink': '0', width: '{space.8}', height: '{space.8}', 'border-radius': '{radius.md}', 'background-color': '{color.bg-subtle}', color: '{color.fg-muted}' },
    'attachment-name': { ...typeStyle('label-sm'), 'line-height': '{font.lineHeight.normal}', color: '{color.fg-default}', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    'attachment-size': { ...typeStyle('body-xs'), color: '{color.fg-subtle}', 'white-space': 'nowrap' },
    composer: { display: 'flex', 'align-items': 'flex-start', gap: '{space.3}', 'padding-block': '{space.3}', 'min-width': '0' },
    'composer-actions': { display: 'flex', 'justify-content': 'flex-end', 'align-items': 'center', gap: '{space.2}', 'margin-top': '{space.2}' },
    '@states': {
      busy: { content: { opacity: '{opacity.muted}' } },
    },
  },
  variants: {
    variant: {
      simple: { root: {} },
      'with-comments': { root: {} },
      compact: {
        item: { gap: '{space.2}', 'padding-block': '{space.2}' },
        avatar: { width: '{space.6}', height: '{space.6}', 'font-size': '{font.size.2xs}' },
        line: { 'inset-inline-start': 'calc({space.3} - {space.px})', top: 'calc({space.2} + {space.6} + {space.1})' },
        content: { 'padding-top': '{space.0.5}', gap: '{space.1.5}' },
        comment: { padding: '{space.2} {space.2.5}' },
      },
      'with-composer': { root: {} },
    },
  },
  extraCss: `
.cn-activity-feed__item:last-child .cn-activity-feed__line { display: none; }
.cn-activity-feed__composer > .cn-activity-feed__content { padding-top: 0; }
.cn-activity-feed__attachment-icon .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-activity-feed__attachment:hover { background-color: {color.bg-subtle}; border-color: {color.border-control-hover}; }
.cn-activity-feed__attachment:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-activity-feed__comment p + p { margin-top: {space.2}; }`,
  examples: [
    ex('Simple', feed('simple', [
      item({ initials: 'MC', actor: 'Maya Chen', action: 'commented on', target: 'Q3 launch plan', time: '2h ago', datetime: '2026-09-11T07:40' }),
      item({ initials: 'DC', actor: 'Daniel Costa', action: 'uploaded', target: 'brand-guidelines-v3.pdf', time: '4h ago', datetime: '2026-09-11T05:12' }),
      item({ initials: 'SA', actor: 'Sofia Almeida', action: 'assigned', target: 'Homepage redesign to Lucas Ferreira', time: 'Yesterday', datetime: '2026-09-10T16:05' }),
      item({ initials: 'AK', actor: 'Aisha Khan', action: 'marked', target: 'Invoice INV-3066 as paid', time: 'Sep 9', datetime: '2026-09-09T11:30' }),
    ].join('')), 'One sentence per event. The actor and the target are emphasized; the verb and the time are quiet.'),
    ex('With comments and an attachment', feed('with-comments', [
      item({ initials: 'MC', actor: 'Maya Chen', action: 'commented on', target: 'Q3 launch plan', time: '2h ago', datetime: '2026-09-11T07:40', extra: comment('Can we move the pricing page to the second sprint? Legal still needs to review the new tiers.') }),
      item({ initials: 'DC', actor: 'Daniel Costa', action: 'replied', time: '1h ago', datetime: '2026-09-11T08:32', extra: comment('Works for me. I attached the updated timeline.') + attachment('q3-launch-timeline.xlsx', '312 KB') }),
      item({ initials: 'NB', actor: 'Noah Berg', action: 'approved', target: 'Q3 launch plan', time: '20m ago', datetime: '2026-09-11T09:20' }),
    ].join('')), 'Quoted comments sit in a subtle card; files are hairline rows that open the file.'),
    ex('Compact (notification feed)', feed('compact', [
      item({ initials: 'EL', actor: 'Elena Rossi', action: 'mentioned you in', target: 'Brand refresh', time: '5m', datetime: '2026-09-11T09:35' }),
      item({ initials: 'TS', actor: 'Tomás Silva', action: 'requested access to', target: 'Finance dashboard', time: '32m', datetime: '2026-09-11T09:08' }),
      item({ initials: 'AK', actor: 'Aisha Khan', action: 'closed', target: 'Ticket #4821', time: '1h', datetime: '2026-09-11T08:40' }),
      item({ initials: 'SA', actor: 'Sofia Almeida', action: 'shared', target: 'Onboarding checklist', time: '3h', datetime: '2026-09-11T06:40' }),
      item({ initials: 'LF', actor: 'Lucas Ferreira', action: 'joined', target: 'Lumen Design', time: 'Yesterday', datetime: '2026-09-10T14:00' }),
    ].join(''), '420px'), '24px avatars and 8px vertical padding for side panels and popovers.'),
    ex('With composer', feed('with-composer', [
      item({ initials: 'MC', actor: 'Maya Chen', action: 'commented on', target: 'Pricing page copy', time: '1h ago', datetime: '2026-09-11T08:40', extra: comment('The second headline reads better. Can we A/B test both?') }),
      item({ initials: 'AK', actor: 'Aisha Khan', action: 'replied', time: '40m ago', datetime: '2026-09-11T09:00', extra: comment('Yes — I set up the test for Monday.') }),
      composer,
    ].join('')), 'The composer reuses the item layout so the connector runs into the current user\'s avatar.'),
  ],
  rules: [
    'Every row is one sentence in the same shape: actor, verb, target, time. Actor and target are emphasized; the verb and the time stay quiet.',
    'Verbs are past tense and specific ("uploaded", "approved", "mentioned you in"); never "updated the record".',
    'Pick one order per screen: newest first for a home feed, oldest first on a record where the story matters.',
    'Timestamps are relative under 24h ("2h ago"), absolute after ("Sep 9"), always in a <time datetime>.',
    'Comments are quoted verbatim in the subtle card and truncated after four lines with a "Show more" link Button; the feed never renders an entire email.',
    'Attachments show name and size; the icon is the file type, not a thumbnail. One attachment row per file.',
    'Use compact only in side panels, popovers and notification drawers; on a page the default size keeps comments readable.',
    'The composer goes last, after the newest event, and uses a sm Textarea with a single primary "Comment" button; no toolbar.',
    'Long feeds paginate with a "Show 20 earlier events" link Button at the end, not infinite scroll inside a card.',
  ],
  a11y: [
    'Root has role="feed" with an aria-label; each event is an <article> so screen readers can jump between them. Set aria-busy="true" on the root while loading more.',
    'Initials avatars carry role="img" and aria-label with the full name; the connector line is aria-hidden.',
    'The sentence must read correctly in DOM order: actor, action, target, time. Do not move the time before the actor with CSS.',
    'Attachments are real links with the file name as the accessible name; the size is extra text, not the only label.',
    'The composer textarea has a label ("Comment") and the button is a real <button>; Cmd/Ctrl+Enter may submit but is never the only way.',
  ],
  related: ['timeline', 'avatar', 'textarea', 'message', 'notification', 'list'],
};
