import * as fs from 'fs';
import * as path from 'path';

import * as log from 'loglevel';

import type { AppOptions } from '../../buildTimeContract';

function isMacAppBundlePlatform(platform: string | undefined): boolean {
  return platform === 'darwin' || platform === 'mas';
}

/**
 * Checks the app path array to determine if packaging completed successfully
 */
export function getAppPath(appPath: string | string[]): string | undefined {
  if (!Array.isArray(appPath)) {
    return appPath;
  }

  if (appPath.length === 0) {
    return undefined; // directory already exists and `--overwrite` not set
  }

  if (appPath.length > 1) {
    log.warn(
      'Warning: This should not be happening, packaged app path contains more than one element:',
      appPath,
    );
  }

  return appPath[0];
}

export function resolveRunnableAppPath(
  appRoot: string,
  packager: Pick<AppOptions['packager'], 'name' | 'platform'>,
): string {
  const name = String(packager.name ?? 'Nativefier');
  const platform = packager.platform;

  if (isMacAppBundlePlatform(platform)) {
    return path.join(appRoot, `${name}.app`);
  }
  if (platform === 'win32') {
    return path.join(appRoot, `${name}.exe`);
  }

  const linuxBinary = path.join(appRoot, name, name);
  if (fs.existsSync(linuxBinary)) {
    return linuxBinary;
  }
  return path.join(appRoot, name);
}

export function formatLaunchCommand(
  runnablePath: string,
  platform?: string,
): string {
  if (isMacAppBundlePlatform(platform)) {
    return `open "${runnablePath}"`;
  }
  if (platform === 'win32') {
    return `start "" "${runnablePath}"`;
  }
  if (platform === 'linux') {
    return `"${runnablePath}"`;
  }
  return runnablePath;
}

export function getOSRunHelp(platform?: string): string {
  if (platform === 'win32') {
    return `the contained .exe file.`;
  } else if (platform === 'linux') {
    return `the contained executable file (prefixing with ./ if necessary)\nMenu/desktop shortcuts are up to you, because Nativefier cannot know where you're going to move the app. Search for "linux .desktop file" for help, or see https://wiki.archlinux.org/index.php/Desktop_entries`;
  } else if (isMacAppBundlePlatform(platform)) {
    return `the app bundle.`;
  }
  return '';
}
