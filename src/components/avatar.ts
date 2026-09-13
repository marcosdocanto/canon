import type { ComponentSpec } from '../types.ts';
import { ex, ICON, typeStyle } from './_shared.ts';

// the reference avatar: xxs 16 · xs 24 · sm 32 · md 40 · lg 48 · xl 56 · 2xl 64, semibold initials
// (12 → 24px) on gray-100, a 0.5px inner contrast ring, a status dot (6 → 16px) with a 1.5px
// surface ring, a blue verified tick (10 → 20px), a company-logo badge, a square (radius 6)
// shape for companies, and the avatar label group (name + email) next to it.

const SIZE: Record<string, { box: string; font: string; icon: string; dot: string; tick: string; badge: string }> = {
  xxs: { box: '{space.4}', font: '{font.size.2xs}', icon: '{size.icon.xs}', dot: '{space.1}', tick: '{space.2}', badge: '{space.2}' },
  xs: { box: '{space.6}', font: '{font.size.xs}', icon: '{size.icon.sm}', dot: '{space.1.5}', tick: '{space.2.5}', badge: '{space.2}' },
  sm: { box: '{space.8}', font: '{font.size.sm}', icon: '{size.icon.md}', dot: '{space.2}', tick: '{space.3}', badge: '{space.3}' },
  md: { box: '{space.10}', font: '{font.size.md}', icon: '{size.icon.lg}', dot: '{space.2.5}', tick: '{space.3.5}', badge: '{space.3.5}' },
  lg: { box: '{space.12}', font: '{font.size.lg}', icon: '{size.icon.xl}', dot: '{space.3}', tick: '{space.4}', badge: '{space.4}' },
  xl: { box: '{space.14}', font: '{font.size.xl}', icon: '{size.icon.2xl}', dot: '{space.3.5}', tick: '18px', badge: '18px' },
  '2xl': { box: '{space.16}', font: '{font.size.2xl}', icon: '{size.icon.2xl}', dot: '{space.4}', tick: '{space.5}', badge: '{space.5}' },
};

const TONE: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: '{color.bg-muted}', fg: '{color.fg-subtle}' },
  accent: { bg: '{color.bg-accent-subtle}', fg: '{color.fg-accent}' },
  info: { bg: '{color.bg-info-subtle}', fg: '{color.fg-info}' },
  success: { bg: '{color.bg-success-subtle}', fg: '{color.fg-success}' },
  warning: { bg: '{color.bg-warning-subtle}', fg: '{color.fg-warning}' },
};

const STATUS: Record<string, string> = {
  online: '{green.500}',
  away: '{amber.500}',
  busy: '{red.500}',
  offline: '{color.border-control}',
};

/** 0.5px inner contrast ring and the 1.5px surface ring around dots and badges. */
const CONTRAST = 'inset 0 0 0 0.5px color-mix(in srgb, {black} 16%, transparent)';
const SURFACE_RING = '0 0 0 1.5px {color.bg-surface}';

