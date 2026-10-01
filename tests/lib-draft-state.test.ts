import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileSavedDraft, createPreviewVersion } from '../src/lib-editor/draft-state.js';

test('save reconciliation preserves edits made after submission but adopts normalized saved values otherwise', () => {
  const sent = { theme: { primary: 'red' }, components: { button: { base: ['p-4'] } }, parts: { card: { CardTitle: 'text-xl' } } };
  const current = structuredClone(sent);
  current.components.button.base = ['p-8'];
  const saved = { theme: { primary: 'red' }, components: { button: { base: ['p-4 normalized'] } }, parts: { card: { CardTitle: 'text-xl normalized' } } };
  assert.deepEqual(reconcileSavedDraft(sent, current, saved), { theme: saved.theme, components: current.components, parts: saved.parts });
});

test('a newer draft invalidates an older preview before its debounce request starts', () => {
  const versions = createPreviewVersion();
  const first = versions.next();
  const second = versions.next();
  assert.equal(versions.isCurrent(first), false);
  assert.equal(versions.isCurrent(second), true);
});
