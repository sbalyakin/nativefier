import { STABLE_CONTRACT_TEST_BUILD_DATE } from '../../../shared/lib/src/contract/testFixtures';
import {
  assertValidOutputOptions,
  validateOutputOptions,
} from './validateOutputOptions';

const validConfig = {
  name: 'TestApp',
  targetUrl: 'https://example.com/',
  webholmVersion: '54.0.0',
  buildDate: STABLE_CONTRACT_TEST_BUILD_DATE,
  blockExternalUrls: false,
  disableDevTools: false,
  isUpgrade: false,
  strictInternalUrls: false,
  oldBuildWarningText: '',
};

test('validateOutputOptions accepts minimal valid config', () => {
  expect(validateOutputOptions(validConfig)).toEqual([]);
  expect(() => assertValidOutputOptions(validConfig)).not.toThrow();
});

test('validateOutputOptions rejects non-object root', () => {
  const errors = validateOutputOptions(null);
  expect(errors).toHaveLength(1);
  expect(errors[0].message).toContain('JSON object');
});

test('validateOutputOptions rejects invalid targetUrl', () => {
  const errors = validateOutputOptions({
    ...validConfig,
    targetUrl: 'not-a-url',
  });
  expect(errors.some((e) => e.field === 'targetUrl')).toBe(true);
});

test('validateOutputOptions rejects invalid tray', () => {
  const errors = validateOutputOptions({
    ...validConfig,
    tray: 'maybe',
  });
  expect(errors.some((e) => e.field === 'tray')).toBe(true);
});

test('assertValidOutputOptions throws with field details', () => {
  expect(() => assertValidOutputOptions({ ...validConfig, name: '' })).toThrow(
    /name must be a non-empty string/,
  );
});
