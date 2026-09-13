import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, TRANSITION_COLORS, STATE, ex } from './_shared.ts';

// "Download on the App Store" / "Get it on Google Play" badges: a 40px pill-ish box with a 24px
// store glyph, a tiny kicker line and a big label. Dark (inverse fill, thin grey border) or outline
// (surface fill, hairline). The glyphs in the examples are simple monochrome shapes, not trademark art.

const GLYPH: Record<string, string> = {
  apple: '<circle cx="12" cy="13.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M12 7c0-2.2 1.3-3.5 3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>',
  google: '<path d="M6.5 4.5v15l12.5-7.5z" fill="currentColor"/>',
};
const COPY: Record<string, { kicker: string; label: string; name: string }> = {
  apple: { kicker: 'Download on the', label: 'App Store', name: 'App Store' },
  google: { kicker: 'Get it on', label: 'Google Play', name: 'Google Play' },
};
const badge = (store: string, theme = 'dark') =>
  `<a href="#" class="cn-app-store-button" data-store="${store}" data-theme="${theme}" aria-label="${COPY[store].kicker} ${COPY[store].name}"><svg class="cn-app-store-button__icon" viewBox="0 0 24 24" aria-hidden="true">${GLYPH[store]}</svg><span class="cn-app-store-button__kicker">${COPY[store].kicker}</span><span class="cn-app-store-button__label">${COPY[store].label}</span></a>`;
const row = (...items: string[]) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--cn-space-3)">${items.join('')}</div>`;

