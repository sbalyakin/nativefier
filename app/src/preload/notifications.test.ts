jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
}));

import { contextBridge } from 'electron';

import {
  createNativefierNotifyBridge,
  exposeNativefierNotifyBridge,
  setupNotifications,
} from './notifications';

const mockExposeInMainWorld = contextBridge.exposeInMainWorld as jest.Mock;

const originalContextIsolated = process.contextIsolated;
const originalWindow = globalThis.window;

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.window = {} as Window & typeof globalThis;
  delete (
    globalThis.window as { __nativefierNotify?: unknown }
  ).__nativefierNotify;
});

afterAll(() => {
  Object.defineProperty(process, 'contextIsolated', {
    value: originalContextIsolated,
    configurable: true,
  });
  globalThis.window = originalWindow;
});

test('createNativefierNotifyBridge sends IPC on create and click', () => {
  const ipcRenderer = { send: jest.fn() };
  const bridge = createNativefierNotifyBridge(ipcRenderer as never);

  bridge.create('Title', { body: 'Body' });
  expect(ipcRenderer.send).toHaveBeenCalledWith('notification', 'Title', {
    body: 'Body',
  });

  bridge.click();
  expect(ipcRenderer.send).toHaveBeenCalledWith('notification-click');
});

test('exposeNativefierNotifyBridge uses contextBridge when isolated', () => {
  Object.defineProperty(process, 'contextIsolated', {
    value: true,
    configurable: true,
  });

  const bridge = { create: jest.fn(), click: jest.fn() };
  exposeNativefierNotifyBridge(bridge);

  expect(mockExposeInMainWorld).toHaveBeenCalledWith(
    '__nativefierNotify',
    bridge,
  );
});

test('exposeNativefierNotifyBridge assigns window when not isolated', () => {
  Object.defineProperty(process, 'contextIsolated', {
    value: false,
    configurable: true,
  });

  const bridge = { create: jest.fn(), click: jest.fn() };
  exposeNativefierNotifyBridge(bridge);

  expect(mockExposeInMainWorld).not.toHaveBeenCalled();
  expect(
    (globalThis.window as { __nativefierNotify?: typeof bridge })
      .__nativefierNotify,
  ).toBe(bridge);
});

test('setupNotifications exposes bridge for IPC', () => {
  Object.defineProperty(process, 'contextIsolated', {
    value: false,
    configurable: true,
  });

  const ipcRenderer = { send: jest.fn() };
  setupNotifications(ipcRenderer as never);

  const bridge = (
    globalThis.window as {
      __nativefierNotify?: ReturnType<typeof createNativefierNotifyBridge>;
    }
  ).__nativefierNotify;
  expect(bridge).toBeDefined();

  bridge?.create('X', {});
  expect(ipcRenderer.send).toHaveBeenCalledWith('notification', 'X', {});
});
