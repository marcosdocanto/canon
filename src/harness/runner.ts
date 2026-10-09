import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { checkedPath, doctorHarness, loadHarnessConfig } from './config.ts';
import { artifactPath, completionReady, writeHarnessReport } from './report.ts';
import { hash, snapshotSource } from './snapshot.ts';
import type { CaptureArtifact, CaptureCallback, CheckResult, HarnessCheck, HarnessReport, SourceSnapshot } from './types.ts';

const LOG_LIMIT = 64 * 1024;
const redact = (text: string) => {
  for (const [name, value] of Object.entries(process.env)) if (/secret|token|password|api.?key|private.?key/i.test(name) && value && value.length >= 8) text = text.split(value).join('[REDACTED]');
  return text;
};
/** Execute exactly the configured argv, with bounded output and no shell expansion. */
export async function runHarnessCheck(root: string, check: HarnessCheck, signal?: AbortSignal): Promise<CheckResult> {
  const started = Date.now();
  const result: CheckResult = { id: check.id, command: check.command.map(redact), cwd: check.cwd ?? '.', status: 'error', exitCode: null, durationMs: 0, stdout: '', stderr: '' };
  if (signal?.aborted) return { ...result, status: 'cancelled', error: 'Verification cancelled before check started.' };
  let cwd: string;
  try { cwd = await checkedPath(root, check.cwd ?? '.'); if (!(await stat(cwd)).isDirectory()) throw new Error('Working directory is not a directory'); }
  catch (error) { return { ...result, error: redact((error as Error).message), durationMs: Date.now() - started }; }
  return new Promise(resolveResult => {
    const child = spawn(check.command[0], check.command.slice(1), { cwd, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let terminated: 'timeout' | 'cancelled' | undefined;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const kill = (force: boolean) => {
      try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); else child.kill(force ? 'SIGKILL' : 'SIGTERM'); } catch { /* Process already exited. */ }
    };
    const stop = (status: 'timeout' | 'cancelled') => { if (terminated) return; terminated = status; kill(false); killTimer = setTimeout(() => kill(true), 200); };
    const onAbort = () => stop('cancelled');
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) stop('cancelled');
    const timer = setTimeout(() => stop('timeout'), check.timeoutMs ?? 120_000);
    let stdout = Buffer.alloc(0); let stderr = Buffer.alloc(0); let stdoutTruncated = false; let stderrTruncated = false;
    child.stdout.on('data', (bytes: Buffer) => { const remaining = LOG_LIMIT - stdout.length; stdoutTruncated ||= bytes.length > remaining; if (remaining > 0) stdout = Buffer.concat([stdout, bytes.subarray(0, remaining)]); });
    child.stderr.on('data', (bytes: Buffer) => { const remaining = LOG_LIMIT - stderr.length; stderrTruncated ||= bytes.length > remaining; if (remaining > 0) stderr = Buffer.concat([stderr, bytes.subarray(0, remaining)]); });
    child.on('error', error => { result.error = redact(error.message); });
    child.on('close', (exitCode, exitSignal) => {
      clearTimeout(timer); if (terminated) kill(true); if (killTimer) clearTimeout(killTimer); signal?.removeEventListener('abort', onAbort);
      result.exitCode = exitCode; result.signal = exitSignal; result.durationMs = Date.now() - started;
      result.stdout = redact(stdout.toString('utf8')) + (stdoutTruncated ? '\n[output truncated]' : '');
      result.stderr = redact(stderr.toString('utf8')) + (stderrTruncated ? '\n[output truncated]' : '');
      result.status = terminated ?? (result.error ? 'error' : exitCode === 0 ? 'passed' : 'failed');
      if (terminated) result.error = terminated === 'timeout' ? `Check exceeded ${check.timeoutMs ?? 120_000} ms timeout.` : 'Verification cancelled.';
      resolveResult(result);
    });
  });
}
export async function verifyHarness(start: string, options: { capture?: CaptureCallback; signal?: AbortSignal } = {}): Promise<HarnessReport> {
  const { root, config } = await loadHarnessConfig(start);
  const runId = `${new Date().toISOString().replace(/[^0-9T]/g, '')}_${randomUUID().slice(0, 8)}`;
  const runDir = resolve(root, '.canon/runs', runId);
  await mkdir(resolve(root, '.canon'), { recursive: true });
  await checkedPath(root, '.canon');
  await mkdir(resolve(root, '.canon/runs'), { recursive: true });
  await checkedPath(root, '.canon/runs');
  await mkdir(runDir);
  const errors = [...(await doctorHarness(root)).errors];
  const unavailable: SourceSnapshot = { fingerprint: 'unavailable', revision: null, files: {} };
  let sourceBefore = unavailable;
  try { sourceBefore = await snapshotSource(root, config); } catch (error) { errors.push(`Cannot snapshot source before verification: ${(error as Error).message}`); }
  const report: HarnessReport = { schemaVersion: 1, runId, root, runDir, startedAt: new Date().toISOString(), finishedAt: '', config, sourceBefore, sourceAfter: unavailable, checks: [], captures: [], ready: false, stale: false, errors };
  for (const check of config.checks) report.checks.push(await runHarnessCheck(root, check, options.signal));
  if (config.scenarios.length && options.capture && !options.signal?.aborted) {
    try {
      const captures = await options.capture({ root, config, runDir, signal: options.signal });
      for (const capture of captures) {
        const artifact: CaptureArtifact = { ...capture };
        const scenario = config.scenarios.find(s => s.id === capture.scenarioId);
        if (!scenario?.viewports.some(v => v.name === capture.viewport)) { report.errors.push(`Capture references unknown scenario/viewport: ${capture.scenarioId}/${capture.viewport}`); continue; }
        if (report.captures.some(c => c.scenarioId === capture.scenarioId && c.viewport === capture.viewport)) { report.errors.push(`Duplicate capture: ${capture.scenarioId}/${capture.viewport}`); continue; }
        if (artifact.status === 'captured') {
          try {
            if (!artifact.path) throw new Error('Capture must have its own artifact path');
            const full = await artifactPath(runDir, artifact.path);
            artifact.path = relative(runDir, full).split('\\').join('/');
            if (['report.json', 'report.html', 'report.md', 'manifest.json'].includes(artifact.path)) throw new Error('Capture must have its own artifact path');
            if (report.captures.some(c => c.path === artifact.path)) throw new Error('Each viewport must have its own capture artifact');
            const bytes = await readFile(full);
            if (!bytes.length) throw new Error('Capture artifact is empty');
            artifact.sha256 = hash(bytes);
          } catch (error) { artifact.status = 'failed'; artifact.error = (error as Error).message; delete artifact.path; }
        } else { delete artifact.path; }
        report.captures.push(artifact);
      }
    } catch (error) { report.errors.push(`Browser capture failed: ${redact((error as Error).message)}`); }
  }
  for (const scenario of config.scenarios) for (const viewport of scenario.viewports) if (!report.captures.some(c => c.scenarioId === scenario.id && c.viewport === viewport.name)) {
    report.captures.push({ scenarioId: scenario.id, viewport: viewport.name, status: 'failed', error: options.signal?.aborted ? 'Verification cancelled.' : options.capture ? 'Capture produced no evidence for this viewport.' : 'No browser capture implementation available.' });
  }
  if (options.signal?.aborted) report.errors.push('Verification cancelled.');
  if (!config.completion.requiredChecks.length && !config.completion.requiredScenarios.length) report.errors.push('No completion requirements configured; no verification can establish readiness.');
  try { report.sourceAfter = await snapshotSource(root, config); } catch (error) { report.errors.push(`Cannot snapshot source after verification: ${(error as Error).message}`); }
  report.stale = sourceBefore === unavailable || report.sourceAfter === unavailable || sourceBefore.fingerprint !== report.sourceAfter.fingerprint;
  if (report.stale) report.errors.push('Source or configuration changed during verification, or could not be fingerprinted. Run verification again against stable source.');
  report.finishedAt = new Date().toISOString();
  report.ready = completionReady(report);
  await writeHarnessReport(report);
  return report;
}
