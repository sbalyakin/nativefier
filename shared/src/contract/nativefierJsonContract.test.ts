import {
  BUILDER_INJECTED_OUTPUT_FIELDS,
  RUNTIME_REQUIRED_BOOLEAN_FIELDS,
  RUNTIME_REQUIRED_STRING_FIELDS,
  validateNativefierJsonContract,
} from './nativefierJsonContract';
import { STABLE_CONTRACT_TEST_BUILD_DATE } from './testFixtures';

const validConfig = {
  name: 'TestApp',
  targetUrl: 'https://example.com/',
  nativefierVersion: '54.0.0',
  buildDate: STABLE_CONTRACT_TEST_BUILD_DATE,
  blockExternalUrls: false,
  disableDevTools: false,
  isUpgrade: false,
  strictInternalUrls: false,
  oldBuildWarningText: '',
};

test('validateNativefierJsonContract accepts minimal valid config', () => {
  expect(validateNativefierJsonContract(validConfig)).toEqual([]);
});

test('validateNativefierJsonContract rejects non-object root', () => {
  const errors = validateNativefierJsonContract(null);
  expect(errors).toHaveLength(1);
  expect(errors[0].message).toContain('JSON object');
});

test('validateNativefierJsonContract rejects invalid targetUrl', () => {
  const errors = validateNativefierJsonContract({
    ...validConfig,
    targetUrl: 'not-a-url',
  });
  expect(errors.some((e) => e.field === 'targetUrl')).toBe(true);
});

test('validateNativefierJsonContract rejects invalid tray', () => {
  const errors = validateNativefierJsonContract({
    ...validConfig,
    tray: 'maybe',
  });
  expect(errors.some((e) => e.field === 'tray')).toBe(true);
});

test('contract constants document required and injected fields', () => {
  expect(RUNTIME_REQUIRED_STRING_FIELDS).toContain('targetUrl');
  expect(RUNTIME_REQUIRED_BOOLEAN_FIELDS).toContain('isUpgrade');
  expect(BUILDER_INJECTED_OUTPUT_FIELDS).toContain('buildDate');
});
