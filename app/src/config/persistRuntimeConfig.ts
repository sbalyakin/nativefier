import * as fs from 'fs';

import * as log from '../helpers/loggingHelper';
import type { OutputOptions } from '../../../shared/src/options/model';
import { getRuntimeConfigPath } from './runtimeConfigPath';

export function persistRuntimeConfig(newAppArgs: OutputOptions): void {
  try {
    fs.writeFileSync(
      getRuntimeConfigPath(),
      JSON.stringify(newAppArgs, null, 2),
    );
  } catch (err: unknown) {
    log.warn(
      `WARNING: Ignored nativefier.json rewrital (${(err as Error).message})`,
    );
  }
}
