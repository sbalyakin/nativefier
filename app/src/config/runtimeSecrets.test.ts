import type { OutputOptions, WindowOptions } from '../runtimeContract';
import {
  pickRendererParams,
  serializeRendererParams,
  stripSensitiveOutputOptions,
} from './runtimeSecrets';

const baseOutput = {
  name: 'TestApp',
  targetUrl: 'https://example.com/',
  nativefierVersion: '54.0.0',
  buildDate: 1,
  blockExternalUrls: false,
  disableDevTools: false,
  isUpgrade: false,
  strictInternalUrls: false,
  oldBuildWarningText: '',
  zoom: 1.5,
  basicAuthUsername: 'user',
  basicAuthPassword: 'secret',
  processEnvs: '{"API_KEY":"x"}',
} as OutputOptions;

test('stripSensitiveOutputOptions removes auth and processEnvs', () => {
  const stripped = stripSensitiveOutputOptions(baseOutput);
  expect(stripped.basicAuthPassword).toBeUndefined();
  expect(stripped.basicAuthUsername).toBeUndefined();
  expect(stripped.processEnvs).toBeUndefined();
  expect(stripped.name).toBe('TestApp');
  expect(stripped.targetUrl).toBe('https://example.com/');
});

test('pickRendererParams omits secrets from spread window options', () => {
  const params = pickRendererParams({
    name: baseOutput.name,
    targetUrl: baseOutput.targetUrl,
    zoom: baseOutput.zoom ?? 1,
    blockExternalUrls: baseOutput.blockExternalUrls,
    autoHideMenuBar: true,
    insecure: false,
    nativefierVersion: baseOutput.nativefierVersion,
    buildDate: baseOutput.buildDate,
    basicAuthPassword: baseOutput.basicAuthPassword,
    basicAuthUsername: baseOutput.basicAuthUsername,
    processEnvs: baseOutput.processEnvs,
  } as WindowOptions & Record<string, unknown>);
  expect(params).toMatchObject({
    name: 'TestApp',
    targetUrl: 'https://example.com/',
    zoom: 1.5,
    nativefierVersion: '54.0.0',
    buildDate: 1,
    autoHideMenuBar: true,
  });
  expect(params).not.toHaveProperty('basicAuthPassword');
  expect(params).not.toHaveProperty('basicAuthUsername');
  expect(params).not.toHaveProperty('processEnvs');
});

test('serializeRendererParams never includes sensitive keys', () => {
  const json = serializeRendererParams({
    name: baseOutput.name,
    targetUrl: baseOutput.targetUrl,
    zoom: 1.5,
    blockExternalUrls: false,
    autoHideMenuBar: false,
    insecure: true,
    basicAuthPassword: 'secret',
    processEnvs: '{}',
  } as WindowOptions & Record<string, unknown>);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  expect(parsed.basicAuthPassword).toBeUndefined();
  expect(parsed.basicAuthUsername).toBeUndefined();
  expect(parsed.processEnvs).toBeUndefined();
  expect(parsed.targetUrl).toBe('https://example.com/');
});
