import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import type { CaptureCallback, CaptureResult } from './types.ts';

/** Use the application's installed browser tooling. Only a source checkout has a fallback. */
export async function resolvePlaywright(root: string): Promise<any> {
  const require = createRequire(join(resolve(root), 'package.json'));
  for (const name of ['playwright', '@playwright/test']) {
    try { return require(name); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  const checkout = fileURLToPath(new URL('../../', import.meta.url));
  if (existsSync(join(checkout, 'src', 'harness', 'browser.ts')) && existsSync(join(checkout, 'scripts', 'build.mjs'))) {
    try { return createRequire(join(checkout, 'package.json'))('playwright'); } catch {}
  }
  throw new Error('Playwright is missing in the target project. Install playwright or @playwright/test with your package manager, then run your local playwright install chromium command. Canon never installs browsers automatically.');
}

async function reachable(url: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(1500)]) : AbortSignal.timeout(1500), redirect: 'follow' });
    await response.body?.cancel();
    return true;
  } catch { return false; }
}
async function stopOwned(child?: ChildProcess) {
  if (!child?.pid) return;
  const kill = (signal: NodeJS.Signals) => { try { if (process.platform === 'win32') child.kill(signal); else process.kill(-child.pid!, signal); } catch {} };
  kill('SIGTERM');
  await new Promise<void>(resolve => setTimeout(resolve, 150));
  kill('SIGKILL');
}

export const captureScenarios: CaptureCallback = async ({ root, config, runDir, signal }) => {
  const results: CaptureResult[] = [];
  let owned: ChildProcess | undefined;
  const failAll = (error: string) => config.scenarios.flatMap(scenario => scenario.viewports.map(viewport => ({scenarioId:scenario.id,viewport:viewport.name,status:'failed' as const,error,url:config.app?new URL(scenario.path,config.app.url).href:undefined,server:config.app?(owned?'managed' as const:'external' as const):undefined})));
  if (!config.scenarios.length) return results;
  if (!config.app) return failAll('Configure app.url before capturing scenarios.');
  let browser: any;
  let launchError: string | undefined;
  try {
    signal?.throwIfAborted();
    if (!await reachable(config.app.url, signal)) {
      if (!config.app.start) throw new Error(`Application is unreachable at ${config.app.url}. Start it yourself or configure app.start.`);
      owned = spawn(config.app.start[0], config.app.start.slice(1), {cwd:root,stdio:'ignore',detached:process.platform !== 'win32',shell:false});
      owned.on('error', error => { launchError = error.message; });
      const deadline = Date.now() + (config.app.readyTimeoutMs ?? 30000);
      let ready = false;
      while (Date.now() < deadline) {
        signal?.throwIfAborted();
        if (launchError) throw new Error(`Application start failed: ${launchError}`);
        if (owned.exitCode !== null) throw new Error(`Application start exited with code ${owned.exitCode} before becoming ready.`);
        if (await reachable(config.app.url, signal)) { ready = true; break; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!ready) throw new Error(`Application did not become ready at ${config.app.url} within ${config.app.readyTimeoutMs ?? 30000}ms.`);
    }
    const playwright = await resolvePlaywright(root);
    try { browser = await playwright.chromium.launch({headless:true}); }
    catch (error) { throw new Error(`Chromium could not launch: ${(error as Error).message}. Install Chromium using the target project's local Playwright CLI (playwright install chromium). Canon never installs browsers automatically.`); }
    const cancelBrowser = () => { void browser.close(); };
    signal?.addEventListener('abort', cancelBrowser, {once:true});
    try {
      mkdirSync(join(runDir,'screenshots'),{recursive:true});
      for (const scenario of config.scenarios) for (const viewport of scenario.viewports) {
        const started = Date.now();
        const url = new URL(scenario.path, config.app.url).href;
        const timeout = config.app.readyTimeoutMs ?? 30000;
        const remaining = () => {
          const available = timeout - (Date.now() - started);
          if (available <= 0) throw new Error(`Capture exceeded ${timeout}ms deadline`);
          return available;
        };
        let context: any;
        try {
          signal?.throwIfAborted();
          context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height},colorScheme:scenario.colorScheme ?? 'light',reducedMotion:'reduce',locale:'en-US',timezoneId:'UTC'});
          const page = await context.newPage();
          const errors: string[] = [];
          page.on('pageerror', (error: Error) => errors.push(error.message));
          const response = await page.goto(url, {waitUntil:'load',timeout:remaining()});
          if (!response?.ok()) throw new Error(`Route returned HTTP ${response?.status() ?? 'no response'}: ${url}`);
          if (scenario.readySelector) await page.locator(scenario.readySelector).first().waitFor({state:'visible',timeout:remaining()});
          await page.evaluate(async (timeout: number) => {
            let timer: ReturnType<typeof setTimeout>;
            try {
              await Promise.race([document.fonts.ready, new Promise((_,reject) => { timer = setTimeout(() => reject(new Error(`Font readiness exceeded ${timeout}ms`)),timeout); })]);
            } finally { clearTimeout(timer!); }
          }, remaining());
          mkdirSync(join(runDir,'screenshots',scenario.id),{recursive:true});
          const path = `screenshots/${scenario.id}/${viewport.name}.png`;
          await page.screenshot({path:join(runDir,path),fullPage:true,animations:'disabled',caret:'hide',timeout:remaining()});
          if (errors.length) throw new Error(`Uncaught page error: ${errors.join('; ')}`);
          signal?.throwIfAborted();
          results.push({scenarioId:scenario.id,viewport:viewport.name,status:'captured',path,url,server:owned?'managed':'external',durationMs:Date.now()-started});
        } catch (error) {
          results.push({scenarioId:scenario.id,viewport:viewport.name,status:'failed',error:(error as Error).message,url,server:owned?'managed':'external',durationMs:Date.now()-started});
        } finally { await context?.close().catch(()=>{}); }
      }
    } finally { signal?.removeEventListener('abort', cancelBrowser); }
    return results;
  } catch (error) { return failAll((error as Error).message); }
  finally { await browser?.close().catch(()=>{}); await stopOwned(owned); }
};
