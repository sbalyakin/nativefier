import * as log from 'loglevel';

import type { AppOptions } from '../../buildTimeContract';
import {
  formatLaunchCommand,
  resolveRunnableAppPath,
} from './appPathHelpers';
import { touchPackagedAppCreationDate } from './touchPackagedAppCreationDate';

export async function finalizeBuild(
  appPath: string,
  options: AppOptions,
): Promise<string> {
  await touchPackagedAppCreationDate(appPath, options.packager);
  const runnablePath = resolveRunnableAppPath(appPath, options.packager);
  log.info(`App ready: ${runnablePath}`);
  log.info(
    `Launch: ${formatLaunchCommand(runnablePath, options.packager.platform)}`,
  );
  return appPath;
}
