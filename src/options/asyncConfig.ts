import * as log from 'loglevel';

import { processOptions } from './fields/fields';
import { AppOptions } from '../buildTimeContract';
import { logBuildStep } from '../build/buildProgress';

/**
 * Takes the options object and infers new values needing async work
 */
export async function asyncConfig(options: AppOptions): Promise<AppOptions> {
  logBuildStep(
    options.packager.targetUrl,
    'Fetching site metadata (icon, title)...',
  );
  return await processOptions(options);
}
