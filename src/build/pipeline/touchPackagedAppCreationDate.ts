import { execFile } from 'child_process';
import { promisify } from 'util';

import * as fs from 'fs-extra';
import * as log from 'loglevel';

import type { AppOptions } from '../../buildTimeContract';
import { resolveRunnableAppPath } from './appPathHelpers';

const execFileAsync = promisify(execFile);

/** SetFile expects MM/DD/YYYY HH:MM:SS AM/PM in the local timezone. */
export function formatDarwinSetFileDate(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${month}/${day}/${year} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Electron zips use 1980-01-01 as the minimum timestamp, so packaged .app bundles
 * inherit that birthtime in Finder until we set it explicitly on macOS.
 */
export async function touchPackagedAppCreationDate(
  appRoot: string,
  packager: Pick<AppOptions['packager'], 'name' | 'platform'>,
): Promise<void> {
  const runnablePath = resolveRunnableAppPath(appRoot, packager);
  if (!(await fs.pathExists(runnablePath))) {
    log.debug(
      `Skipping packaged app date touch: runnable path not found (${runnablePath})`,
    );
    return;
  }

  const now = new Date();
  const platform = packager.platform;

  if (platform === 'darwin' || platform === 'mas') {
    try {
      await execFileAsync('SetFile', [
        '-d',
        formatDarwinSetFileDate(now),
        runnablePath,
      ]);
      log.debug(`Updated macOS creation date for ${runnablePath}`);
    } catch (err: unknown) {
      log.debug(
        `Could not update macOS creation date for ${runnablePath} (${(err as Error).message})`,
      );
    }
  }

  await fs.utimes(runnablePath, now, now);
}
