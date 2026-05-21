import * as fs from 'fs';

jest.mock('fs');
jest.mock('./runtimeConfigPath', () => ({
  getRuntimeConfigPath: () => '/tmp/nativefier.json',
}));

import type { OutputOptions } from '../runtimeContract';
import { persistRuntimeConfig } from './persistRuntimeConfig';

const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<
  typeof fs.writeFileSync
>;

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
  basicAuthUsername: 'user',
  basicAuthPassword: 'secret',
  processEnvs: '{"KEY":"val"}',
} as OutputOptions;

beforeEach(() => {
  mockWriteFileSync.mockClear();
});

test('persistRuntimeConfig strips sensitive keys before write', () => {
  persistRuntimeConfig(baseOutput);

  expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
  const written = JSON.parse(
    mockWriteFileSync.mock.calls[0][1] as string,
  ) as Record<string, unknown>;
  expect(written.basicAuthPassword).toBeUndefined();
  expect(written.basicAuthUsername).toBeUndefined();
  expect(written.processEnvs).toBeUndefined();
  expect(written.name).toBe('TestApp');
});
