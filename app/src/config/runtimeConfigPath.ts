import * as path from 'path';

/** Keep in sync with `shared/src/contract.ts`. */
export const NATIVEFIER_JSON_FILENAME = 'nativefier.json';

export function getRuntimeConfigPath(): string {
  return path.join(__dirname, '..', NATIVEFIER_JSON_FILENAME);
}