/** Neutral silhouette so the gallery renders an image without the network. */
const SILHOUETTE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23CDCED1'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23FAFAFA'/%3E%3Cpath d='M10 64c2-13 11-21 22-21s20 8 22 21z' fill='%23FAFAFA'/%3E%3C/svg%3E";
const LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='16' fill='%23B4309F'/%3E%3Cpath d='M9 22V10h3.4l3.6 7.2L19.6 10H23v12h-3v-7l-3 6h-1l-3-6v7z' fill='%23fff'/%3E%3C/svg%3E";
const VERIFIED = `<svg class="cn-avatar__verified" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0l1.9 1.6 2.4-.5.9 2.3 2.3.9-.5 2.4L16 8l-1.6 1.9.5 2.4-2.3.9-.9 2.3-2.4-.5L8 16l-1.9-1.6-2.4.5-.9-2.3-2.3-.9.5-2.4L0 8l1.6-1.9-.5-2.4 2.3-.9.9-2.3 2.4.5z"/><path d="M4.8 8.3l2.1 2.1 4.3-4.4" fill="none" stroke="var(--cn-color-fg-on-action)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BUILDING = '<svg class="cn-avatar__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13.5V3.5a1 1 0 011-1h5a1 1 0 011 1v10M10 6.5h2a1 1 0 011 1v6M1.5 13.5h13M5.5 5h2M5.5 7.5h2M5.5 10h2"/></svg>';

const av = (size: string, inner: string, name: string, shape = 'circle', tone = 'neutral', status = 'none', extra = '') =>
  `<span class="cn-avatar" data-size="${size}" data-shape="${shape}" data-tone="${tone}" data-status="${status}" role="img" aria-label="${name}"${extra}>${inner}${status !== 'none' ? '<span class="cn-avatar__status"></span>' : ''}</span>`;
const initials = (size: string, text: string, name: string, extra = '') => av(size, `<span class="cn-avatar__fallback" aria-hidden="true">${text}</span>`, name, 'circle', 'neutral', 'none', extra);
const photo = (size: string, name: string, status = 'none', extra = '') => `<span class="cn-avatar" data-size="${size}" data-shape="circle" data-tone="neutral" data-status="${status}"${extra}><img class="cn-avatar__image" src="${SILHOUETTE}" alt="${name}${status !== 'none' ? `, ${status}` : ''}">${status !== 'none' ? '<span class="cn-avatar__status"></span>' : ''}</span>`;
const labelGroup = (size: string, avatar: string, name: string, email: string) =>
  `<div class="cn-avatar-label-group" data-size="${size}">${avatar}<div class="cn-avatar-label-group__text"><span class="cn-avatar-label-group__name">${name}</span><span class="cn-avatar-label-group__email">${email}</span></div></div>`;

export const avatar: ComponentSpec = {
  name: 'Avatar',
  slug: 'avatar',
  category: 'data-display',
  description: 'A person or company as a small picture in the reference\'s seven sizes (16 → 64px): photo when there is one, semibold initials on gray-100 or a placeholder icon when there is not, a 0.5px contrast ring, and optional status dot, verified tick or company badge on the corner. Circles are people; squares are companies.',
  usage: 'Next to a name in tables, lists, comments, assignee fields, menus and headers; with the avatar label group when the name and email sit beside it. Use AvatarGroup for several people in one slot. Not a button: wrap it in a Button or Link when it opens something.',
  anatomy: [
    { part: 'root', element: 'span', description: 'Sized box, position relative, overflow visible so the badges can sit on the edge; draws the 0.5px inner contrast ring. Carries role="img" + aria-label when showing initials. Add data-border for the 1px outer ring, tabindex or make it a button when focusable.' },
    { part: 'image', element: 'img', description: 'The photo, cropped with object-fit cover, clipped by the root radius, with the reference\'s faint 1px light rim at the top and bottom edge. Needs alt.', optional: true },
    { part: 'fallback', element: 'span', description: 'Initials (1–2 letters, semibold, 12 → 24px) centered on the gray-100 fill. Shown when there is no image.', optional: true },
    { part: 'icon', element: 'svg', description: 'Placeholder icon (a person, or a building for companies) inside the fallback: 12 → 32px, fg-subtle.', optional: true },
    { part: 'status', element: 'span', description: 'Presence dot at the bottom-right (6 → 16px) with a 1.5px surface ring so it reads on any photo. Hidden unless data-status is a value other than none.', optional: true },
    { part: 'verified', element: 'svg', description: 'The blue verified tick at the bottom-right (10 → 20px): a blue-500 seal with a white check.', optional: true },
    { part: 'badge', element: 'span', description: 'Company-logo badge at the bottom-right (8 → 20px): a round brand-50 tile with a 1.5px surface ring holding a small logo image.', optional: true },
  ],
  props: {
    size: {
      values: ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      default: 'md',
      description: 'Outer size: xxs 16px (inline in text, tags), xs 24px (dense tables, menus, kanban cards), sm 32px (lists, table rows), md 40px (default: account cards, comments, table rows with two lines), lg 48px (headers, drawers), xl 56px and 2xl 64px (profile and settings pages).',
    },
    shape: {
      values: ['circle', 'square'],
      default: 'circle',
      description: 'circle = a person; square (radius 6) = a company, workspace or integration. Never mix shapes in one list.',
    },
    tone: {
      values: ['neutral', 'accent', 'info', 'success', 'warning'],
      default: 'neutral',
      description: 'Tint of the initials fallback. neutral (gray-100 with gray-500 initials, the reference) for people; accent only for the product\'s own assistant; info/success/warning only when the entity itself has that state. Never assign colors per person.',
    },
    status: {
      values: ['none', 'online', 'away', 'busy', 'offline'],
      default: 'none',
      description: 'Presence dot: none hides it (default); online = green-500, away = amber, busy = red, offline = gray-300. Only for real-time presence.',
    },
  },
  states: {
    focus: { selector: ':focus-visible', description: 'Keyboard focus when the avatar is a button or link (account menu trigger): the 4px brand ring.', markup: 'make the avatar a <button> or <a>, or add tabindex="0"' },
  },
  base: {
    root: {
      display: 'inline-flex',
      position: 'relative',
      'flex-shrink': '0',
      'vertical-align': 'middle',
      overflow: 'visible',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-muted}',
    },
    image: {
      display: 'block',
      width: '100%',
      height: '100%',
      'object-fit': 'cover',
      'border-radius': 'inherit',
      overflow: 'hidden',
    },
    fallback: {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '100%',
      height: '100%',
      'border-radius': 'inherit',
      overflow: 'hidden',
      'background-color': '{color.bg-muted}',
      color: '{color.fg-subtle}',
      ...typeStyle('label-md'),
      'line-height': '1',
      'user-select': 'none',
    },
    icon: { display: 'block', color: '{color.fg-subtle}', 'stroke-width': '2' },
    status: {
      display: 'none',
      position: 'absolute',
      bottom: '0',
      right: '0',
      'border-radius': '{radius.full}',
      'box-shadow': SURFACE_RING,
      'background-color': '{color.border-control}',
      'z-index': '{z.raised}',
    },
    verified: {
      position: 'absolute',
      bottom: '0',
      right: '0',
      display: 'block',
      color: '{blue.500}',
      'z-index': '{z.raised}',
    },
    badge: {
      position: 'absolute',
      bottom: '-2px',
      right: '-2px',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      overflow: 'hidden',
      'border-radius': '{radius.full}',
      'background-color': '{brand.50}',
      'box-shadow': SURFACE_RING,
      'z-index': '{z.raised}',
    },
    '@states': {
      focus: { root: { outline: 'none', 'box-shadow': '{shadow.focus}' } },
    },
  },
  variants: {
    size: Object.fromEntries(Object.entries(SIZE).map(([s, v]) => [s, {
      root: { width: v.box, height: v.box },
      fallback: { 'font-size': v.font },
      icon: { width: v.icon, height: v.icon },
      status: { width: v.dot, height: v.dot },
      verified: { width: v.tick, height: v.tick },
      badge: { width: v.badge, height: v.badge },
    }])),
    shape: {
      circle: { root: { 'border-radius': '{radius.full}' } },
      square: { root: { 'border-radius': '{radius.md}' }, status: { transform: 'translate(25%, 25%)' } },
    },
    tone: Object.fromEntries(Object.entries(TONE).map(([t, v]) => [t, { root: { 'background-color': v.bg }, fallback: { 'background-color': v.bg, color: v.fg } }])),
    status: {
      none: { status: { display: 'none' } },
      ...Object.fromEntries(Object.entries(STATUS).map(([s, c]) => [s, { status: { display: 'block', 'background-color': c } }])),
    },
  },
  compound: [
    { when: { size: 'xxs', shape: 'square' }, block: { root: { 'border-radius': '{radius.sm}' } } },
    { when: { size: 'xs', shape: 'square' }, block: { root: { 'border-radius': '{radius.sm}' } } },
  ],
  extraCss: `
