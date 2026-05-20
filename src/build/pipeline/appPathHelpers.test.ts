import { getAppPath, getOSRunHelp } from './appPathHelpers';

describe('getAppPath', () => {
  test('returns string path unchanged', () => {
    expect(getAppPath('/tmp/my-app')).toBe('/tmp/my-app');
  });

  test('returns first element when array is non-empty', () => {
    expect(getAppPath(['/tmp/first', '/tmp/second'])).toBe('/tmp/first');
  });

  test('returns undefined for empty array', () => {
    expect(getAppPath([])).toBeUndefined();
  });
});

describe('getOSRunHelp', () => {
  test('returns platform-specific run instructions', () => {
    expect(getOSRunHelp('win32')).toContain('.exe');
    expect(getOSRunHelp('linux')).toContain('executable');
    expect(getOSRunHelp('darwin')).toContain('app bundle');
    expect(getOSRunHelp('unknown')).toBe('');
  });
});
