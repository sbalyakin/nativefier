import type { AppOptions } from '../../buildTimeContract';
import { packageElectronApp, trimUnprocessableOptions } from './packageElectronApp';

jest.mock('../../helpers/helpers', () => ({
  hasWine: jest.fn(() => false),
  isWindows: jest.fn(() => false),
}));

describe('trimUnprocessableOptions', () => {
  test('does not throw for win32 build on non-Windows without Wine', () => {
    const options = {
      packager: { platform: 'win32', icon: '/tmp/icon.ico' },
    } as AppOptions;
    expect(() => trimUnprocessableOptions(options)).not.toThrow();
    expect(options.packager.icon).toBe('/tmp/icon.ico');
  });
});

describe('packageElectronApp', () => {
  test('returns packaged app path from adapter', async () => {
    const options = {
      packager: { platform: 'linux', dir: '/tmp/template' },
    } as AppOptions;
    const packagerFn = jest.fn().mockResolvedValue(['/tmp/out/MyApp']);
    const result = await packageElectronApp(options, packagerFn);
    expect(packagerFn).toHaveBeenCalledWith(options.packager);
    expect(result.appPath).toBe('/tmp/out/MyApp');
  });

  test('throws when packager returns empty array', async () => {
    const options = {
      packager: { platform: 'linux', dir: '/tmp/template' },
    } as AppOptions;
    await expect(
      packageElectronApp(options, jest.fn().mockResolvedValue([])),
    ).rejects.toThrow('App Path could not be determined.');
  });
});
