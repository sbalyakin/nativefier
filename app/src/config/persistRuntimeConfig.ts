import * as fs from 'fs';

import * as log from '../helpers/loggingHelper';
import type { OutputOptions } from '../../../shared/src/options/model';
import { getRuntimeConfigPath } from './runtimeConfigPath';
import { stripSensitiveOutputOptions } from './runtimeSecrets';

export function persistRuntimeConfig(newAppArgs: OutputOptions): void {
  try {
    fs.writeFileSync(
      getRuntimeConfigPath(),
      JSON.stringify(stripSensitiveOutputOptions(newAppArgs), null, 2),
    );
  } catch (err: unknown) {
    log.warn(
      `WARNING: Ignored webholm.json rewrital (${(err as Error).message})`,
    );
  }
}
