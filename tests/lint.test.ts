import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSystem } from '../src/system.ts';
import { indexTokens } from '../src/tokens/resolve.ts';
import { lintSource, knownFromSystem } from '../src/lint.ts';

const system = await createSystem({ name: 'Lint', prefix: 'acme' });
const known = knownFromSystem(system, indexTokens(system.tokens, 'acme'));

test('JSX accepts token font families and still rejects literal font families', () => {
  assert.deepEqual(lintSource(known, 'Label.tsx', '<span style={{ fontFamily: "var(--acme-font-family-sans)" }}>Label</span>'), []);
  assert.ok(lintSource(known, 'Label.tsx', '<span style={{ fontFamily: "Inter" }}>Label</span>').some(v => v.rule === 'raw-font'));
});

test('ordinary application strings and IDs are not treated as styles', () => {
  assert.deepEqual(lintSource(known, 'orders.ts', 'export const orders = [{ id: "#123", name: "acme-receipt", note: "rgb(1, 2, 3)", message: "!important" }];'), []);
});

for (const [name, markup] of [
  ['single quoted', "<button className='acme-button' data-variant='nope'>Save</button>"],
  ['multi-line', '<button\n className="acme-button"\n data-variant="nope">Save</button>'],
  ['attribute before class', '<button data-variant="nope" className="acme-button">Save</button>'],
  ['static JSX expression', '<button className={"acme-button"} data-variant={"nope"}>Save</button>'],
] as const) {
  test(`invalid component props are rejected with ${name} markup`, () => {
    const violations = lintSource(known, 'Button.tsx', markup);
    assert.equal(violations.filter(v => v.rule === 'unknown-prop-value').length, 1);
  });
}

test('multi-line diagnostics identify the invalid attribute line', () => {
  const violations = lintSource(known, 'Button.tsx', '<button\n className="acme-button"\n data-variant="nope">Save</button>');
  const violation = violations.find(v => v.rule === 'unknown-prop-value');
  assert.equal(violation?.line, 3);
  assert.equal(violation?.col, 2);
});

test('raw values in CSS and JSX styling are still rejected', () => {
  assert.ok(lintSource(known, 'app.css', '.label { color: #123456; }').some(v => v.rule === 'raw-color'));
  assert.ok(lintSource(known, 'Label.tsx', '<span style={{ color: "#123456" }}>Label</span>').some(v => v.rule === 'raw-color'));
  assert.ok(lintSource(known, 'Icon.tsx', '<svg fill="#123456" />').some(v => v.rule === 'raw-color'));
  assert.ok(lintSource(known, 'Label.tsx', '<span className="acme-unknown" />').some(v => v.rule === 'unknown-class'));
});

test('dynamic class expressions retain literal class, Tailwind, and component prop checks', () => {
  const source = '<button\n title={count > 0 ? ">" : "<"}\n data-variant="nope"\n className={cx("acme-button", active && "acme-missing", "bg-red-500", "p-[13px]")} />';
  const violations = lintSource(known, 'Button.tsx', source);
  const invalid = violations.find(v => v.rule === 'unknown-prop-value');
  assert.deepEqual([invalid?.line, invalid?.col], [3, 2]);
  assert.ok(violations.some(v => v.rule === 'unknown-class' && v.message.includes('acme-missing')));
  assert.ok(violations.some(v => v.rule === 'tailwind-palette'));
  assert.ok(violations.some(v => v.rule === 'tailwind-arbitrary'));
});

test('CSS-in-JS declarations check literal sizes, colors, and fonts while accepting tokens', () => {
  const raw = lintSource(known, 'styles.ts', 'const label = { color: "#123456", fontFamily: "Inter", fontSize: 13, padding: "12px 16px" };');
  for (const rule of ['raw-color', 'raw-font', 'raw-size']) assert.ok(raw.some(v => v.rule === rule), rule);
  assert.ok(raw.some(v => v.rule === 'raw-size' && v.message.includes('padding')));
  assert.deepEqual(lintSource(known, 'styles.ts', 'const label = { color: "var(--acme-color-fg-default)", fontFamily: "var(--acme-font-family-sans)", padding: "calc(var(--acme-space-4) * 2)" };'), []);
  const template = lintSource(known, 'styles.ts', 'const label = css`color: #123456; padding: 13px; font-family: Inter;`;');
  for (const rule of ['raw-color', 'raw-font', 'raw-size']) assert.ok(template.some(v => v.rule === rule), 'CSS template: ' + rule);
});

test('selectors, URLs, text, and unrelated attributes do not create style violations', () => {
  assert.deepEqual(lintSource(known, 'app.css', '#123 { background-image: url("/icon.svg#123"); content: "rgb(1, 2, 3)"; }'), []);
  assert.deepEqual(lintSource(known, 'Receipt.tsx', '<span id="#123" title="rgb(1, 2, 3)" data-name="acme-receipt">#123 bg-red-500 !important</span>'), []);
});

test('suppression comments still apply to declaration and attribute locations', () => {
  assert.deepEqual(lintSource(known, 'styles.ts', 'const label = {\n // canon-allow\n color: "#123456"\n};'), []);
  assert.deepEqual(lintSource(known, 'Button.tsx', '/* canon-allow */\n<button className="acme-button" data-variant="nope" />'), []);
  assert.ok(lintSource(known, 'app.css', '.label { @apply bg-red-500; }').some(v => v.rule === 'tailwind-palette'));
});
