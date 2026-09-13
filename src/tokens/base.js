import { buildScale, buildNeutralScale, hexToOklch, alpha } from '../color.js';

export function deepMerge(base, over) {
  if (over === undefined || over === null) return base;
  if (typeof base !== 'object' || base === null || Array.isArray(base) || typeof over !== 'object') return over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = deepMerge(base[k], v);
  return out;
}

/** Apply seed choices over preset defaults while retaining deliberate token overrides. */
export function applySeedChanges(seeds, changes = {}, legacyDefaults = {}) {
  const next = structuredClone(seeds);
  // Older designs stored preset values in overrides. Migrate when first edited.
  if (!Object.hasOwn(next, 'presetOverrides')) {
    next.presetOverrides = next.overrides ?? {};
    // Only values matching known defaults may be replaced by a seed change.
    // Older designs stored deliberate edits in this same layer as well.
    next.overrides = tokenDifferences(next.overrides ?? {}, legacyDefaults) ?? {};
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || (key === 'action' && value === '')) delete next[key];
    else if (key === 'overrides') next.overrides = deepMerge(next.overrides ?? {}, value);
    else next[key] = structuredClone(value);
  }
  const clear = (...paths) => {
    for (const path of paths) {
      const parts = path.split('.');
      let parent = next.presetOverrides;
      for (const key of parts.slice(0, -1)) parent = parent?.[key];
      if (parent) delete parent[parts.at(-1)];
    }
  };
  const has = (key) => Object.hasOwn(changes, key);
  if (has('brand')) clear('color.primitive.brand', 'color.semantic.ring-focus');
  if (has('action') || (has('brand') && !next.action)) {
    clear(...['bg-action', 'bg-action-hover', 'bg-action-active', 'bg-action-subtle', 'fg-on-action', 'fg-action', 'border-action', 'ring-focus'].map(k => `color.semantic.${k}`));
  }
  if (['canvasLight', 'inkDark', 'neutralHue', 'neutralChroma'].some(has)) clear('color.primitive.neutral');
  if (has('canvasLight')) clear('color.semantic.bg-canvas.light');
  if (has('fontSans')) clear('font.family.sans', 'font.family.display');
  if (has('fontDisplay')) clear('font.family.display');
  if (has('fontMono')) clear('font.family.mono');
  if (has('baseFontSize')) clear('font.size', 'font.control', 'type');
  if (has('radiusScale')) clear('radius');
  if (has('controlHeight')) clear('size.control');
  if (has('shadowTint')) clear('shadow');
  return next;
}

/** Preserve hand-edited tokens when an existing design is regenerated from seeds. */
export function tokenDifferences(actual, derived) {
  if (JSON.stringify(actual) === JSON.stringify(derived)) return undefined;
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return actual;
  const difference = {};
  for (const [key, value] of Object.entries(actual)) {
    const child = tokenDifferences(value, derived?.[key]);
    if (child !== undefined) difference[key] = child;
  }
  return Object.keys(difference).length ? difference : undefined;
}

const px = (n) => `${Math.round(n * 100) / 100}px`;

