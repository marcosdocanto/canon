// Class-list ⇄ property model: turns a Tailwind class string into typed, designer-editable
// properties (color, radius, spacing, typography…) plus an order-preserving `rest` of everything
// unrecognized. Pure ESM, no dependencies — imported by the browser editor AND node tests.
//
// Round-trip law: compose(parse(x)) === x when nothing was edited. Parse records each token's
// position; compose re-emits tokens in original order, replacing edited properties in place and
// appending newly added ones at the end. Unrecognized tokens (variant prefixes like hover:/dark:,
// arbitrary selectors, unknown utilities) are NEVER dropped or reordered.

const RADIUS_SCALE = ['none', 'xs', 'sm', '', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'];
const SPACING_SCALE = ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24'];
const FONT_SIZES = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
const FONT_WEIGHTS = ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'];
const SHADOWS = ['2xs', 'xs', 'sm', '', 'md', 'lg', 'xl', '2xl', 'none'];
const BORDER_WIDTHS = ['', '0', '2', '4', '8'];

const COLOR_PREFIXES = { bg: 'background', text: 'textColor', border: 'borderColor', ring: 'ringColor' };
const SPACING_PREFIXES = ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'gap', 'gap-x', 'gap-y', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml'];
const SIZE_PREFIXES = ['h', 'w', 'size'];

/** A token is opaque (always rest) when it carries any variant prefix or arbitrary selector. */
function isOpaque(token) {
  return token.includes(':') || token.startsWith('[') || token.startsWith('!');
}

function splitOpacity(value) {
  const slash = value.lastIndexOf('/');
  if (slash === -1) return { value, opacity: undefined };
  const op = value.slice(slash + 1);
  return /^\d{1,3}$/.test(op) ? { value: value.slice(0, slash), opacity: op } : { value, opacity: undefined };
}

/**
 * Classify one token. `themeColors` is the set of color names valid in this project's theme
 * (from the server's structured vocab). Returns a prop object or null (→ rest).
 */
function classify(token, themeColors) {
  if (isOpaque(token)) return null;

  // color families: bg-*, text-* (when a theme color), border-* (when a theme color), ring-*
  for (const [prefix, family] of Object.entries(COLOR_PREFIXES)) {
    if (!token.startsWith(prefix + '-')) continue;
    const raw = token.slice(prefix.length + 1);
    const { value, opacity } = splitOpacity(raw);
    if (themeColors.has(value)) return { family, kind: 'theme', value, opacity };
    const arb = /^\[(#[0-9a-fA-F]{3,8}|rgb.*|hsl.*|oklch.*)\]$/.exec(value);
    if (arb) return { family, kind: 'raw', value: arb[1], opacity };
    // fall through: text-lg is a font size, border-2 a width — handled below
    break;
  }

  // font size vs text color disambiguation: suffix in the size scale wins here
  if (token.startsWith('text-') && FONT_SIZES.includes(token.slice(5))) return { family: 'fontSize', value: token.slice(5) };
  if (token.startsWith('font-') && FONT_WEIGHTS.includes(token.slice(5))) return { family: 'fontWeight', value: token.slice(5) };

  if (token === 'rounded') return { family: 'radius', side: '', value: '' };
  const rounded = /^rounded(?:-(t|r|b|l|tl|tr|br|bl|s|e|ss|se|es|ee))?(?:-(.+))?$/.exec(token);
  if (rounded && RADIUS_SCALE.includes(rounded[2] ?? '')) return { family: 'radius', side: rounded[1] ?? '', value: rounded[2] ?? '' };

  for (const prefix of SPACING_PREFIXES) {
    if (token.startsWith(prefix + '-') && SPACING_SCALE.includes(token.slice(prefix.length + 1))) {
      return { family: 'spacing', axis: prefix, value: token.slice(prefix.length + 1) };
    }
  }
  for (const prefix of SIZE_PREFIXES) {
    if (token.startsWith(prefix + '-') && (SPACING_SCALE.includes(token.slice(prefix.length + 1)) || /^\d+$/.test(token.slice(prefix.length + 1)))) {
      return { family: 'size', axis: prefix, value: token.slice(prefix.length + 1) };
    }
  }

  if (token === 'border') return { family: 'borderWidth', side: '', value: '' };
  const bw = /^border(?:-(t|r|b|l|x|y|s|e))?(?:-([0248]))?$/.exec(token);
  if (bw && (bw[2] !== undefined || bw[1] !== undefined) && BORDER_WIDTHS.includes(bw[2] ?? '')) {
    return { family: 'borderWidth', side: bw[1] ?? '', value: bw[2] ?? '' };
  }

  if (token === 'shadow') return { family: 'shadow', value: '' };
  if (token.startsWith('shadow-') && SHADOWS.includes(token.slice(7))) return { family: 'shadow', value: token.slice(7) };

  const opacity = /^opacity-(\d{1,3})$/.exec(token);
  if (opacity) return { family: 'opacity', value: opacity[1] };

  return null;
}

/** Re-emit a prop as its Tailwind token. */
function tokenOf(prop) {
  switch (prop.family) {
    case 'background': case 'textColor': case 'borderColor': case 'ringColor': {
      const prefix = Object.entries(COLOR_PREFIXES).find(([, f]) => f === prop.family)[0];
      const value = prop.kind === 'raw' ? `[${prop.value}]` : prop.value;
      return `${prefix}-${value}${prop.opacity ? `/${prop.opacity}` : ''}`;
    }
    case 'fontSize': return `text-${prop.value}`;
    case 'fontWeight': return `font-${prop.value}`;
    case 'radius': return ['rounded', prop.side, prop.value].filter(Boolean).join('-');
    case 'spacing': return `${prop.axis}-${prop.value}`;
    case 'size': return `${prop.axis}-${prop.value}`;
    case 'borderWidth': return ['border', prop.side, prop.value].filter(Boolean).join('-');
    case 'shadow': return prop.value ? `shadow-${prop.value}` : 'shadow';
    case 'opacity': return `opacity-${prop.value}`;
    default: throw new Error(`unknown prop family: ${prop.family}`);
  }
}

/**
 * Parse a class list. Returns { slots, props, rest }:
 * - slots: every original token in order, each { token, prop? } — the source of truth for compose;
 * - props: the recognized properties (referencing their slot index);
 * - rest: the unrecognized tokens (for the Advanced chip editor).
 */
export function parseClassList(classes, themeColorNames) {
  const themeColors = new Set(themeColorNames);
  const slots = [];
  const props = [];
  const rest = [];
  for (const token of classes.trim().split(/\s+/).filter(Boolean)) {
    const prop = classify(token, themeColors);
    const slot = { token, prop: prop ?? undefined };
    if (prop) { prop.slot = slots.length; props.push(prop); } else rest.push(token);
    slots.push(slot);
  }
  return { slots, props, rest };
}

/**
 * Compose back to a class string. `edits` maps slot index → new prop (or null to remove);
 * `additions` is an array of new props appended at the end. Untouched slots re-emit their
 * ORIGINAL token text verbatim (round-trip law).
 */
export function composeClassList(parsed, edits = new Map(), additions = []) {
  const out = [];
  parsed.slots.forEach((slot, i) => {
    if (edits.has(i)) {
      const next = edits.get(i);
      if (next !== null) out.push(tokenOf(next));
    } else {
      out.push(slot.token);
    }
  });
  for (const prop of additions) out.push(tokenOf(prop));
  return out.join(' ');
}

export const SCALES = { RADIUS_SCALE, SPACING_SCALE, FONT_SIZES, FONT_WEIGHTS, SHADOWS, BORDER_WIDTHS };
