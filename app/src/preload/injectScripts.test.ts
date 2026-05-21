import type { IpcRenderer } from 'electron';

import * as path from 'path';

import { INJECT_DIR } from '../helpers/helpers';

import {
  injectJsRelativePath,
  injectScripts,
  isInjectJsFile,
  listInjectJsFileNames,
  listInjectJsRelativePaths,
} from './injectScripts';

test('isInjectJsFile accepts only .js files', () => {
  expect(isInjectJsFile('foo.js', true)).toBe(true);
  expect(isInjectJsFile('foo.ts', true)).toBe(false);
  expect(isInjectJsFile('foo.js', false)).toBe(false);
});

test('injectJsRelativePath builds require path under inject dir', () => {
  expect(injectJsRelativePath('custom.js')).toBe('inject/custom.js');
});

test('listInjectJsRelativePaths filters and maps inject entries', () => {
  const paths = listInjectJsRelativePaths([
    { name: 'a.js', isFile: (): boolean => true },
    { name: 'b.css', isFile: (): boolean => true },
    { name: 'c.js', isFile: (): boolean => false },
    { name: 'd.js', isFile: (): boolean => true },
  ]);
  expect(paths).toEqual(['inject/a.js', 'inject/d.js']);
});

test('listInjectJsFileNames returns only .js file names', () => {
  const names = listInjectJsFileNames([
    { name: 'a.js', isFile: (): boolean => true },
    { name: 'b.css', isFile: (): boolean => true },
    { name: 'd.js', isFile: (): boolean => true },
  ]);
  expect(names).toEqual(['a.js', 'd.js']);
});

test('inject dir paths join INJECT_DIR and file name', () => {
  expect(path.join(INJECT_DIR, 'custom.js')).toMatch(/inject[\\/]custom\.js$/);
});

test('injectScripts runs sources from main via ipc sendSync', () => {
  const ipcRenderer = {
    sendSync: jest.fn(() => ['globalThis.__injected = true;']),
  } as unknown as IpcRenderer;

  injectScripts(ipcRenderer);
  expect(
    (globalThis as typeof globalThis & { __injected?: boolean }).__injected,
  ).toBe(true);
});