/** Full token set derived from a handful of seeds. */
/** Full token set derived from a handful of seeds. @param {import('../types.ts').Seeds} seeds */
export function buildTokens(seeds) {
  const brandHue = hexToOklch(seeds.brand).H;
  const neutral = buildNeutralScale({
    hue: seeds.neutralHue ?? brandHue,
    chroma: seeds.neutralChroma ?? 0.004,
    light: seeds.canvasLight ?? '#FAFAFA',
    dark: seeds.inkDark ?? '#171717',
  });
  const brand = buildScale(seeds.brand);
  const action = seeds.action ? buildScale(seeds.action, { maxChroma: 0.3 }) : brand;
  const actionIsDark = hexToOklch(seeds.action ?? seeds.brand).L < 0.4;
  const A = seeds.action ? 'action' : 'brand';
  const red = buildScale('#DC2626');
  const amber = buildScale('#D97706');
  const green = buildScale('#16A34A');
  const blue = buildScale('#2563EB');

  const rs = seeds.radiusScale ?? 1;
  const r = (n) => (rs === 0 ? '0px' : px(n * rs));
  const base = seeds.baseFontSize ?? 14;
  const ctrl = seeds.controlHeight ?? 36;
  const tint = seeds.shadowTint ?? '#000000';
  const sh = (a) => alpha(tint, a);
  const focus = seeds.action && !actionIsDark ? action : brand;

  // Action-color pair. When the action color is a dark neutral (charcoal
  // buttons), hover goes darker and the dark theme inverts it to light.
  const act = actionIsDark
    ? { light: seeds.action ?? seeds.brand, lightHover: neutral['950'], lightActive: '#000000', dark: neutral['50'], darkHover: neutral['100'], darkActive: neutral['200'], onLight: neutral['50'], onDark: neutral['950'], subtleL: neutral['100'], subtleD: neutral['800'], fgL: neutral['900'], fgD: neutral['100'] }
    : { light: `{${A}.600}`, lightHover: `{${A}.700}`, lightActive: `{${A}.800}`, dark: `{${A}.500}`, darkHover: `{${A}.400}`, darkActive: `{${A}.300}`, onLight: '#FFFFFF', onDark: '{neutral.950}', subtleL: `{${A}.50}`, subtleD: `{${A}.950}`, fgL: `{${A}.700}`, fgD: `{${A}.400}` };

  const tokens = {
    color: {
      primitive: {
        white: '#FFFFFF',
        black: '#000000',
        neutral,
        brand,
        ...(seeds.action ? { action } : {}),
        red, amber, green, blue,
      },
      semantic: {
        // ---- backgrounds
        'bg-canvas': { light: '{neutral.50}', dark: '{neutral.950}', description: 'Page background. The outermost surface.' },
        'bg-surface': { light: '{white}', dark: '{neutral.900}', description: 'Cards, panels, inputs, table rows. Sits on canvas.' },
        'bg-surface-raised': { light: '{white}', dark: '{neutral.800}', description: 'Popovers, dropdowns, dialogs. Floating above surface.' },
        'bg-subtle': { light: '{neutral.100}', dark: '{neutral.800}', description: 'Quiet fills: table headers, code, secondary chips, hover rows.' },
        'bg-muted': { light: '{neutral.200}', dark: '{neutral.700}', description: 'Stronger quiet fill: pressed states, skeletons, dividers-as-fill.' },
        'bg-inverse': { light: '{neutral.900}', dark: '{neutral.50}', description: 'Tooltips, inverted chips.' },
        'bg-overlay': { light: alpha(neutral['950'], 0.45), dark: 'rgba(0, 0, 0, 0.6)', description: 'Scrim behind dialogs and drawers.' },
        'bg-action': { light: act.light, dark: act.dark, description: 'Primary action fill: primary buttons, active toggles, selected checkboxes.' },
        'bg-action-hover': { light: act.lightHover, dark: act.darkHover, description: 'Primary action fill on hover.' },
        'bg-action-active': { light: act.lightActive, dark: act.darkActive, description: 'Primary action fill while pressed.' },
        'bg-action-subtle': { light: act.subtleL, dark: act.subtleD, description: 'Tinted fill for selected items, soft badges of the action color.' },
        'bg-accent': { light: '{brand.500}', dark: '{brand.400}', description: 'Brand identity fill (decorative highlights, "AI working" markers). Never text.' },
        'bg-accent-subtle': { light: '{brand.100}', dark: '{brand.950}', description: 'Soft brand wash: chips, highlighted rows, callouts.' },
        'bg-success': { light: '{green.600}', dark: '{green.500}', description: 'Solid success fill.' },
        'bg-success-subtle': { light: '{green.50}', dark: alpha(green['900'], 0.4), description: 'Soft success fill (alerts, badges).' },
        'bg-warning': { light: '{amber.500}', dark: '{amber.400}', description: 'Solid warning fill.' },
        'bg-warning-subtle': { light: '{amber.50}', dark: alpha(amber['900'], 0.4), description: 'Soft warning fill.' },
        'bg-danger': { light: '{red.600}', dark: '{red.500}', description: 'Solid danger fill: destructive buttons.' },
        'bg-danger-hover': { light: '{red.700}', dark: '{red.400}', description: 'Destructive button hover.' },
        'bg-danger-subtle': { light: '{red.50}', dark: alpha(red['900'], 0.4), description: 'Soft danger fill.' },
        'bg-info': { light: '{blue.600}', dark: '{blue.500}', description: 'Solid info fill.' },
        'bg-info-subtle': { light: '{blue.50}', dark: alpha(blue['900'], 0.4), description: 'Soft info fill.' },
        'bg-disabled': { light: '{neutral.100}', dark: '{neutral.800}', description: 'Fill of disabled controls.' },
        // ---- foregrounds
        'fg-default': { light: '{neutral.950}', dark: '{neutral.50}', description: 'Primary text and icons.' },
        'fg-muted': { light: '{neutral.600}', dark: '{neutral.400}', description: 'Secondary text: descriptions, helper text, table meta.' },
        'fg-subtle': { light: '{neutral.500}', dark: '{neutral.500}', description: 'Tertiary text: timestamps, captions, kickers.' },
        'fg-placeholder': { light: '{neutral.400}', dark: '{neutral.600}', description: 'Input placeholders.' },
        'fg-inverse': { light: '{neutral.50}', dark: '{neutral.950}', description: 'Text on bg-inverse.' },
        'fg-on-action': { light: act.onLight, dark: act.onDark, description: 'Text/icon on bg-action.' },
        'fg-on-accent': { light: '{white}', dark: '{neutral.950}', description: 'Text/icon on bg-accent (rare).' },
        'fg-action': { light: act.fgL, dark: act.fgD, description: 'Action-colored text: links in lists, selected tab labels, icons.' },
        'fg-accent': { light: '{brand.700}', dark: '{brand.300}', description: 'Brand-colored text. AA on canvas; use sparingly.' },
        'fg-success': { light: '{green.700}', dark: '{green.400}', description: 'Success text/icon.' },
        'fg-warning': { light: '{amber.700}', dark: '{amber.400}', description: 'Warning text/icon.' },
        'fg-danger': { light: '{red.700}', dark: '{red.400}', description: 'Danger text/icon, error messages.' },
        'fg-info': { light: '{blue.700}', dark: '{blue.400}', description: 'Info text/icon.' },
        'fg-disabled': { light: '{neutral.400}', dark: '{neutral.600}', description: 'Text of disabled controls.' },
        'fg-link': { light: '{neutral.950}', dark: '{neutral.50}', description: 'Inline links (underlined, ink-colored — never blue by default).' },
        'fg-link-hover': { light: act.fgL, dark: act.fgD, description: 'Inline link on hover.' },
        // ---- borders
        'border-default': { light: '{neutral.200}', dark: '{neutral.800}', description: 'Default 1px hairline: cards, inputs, dividers, table rules.' },
        'border-strong': { light: '{neutral.300}', dark: '{neutral.700}', description: 'Hovered inputs, emphasized separators.' },
        'border-subtle': { light: '{neutral.100}', dark: alpha(neutral['800'], 0.6), description: 'Very quiet separators inside a surface.' },
        'border-action': { light: act.light, dark: act.dark, description: 'Focused inputs, selected cards.' },
        'border-success': { light: '{green.300}', dark: '{green.800}', description: '' },
        'border-warning': { light: '{amber.300}', dark: '{amber.800}', description: '' },
        'border-danger': { light: '{red.300}', dark: '{red.800}', description: 'Invalid inputs.' },
        'border-info': { light: '{blue.300}', dark: '{blue.800}', description: '' },
        'border-disabled': { light: '{neutral.200}', dark: '{neutral.800}', description: '' },
        'border-control': { light: '{neutral.200}', dark: '{neutral.700}', description: 'Border of inputs, selects and outline/secondary buttons at rest.' },
        'border-control-hover': { light: '{neutral.300}', dark: '{neutral.600}', description: 'Border of inputs and outline buttons on hover.' },
        // ---- focus ring
        'ring-focus': { light: alpha(focus['500'], 0.4), dark: alpha(focus['400'], 0.5), description: 'The 3px focus ring color. Only ever shown on :focus-visible.' },
        'ring-danger': { light: alpha(red['500'], 0.35), dark: alpha(red['400'], 0.4), description: 'Focus ring on invalid controls.' },
      },
    },
    font: {
      family: {
        sans: seeds.fontSans ?? '"Geist", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
        mono: seeds.fontMono ?? '"Geist Mono", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
        display: seeds.fontDisplay ?? seeds.fontSans ?? '"Geist", "Inter", system-ui, sans-serif',
      },
      size: {
        '2xs': px(base * 0.7857), // 11
        xs: px(base * 0.8571),    // 12
        sm: px(base * 0.9286),    // 13
        md: px(base),             // 14
        lg: px(base * 1.1429),    // 16
        xl: px(base * 1.2857),    // 18
        '2xl': px(base * 1.4286), // 20
        '3xl': px(base * 1.7143), // 24
        '4xl': px(base * 2.1429), // 30
        '5xl': px(base * 2.5714), // 36
        '6xl': px(base * 3.4286), // 48
        '7xl': px(base * 4.2857), // 60
        '8xl': px(base * 5.1429), // 72
      },
      weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
      control: { xs: px(base * 0.8571), sm: px(base), md: px(base), lg: px(base * 1.1429), xl: px(base * 1.1429) },
      lineHeight: { none: '1', tight: '1.1', snug: '1.25', normal: '1.5', relaxed: '1.6', loose: '1.75' },
      letterSpacing: { tighter: '-0.04em', tight: '-0.02em', snug: '-0.01em', normal: '0', wide: '0.04em', wider: '0.08em' },
    },
    type: {
      'display-xl': { family: '{font.family.display}', size: '{font.size.7xl}', weight: '{font.weight.semibold}', lineHeight: '{font.lineHeight.none}', letterSpacing: '{font.letterSpacing.tighter}', description: 'Hero headline. One per page, marketing only.' },
      'display-lg': { family: '{font.family.display}', size: '{font.size.6xl}', weight: '{font.weight.semibold}', lineHeight: '{font.lineHeight.tight}', letterSpacing: '{font.letterSpacing.tighter}', description: 'Section hero on marketing pages.' },
      'display-md': { family: '{font.family.display}', size: '{font.size.5xl}', weight: '{font.weight.semibold}', lineHeight: '{font.lineHeight.tight}', letterSpacing: '{font.letterSpacing.tight}', description: 'Big numbers (KPI hero), page-level titles on marketing.' },
      'heading-xl': { family: '{font.family.sans}', size: '{font.size.4xl}', weight: '{font.weight.semibold}', lineHeight: '{font.lineHeight.tight}', letterSpacing: '{font.letterSpacing.tight}', description: 'h1 in the app: page title.' },
      'heading-lg': { family: '{font.family.sans}', size: '{font.size.3xl}', weight: '{font.weight.semibold}', lineHeight: '{font.lineHeight.snug}', letterSpacing: '{font.letterSpacing.tight}', description: 'h2: section title inside a page.' },
      'heading-md': { family: '{font.family.sans}', size: '{font.size.2xl}', weight: '{font.weight.semibold}', lineHeight: '{font.lineHeight.snug}', letterSpacing: '{font.letterSpacing.tight}', description: 'h3: card title, dialog title.' },
      'heading-sm': { family: '{font.family.sans}', size: '{font.size.lg}', weight: '{font.weight.semibold}', lineHeight: '{font.lineHeight.snug}', letterSpacing: '{font.letterSpacing.snug}', description: 'h4: subsection title, list group title.' },
      'heading-xs': { family: '{font.family.sans}', size: '{font.size.md}', weight: '{font.weight.semibold}', lineHeight: '{font.lineHeight.snug}', letterSpacing: '{font.letterSpacing.normal}', description: 'h5: small title inside a compact card or row.' },
      'body-xl': { family: '{font.family.sans}', size: '{font.size.xl}', weight: '{font.weight.regular}', lineHeight: '{font.lineHeight.normal}', letterSpacing: '{font.letterSpacing.snug}', description: 'Lead paragraphs under hero and section titles on marketing pages (20px).' },
      'body-lg': { family: '{font.family.sans}', size: '{font.size.lg}', weight: '{font.weight.regular}', lineHeight: '{font.lineHeight.relaxed}', letterSpacing: '{font.letterSpacing.snug}', description: 'Lede paragraphs, long-form reading.' },
      'body-md': { family: '{font.family.sans}', size: '{font.size.md}', weight: '{font.weight.regular}', lineHeight: '{font.lineHeight.normal}', letterSpacing: '{font.letterSpacing.normal}', description: 'Default UI text. Inputs, table cells, descriptions.' },
      'body-sm': { family: '{font.family.sans}', size: '{font.size.sm}', weight: '{font.weight.regular}', lineHeight: '{font.lineHeight.normal}', letterSpacing: '{font.letterSpacing.normal}', description: 'Secondary text, helper text, dense tables.' },
      'body-xs': { family: '{font.family.sans}', size: '{font.size.xs}', weight: '{font.weight.regular}', lineHeight: '{font.lineHeight.normal}', letterSpacing: '{font.letterSpacing.normal}', description: 'Captions, timestamps, footnotes.' },
      'label-lg': { family: '{font.family.sans}', size: '{font.size.lg}', weight: '{font.weight.medium}', lineHeight: '{font.lineHeight.none}', letterSpacing: '{font.letterSpacing.snug}', description: 'Large button labels, tabs on marketing.' },
      'label-md': { family: '{font.family.sans}', size: '{font.size.md}', weight: '{font.weight.medium}', lineHeight: '{font.lineHeight.none}', letterSpacing: '{font.letterSpacing.normal}', description: 'Buttons, tabs, form labels, menu items.' },
      'label-sm': { family: '{font.family.sans}', size: '{font.size.sm}', weight: '{font.weight.medium}', lineHeight: '{font.lineHeight.none}', letterSpacing: '{font.letterSpacing.normal}', description: 'Small buttons, badges, table headers.' },
      'label-xs': { family: '{font.family.sans}', size: '{font.size.xs}', weight: '{font.weight.medium}', lineHeight: '{font.lineHeight.none}', letterSpacing: '{font.letterSpacing.normal}', description: 'Tiny badges, counters.' },
      'kicker': { family: '{font.family.mono}', size: '{font.size.2xs}', weight: '{font.weight.medium}', lineHeight: '{font.lineHeight.none}', letterSpacing: '{font.letterSpacing.wider}', transform: 'uppercase', description: 'Mono uppercase eyebrow above titles and section labels. The most recognizable text style; use it instead of colored labels.' },
      'code-md': { family: '{font.family.mono}', size: '{font.size.sm}', weight: '{font.weight.regular}', lineHeight: '{font.lineHeight.relaxed}', letterSpacing: '{font.letterSpacing.normal}', description: 'Code blocks.' },
      'code-sm': { family: '{font.family.mono}', size: '{font.size.xs}', weight: '{font.weight.regular}', lineHeight: '{font.lineHeight.normal}', letterSpacing: '{font.letterSpacing.normal}', description: 'Inline code, kbd, IDs, technical values in tables.' },
      'numeric-md': { family: '{font.family.sans}', size: '{font.size.md}', weight: '{font.weight.medium}', lineHeight: '{font.lineHeight.none}', letterSpacing: '{font.letterSpacing.normal}', description: 'Tabular numbers in tables and stats (font-variant-numeric: tabular-nums).' },
    },
    space: {
      '0': '0px', px: '1px', '0.5': '2px', '1': '4px', '1.5': '6px', '2': '8px', '2.5': '10px', '3': '12px', '3.5': '14px',
      '4': '16px', '5': '20px', '6': '24px', '7': '28px', '8': '32px', '9': '36px', '10': '40px', '11': '44px', '12': '48px',
      '14': '56px', '16': '64px', '20': '80px', '24': '96px', '28': '112px', '32': '128px', '40': '160px', '48': '192px', '56': '224px', '64': '256px',
    },
    radius: { none: '0px', xs: r(2), sm: r(4), md: r(6), lg: r(8), xl: r(12), '2xl': r(16), '3xl': r(24), full: '9999px', control: r(8), card: r(12), panel: r(8), overlay: r(16) },
    border: { width: { none: '0px', thin: '1px', medium: '2px', thick: '3px' } },
    shadow: {
      xs: { light: `0 1px 2px ${sh(0.05)}`, dark: '0 1px 2px rgba(0, 0, 0, 0.4)', description: 'Barely-there lift for inputs and small chips.' },
      sm: { light: `0 1px 3px ${sh(0.08)}, 0 1px 2px -1px ${sh(0.06)}`, dark: '0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.4)', description: 'Resting cards that need separation from a same-colored canvas.' },
      md: { light: `0 4px 6px -1px ${sh(0.08)}, 0 2px 4px -2px ${sh(0.06)}`, dark: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.4)', description: 'Dropdowns, popovers, hovered interactive cards.' },
      lg: { light: `0 10px 15px -3px ${sh(0.1)}, 0 4px 6px -4px ${sh(0.06)}`, dark: '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.4)', description: 'Dialogs, drawers, command palette.' },
      xl: { light: `0 20px 24px -4px ${sh(0.08)}, 0 8px 8px -4px ${sh(0.03)}`, dark: '0 20px 24px -4px rgba(0, 0, 0, 0.6), 0 8px 8px -4px rgba(0, 0, 0, 0.4)', description: 'Large floating layers: command palette, big popovers.' },
      '2xl': { light: `0 24px 48px -12px ${sh(0.18)}, 0 4px 4px -2px ${sh(0.04)}`, dark: '0 24px 48px -12px rgba(0, 0, 0, 0.7)', description: 'Hero cards and app screenshots on marketing pages. Never inside the app shell.' },
      '3xl': { light: `0 32px 64px -12px ${sh(0.14)}, 0 5px 5px -2.5px ${sh(0.04)}`, dark: '0 32px 64px -12px rgba(0, 0, 0, 0.75)', description: 'Device mockups on marketing pages.' },
      control: { light: '0 0 0 0 transparent', dark: '0 0 0 0 transparent', description: 'Optional depth for filled buttons. Composed with xs; both remain flat in the Canon preset.' },
      focus: { light: '0 0 0 3px {color.ring-focus}', dark: '0 0 0 3px {color.ring-focus}', description: 'Focus ring. Always paired with border-action on inputs.' },
      'focus-danger': { light: '0 0 0 3px {color.ring-danger}', dark: '0 0 0 3px {color.ring-danger}', description: 'Focus ring on invalid controls.' },
    },
    size: {
      control: { xs: px(ctrl - 8), sm: px(ctrl - 4), md: px(ctrl), lg: px(ctrl + 4), xl: px(ctrl + 8) },
      controlPadding: { xs: '10px', sm: '12px', md: '14px', lg: '16px', xl: '18px' },
      controlIcon: { xs: '16px', sm: '20px', md: '20px', lg: '20px', xl: '20px' },
      icon: { xs: '12px', sm: '14px', md: '16px', lg: '20px', xl: '24px', '2xl': '32px' },
      container: { xs: '480px', sm: '640px', md: '768px', lg: '1024px', xl: '1152px', '2xl': '1280px', prose: '65ch' },
    },
    z: { base: '0', raised: '1', sticky: '100', dropdown: '200', overlay: '300', modal: '400', popover: '500', toast: '600', tooltip: '700' },
    motion: {
      duration: { instant: '0ms', fast: '120ms', normal: '180ms', slow: '260ms', slower: '400ms' },
      easing: { standard: 'cubic-bezier(0.2, 0, 0, 1)', out: 'cubic-bezier(0.16, 1, 0.3, 1)', in: 'cubic-bezier(0.4, 0, 1, 1)', linear: 'linear' },
    },
    breakpoint: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    opacity: { disabled: '0.5', muted: '0.7', overlay: '0.45' },
  };
  return deepMerge(deepMerge(tokens, seeds.presetOverrides), seeds.overrides);
}
