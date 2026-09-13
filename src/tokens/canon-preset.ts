// Canon foundations: white surfaces, neutral greys and Vera's orchid accent.
// Legacy values are read only when editing a design created before this direction.
import type { DeepPartial, Seeds, Tokens } from '../types.ts';
import { buildScale } from '../color.js';
import { readFileSync } from 'node:fs';

export const CANON_BRAND = '#B4309F';
const NEUTRAL = { '50': '#FAFAFA', '100': '#F3F4F5', '200': '#E5E7E9', '300': '#CED2D6', '400': '#9EA5AD', '500': '#68727D', '600': '#515C67', '700': '#3F4A55', '800': '#2F3942', '900': '#232B33', '950': '#151B21' };
const flat = { light: '0 0 0 0 transparent', dark: '0 0 0 0 transparent' };
const scale = (seed: string) => buildScale(seed) as Record<string, string>;

export const CANON_OVERRIDES: DeepPartial<Tokens> = {
  color: {
    primitive: {
      neutral: NEUTRAL, brand: scale(CANON_BRAND),
      red: scale('#B54737'), amber: scale('#A1641B'),
      green: scale('#397852'), blue: scale('#32679B'),
    },
    semantic: {
      'bg-canvas': { light: '{white}', dark: '{neutral.950}' },
      'bg-surface': { light: '{white}', dark: '{neutral.900}' },
      'bg-surface-raised': { light: '{white}', dark: '{neutral.800}' },
      'bg-subtle': { light: '{neutral.50}', dark: '{neutral.800}' },
      'bg-muted': { light: '{neutral.100}', dark: '{neutral.700}' },
      'bg-overlay': { light: 'rgba(21, 27, 33, 0.48)', dark: 'rgba(8, 12, 16, 0.72)' },
      'bg-action': { light: '{brand.600}', dark: '{brand.300}' },
      'bg-action-hover': { light: '{brand.700}', dark: '{brand.200}' },
      'bg-action-active': { light: '{brand.800}', dark: '{brand.100}' },
      'bg-action-subtle': { light: '{neutral.100}', dark: '{neutral.800}' },
      'bg-accent': { light: '{brand.600}', dark: '{brand.400}' },
      'bg-accent-subtle': { light: '{neutral.100}', dark: '{neutral.800}' },
      'fg-default': { light: '{neutral.900}', dark: '{neutral.50}' },
      'fg-muted': { light: '{neutral.600}', dark: '{neutral.300}' },
      'fg-subtle': { light: '{neutral.500}', dark: '{neutral.400}' },
      'fg-placeholder': { light: '{neutral.500}', dark: '{neutral.400}' },
      'fg-on-action': { light: '{white}', dark: '{brand.950}' },
      'fg-on-accent': { light: '{white}', dark: '{brand.950}' },
      'fg-action': { light: '{brand.700}', dark: '{brand.300}' },
      'fg-accent': { light: '{brand.700}', dark: '{brand.300}' },
      'fg-link': { light: '{brand.700}', dark: '{brand.300}' },
      'fg-link-hover': { light: '{brand.800}', dark: '{brand.200}' },
      'border-control': { light: '{neutral.300}', dark: '{neutral.600}' },
      'border-control-hover': { light: '{neutral.500}', dark: '{neutral.400}' },
      'border-action': { light: '{brand.600}', dark: '{brand.300}' },
      'ring-focus': { light: 'rgba(180, 48, 159, 0.28)', dark: 'rgba(229, 169, 218, 0.4)' },
    },
  },
  font: {
    size: { '2xs': '11px', xs: '12px', sm: '13px', md: '14px', lg: '16px', xl: '18px', '2xl': '22px', '3xl': '28px', '4xl': '34px', '5xl': '42px', '6xl': '56px', '7xl': '68px', '8xl': '80px' },
  },
  type: {
    'kicker': { family: '{font.family.mono}', size: '{font.size.2xs}', weight: '{font.weight.medium}', lineHeight: '1.5', letterSpacing: '0.08em', transform: 'uppercase', description: 'A small, tracked mono label for orientation. Use ink, with a short rule to introduce major sections.' },
  },
  radius: { control: '6px', card: '10px', panel: '8px', overlay: '12px' },
  shadow: {
    xs: { ...flat, description: 'Resting controls are flat. Borders and surface color separate them.' },
    sm: { ...flat, description: 'Resting cards and selected segments do not float.' },
    control: { ...flat, description: 'Flat button fill, without an inset bevel.' },
    md: { light: '0 8px 24px -8px rgba(21, 30, 25, 0.14)', dark: '0 8px 24px -8px rgba(0, 0, 0, 0.45)' },
    lg: { light: '0 16px 48px -16px rgba(21, 30, 25, 0.22)', dark: '0 16px 48px -16px rgba(0, 0, 0, 0.6)' },
    focus: { light: '0 0 0 3px {color.ring-focus}', dark: '0 0 0 3px {color.ring-focus}' },
    'focus-danger': { light: '0 0 0 3px {color.ring-danger}', dark: '0 0 0 3px {color.ring-danger}' },
  },
  size: { icon: { xs: '12px', sm: '16px', md: '20px', lg: '24px', xl: '28px', '2xl': '32px' } },
  motion: { duration: { fast: '140ms', normal: '200ms', slow: '280ms' } },
};

/** Migration must compare old designs with their original defaults. */
export function legacyPresetDefaults(seeds: Seeds): DeepPartial<Tokens> {
  return seeds.overrides?.color?.primitive?.brand?.['600'] === '#7F56D9'
    ? JSON.parse(readFileSync(new URL('./legacy-canon.json', import.meta.url), 'utf8')) as DeepPartial<Tokens>
    : CANON_OVERRIDES;
}
