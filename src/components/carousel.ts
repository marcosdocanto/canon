import type { ComponentSpec } from '../types.ts';
import { RESET_BUTTON, TRANSITION_COLORS, ex, typeStyle } from './_shared.ts';

// Carousel: a clipped viewport with a flex track of slides, 40px round prev/next
// controls (inside the viewport or in a row below it), dot or line indicators and
// an optional caption on a scrim. Static in the gallery; the app moves the track.

const CHEVRON_L = '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4l-4 4 4 4"/></svg>';
const CHEVRON_R = '<svg class="cn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4l4 4-4 4"/></svg>';

/** Muted 16:9 scenes so slides render without the network. */
const SCENES = [
  `<circle cx="480" cy="104" r="40" style="fill:var(--cn-color-bg-surface)"/><path d="M0 300L150 168l110 92 100-130 280 170v60H0z" style="fill:var(--cn-color-border-strong)"/>`,
  `<rect x="72" y="64" width="232" height="112" rx="12" style="fill:var(--cn-color-bg-surface)"/><rect x="336" y="64" width="232" height="112" rx="12" style="fill:var(--cn-color-bg-surface)"/><rect x="72" y="208" width="496" height="88" rx="12" style="fill:var(--cn-color-bg-surface)"/><path d="M96 272l60-28 70 18 66-40 80 22 96-44" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--cn-color-bg-action)"/>`,
  `<rect x="200" y="72" width="240" height="216" rx="16" style="fill:var(--cn-color-bg-surface)"/><circle cx="320" cy="150" r="36" style="fill:var(--cn-color-border-strong)"/><rect x="248" y="212" width="144" height="12" rx="6" style="fill:var(--cn-color-border-default)"/><rect x="272" y="240" width="96" height="12" rx="6" style="fill:var(--cn-color-border-default)"/>`,
];
const scene = (i: number, label: string) =>
  `<span class="cn-placeholder" data-radius="none"><svg viewBox="0 0 640 360" role="img" aria-label="${label}"><rect width="640" height="360" style="fill:var(--cn-color-bg-muted)"/>${SCENES[i % SCENES.length]}</svg></span>`;

const slide = (i: number, total: number, inner: string) => `<div class="cn-carousel__slide" role="group" aria-roledescription="slide" aria-label="${i} of ${total}">${inner}</div>`;
const controls = (disabledPrev = false) =>
  `<div class="cn-carousel__controls"><button type="button" class="cn-carousel__control" aria-label="Previous slide"${disabledPrev ? ' disabled' : ''}>${CHEVRON_L}</button><button type="button" class="cn-carousel__control" aria-label="Next slide">${CHEVRON_R}</button></div>`;
const indicators = (n: number, current: number) =>
  `<div class="cn-carousel__indicators" role="group" aria-label="Choose slide">${Array.from({ length: n }, (_, i) => `<button type="button" class="cn-carousel__indicator" aria-label="Go to slide ${i + 1}"${i + 1 === current ? ' aria-current="true"' : ''}></button>`).join('')}</div>`;

const root = (attrs: string, inner: string, width = '640px') =>
  `<div class="cn-carousel" ${attrs} role="region" aria-roledescription="carousel" aria-label="Product tour" style="width:100%;max-width:${width}">${inner}</div>`;

const quote = (text: string, author: string, meta: string) =>
  `<p class="cn-carousel__quote">${text}</p><span class="cn-carousel__author">${author}</span><span class="cn-carousel__meta">${meta}</span>`;

