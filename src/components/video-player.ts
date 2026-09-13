import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, TRANSITION_COLORS, ex, typeStyle } from './_shared.ts';

// Video player: a 16:9 inverse-colored frame with a poster, a centered 64px play
// button on a 90% surface circle, and a bottom control bar on a color-mix scrim
// with a 2px progress line, a scrubber, 32px icon buttons and a mono time label.

const SVG = {
  play: '<svg class="cn-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8z"/></svg>',
  pause: '<svg class="cn-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="3.5" width="2.75" height="9" rx=".5"/><rect x="9.25" y="3.5" width="2.75" height="9" rx=".5"/></svg>',
  volume: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.25h2.25L8 3.5v9L4.75 9.75H2.5z"/><path d="M10.5 5.75a3 3 0 010 4.5M12.25 4a5.5 5.5 0 010 8"/></svg>',
  captions: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><path d="M5 8.75h2.5M8.75 8.75H11M5 6.25h6"/></svg>',
  settings: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="2"/><path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05"/></svg>',
  fullscreen: '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5v-3.5h3.5M13 6.5v-3.5H9.5M3 9.5v3.5h3.5M13 9.5v3.5H9.5"/></svg>',
};

/** Dark 16:9 poster drawn with fg-inverse shapes at low opacity, no network. */
const POSTER = `<svg class="cn-video-player__media" viewBox="0 0 640 360" role="img" aria-label="Poster: the Lumen reporting workspace"><rect width="640" height="360" style="fill:var(--cn-color-bg-inverse)"/><rect x="72" y="56" width="496" height="248" rx="16" style="fill:var(--cn-color-fg-inverse);opacity:.08"/><rect x="96" y="80" width="140" height="10" rx="5" style="fill:var(--cn-color-fg-inverse);opacity:.32"/><rect x="96" y="100" width="88" height="8" rx="4" style="fill:var(--cn-color-fg-inverse);opacity:.18"/><rect x="96" y="132" width="212" height="148" rx="10" style="fill:var(--cn-color-fg-inverse);opacity:.1"/><rect x="332" y="132" width="212" height="64" rx="10" style="fill:var(--cn-color-fg-inverse);opacity:.1"/><rect x="332" y="216" width="212" height="64" rx="10" style="fill:var(--cn-color-fg-inverse);opacity:.1"/><path d="M116 250l40-32 38 18 44-52 42 20 28-36" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--cn-color-bg-accent)"/></svg>`;

const btn = (svg: string, label: string, attrs = '') => `<button type="button" class="cn-video-player__button" aria-label="${label}"${attrs}>${svg}</button>`;
const bar = (playing: boolean, pct: number, time: string) =>
  `<div class="cn-video-player__controls"><div class="cn-video-player__progress" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" tabindex="0"><div class="cn-video-player__progress-fill" style="width:${pct}%"></div><span class="cn-video-player__scrubber" style="left:${pct}%"></span></div><div class="cn-video-player__row"><div class="cn-video-player__group">${btn(playing ? SVG.pause : SVG.play, playing ? 'Pause' : 'Play')}${btn(SVG.volume, 'Mute')}<span class="cn-video-player__time">${time}</span></div><div class="cn-video-player__group">${btn(SVG.captions, 'Captions', ' aria-pressed="false"')}${btn(SVG.settings, 'Settings')}${btn(SVG.fullscreen, 'Full screen')}</div></div></div>`;
const PLAY = `<button type="button" class="cn-video-player__play" aria-label="Play">${SVG.play}</button>`;

const player = (variant: string, size: string, state: string, inner: string) =>
  `<div class="cn-video-player" data-variant="${variant}" data-size="${size}" data-state="${state}" role="region" aria-label="Video: Introducing Lumen reporting">${POSTER}${inner}</div>`;

