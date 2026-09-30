// shadcn/render.ts: JSX example snippets for a component's cva() variant values. Covers the
// icon-size preview fix — a square icon-sized button (size "icon"/"icon-xs"/"icon-sm"/"icon-lg")
// has no room for the per-slug default children ("Delete"), which overflowed its fixed h-*/w-*
// square in the library preview; a compact glyph replaces it for any variant value starting with
// "icon", regardless of axis name or component slug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderSpec } from '../src/adapters/shadcn/render.ts';
import type { ComponentInfo, CvaSpec } from '../src/adapters/types.ts';
import { parseCva, findCva } from '../src/adapters/shadcn/cva.ts';

const buttonSource = readFileSync(new URL('./fixtures/shadcn-app/src/ui/button.tsx', import.meta.url), 'utf8');
const buttonCva: CvaSpec = parseCva(buttonSource, findCva(buttonSource)!);
const buttonInfo: ComponentInfo = { slug: 'button', file: '/fake/project/src/ui/button.tsx', exportName: 'Button', importPath: '~/ui/button', cva: buttonCva };

test('renderSpec emits a compact glyph, never the default "Delete" children, for the real fixture\'s icon size value', () => {
  const examples = renderSpec(buttonInfo);
  const icon = examples.find((e) => e.title === 'size: icon');
  assert.ok(icon, 'fixture button has a size: icon variant');
  assert.equal(icon!.jsx, '<Button size="icon">✕</Button>');
  assert.doesNotMatch(icon!.jsx, /Delete/);
});

test('renderSpec still uses the normal per-slug default children for a non-icon size value', () => {
  const examples = renderSpec(buttonInfo);
  const sm = examples.find((e) => e.title === 'size: sm');
  assert.ok(sm);
  assert.equal(sm!.jsx, '<Button size="sm">Delete</Button>');
});

test('renderSpec glyphs any variant value whose key starts with "icon" (icon-xs/icon-sm/icon-lg), not just the bare "icon" value', () => {
  const cva: CvaSpec = {
    base: ['inline-flex'],
    variants: {
      size: {
        default: ['h-9', 'px-4'],
        icon: ['h-9', 'w-9'],
        'icon-xs': ['h-6', 'w-6'],
        'icon-sm': ['h-8', 'w-8'],
        'icon-lg': ['h-10', 'w-10'],
      },
    },
    compoundVariants: [],
    defaultVariants: { size: 'default' },
  };
  const info: ComponentInfo = { slug: 'button', file: '/fake/button.tsx', exportName: 'Button', importPath: '~/ui/button', cva };
  const examples = renderSpec(info);
  for (const name of ['icon', 'icon-xs', 'icon-sm', 'icon-lg']) {
    const example = examples.find((e) => e.title === `size: ${name}`);
    assert.ok(example, `expected an example for size: ${name}`);
    assert.equal(example!.jsx, `<Button size="${name}">✕</Button>`);
  }
  const defaultExample = examples.find((e) => e.title === 'size: default');
  assert.equal(defaultExample!.jsx, '<Button size="default">Delete</Button>');
});

test('renderSpec only glyphs a value starting with "icon", not an axis merely named "icon" with an unrelated value', () => {
  const cva: CvaSpec = {
    base: ['inline-flex'],
    variants: { icon: { arrow: ['size-4'], chevron: ['size-4'] } },
    compoundVariants: [],
    defaultVariants: { icon: 'arrow' },
  };
  const info: ComponentInfo = { slug: 'button', file: '/fake/button.tsx', exportName: 'Button', importPath: '~/ui/button', cva };
  const examples = renderSpec(info);
  for (const example of examples) assert.equal(example.jsx, `<Button icon="${example.title.split(': ')[1]}">Delete</Button>`);
});

test('renderSpec falls back to the generic "…" filler for a slug with no per-slug template, even for an icon-ish value', () => {
  const cva: CvaSpec = { base: ['inline-flex'], variants: { size: { icon: ['h-9', 'w-9'] } }, compoundVariants: [], defaultVariants: { size: 'icon' } };
  const info: ComponentInfo = { slug: 'mystery-widget', file: '/fake/mystery-widget.tsx', exportName: 'MysteryWidget', importPath: '~/ui/mystery-widget', cva };
  const examples = renderSpec(info);
  assert.equal(examples[0].jsx, '<MysteryWidget size="icon">✕</MysteryWidget>');
});
