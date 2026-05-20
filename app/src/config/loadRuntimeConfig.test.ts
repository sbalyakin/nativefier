import { STABLE_CONTRACT_TEST_BUILD_DATE } from '../../../shared/lib/src/contract/testFixtures';
import {
  applyCommandLineTargetUrlOverride,
  loadRuntimeConfigFromSource,
  parseRuntimeConfigJson,
} from './loadRuntimeConfig';

const validJson = JSON.stringify({
  name: 'TestApp',
  targetUrl: 'https://example.com/',
  nativefierVersion: '53.0.0',
  buildDate: STABLE_CONTRACT_TEST_BUILD_DATE,
  blockExternalUrls: false,
  disableDevTools: false,
  isUpgrade: false,
  strictInternalUrls: false,
  oldBuildWarningText: '',
});

test('parseRuntimeConfigJson returns validated OutputOptions', () => {
  const config = parseRuntimeConfigJson(validJson);
  expect(config.name).toBe('TestApp');
  expect(config.targetUrl).toBe('https://example.com/');
});

test('loadRuntimeConfigFromSource matches parseRuntimeConfigJson', () => {
  expect(loadRuntimeConfigFromSource(validJson).name).toBe('TestApp');
});

test('applyCommandLineTargetUrlOverride replaces targetUrl for valid http argv', () => {
  const config = parseRuntimeConfigJson(validJson);
  const updated = applyCommandLineTargetUrlOverride(config, [
    'electron',
    'https://override.test/page',
  ]);
  expect(updated.targetUrl).toBe('https://override.test/page');
});

test('applyCommandLineTargetUrlOverride keeps config when argv url invalid', () => {
  const config = parseRuntimeConfigJson(validJson);
  const updated = applyCommandLineTargetUrlOverride(config, [
    'electron',
    'http://[invalid',
  ]);
  expect(updated.targetUrl).toBe('https://example.com/');
});

test('parseRuntimeConfigJson throws on invalid config', () => {
  expect(() => parseRuntimeConfigJson('{}')).toThrow(/Invalid nativefier.json/);
});

test('parseRuntimeConfigJson merges playwright defaults when requested', () => {
  const config = parseRuntimeConfigJson(
    JSON.stringify({ targetUrl: 'https://example.com/' }),
    { applyPlaywrightDefaults: true },
  );
  expect(config.name).toBe('PlaywrightTest');
  expect(config.targetUrl).toBe('https://example.com/');
  expect(config.nativefierVersion).toBe('0.0.0-test');
  expect(config.disableOldBuildWarning).toBe(true);
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  expect(Date.now() - config.buildDate).toBeLessThan(ninetyDaysMs);
});
