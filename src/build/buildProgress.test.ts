import { buildLabel } from './buildProgress';

describe('buildLabel', () => {
  test('returns hostname for a valid URL', () => {
    expect(buildLabel('https://example.com/path')).toBe('example.com');
  });

  test('falls back to app for invalid or empty URLs', () => {
    expect(buildLabel('url')).toBe('app');
    expect(buildLabel('')).toBe('app');
  });
});
