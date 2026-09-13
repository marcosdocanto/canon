// Color math: sRGB <-> OKLCH, scale generation, contrast. Plain JS so the same
// code runs in Node (imported by the TS generators) and inline in preview.html.

/** @param {string} hex */
export function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** @param {number[]} rgb */
export function rgbToHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** @param {number[]} rgb 0..255 → oklab [L,a,b] */
export function rgbToOklab([r, g, b]) {
  const R = srgbToLinear(r / 255), G = srgbToLinear(g / 255), B = srgbToLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** @param {number[]} lab → rgb 0..255 (unclamped floats) */
export function oklabToRgb([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [linearToSrgb(R) * 255, linearToSrgb(G) * 255, linearToSrgb(B) * 255];
}

export function hexToOklch(hex) {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H: C < 1e-4 ? 0 : H };
}

function inGamut(rgb) {
  return rgb.every((v) => v >= -0.5 && v <= 255.5);
}

/** OKLCH → hex, reducing chroma until the color fits in sRGB. */
export function oklchToHex({ L, C, H }) {
  const rad = (H * Math.PI) / 180;
  let c = C;
  for (let i = 0; i < 24; i++) {
    const rgb = oklabToRgb([L, c * Math.cos(rad), c * Math.sin(rad)]);
    if (inGamut(rgb)) return rgbToHex(rgb);
    c *= 0.9;
  }
  return rgbToHex(oklabToRgb([L, 0, 0]));
}

// Lightness / chroma curve for an 11-step scale (50…950). Tuned so the 500/600
// steps carry the seed's saturation and the ends stay usable as surfaces/text.
export const SCALE_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const SCALE_L = [0.985, 0.965, 0.925, 0.865, 0.78, 0.68, 0.59, 0.51, 0.44, 0.38, 0.28];
const SCALE_C = [0.04, 0.08, 0.17, 0.32, 0.6, 0.9, 1.0, 0.92, 0.78, 0.62, 0.45];

/**
 * Build a full 50…950 scale from one seed color. The seed lands on its
 * nearest step; the rest is derived along the curve with the seed's hue.
 * @param {string} seedHex
 * @param {{ maxChroma?: number, hueShift?: number }} [opts]
 */
export function buildScale(seedHex, opts = {}) {
  const seed = hexToOklch(seedHex);
  const peak = Math.min(opts.maxChroma ?? 0.4, Math.max(seed.C, 0.002));
  // Which step is the seed closest to (by lightness)? Anchor there.
  let anchor = 0, best = Infinity;
  SCALE_L.forEach((L, i) => { const d = Math.abs(L - seed.L); if (d < best) { best = d; anchor = i; } });
  const scale = {};
  SCALE_STEPS.forEach((step, i) => {
    if (i === anchor) { scale[step] = seedHex.toUpperCase(); return; }
    const C = (peak / SCALE_C[anchor]) * SCALE_C[i];
    const H = seed.H + (opts.hueShift ?? 0) * ((i - anchor) / 10);
    scale[step] = oklchToHex({ L: SCALE_L[i], C: Math.max(C, 0), H });
  });
  return scale;
}

/**
 * Neutral scale: near-grey, optionally tinted with a hue at very low chroma.
 * @param {{ hue?: number, chroma?: number, light?: string, dark?: string }} [opts]
 *  light/dark override the 50 and 950 endpoints (e.g. an off-white canvas and a charcoal ink).
 */
export function buildNeutralScale(opts = {}) {
  const hue = opts.hue ?? 0;
  const chroma = opts.chroma ?? 0;
  // Map the curve so it hits the requested endpoints exactly and stays monotonic.
  const L0 = opts.light ? hexToOklch(opts.light).L : SCALE_L[0];
  const L10 = opts.dark ? hexToOklch(opts.dark).L : SCALE_L[SCALE_L.length - 1];
  const cMin = SCALE_L[SCALE_L.length - 1], cMax = SCALE_L[0];
  const scale = {};
  SCALE_STEPS.forEach((step, i) => {
    const t = (SCALE_L[i] - cMin) / (cMax - cMin); // 1 at 50 … 0 at 950
    const L = L10 + t * (L0 - L10);
    scale[step] = oklchToHex({ L, C: chroma, H: hue });
  });
  if (opts.light) scale['50'] = opts.light.toUpperCase();
  if (opts.dark) scale['950'] = opts.dark.toUpperCase();
  return scale;
}

/** WCAG relative luminance */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => srgbToLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors */
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Perceptual distance in OKLab (0 = identical; < 0.02 is visually very close) */
export function distance(hexA, hexB) {
  const a = rgbToOklab(hexToRgb(hexA)), b = rgbToOklab(hexToRgb(hexB));
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Parse any css color literal we care about into hex (or null). */
export function parseCssColor(str) {
  const s = str.trim();
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return rgbToHex(hexToRgb(s));
  let m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (m) return rgbToHex([+m[1], +m[2], +m[3]]);
  m = s.match(/^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i);
  if (m) {
    const h = +m[1] / 360, sat = +m[2] / 100, l = +m[3] / 100;
    const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, p = 2 * l - q;
    const t2c = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    return rgbToHex([t2c(h + 1 / 3) * 255, t2c(h) * 255, t2c(h - 1 / 3) * 255]);
  }
  return null;
}

/** "rgba(HEX, alpha)" helper used by tokens: returns rgba() string */
export function alpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
