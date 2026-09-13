import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, ex, ICON, typeStyle } from './_shared.ts';

// the reference breadcrumbs: 14px medium gray-600 links, the current page one step darker,
// 16px gray-300 chevrons (or a "/" divider), an optional 20px home icon; three trail types:
// text (20px), text with a hairline under it (36px) and button chips (28px, gray-50 when current).

const TRANSITION_FAST = {
  'transition-property': 'background-color, color, box-shadow',
  'transition-duration': '{motion.duration.fast}',
  'transition-timing-function': '{motion.easing.linear}',
};
const HAIRLINE = '{border.width.thin} solid {color.border-default}';

const chevron = ICON.chevronRight.replace('cn-icon', 'cn-breadcrumb__separator');
const SLASH = '<span class="cn-breadcrumb__separator" aria-hidden="true">/</span>';
const HOME = ICON.home.replace('cn-icon', 'cn-breadcrumb__icon');
const li = (inner: string) => `<li class="cn-breadcrumb__item">${inner}</li>`;
const lnk = (label: string, icon = '') => `<a href="#" class="cn-breadcrumb__link"${icon ? ` aria-label="${label}"` : ''}>${icon || label}</a>`;
const cur = (label: string) => `<span class="cn-breadcrumb__current" aria-current="page">${label}</span>`;
const crumbs = (variant: string, divider: string, size: string, parts: string[], extra = '') =>
  `<nav class="cn-breadcrumb" data-variant="${variant}" data-divider="${divider}" data-size="${size}" aria-label="Breadcrumb"${extra}><ol class="cn-breadcrumb__list">${parts.map((p, i) => li((i ? (divider === 'slash' ? SLASH : chevron) : '') + p)).join('')}</ol></nav>`;

