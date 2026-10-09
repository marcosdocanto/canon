import { mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { discoverHarnessRoot, loadHarnessConfig } from './config.ts';
import { hash, snapshotSource } from './snapshot.ts';
import type { HarnessReport } from './types.ts';

export function completionReady(report: HarnessReport): boolean {
  const { requiredChecks, requiredScenarios } = report.config.completion;
  if (report.stale || report.errors.length || !requiredChecks.length && !requiredScenarios.length) return false;
  return requiredChecks.every(id => report.checks.filter(c => c.id === id).length === 1 && report.checks.some(c => c.id === id && c.status === 'passed')) &&
    requiredScenarios.every(id => report.config.scenarios.find(s => s.id === id)?.viewports.every(v => {
      const captures = report.captures.filter(c => c.scenarioId === id && c.viewport === v.name);
      return captures.length === 1 && captures[0].status === 'captured' && !!captures[0].sha256 && !!captures[0].path;
    }));
}
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const code = (value: unknown) => `<pre>${escape(value).replace(/[`\[\]]/g, c => `&#${c.charCodeAt(0)};`)}</pre>`;
const note = 'Screenshots record captured browser output. Capture does not establish visual quality or accessibility compliance. Readiness covers only the configured completion requirements. Status below is recorded at run completion; use canon report to revalidate freshness or canon verify to run again.';
export function renderHarnessMarkdown(report: HarnessReport): string {
  const lines = ['# Canon verification', '', `Run: ${escape(report.runId)}`, '', `Ready: **${report.ready ? 'yes' : 'no'}** · Stale: **${report.stale ? 'yes' : 'no'}**`, '', note, '', `Source: ${escape(report.sourceBefore.revision ?? 'no Git revision')} (${escape(report.sourceBefore.fingerprint)})`, '', '[JSON report](report.json) · [HTML report](report.html)', '', '## Checks', ''];
  for (const check of report.checks) lines.push(`### ${escape(check.id)} — ${check.status}`, '', `Exit: ${check.exitCode ?? 'none'} · Duration: ${check.durationMs} ms`, '', code(JSON.stringify(check.command)), '', code(check.stdout), '', code(check.stderr), '', escape(check.error ?? ''), '');
  lines.push('## Captures', '');
  for (const capture of report.captures) lines.push(`${escape(capture.scenarioId)} / ${escape(capture.viewport)}: ${capture.status}${capture.path ? ` — [artifact](${capture.path.split('/').map(encodeURIComponent).join('/')})` : ''}`, '', code(`Server: ${capture.server ?? 'unspecified'}; URL: ${capture.url ?? 'unspecified'}. ${capture.server === 'external' ? 'External server output is not tied to the recorded source revision.' : ''}`), '', escape(capture.error ?? ''), '');
  if (report.errors.length) lines.push('## Errors', '', ...report.errors.map(e => code(e)));
  return lines.join('\n');
}
export function renderHarnessHtml(report: HarnessReport): string {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"><title>Canon verification ${escape(report.runId)}</title><style>body{font:16px system-ui;max-width:960px;margin:40px auto;padding:0 24px;color:#17202a;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f2f4f6;padding:12px}img{max-width:100%;border:1px solid #ddd}article{border-top:1px solid #ddd;padding:16px 0}</style><body><h1>Canon verification</h1><p>Run: ${escape(report.runId)}</p><p>Ready: <strong>${report.ready ? 'yes' : 'no'}</strong> · Stale: ${report.stale ? 'yes' : 'no'}</p><p>${note}</p><p>Source: ${escape(report.sourceBefore.revision ?? 'no Git revision')} / ${escape(report.sourceBefore.fingerprint)}</p><p><a href="report.json">JSON report</a> · <a href="report.md">Markdown report</a></p><h2>Checks</h2>${report.checks.map(c => `<article><h3>${escape(c.id)}: ${c.status}</h3><p>Exit: ${c.exitCode ?? 'none'} · Duration: ${c.durationMs} ms</p>${code(JSON.stringify(c.command))}${code(c.stdout)}${code(c.stderr)}<p>${escape(c.error)}</p></article>`).join('')}<h2>Captures</h2>${report.captures.map(c => `<article><h3>${escape(c.scenarioId)} / ${escape(c.viewport)}: ${c.status}</h3>${c.path ? `<a href="${escape(c.path.split('/').map(encodeURIComponent).join('/'))}"><img src="${escape(c.path.split('/').map(encodeURIComponent).join('/'))}" alt="${escape(c.scenarioId)} at ${escape(c.viewport)} viewport" loading="lazy"></a>` : ''}<p>Server: ${escape(c.server ?? 'unspecified')} · URL: ${escape(c.url ?? 'unspecified')}</p>${c.server === 'external' ? '<p>External server output is not tied to the recorded source revision.</p>' : ''}<p>${escape(c.error)}</p></article>`).join('')}<h2>Errors</h2>${report.errors.map(code).join('')}</body></html>`;
}
/** Artifacts are local files inside this run, including after symlink resolution. */
export async function artifactPath(runDir: string, path: string): Promise<string> {
  if (isAbsolute(path) || path.includes('\\')) throw new Error(`Artifact path must be relative: ${path}`);
  const full = resolve(runDir, path); const rel = relative(runDir, full);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`Artifact path escapes run directory: ${path}`);
  const actual = await realpath(full); const actualRel = relative(await realpath(runDir), actual);
  if (actualRel === '..' || actualRel.startsWith(`..${sep}`)) throw new Error(`Artifact symlink escapes run directory: ${path}`);
  return actual;
}
export async function writeHarnessReport(report: HarnessReport): Promise<void> {
  await mkdir(report.runDir, { recursive: true });
  const contents = { 'report.json': JSON.stringify(report, null, 2) + '\n', 'report.html': renderHarnessHtml(report), 'report.md': renderHarnessMarkdown(report) };
  const artifacts: Record<string, string> = {};
  for (const [path, content] of Object.entries(contents)) { await writeFile(resolve(report.runDir, path), content); artifacts[path] = hash(content); }
  for (const capture of report.captures) if (capture.path && capture.sha256) artifacts[capture.path] = capture.sha256;
  await writeFile(resolve(report.runDir, 'manifest.json'), JSON.stringify({ schemaVersion: 1, runId: report.runId, artifacts }, null, 2) + '\n');
}
export async function readHarnessReport(start: string, runId?: string): Promise<HarnessReport> {
  // Find the run's owning project even if its current configuration is invalid or deleted.
  const root = await discoverHarnessRoot(start, { includeRuns: true });
  const runsDir = resolve(root, '.canon/runs');
  if (runId !== undefined && (!/^[a-zA-Z0-9_-]+$/.test(runId) || basename(runId) !== runId)) throw new Error('Invalid harness run ID');
  if (!runId) {
    const entries = await readdir(runsDir, { withFileTypes: true }).catch(() => []);
    runId = entries.filter(e => e.isDirectory() && /^[a-zA-Z0-9_-]+$/.test(e.name)).map(e => e.name).sort().at(-1);
  }
  if (!runId) throw new Error('No harness report found. Run canon verify first.');
  const runDir = resolve(runsDir, runId);
  const report = JSON.parse(await readFile(resolve(runDir, 'report.json'), 'utf8')) as HarnessReport;
  if (report.schemaVersion !== 1 || report.runId !== runId || !Array.isArray(report.errors) || !report.config || !report.sourceAfter) throw new Error('Invalid harness report schema');
  report.runDir = runDir;
  const stale = (message: string) => { report.stale = true; if (!report.errors.includes(message)) report.errors.push(message); };
  if (report.root !== root) stale('Report belongs to a different project root.');
  try {
    const current = await loadHarnessConfig(root);
    if (JSON.stringify(current.config) !== JSON.stringify(report.config)) stale('Configuration changed since this run.');
    if ((await snapshotSource(root, current.config)).fingerprint !== report.sourceAfter.fingerprint) stale('Source changed since this run.');
  } catch (error) { stale(`Cannot validate current source/configuration: ${(error as Error).message}`); }
  try {
    const manifest = JSON.parse(await readFile(resolve(runDir, 'manifest.json'), 'utf8'));
    if (manifest.schemaVersion !== 1 || manifest.runId !== runId || !manifest.artifacts?.['report.json']) throw new Error('Invalid artifact manifest');
    for (const [path, expected] of Object.entries(manifest.artifacts)) {
      if (hash(await readFile(await artifactPath(runDir, path))) !== expected) stale(`Artifact changed: ${path}`);
    }
    for (const capture of report.captures) if (capture.status === 'captured' && (!capture.path || !capture.sha256 || manifest.artifacts[capture.path] !== capture.sha256)) stale(`Capture missing from manifest: ${capture.scenarioId}/${capture.viewport}`);
  } catch (error) { stale(`Cannot validate report artifacts: ${(error as Error).message}`); }
  report.ready = completionReady(report);
  return report;
}
