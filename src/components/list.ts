import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// list rows in the reference's table rhythm: 16 × 24px padding (12 × 20 compact), 14px medium ink
// titles over 14px muted descriptions, gray-200 hairlines, gray-50 hover and current rows, and the
// card frame (radius 12, ring, shadow-xs) when the list stands alone.

const HAIRLINE = '{border.width.thin} solid {color.border-default}';
const ring = (color: string) => `inset 0 0 0 1px ${color}`;
const TRUNCATE = { overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' };
const SILHOUETTE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";

const person = (name: string, status = 'none') =>
  `<span class="cn-avatar" data-size="md" data-shape="circle" data-tone="neutral" data-status="${status}" aria-hidden="true"><img class="cn-avatar__image" src="${SILHOUETTE}" alt="">${status !== 'none' ? '<span class="cn-avatar__status"></span>' : ''}</span>`;
const company = (t: string, name: string) =>
  `<span class="cn-avatar" data-size="md" data-shape="square" data-tone="neutral" data-status="none" role="img" aria-label="${name}"><span class="cn-avatar__fallback" aria-hidden="true">${t}</span></span>`;
const badge = (text: string, tone: string, dot = false) =>
  `<span class="cn-badge" data-tone="${tone}" data-variant="soft" data-size="sm">${dot ? '<span class="cn-badge__dot"></span>' : ''}${text}</span>`;

const item = (leading: string, title: string, description: string, trailing: string, extra = '') =>
  `<li class="cn-list__item"${extra}><span class="cn-list__leading">${leading}</span><span class="cn-list__content"><span class="cn-list__title">${title}</span><span class="cn-list__description">${description}</span></span><span class="cn-list__trailing">${trailing}</span></li>`;

const link = (title: string, description: string, trailing: string, extra = '') =>
  `<a href="#" class="cn-list__item"${extra}><span class="cn-list__content"><span class="cn-list__title">${title}</span>${description ? `<span class="cn-list__description">${description}</span>` : ''}</span><span class="cn-list__trailing">${trailing}</span>${ICON.chevronRight.replace('cn-icon', 'cn-list__chevron')}</a>`;

const TEAM = `${item(person('Maya Chen', 'online'), 'Maya Chen', 'maya@lumen.co · Product Manager', badge('Admin', 'accent'))}${item(person('Daniel Costa', 'online'), 'Daniel Costa', 'daniel@lumen.co · Engineering', badge('Editor', 'neutral'))}${item(person('Sofia Almeida', 'offline'), 'Sofia Almeida', 'sofia@lumen.co · Design', badge('Editor', 'neutral'))}${item(person('Lucas Ferreira'), 'Lucas Ferreira', 'lucas@lumen.co · Frontend', badge('Invited', 'warning', true))}`;

export const list: ComponentSpec = {
  name: 'List',
  slug: 'list',
  category: 'data-display',
  description: 'Stacked rows with a leading slot (avatar, icon, checkbox), a 14px medium ink title with an optional muted description, and a trailing slot (badge, meta, chevron). Gray-200 hairlines between rows, gray-50 hover and current rows; the same rhythm as a table row. Rows can be links or buttons.',
  usage: 'Collections where each item is one thing with a name and a little context: team members, conversations, settings entries, files, integrations. When people compare several columns of values, use Table. For key/value pairs use DescriptionList.',
  anatomy: [
    { part: 'root', element: 'ul', description: 'Column of items. <ul> with <li> items for static lists, <nav>/<div> with <a>/<button> items for interactive lists. Items are direct children.' },
    { part: 'item', element: 'li', description: 'One row: flex, centered, 16 × 24px padding (12 × 20 compact), min height 72px with an avatar (56 compact). Also an <a> or <button> when the whole row is one action.' },
    { part: 'leading', element: 'span', description: 'Optional slot before the content: Avatar md (sm at compact), a 20px icon or a Checkbox. Does not shrink.', optional: true },
    { part: 'content', element: 'span', description: 'Flexible middle: title over description, both truncating.' },
    { part: 'title', element: 'span', description: '14px medium in ink, one line, truncates with an ellipsis.' },
    { part: 'description', element: 'span', description: '14px fg-muted under the title, one line, truncates.', optional: true },
    { part: 'trailing', element: 'span', description: 'Optional slot after the content: Badge sm, Counter, a timestamp, a Switch or a sm ghost Button. Does not shrink.', optional: true },
    { part: 'chevron', element: 'svg', description: '20px chevron-right in fg-subtle for items that navigate. Last child of link items.', optional: true },
  ],
  props: {
    density: {
      values: ['compact', 'default'],
      default: 'default',
      description: 'default = 72px min rows with 16 × 24px padding (two-line items with a 40px avatar); compact = 56px min rows with 12 × 20px padding (single-line items, settings, sm avatars).',
    },
    variant: {
      values: ['plain', 'card'],
      default: 'plain',
      description: 'plain = no frame, for lists inside a Card (padding none) or a drawer; card = the list draws its own frame (radius 12, gray-200 ring, shadow-xs) on a surface, for standalone lists on the canvas.',
    },
  },
  states: {
    hover: { selector: ' > a:hover, & > button:hover', description: 'On an interactive item (an <a> or <button> row), not the root: gray-50 fill.', markup: 'make the item an <a href> or <button>; native :hover' },
    focus: { selector: ' > a:focus-visible, & > button:focus-visible', description: 'On an interactive item: inset 2px brand ring so it stays inside the frame.', markup: 'native :focus-visible on the item' },
    current: { selector: ' > [aria-current="true"], & > [data-selected]', description: 'On an item: gray-50 fill for the current or selected row (the reference highlights like hover); the title stays ink.', markup: 'aria-current="true" (navigation) or data-selected (selection) on the item' },
    disabled: { selector: ' > [aria-disabled="true"], & > button:disabled', description: 'On an item: 50% opacity, no pointer events.', markup: 'aria-disabled="true" on the item, or disabled on a button item' },
  },
  base: {
    root: { display: 'flex', 'flex-direction': 'column', 'min-width': '0', color: '{color.fg-default}' },
    item: {
      display: 'flex',
      'align-items': 'center',
      gap: '{space.3}',
      width: '100%',
      'min-width': '0',
      'min-height': 'calc({space.16} + {space.2})',
      padding: '{space.4} {space.6}',
      color: '{color.fg-default}',
      'text-align': 'left',
      'transition-property': 'background-color',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.linear}',
    },
    leading: { display: 'flex', 'align-items': 'center', 'flex-shrink': '0', color: '{color.fg-subtle}' },
    content: { display: 'flex', 'flex-direction': 'column', 'min-width': '0', flex: '1 1 auto' },
    title: { ...typeStyle('label-sm'), color: '{color.fg-default}', ...TRUNCATE },
    description: { ...typeStyle('body-md'), color: '{color.fg-muted}', ...TRUNCATE },
    trailing: { display: 'flex', 'align-items': 'center', gap: '{space.2}', 'flex-shrink': '0', ...typeStyle('body-md'), color: '{color.fg-muted}' },
    chevron: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', color: '{color.fg-subtle}' },
  },
  variants: {
    density: {
      compact: { item: { 'min-height': '{space.14}', padding: '{space.3} {space.5}', gap: '{space.3}' } },
      default: { item: { 'min-height': 'calc({space.16} + {space.2})', padding: '{space.4} {space.6}' } },
    },
    variant: {
      plain: { root: {} },
      card: { root: { 'background-color': '{color.bg-surface}', 'box-shadow': `${ring('{color.border-default}')}, {shadow.xs}`, 'border-radius': '{radius.card}', overflow: 'hidden' } },
    },
  },
  extraCss: `
.cn-list > .cn-list__item + .cn-list__item { border-top: ${HAIRLINE}; }
button.cn-list__item { appearance: none; border: 0; margin: 0; background: none; font: inherit; }
a.cn-list__item, button.cn-list__item { cursor: pointer; }
a.cn-list__item:hover, button.cn-list__item:hover { background-color: {color.bg-subtle}; }
a.cn-list__item:focus-visible, button.cn-list__item:focus-visible { outline: none; box-shadow: inset 0 0 0 2px {brand.500}; }
.cn-list > .cn-list__item[aria-current="true"], .cn-list > .cn-list__item[data-selected] { background-color: {color.bg-subtle}; }
.cn-list > .cn-list__item[aria-disabled="true"], .cn-list > button.cn-list__item:disabled { opacity: {opacity.disabled}; pointer-events: none; }
a.cn-list__item:hover .cn-list__chevron { color: {color.fg-muted}; }
.cn-list__leading > .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }`,
  examples: [
    ex('Team members with avatars and roles', `<ul class="cn-list" data-density="default" data-variant="card" style="width:100%;max-width:560px">${TEAM}</ul>`, '72px rows: Avatar md leading, ink medium name over the muted email, Badge sm trailing.'),
    ex('Link items with chevron (compact)', `<nav class="cn-list" data-density="compact" data-variant="card" aria-label="Workspace settings" style="width:100%;max-width:560px">${link('General', '', 'Lumen · Lisbon', ' aria-current="true"')}${link('Members', '', badge('6', 'neutral'))}${link('Billing', '', 'Business plan')}${link('Integrations', '', badge('2 connected', 'success', true))}</nav>`, 'Whole row is the link; the current page is gray-50. Single-line 56px rows.'),
    ex('Inside a Card with a header', `<section class="cn-card" data-variant="default" data-padding="none" style="width:100%;max-width:560px"><header class="cn-card-header" data-variant="default" data-size="md"><div class="cn-card-header__content"><h2 class="cn-card-header__title">Integrations</h2><p class="cn-card-header__description">Connect the tools your team already uses.</p></div></header><ul class="cn-list" data-density="default" data-variant="plain">${item(company('SL', 'Slack'), 'Slack', 'Notifications in #lumen-product', badge('Connected', 'success', true))}${item(company('GH', 'GitHub'), 'GitHub', 'Link pull requests to tasks', badge('Connected', 'success', true))}${item(company('FG', 'Figma'), 'Figma', 'Embed designs in projects', `<button type="button" class="cn-button" data-variant="outline" data-size="sm"><span class="cn-button__label">Connect</span></button>`)}</ul></section>`, 'plain variant: the Card supplies the frame and the CardHeader names the list.'),
    ex('Selected and disabled items', `<ul class="cn-list" data-density="default" data-variant="card" style="width:100%;max-width:560px">${item(person('Aisha Khan', 'online'), 'Aisha Khan', 'aisha@lumen.co · Backend', badge('Owner', 'accent'), ' data-selected')}${item(person('Noah Berg'), 'Noah Berg', 'noah@lumen.co · Product design', '<span>2h ago</span>')}${item(person('Elena Rossi'), 'Elena Rossi', 'elena@lumen.co · Deactivated', badge('Deactivated', 'neutral'), ' aria-disabled="true"')}</ul>`),
    ex('Button items (pick one)', `<div class="cn-list" data-density="compact" data-variant="card" role="listbox" aria-label="Choose a sender" style="width:100%;max-width:420px"><button type="button" class="cn-list__item" role="option" aria-selected="true" data-selected><span class="cn-list__content"><span class="cn-list__title">hello@lumen.co</span><span class="cn-list__description">Default · verified domain</span></span><span class="cn-list__trailing">${ICON.check}</span></button><button type="button" class="cn-list__item" role="option" aria-selected="false"><span class="cn-list__content"><span class="cn-list__title">maya@lumen.co</span><span class="cn-list__description">Personal</span></span></button></div>`),
  ],
  rules: [
    'Every item has a title (14px medium ink); the description is optional, 14px muted and never longer than one line. Longer text belongs in the record, not the list.',
    'One leading slot and one trailing slot per item at most. Leading = identity (Avatar md, a 20px icon, a Checkbox); trailing = state or meta (Badge sm, Counter, timestamp, Switch, one sm Button).',
    'If the whole row is one action, the item is an <a> (navigate) or <button> (act) and shows the chevron only when it navigates to a page. Do not put buttons inside link rows.',
    'Rows never change height on hover; hover, current and selected are the same gray-50 fill.',
    'Use variant="card" only when the list stands alone on the canvas; inside a Card (padding none) or a drawer use plain so the Card supplies the frame.',
    'compact (56px, sm avatars) for single-line items and settings; default (72px, md avatars) when items have two lines. One density per list.',
    'Order by what the user is looking for (recency, priority), not alphabetically by default.',
    'Long lists paginate or virtualize after ~50 items; do not stack hundreds of rows.',
  ],
  a11y: [
    'Static lists are <ul>/<li>; navigation lists are <nav> with <a href> items; pick-one lists use role="listbox" with role="option" and aria-selected on button items.',
    'aria-current="true" (or "page") marks the current navigation item; data-selected alone is only visual.',
    'Interactive rows are one focus stop each with the inset ring; the title text is the accessible name, so it must be meaningful on its own.',
    'Avatars in rows are decorative (aria-hidden or alt="") because the title names the person; presence must be in text when it matters.',
    'Truncated titles keep the full text in the DOM (ellipsis is CSS); add a title attribute only when the truncation hides essential information.',
  ],
  related: ['table', 'description-list', 'avatar', 'badge', 'card', 'card-header', 'sidebar-nav', 'empty-state'],
};
