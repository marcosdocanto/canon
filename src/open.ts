import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export async function openBrowser(url: string): Promise<void> {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'rundll32.exe' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  await promisify(execFile)(command, args, { timeout: 10_000, windowsHide: true });
}
