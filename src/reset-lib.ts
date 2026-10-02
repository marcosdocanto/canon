// A reviewable, expiring reset plan. Downloads and generation happen before confirmation;
// applying a plan uses exactly those bytes, backed up and committed in one rollback-capable batch.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Adapter } from './adapters/types.ts';
import { buildLibWrites } from './build-lib.ts';
import { HttpError, installFiles, sourcePath, type Write } from './design-files.ts';

const fingerprint = (file: string) => existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('hex') : null;
interface WatchedFile { root: string; path: string; hash: string | null }
interface Plan { id: string; expires: number; writes: Write[]; watched: WatchedFile[]; inventory: string; summary: object }

export function libraryReset(root: string, designDir: string, adapter: Adapter, lock: { saving: boolean }) {
  const plans = new Map<string, Plan>();
  const inventoryKey = () => JSON.stringify(adapter.inventory(root).map(c => [c.slug, c.file]));
  function watch(file: string, boundary = root): WatchedFile {
    sourcePath(boundary, file, 'file');
    return { root: boundary, path: file, hash: fingerprint(file) };
  }
  function verify(plan: Pick<Plan, 'watched' | 'inventory'>) {
    if (inventoryKey() !== plan.inventory) throw new HttpError(409, 'The library changed. Close this dialog and review a new reset.');
    for (const file of plan.watched) {
      sourcePath(file.root, file.path, 'file');
      if (fingerprint(file.path) !== file.hash) throw new HttpError(409, `${relative(root, file.path)} changed. Close this dialog and review a new reset.`);
    }
  }
  function designInputs(folder: string): string[] {
    sourcePath(designDir, folder, 'directory');
    if (!existsSync(folder)) return [];
    return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
      const file = join(folder, entry.name);
      if (entry.isSymbolicLink()) throw new HttpError(403, 'Reset does not follow symlinks.');
      return entry.isFile() && entry.name.endsWith('.json') ? [file] : [];
    });
  }
  return {
    async prepare() {
      if (!adapter.resetDefaults) throw new HttpError(422, 'This library does not support full reset.');
      if (lock.saving) throw new HttpError(409, 'A save or reset is already in progress.');
      lock.saving = true;
      try {
        for (const [id, plan] of plans) if (plan.expires < Date.now()) plans.delete(id);
        if (plans.size >= 5) plans.delete(plans.keys().next().value!);
        const inventory = inventoryKey();
        const watched = [...new Set([
          join(root, 'components.json'), join(root, 'package.json'), join(root, 'tsconfig.json'), join(root, 'jsconfig.json'),
          join(root, '.canon/project.json'), adapter.readTheme(root).file, ...adapter.inventory(root).map(c => c.file),
        ])].map(file => watch(file));
        watched.push(...[...designInputs(designDir), ...designInputs(join(designDir, 'components')), ...designInputs(join(designDir, 'patterns'))].map(file => watch(file, designDir)));
        const defaults = await adapter.resetDefaults(root);
        const generated = await buildLibWrites(root, designDir, { theme: defaults.theme, components: defaults.components });
        const writes = [...defaults.writes, ...generated];
        verify({ watched, inventory });
        for (const write of writes) if (!watched.some(file => file.path === write.path)) watched.push(watch(write.path, write.root ?? root));
        const id = randomUUID();
        const summary = { id, label: defaults.label, restored: defaults.restored, preserved: defaults.preserved,
          tokens: defaults.tokens, files: defaults.writes.map(write => relative(root, write.path)),
          source: 'Current official shadcn defaults for your configured style and base color' };
        plans.set(id, { id, expires: Date.now() + 5 * 60_000, writes, watched, inventory, summary });
        return summary;
      } finally { lock.saving = false; }
    },
    cancel(id: string) { plans.delete(id); },
    apply(id: string) {
      if (lock.saving) throw new HttpError(409, 'A save or reset is already in progress.');
      const plan = plans.get(id);
      if (!plan || plan.expires < Date.now()) throw new HttpError(409, 'This reset expired. Close this dialog and review a new reset.');
      lock.saving = true;
      try {
        verify(plan);
        const backup = `.canon/backups/library-reset/${id}`;
        const records: { path: string; backup: string | null }[] = [];
        const backups: Write[] = [];
        for (const [index, write] of plan.writes.entries()) {
          const saved = existsSync(write.path) ? `${String(index).padStart(3, '0')}-${write.path.split('/').pop()}` : null;
          records.push({ path: write.path, backup: saved });
          if (saved) backups.push({ path: join(root, backup, saved), content: readFileSync(write.path) });
        }
        backups.push({ path: join(root, backup, 'manifest.json'), content: Buffer.from(JSON.stringify({
          version: 1, created: new Date().toISOString(), source: plan.summary, files: records,
        }, null, 2) + '\n') });
        installFiles(root, [...backups, ...plan.writes]);
        plans.delete(id);
        return { backup };
      } finally { lock.saving = false; }
    },
  };
}