.cn-avatar::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: ${CONTRAST}; pointer-events: none; }
.cn-avatar:has(> .cn-avatar__image)::before { content: ""; position: absolute; inset: 0; border-radius: inherit; border: 1px solid color-mix(in srgb, {white} 32%, transparent); -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 25%, transparent 75%, black 100%); mask-image: linear-gradient(to bottom, black 0%, transparent 25%, transparent 75%, black 100%); pointer-events: none; }
.cn-avatar[data-size="xxs"]::before, .cn-avatar[data-size="xs"]::before { display: none; }
.cn-avatar[data-size="xs"] .cn-avatar__verified, .cn-avatar[data-size="xxs"] .cn-avatar__verified { right: -1px; bottom: -1px; }
.cn-avatar[data-size="xxs"] .cn-avatar__fallback { font-size: 8px; }
.cn-avatar[data-border] { outline: 1px solid color-mix(in srgb, {black} 10%, transparent); outline-offset: 1px; }
.cn-avatar[data-size="lg"][data-border], .cn-avatar[data-size="xl"][data-border], .cn-avatar[data-size="2xl"][data-border] { outline-offset: 2px; }
.cn-avatar__badge > img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
button.cn-avatar, a.cn-avatar { appearance: none; border: 0; padding: 0; margin: 0; cursor: pointer; }
.cn-avatar-label-group { display: inline-flex; align-items: center; gap: {space.3}; min-width: 0; vertical-align: middle; }
.cn-avatar-label-group__text { display: flex; flex-direction: column; min-width: 0; }
.cn-avatar-label-group__name { font-size: {font.size.sm}; font-weight: {font.weight.medium}; line-height: {font.lineHeight.normal}; color: {color.fg-default}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cn-avatar-label-group__email { font-size: {font.size.xs}; line-height: {font.lineHeight.normal}; color: {color.fg-muted}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cn-avatar-label-group[data-size="sm"] { gap: {space.2.5}; }
.cn-avatar-label-group[data-size="md"] .cn-avatar-label-group__email { font-size: {font.size.sm}; }
.cn-avatar-label-group[data-size="lg"] { gap: {space.4}; }
.cn-avatar-label-group[data-size="lg"] .cn-avatar-label-group__name { font-size: {font.size.md}; font-weight: {font.weight.semibold}; }
.cn-avatar-label-group[data-size="lg"] .cn-avatar-label-group__email { font-size: {font.size.sm}; }
.cn-avatar-add { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; appearance: none; margin: 0; padding: 0; width: {space.10}; height: {space.10}; border-radius: {radius.full}; border: 1px dashed {color.border-control}; background-color: {color.bg-surface}; color: {color.fg-subtle}; cursor: pointer; transition: background-color {motion.duration.fast} {motion.easing.linear}, color {motion.duration.fast} {motion.easing.linear}; }
.cn-avatar-add > .cn-icon { width: {size.icon.md}; height: {size.icon.md}; }
.cn-avatar-add:hover { background-color: {color.bg-subtle}; color: {color.fg-muted}; }
.cn-avatar-add:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-avatar-add:disabled { opacity: {opacity.disabled}; cursor: not-allowed; }
.cn-avatar-add[data-size="xs"] { width: {space.6}; height: {space.6}; } .cn-avatar-add[data-size="xs"] > .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; }
.cn-avatar-add[data-size="sm"] { width: {space.8}; height: {space.8}; } .cn-avatar-add[data-size="sm"] > .cn-icon { width: {size.icon.sm}; height: {size.icon.sm}; }`,
  examples: [
    ex('Sizes', `<div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--cn-space-4)">${initials('xxs', 'M', 'Maya Chen')}${initials('xs', 'MC', 'Maya Chen')}${initials('sm', 'MC', 'Maya Chen')}${initials('md', 'MC', 'Maya Chen')}${initials('lg', 'MC', 'Maya Chen')}${initials('xl', 'MC', 'Maya Chen')}${initials('2xl', 'MC', 'Maya Chen')}</div>`, 'xxs 16 · xs 24 · sm 32 · md 40 · lg 48 · xl 56 · 2xl 64. Semibold initials on gray-100 with the 0.5px contrast ring.'),
    ex('Photo, border and status', `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--cn-space-4)">${photo('md', 'Daniel Costa')}${photo('md', 'Daniel Costa', 'none', ' data-border')}${photo('md', 'Sofia Almeida', 'online')}${photo('md', 'Lucas Ferreira', 'offline')}${photo('md', 'Aisha Khan', 'away')}${photo('md', 'Noah Berg', 'busy')}</div>`, 'The photo gets a faint light rim; data-border adds the 1px outer ring. Dots: online green, offline gray-300, away amber, busy red, each with a 1.5px surface ring.'),
    ex('Status dot per size', `<div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--cn-space-4)">${photo('xs', 'Maya Chen', 'online')}${photo('sm', 'Maya Chen', 'online')}${photo('md', 'Maya Chen', 'online')}${photo('lg', 'Maya Chen', 'online')}${photo('xl', 'Maya Chen', 'online')}${photo('2xl', 'Maya Chen', 'online')}</div>`, '6 · 8 · 10 · 12 · 14 · 16px dots.'),
    ex('Verified tick', `<div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--cn-space-4)">${av('xs', `<img class="cn-avatar__image" src="${SILHOUETTE}" alt="">${VERIFIED}`, 'Elena Rossi, verified')}${av('sm', `<img class="cn-avatar__image" src="${SILHOUETTE}" alt="">${VERIFIED}`, 'Elena Rossi, verified')}${av('md', `<img class="cn-avatar__image" src="${SILHOUETTE}" alt="">${VERIFIED}`, 'Elena Rossi, verified')}${av('lg', `<img class="cn-avatar__image" src="${SILHOUETTE}" alt="">${VERIFIED}`, 'Elena Rossi, verified')}${av('xl', `<img class="cn-avatar__image" src="${SILHOUETTE}" alt="">${VERIFIED}`, 'Elena Rossi, verified')}${av('2xl', `<img class="cn-avatar__image" src="${SILHOUETTE}" alt="">${VERIFIED}`, 'Elena Rossi, verified')}</div>`, 'The blue-500 seal with a white check, 10 → 20px, bottom-right.'),
    ex('Company badge and placeholders', `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--cn-space-4)">${av('md', `<img class="cn-avatar__image" src="${SILHOUETTE}" alt=""><span class="cn-avatar__badge"><img src="${LOGO}" alt=""></span>`, 'Tomás Silva at Lumen')}${av('md', `<span class="cn-avatar__fallback" aria-hidden="true">${ICON.user.replace('cn-icon', 'cn-avatar__icon')}</span>`, 'Unknown person')}${av('md', `<span class="cn-avatar__fallback" aria-hidden="true">${BUILDING}</span>`, 'Lumen', 'square')}${av('md', `<span class="cn-avatar__fallback" aria-hidden="true">LU</span>`, 'Lumen', 'square')}${av('lg', `<img class="cn-avatar__image" src="${LOGO}" alt="Lumen">`, 'Lumen', 'square')}</div>`, 'A 14px company badge on a person; the person placeholder icon; the square company placeholder (building icon or initials) and a square logo.'),
    ex('Label group', `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:var(--cn-space-5)">${labelGroup('sm', photo('sm', 'Maya Chen', 'online'), 'Maya Chen', 'maya@lumen.co')}${labelGroup('md', photo('md', 'Daniel Costa', 'online'), 'Daniel Costa', 'daniel@lumen.co')}${labelGroup('lg', initials('lg', 'SA', 'Sofia Almeida'), 'Sofia Almeida', 'sofia@lumen.co')}</div>`, 'The avatar label group recipe: avatar + name (14px medium) + email (fg-muted); data-size sm / md / lg sets the gap and text sizes.'),
    ex('Tones and the focusable trigger', `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--cn-space-4)">${initials('md', 'MC', 'Maya Chen')}${av('md', '<span class="cn-avatar__fallback" aria-hidden="true">AI</span>', 'Lumen assistant', 'circle', 'accent')}${av('md', '<span class="cn-avatar__fallback" aria-hidden="true">NC</span>', 'New contact', 'circle', 'info')}${av('md', '<span class="cn-avatar__fallback" aria-hidden="true">VB</span>', 'Verified buyer', 'circle', 'success')}${av('md', '<span class="cn-avatar__fallback" aria-hidden="true">PR</span>', 'Pending review', 'circle', 'warning')}<button type="button" class="cn-avatar" data-size="md" data-shape="circle" data-tone="neutral" data-status="none" aria-label="Open account menu" aria-haspopup="menu"><span class="cn-avatar__fallback" aria-hidden="true">MC</span></button><button type="button" class="cn-avatar-add" aria-label="Add teammate">${ICON.plus}</button></div>`, 'neutral for people; the other tones only when the entity has that state. A button avatar gets the focus ring; .cn-avatar-add is the dashed add button.'),
  ],
  rules: [
    'Circle = a person. Square (radius 6) = a company, a workspace or an integration. One shape per list.',
    'Initials: first + last name (2 letters) from xs up; a single letter at xxs. Semibold, gray-500 on gray-100.',
    'Fallback tone is neutral for people. accent is reserved for the product\'s assistant. Never give people random colors.',
    'Show the status dot only for real-time presence that matters; never as decoration; data-status="none" otherwise. The verified tick and the company badge are mutually exclusive with the dot.',
    'Photos are cropped with cover, never stretched; the only frame is data-border (1px outer ring) on profile pages.',
    'Sizes follow the slot: xxs inline in text and tags, xs in dense tables and menus, sm in list rows, md in account cards and 72px table rows, lg in headers and drawers, xl / 2xl on profile pages.',
    'Next to a name and email use the avatar label group (.cn-avatar-label-group) so the text sizes and gaps match the avatar size.',
    'The avatar is not a control unless it is the account menu trigger: then it is a <button aria-haspopup="menu"> and gets the focus ring; do not add hover styles.',
    'Always pair with the name in text nearby except in tight groups; the picture is never the only identification.',
  ],
  a11y: [
    'Photo: alt is the person\'s name when the name is not adjacent text; alt="" when it is, to avoid reading the name twice.',
    'Initials: put role="img" and aria-label="Full name" on the root and aria-hidden="true" on the initials span.',
    'Presence and verification must be available as text: include them in the alt or aria-label ("Maya Chen, online", "Elena Rossi, verified"). The dot and tick alone are not accessible.',
    'When clickable, the avatar is a <button> or <a> with an aria-label and shows the focus ring; a wrapping Link works too.',
    'The add button (.cn-avatar-add) needs aria-label ("Add teammate").',
  ],
  related: ['avatar-group', 'badge', 'list', 'table', 'menu', 'kanban'],
};
