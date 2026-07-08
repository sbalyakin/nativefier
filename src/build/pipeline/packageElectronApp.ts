import * as log from 'loglevel';

import type { AppOptions } from '../../buildTimeContract';
import { hasWine, isWindows } from '../../helpers/helpers';
import {
  runElectronPackager,
  type ElectronPackagerFn,
} from '../electronPackagerAdapter';
import { getAppPath } from './appPathHelpers';
import type { PackagedAppResult } from './types';

const OPTIONS_REQUIRING_WINDOWS_FOR_WINDOWS_BUILD = [
  'icon',
  'appCopyright',
  'appVersion',
  'buildVersion',
  'versionString',
  'win32metadata',
];

export function trimUnprocessableOptions(options: AppOptions): void {
  if (options.packager.platform === 'win32' && !isWindows() && !hasWine()) {
    const optionsPresent = Object.entries(options)
      .filter(
        ([key, value]) =>
          OPTIONS_REQUIRING_WINDOWS_FOR_WINDOWS_BUILD.includes(key) && !!value,
      )
      .map(([key]) => key);
    if (optionsPresent.length === 0) {
      return;
    }
    log.warn(
      `*Not* setting [${optionsPresent.join(', ')}], as couldn't find Wine.`,
      'Wine is required when packaging a Windows app under on non-Windows platforms.',
      'Also, note that Windows apps built under non-Windows platforms without Wine *will lack* certain',
      'features, like a correct icon and process name. Do yourself a favor and install Wine, please.',
    );
    for (const keyToUnset of optionsPresent) {
      (options as unknown as Record<string, undefined>)[keyToUnset] = undefined;
    }
  }
}

export async function packageElectronApp(
  options: AppOptions,
  packagerFn?: ElectronPackagerFn,
): Promise<PackagedAppResult> {
  log.info(
    'Packaging app (first run may download Electron, this can take a few minutes)...',
  );
  trimUnprocessableOptions(options);
  const appPathArray = await runElectronPackager(options.packager, packagerFn);
  const appPath = getAppPath(appPathArray);
  if (!appPath) {
    throw new Error('App Path could not be determined.');
  }
  return { appPath };
}
