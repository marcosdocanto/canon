// Shared design validation and rollback-capable local file writes.
import { readFileSync, writeFileSync, mkdirSync, lstatSync, realpathSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, sep, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadDesignDir, validateSystem } from './system.ts';
import type { System, SystemMeta } from './types.ts';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new HttpError(400, message);
}

export function record(value: unknown, name: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} must be an object`);
  return value as Record<string, unknown>;
}

function strings(value: unknown, name: string) {
  requireValue(Array.isArray(value) && value.every((item) => typeof item === 'string'), `${name} must be an array of strings`);
}

export function identifier(value: unknown, name: string) {
  requireValue(typeof value === 'string' && value.length <= 128 && SLUG.test(value), `${name} must be a lowercase slug`);
}

export function validateMeta(value: unknown, designRoot: string, outputRoot: string): asserts value is SystemMeta {
  const meta = record(value, 'meta');
  for (const key of ['name', 'version']) requireValue(typeof meta[key] === 'string' && meta[key].trim(), `meta.${key} must be a nonempty string`);
  identifier(meta.prefix, 'meta.prefix');
  requireValue(meta.description === undefined || typeof meta.description === 'string', 'meta.description must be a string');
  requireValue(meta.defaultTheme === 'light' || meta.defaultTheme === 'dark', 'meta.defaultTheme must be light or dark');
  const direction = record(meta.direction, 'meta.direction');
  requireValue(typeof direction.summary === 'string', 'meta.direction.summary must be a string');
  strings(direction.principles, 'meta.direction.principles');
  strings(direction.never, 'meta.direction.never');
  const seeds = record(meta.seeds, 'meta.seeds');
  for (const key of ['name', 'prefix', 'brand']) requireValue(typeof seeds[key] === 'string', `meta.seeds.${key} must be a string`);
  identifier(seeds.prefix, 'meta.seeds.prefix');
  for (const key of ['action', 'canvasLight', 'inkDark', 'fontSans', 'fontMono', 'fontDisplay', 'shadowTint']) requireValue(seeds[key] === undefined || typeof seeds[key] === 'string', `meta.seeds.${key} must be a string`);
  for (const key of ['neutralHue', 'neutralChroma', 'radiusScale', 'baseFontSize', 'controlHeight']) requireValue(seeds[key] === undefined || (typeof seeds[key] === 'number' && Number.isFinite(seeds[key])), `meta.seeds.${key} must be a finite number`);
  requireValue(seeds.defaultTheme === undefined || seeds.defaultTheme === 'light' || seeds.defaultTheme === 'dark', 'meta.seeds.defaultTheme must be light or dark');
  for (const key of ['overrides', 'presetOverrides']) if (seeds[key] !== undefined) record(seeds[key], `meta.seeds.${key}`);
  const lint = record(meta.lint, 'meta.lint');
  for (const key of ['include', 'exclude', 'allow']) strings(lint[key], `meta.lint.${key}`);
  requireValue(typeof lint.tailwind === 'boolean', 'meta.lint.tailwind must be a boolean');
  const icons = record(meta.icons, 'meta.icons');
  for (const key of ['set', 'strokeWidth', 'note']) requireValue(typeof icons[key] === 'string', `meta.icons.${key} must be a string`);
  requireValue(typeof meta.out === 'string' && meta.out.length > 0 && !isAbsolute(meta.out) && !meta.out.includes('\\') && meta.out.split('/').every((part) => part !== '.' && part !== '..' && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part)), 'meta.out must be a relative output directory');
  requireValue(!['components', 'patterns', 'system.json', 'tokens.json'].includes(meta.out.split('/')[0]), 'meta.out must not overlap design source files');
  // Keep an active Studio attached to its configured output; changing it requires a restart.
  requireValue(resolve(designRoot, meta.out) === outputRoot, 'Studio cannot change meta.out; use the configured output directory');
}

export function contained(root: string, path: string) {
  const rel = relative(root, path);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw new HttpError(403, 'Path is outside the Studio directory');
}

export function maybeStat(path: string) {
  try { return lstatSync(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}

/** Source/output writes reject symlinks, including dangling links and linked parents. */
export function sourcePath(root: string, path: string, kind: 'file' | 'directory') {
  contained(root, path);
  if (realpathSync(root) !== root) throw new HttpError(403, 'The Studio design directory has moved');
  const parts = relative(root, path).split(sep).filter(Boolean);
  let current = root;
  for (let i = -1; i < parts.length; i++) {
    if (i >= 0) current = join(current, parts[i]);
    const info = maybeStat(current);
    if (!info) continue;
    if (info.isSymbolicLink()) throw new HttpError(403, 'Studio does not read or write design files through symlinks');
    const directory = i < parts.length - 1 || kind === 'directory';
    if (directory ? !info.isDirectory() : !info.isFile()) throw new HttpError(409, 'A Studio path has the wrong file type');
  }
  return path;
}

export function loadSource(root: string): System {
  for (const file of ['system.json', 'tokens.json']) sourcePath(root, join(root, file), 'file');
  for (const folder of ['components', 'patterns']) {
    const path = sourcePath(root, join(root, folder), 'directory');
    if (maybeStat(path)) for (const file of readdirSync(path)) if (file.endsWith('.json')) sourcePath(root, join(path, file), 'file');
  }
  return loadDesignDir(root);
}

/** Validate a complete imported snapshot before creating any source/output files. */
export function validateSnapshot(value: unknown): System {
  const source = record(value, 'Design snapshot');
  const meta = record(source.meta, 'meta');
  requireValue(typeof meta.out === 'string', 'meta.out must be a relative output directory');
  const root = resolve('.');
  validateMeta(meta, root, resolve(root, meta.out));
  record(source.tokens, 'tokens');
  for (const collection of ['components', 'patterns']) {
    requireValue(Array.isArray(source[collection]), `${collection} must be an array`);
    const slugs = new Set<string>();
    for (const item of source[collection] as unknown[]) {
      const spec = record(item, `${collection} entry`);
      identifier(spec.slug, `${collection} slug`);
      requireValue(!slugs.has(spec.slug as string), `Duplicate ${collection} slug: ${spec.slug}`);
      slugs.add(spec.slug as string);
    }
  }
  const system = source as unknown as System;
  const validation = validateSystem(system);
  requireValue(!validation.errors.length, validation.errors.slice(0, 5).join('; '));
  return system;
}

export interface Write { root?: string; path: string; content: Buffer; previous?: Buffer; mode?: number }

function replaceFile(root: string, write: Write, content: Buffer) {
  sourcePath(write.root ?? root, write.path, 'file');
  mkdirSync(dirname(write.path), { recursive: true });
  const temporary = join(dirname(write.path), `.canon-${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, content, { flag: 'wx', mode: write.mode ?? 0o644 });
    sourcePath(write.root ?? root, write.path, 'file');
    renameSync(temporary, write.path);
  } finally { rmSync(temporary, { force: true }); }
}

/** Preflight all destinations before mutation, then replace files atomically and roll back errors. */
export function installFiles(root: string, writes: Write[]) {
  for (const write of writes) {
    sourcePath(write.root ?? root, write.path, 'file');
    const info = maybeStat(write.path);
    if (info) { write.previous = readFileSync(write.path); write.mode = info.mode & 0o777; }
  }
  const installed: Write[] = [];
  try {
    for (const write of writes) { replaceFile(write.root ?? root, write, write.content); installed.push(write); }
  } catch (error) {
    for (const write of installed.reverse()) {
      try {
        if (write.previous !== undefined) replaceFile(write.root ?? root, write, write.previous);
        else { sourcePath(write.root ?? root, write.path, 'file'); rmSync(write.path); }
      } catch { /* Preserve the original failure; never follow a changed filesystem boundary. */ }
    }
    throw error;
  }
}
