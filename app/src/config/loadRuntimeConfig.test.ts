import { STABLE_CONTRACT_TEST_BUILD_DATE } from '../../../shared/lib/src/contract/testFixtures';
import {
  applyCommandLineTargetUrlOverride,
  extractHttpUrlFromArgv,
  loadRuntimeConfigFromSource,
  parseRuntimeConfigJson,
} from './loadRuntimeConfig';
import { stripSensitiveOutputOptions } from './runtimeSecrets';

const validJson = JSON.stringify({
  name: 'TestApp',
  targetUrl: 'https://example.com/',
  webholmVersion: '54.0.0',
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

test('extractHttpUrlFromArgv returns first valid http url', () => {
  expect(
    extractHttpUrlFromArgv([
      '/Applications/Google Meet.app/Contents/MacOS/Google Meet',
      'https://meet.google.com/abc-defg-hij',
    ]),
  ).toBe('https://meet.google.com/abc-defg-hij');
});

test('extractHttpUrlFromArgv returns undefined for invalid url', () => {
  expect(extractHttpUrlFromArgv(['electron', 'http://[invalid'])).toBeUndefined();
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
  expect(() => parseRuntimeConfigJson('{}')).toThrow(/Invalid webholm\.json/);
});

test('stripSensitiveOutputOptions keeps parsed config except secrets', () => {
  const config = parseRuntimeConfigJson(
    JSON.stringify({
      ...JSON.parse(validJson),
      basicAuthPassword: 'secret',
      processEnvs: '{}',
    }),
  );
  const stripped = stripSensitiveOutputOptions(config);
  expect(stripped.name).toBe('TestApp');
  expect(stripped.basicAuthPassword).toBeUndefined();
  expect(stripped.processEnvs).toBeUndefined();
});

test('parseRuntimeConfigJson maps legacy nativefierVersion to webholmVersion', () => {
  const config = parseRuntimeConfigJson(
    JSON.stringify({
      name: 'LegacyApp',
      targetUrl: 'https://example.com/',
      nativefierVersion: '50.0.0',
      buildDate: STABLE_CONTRACT_TEST_BUILD_DATE,
      blockExternalUrls: false,
      disableDevTools: false,
      isUpgrade: false,
      strictInternalUrls: false,
      oldBuildWarningText: '',
    }),
  );
  expect(config.webholmVersion).toBe('50.0.0');
});

test('parseRuntimeConfigJson merges playwright defaults when requested', () => {
  const config = parseRuntimeConfigJson(
    JSON.stringify({ targetUrl: 'https://example.com/' }),
    { applyPlaywrightDefaults: true },
  );
  expect(config.name).toBe('PlaywrightTest');
  expect(config.targetUrl).toBe('https://example.com/');
  expect(config.webholmVersion).toBe('0.0.0-test');
  expect(config.disableOldBuildWarning).toBe(true);
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  expect(Date.now() - config.buildDate).toBeLessThan(ninetyDaysMs);
});
