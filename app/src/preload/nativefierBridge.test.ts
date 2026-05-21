const mockExposeInMainWorld = jest.fn();

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: mockExposeInMainWorld,
  },
}));

import {
  assignPreloadNativefierGlobal,
  createNativefierBridge,
  createNativefierSessionBridge,
  exposeNativefierBridge,
  sendSessionInteraction,
  setupNativefierBridge,
} from './nativefierBridge';

const originalContextIsolated = process.contextIsolated;
const originalWindow = globalThis.window;

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.window = {} as Window & typeof globalThis;
  delete (globalThis as { nativefier?: unknown }).nativefier;
  delete (globalThis.window as { nativefier?: unknown }).nativefier;
  delete (globalThis.window as { __nativefierNotify?: unknown })
    .__nativefierNotify;
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
    removeListener: jest.fn(
      (channel: string, handler: (typeof handlers)[string]) => {
        if (handlers[channel] === handler) {
          delete handlers[channel];
        }
      },
    ),
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
  expect(mockExposeInMainWorld).not.toHaveBeenCalledWith(
    '__nativefierNotify',
    expect.anything(),
  );
});

test('exposeNativefierBridge assigns window when not isolated', () => {
  Object.defineProperty(process, 'contextIsolated', {
    value: false,
    configurable: true,
  });

  const bridge = createNativefierBridge({} as never);
  exposeNativefierBridge(bridge);

  expect(mockExposeInMainWorld).not.toHaveBeenCalled();
  expect((globalThis.window as { nativefier?: typeof bridge }).nativefier).toBe(
    bridge,
  );
});

test('setupNativefierBridge exposes session bridge only', () => {
  Object.defineProperty(process, 'contextIsolated', {
    value: false,
    configurable: true,
  });

  const ipcRenderer = createMockIpcRenderer();
  const bridge = setupNativefierBridge(ipcRenderer as never);

  expect((globalThis as { nativefier?: typeof bridge }).nativefier).toBe(
    bridge,
  );
  expect((globalThis.window as { nativefier?: typeof bridge }).nativefier).toBe(
    bridge,
  );
  expect(
    (globalThis.window as { __nativefierNotify?: unknown }).__nativefierNotify,
  ).toBeUndefined();
  expect(ipcRenderer.send).not.toHaveBeenCalled();
});

test('assignPreloadNativefierGlobal sets global nativefier', () => {
  const bridge = createNativefierBridge({} as never);
  assignPreloadNativefierGlobal(bridge);
  expect((globalThis as { nativefier?: typeof bridge }).nativefier).toBe(
    bridge,
  );
});
