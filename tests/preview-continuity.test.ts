import {test} from 'node:test';
import assert from 'node:assert/strict';
import {samePreviewView} from '../studio/preview-continuity.js';

test('dialog state transfers only between drafts of the exact same preview target', () => {
  const old = {kind:'draft', page:'components', target:'alert-dialog'};
  assert.equal(samePreviewView(old, {...old, version:2}),true);
  assert.equal(samePreviewView(old, {...old, target:'dialog'}),false);
  assert.equal(samePreviewView(old, {...old, page:'theme'}),false);
  assert.equal(samePreviewView(old, {...old, kind:'storybook'}),false);
  assert.equal(samePreviewView(undefined,old),false);
});
