import * as log from 'loglevel';

import type { AppOptions } from '../../buildTimeContract';
import {
  formatLaunchCommand,
  resolveRunnableAppPath,
} from './appPathHelpers';

export function finalizeBuild(appPath: string, options: AppOptions): string {
  const runnablePath = resolveRunnableAppPath(appPath, options.packager);
  log.info(`App ready: ${runnablePath}`);
  log.info(
    `Launch: ${formatLaunchCommand(runnablePath, options.packager.platform)}`,
  );
  return appPath;
}
