import type { Seeds, SystemMeta } from '../types.ts';
import { CANON_BRAND, CANON_OVERRIDES } from './canon-preset.ts';

export interface Preset {
  id: string;
  label: string;
  seeds: Omit<Seeds, 'name' | 'prefix'>;
  direction: SystemMeta['direction'];
}

const NEVER_COMMON = [
  'Generic "SaaS dashboard" layouts: a grid of identical cards with soft shadows and an icon in a colored circle.',
  'Purple/blue gradients, glassmorphism, glowing borders, neon accents, floating blobs as decoration.',
  'Raw hex/rgb/hsl colors, raw px sizes, or Tailwind palette classes (bg-blue-500) anywhere outside the token file.',
  'Inventing a new component, variant, size or color when an existing one is listed in the spec.',
  'Rounded-full pill buttons mixed with rounded-md buttons on the same screen; mixing radii.',
  'Emoji as icons in product UI. Use the icon set defined in the spec.',
  'Centered hero text with three feature cards below it as the default landing layout.',
  'Placeholder copy such as "Lorem ipsum", "Feature 1", "Your company" in delivered UI.',
  'More than one primary (filled action) button visible in the same view region.',
  'Colored text for emphasis when weight, size or the kicker style would do.',
  'Box-shadow on everything. Shadows are for floating layers; resting surfaces use a 1px hairline.',
];

