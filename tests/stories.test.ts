import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inventory } from '../src/adapters/shadcn/inventory.ts';
import { shadcnAdapter } from '../src/adapters/shadcn/index.ts';
import { installFiles } from '../src/design-files.ts';
import { GENERATED_MARK, ensureStorybook, storyWrites } from '../src/generators/stories.ts';
import { clone } from './fixtures/clone.ts';

test('storyWrites generates a marked story per component, one element per render example', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const writes = storyWrites(root, shadcnAdapter, components);

  const button = writes.find((w) => w.path === join(root, 'stories', 'canon', 'button.stories.tsx'))!;
  assert.ok(button, 'button story is written');
  const content = button.content.toString('utf8');
  assert.ok(content.startsWith(GENERATED_MARK), 'marker must be the first line');
  assert.match(content, /import \{ Button \} from '~\/ui\/button';/);
  assert.match(content, /title: 'Canon\/Button'/);

  const buttonComponent = components.find((c) => c.slug === 'button')!;
  const examples = shadcnAdapter.renderSpec(buttonComponent);
  assert.ok(examples.length > 1, 'fixture button has multiple variant examples');
  for (const example of examples) assert.ok(content.includes(example.jsx), `missing element for "${example.title}"`);
  // one element per example: same number of Button JSX tags as examples
  const tagCount = (content.match(/<Button[ >]/g) ?? []).length;
  assert.equal(tagCount, examples.length);
});

test('read-only components get a single default example plus a docs note with the reason', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const badge = components.find((c) => c.slug === 'badge')!;
  assert.ok(badge.readOnlyReason, 'fixture badge is read-only');
  assert.equal(badge.cva, undefined);

  const writes = storyWrites(root, shadcnAdapter, components);
  const badgeWrite = writes.find((w) => w.path === join(root, 'stories', 'canon', 'badge.stories.tsx'))!;
  const content = badgeWrite.content.toString('utf8');
  assert.ok(content.startsWith(GENERATED_MARK));
  assert.match(content, /import \{ Badge \} from '~\/ui\/badge';/);

  const tagCount = (content.match(/<Badge[ >]/g) ?? []).length;
  assert.equal(tagCount, 1, 'read-only component gets a single default example');
  assert.ok(content.includes('Style block is read-only for Canon:'), 'docs note present');
  assert.ok(content.includes(badge.readOnlyReason!), 'docs note includes the actual reason');
});

test('never clobbers unmarked story', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const storiesDir = join(root, 'stories', 'canon');
  mkdirSync(storiesDir, { recursive: true });
  const target = join(storiesDir, 'button.stories.tsx');
  writeFileSync(target, '// hand-written story, not generated\nexport default {};\n');

  assert.throws(
    () => storyWrites(root, shadcnAdapter, components),
    (error: unknown) => error instanceof Error && error.message === `refusing to overwrite unmarked story: ${target}`,
  );

  // Nothing else was written either — the batch is validated before any Write is produced.
  const badgeTarget = join(storiesDir, 'badge.stories.tsx');
  assert.throws(() => readFileSync(badgeTarget));
});

test('regenerating a previously generated story succeeds', (t) => {
  const root = clone(t);
  const components = inventory(root);
  const storiesDir = join(root, 'stories', 'canon');
  mkdirSync(storiesDir, { recursive: true });
  const target = join(storiesDir, 'button.stories.tsx');
  writeFileSync(target, `${GENERATED_MARK}\n// stale content from a previous build\n`);

  const writes = storyWrites(root, shadcnAdapter, components);
  assert.doesNotThrow(() => installFiles(root, writes));
  const content = readFileSync(target, 'utf8');
  assert.ok(content.startsWith(GENERATED_MARK));
  assert.match(content, /Button/);
});

test('ensureStorybook reports present without shelling out when .storybook exists', async (t) => {
  const root = clone(t);
  mkdirSync(join(root, '.storybook'), { recursive: true });
  let called = false;
  const result = await ensureStorybook(root, async () => { called = true; return { status: 0, stdout: '', stderr: '' }; });
  assert.equal(result, 'present');
  assert.equal(called, false, 'must not shell out when already installed');
});

test('ensureStorybook runs npx storybook init when missing, via the injected exec', async (t) => {
  const root = clone(t);
  const calls: any[] = [];
  const result = await ensureStorybook(root, async (cmd, args, opts) => {
    calls.push([cmd, args, opts]);
    return { status: 0, stdout: '', stderr: '' };
  });
  assert.equal(result, 'installed');
  assert.deepEqual(calls[0][0], 'npx');
  assert.deepEqual(calls[0][1], ['storybook@latest', 'init', '--yes']);
  assert.equal(calls[0][2].cwd, root);
});

test('ensureStorybook surfaces a failed init', async (t) => {
  const root = clone(t);
  await assert.rejects(
    () => ensureStorybook(root, async () => ({ status: 1, stdout: '', stderr: 'boom' })),
    /boom/,
  );
});
