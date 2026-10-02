import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseClassList, composeClassList } from '../src/lib-editor/classmap.js';

const THEME = ['primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'destructive', 'muted', 'muted-foreground', 'accent', 'background', 'foreground', 'border', 'input', 'ring', 'transparent', 'black', 'white'];

test('round-trip is byte-identical for every fixture literal', () => {
  for (const file of ['button.tsx', 'badge.tsx', 'dialog.tsx', 'card.tsx']) {
    let source = '';
    try { source = readFileSync(new URL(`./fixtures/shadcn-app/src/ui/${file}`, import.meta.url), 'utf8'); }
    catch { continue; } // card.tsx may not exist in the fixture set
    for (const match of source.matchAll(/"([^"\n]{20,})"/g)) {
      const literal = match[1];
      if (!/^[\w[\]/:&>_.,()'%#!-]+( [\w[\]/:&>_.,()'%#!-]+)*$/.test(literal)) continue;
      const parsed = parseClassList(literal, THEME);
      assert.equal(composeClassList(parsed), literal, `round-trip failed for: ${literal.slice(0, 60)}`);
    }
  }
});

test('classifies the designer families', () => {
  const parsed = parseClassList('bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-xs font-medium border shadow-sm hover:bg-primary/90', THEME);
  const families = parsed.props.map((p) => p.family);
  assert.deepEqual(families, ['background', 'textColor', 'radius', 'spacing', 'spacing', 'fontSize', 'fontWeight', 'borderWidth', 'shadow']);
  assert.deepEqual(parsed.rest, ['hover:bg-primary/90']); // prefixed → opaque
});

test('text disambiguation: size vs color vs rest', () => {
  const parsed = parseClassList('text-lg text-primary text-unknowntoken', THEME);
  assert.equal(parsed.props[0].family, 'fontSize');
  assert.equal(parsed.props[1].family, 'textColor');
  assert.deepEqual(parsed.rest, ['text-unknowntoken']);
});

test('color with opacity and raw arbitrary values', () => {
  const parsed = parseClassList('bg-primary/80 bg-[#ff0066] ring-ring/50', THEME);
  assert.deepEqual(parsed.props[0], { family: 'background', kind: 'theme', value: 'primary', opacity: '80', slot: 0 });
  assert.deepEqual(parsed.props[1], { family: 'background', kind: 'raw', value: '#ff0066', opacity: undefined, slot: 1 });
  assert.equal(parsed.props[2].opacity, '50');
});

test('edit replaces in place, preserving order; removal and addition work', () => {
  const literal = 'inline-flex bg-primary px-2 hover:underline';
  const parsed = parseClassList(literal, THEME);
  const bgSlot = parsed.props.find((p) => p.family === 'background').slot;
  const edited = composeClassList(parsed, new Map([[bgSlot, { family: 'background', kind: 'theme', value: 'destructive' }]]));
  assert.equal(edited, 'inline-flex bg-destructive px-2 hover:underline');
  const removed = composeClassList(parsed, new Map([[bgSlot, null]]));
  assert.equal(removed, 'inline-flex px-2 hover:underline');
  const added = composeClassList(parsed, new Map(), [{ family: 'radius', side: '', value: 'lg' }]);
  assert.equal(added, 'inline-flex bg-primary px-2 hover:underline rounded-lg');
});

test('opaque tokens never classify: variants, arbitrary selectors, important', () => {
  const parsed = parseClassList('dark:bg-input/30 [&_svg]:size-4 !bg-red-500 md:p-4 data-[state=open]:bg-accent', THEME);
  assert.equal(parsed.props.length, 0);
  assert.equal(parsed.rest.length, 5);
});
