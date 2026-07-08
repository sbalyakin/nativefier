import * as fs from 'fs';
import * as path from 'path';

/** Keep in sync with `shared/src/contract.ts`. */
export const WEBHOLM_JSON_FILENAME = 'webholm.json';

/** Legacy config filename from upstream Nativefier; read-only fallback for upgrade. */
export const LEGACY_NATIVEFIER_JSON_FILENAME = 'nativefier.json';

/** @deprecated Use {@link LEGACY_NATIVEFIER_JSON_FILENAME}. */
export const NATIVEFIER_JSON_FILENAME = LEGACY_NATIVEFIER_JSON_FILENAME;

export function getRuntimeConfigPath(): string {
  const appDir = path.join(__dirname, '..');
  const webholmPath = path.join(appDir, WEBHOLM_JSON_FILENAME);
  if (fs.existsSync(webholmPath)) {
    return webholmPath;
  }
  return path.join(appDir, LEGACY_NATIVEFIER_JSON_FILENAME);
}
