import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSystem } from '../src/system.ts';
import { indexTokens } from '../src/tokens/resolve.ts';
import { lintSource, knownFromSystem } from '../src/lint.ts';

const system = await createSystem({ name: 'Lint', prefix: 'acme' });
const known = knownFromSystem(system, indexTokens(system.tokens, 'acme'));

test('tailwind-arbitrary-color flags hex colors but not dimension values', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="bg-[#7c3aed] w-[13px] text-primary" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1, 'exactly one color violation');
  assert.equal(colorViolations[0].message, 'arbitrary color value bypasses the theme');
});

test('tailwind-arbitrary-color flags rgb colors', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="text-[rgb(1,2,3)]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1);
});

test('tailwind-arbitrary-color flags oklch colors', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="ring-[oklch(0.5 0.2 240)]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1);
});

test('tailwind-arbitrary-color flags hsl colors', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="from-[hsl(120 100% 50%)]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1);
});

test('tailwind-arbitrary-color flags color() function', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="shadow-[color(display-p3 1 0 0)]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1);
});

test('tailwind-arbitrary-color flags via colors', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="via-[#fff]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1);
});

test('tailwind-arbitrary-color does not flag non-color arbitrary values', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="w-[13px] gap-[24px] grid-cols-[1fr_2fr]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 0);
});

test('no duplicate violations for hex color arbitrary values', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="bg-[#7c3aed]" />');
  assert.equal(violations.length, 1, 'exactly one total violation');
  assert.equal(violations[0].rule, 'tailwind-arbitrary-color', 'violation is from tailwind-arbitrary-color rule');
});

test('tailwind-arbitrary-color flags divide color arbitrary values', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="divide-[#e5e7eb]" />');
  assert.equal(violations.length, 1, 'exactly one total violation');
  assert.equal(violations[0].rule, 'tailwind-arbitrary-color');
});

test('tailwind-arbitrary-color flags placeholder color arbitrary values', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="placeholder-[#fff]" />');
  assert.equal(violations.length, 1, 'exactly one total violation');
  assert.equal(violations[0].rule, 'tailwind-arbitrary-color');
});

test('tailwind-arbitrary-color does not flag divide-x dimension values', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="divide-x-[3px]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 0, 'no color violations for divide-x-[3px]');
});

test('tailwind-arbitrary-color flags side-modified border color arbitrary values', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="border-t-[#ff0000]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1, 'border-t-[#ff0000] is flagged as an arbitrary color');
});

test('tailwind-arbitrary-color flags ring-offset color arbitrary values', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="ring-offset-[#00ff00]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1, 'ring-offset-[#00ff00] is flagged as an arbitrary color');
});

test('tailwind-arbitrary-color flags divide-x color arbitrary values', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="divide-x-[#abcdef]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1, 'divide-x-[#abcdef] is flagged as an arbitrary color');
});

test('tailwind-arbitrary-color does not claim border-t-[3px]; the generic arbitrary rule still does', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="border-t-[3px]" />');
  assert.equal(violations.filter(v => v.rule === 'tailwind-arbitrary-color').length, 0, 'border-t-[3px] is not a color violation');
  assert.equal(violations.filter(v => v.rule === 'tailwind-arbitrary').length, 1, 'border-t-[3px] is still caught by the generic arbitrary-value rule');
});

test('tailwind-arbitrary-color flags a composite arbitrary value with an embedded color function', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 1, 'shadow-[0_1px_2px_rgba(0,0,0,0.3)] is flagged as a color violation');
});

test('tailwind-arbitrary-color still leaves w-[13px] unflagged', () => {
  const violations = lintSource(known, 'Test.tsx', '<button className="w-[13px]" />');
  const colorViolations = violations.filter(v => v.rule === 'tailwind-arbitrary-color');
  assert.equal(colorViolations.length, 0, 'w-[13px] is never a color violation');
});
