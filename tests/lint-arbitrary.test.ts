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
