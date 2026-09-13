// Schema of a Canon design system. Everything the tool reads or writes is
// described here. Token references use the form "{group.path}" and are
// resolved to CSS custom properties at build time (see tokens/resolve.ts).

export type Hex = string;
export type Ref = string; // "{space.3}", "{color.bg-canvas}", "{neutral.500}"
export type CssValue = string; // literal or contains refs

export interface Themed { light: string; dark: string }

export interface TypeStyle {
  family: Ref;        // {font.family.sans}
  size: Ref;          // {font.size.sm}
  weight: Ref;        // {font.weight.medium}
  lineHeight: Ref;    // {font.lineHeight.snug}
  letterSpacing: Ref; // {font.letterSpacing.tight}
  transform?: 'uppercase' | 'none';
  description?: string;
}

export interface Tokens {
  color: {
    /** 11-step scales (50…950) plus flat colors (white, black). */
    primitive: Record<string, Record<string, Hex> | Hex>;
    /** Role-based colors, each with a light and a dark value (refs or literals). */
    semantic: Record<string, Themed & { description?: string }>;
  };
  font: {
    family: Record<string, string>;
    size: Record<string, string>;
    weight: Record<string, string>;
    lineHeight: Record<string, string>;
    letterSpacing: Record<string, string>;
    /** Font size of a control (button, input) per control size. */
    control: Record<string, string>;
  };
  /** Composite text styles (display-lg, body-md, label-sm …). */
  type: Record<string, TypeStyle>;
  space: Record<string, string>;
  radius: Record<string, string>;
  border: { width: Record<string, string> };
  shadow: Record<string, Themed & { description?: string }>;
  size: {
    control: Record<string, string>;
    controlPadding: Record<string, string>;
    controlIcon: Record<string, string>;
    icon: Record<string, string>;
    container: Record<string, string>;
  };
  z: Record<string, string>;
  motion: { duration: Record<string, string>; easing: Record<string, string> };
  breakpoint: Record<string, string>;
  opacity: Record<string, string>;
}

/** What `canon init` asks for. Everything else is derived. */
export interface Seeds {
  name: string;
  prefix: string;
  brand: Hex;             // identity + default action color
  action?: Hex;           // optional: separate action color (e.g. charcoal buttons)
  neutralHue?: number;    // tint of greys (0 = pure grey)
  neutralChroma?: number; // 0…0.02
  canvasLight?: Hex;      // off-white page background
  inkDark?: Hex;          // darkest neutral (text / dark canvas)
  fontSans?: string;
  fontMono?: string;
  fontDisplay?: string;
  radiusScale?: number;   // multiplier: 0 = sharp, 1 = default, 2 = rounder
  baseFontSize?: number;  // 14 = dense app, 16 = editorial
  controlHeight?: number; // md control height in px (36 default)
  shadowTint?: Hex;       // tinted shadows (e.g. plum for Vera)
  defaultTheme?: 'light' | 'dark';
  /** Preset defaults, cleared selectively by explicit seed choices. */
  presetOverrides?: DeepPartial<Tokens>;
  /** Deliberate token overrides, applied after preset defaults and seed choices. */
  overrides?: DeepPartial<Tokens>;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface SystemMeta {
  name: string;
  prefix: string;
  version: string;
  description?: string;
  /** Art direction the agent must respect; free text, shown at the top of DESIGN.md. */
  direction: {
    summary: string;
    principles: string[];
    never: string[];
  };
  seeds: Seeds;
  defaultTheme: 'light' | 'dark';
  /** Where `canon build` writes. Relative to the design dir. */
  out: string;
  /** Lint configuration. */
  lint: {
    include: string[];
    exclude: string[];
    /** Allow raw values in these files (globs) */
    allow: string[];
    tailwind: boolean;
  };
  icons: { set: string; strokeWidth: string; note: string };
}

// ---------------------------------------------------------------- components

export type Declarations = Record<string, CssValue>;

/** Styles for parts of a component, optionally with per-state overrides. */
export interface StyleBlock {
  [part: string]: Declarations | Record<string, Record<string, Declarations>> | undefined;
  /** '@states': { hover: { root: {...}, icon: {...} } } */
  '@states'?: Record<string, Record<string, Declarations>>;
}

export interface AnatomyPart {
  part: string;      // 'root' | 'label' | ...
  element: string;   // suggested html element
  description: string;
  optional?: boolean;
}

export interface PropSpec {
  values: string[];
  default: string;
  description: string;
}

export interface StateSpec {
  /** CSS selector suffix applied to the root, e.g. ':hover:not(:disabled)' or '[data-state="open"]' */
  selector: string;
  description: string;
  /** How the state is triggered in markup (for the docs). */
  markup?: string;
}

export interface Example {
  title: string;
  html: string;
  description?: string;
}

export interface ComponentSpec {
  name: string;
  slug: string;
  category:
    | 'actions' | 'forms' | 'feedback' | 'navigation' | 'data-display'
    | 'overlays' | 'layout' | 'typography' | 'media';
  description: string;
  usage: string;            // when to use / when not
  anatomy: AnatomyPart[];
  props: Record<string, PropSpec>;
  states: Record<string, StateSpec>;
  base: StyleBlock;
  variants: Record<string, Record<string, StyleBlock>>;
  compound?: { when: Record<string, string>; block: StyleBlock }[];
  examples: Example[];
  rules: string[];
  a11y: string[];
  related: string[];
  /** Extra raw CSS (keyframes, etc.) appended verbatim after the component. Use {ref} freely. */
  extraCss?: string;
  /** Composition patterns: ready-made combinations rendered in preview + docs. */
  recipes?: Example[];
}

export interface System {
  meta: SystemMeta;
  tokens: Tokens;
  components: ComponentSpec[];
  /** Page-level patterns (page shell, form layout, table page …) */
  patterns: Pattern[];
}

export type PatternCategory = 'app-layout' | 'app-section' | 'app-page' | 'marketing-section' | 'marketing-page' | 'shared-page' | 'email';

export interface Pattern {
  name: string;
  slug: string;
  category: PatternCategory;
  description: string;
  rules: string[];
  /** Primary example (full HTML using system classes). */
  html: string;
  /** Alternate layouts of the same section/page. */
  variants?: { title: string; description?: string; html: string }[];
  css?: string;
  /** Viewport hint for the gallery frame: 'desktop' (1280) | 'mobile' (375) | 'both' */
  viewport?: 'desktop' | 'mobile' | 'both';
}

// ---------------------------------------------------------------- resolved

export interface ResolvedToken {
  ref: Ref;
  cssVar: string;       // --cn-space-3
  light: string;        // resolved literal
  dark: string;         // resolved literal (same as light when not themed)
  themed: boolean;
  group: string;        // 'space'
  path: string;         // '3'
  description?: string;
  tailwind?: string;    // suggested tailwind utility, if any
}
