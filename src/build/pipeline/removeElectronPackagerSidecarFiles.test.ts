import * as os from 'os';
import * as path from 'path';

import * as fs from 'fs-extra';

import {
  ELECTRON_PACKAGER_SIDECAR_FILES,
  removeElectronPackagerSidecarFiles,
} from './removeElectronPackagerSidecarFiles';

describe('removeElectronPackagerSidecarFiles', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'nativefier-sidecar-cleanup-'),
    );
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('removes electron sidecar files from packager output', async () => {
    for (const filename of ELECTRON_PACKAGER_SIDECAR_FILES) {
      await fs.writeFile(path.join(tmpDir, filename), filename);
    }
    await fs.writeFile(path.join(tmpDir, 'MyApp.app'), 'bundle');

    await removeElectronPackagerSidecarFiles(tmpDir);

    for (const filename of ELECTRON_PACKAGER_SIDECAR_FILES) {
      expect(await fs.pathExists(path.join(tmpDir, filename))).toBe(false);
    }
    expect(await fs.pathExists(path.join(tmpDir, 'MyApp.app'))).toBe(true);
  });

  test('ignores missing sidecar files', async () => {
    await expect(
      removeElectronPackagerSidecarFiles(tmpDir),
    ).resolves.toBeUndefined();
  });
});
