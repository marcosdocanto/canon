import type { ComponentSpec } from '../types.ts';
import { FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, ex, ICON, typeStyle } from './_shared.ts';

// Chat messaging: a thread of bubbles (incoming on the left in bg-subtle, outgoing
// on the right in the action color), each with a name + time line, optional file or
// image attachment inside the bubble, a three-dot typing indicator and a composer
// with a toolbar and a primary Send button.

const HAIRLINE = '{border.width.thin} solid {color.border-control}';

const SVG = {
  file: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5h4.5l3 3v8a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-11z"/><path d="M9 2.5v3h3"/></svg>',
  clip: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 5.5l-4.25 4.25a1.5 1.5 0 002.12 2.12L13 7.25a2.83 2.83 0 00-4-4L4.25 8a4.24 4.24 0 006 6l3.25-3.25"/></svg>',
  smile: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M5.5 9.5s.9 1.5 2.5 1.5 2.5-1.5 2.5-1.5M6 6.25v.5M10 6.25v.5"/></svg>',
  mic: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="6" y="2.5" width="4" height="7" rx="2"/><path d="M4 8a4 4 0 008 0M8 12v1.5"/></svg>',
  send: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8l11-5.5-3 11-2.5-4.5L2.5 8z"/><path d="M8 9L13.5 2.5"/></svg>',
};

/** Muted 4:3 picture so the image attachment renders without the network. */
const PICTURE = `<svg viewBox="0 0 320 240" role="img" aria-label="Photo of the new office lobby"><rect width="320" height="240" style="fill:var(--cn-color-bg-muted)"/><circle cx="236" cy="70" r="28" style="fill:var(--cn-color-bg-surface)"/><path d="M0 200L84 116l64 56 52-70 120 98v40H0z" style="fill:var(--cn-color-border-strong)"/></svg>`;

const iconBtn = (svg: string, label: string) => `<button type="button" class="cn-icon-button" data-variant="ghost" data-size="sm" data-shape="square" aria-label="${label}">${svg.replace('cn-icon', 'cn-icon-button__icon')}</button>`;
const avatar = (initials: string, name: string) => `<span class="cn-message__avatar" role="img" aria-label="${name}">${initials}</span>`;
const msg = (o: { dir: 'in' | 'out'; name: string; initials?: string; time: string; datetime: string; body: string }) =>
  `<div class="cn-message__item" data-direction="${o.dir}">${o.dir === 'in' && o.initials ? avatar(o.initials, o.name) : ''}<div class="cn-message__content"><div class="cn-message__meta"><span class="cn-message__name">${o.name}</span><time class="cn-message__time" datetime="${o.datetime}">${o.time}</time></div><div class="cn-message__bubble">${o.body}</div></div></div>`;
const fileCard = (name: string, meta: string) =>
  `<a href="#" class="cn-message__attachment"><span class="cn-message__attachment-icon" aria-hidden="true">${SVG.file}</span><span><span class="cn-message__attachment-name">${name}</span><span class="cn-message__attachment-meta">${meta}</span></span></a>`;
const typing = (initials: string, name: string) =>
  `<div class="cn-message__item" data-direction="in">${avatar(initials, name)}<div class="cn-message__content"><div class="cn-message__typing" role="status" aria-label="${name} is typing"><span class="cn-message__dot"></span><span class="cn-message__dot"></span><span class="cn-message__dot"></span></div></div></div>`;
const divider = (text: string) => `<div class="cn-message__date-divider" role="separator">${text}</div>`;

const COMPOSER = `<div class="cn-message__composer"><textarea class="cn-message__composer-input" rows="2" placeholder="Message Maya Chen…" aria-label="Message"></textarea><div class="cn-message__composer-toolbar"><div class="cn-message__composer-tools">${iconBtn(SVG.clip, 'Attach a file')}${iconBtn(SVG.smile, 'Add emoji')}${iconBtn(SVG.mic, 'Record a voice note')}</div><button type="button" class="cn-button" data-variant="primary" data-size="sm"><span class="cn-button__label">Send</span>${SVG.send.replace('cn-icon', 'cn-button__icon')}</button></div></div>`;

