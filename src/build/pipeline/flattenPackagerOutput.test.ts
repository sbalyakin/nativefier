import * as os from 'os';
import * as path from 'path';

import * as fs from 'fs-extra';

import type { AppOptions } from '../../buildTimeContract';
import {
  flattenPackagerOutput,
  getPackagerOutputDirName,
} from './flattenPackagerOutput';

describe('getPackagerOutputDirName', () => {
  test('matches electron-packager folder naming', () => {
    expect(getPackagerOutputDirName('ChatGPT', 'darwin', 'arm64')).toBe(
      'ChatGPT-darwin-arm64',
    );
  });
});

describe('flattenPackagerOutput', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nativefier-flatten-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('moves darwin bundle contents into output directory', async () => {
    const packagedDir = path.join(tmpDir, 'ChatGPT-darwin-arm64');
    const appBundle = path.join(packagedDir, 'ChatGPT.app');
    await fs.mkdirp(path.join(appBundle, 'Contents', 'MacOS'));
    await fs.writeFile(path.join(packagedDir, 'LICENSE'), 'MIT');
    await fs.writeFile(path.join(packagedDir, 'version'), '1.0.0');

    const options = {
      packager: {
        name: 'ChatGPT',
        platform: 'darwin',
        arch: 'arm64',
        out: tmpDir,
        overwrite: true,
      },
    } as AppOptions;

    const result = await flattenPackagerOutput(packagedDir, options);

    expect(result).toBe(tmpDir);
    expect(await fs.pathExists(appBundle)).toBe(false);
    expect(await fs.pathExists(path.join(tmpDir, 'ChatGPT.app'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, 'LICENSE'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, 'version'))).toBe(true);
    expect(await fs.pathExists(packagedDir)).toBe(false);
  });

  test('leaves non-standard packaged paths unchanged', async () => {
    const customDir = path.join(tmpDir, 'custom-build');
    await fs.mkdirp(customDir);

    const options = {
      packager: {
        name: 'ChatGPT',
        platform: 'darwin',
        arch: 'arm64',
        out: tmpDir,
      },
    } as AppOptions;

    const result = await flattenPackagerOutput(customDir, options);

    expect(result).toBe(customDir);
    expect(await fs.pathExists(customDir)).toBe(true);
  });
});
