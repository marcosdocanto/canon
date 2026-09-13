import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, cp, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
// Both src/distribution.ts and installed lib/distribution.mjs live one level below the package root.
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
let archive: Promise<Buffer> | undefined;

async function copyRuntime(source: string, destination: string) {
  await cp(source, destination, {
    recursive: true,
    filter: async (path) => {
      const info = await lstat(path);
      if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile())) {
        throw new Error('Canon distribution requires regular package files; linked files cannot be included.');
      }
      return !basename(path).startsWith('.');
    },
  });
}

async function run(command: string, args: string[], cwd: string, temporary: string, label: string) {
  try {
    return await execute(command, args, {
      cwd, timeout: 60_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true,
      env: {
        ...process.env, npm_config_ignore_scripts: 'true',
        TMPDIR: temporary, TMP: temporary, TEMP: temporary, NODE_COMPILE_CACHE: join(temporary, 'node-compile-cache'),
      },
    });
  } catch (error) {
    const detail = error as Error & { stderr?: string };
    throw new Error(`${label} failed: ${detail.stderr?.trim() || detail.message}`, { cause: error });
  }
}

async function prepareArchive(): Promise<Buffer> {
  const temporary = await mkdtemp(join(tmpdir(), 'canon-distribution-'));
  try {
    let runtime = join(packageRoot, 'lib');
    if (existsSync(join(packageRoot, 'src', 'cli.ts'))) {
      // Compile only Canon's own source with its known build script. Isolate output so
      // downloading cannot replace lib/ beneath another running command or test.
      const workspace = join(temporary, 'build');
      await mkdir(join(workspace, 'scripts'), { recursive: true });
      await copyRuntime(join(packageRoot, 'src'), join(workspace, 'src'));
      await copyFile(join(packageRoot, 'scripts', 'build.mjs'), join(workspace, 'scripts', 'build.mjs'));
      let compiler: string;
      try { compiler = dirname(require.resolve('typescript/package.json')); }
      catch { throw new Error('Preparing a Canon checkout download requires its TypeScript development dependency. Install the Canon checkout dependencies first.'); }
      await mkdir(join(workspace, 'node_modules'), { recursive: true });
      await symlink(compiler, join(workspace, 'node_modules', 'typescript'), 'junction');
      await run(process.execPath, [join(workspace, 'scripts', 'build.mjs')], workspace, temporary, 'Canon runtime compilation');
      runtime = join(workspace, 'lib');
    }

    const staging = join(temporary, 'package');
    await mkdir(join(staging, 'bin'), { recursive: true });
    await copyRuntime(join(packageRoot, 'bin', 'canon.js'), join(staging, 'bin', 'canon.js'));
    await copyRuntime(runtime, join(staging, 'lib'));
    await copyRuntime(join(packageRoot, 'README.md'), join(staging, 'README.md'));
    for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
      await copyRuntime(join(packageRoot, name), join(staging, name));
    }
    const original = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    const metadata: Record<string, unknown> = {};
    for (const key of ['name', 'version', 'description', 'type', 'engines', 'license', 'homepage', 'repository', 'bugs', 'keywords', 'publishConfig', 'dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
      if (original[key] !== undefined) metadata[key] = original[key];
    }
    // An explicit staging tree excludes the served design, caller's project, dev
    // dependencies, lifecycle hooks, npm configuration and checkout-only files.
    metadata.bin = { canon: 'bin/canon.js' };
    metadata.files = ['bin', 'lib', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md'];
    await writeFile(join(staging, 'package.json'), JSON.stringify(metadata, null, 2) + '\n');
    const userConfig = join(temporary, 'user.npmrc');
    const globalConfig = join(temporary, 'global.npmrc');
    await writeFile(userConfig, '');
    await writeFile(globalConfig, '');
    const { stdout } = await run('npm', [
      'pack', '--ignore-scripts', '--json', '--offline', '--pack-destination', temporary,
      '--userconfig', userConfig, '--globalconfig', globalConfig, '--cache', join(temporary, 'npm-cache'),
    ], staging, temporary, 'Canon package preparation');
    const packed = JSON.parse(stdout);
    const filename = packed[0]?.filename;
    if (typeof filename !== 'string' || !/^[a-zA-Z0-9._-]+\.tgz$/.test(filename)) {
      throw new Error('npm pack did not return a valid Canon archive filename.');
    }
    return await readFile(join(temporary, filename));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

/** Prepare lazily, share concurrent downloads, and allow a retry after preparation fails. */
export function getCanonPackage(): Promise<Buffer> {
  archive ??= prepareArchive().catch((error) => {
    archive = undefined;
    throw error;
  });
  return archive;
}
