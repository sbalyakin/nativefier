import * as fs from 'fs-extra';

import type { AppOptions } from '../../buildTimeContract';
import { applyUpgradeIfNeeded } from './applyUpgradeIfNeeded';

jest.mock('fs-extra', () => ({
  copy: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
}));

describe('applyUpgradeIfNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns original path when not an overwrite upgrade', async () => {
    const options = {
      packager: { platform: 'linux', upgrade: false },
    } as AppOptions;
    const result = await applyUpgradeIfNeeded(
      '/tmp/out',
      options,
      '/final/out',
    );
    expect(result).toBe('/tmp/out');
    expect(fs.copy).not.toHaveBeenCalled();
  });

  test('copies packaged app to final directory on linux upgrade', async () => {
    const options = {
      packager: {
        platform: 'linux',
        upgrade: true,
        upgradeFrom: '/old',
        overwrite: true,
      },
    } as AppOptions;
    const result = await applyUpgradeIfNeeded(
      '/tmp/out',
      options,
      '/final/out',
    );
    expect(fs.copy).toHaveBeenCalledWith('/tmp/out', '/final/out', {
      overwrite: true,
      preserveTimestamps: true,
    });
    expect(fs.remove).toHaveBeenCalledWith('/tmp/out');
    expect(result).toBe('/final/out');
  });

  test('removes old Frameworks and copies .app bundle on darwin upgrade', async () => {
    const options = {
      packager: {
        platform: 'darwin',
        name: 'MyApp',
        upgrade: true,
        upgradeFrom: '/old',
        overwrite: true,
      },
    } as AppOptions;
    const result = await applyUpgradeIfNeeded(
      '/tmp/out',
      options,
      '/final/out',
    );
    expect(fs.remove).toHaveBeenCalledWith(
      '/final/out/MyApp.app/Contents/Frameworks',
    );
    expect(fs.copy).toHaveBeenCalledWith(
      '/tmp/out/MyApp.app',
      '/final/out/MyApp.app',
      { overwrite: true, preserveTimestamps: true },
    );
    expect(fs.remove).toHaveBeenCalledWith('/tmp/out');
    expect(result).toBe('/final/out');
  });
});