export const PRESETS: Record<string, Preset> = {
  canon: {
    id: 'canon',
    label: 'Canon (white, neutral greys, Vera pink accents, DM Sans)',
    seeds: {
      brand: CANON_BRAND,
      neutralHue: 255,
      neutralChroma: 0.003,
      canvasLight: '#FFFFFF',
      inkDark: '#151B21',
      fontSans: '"DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
      fontMono: '"IBM Plex Mono", ui-monospace, "SF Mono", monospace',
      radiusScale: 0.75,
      baseFontSize: 14,
      controlHeight: 40,
      defaultTheme: 'light',
      overrides: CANON_OVERRIDES,
    },
    direction: {
      summary: 'Canon keeps a white canvas, neutral grey surfaces and familiar product layouts. Its character lives in the details: Vera’s orchid pink for actions, DM Sans, flat controls and compact corners. IBM Plex Mono labels technical details; surface and text color mark navigation selection.',
      principles: [
        'Large surfaces stay white or neutral grey. Pink is a small action or selection detail; do not tint the page background.',
        'Controls are 40px with 14px medium text and 6px corners. Use a flat fill or a single outline, without a bevel or resting shadow.',
        'Cards have 10px corners and a hairline. Hover and selection strengthen the outline. Reserve elevation for floating layers.',
        'DM Sans for reading and headings; IBM Plex Mono for compact section labels, IDs and code. Product headings are 22–34px, with short, useful copy.',
        'Navigation distinguishes hover from selection: quiet hover, a persistent line or solid segment for the current view. Do not turn every label into a pill.',
        'Featured icons use a simple outlined frame with a small corner cut; avoid concentric rings. Use one only when it helps identify the block.',
        'Focus uses a visible 3px ring in both themes. Dark surfaces use lighter pink actions with dark ink labels.',
      ],
      never: [...NEVER_COMMON, 'Inset bevels, concentric icon halos or purple as the default brand palette.', 'A hover state that looks selected when it is not.', 'Low-contrast labels on either theme; check the foreground against its actual surface.'],
    },
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial (neutral ink on paper, mono kickers)',
    seeds: {
      brand: '#1F1F1F',
      neutralHue: 260,
      neutralChroma: 0.004,
      canvasLight: '#FAFAFA',
      inkDark: '#171717',
      radiusScale: 1,
      baseFontSize: 14,
      controlHeight: 36,
      defaultTheme: 'light',
    },
    direction: {
      summary: 'Quiet, precise, editorial. Ink on paper. One action color, hairline borders, generous whitespace, mono uppercase kickers as the signature. The UI should feel hand-fitted, not generated.',
      principles: [
        'Hierarchy through weight and size, not color. Color means something (action, status, brand) or it is not there.',
        'One primary action per view. Everything else is secondary, ghost or a link.',
        '1px hairlines separate; shadows only float (menus, dialogs). Resting cards do not cast shadows.',
        'Density follows the job: tables and lists are dense (body-sm, 8px vertical rhythm); reading surfaces are airy (body-lg, 24–32px rhythm).',
        'Motion is short (120–260ms) and only confirms an interaction. Nothing moves on its own except a loading indicator.',
        'Text is left-aligned. Centering is for empty states and marketing heroes only.',
        'The kicker (mono, uppercase, tracked) labels sections; headings carry meaning; body text explains. Never skip a level.',
      ],
      never: NEVER_COMMON,
    },
  },
  vera: {
    id: 'vera',
    label: 'Vera / Vero family (orchid + charcoal, Geist)',
    seeds: {
      brand: '#B4309F',
      action: '#2B2B2B',
      neutralHue: 304,
      neutralChroma: 0.003,
      canvasLight: '#F1F0F2',
      inkDark: '#1F1F1F',
      fontSans: '"Geist", "Inter", system-ui, sans-serif',
      fontMono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
      radiusScale: 1.25,
      baseFontSize: 14,
      controlHeight: 40,
      shadowTint: '#2E142A',
      defaultTheme: 'light',
    },
    direction: {
      summary: 'The Vera family look: slightly lilac off-white canvas (#F1F0F2), white cards with #E3E3E3 hairlines, charcoal as the action color, orchid reserved for brand moments and "an agent is working" presence. Geist everywhere; Geist Mono uppercase kicker with a 6×6 orchid square before section titles. Top navigation with 4–5 question-shaped tabs, kanban boards, drawers instead of detail pages.',
      principles: [
        'Charcoal is the action. Orchid is identity and liveness — never body text, never a big fill.',
        'Cards are white on the lilac canvas with a 1px #E3E3E3 border and radius 10–14px. Shadows are plum-tinted and only on floating layers.',
        'Every section starts with a kicker: a 6×6px orchid square + Geist Mono uppercase label.',
        'Navigation is a top bar with few tabs phrased as user questions; detail opens in a drawer, not a new page.',
        'Agents are colleagues: show presence (dot), state pill ("trabalhando") and a live "agora" line.',
        'Chips are mono uppercase pills: accent (#FBEAFA/#7A1F6D), grey (#F2F2F2/#737373), amber (#FDF4E3/#B07908).',
        'Transitions 180ms ease; respect prefers-reduced-motion.',
      ],
      never: [...NEVER_COMMON, 'Pure black shadows (use the plum tint).', 'Blue links or blue CTAs.', 'A left sidebar with one entry per database table.'],
    },
  },
  clean: {
    id: 'clean',
    label: 'Clean (white, black buttons, one green detail)',
    seeds: {
      brand: '#10A37F',
      action: '#0D0D0D',
      neutralHue: 0,
      neutralChroma: 0,
      canvasLight: '#FFFFFF',
      inkDark: '#0D0D0D',
      fontSans: '"Inter", system-ui, -apple-system, sans-serif',
      radiusScale: 1.33,
      baseFontSize: 14,
      controlHeight: 40,
      defaultTheme: 'light',
    },
    direction: {
      summary: 'White canvas, black primary buttons, hairline greys. The single accent green appears only in small details (a status dot, a selected tick, the progress meter). Text does most of the work.',
      principles: [
        'Black is the action; green is a detail, not a fill.',
        'One primary action per screen. Secondary actions are outline or text.',
        'Surfaces are white on white, separated by 1px #E5E5E5 hairlines, never by shadows.',
        'Generous whitespace and short line lengths (≤ 65ch).',
      ],
      never: [...NEVER_COMMON, 'Green as button fill or heading color.'],
    },
  },
  dark: {
    id: 'dark',
    label: 'Dark (near-black canvas, white action, x.ai-like)',
    seeds: {
      brand: '#FFFFFF',
      action: '#FFFFFF',
      neutralHue: 0,
      neutralChroma: 0,
      canvasLight: '#FAFAFA',
      inkDark: '#0A0A0A',
      fontSans: '"Inter", system-ui, -apple-system, sans-serif',
      fontMono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
      radiusScale: 1,
      baseFontSize: 14,
      controlHeight: 36,
      defaultTheme: 'dark',
    },
    direction: {
      summary: 'Dark by default: near-black canvas, #161616 surfaces, white text and white primary buttons. Monochrome, technical, restrained. Light theme exists but the product is designed dark-first.',
      principles: [
        'Monochrome: white is the action; greys build hierarchy. Color only for status.',
        'Borders are low-contrast (#262626); surfaces are separated by tone more than by lines.',
        'No glow, no gradients. Depth comes from tone steps (canvas → surface → raised).',
      ],
      never: [...NEVER_COMMON, 'Neon accents, glowing borders, gradient text.'],
    },
  },
};
