import * as log from 'loglevel';

import { processOptions } from './fields/fields';
import { AppOptions } from '../buildTimeContract';

/**
 * Takes the options object and infers new values needing async work
 */
export async function asyncConfig(options: AppOptions): Promise<AppOptions> {
  log.debug('\nPerforming async options post-processing.');
  return await processOptions(options);
}
