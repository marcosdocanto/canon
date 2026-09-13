import type { ComponentSpec } from '../types.ts';
import { CONTROL, FOCUS_RING, RESET_BUTTON, TRANSITION_COLORS, STATE, ex, typeStyle } from './_shared.ts';

// Sign-in buttons for third-party identity providers. Same box as Button (md / lg / xl), a 24px logo
// slot and a label. Three themes: brand (the provider's fill), gray (white with a hairline, monochrome
// logo) and color (white with a hairline, colored logo). Provider colors are mapped by role onto our
// primitives; the glyphs in the examples are simple monochrome shapes, not trademark art.

type Theme = { bg: string; hoverBg: string; fg: string; border: string; icon: string };
const outlineTheme = (icon: string): Theme => ({ bg: '{color.bg-surface}', hoverBg: '{color.bg-subtle}', fg: '{color.fg-default}', border: '{color.border-control}', icon });
const inverseTheme: Theme = { bg: '{color.bg-inverse}', hoverBg: 'color-mix(in srgb, {color.bg-inverse} 88%, {color.bg-surface})', fg: '{color.fg-inverse}', border: 'transparent', icon: 'currentColor' };
const blueTheme = (step: string, hover: string): Theme => ({ bg: `{blue.${step}}`, hoverBg: `{blue.${hover}}`, fg: '{white}', border: 'transparent', icon: 'currentColor' });

const PAINT: Record<string, Record<string, Theme>> = {
  google: { brand: blueTheme('600', '700'), gray: outlineTheme('{color.fg-default}'), color: outlineTheme('{blue.500}') },
  apple: { brand: inverseTheme, gray: outlineTheme('{color.fg-default}'), color: outlineTheme('{color.fg-default}') },
  github: { brand: inverseTheme, gray: outlineTheme('{color.fg-default}'), color: outlineTheme('{color.fg-default}') },
  facebook: { brand: blueTheme('600', '700'), gray: outlineTheme('{color.fg-default}'), color: outlineTheme('{blue.600}') },
};

const compound = Object.entries(PAINT).flatMap(([social, themes]) => Object.entries(themes).map(([theme, t]) => ({
  when: { social, theme },
  block: {
    root: { 'background-color': t.bg, color: t.fg, 'border-color': t.border },
    icon: { color: t.icon },
    '@states': { hover: { root: { 'background-color': t.hoverBg } }, active: { root: { 'background-color': t.hoverBg } } },
  },
})));

const LG = new Set(['lg', 'xl']);
const sizeBlock = (s: 'md' | 'lg' | 'xl') => ({
  root: { height: CONTROL[s].height, 'padding-inline': CONTROL[s].px, 'font-size': CONTROL[s].font, gap: LG.has(s) ? '{space.3}' : '{space.2.5}' },
});

/** Monochrome glyphs: a G-shaped arc, a fruit outline with a stem, a circle with code brackets, a circle with an f. */
const GLYPH: Record<string, string> = {
  google: '<path d="M12 12h8.5a8.5 8.5 0 1 1-2.5-6"/>',
  apple: '<circle cx="12" cy="13.5" r="6.5"/><path d="M12 7c0-2.2 1.3-3.5 3.5-3.5"/>',
  github: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5L7 12l2.5 2.5M14.5 9.5L17 12l-2.5 2.5"/>',
  facebook: '<circle cx="12" cy="12" r="9"/><path d="M13.5 20v-6.5h2.2l.3-2.5h-2.5V9.6c0-.8.4-1.3 1.2-1.3h1.4V6.2h-2c-2 0-3.1 1.2-3.1 3.1V11H9v2.5h2V20"/>',
};
const NAME: Record<string, string> = { google: 'Google', apple: 'Apple', github: 'GitHub', facebook: 'Facebook' };
const icon = (social: string) => `<svg class="cn-social-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[social]}</svg>`;
const btn = (social: string, theme = 'gray', size = 'md', attrs = '', verb = 'Sign in with') =>
  `<button type="button" class="cn-social-button" data-social="${social}" data-theme="${theme}" data-size="${size}"${attrs}>${icon(social)}<span class="cn-social-button__label">${verb} ${NAME[social]}</span></button>`;
const stack = (...items: string[]) => `<div style="display:flex;flex-direction:column;gap:var(--cn-space-3);max-width:360px">${items.join('')}</div>`;

