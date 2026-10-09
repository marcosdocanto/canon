import { access, readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { HarnessConfig, HarnessDoctor, LoadedHarnessConfig } from './types.ts';

export const HARNESS_CONFIG = 'canon.config.json';
const fail = (path: string, message: string): never => { throw new Error(`${HARNESS_CONFIG}: ${path} ${message}`); };
function object(value: unknown, path: string, keys: string[]): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${path}.${key}`, 'is unsupported');
  return value as Record<string, any>;
}
function text(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) fail(path, 'must be a nonempty string without NUL bytes');
}
function list(value: unknown, path: string): any[] {
  if (!Array.isArray(value)) fail(path, 'must be an array');
  return value as any[];
}
function strings(value: unknown, path: string): string[] { return list(value, path).map((v, i) => { text(v, `${path}[${i}]`); return v; }); }
function argv(value: unknown, path: string) {
  const values = list(value, path);
  if (!values.length) fail(path, 'must contain an executable');
  text(values[0], `${path}[0]`);
  values.forEach((v, i) => { if (typeof v !== 'string' || v.includes('\0')) fail(`${path}[${i}]`, 'must be a string without NUL bytes'); });
}
function positive(value: unknown, path: string, max: number) {
  if (!Number.isInteger(value) || (value as number) <= 0 || (value as number) > max) fail(path, `must be an integer between 1 and ${max}`);
}
function id(value: unknown, path: string) { text(value, path); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) fail(path, 'must use letters, numbers, underscores or hyphens'); }
function unique(values: string[], path: string) { if (new Set(values).size !== values.length) fail(path, 'contains duplicate IDs'); }
export function rootedPath(root: string, path: string): string {
  if (isAbsolute(path)) throw new Error(`Path must be relative to project root: ${path}`);
  const full = resolve(root, path); const rel = relative(root, full);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`Path escapes project root: ${path}`);
  return full;
}
export async function checkedPath(root: string, path: string): Promise<string> {
  const full = rootedPath(root, path);
  const resolved = await realpath(full);
  const rel = relative(await realpath(root), resolved);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`Path escapes project root through a symlink: ${path}`);
  return resolved;
}
export function validateHarnessConfig(value: unknown): HarnessConfig {
  const c = object(value, 'config', ['schemaVersion', 'context', 'checks', 'app', 'scenarios', 'completion']);
  if (c.schemaVersion !== 1) fail('schemaVersion', 'must be 1');
  const context = object(c.context, 'context', ['documents', 'skills']);
  for (const kind of ['documents', 'skills']) strings(context[kind], `context.${kind}`).forEach(p => { try { rootedPath('/project', p); } catch { fail(`context.${kind}`, `contains a path outside the project: ${p}`); } });
  const checks = list(c.checks, 'checks');
  checks.forEach((value, i) => {
    const p = `checks[${i}]`; const v = object(value, p, ['id', 'command', 'cwd', 'timeoutMs']);
    id(v.id, `${p}.id`); argv(v.command, `${p}.command`);
    if (v.cwd !== undefined) { text(v.cwd, `${p}.cwd`); try { rootedPath('/project', v.cwd); } catch { fail(`${p}.cwd`, 'must remain inside the project'); } }
    if (v.timeoutMs !== undefined) positive(v.timeoutMs, `${p}.timeoutMs`, 86_400_000);
  });
  unique(checks.map(v => v.id), 'checks');
  if (c.app !== undefined) {
    const app = object(c.app, 'app', ['url', 'start', 'readyTimeoutMs']); text(app.url, 'app.url');
    let url: URL; try { url = new URL(app.url); } catch { fail('app.url', 'must be an absolute http(s) URL'); }
    if (!['http:', 'https:'].includes(url!.protocol) || url!.username || url!.password) fail('app.url', 'must be an http(s) URL without credentials');
    if (app.start !== undefined) argv(app.start, 'app.start');
    if (app.readyTimeoutMs !== undefined) positive(app.readyTimeoutMs, 'app.readyTimeoutMs', 600_000);
  }
  const scenarios = list(c.scenarios, 'scenarios');
  scenarios.forEach((value, i) => {
    const p = `scenarios[${i}]`; const v = object(value, p, ['id', 'path', 'viewports', 'readySelector', 'colorScheme']);
    id(v.id, `${p}.id`); text(v.path, `${p}.path`);
    if (!v.path.startsWith('/') || v.path.startsWith('//') || v.path.includes('\\')) fail(`${p}.path`, 'must be a same-origin path beginning with /');
    const viewports = list(v.viewports, `${p}.viewports`);
    if (!viewports.length) fail(`${p}.viewports`, 'must contain at least one viewport');
    viewports.forEach((vp, j) => { const q = `${p}.viewports[${j}]`; const viewport = object(vp, q, ['name', 'width', 'height']); id(viewport.name, `${q}.name`); positive(viewport.width, `${q}.width`, 16384); positive(viewport.height, `${q}.height`, 16384); });
    unique(viewports.map(vp => vp.name), `${p}.viewports`);
    if (v.readySelector !== undefined) text(v.readySelector, `${p}.readySelector`);
    if (v.colorScheme !== undefined && !['light', 'dark'].includes(v.colorScheme)) fail(`${p}.colorScheme`, 'must be light or dark');
  });
  unique(scenarios.map(v => v.id), 'scenarios');
  if (scenarios.length && !c.app) fail('app', 'is required when scenarios are configured');
  const completion = object(c.completion, 'completion', ['requiredChecks', 'requiredScenarios']);
  for (const [key, known] of [['requiredChecks', checks], ['requiredScenarios', scenarios]] as const) {
    const ids = strings(completion[key], `completion.${key}`); unique(ids, `completion.${key}`);
    for (const wanted of ids) if (!known.some(v => v.id === wanted)) fail(`completion.${key}`, `references unknown ID ${wanted}`);
  }
  return c as HarnessConfig;
}
const exists = async (path: string) => { try { await access(path); return true; } catch { return false; } };
/** Discover project ownership before parsing policy, including existing runs when reporting. */
export async function discoverHarnessRoot(start: string, options: { includeRuns?: boolean } = {}): Promise<string> {
  let root = await realpath(resolve(start));
  if (!(await stat(root)).isDirectory()) throw new Error(`Harness root is not a directory: ${root}`);
  while (true) {
    if (await exists(resolve(root, HARNESS_CONFIG)) || options.includeRuns && await exists(resolve(root, '.canon/runs'))) return root;
    if (await exists(resolve(root, 'package.json')) || await exists(resolve(root, '.git')) || dirname(root) === root) break;
    root = dirname(root);
  }
  throw new Error(`No ${HARNESS_CONFIG}${options.includeRuns ? ' or harness runs' : ''} found within project boundary from ${start}. Create it with canon harness init.`);
}
export async function loadHarnessConfig(start: string): Promise<LoadedHarnessConfig> {
  const root = await discoverHarnessRoot(start);
  const configPath = resolve(root, HARNESS_CONFIG);
  await checkedPath(root, HARNESS_CONFIG);
  let raw: unknown; try { raw = JSON.parse(await readFile(configPath, 'utf8')); } catch (error) { throw new Error(`${configPath}: invalid JSON: ${(error as Error).message}`); }
  return { root, configPath, config: validateHarnessConfig(raw) };
}
export async function doctorHarness(start: string): Promise<HarnessDoctor> {
  const result: HarnessDoctor = { ok: false, root: resolve(start), errors: [], warnings: [] };
  try {
    const loaded = await loadHarnessConfig(start); result.root = loaded.root; result.configPath = loaded.configPath;
    for (const kind of ['documents', 'skills'] as const) for (const path of loaded.config.context[kind]) {
      try { const full = await checkedPath(loaded.root, path); if (!(await stat(full)).isFile()) throw new Error('must be a file'); await access(full); }
      catch (error) { result.errors.push(`context.${kind}: ${path}: ${(error as Error).message}`); }
    }
    for (const check of loaded.config.checks) if (check.cwd) {
      try { if (!(await stat(await checkedPath(loaded.root, check.cwd))).isDirectory()) throw new Error('must be a directory'); }
      catch (error) { result.errors.push(`checks.${check.id}.cwd: ${(error as Error).message}`); }
    }
    if (!loaded.config.completion.requiredChecks.length && !loaded.config.completion.requiredScenarios.length) result.warnings.push('No completion requirements configured; readiness cannot establish any executed evidence.');
    result.ok = result.errors.length === 0;
  } catch (error) { result.errors.push((error as Error).message); }
  return result;
}
