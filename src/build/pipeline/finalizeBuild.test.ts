import { finalizeBuild } from './finalizeBuild';
import { touchPackagedAppCreationDate } from './touchPackagedAppCreationDate';

jest.mock('./touchPackagedAppCreationDate', () => ({
  touchPackagedAppCreationDate: jest.fn().mockResolvedValue(undefined),
}));

describe('finalizeBuild', () => {
  test('returns app path unchanged', async () => {
    const options = {
      packager: { platform: 'linux', name: 'MyApp' },
    } as import('../../buildTimeContract').AppOptions;
    await expect(finalizeBuild('/tmp/MyApp', options)).resolves.toBe(
      '/tmp/MyApp',
    );
    expect(touchPackagedAppCreationDate).toHaveBeenCalledWith(
      '/tmp/MyApp',
      options.packager,
    );
  });
});
