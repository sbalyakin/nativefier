import type { AppOptions, RawOptions } from '../../buildTimeContract';
import {
  normalizeUpgradeRawOptions,
  resolveBuildOptions,
} from './resolveBuildOptions';

jest.mock('../../options/optionsMain', () => ({
  getOptions: jest.fn(),
}));

jest.mock('../../helpers/upgrade/upgrade', () => ({
  findUpgradeApp: jest.fn(),
  useOldAppOptions: jest.fn(),
}));

jest.mock('../../helpers/helpers', () => ({
  getTempDir: jest.fn(() => '/tmp/appUpgrade'),
  isWindows: jest.fn(() => false),
  isWindowsAdmin: jest.fn(() => false),
}));

import { getOptions } from '../../options/optionsMain';
import {
  findUpgradeApp,
  useOldAppOptions,
} from '../../helpers/upgrade/upgrade';
import { getTempDir, isWindows, isWindowsAdmin } from '../../helpers/helpers';

const getOptionsMock = getOptions as jest.MockedFunction<typeof getOptions>;
const findUpgradeAppMock = findUpgradeApp as jest.MockedFunction<
  typeof findUpgradeApp
>;
const useOldAppOptionsMock = useOldAppOptions as jest.MockedFunction<
  typeof useOldAppOptions
>;
const getTempDirMock = getTempDir as jest.MockedFunction<typeof getTempDir>;
const isWindowsMock = isWindows as jest.MockedFunction<typeof isWindows>;
const isWindowsAdminMock = isWindowsAdmin as jest.MockedFunction<
  typeof isWindowsAdmin
>;

function makeAppOptions(platform: string): AppOptions {
  return {
    packager: { platform },
    nativefier: { verbose: false },
  } as AppOptions;
}

describe('normalizeUpgradeRawOptions', () => {
  test('maps string upgrade path to upgradeFrom and sets upgrade true', () => {
    const rawOptions = { upgrade: '/old/app' } as Record<string, unknown>;
    expect(normalizeUpgradeRawOptions(rawOptions)).toBe(true);
    expect(rawOptions.upgradeFrom).toBe('/old/app');
    expect(rawOptions.upgrade).toBe(true);
  });

  test('returns false when upgrade is not a non-empty string', () => {
    expect(normalizeUpgradeRawOptions({ upgrade: true })).toBe(false);
    expect(normalizeUpgradeRawOptions({ upgrade: '' })).toBe(false);
    expect(normalizeUpgradeRawOptions({})).toBe(false);
  });
});

describe('resolveBuildOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isWindowsMock.mockReturnValue(false);
    isWindowsAdminMock.mockReturnValue(false);
    getOptionsMock.mockResolvedValue(makeAppOptions('linux'));
  });

  test('resolves options via getOptions and uses cwd when out is unset', async () => {
    const rawOptions = { targetUrl: 'https://example.com' } as RawOptions;
    const result = await resolveBuildOptions(rawOptions);
    expect(getOptionsMock).toHaveBeenCalledWith(rawOptions);
    expect(result.options.packager.platform).toBe('linux');
    expect(result.finalOutDirectory).toBe(process.cwd());
    expect(result.rawOptions).toBe(rawOptions);
  });

  test('throws when upgrade path does not resolve to an old app', async () => {
    findUpgradeAppMock.mockReturnValue(null);
    await expect(
      resolveBuildOptions({ upgrade: '/missing/app' } as RawOptions),
    ).rejects.toThrow('Could not find an old Nativfier app in "/missing/app"');
    expect(getOptionsMock).not.toHaveBeenCalled();
  });

  test('merges upgrade options and sets finalOutDirectory on overwrite', async () => {
    const mergedRawOptions = {
      upgrade: true,
      upgradeFrom: '/old/app',
      overwrite: true,
      targetUrl: 'https://example.com',
    } as RawOptions;
    findUpgradeAppMock.mockReturnValue({
      appRoot: '/old/root',
      appResourcesDir: '/old/resources',
      options: {},
    });
    useOldAppOptionsMock.mockReturnValue(mergedRawOptions);

    const result = await resolveBuildOptions({
      upgrade: '/old/app',
      overwrite: true,
    } as RawOptions);

    expect(useOldAppOptionsMock).toHaveBeenCalled();
    expect(getTempDirMock).toHaveBeenCalledWith('appUpgrade', 0o755);
    expect(mergedRawOptions.out).toBe('/tmp/appUpgrade');
    expect(result.finalOutDirectory).toBe('/old/root');
    expect(getOptionsMock).toHaveBeenCalledWith(mergedRawOptions);
  });

  test('throws when building darwin on Windows without admin', async () => {
    isWindowsMock.mockReturnValue(true);
    isWindowsAdminMock.mockReturnValue(false);
    getOptionsMock.mockResolvedValue(makeAppOptions('darwin'));

    await expect(
      resolveBuildOptions({ targetUrl: 'https://example.com' } as RawOptions),
    ).rejects.toThrow('requires admin priveleges');
  });

  test('allows darwin build on Windows when running as admin', async () => {
    isWindowsMock.mockReturnValue(true);
    isWindowsAdminMock.mockReturnValue(true);
    getOptionsMock.mockResolvedValue(makeAppOptions('darwin'));

    const result = await resolveBuildOptions({
      targetUrl: 'https://example.com',
    } as RawOptions);
    expect(result.options.packager.platform).toBe('darwin');
  });
});