export const socialButton: ComponentSpec = {
  name: 'SocialButton',
  slug: 'social-button',
  category: 'actions',
  description: 'A sign-in button for an identity provider: the Button box with a 24px logo slot and a "Sign in with …" label. Three themes: the provider\'s brand fill, a white gray button with a monochrome logo, or a white button with the colored logo.',
  usage: 'Auth screens only (sign in, sign up, connect an account). Stack the providers you support in a fixed order under the email form, all in the same theme and size. Never use it for sharing links or as a generic icon button.',
  anatomy: [
    { part: 'root', element: 'button', description: 'The button (or an <a> when the flow is a redirect). Full width in auth forms. Carries data-social, data-theme, data-size.' },
    { part: 'icon', element: 'svg', description: '24px logo slot. Monochrome (currentColor) in brand and gray themes, the provider color in the color theme. aria-hidden.' },
    { part: 'label', element: 'span', description: '"Sign in with Google" / "Continue with Apple": verb + provider name, sentence case.' },
  ],
  props: {
    social: { values: ['google', 'apple', 'github', 'facebook'], default: 'google', description: 'The identity provider. It selects the brand fill (brand theme) and the logo color (color theme); the logo itself comes from the markup.' },
    theme: { values: ['brand', 'gray', 'color'], default: 'gray', description: 'gray = white, hairline, monochrome logo: the default that sits quietly under an email form; brand = the provider\'s fill with a white logo, for a single prominent provider; color = white with the provider-colored logo, for a row of several providers on marketing-style auth pages.' },
    size: { values: ['md', 'lg', 'xl'], default: 'md', description: 'Button heights md / lg / xl (40 / 44 / 48px in the reference scale). Match the size of the email form\'s submit button.' },
  },
  states: {
    hover: STATE.hover(),
    active: STATE.active(),
    focus: STATE.focus(),
    disabled: STATE.disabled(),
  },
  base: {
    root: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      gap: '{space.2.5}',
      'flex-shrink': '0',
      'white-space': 'nowrap',
      ...typeStyle('label-md'),
      'font-size': CONTROL.md.font,
      height: CONTROL.md.height,
      'padding-inline': CONTROL.md.px,
      'border-radius': '{radius.control}',
      border: '{border.width.thin} solid transparent',
      'box-shadow': '{shadow.xs}',
      ...TRANSITION_COLORS,
    },
    icon: { display: 'block', 'flex-shrink': '0', width: '{size.icon.xl}', height: '{size.icon.xl}', 'pointer-events': 'none', transition: 'inherit' },
    label: { display: 'inline-block', 'padding-inline': '{space.0.5}' },
    '@states': {
      focus: { root: { ...FOCUS_RING, 'box-shadow': '{shadow.xs}, {shadow.focus}' } },
      disabled: { root: { opacity: '{opacity.disabled}', cursor: 'not-allowed' } },
    },
  },
  variants: {
    social: { google: { root: {} }, apple: { root: {} }, github: { root: {} }, facebook: { root: {} } },
    theme: {
      brand: { root: {} },
      gray: { root: {} },
      color: { root: {} },
    },
    size: { md: sizeBlock('md'), lg: sizeBlock('lg'), xl: sizeBlock('xl') },
  },
  compound,
  extraCss: `
.cn-social-button[data-full] { width: 100%; }`,
  examples: [
    ex('Gray (default)', stack(btn('google'), btn('apple'), btn('github'), btn('facebook')), 'White with a hairline and a monochrome logo; the quiet default under an email form.'),
    ex('Brand', stack(btn('google', 'brand'), btn('apple', 'brand'), btn('github', 'brand'), btn('facebook', 'brand')), 'The provider fill with a white logo, for one prominent provider.'),
    ex('Color', stack(btn('google', 'color'), btn('apple', 'color'), btn('github', 'color'), btn('facebook', 'color')), 'White with the provider-colored logo, for a row of several providers.'),
    ex('Sizes', stack(btn('google', 'gray', 'md', '', 'Continue with'), btn('google', 'gray', 'lg', '', 'Continue with'), btn('google', 'gray', 'xl', '', 'Continue with')), 'md / lg / xl follow the control heights; text grows to 16px on lg and xl.'),
    ex('Full width and disabled', stack(btn('github', 'gray', 'md', ' data-full'), btn('google', 'gray', 'md', ' data-full disabled')), 'data-full stretches the button to the form width; disabled keeps the layout and dims it.'),
  ],
  recipes: [
    ex('Under an email form', `<div style="display:flex;flex-direction:column;gap:var(--cn-space-3);max-width:360px"><button type="submit" class="cn-button" data-variant="primary" data-size="md" style="width:100%"><span class="cn-button__label">Sign in</span></button><div style="display:flex;align-items:center;gap:var(--cn-space-3);color:var(--cn-color-fg-subtle)" class="cn-text-body-xs"><span style="flex:1;height:1px;background:var(--cn-color-border-default)"></span>or<span style="flex:1;height:1px;background:var(--cn-color-border-default)"></span></div>${btn('google', 'gray', 'md', ' data-full')}${btn('apple', 'gray', 'md', ' data-full')}</div>`, 'Primary submit first, an "or" divider, then the providers in gray at the same size.'),
  ],
  rules: [
    'Label = verb + provider: "Sign in with Google" on sign-in screens, "Continue with Google" when the same button signs up. Never the provider name alone, never "Login".',
    'One theme and one size per screen. gray under an email form; color when providers stand alone in a row; brand only for a single provider that is the main way in.',
    'Order providers by usage in your audience and keep that order on every screen; put the email form above them, never below.',
    'Full width (data-full) inside auth forms; intrinsic width only in a horizontal row of icon-heavy color buttons.',
    'The logo slot is 24px; use the provider\'s official monochrome or color asset in production and respect its clear-space rules. The example glyphs are placeholders.',
    'Never add a trailing arrow or a second icon; the logo is the only icon.',
    'While the provider popup is open set aria-busy="true" and disable the other providers to avoid two flows at once.',
  ],
  a11y: [
    'It is a <button type="button"> (or an <a href> for redirect flows) with the visible label as its accessible name; the logo is aria-hidden.',
    'Focus ring on :focus-visible only, stacked over the resting shadow so the ring is visible on filled brand buttons too.',
    'Disabled providers stay visible and readable (opacity only); explain why when it matters ("Apple sign-in is not available in this region").',
    'Contrast: brand fills use the 600 step with white text; gray and color themes use default ink on the surface.',
  ],
  related: ['button', 'app-store-button', 'divider', 'input'],
};
