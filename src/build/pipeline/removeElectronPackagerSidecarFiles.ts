import * as path from 'path';

import * as fs from 'fs-extra';
import * as log from 'loglevel';

/** Files shipped next to the Electron binary that electron-packager copies into output. */
export const ELECTRON_PACKAGER_SIDECAR_FILES = [
  'LICENSE',
  'LICENSES.chromium.html',
  'version',
] as const;

export async function removeElectronPackagerSidecarFiles(
  outputDirectory: string,
): Promise<void> {
  for (const filename of ELECTRON_PACKAGER_SIDECAR_FILES) {
    const filePath = path.join(outputDirectory, filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      log.debug(`Removed electron packager sidecar file: ${filePath}`);
    }
  }
}