export const breadcrumb: ComponentSpec = {
  name: 'Breadcrumb',
  slug: 'breadcrumb',
  category: 'navigation',
  description: 'The path to the current page in the reference\'s three trail types: 14px medium links separated by 16px gray-300 chevrons (or slashes), ending in the current page one step darker; plain text (20px), text on a hairline (36px) or 28px button chips. Sits above the page title.',
  usage: 'Use on pages three or more levels deep (Settings → Team → Roles) so the user can go up one level with one click. Not for top-level pages, not for wizard progress (Stepper), never inside the Topbar.',
  anatomy: [
    { part: 'root', element: 'nav', description: 'The landmark: <nav aria-label="Breadcrumb">, 14px medium, fg-muted.' },
    { part: 'list', element: 'ol', description: 'Ordered list of levels, root first. Flex row, 8px gaps, wraps on narrow screens.' },
    { part: 'item', element: 'li', description: 'One level: an optional separator followed by a link, the ellipsis button, or the current page.' },
    { part: 'link', element: 'a', description: 'An ancestor page, fg-muted; ink on hover (gray-50 chip in the button type). Truncates at 24 characters.' },
    { part: 'icon', element: 'svg', description: 'Optional 20px home icon as the first link (with aria-label="Home"), fg-subtle.', optional: true },
    { part: 'separator', element: 'svg', description: '16px gray-300 chevron (or a "/" span) before every item except the first. aria-hidden.' },
    { part: 'ellipsis', element: 'button', description: 'The "…" that stands in for collapsed middle levels; opens a Menu listing them.', optional: true },
    { part: 'current', element: 'span', description: 'The page the user is on: one step darker than the links, medium, aria-current="page". Not a link.' },
  ],
  props: {
    variant: {
      values: ['text', 'line', 'button'],
      default: 'text',
      description: 'text = plain 20px trail (page headers, the default). line = the trail sits on a full-width gray-200 hairline, 36px tall (above a page title without its own divider). button = each level is a 28px chip (radius 6, padding 4 × 8); the current one is filled gray-50 (record headers, drawers).',
    },
    divider: {
      values: ['chevron', 'slash'],
      default: 'chevron',
      description: 'chevron = 16px gray-300 chevron-right (default). slash = a "/" in gray-300 (denser, developer-facing paths).',
    },
    size: {
      values: ['sm', 'md'],
      default: 'md',
      description: 'md = 14px medium (text-sm); the page-header default. sm = 12px medium for drawers, dialogs and card headers.',
    },
  },
  states: {
    hover: { selector: ' .cn-breadcrumb__link:hover', description: 'Pointer over an ancestor link (on the LINK, not the root): ink text; in the button type also a gray-50 chip.', markup: 'native :hover on the link' },
    focus: { selector: ' .cn-breadcrumb__link:focus-visible, & .cn-breadcrumb__ellipsis:focus-visible', description: 'Keyboard focus on a link or the ellipsis: the 4px brand ring.', markup: 'native :focus-visible' },
    current: { selector: ' [aria-current="page"]', description: 'The last item: one step darker, medium, no hover, not a link (button type: gray-50 chip).', markup: 'aria-current="page" on the current span' },
  },
  base: {
    root: {
      display: 'flex',
      'align-items': 'center',
      'min-width': '0',
      ...typeStyle('label-sm'),
      color: '{color.fg-muted}',
    },
    list: {
      display: 'flex',
      'align-items': 'center',
      'flex-wrap': 'wrap',
      gap: '{space.2}',
      'min-width': '0',
      margin: '0',
      padding: '0',
      'list-style': 'none',
    },
    item: { display: 'inline-flex', 'align-items': 'center', gap: '{space.2}', 'min-width': '0' },
    link: {
      display: 'inline-flex',
      'align-items': 'center',
      color: '{color.fg-muted}',
      'text-decoration': 'none',
      'border-radius': '{radius.sm}',
      'white-space': 'nowrap',
      'max-width': '24ch',
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
      ...TRANSITION_FAST,
    },
    icon: { width: '{size.icon.md}', height: '{size.icon.md}', 'flex-shrink': '0', color: '{color.fg-subtle}', transition: 'inherit' },
    separator: { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', width: '{size.icon.sm}', height: '{size.icon.sm}', 'flex-shrink': '0', color: '{color.border-control}', 'user-select': 'none' },
    ellipsis: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      height: '{space.5}',
      'padding-inline': '{space.1}',
      'border-radius': '{radius.sm}',
      color: '{color.fg-subtle}',
      'letter-spacing': '{font.letterSpacing.wide}',
      ...TRANSITION_FAST,
    },
    current: {
      display: 'inline-flex',
      'align-items': 'center',
      color: '{color.fg-default}',
      'white-space': 'nowrap',
      'min-width': '0',
      'max-width': '32ch',
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
    },
  },
  variants: {
    variant: {
      text: { root: {} },
      line: { root: { width: '100%', 'padding-block': '{space.2} calc({space.2} - {border.width.thin})', 'border-bottom': HAIRLINE } },
      button: {
        list: { gap: '{space.1}' },
        item: { gap: '{space.1}' },
        link: { height: '{space.7}', padding: '{space.1} {space.2}', 'border-radius': '{radius.md}' },
        current: { height: '{space.7}', padding: '{space.1} {space.2}', 'border-radius': '{radius.md}', 'background-color': '{color.bg-subtle}' },
        ellipsis: { height: '{space.7}', padding: '{space.1} {space.2}', 'border-radius': '{radius.md}' },
      },
    },
    divider: { chevron: { root: {} }, slash: { separator: { ...typeStyle('label-sm'), width: 'auto', 'padding-inline': '{space.0.5}' } } },
    size: {
      sm: {
        root: { 'font-size': '{font.size.xs}' },
        list: { gap: '{space.1.5}' },
        item: { gap: '{space.1.5}' },
        icon: { width: '{size.icon.sm}', height: '{size.icon.sm}' },
      },
      md: { root: {} },
    },
  },
  extraCss: `
.cn-breadcrumb__link:hover { color: {color.fg-default}; }
.cn-breadcrumb__link:hover .cn-breadcrumb__icon { color: {color.fg-muted}; }
.cn-breadcrumb[data-variant="button"] .cn-breadcrumb__link:hover, .cn-breadcrumb__ellipsis:hover { color: {color.fg-default}; background-color: {color.bg-subtle}; }
.cn-breadcrumb__link:focus-visible, .cn-breadcrumb__ellipsis:focus-visible { outline: none; box-shadow: {shadow.focus}; }`,
  examples: [
    ex('Text (default)', crumbs('text', 'chevron', 'md', [lnk('Settings'), lnk('Team'), cur('Roles and permissions')]), 'Ancestors gray-600, the current page one step darker; 16px gray-300 chevrons.'),
    ex('With home icon', crumbs('text', 'chevron', 'md', [lnk('Home', HOME), lnk('Projects'), lnk('Lumen website'), cur('Design')]), 'A 20px home icon replaces the first label (aria-label="Home").'),
    ex('Slash divider', crumbs('text', 'slash', 'md', [lnk('Home', HOME), lnk('Projects'), cur('Lumen website')]), 'data-divider="slash" for denser, path-like trails.'),
    ex('Text with line', `<div style="width:100%;max-width:560px">${crumbs('line', 'chevron', 'md', [lnk('Home', HOME), lnk('Customers'), cur('Sofia Almeida')])}</div>`, '36px tall on a full-width hairline; use above a title that has no divider of its own.'),
    ex('Button chips', crumbs('button', 'chevron', 'md', [lnk('Home', HOME), lnk('Invoices'), cur('INV-0042')]), '28px chips, radius 6; the current page is a gray-50 chip and hovered ancestors light up.'),
    ex('Collapsed middle', crumbs('text', 'chevron', 'md', [lnk('Home', HOME), `<button type="button" class="cn-breadcrumb__ellipsis" aria-label="Show 2 hidden levels" aria-haspopup="menu" aria-expanded="false">…</button>`, lnk('Q3 launch'), cur('Design review')]), 'Deeper than four levels: keep root, the parent and the current page; the ellipsis opens a Menu with the rest.'),
    ex('Small, inside a drawer header', crumbs('text', 'chevron', 'sm', [lnk('Settings'), lnk('Team'), cur('Roles and permissions')])),
    ex('Long names truncate', crumbs('text', 'chevron', 'md', [lnk('Home', HOME), lnk('Enterprise procurement pipeline for the northern region'), cur('Annual supply agreement 2026 with Daniel Costa\'s team')]), 'Links cut at 24ch, the current page at 32ch; the full text goes in a title attribute.'),
  ],
  rules: [
    'Max 4 visible levels. Deeper paths collapse the middle into an ellipsis that opens a Menu of the hidden levels.',
    'Labels are the exact page titles of the ancestors (same text as their h1), not shortened synonyms.',
    'The last item is the current page: darker, not a link, aria-current="page". Never end with a separator.',
    'Never show a one-level breadcrumb ("Home" alone). Below three levels, skip the breadcrumb entirely.',
    'Place it in the page header directly above the title, 8px apart. Never in the Topbar and never at the bottom of the page.',
    'Separators are the 16px gray-300 chevron, or the slash for path-like trails; never arrows, dots or both in one app.',
    'text in page headers; line when the header has no divider of its own; button in record headers and drawers where the trail is also a filter.',
    'sm only inside drawers, dialogs and card headers; md everywhere else.',
    'Truncate long names with an ellipsis and provide the full name in a title; never wrap a single label across lines.',
  ],
  a11y: [
    'Root is <nav aria-label="Breadcrumb"> containing an <ol>; order conveys hierarchy.',
    'The current page has aria-current="page" and is not a link (or is a link only if it reloads the same page).',
    'Separators are aria-hidden="true"; the chevron or slash is decoration, the list order is the semantics.',
    'A home icon link carries aria-label="Home"; the icon itself is aria-hidden.',
    'The ellipsis is a <button aria-label="Show N hidden levels" aria-haspopup="menu" aria-expanded>, not plain text.',
    'Truncated labels keep their full text in a title attribute and in the accessible name.',
  ],
  related: ['link', 'menu', 'page-header', 'topbar', 'sidebar-nav'],
};
