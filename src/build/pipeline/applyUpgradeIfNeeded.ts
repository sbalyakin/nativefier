import * as path from 'path';

import * as fs from 'fs-extra';
import * as log from 'loglevel';

import type { AppOptions } from '../../buildTimeContract';

export async function applyUpgradeIfNeeded(
  appPath: string,
  options: AppOptions,
  finalOutDirectory: string,
): Promise<string> {
  if (
    !options.packager.upgrade ||
    !options.packager.upgradeFrom ||
    !options.packager.overwrite
  ) {
    return appPath;
  }

  if (options.packager.platform === 'darwin') {
    try {
      await fs.remove(
        path.join(
          finalOutDirectory,
          `${options.packager.name ?? ''}.app`,
          'Contents',
          'Frameworks',
        ),
      );
    } catch (err: unknown) {
      log.warn(
        'Encountered an error when attempting to pre-delete old frameworks:',
        err,
      );
    }
    await fs.copy(
      path.join(appPath, `${options.packager.name ?? ''}.app`),
      path.join(finalOutDirectory, `${options.packager.name ?? ''}.app`),
      {
        overwrite: options.packager.overwrite,
        preserveTimestamps: true,
      },
    );
  } else {
    await fs.copy(appPath, finalOutDirectory, {
      overwrite: options.packager.overwrite,
      preserveTimestamps: true,
    });
  }
  await fs.remove(appPath);
  return finalOutDirectory;
}
