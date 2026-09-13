import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// Content divider: the richer sibling of Divider. A hairline that carries
// something in the middle (or at the start): body-sm text, an outline button, a
// 24px icon or a pill chip. Used between sections of long content, in threads
// ("Earlier this week"), on auth forms ("Or continue with") and as a load-more.

const btn = (label: string, leading = '') => `<button type="button" class="cn-button" data-variant="outline" data-size="sm">${leading}<span class="cn-button__label">${label}</span></button>`;
const LINE = '<span class="cn-content-divider__line" aria-hidden="true"></span>';
const para = (text: string) => `<p class="cn-text-body-sm" style="color:var(--cn-color-fg-muted);margin:0">${text}</p>`;

const divider = (variant: string, spacing: string, inner: string, attrs = '') =>
  `<div class="cn-content-divider" data-variant="${variant}" data-spacing="${spacing}"${attrs}>${inner}</div>`;
const wrap = (inner: string) => `<div style="width:100%;max-width:560px">${inner}</div>`;

export const contentDivider: ComponentSpec = {
  name: 'ContentDivider',
  slug: 'content-divider',
  category: 'layout',
  description: 'A hairline that carries content: body-sm text centered or at the start, an outline sm Button, a 24px icon, or a pill chip in the middle of the line. The richer sibling of Divider for long content, threads, auth forms and load-more rows.',
  usage: 'Use where a plain rule is not enough: "Or continue with" on sign-in, "Earlier this week" in a feed, "Show 12 more comments" in a thread, "3 new messages" in a chat. For a plain rule or a kicker-voice label use Divider; for a section heading use SectionHeader.',
  anatomy: [
    { part: 'root', element: 'div', description: 'Flex row, centered, 16px gaps; role="separator" when it only carries text, no role when it holds a button.' },
    { part: 'line', element: 'span', description: 'The 1px border-default rule that fills the free space (flex 1). aria-hidden. One on each side, or one after the label in text-left.' },
    { part: 'label', element: 'span', description: 'body-sm muted text on the line ("Or continue with", "Earlier this week").', optional: true },
    { part: 'button', element: 'div', description: 'Wrapper for an outline sm Button in the middle ("Show 12 more comments").', optional: true },
    { part: 'icon', element: 'span', description: '24px icon in fg-subtle on the line, for a purely visual break.', optional: true },
    { part: 'pill', element: 'span', description: 'label-sm chip in bg-surface with a hairline, radius full, 28px tall ("3 new messages").', optional: true },
  ],
  props: {
    variant: {
      values: ['plain', 'text', 'text-left', 'button', 'icon', 'pill'],
      default: 'text',
      description: 'plain = the line only (same as Divider, kept here for consistency inside content that mixes variants). text = centered body-sm label between two lines. text-left = the label at the start followed by one line (group headings in feeds). button = an outline sm Button between two lines (load more, show earlier). icon = a 24px icon between two lines (a decorative break in an article). pill = a chip between two lines (unread markers, "new since your last visit").',
    },
    spacing: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Vertical margin: sm 16px inside cards and threads, md 24px between blocks of content, lg 40px between sections of an article.',
    },
  },
  states: {},
  base: {
    root: { display: 'flex', 'align-items': 'center', gap: '{space.4}', width: '100%', 'min-width': '0', color: '{color.fg-subtle}' },
    line: { flex: '1 1 auto', 'min-width': '{space.4}', height: '{border.width.thin}', 'background-color': '{color.border-default}' },
    label: { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'white-space': 'nowrap', 'text-align': 'center' },
    button: { display: 'inline-flex', 'flex-shrink': '0' },
    icon: { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'flex-shrink': '0', width: '{size.icon.xl}', height: '{size.icon.xl}', color: '{color.fg-subtle}' },
    pill: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '{space.1.5}',
      'flex-shrink': '0',
      height: '{space.7}',
      'padding-inline': '{space.3}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-default}',
      'box-shadow': '{shadow.xs}',
      ...typeStyle('label-sm'),
      color: '{color.fg-muted}',
      'white-space': 'nowrap',
    },
  },
  variants: {
    variant: {
      plain: { root: {} },
      text: { root: {} },
      'text-left': { label: { 'text-align': 'start' } },
      button: { root: {} },
      icon: { root: {} },
      pill: { root: {} },
    },
    spacing: {
      sm: { root: { 'margin-block': '{space.4}' } },
      md: { root: { 'margin-block': '{space.6}' } },
      lg: { root: { 'margin-block': '{space.10}' } },
    },
  },
  extraCss: `
.cn-content-divider__icon .cn-icon { width: 100%; height: 100%; }
.cn-content-divider__pill .cn-icon { width: {size.icon.xs}; height: {size.icon.xs}; }
.cn-content-divider[data-variant="text-left"] .cn-content-divider__line:first-child { display: none; }`,
  examples: [
    ex('Plain', wrap(`${para('Maya approved the launch plan and asked for a final read of the pricing page.')}${divider('plain', 'md', LINE, ' role="separator"')}${para('Daniel uploaded the updated timeline.')}`)),
    ex('Text (centered)', wrap(`<button type="button" class="cn-button" data-variant="primary" data-size="md" style="width:100%"><span class="cn-button__label">Sign in</span></button>${divider('text', 'md', `${LINE}<span class="cn-content-divider__label">Or continue with</span>${LINE}`, ' role="separator"')}<div style="display:flex;gap:var(--cn-space-3)">${btn('Google').replace('data-size="sm"', 'data-size="md" style="flex:1"')}${btn('Microsoft').replace('data-size="sm"', 'data-size="md" style="flex:1"')}</div>`), 'The auth-form separator.'),
    ex('Text at the start', wrap(`${divider('text-left', 'sm', `<span class="cn-content-divider__label">Earlier this week</span>${LINE}`, ' role="separator"')}${para('Sofia assigned the homepage redesign to Lucas · Tuesday')}`), 'Group headings in feeds and inboxes; the line starts after the label.'),
    ex('Button (load more)', wrap(`${para('Aisha: I set up the A/B test for Monday.')}${divider('button', 'md', `${LINE}<div class="cn-content-divider__button">${btn('Show 12 more comments', ICON.chevronDown.replace('cn-icon', 'cn-button__icon'))}</div>${LINE}`)}${para('Maya: The second headline reads better.')}`), 'The button is the only interactive thing on the line; no role on the root.'),
    ex('Icon', wrap(`${para('That was the last release of the quarter, and the first one where every workspace shipped on the same day.')}${divider('icon', 'lg', `${LINE}<span class="cn-content-divider__icon" aria-hidden="true">${ICON.spark}</span>${LINE}`, ' role="separator"')}${para('What comes next starts with the reporting workspace.')}`), 'A quiet break inside an article; lg spacing.'),
    ex('Pill', wrap(`${para('Tomás: Sending the revised quote now.')}${divider('pill', 'sm', `${LINE}<span class="cn-content-divider__pill">3 new messages</span>${LINE}`, ' role="separator"')}${para('Elena: Got it, reviewing with finance.')}`), 'Unread marker in a chat: the chip names what is below the line.'),
  ],
  rules: [
    'A content divider separates two things that are both present and adds one piece of information about the break; if there is nothing to say, use Divider.',
    'Text labels are 2–4 words in sentence case, body-sm muted: a time ("Earlier this week"), an alternative ("Or continue with"), a count ("3 new messages"). Never a heading.',
    'One element in the middle at most: text, a button, an icon or a pill. Never a button and text together.',
    'The button variant is for revealing more of the same content ("Show 12 more comments", "Load earlier messages"); it is an outline sm Button and the count is in its label.',
    'Pills mark a boundary the user must notice (unread, new since last visit) and disappear once the content below is seen.',
    'Icons are decorative breaks in long-form reading; one per article at most, always aria-hidden.',
    'Spacing is a prop: sm in cards and threads, md between blocks, lg between article sections. Never add margins around it.',
    'Do not put content dividers between List, Table or Timeline rows; those components draw their own rules.',
  ],
  a11y: [
    'When the divider only carries text or an icon, the root is role="separator" and the lines are aria-hidden; the label is read as the separator\'s name.',
    'When it carries a Button, the root has no role: the button is a normal control in the tab order and the lines stay aria-hidden.',
    'Labels must be meaningful on their own ("Earlier this week" is fine; a lone dash is not).',
    'A pill that marks unread content also updates an aria-live region or the page title so the count is announced.',
  ],
  related: ['divider', 'button', 'section-header', 'activity-feed', 'message', 'badge'],
};
