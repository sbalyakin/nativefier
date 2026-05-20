import type { AppOptions } from '../../buildTimeContract';
import { prepareTemplate } from './prepareTemplate';

jest.mock('../../helpers/helpers', () => ({
  getTempDir: jest.fn(() => '/tmp/nativefier-template'),
}));

jest.mock('../prepareElectronApp', () => ({
  prepareElectronApp: jest.fn().mockResolvedValue(undefined),
}));

describe('prepareTemplate', () => {
  test('prepares electron app in temp dir and updates packager.dir', async () => {
    const options = {
      packager: { dir: '/original/template', platform: 'linux' },
    } as AppOptions;
    const result = await prepareTemplate(options);
    expect(result.templatePath).toBe('/tmp/nativefier-template');
    expect(result.options.packager.dir).toBe('/tmp/nativefier-template');
  });
});
