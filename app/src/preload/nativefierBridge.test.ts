jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
}));

import { contextBridge } from 'electron';

import {
  assignPreloadNativefierGlobal,
  createNativefierBridge,
  createNativefierNotifyBridge,
  createNativefierSessionBridge,
  exposeNativefierBridge,
  exposeNativefierNotifyBridge,
  sendSessionInteraction,
  setupNativefierBridge,
  setupNativefierNotifyBridge,
} from './nativefierBridge';

const mockExposeInMainWorld = contextBridge.exposeInMainWorld as jest.Mock;

const originalContextIsolated = process.contextIsolated;
const originalWindow = globalThis.window;

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.window = {} as Window & typeof globalThis;
  delete (globalThis as { nativefier?: unknown }).nativefier;
  delete (globalThis.window as { nativefier?: unknown }).nativefier;
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

function createMockIpcRenderer(): {
  send: jest.Mock;
  on: jest.Mock;
  removeListener: jest.Mock;
  handlers: Record<string, (event: unknown, payload: unknown) => void>;
} {
  const handlers: Record<string, (event: unknown, payload: unknown) => void> =
    {};
  return {
    handlers,
    send: jest.fn(),
    on: jest.fn((channel: string, handler: (typeof handlers)[string]) => {
      handlers[channel] = handler;
    }),
    removeListener: jest.fn((channel: string, handler: (typeof handlers)[string]) => {
      if (handlers[channel] === handler) {
        delete handlers[channel];
      }
    }),
  };
}

test('sendSessionInteraction sends request and resolves matching reply', async () => {
  const ipcRenderer = createMockIpcRenderer();
  const promise = sendSessionInteraction(ipcRenderer as never, {
    property: 'spellCheckerEnabled',
    id: 'req-1',
  });

  expect(ipcRenderer.send).toHaveBeenCalledWith('session-interaction', {
    property: 'spellCheckerEnabled',
    id: 'req-1',
  });

  ipcRenderer.handlers['session-interaction-reply']('event', {
    id: 'req-1',
    value: true,
  });

  await expect(promise).resolves.toEqual({ id: 'req-1', value: true });
  expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
    'session-interaction-reply',
    expect.any(Function),
  );
});

test('sendSessionInteraction ignores replies for other request ids', async () => {
  const ipcRenderer = createMockIpcRenderer();
  const promise = sendSessionInteraction(ipcRenderer as never, {
    func: 'clearCache',
    id: 'mine',
  });

  ipcRenderer.handlers['session-interaction-reply']('event', {
    id: 'other',
    value: 'wrong',
  });

  ipcRenderer.handlers['session-interaction-reply']('event', {
    id: 'mine',
    value: 'ok',
  });

  await expect(promise).resolves.toEqual({ id: 'mine', value: 'ok' });
});

test('sendSessionInteraction rejects when result contains error', async () => {
  const ipcRenderer = createMockIpcRenderer();
  const promise = sendSessionInteraction(ipcRenderer as never, {
    func: 'missing',
  });

  const sentId = ipcRenderer.send.mock.calls[0][1].id as string;
  ipcRenderer.handlers['session-interaction-reply']('event', {
    id: sentId,
    error: { message: 'boom' },
  });

  await expect(promise).rejects.toThrow('boom');
});

test('createNativefierSessionBridge maps get set and call to session-interaction', async () => {
  const ipcRenderer = createMockIpcRenderer();
  const session = createNativefierSessionBridge(ipcRenderer as never);

  const getPromise = session.get('availableSpellCheckerLanguages', {
    id: 'get-langs',
  });
  ipcRenderer.handlers['session-interaction-reply']('event', {
    id: 'get-langs',
    value: ['en'],
  });
  await expect(getPromise).resolves.toEqual(['en']);

  const setPromise = session.set('spellCheckerEnabled', true, {
    id: 'set-enabled',
  });
  ipcRenderer.handlers['session-interaction-reply']('event', {
    id: 'set-enabled',
    value: true,
  });
  await expect(setPromise).resolves.toBe(true);

  const callPromise = session.call('setSpellCheckerLanguages', [['fr']], {
    id: 'set-lang',
  });
  expect(ipcRenderer.send).toHaveBeenLastCalledWith('session-interaction', {
    func: 'setSpellCheckerLanguages',
    funcArgs: [['fr']],
    id: 'set-lang',
  });
  ipcRenderer.handlers['session-interaction-reply']('event', {
    id: 'set-lang',
    value: undefined,
  });
  await expect(callPromise).resolves.toBeUndefined();
});

test('exposeNativefierBridge uses contextBridge when isolated', () => {
  Object.defineProperty(process, 'contextIsolated', {
    value: true,
    configurable: true,
  });

  const bridge = createNativefierBridge({} as never);
  exposeNativefierBridge(bridge);

  expect(mockExposeInMainWorld).toHaveBeenCalledWith('nativefier', bridge);
});

test('exposeNativefierBridge assigns window when not isolated', () => {
  Object.defineProperty(process, 'contextIsolated', {
    value: false,
    configurable: true,
  });

  const bridge = createNativefierBridge({} as never);
  exposeNativefierBridge(bridge);

  expect(mockExposeInMainWorld).not.toHaveBeenCalled();
  expect(
    (globalThis.window as { nativefier?: typeof bridge }).nativefier,
  ).toBe(bridge);
});

test('setupNativefierBridge exposes session bridge and notify channel', () => {
  Object.defineProperty(process, 'contextIsolated', {
    value: false,
    configurable: true,
  });

  const ipcRenderer = createMockIpcRenderer();
  const bridge = setupNativefierBridge(ipcRenderer as never);

  expect(
    (globalThis as { nativefier?: typeof bridge }).nativefier,
  ).toBe(bridge);
  expect(
    (globalThis.window as { nativefier?: typeof bridge }).nativefier,
  ).toBe(bridge);

  const notifyBridge = (
    globalThis.window as {
      __nativefierNotify?: ReturnType<typeof createNativefierNotifyBridge>;
    }
  ).__nativefierNotify;
  expect(notifyBridge).toBeDefined();
  notifyBridge?.create('Title', { body: 'Body' });
  expect(ipcRenderer.send).toHaveBeenCalledWith('notification', 'Title', {
    body: 'Body',
  });
  notifyBridge?.click();
  expect(ipcRenderer.send).toHaveBeenCalledWith('notification-click');
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

test('setupNativefierNotifyBridge exposes bridge for IPC', () => {
  Object.defineProperty(process, 'contextIsolated', {
    value: false,
    configurable: true,
  });

  const ipcRenderer = { send: jest.fn() };
  setupNativefierNotifyBridge(ipcRenderer as never);

  const bridge = (
    globalThis.window as {
      __nativefierNotify?: ReturnType<typeof createNativefierNotifyBridge>;
    }
  ).__nativefierNotify;
  expect(bridge).toBeDefined();

  bridge?.create('X', {});
  expect(ipcRenderer.send).toHaveBeenCalledWith('notification', 'X', {});
});

test('assignPreloadNativefierGlobal sets global nativefier', () => {
  const bridge = createNativefierBridge({} as never);
  assignPreloadNativefierGlobal(bridge);
  expect((globalThis as { nativefier?: typeof bridge }).nativefier).toBe(
    bridge,
  );
});