export const videoPlayer: ComponentSpec = {
  name: 'VideoPlayer',
  slug: 'video-player',
  category: 'media',
  description: 'A 16:9 inverse frame with a poster, a centered 64px play button on a translucent surface circle, and a bottom control bar on a scrim: a 2px progress line with a scrubber, 32px icon buttons in fg-inverse and a mono time label. Three looks: default, minimal (play only) and mockup (a framed device-like shot for marketing).',
  usage: 'Use for product videos, onboarding clips and recorded sessions inside the app or on marketing pages. The component styles the chrome; the <video> element and its behavior come from the app. For images use MediaFrame; for a slideshow use Carousel.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The frame: relative, 16:9, bg-inverse, radius card, overflow hidden. data-state="paused|playing". Max width from size.' },
    { part: 'media', element: 'video', description: 'The <video> (with poster) or an <img>, absolutely filling the frame with object-fit cover. In the gallery an inline svg poster.' },
    { part: 'play', element: 'button', description: 'Centered 64px circle, bg-surface at 90%, shadow-lg, with a 24px play icon. Hidden while playing.' },
    { part: 'controls', element: 'div', description: 'Bottom bar on a scrim (bg-inverse at 70%): the progress line, then the row of buttons and time.' },
    { part: 'progress', element: 'div', description: '2px full-width track (fg-inverse at 30%), role="slider" for seeking; grows to 4px on hover.' },
    { part: 'progress-fill', element: 'div', description: 'The played portion in fg-inverse; width is the inline percentage.' },
    { part: 'scrubber', element: 'span', description: '12px round handle at the end of the fill (left = the same percentage).' },
    { part: 'row', element: 'div', description: 'The controls row: a left group (play, volume, time) and a right group (captions, settings, full screen).' },
    { part: 'group', element: 'div', description: 'A cluster of buttons with a 4px gap.' },
    { part: 'button', element: 'button', description: '32px icon button in fg-inverse, radius md, translucent hover. aria-label required; captions is a toggle with aria-pressed.' },
    { part: 'time', element: 'span', description: 'Elapsed / total in code-sm fg-inverse, tabular ("0:42 / 3:18").' },
  ],
  props: {
    variant: {
      values: ['default', 'minimal', 'mockup'],
      default: 'default',
      description: 'default = play button plus the full control bar (in-app video). minimal = poster and play button only; controls appear once playing (embeds in cards and docs). mockup = the default chrome inside a framed, shadowed device-like shot for marketing hero sections; never inside the app shell.',
    },
    size: {
      values: ['sm', 'md', 'lg'],
      default: 'md',
      description: 'Maximum width of the frame: sm 480px (cards, side panels), md 720px (content pages), lg 960px (marketing sections). Always 100% wide below that.',
    },
  },
  states: {
    playing: { selector: '[data-state="playing"]', description: 'Media is playing: the centered play button hides and the bar shows a pause icon. The app toggles the attribute.', markup: 'data-state="playing" on the root' },
    paused: { selector: '[data-state="paused"]', description: 'Media is paused or not started: the centered play button is visible over the poster.', markup: 'data-state="paused" on the root (default)' },
    playHover: { selector: ' .cn-video-player__play:hover', description: 'Pointer over the big play button (extraCss): the circle becomes fully opaque.', markup: 'native :hover on .cn-video-player__play' },
    buttonHover: { selector: ' .cn-video-player__button:hover', description: 'Pointer over a bar button (extraCss): a translucent fg-inverse fill.', markup: 'native :hover on .cn-video-player__button' },
    buttonFocus: { selector: ' .cn-video-player__button:focus-visible', description: 'Keyboard focus on a bar button or the play button shows the focus ring (extraCss).', markup: 'native :focus-visible on .cn-video-player__button' },
    buttonPressed: { selector: ' .cn-video-player__button[aria-pressed="true"]', description: 'A toggle such as captions that is on (extraCss): keeps the translucent fill at rest.', markup: 'aria-pressed="true" on .cn-video-player__button' },
  },
  base: {
    root: {
      position: 'relative',
      width: '100%',
      'max-width': '720px',
      'aspect-ratio': '16 / 9',
      'background-color': '{color.bg-inverse}',
      color: '{color.fg-inverse}',
      'border-radius': '{radius.card}',
      overflow: 'hidden',
      isolation: 'isolate',
    },
    media: { position: 'absolute', inset: '0', display: 'block', width: '100%', height: '100%', 'object-fit': 'cover' },
    play: {
      ...RESET_BUTTON,
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.16}',
      height: '{space.16}',
      'border-radius': '{radius.full}',
      'background-color': 'color-mix(in srgb, {color.bg-surface} 90%, transparent)',
      color: '{color.fg-default}',
      'box-shadow': '{shadow.lg}',
      'z-index': '{z.raised}',
      ...TRANSITION_COLORS,
    },
    controls: {
      position: 'absolute',
      'inset-inline': '0',
      bottom: '0',
      display: 'flex',
      'flex-direction': 'column',
      gap: '{space.2}',
      padding: '{space.3} {space.4}',
      'background-color': 'color-mix(in srgb, {color.bg-inverse} 70%, transparent)',
      color: '{color.fg-inverse}',
      'z-index': '{z.raised}',
    },
    progress: {
      position: 'relative',
      width: '100%',
      height: '2px',
      'border-radius': '{radius.full}',
      'background-color': 'color-mix(in srgb, {color.fg-inverse} 30%, transparent)',
      cursor: 'pointer',
      outline: 'none',
      'transition-property': 'height',
      'transition-duration': '{motion.duration.fast}',
      'transition-timing-function': '{motion.easing.standard}',
    },
    'progress-fill': { height: '100%', width: '0', 'border-radius': '{radius.full}', 'background-color': '{color.fg-inverse}' },
    scrubber: {
      position: 'absolute',
      top: '50%',
      width: '{space.3}',
      height: '{space.3}',
      'border-radius': '{radius.full}',
      'background-color': '{color.fg-inverse}',
      transform: 'translate(-50%, -50%)',
      'box-shadow': '{shadow.sm}',
    },
    row: { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '{space.2}' },
    group: { display: 'flex', 'align-items': 'center', gap: '{space.1}' },
    button: {
      ...RESET_BUTTON,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.8}',
      height: '{space.8}',
      'border-radius': '{radius.md}',
      color: '{color.fg-inverse}',
      ...TRANSITION_COLORS,
    },
    time: { ...typeStyle('code-sm'), color: '{color.fg-inverse}', 'font-variant-numeric': 'tabular-nums', 'padding-inline': '{space.1}', 'white-space': 'nowrap' },
    '@states': {
      playing: { play: { display: 'none' } },
      paused: { play: { display: 'inline-flex' } },
    },
  },
  variants: {
    variant: {
      default: { root: {} },
      minimal: { controls: { display: 'none' } },
      mockup: { root: { 'border-radius': '{radius.overlay}', 'box-shadow': '{shadow.2xl}', border: '{border.width.thin} solid color-mix(in srgb, {color.fg-inverse} 14%, transparent)' } },
    },
    size: {
      sm: { root: { 'max-width': '{size.container.xs}' } },
      md: { root: { 'max-width': '720px' } },
      lg: { root: { 'max-width': '960px' } },
    },
  },
  extraCss: `
.cn-video-player__play .cn-icon { width: {size.icon.xl}; height: {size.icon.xl}; margin-inline-start: {space.0.5}; }
.cn-video-player__play:hover { background-color: {color.bg-surface}; }
.cn-video-player__play:focus-visible { outline: none; box-shadow: {shadow.lg}, {shadow.focus}; }
.cn-video-player__button .cn-icon { width: {size.icon.lg}; height: {size.icon.lg}; }
.cn-video-player__button:hover { background-color: color-mix(in srgb, {color.fg-inverse} 12%, transparent); }
.cn-video-player__button[aria-pressed="true"] { background-color: color-mix(in srgb, {color.fg-inverse} 16%, transparent); }
.cn-video-player__button:focus-visible, .cn-video-player__progress:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-video-player__progress:hover { height: {space.1}; }
.cn-video-player[data-variant="minimal"][data-state="playing"] .cn-video-player__controls { display: flex; }`,
  examples: [
    ex('Default (paused)', player('default', 'md', 'paused', `${PLAY}${bar(false, 22, '0:42 / 3:18')}`), 'Poster, centered play button and the full bar. The progress line is 2px and grows on hover.'),
    ex('Playing, large', player('default', 'lg', 'playing', `${PLAY}${bar(true, 58, '1:54 / 3:18')}`), 'data-state="playing" hides the big play button; the bar shows pause.'),
    ex('Minimal, small', player('minimal', 'sm', 'paused', PLAY), 'Poster and play button only, for cards and documentation; the bar appears once playing.'),
    ex('Mockup for a marketing section', player('mockup', 'lg', 'paused', `${PLAY}${bar(false, 0, '0:00 / 2:05')}`), 'The same chrome inside a framed, shadowed shot. Never inside the app shell.'),
  ],
  rules: [
    'Always 16:9 unless the source is vertical; the frame keeps its ratio while loading so the page does not jump.',
    'Show a real poster frame, never a black rectangle; the big play button is the only overlay on it.',
    'The bar holds at most six controls: play/pause, volume, time on the left; captions, settings, full screen on the right. Extra features go in the settings menu.',
    'The time label is "elapsed / total" in the mono style with tabular figures; show a live stream as "LIVE" with a red dot instead.',
    'Hide the bar 3 seconds after the pointer leaves while playing; show it on hover, focus or touch. Never hide it while paused.',
    'Never autoplay with sound. Autoplay muted only for decorative loops on marketing pages, with a visible play/pause control.',
    'sm inside cards and side panels, md on content pages, lg in marketing sections; mockup only on marketing pages.',
    'Captions are a toggle (aria-pressed) and default to on when the viewer\'s system prefers captions.',
  ],
  a11y: [
    'Root is a labelled region; the <video> has a title and, for real content, captions (WebVTT) and an audio description track when available.',
    'Every control is a <button> with an aria-label; play/pause changes its label with the state and captions uses aria-pressed.',
    'The progress line is role="slider" with aria-valuemin/max/now and a text alternative for the time; Left/Right seek 5 seconds, Home/End jump.',
    'Keyboard: Space or K toggles play, M mutes, F enters full screen, C toggles captions; Escape leaves full screen.',
    'Focus rings stay visible on the dark chrome (the ring color is independent of the theme); never remove outline without the box-shadow ring.',
  ],
  related: ['media-frame', 'carousel', 'icon-button', 'progress'],
};