export const carousel: ComponentSpec = {
  name: 'Carousel',
  slug: 'carousel',
  category: 'media',
  description: 'A clipped viewport (radius card) over a flex track of slides, with 40px round prev/next controls that sit inside the picture or in a row under it, 8px dot or 24px line indicators, and an optional caption on a scrim. The component is static; the app moves the track.',
  usage: 'Use for a small set of visual items where one at a time is enough: product screenshots, gallery photos, customer quotes, onboarding cards. Not for content people need to compare (use a grid), not for navigation, and never auto-playing text.',
  anatomy: [
    { part: 'root', element: 'div', description: 'The region (role="region", aria-roledescription="carousel"). Relative; stacks the viewport and, for controls="outside", the control row.' },
    { part: 'viewport', element: 'div', description: 'Clips the track: overflow hidden, radius card, bg-subtle. Controls, indicators and caption overlay it.' },
    { part: 'track', element: 'div', description: 'Flex row of slides that the app translates (transform) to move between them.' },
    { part: 'slide', element: 'div', description: 'One item (role="group", aria-roledescription="slide", aria-label "2 of 5"). 100% wide in single, a third in multi, a centered quote card in testimonial.' },
    { part: 'controls', element: 'div', description: 'Holds the two control buttons: absolutely centered over the viewport edges (inside) or a static right-aligned row under it (outside).', optional: true },
    { part: 'control', element: 'button', description: '40px circle, bg-surface, hairline, shadow-md, 20px chevron. aria-label "Previous slide" / "Next slide"; disabled at the ends when not looping.', optional: true },
    { part: 'indicators', element: 'div', description: 'Centered row of indicator buttons 16px above the bottom edge (role="group").', optional: true },
    { part: 'indicator', element: 'button', description: '8px dot (or 24×4 line) in bg-muted; the current one is bg-action and carries aria-current="true".', optional: true },
    { part: 'caption', element: 'div', description: 'Bottom-left text over a bg-inverse scrim (color-mix 60%), body-sm in fg-inverse. Leaves room for the indicators.', optional: true },
    { part: 'quote', element: 'p', description: 'Testimonial text, heading-md, centered.', optional: true },
    { part: 'author', element: 'span', description: 'Who said it, label-md, under the quote.', optional: true },
    { part: 'meta', element: 'span', description: 'Role and company, body-sm muted.', optional: true },
  ],
  props: {
    variant: {
      values: ['single', 'multi', 'testimonial'],
      default: 'single',
      description: 'single = one full-width slide at a time (screenshots, photos). multi = three cards visible with a 16px gap, the track scrolls by one card (feature cards, logos). testimonial = each slide is a centered quote card on bg-subtle with author and role.',
    },
    indicators: {
      values: ['dots', 'lines', 'none'],
      default: 'dots',
      description: 'dots = 8px circles (up to about 8 slides). lines = 24×4 bars, for 2–5 slides on marketing pages. none = hide the indicators when the controls or the caption already tell the position.',
    },
    controls: {
      values: ['inside', 'outside', 'none'],
      default: 'inside',
      description: 'inside = round buttons floating over the left and right edges of the picture (photos, screenshots). outside = a row of the same buttons under the viewport, right-aligned, so nothing covers the content (cards, quotes). none = swipe and indicators only (mobile, testimonials).',
    },
  },
  states: {
    current: { selector: ' .cn-carousel__indicator[aria-current="true"]', description: 'The indicator of the visible slide (on the indicator; extraCss): bg-action.', markup: 'aria-current="true" on .cn-carousel__indicator' },
    controlHover: { selector: ' .cn-carousel__control:hover', description: 'Pointer over a control (extraCss): bg-subtle fill, stronger border.', markup: 'native :hover on .cn-carousel__control' },
    controlFocus: { selector: ' .cn-carousel__control:focus-visible', description: 'Keyboard focus on a control adds the focus ring under the shadow (extraCss).', markup: 'native :focus-visible on .cn-carousel__control' },
    controlDisabled: { selector: ' .cn-carousel__control:disabled', description: 'At the first or last slide of a non-looping carousel: 50% opacity, not-allowed (extraCss).', markup: 'disabled on .cn-carousel__control' },
  },
  base: {
    root: { position: 'relative', display: 'flex', 'flex-direction': 'column', width: '100%', 'min-width': '0', color: '{color.fg-default}' },
    viewport: { position: 'relative', overflow: 'hidden', width: '100%', 'border-radius': '{radius.card}', 'background-color': '{color.bg-subtle}' },
    track: { display: 'flex', width: '100%', 'transition-property': 'transform', 'transition-duration': '{motion.duration.slow}', 'transition-timing-function': '{motion.easing.standard}' },
    slide: { position: 'relative', flex: '0 0 100%', 'min-width': '0' },
    controls: {
      position: 'absolute',
      'inset-inline': '{space.4}',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      'justify-content': 'space-between',
      'pointer-events': 'none',
      'z-index': '{z.raised}',
    },
    control: {
      ...RESET_BUTTON,
      'pointer-events': 'auto',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      width: '{space.10}',
      height: '{space.10}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-surface}',
      border: '{border.width.thin} solid {color.border-default}',
      'box-shadow': '{shadow.md}',
      color: '{color.fg-default}',
      ...TRANSITION_COLORS,
    },
    indicators: {
      position: 'absolute',
      'inset-inline': '0',
      bottom: '{space.4}',
      display: 'flex',
      'justify-content': 'center',
      'align-items': 'center',
      gap: '{space.2}',
      'pointer-events': 'none',
      'z-index': '{z.raised}',
    },
    indicator: {
      ...RESET_BUTTON,
      'pointer-events': 'auto',
      width: '{space.2}',
      height: '{space.2}',
      'border-radius': '{radius.full}',
      'background-color': '{color.bg-muted}',
      ...TRANSITION_COLORS,
    },
    caption: {
      position: 'absolute',
      'inset-inline': '0',
      bottom: '0',
      padding: '{space.4} {space.5}',
      'background-color': 'color-mix(in srgb, {color.bg-inverse} 60%, transparent)',
      color: '{color.fg-inverse}',
      ...typeStyle('body-sm'),
    },
    quote: { ...typeStyle('heading-md'), color: '{color.fg-default}', 'text-align': 'center', 'text-wrap': 'balance', 'max-width': '{size.container.sm}' },
    author: { ...typeStyle('label-md'), color: '{color.fg-default}', 'margin-top': '{space.6}' },
    meta: { ...typeStyle('body-sm'), color: '{color.fg-muted}', 'margin-top': '{space.1}' },
  },
  variants: {
    variant: {
      single: { slide: { flex: '0 0 100%' } },
      multi: {
        viewport: { 'border-radius': '{radius.none}', 'background-color': 'transparent' },
        track: { gap: '{space.4}' },
        slide: { flex: '0 0 calc((100% - 2 * {space.4}) / 3)', 'border-radius': '{radius.card}', overflow: 'hidden' },
      },
      testimonial: {
        slide: { display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', 'text-align': 'center', padding: '{space.10} {space.8} {space.12}', 'min-height': '280px' },
      },
    },
    indicators: {
      dots: { indicator: {} },
      lines: { indicator: { width: '{space.6}', height: '{space.1}' } },
      none: { indicators: { display: 'none' } },
    },
    controls: {
      inside: { controls: {} },
      outside: { controls: { position: 'static', transform: 'none', 'justify-content': 'flex-end', gap: '{space.3}', 'padding-top': '{space.4}', 'pointer-events': 'auto' } },
      none: { controls: { display: 'none' } },
    },
  },
  extraCss: `
.cn-carousel__control .cn-icon { width: {size.icon.lg}; height: {size.icon.lg}; }
.cn-carousel__control:hover:not(:disabled) { background-color: {color.bg-subtle}; border-color: {color.border-strong}; }
.cn-carousel__control:focus-visible { outline: none; box-shadow: {shadow.md}, {shadow.focus}; }
.cn-carousel__control:disabled { opacity: {opacity.disabled}; cursor: not-allowed; }
.cn-carousel__indicator[aria-current="true"] { background-color: {color.bg-action}; }
.cn-carousel__indicator:focus-visible { outline: none; box-shadow: {shadow.focus}; }
.cn-carousel:not([data-indicators="none"]) .cn-carousel__caption { padding-bottom: {space.9}; }
.cn-carousel__slide > .cn-placeholder { border-radius: 0; }`,
  examples: [
    ex('Single with caption', root('data-variant="single" data-indicators="dots" data-controls="inside"', `<div class="cn-carousel__viewport"><div class="cn-carousel__track">${slide(1, 3, scene(0, 'Lumen dashboard on a laptop'))}${slide(2, 3, scene(1, 'Reporting view'))}${slide(3, 3, scene(2, 'Mobile app'))}</div>${controls(true)}${indicators(3, 1)}<div class="cn-carousel__caption">Lumen Studio · the new reporting workspace, September 2026</div></div>`), 'Round controls float over the edges; the caption sits on a scrim and leaves room for the dots. Previous is disabled on the first slide.'),
    ex('Multi (three cards) with outside controls', root('data-variant="multi" data-indicators="none" data-controls="outside"', `<div class="cn-carousel__viewport"><div class="cn-carousel__track">${slide(1, 5, scene(1, 'Dashboards'))}${slide(2, 5, scene(2, 'Approvals'))}${slide(3, 5, scene(0, 'Mobile'))}${slide(4, 5, scene(1, 'Integrations'))}${slide(5, 5, scene(2, 'Reports'))}</div></div>${controls()}`, '760px'), 'Three cards visible with a 16px gap; the controls sit under the row so nothing covers the cards.'),
    ex('Testimonial', root('data-variant="testimonial" data-indicators="dots" data-controls="none"', `<div class="cn-carousel__viewport"><div class="cn-carousel__track">${slide(1, 3, quote('“We replaced four spreadsheets with one Lumen dashboard. The finance review went from a day to forty minutes.”', 'Elena Rossi', 'Head of Finance, Northwind Freight'))}${slide(2, 3, quote('“Approvals on the phone changed how our field team works.”', 'Tomás Silva', 'Operations Lead, Verde Farms'))}${slide(3, 3, quote('“Onboarding a new analyst takes an afternoon now.”', 'Aisha Khan', 'Data Lead, Orbit Health'))}</div>${indicators(3, 1)}</div>`), 'A centered quote card per slide; dots only, swipe to move.'),
    ex('Lines, no controls', root('data-variant="single" data-indicators="lines" data-controls="none"', `<div class="cn-carousel__viewport"><div class="cn-carousel__track">${slide(1, 4, scene(2, 'Onboarding step 1'))}${slide(2, 4, scene(0, 'Onboarding step 2'))}${slide(3, 4, scene(1, 'Onboarding step 3'))}${slide(4, 4, scene(2, 'Onboarding step 4'))}</div>${indicators(4, 2)}</div>`, '480px'), '24×4 line indicators for a short onboarding sequence; the second slide is current.'),
  ],
  rules: [
    'Three to eight slides. With one there is nothing to move; with more than eight use a grid with pagination.',
    'Never auto-play. If a marketing page insists, pause on hover and focus, stop after one loop, and offer a pause button.',
    'Controls inside only over pictures with quiet edges; over text or cards use outside so nothing is covered.',
    'Disable Previous on the first slide and Next on the last unless the carousel loops; show both buttons always.',
    'Indicators are dots up to eight slides, lines for two to five on marketing pages; hide them when a caption or counter already shows the position.',
    'Captions are one line of body-sm on the scrim, bottom-left; longer descriptions go under the carousel as text.',
    'Slides keep one aspect ratio across the set (16:9 by default); never let the height jump between slides.',
    'The viewport is the only element with overflow hidden; the track moves with transform, 260ms, and respects reduced motion.',
    'On touch, swipe moves one slide; on keyboard, Left/Right move when the region has focus.',
  ],
  a11y: [
    'Root: role="region", aria-roledescription="carousel", aria-label naming the set. Slides: role="group", aria-roledescription="slide", aria-label "2 of 5".',
    'Controls are real <button>s with aria-label "Previous slide" / "Next slide"; indicators are buttons with aria-label "Go to slide n" and aria-current="true" on the current one.',
    'Hidden slides are aria-hidden="true" and their links get tabindex="-1" so keyboard users do not tab into off-screen content.',
    'Announce slide changes with an aria-live="polite" region ("Slide 2 of 5") rather than moving focus.',
    'Images need alt text or, for decorative art, alt=""; captions that describe the slide can serve as the accessible name via aria-labelledby.',
  ],
  related: ['media-frame', 'video-player', 'card', 'icon-button', 'pagination'],
};
