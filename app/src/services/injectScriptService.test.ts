import * as fs from 'fs';
import * as path from 'path';

jest.mock('../helpers/helpers', () => {
  const mockOs = require('os') as typeof import('os');
  const mockPath = require('path') as typeof import('path');
  return {
    INJECT_DIR: mockPath.join(mockOs.tmpdir(), 'nativefier-inject-test'),
  };
});

import { INJECT_DIR } from '../helpers/helpers';

jest.mock('../helpers/loggingHelper', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

const mockOnIpcMainEvent = jest.fn();

jest.mock('../adapters/ipcAdapter', () => ({
  onIpcMainEvent: (...args: unknown[]) => mockOnIpcMainEvent(...args),
}));

import {
  readInjectScriptSources,
  registerInjectScriptIpc,
} from './injectScriptService';

describe('injectScriptService', () => {
  const injectDir = INJECT_DIR;

  beforeEach(() => {
    jest.clearAllMocks();
    fs.rmSync(injectDir, { recursive: true, force: true });
    fs.mkdirSync(injectDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(injectDir, { recursive: true, force: true });
  });

  test('readInjectScriptSources returns empty when inject dir missing', () => {
    fs.rmSync(injectDir, { recursive: true, force: true });
    expect(readInjectScriptSources()).toEqual([]);
  });

  test('readInjectScriptSources reads only .js files', () => {
    fs.writeFileSync(path.join(injectDir, 'a.js'), 'window.a = 1;');
    fs.writeFileSync(path.join(injectDir, 'b.css'), 'ignored');
    fs.writeFileSync(path.join(injectDir, 'c.js'), 'window.c = 1;');

    expect(readInjectScriptSources()).toEqual(['window.a = 1;', 'window.c = 1;']);
  });

  test('registerInjectScriptIpc registers handler once', () => {
    registerInjectScriptIpc();
    registerInjectScriptIpc();

    expect(mockOnIpcMainEvent).toHaveBeenCalledTimes(1);
    expect(mockOnIpcMainEvent).toHaveBeenCalledWith(
      'get-inject-script-sources',
      expect.any(Function),
    );
  });
});
