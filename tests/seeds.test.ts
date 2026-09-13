import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSystem } from '../src/system.ts';
import { indexTokens } from '../src/tokens/resolve.ts';
import { applySeedChanges, buildTokens, deepMerge } from '../src/tokens/index.ts';
import { CANON_OVERRIDES, legacyPresetDefaults } from '../src/tokens/canon-preset.ts';
import { contrast } from '../src/color.js';

test('explicit brand and action seeds override the default preset palette', async () => {
  const system = await createSystem({ name: 'Custom', prefix: 'acme', seeds: { brand: '#008800', action: '#112233' } });
  const tokens = indexTokens(system.tokens, 'acme');
  assert.ok(Object.values(system.tokens.color.primitive.brand).includes('#008800'));
  assert.equal(tokens.get('color.bg-action')!.light, '#112233');
});

test('explicit font seeds replace only the requested preset families', async () => {
  const system = await createSystem({ name: 'Custom', seeds: { fontSans: 'Geist', fontMono: 'Review Mono' } });
  assert.equal(system.tokens.font.family.sans, 'Geist');
  assert.equal(system.tokens.font.family.display, 'Geist');
  assert.equal(system.tokens.font.family.mono, 'Review Mono');
});

test('user token overrides survive seed changes without discarding unrelated preset defaults', async () => {
  const system = await createSystem({ name: 'Custom', seeds: { brand: '#008800', overrides: { color: { semantic: { 'bg-action': { light: '#123456', dark: '#ABCDEF' } } } } } });
  const tokens = indexTokens(system.tokens, system.meta.prefix);
  assert.equal(tokens.get('color.bg-action')!.light, '#123456');
  assert.ok(Object.values(system.tokens.color.primitive.brand).includes('#008800'));
  assert.match(system.tokens.font.family.sans, /^"DM Sans"/);
});

test('customizing one system does not mutate the preset used by the next system', async () => {
  await createSystem({ name: 'Custom', seeds: { brand: '#008800', fontSans: 'Geist' } });
  const system = await createSystem({ name: 'Default' });
  assert.equal(indexTokens(system.tokens, system.meta.prefix).get('brand.600')!.light, '#B4309F');
  assert.match(system.tokens.font.family.sans, /^"DM Sans"/);
});

test('legacy seed migration preserves deliberate overrides while replacing preset defaults', () => {
  const legacy = {
    name: 'Legacy', prefix: 'acme', brand: '#7F56D9',
    overrides: deepMerge(CANON_OVERRIDES, { font: { family: { display: 'Hand-set display' } } }),
  };
  const next = applySeedChanges(legacy, { fontSans: 'Different sans', brand: '#008800' }, CANON_OVERRIDES);
  const tokens = buildTokens(next);
  assert.equal(tokens.font.family.sans, 'Different sans');
  assert.equal(tokens.font.family.display, 'Hand-set display');
  assert.ok(Object.values(tokens.color.primitive.brand).includes('#008800'));
});


test('original Canon seed metadata keeps its original migration defaults', () => {
  const original = { name: 'Earlier design', prefix: 'ui', brand: '#7F56D9', overrides: { color: { primitive: { brand: { '600': '#7F56D9' } } } } };
  const defaults = legacyPresetDefaults(original);
  const seeds = { ...original, overrides: deepMerge(defaults, { font: { family: { display: 'Custom display' } } }) };
  const next = applySeedChanges(seeds, { brand: '#008800', fontSans: 'New sans' }, defaults);
  const tokens = buildTokens(next);
  assert.equal(tokens.font.family.sans, 'New sans');
  assert.equal(tokens.font.family.display, 'Custom display');
  assert.ok(Object.values(tokens.color.primitive.brand).includes('#008800'));
});

test('Canon reading text and action labels retain contrast in both themes', async () => {
  const system = await createSystem({ name: 'Contrast' });
  const tokens = indexTokens(system.tokens, system.meta.prefix);
  const pairs = [
    ['fg-default', 'bg-canvas'], ['fg-muted', 'bg-canvas'], ['fg-subtle', 'bg-canvas'],
    ['fg-placeholder', 'bg-surface'], ['fg-action', 'bg-action-subtle'],
    ['fg-on-action', 'bg-action'], ['fg-on-action', 'bg-action-hover'], ['fg-on-action', 'bg-action-active'],
  ];
  for (const theme of ['light', 'dark'] as const) for (const [foreground, background] of pairs) {
    const ratio = contrast(tokens.get(`color.${foreground}`)![theme], tokens.get(`color.${background}`)![theme]);
    assert.ok(ratio >= 4.5, `${theme}: ${foreground} on ${background} has ${ratio.toFixed(2)} contrast`);
  }
});
