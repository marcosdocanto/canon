import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTokens } from '../src/tokens/index.ts';
import { indexTokens, toCssVars, toLiteral } from '../src/tokens/resolve.ts';
import { componentRules, rePrefix, tokensCss, componentCss } from '../src/generators/css.ts';
import { createSystem, validateSystem } from '../src/system.ts';
import { PRESETS } from '../src/tokens/presets.ts';
import { lintSource, knownFromSystem } from '../src/lint.ts';
import { designMd, compactMd } from '../src/generators/designmd.ts';
import { buildScale, contrast } from '../src/color.js';

test('tokens: seeds produce a complete, resolvable set', () => {
  const t = buildTokens({ name: 'T', prefix: 'cn', brand: '#7F56D9' });
  const idx = indexTokens(t, 'cn');
  assert.ok(idx.size > 300, `only ${idx.size} tokens`);
  const bg = idx.get('color.bg-action')!;
  assert.equal(bg.cssVar, '--cn-color-bg-action');
  assert.match(bg.light, /^#[0-9A-F]{6}$/);
  assert.notEqual(bg.light, bg.dark);
  assert.equal(toCssVars('{space.4} {radius.md}', idx), 'var(--cn-space-4) var(--cn-radius-md)');
  assert.equal(toLiteral('{space.4}', idx), '16px');
  assert.throws(() => toCssVars('{nope.x}', idx), /Unknown token/);
});

test('color: scales keep the seed and pass AA at 600', () => {
  const s = buildScale('#B4309F');
  assert.equal(s['600'], '#B4309F');
  assert.ok(contrast(s['600'], '#FFFFFF') >= 4.5);
});

test('presets: every preset builds a valid system', async () => {
  for (const id of Object.keys(PRESETS)) {
    const sys = await createSystem({ name: `P ${id}`, prefix: 'p', preset: id });
    const v = validateSystem(sys);
    assert.deepEqual(v.errors, [], `${id}: ${v.errors.slice(0, 3).join('; ')}`);
    assert.ok(sys.components.length >= 4);
  }
});

test('css: component rules use data attributes and re-prefix animation names', async () => {
  const sys = await createSystem({ name: 'X', prefix: 'ui', preset: 'canon' });
  const idx = indexTokens(sys.tokens, 'ui');
  const button = sys.components.find((c) => c.slug === 'button')!;
  const rules = componentRules(button, 'ui');
  assert.ok(rules.some((r) => r.selector === '.ui-button[data-variant="primary"]'));
  assert.ok(rules.some((r) => r.selector.includes('.ui-button[data-variant="primary"]:hover')));
  const css = componentCss(button, idx, 'ui');
  assert.ok(!/\bcn-/.test(css), 'cn- leaked into prefixed css');
  assert.ok(css.includes('@keyframes ui-spin') && css.includes('animation: ui-spin'));
  const tcss = tokensCss(sys, idx);
  assert.ok(tcss.includes(':root[data-theme="dark"]') && tcss.includes('--ui-color-bg-canvas: #FFFFFF'));
  assert.equal(rePrefix('<i class="cn-x cn-x__y">', 'ui'), '<i class="ui-x ui-x__y">');
});

test('lint: catches raw values and unknown classes, suggests tokens', async () => {
  const sys = await createSystem({ name: 'X', prefix: 'ui', preset: 'canon' });
  const idx = indexTokens(sys.tokens, 'ui');
  const known = knownFromSystem(sys, idx);
  const v = lintSource(known, 'a.css', '.a { color: #B4309F; padding: 13px; font-family: Inter; }\n.b { padding: var(--ui-space-4); }');
  const rules = v.map((x) => x.rule);
  assert.ok(rules.includes('raw-color') && rules.includes('raw-size') && rules.includes('raw-font'));
  assert.ok(v.find((x) => x.rule === 'raw-color')!.suggestion!.includes('--ui-color-bg-action'));
  assert.equal(v.filter((x) => x.line === 2).length, 0);
  const j = lintSource(known, 'A.tsx', '<button className="ui-button" data-variant="nope"><span className="ui-button__oops"/></button>');
  assert.ok(j.some((x) => x.rule === 'unknown-prop-value') && j.some((x) => x.rule === 'unknown-class'));
  const ok = lintSource(known, 'ok.css', '/* canon-allow */\n.x { color: #fff; }');
  assert.equal(ok.length, 0);
});

test('docs: DESIGN.md is exhaustive and consistent with the CSS', async () => {
  const sys = await createSystem({ name: 'X', prefix: 'ui', preset: 'canon' });
  const idx = indexTokens(sys.tokens, 'ui');
  const md = designMd(sys, idx);
  for (const c of sys.components) assert.ok(md.includes(`<a id="${c.slug}"></a>`), `missing ${c.slug}`);
  assert.ok(md.includes('## 6. Token index'));
  assert.ok(md.includes('--ui-color-bg-action') && md.includes('#B4309F'));
  const compact = compactMd(sys, idx);
  assert.ok(compact.length < md.length / 4);
});
