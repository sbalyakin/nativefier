import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Run page-icon in a child process so a timeout kills the HTTP request too.
 */
export async function fetchPageIcon(
  targetUrl: string,
  ext: string,
  timeoutMs: number,
): Promise<{ ext: string; data: Buffer } | undefined> {
  const pageIconPath = require.resolve('page-icon');
  const script = `
    const pageIcon = require(${JSON.stringify(pageIconPath)});
    pageIcon(process.argv[1], { ext: process.argv[2] })
      .then((icon) => {
        process.stdout.write(JSON.stringify({
          ext: icon.ext,
          data: icon.data.toString('base64'),
        }));
      })
      .catch(() => process.exit(1));
  `;

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['-e', script, targetUrl, ext],
      {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    const parsed = JSON.parse(stdout.trim()) as { ext: string; data: string };
    return { ext: parsed.ext, data: Buffer.from(parsed.data, 'base64') };
  } catch {
    return undefined;
  }
}