const thread = (variant: string, density: string, inner: string, width = '560px') =>
  `<div class="cn-message" data-variant="${variant}" data-density="${density}" role="log" aria-label="Conversation with Maya Chen" style="width:100%;max-width:${width}">${inner}</div>`;

export const message: ComponentSpec = {
  name: 'Message',
  slug: 'message',
  category: 'data-display',
  description: 'Chat messages in a thread: incoming bubbles on the left in bg-subtle, outgoing on the right in the action color, each with a name and time line, a 32px avatar, optional file or image attachments, a three-dot typing indicator, centered date chips and a composer with a toolbar and a primary Send.',
  usage: 'Use for two-way conversations in real time: support chat, a thread with a teammate, the transcript of an agent conversation. For a comment stream on a document use ActivityFeed; for a timeline of events use Timeline; for one-off notifications use Notification.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The thread (role="log"): a flex column of items and date dividers with a 16px gap. Width comes from the layout.' },
    { part: 'date-divider', element: 'div', description: 'Centered chip that separates days ("Today", "Sep 9"). role="separator".', optional: true },
    { part: 'item', element: 'div', description: 'One message: avatar + content in a row. data-direction="in" (received, left) or "out" (sent, right, mirrored).' },
    { part: 'avatar', element: 'span', description: '32px circle with initials (24px in compact), aligned to the bottom of the bubble. Only on incoming messages; role="img" + aria-label.', optional: true },
    { part: 'content', element: 'div', description: 'Column with the meta line and the bubble, aligned to the start (in) or the end (out).' },
    { part: 'meta', element: 'div', description: 'Name and time on one line above the bubble.' },
    { part: 'name', element: 'span', description: 'Sender name, label-sm ("Maya Chen", "You").' },
    { part: 'time', element: 'time', description: 'Sent time, body-xs fg-subtle, a <time datetime>.' },
    { part: 'bubble', element: 'div', description: 'The message body, max 70% of the thread width, 10/14px padding, 16/24 text, radius 8 with the corner nearest the sender squared. Holds text and optional attachments.' },
    { part: 'attachment', element: 'a', description: 'A file card (icon + name + meta) or, with data-kind="image", a picture, inside the bubble. Links to the file.', optional: true },
    { part: 'attachment-icon', element: 'span', description: '32px square with a 16px file icon.', optional: true },
    { part: 'attachment-name', element: 'span', description: 'File name, label-sm, truncated.', optional: true },
    { part: 'attachment-meta', element: 'span', description: 'Size or type under the name, body-xs, muted.', optional: true },
    { part: 'typing', element: 'div', description: 'Three animated dots in an incoming-style bubble. role="status" with "{Name} is typing".', optional: true },
    { part: 'dot', element: 'span', description: 'One 6px dot of the typing indicator; the three dots bounce in sequence.', optional: true },
    { part: 'composer', element: 'div', description: 'The reply box: hairline border, radius card, focus ring on :focus-within. Holds the textarea and the toolbar.', optional: true },
    { part: 'composer-input', element: 'textarea', description: 'Bare <textarea>, two rows, no border; grows with content in the app.', optional: true },
    { part: 'composer-toolbar', element: 'div', description: 'Bottom row of the composer: tool icon buttons on the left, the primary sm Send on the right.', optional: true },
    { part: 'composer-tools', element: 'div', description: 'The group of ghost IconButtons (attach, emoji, voice) that fills the toolbar\'s left side.', optional: true },
  ],
  props: {
    variant: {
      values: ['thread', 'composer', 'bubble'],
      default: 'thread',
      description: 'thread = the full conversation column with dividers, messages, typing and optionally a composer at the end. composer = the root holds only the reply box (a chat that lives elsewhere, a "quick reply" footer). bubble = the root holds a single message, for embedding one quoted message in another surface.',
    },
    density: {
      values: ['default', 'compact'],
      default: 'default',
      description: 'default = 32px avatars, 16/24 text, 16px between messages (full-page chat). compact = 24px avatars, 14px text, 8px between messages, for side panels and support widgets.',
    },
  },
  states: {
    incoming: { selector: ' .cn-message__item[data-direction="in"]', description: 'A received message (on the item): avatar on the left, bg-subtle bubble with the top-left corner squared. Styled in extraCss.', markup: 'data-direction="in" on .cn-message__item' },
    outgoing: { selector: ' .cn-message__item[data-direction="out"]', description: 'A sent message (on the item): mirrored to the right, action-colored bubble with the top-right corner squared, no avatar. Styled in extraCss.', markup: 'data-direction="out" on .cn-message__item' },
    composerFocus: { selector: ' .cn-message__composer:focus-within', description: 'Typing in the composer: the border turns action-colored and the 3px ring appears (extraCss).', markup: 'native :focus-within on .cn-message__composer' },
    composerDisabled: { selector: ' .cn-message__composer[data-disabled]', description: 'The conversation is closed or read-only: grey fill, muted text, textarea disabled (extraCss).', markup: 'data-disabled on .cn-message__composer plus disabled on the textarea' },
  },
  base: {
    root: { display: 'flex', 'flex-direction': 'column', gap: '{space.4}', width: '100%', 'min-width': '0', color: '{color.fg-default}' },
    'date-divider': {
      'align-self': 'center',
      display: 'inline-flex',
      'align-items': 'center',
      height: '{space.6}',
      'padding-inline': '{space.2.5}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-subtle}',
      ...typeStyle('label-xs'),
      color: '{color.fg-subtle}',
      'user-select': 'none',
    },
    item: { display: 'flex', 'align-items': 'flex-end', gap: '{space.2}', 'max-width': '100%', 'min-width': '0' },
    avatar: {
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
    content: { flex: '1 1 auto', 'min-width': '0', display: 'flex', 'flex-direction': 'column', 'align-items': 'flex-start', gap: '{space.1.5}' },
    meta: { display: 'flex', 'align-items': 'baseline', gap: '{space.2}', 'padding-inline': '{space.1}' },
    name: { ...typeStyle('label-sm'), 'line-height': '{font.lineHeight.normal}', color: '{color.fg-default}' },
    time: { ...typeStyle('body-xs'), color: '{color.fg-subtle}', 'white-space': 'nowrap' },
    bubble: {
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.2}',
      'max-width': '70%',
      padding: '{space.2.5} {space.3.5}',
      ...typeStyle('body-lg'),
      'line-height': '{font.lineHeight.normal}',
      'border-radius': '{radius.lg}',
      'background-color': '{color.bg-subtle}',
      color: '{color.fg-default}',
      'overflow-wrap': 'anywhere',
    },
    attachment: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.3}',
      'min-width': '0',
      padding: '{space.2.5} {space.3}',
      'border-radius': '{radius.md}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-default}',
      color: 'inherit',
      'text-decoration': 'none',
      ...TRANSITION_COLORS,
    },
    'attachment-icon': { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'flex-shrink': '0', width: '{space.8}', height: '{space.8}', 'border-radius': '{radius.md}', 'background-color': '{color.bg-subtle}', color: '{color.fg-muted}' },
    'attachment-name': { display: 'block', ...typeStyle('label-sm'), 'line-height': '{font.lineHeight.normal}', 'min-width': '0', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    'attachment-meta': { display: 'block', ...typeStyle('body-xs'), opacity: '{opacity.muted}' },
    typing: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.1}',
      padding: '{space.3.5} {space.3.5}',
      'border-radius': '{radius.lg}',
      'border-start-start-radius': '{radius.none}',
      'background-color': '{color.bg-subtle}',
      'align-self': 'flex-start',
    },
    dot: { width: '6px', height: '6px', 'border-radius': '{radius.full}', 'background-color': '{color.fg-subtle}', animation: 'cn-message-typing 1.2s {motion.easing.standard} infinite' },
    composer: {
      display: 'flex',
      'flex-direction': 'column',
      width: '100%',
      'min-width': '0',
      'background-color': '{color.bg-surface}',
      border: HAIRLINE,
      'border-radius': '{radius.card}',
      'box-shadow': '{shadow.xs}',
      overflow: 'hidden',
      ...TRANSITION_COLORS,
    },
    'composer-input': {
      display: 'block',
      width: '100%',
      'min-height': 'calc(2 * {font.size.md} * {font.lineHeight.normal} + 2 * {space.3})',
      margin: '0',
      padding: '{space.3} {space.3.5}',
      border: '0',
      outline: 'none',
      background: 'transparent',
      ...typeStyle('body-md'),
      color: 'inherit',
      resize: 'none',
    },
    'composer-toolbar': { display: 'flex', 'align-items': 'center', gap: '{space.2}', padding: '0 {space.2} {space.2} {space.2}' },
    'composer-tools': { display: 'flex', 'align-items': 'center', gap: '{space.0.5}', flex: '1 1 auto', 'min-width': '0' },
  },
  variants: {
    variant: {
      thread: { root: {} },
      composer: { root: { gap: '0' } },
      bubble: { root: { gap: '0' } },
    },
    density: {
      default: { root: {} },
      compact: {
        root: { gap: '{space.2}' },
        item: { gap: '{space.1.5}' },
        avatar: { width: '{space.6}', height: '{space.6}', 'font-size': '{font.size.2xs}' },
        bubble: { padding: '{space.2} {space.3}', ...typeStyle('body-md') },
        meta: { gap: '{space.1.5}' },
        typing: { padding: '{space.2.5} {space.3}' },
        'composer-input': { 'min-height': 'calc(1 * {font.size.md} * {font.lineHeight.normal} + 2 * {space.2.5})', padding: '{space.2.5} {space.3}' },
      },
    },
  },
  extraCss: `
.cn-message__item[data-direction="in"] .cn-message__bubble { border-start-start-radius: {radius.none}; }
.cn-message__item[data-direction="out"] { flex-direction: row-reverse; }
.cn-message__item[data-direction="out"] .cn-message__content { align-items: flex-end; }
.cn-message__item[data-direction="out"] .cn-message__meta { flex-direction: row-reverse; }
.cn-message__item[data-direction="out"] .cn-message__bubble { background-color: {color.bg-action}; color: {color.fg-on-action}; border-start-end-radius: {radius.none}; }
.cn-message__item[data-direction="out"] .cn-message__attachment { background-color: color-mix(in srgb, {color.fg-on-action} 12%, transparent); border-color: color-mix(in srgb, {color.fg-on-action} 24%, transparent); }
.cn-message__item[data-direction="out"] .cn-message__attachment-icon { background-color: color-mix(in srgb, {color.fg-on-action} 16%, transparent); color: inherit; }
.cn-message__attachment:hover { border-color: {color.border-control-hover}; }
.cn-message__attachment > span:last-child { min-width: 0; flex: 1 1 auto; }
.cn-message__attachment:focus-visible { outline: none; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-message__attachment-icon .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-message__attachment[data-kind="image"] { display: block; padding: 0; border: 0; overflow: hidden; border-radius: {radius.md}; max-width: 320px; }
.cn-message__attachment[data-kind="image"] > svg, .cn-message__attachment[data-kind="image"] > img { display: block; width: 100%; height: auto; }
.cn-message__dot:nth-child(2) { animation-delay: 0.2s; }
.cn-message__dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes cn-message-typing { 0%, 60%, 100% { transform: translateY(0); opacity: {opacity.disabled}; } 30% { transform: translateY(-3px); opacity: 1; } }
.cn-message__composer:focus-within { border-color: {color.border-action}; box-shadow: ${FOCUS_RING['box-shadow']}; }
.cn-message__composer-input::placeholder { color: {color.fg-placeholder}; opacity: 1; }
.cn-message__composer[data-disabled] { background-color: {color.bg-disabled}; color: {color.fg-disabled}; border-color: {color.border-disabled}; box-shadow: none; }
.cn-message__composer[data-disabled] .cn-message__composer-input { cursor: not-allowed; }`,
  examples: [
    ex('Thread with an attachment and typing', thread('thread', 'default', [
      divider('Today'),
      msg({ dir: 'in', name: 'Maya Chen', initials: 'MC', time: '09:12', datetime: '2026-09-11T09:12', body: 'Morning! Did the Q3 launch plan land in your inbox?' }),
      msg({ dir: 'out', name: 'You', time: '09:14', datetime: '2026-09-11T09:14', body: 'It did — reading it now. Two questions about the pricing page.' }),
      msg({ dir: 'in', name: 'Maya Chen', initials: 'MC', time: '09:16', datetime: '2026-09-11T09:16', body: `Here is the latest deck, the pricing slides start on page 12.${fileCard('q3-launch-plan-v4.pdf', 'PDF · 2.4 MB')}` }),
      msg({ dir: 'out', name: 'You', time: '09:20', datetime: '2026-09-11T09:20', body: 'Perfect, thanks. I will leave comments before lunch.' }),
      typing('MC', 'Maya Chen'),
    ].join('')), 'Received on the left with an avatar, sent on the right in the action color. The typing indicator is an incoming bubble with three bouncing dots.'),
    ex('Composer', thread('composer', 'default', COMPOSER), 'Attach, emoji and voice as ghost IconButtons; Send is the only primary button. Enter sends, Shift+Enter adds a line.'),
    ex('Single bubble', thread('bubble', 'default', msg({ dir: 'in', name: 'Daniel Costa', initials: 'DC', time: 'Yesterday · 17:40', datetime: '2026-09-10T17:40', body: 'Reminder: the brand review moved to Thursday at 10:00.' }), '480px'), 'One message embedded in another surface (a notification, a quoted reply).'),
    ex('Image attachment, compact density', thread('thread', 'compact', [
      msg({ dir: 'out', name: 'You', time: '12:02', datetime: '2026-09-11T12:02', body: `The lobby signage went up this morning.<a href="#" class="cn-message__attachment" data-kind="image" aria-label="Open photo">${PICTURE}</a>` }),
      msg({ dir: 'in', name: 'Sofia Almeida', initials: 'SA', time: '12:05', datetime: '2026-09-11T12:05', body: 'Looks great in daylight. Can you send the night shot too?' }),
      msg({ dir: 'out', name: 'You', time: '12:06', datetime: '2026-09-11T12:06', body: 'On it.' }),
    ].join(''), '420px'), 'compact = 24px avatars, 14px text, 8px between messages, for side panels and widgets.'),
    ex('Disabled composer', thread('composer', 'default', COMPOSER.replace('class="cn-message__composer"', 'class="cn-message__composer" data-disabled').replace('rows="2" placeholder="Message Maya Chen…"', 'rows="2" disabled placeholder="This conversation is closed"')), 'A closed conversation keeps the composer visible but disabled, with the reason as placeholder.'),
  ],
  rules: [
    'Incoming on the left with an avatar, outgoing on the right without one. Never color-code people; direction is the only distinction.',
    'Bubbles are at most 70% of the thread width and wrap text; never a fixed width, never a scrollbar inside a bubble.',
    'Every message shows the sender and a time. Group consecutive messages from the same sender within 5 minutes under one meta line.',
    'Date dividers between days only ("Today", "Yesterday", "Sep 9"); never a divider between every message.',
    'Attachments live inside the bubble: a file card for documents, a picture (max 320px wide, radius md) for images. One attachment per bubble; more than one becomes a list.',
    'The typing indicator shows for one person at a time and disappears after 5 seconds of silence; it is never shown for the current user.',
    'The composer is the only bordered surface in the thread; tools are ghost IconButtons and Send is a primary sm Button. Enter sends, Shift+Enter breaks the line.',
    'Compact density only in side panels and widgets narrower than 480px.',
    'Long threads load older messages above with a "Load earlier messages" link Button; keep the newest message and the composer in view.',
  ],
  a11y: [
    'Root is role="log" with an aria-label naming the conversation; new messages are appended so screen readers announce them politely.',
    'Each message exposes sender and time as text in DOM order before the body; the direction mirroring is CSS-only.',
    'Avatars with initials use role="img" + aria-label; sent messages have no avatar and say "You" in the name.',
    'The typing indicator is role="status" with an aria-label such as "Maya Chen is typing"; the dots are decorative.',
    'The composer textarea has an accessible name, tool buttons have aria-labels, and the Send button is a real <button>; Escape clears a draft only after a confirm.',
  ],
  related: ['activity-feed', 'avatar', 'textarea', 'icon-button', 'button', 'notification'],
};
