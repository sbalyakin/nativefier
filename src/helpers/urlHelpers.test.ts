import {
  getAppNameFromHostname,
  getHostnameFromUrl,
} from './urlHelpers';

describe('getHostnameFromUrl', () => {
  test('returns hostname for valid URLs', () => {
    expect(getHostnameFromUrl('https://chatgpt.com/path')).toBe('chatgpt.com');
    expect(getHostnameFromUrl('http://www.example.org')).toBe('www.example.org');
  });

  test('returns undefined for invalid URLs', () => {
    expect(getHostnameFromUrl('not-a-url')).toBeUndefined();
  });
});

describe('getAppNameFromHostname', () => {
  test('strips www and capitalizes the first label', () => {
    expect(getAppNameFromHostname('www.chatgpt.com')).toBe('Chatgpt');
    expect(getAppNameFromHostname('github.com')).toBe('Github');
  });
});
