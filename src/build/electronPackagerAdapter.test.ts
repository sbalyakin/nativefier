import type { ElectronPackagerOptions } from '../buildTimeContract';
import { runElectronPackager } from './electronPackagerAdapter';

describe('runElectronPackager', () => {
  test('delegates to injected packager function', async () => {
    const packagerFn = jest.fn().mockResolvedValue('/tmp/MyApp');
    const packagerOptions = {
      platform: 'linux',
      dir: '/tmp/template',
      arch: 'x64',
      portable: false,
      targetUrl: 'https://example.com',
      upgrade: false,
    } as ElectronPackagerOptions;
    const result = await runElectronPackager(packagerOptions, packagerFn);
    expect(packagerFn).toHaveBeenCalledWith(packagerOptions);
    expect(result).toBe('/tmp/MyApp');
  });
});
