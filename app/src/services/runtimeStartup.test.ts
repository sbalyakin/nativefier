const mockAppendSwitch = jest.fn();

jest.mock('../adapters/downloadAdapter', () => ({
  configureFileDownloads: jest.fn(),
}));

jest.mock('../adapters/appAdapter', () => ({
  ...jest.requireActual('../adapters/appAdapter'),
  appendCommandLineSwitch: (...args: unknown[]): void => {
    mockAppendSwitch(...args);
  },
}));

jest.mock('../helpers/inferFlash', () => ({
  inferFlashPath: jest.fn(() => '/flash/path'),
}));

jest.mock('../helpers/helpers', () => ({
  ...jest.requireActual('../helpers/helpers'),
  isWayland: jest.fn(() => false),
  isWindows: jest.fn(() => false),
}));

import type { OutputOptions } from '../runtimeContract';
import { applyCommandLineSwitches, applyProcessEnvs } from './runtimeStartup';

const baseArgs = {
  name: 'Test',
  targetUrl: 'https://example.com/',
} as OutputOptions;

describe('applyProcessEnvs', () => {
  const originalProcessEnvs = process.env.processEnvs;

  afterEach(() => {
    delete process.env.FOO_FROM_TEST;
    if (originalProcessEnvs === undefined) {
      delete process.env.processEnvs;
    } else {
      process.env.processEnvs = originalProcessEnvs;
    }
  });

  test('applies parsed JSON env vars', () => {
    applyProcessEnvs({
      ...baseArgs,
      processEnvs: '{"FOO_FROM_TEST":"bar"}',
    });
    expect(process.env.FOO_FROM_TEST).toBe('bar');
    expect(process.env.processEnvs).toBeUndefined();
  });

  test('invalid JSON does not set process.env.processEnvs', () => {
    applyProcessEnvs({
      ...baseArgs,
      processEnvs: 'not-json',
    });
    expect(process.env.processEnvs).toBeUndefined();
    expect(process.env.FOO_FROM_TEST).toBeUndefined();
  });
});

describe('applyCommandLineSwitches', () => {
  beforeEach(() => {
    mockAppendSwitch.mockClear();
  });

  test('does not pass basic auth credentials to command line', () => {
    applyCommandLineSwitches({
      ...baseArgs,
      basicAuthUsername: 'user',
      basicAuthPassword: 'secret',
    });
    expect(mockAppendSwitch).not.toHaveBeenCalledWith(
      'basic-auth-username',
      expect.anything(),
    );
    expect(mockAppendSwitch).not.toHaveBeenCalledWith(
      'basic-auth-password',
      expect.anything(),
    );
  });
});
