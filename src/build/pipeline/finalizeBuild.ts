import * as log from 'loglevel';

import type { AppOptions } from '../../buildTimeContract';
import { getOSRunHelp } from './appPathHelpers';

export function finalizeBuild(appPath: string, options: AppOptions): string {
  const osRunHelp = getOSRunHelp(options.packager.platform);
  log.info(
    `App built to ${appPath}, move to wherever it makes sense for you and run ${osRunHelp}`,
  );
  return appPath;
}
