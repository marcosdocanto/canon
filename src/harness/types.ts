/** Explicit, project-owned configuration. Commands are argv arrays, never shell strings. */
export interface HarnessConfig {
  schemaVersion: 1;
  context: { documents: string[]; skills: string[] };
  checks: HarnessCheck[];
  app?: { url: string; start?: string[]; readyTimeoutMs?: number; storageState?: string };
  scenarios: HarnessScenario[];
  completion: { requiredChecks: string[]; requiredScenarios: string[] };
}
export interface HarnessCheck { id: string; command: string[]; cwd?: string; timeoutMs?: number }
export interface HarnessScenario {
  id: string; path: string;
  viewports: { name: string; width: number; height: number }[];
  readySelector?: string;
  colorScheme?: 'light' | 'dark';
}
export interface LoadedHarnessConfig { root: string; configPath: string; config: HarnessConfig }
export interface HarnessDoctor { ok: boolean; root: string; configPath?: string; errors: string[]; warnings: string[] }
export interface SourceSnapshot { fingerprint: string; revision: string | null; files: Record<string, string> }
export interface CheckResult {
  id: string; command: string[]; cwd: string;
  status: 'passed' | 'failed' | 'error' | 'timeout' | 'cancelled';
  exitCode: number | null; signal?: string | null; durationMs: number;
  stdout: string; stderr: string; error?: string;
}
/** Captured means bytes were collected; it is not a visual or accessibility verdict. */
export interface CaptureResult {
  scenarioId: string; viewport: string; status: 'captured' | 'failed';
  path?: string; error?: string; url?: string; durationMs?: number;
  server?: 'managed' | 'external';
}
export interface CaptureArtifact extends CaptureResult { sha256?: string }
export type CaptureCallback = (input: {
  root: string; config: HarnessConfig; runDir: string; signal?: AbortSignal;
}) => Promise<CaptureResult[]>;
export interface HarnessReport {
  schemaVersion: 1; runId: string; root: string; runDir: string;
  startedAt: string; finishedAt: string; config: HarnessConfig;
  sourceBefore: SourceSnapshot; sourceAfter: SourceSnapshot;
  checks: CheckResult[]; captures: CaptureArtifact[];
  ready: boolean; stale: boolean; errors: string[];
}
