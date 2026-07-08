import * as log from 'loglevel';

import type { AppOptions } from '../../buildTimeContract';
import { getTempDir } from '../../helpers/helpers';
import { prepareElectronApp } from '../prepareElectronApp';
import type { PreparedTemplate } from './types';

export async function prepareTemplate(
  options: AppOptions,
): Promise<PreparedTemplate> {
  log.debug('Preparing Electron app template');
  const templatePath = getTempDir('app', 0o755);
  await prepareElectronApp(options.packager.dir, templatePath, options);
  options.packager.dir = templatePath;
  return { templatePath, options };
}
