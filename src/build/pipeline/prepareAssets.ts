import * as path from 'path';

import * as fs from 'fs-extra';
import * as log from 'loglevel';

import type { AppOptions, RawOptions } from '../../buildTimeContract';
import { convertIconIfNecessary } from '../buildIcon';

/**
 * For Windows & Linux, we have to copy over the icon to the resources/app
 * folder, which the BrowserWindow is hard-coded to read the icon from
 */
export async function copyIconsIfNecessary(
  options: AppOptions,
  appPath: string,
): Promise<void> {
  log.debug('Copying icons if necessary');
  if (!options.packager.icon) {
    log.debug('No icon specified in options; aborting');
    return;
  }

  if (
    options.packager.platform === 'darwin' ||
    options.packager.platform === 'mas'
  ) {
    if (options.nativefier.tray !== 'false') {
      log.debug('Copying icon for tray application');
      const trayIconFileName = `tray-icon.png`;
      const destIconPath = path.join(appPath, 'icon.png');
      await fs.copy(
        `${path.dirname(options.packager.icon)}/${trayIconFileName}`,
        destIconPath,
      );
    } else {
      log.debug('No copying necessary on macOS; aborting');
    }
    return;
  }

  const destFileName = `icon${path.extname(options.packager.icon)}`;
  const destIconPath = path.join(appPath, destFileName);

  log.debug(`Copying icon ${options.packager.icon} to`, destIconPath);
  await fs.copy(options.packager.icon, destIconPath);
}

export async function prepareAssets(
  options: AppOptions,
  templatePath: string,
  rawOptions: RawOptions,
): Promise<AppOptions> {
  log.info('\nConverting icons...');
  convertIconIfNecessary(options);
  await copyIconsIfNecessary(options, templatePath);
  options.packager.quiet = !rawOptions.verbose;
  return options;
}
