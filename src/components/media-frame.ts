import type { ComponentSpec } from '../types.ts';
import { ex, typeStyle } from './_shared.ts';

/** Inline SVG placeholder: neutral fill with one diagonal line, 16:9. */
const PLACEHOLDER = `<svg class="cn-media-frame__media" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Placeholder image"><rect width="160" height="90" fill="var(--cn-color-bg-muted)"/><path d="M0 90L160 0" stroke="var(--cn-color-border-strong)" stroke-width="1"/></svg>`;

export const mediaFrame: ComponentSpec = {
  name: 'MediaFrame',
  slug: 'media-frame',
  category: 'media',
  description: 'A figure that holds an image or video at a fixed aspect ratio: a clipping frame with a subtle fill, an optional hairline, an optional flat text overlay, and a caption below. The frame clips; the figure does not, so captions never get cut.',
  usage: 'Use for every image or video in the product: company logos in cards, screenshots in help articles, thumbnails in lists, a video in an empty state. Never place a raw <img> in a layout; the frame guarantees the ratio, the loading placeholder and the radius.',
  anatomy: [
    { part: 'root', element: 'figure', description: 'The figure. Sets width; overflow visible so the caption sits below. data-ratio / data-radius / data-fit, optional data-bordered, data-state="loading".' },
    { part: 'frame', element: 'div', description: 'The clipping box: aspect-ratio, radius, subtle fill, overflow hidden. Holds media and overlay.' },
    { part: 'media', element: 'img', description: 'The <img>, <video> or inline <svg>. Fills the frame; object-fit from data-fit. Always has alt (or aria-label for svg).' },
    { part: 'overlay', element: 'div', description: 'Optional flat scrim over the media with inverse text at the bottom-left: a title, a duration, a label. No gradient.', optional: true },
    { part: 'caption', element: 'figcaption', description: 'body-xs muted line under the frame: source, date, what the image shows.', optional: true },
  ],
  props: {
    ratio: {
      values: ['auto', '1:1', '4:3', '3:2', '16:9'],
      default: '16:9',
      description: 'Aspect ratio of the frame. auto = the media’s own height (logos, inline illustrations); 1:1 = avatars, product shots; 4:3 = documents and screenshots; 3:2 = photos; 16:9 = video and hero thumbnails (default).',
    },
    radius: {
      values: ['none', 'md', 'xl', '2xl'],
      default: 'xl',
      description: 'Corner radius of the frame. none = full-bleed inside a card with padding none; md = small thumbnails in rows; xl = default for cards and articles; 2xl = hero media on marketing pages.',
    },
    fit: {
      values: ['cover', 'contain'],
      default: 'cover',
      description: 'cover = fills the frame and crops (photos, screenshots); contain = shows the whole media on the subtle fill (logos, diagrams).',
    },
  },
  states: {
    loading: { selector: '[data-state="loading"]', description: 'Media not yet available: the frame shows the skeleton shimmer and the media is hidden.', markup: 'data-state="loading" on the figure' },
    bordered: { selector: '[data-bordered]', description: 'Adds the default hairline around the frame, for light media on white surfaces (logos, screenshots).', markup: 'data-bordered attribute on the figure' },
  },
  base: {
    root: { display: 'block', width: '100%', 'min-width': '0', margin: '0', overflow: 'visible' },
    frame: {
      position: 'relative',
      width: '100%',
      'aspect-ratio': '16 / 9',
      'background-color': '{color.bg-subtle}',
      'border-radius': '{radius.xl}',
      border: '{border.width.thin} solid transparent',
      overflow: 'hidden',
    },
    media: { display: 'block', width: '100%', height: '100%', 'object-fit': 'cover' },
    overlay: {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': 'flex-end',
      padding: '{space.4}',
      'background-color': '{color.bg-overlay}',
      color: '{color.fg-inverse}',
      ...typeStyle('label-md'),
    },
    caption: { ...typeStyle('body-xs'), color: '{color.fg-muted}', padding: '{space.2} 0 0' },
    '@states': {
      loading: {
        frame: {
          'background-image': 'linear-gradient(90deg, {color.bg-muted} 0%, {color.bg-subtle} 50%, {color.bg-muted} 100%)',
          'background-size': '200% 100%',
          animation: 'cn-media-frame-shimmer 1.4s ease-in-out infinite',
        },
        media: { visibility: 'hidden' },
      },
      bordered: { frame: { 'border-color': '{color.border-default}' } },
    },
  },
  variants: {
    ratio: {
      auto: { frame: { 'aspect-ratio': 'auto' }, media: { height: 'auto' } },
      '1:1': { frame: { 'aspect-ratio': '1 / 1' } },
      '4:3': { frame: { 'aspect-ratio': '4 / 3' } },
      '3:2': { frame: { 'aspect-ratio': '3 / 2' } },
      '16:9': { frame: { 'aspect-ratio': '16 / 9' } },
    },
    radius: {
      none: { frame: { 'border-radius': '{radius.none}' } },
      md: { frame: { 'border-radius': '{radius.md}' } },
      xl: { frame: { 'border-radius': '{radius.xl}' } },
      '2xl': { frame: { 'border-radius': '{radius.2xl}' } },
    },
    fit: {
      cover: { media: { 'object-fit': 'cover' } },
      contain: { media: { 'object-fit': 'contain', padding: '{space.4}' } },
    },
  },
  extraCss: `
@keyframes cn-media-frame-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`,
  examples: [
    ex('Default (16:9, radius xl, cover)', `<figure class="cn-media-frame" data-ratio="16:9" data-radius="xl" data-fit="cover" style="width:320px"><div class="cn-media-frame__frame">${PLACEHOLDER}</div><figcaption class="cn-media-frame__caption">Osaka port, container terminal · Photo: Nakamura Trading Co.</figcaption></figure>`),
    ex('Square thumbnail, bordered, radius md', `<figure class="cn-media-frame" data-ratio="1:1" data-radius="md" data-fit="contain" data-bordered style="width:96px"><div class="cn-media-frame__frame">${PLACEHOLDER.replace('preserveAspectRatio="xMidYMid slice"', 'preserveAspectRatio="xMidYMid meet"')}</div></figure>`, 'contain keeps logos whole on the subtle fill; the hairline separates light logos from a white card.'),
    ex('4:3 with overlay', `<figure class="cn-media-frame" data-ratio="4:3" data-radius="xl" data-fit="cover" style="width:280px"><div class="cn-media-frame__frame">${PLACEHOLDER}<div class="cn-media-frame__overlay">How agents verify a company · 3:40</div></div></figure>`, 'The overlay is a flat scrim with inverse text; no gradient.'),
    ex('Loading', `<figure class="cn-media-frame" data-ratio="3:2" data-radius="xl" data-fit="cover" data-state="loading" style="width:240px" aria-busy="true"><div class="cn-media-frame__frame">${PLACEHOLDER}</div><figcaption class="cn-media-frame__caption">Loading preview…</figcaption></figure>`),
    ex('Auto ratio, no radius (full bleed)', `<figure class="cn-media-frame" data-ratio="auto" data-radius="none" data-fit="cover" style="width:320px"><div class="cn-media-frame__frame"><svg class="cn-media-frame__media" viewBox="0 0 160 40" role="img" aria-label="Placeholder banner"><rect width="160" height="40" fill="var(--cn-color-bg-muted)"/><path d="M0 40L160 0" stroke="var(--cn-color-border-strong)" stroke-width="1"/></svg></div></figure>`, 'auto takes the media’s own height. Use inside a Card with padding none.'),
  ],
  rules: [
    'Every image and video in the product lives in a MediaFrame; a raw <img> in a layout is a lint error.',
    'Pick the ratio from the content, not the space: 1:1 logos and avatars, 4:3 screenshots, 3:2 photos, 16:9 video. Do not stretch a screenshot into 16:9.',
    'Width comes from the layout (100% of its column); set it inline only in isolated thumbnails.',
    'Logos and diagrams use fit="contain" and data-bordered; photos use cover without a border.',
    'The overlay is flat (bg-overlay) with one line of label-md inverse text at the bottom-left. No gradients, no blur, no second line.',
    'Captions are body-xs muted, one line, below the frame: source, date, or what the picture shows. They are not titles.',
    'Radius matches the container: md in rows, xl in cards, 2xl on marketing heroes, none when the media bleeds to the card edge.',
    'Show data-state="loading" only for network images; inline SVGs render immediately.',
  ],
  a11y: [
    'Every <img> has alt text that says what it shows; decorative images use alt="" and the figure gets no caption.',
    'Inline SVG media uses role="img" with aria-label; videos have captions or a transcript.',
    'The figcaption is the accessible description; do not repeat the alt text in it.',
    'Overlay text keeps AA contrast on the scrim (inverse text on bg-overlay); never place text over unscrimmed media.',
  ],
  related: ['card', 'skeleton', 'avatar'],
};
