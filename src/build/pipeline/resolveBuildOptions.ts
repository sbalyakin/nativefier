import * as log from 'loglevel';

import type { RawOptions } from '../../buildTimeContract';
import { getTempDir, isWindows, isWindowsAdmin } from '../../helpers/helpers';
import { findUpgradeApp, useOldAppOptions } from '../../helpers/upgrade/upgrade';
import { getOptions } from '../../options/optionsMain';
import type { ResolvedBuildOptions } from './types';

export function normalizeUpgradeRawOptions(rawOptions: RawOptions): boolean {
  if (
    rawOptions.upgrade !== undefined &&
    typeof rawOptions.upgrade === 'string' &&
    rawOptions.upgrade !== ''
  ) {
    rawOptions.upgradeFrom = rawOptions.upgrade;
    rawOptions.upgrade = true;
    return true;
  }
  return false;
}

export async function resolveBuildOptions(
  rawOptions: RawOptions,
): Promise<ResolvedBuildOptions> {
  if (rawOptions.quiet) {
    log.setLevel('silent');
  }

  let finalOutDirectory = rawOptions.out ?? process.cwd();

  if (normalizeUpgradeRawOptions(rawOptions)) {
    log.debug('Attempting to upgrade from', rawOptions.upgradeFrom);
    const oldApp = findUpgradeApp(rawOptions.upgradeFrom as string);
    if (!oldApp) {
      throw new Error(
        `Could not find an old Nativfier app in "${
          rawOptions.upgradeFrom as string
        }"`,
      );
    }
    rawOptions = useOldAppOptions(rawOptions, oldApp);
    if (rawOptions.out === undefined && rawOptions.overwrite) {
      finalOutDirectory = oldApp.appRoot;
      rawOptions.out = getTempDir('appUpgrade', 0o755);
    }
  }
  log.debug('rawOptions', rawOptions);

  const options = await getOptions(rawOptions);
  log.debug('options', options);

  if (options.packager.platform === 'darwin' && isWindows()) {
    if (!isWindowsAdmin()) {
      throw new Error(
        'Building an app with a target platform of Mac on a Windows machine requires admin priveleges to perform. Please rerun this command in an admin command prompt.',
      );
    }
  }

  return { rawOptions, options, finalOutDirectory };
}