export const appStoreButton: ComponentSpec = {
  name: 'AppStoreButton',
  slug: 'app-store-button',
  category: 'actions',
  description: 'The download badge for a mobile app: a 40px box with the store glyph on the left and two lines of text, a tiny kicker ("Download on the") over a bold store name. Dark by default, or outline on dark and busy backgrounds.',
  usage: 'Marketing pages, app footers and "get the app" banners, always as a pair (both stores) or a single badge when only one exists. Never inside the app shell, never as a generic download button (use Button with a leading icon).',
  anatomy: [
    { part: 'root', element: 'a', description: 'The badge link (inline-grid: icon column + two text rows). href points to the store listing; aria-label repeats the two lines. Carries data-store and data-theme.' },
    { part: 'icon', element: 'svg', description: '24px store glyph spanning both text rows. Monochrome, currentColor. aria-hidden.' },
    { part: 'kicker', element: 'span', description: 'The small first line ("Download on the", "Get it on"), 11px medium, at 70% of the text color.' },
    { part: 'label', element: 'span', description: 'The store name in 16px semibold with tight tracking.' },
  ],
  props: {
    store: { values: ['apple', 'google'], default: 'apple', description: 'apple = "Download on the App Store"; google = "Get it on Google Play". The store also picks the glyph and the copy in the markup.' },
    theme: { values: ['dark', 'outline'], default: 'dark', description: 'dark = inverse fill with light text and a thin grey border, the standard badge on light pages; outline = surface fill with a hairline and default ink, for dark or photographic backgrounds and for footers where a black block would be too heavy.' },
  },
  states: {
    hover: STATE.hover(),
    active: STATE.active(),
    focus: STATE.focus(),
  },
  base: {
    root: {
      ...RESET_BUTTON,
      display: 'inline-grid',
      'grid-template-columns': 'auto 1fr',
      'grid-template-rows': 'auto auto',
      'column-gap': '{space.2}',
      'align-items': 'center',
      'align-content': 'center',
      'justify-items': 'start',
      height: '{space.10}',
      'padding-inline': '{space.2.5} {space.3}',
      'border-radius': '{radius.control}',
      border: '{border.width.thin} solid transparent',
      'text-align': 'start',
      'white-space': 'nowrap',
      'flex-shrink': '0',
      'vertical-align': 'middle',
      ...TRANSITION_COLORS,
    },
    icon: { 'grid-row': '1 / span 2', display: 'block', width: '{size.icon.xl}', height: '{size.icon.xl}', 'flex-shrink': '0', 'pointer-events': 'none' },
    kicker: { 'grid-column': '2', 'font-family': '{font.family.sans}', 'font-size': '{font.size.2xs}', 'font-weight': '{font.weight.medium}', 'line-height': '{font.lineHeight.none}', 'letter-spacing': '{font.letterSpacing.normal}', opacity: '{opacity.muted}' },
    label: { 'grid-column': '2', 'font-family': '{font.family.sans}', 'font-size': '{font.size.lg}', 'font-weight': '{font.weight.semibold}', 'line-height': '{font.lineHeight.none}', 'letter-spacing': '{font.letterSpacing.tight}', 'margin-top': '{space.0.5}' },
    '@states': {
      focus: { root: { outline: 'none', 'box-shadow': '{shadow.focus}' } },
    },
  },
  variants: {
    store: { apple: { root: {} }, google: { root: {} } },
    theme: {
      dark: {
        root: { 'background-color': '{color.bg-inverse}', color: '{color.fg-inverse}', 'border-color': '{neutral.500}' },
        '@states': {
          hover: { root: { 'background-color': 'color-mix(in srgb, {color.bg-inverse} 88%, {color.bg-surface})' } },
          active: { root: { 'background-color': 'color-mix(in srgb, {color.bg-inverse} 80%, {color.bg-surface})' } },
        },
      },
      outline: {
        root: { 'background-color': '{color.bg-surface}', color: '{color.fg-default}', 'border-color': '{color.border-control}', 'box-shadow': '{shadow.xs}' },
        '@states': {
          hover: { root: { 'background-color': '{color.bg-subtle}', 'border-color': '{color.border-control-hover}' } },
          active: { root: { 'background-color': '{color.bg-muted}' } },
          focus: { root: { 'box-shadow': '{shadow.xs}, {shadow.focus}' } },
        },
      },
    },
  },
  examples: [
    ex('Dark pair', row(badge('apple'), badge('google')), 'The standard pair on a light page: inverse fill, thin grey border, 40px tall.'),
    ex('Outline pair', row(badge('apple', 'outline'), badge('google', 'outline')), 'Surface fill with a hairline for footers and busy backgrounds.'),
    ex('Outline on an inverse band', `<div style="background:var(--cn-color-bg-inverse);padding:var(--cn-space-5);border-radius:var(--cn-radius-lg)">${row(badge('apple', 'outline'), badge('google', 'outline'))}</div>`, 'On a dark band the outline theme keeps the badges readable; the dark theme would disappear.'),
    ex('Single store', badge('apple', 'dark'), 'When the app exists on one store only. Do not fake the other badge.'),
  ],
  recipes: [
    ex('Get-the-app footer row', `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--cn-space-4);max-width:640px;padding:var(--cn-space-5);border:1px solid var(--cn-color-border-default);border-radius:var(--cn-radius-card)"><div><div class="cn-text-heading-xs">Lumen for iOS and Android</div><div class="cn-text-body-sm" style="color:var(--cn-color-fg-muted)">Reply to buyers and approve quotes from your phone.</div></div>${row(badge('apple'), badge('google'))}</div>`, 'Title and one line of copy on the left, the pair on the right; they wrap under the copy on narrow screens.'),
  ],
  rules: [
    'Always 40px tall, never scaled: the badge is a fixed-size mark, not a button that grows with the layout.',
    'Show both stores side by side with a 12px gap, Apple first, in the same theme; show one badge only when the app really exists on one store.',
    'Copy is fixed by the store: "Download on the / App Store" and "Get it on / Google Play". Do not translate the store names or invent kickers.',
    'dark on light pages; outline on dark, photographic or tinted backgrounds and in footers. Never both themes on one page.',
    'In production use the stores\' official badge artwork inside the icon slot and follow their clear-space rules; the example glyphs are placeholders.',
    'The badge links to the store listing (or a smart link) and opens in the same tab on mobile, a new tab on desktop.',
    'Never place the badges inside the app shell or next to in-app actions; they belong to marketing surfaces and onboarding emails.',
  ],
  a11y: [
    'It is an <a href> with an aria-label that reads both lines ("Download on the App Store"); the glyph is aria-hidden.',
    'The two text lines are real text, not an image, so they scale with the user\'s font size and remain translatable.',
    'Focus ring on :focus-visible; on the dark theme it is the only hover-independent state, so keep it visible.',
    'Kicker opacity is 70% of the text color, which keeps contrast ≥ 4.5:1 on both themes; do not lower it.',
  ],
  related: ['social-button', 'button', 'link'],
};
