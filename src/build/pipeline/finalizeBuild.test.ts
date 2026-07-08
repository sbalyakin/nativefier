import { finalizeBuild } from './finalizeBuild';

describe('finalizeBuild', () => {
  test('returns app path unchanged', () => {
    const options = {
      packager: { platform: 'linux', name: 'MyApp' },
    } as import('../../buildTimeContract').AppOptions;
    expect(finalizeBuild('/tmp/MyApp', options)).toBe('/tmp/MyApp');
  });
});
