import {test} from 'node:test';
import assert from 'node:assert/strict';
import {radiusOverrideHint} from '../studio/instance-override.js';

test('important local radius overrides are explained without flagging shared important classes',()=>{
  assert.match(radiusOverrideHint('h-8! rounded-lg! bg-input/30','rounded-full border'),/overrides Radius with rounded-lg!/);
  assert.match(radiusOverrideHint('!rounded-lg','rounded-full'),/!rounded-lg/);
  assert.equal(radiusOverrideHint('rounded-lg! border','rounded-lg! border'),'');
  assert.equal(radiusOverrideHint('hover:rounded-lg! h-8!','rounded-full'),'');
  assert.equal(radiusOverrideHint('rounded-full','rounded-full'),'');
});
