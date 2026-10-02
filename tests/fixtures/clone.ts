// Shared test helper: clone the shadcn-app fixture into a fresh, auto-cleaned temp directory.
import { cpSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const FIXTURE = new URL('./shadcn-app', import.meta.url).pathname;

/** Clone the shadcn-app fixture into a fresh temp dir that's removed when `t`'s test finishes. */
export function clone(t: any): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'canon shadcn-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
}
