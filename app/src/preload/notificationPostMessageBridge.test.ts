import {
  NOTIFY_IPC_CHANNEL,
  NOTIFY_POST_MESSAGE_CHANNEL,
} from './notificationChannel';
import {
  handleNotificationPostMessage,
  setupNotificationPostMessageBridge,
} from './notificationPostMessageBridge';

function createMockIpcRenderer(): { send: jest.Mock } {
  return { send: jest.fn() };
}

const originalWindow = globalThis.window;

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.window = {
    addEventListener: jest.fn(),
  } as unknown as Window & typeof globalThis;
});

afterAll(() => {
  globalThis.window = originalWindow;
});

test('handleNotificationPostMessage forwards valid create message', () => {
  const ipcRenderer = createMockIpcRenderer();

  handleNotificationPostMessage(
    ipcRenderer as never,
    {
      source: window,
      data: {
        channel: NOTIFY_POST_MESSAGE_CHANNEL,
        token: 'tok',
        op: 'create',
        title: 'Hello',
        opt: { body: 'World' },
      },
    } as unknown as MessageEvent,
  );

  expect(ipcRenderer.send).toHaveBeenCalledWith(NOTIFY_IPC_CHANNEL, {
    token: 'tok',
    op: 'create',
    title: 'Hello',
    opt: { body: 'World' },
  });
});

test('handleNotificationPostMessage forwards valid click message', () => {
  const ipcRenderer = createMockIpcRenderer();

  handleNotificationPostMessage(
    ipcRenderer as never,
    {
      source: window,
      data: {
        channel: NOTIFY_POST_MESSAGE_CHANNEL,
        token: 'tok',
        op: 'click',
      },
    } as unknown as MessageEvent,
  );

  expect(ipcRenderer.send).toHaveBeenCalledWith(NOTIFY_IPC_CHANNEL, {
    token: 'tok',
    op: 'click',
  });
});

test('handleNotificationPostMessage ignores wrong channel or source', () => {
  const ipcRenderer = createMockIpcRenderer();

  handleNotificationPostMessage(
    ipcRenderer as never,
    {
      source: {} as unknown as Window,
      data: {
        channel: NOTIFY_POST_MESSAGE_CHANNEL,
        token: 'tok',
        op: 'create',
        title: 'X',
      },
    } as unknown as MessageEvent,
  );

  handleNotificationPostMessage(
    ipcRenderer as never,
    {
      source: window,
      data: {
        channel: 'other',
        token: 'tok',
        op: 'create',
        title: 'X',
      },
    } as unknown as MessageEvent,
  );

  expect(ipcRenderer.send).not.toHaveBeenCalled();
});

test('handleNotificationPostMessage rejects create without string title', () => {
  const ipcRenderer = createMockIpcRenderer();

  handleNotificationPostMessage(
    ipcRenderer as never,
    {
      source: window,
      data: {
        channel: NOTIFY_POST_MESSAGE_CHANNEL,
        token: 'tok',
        op: 'create',
        title: 1,
      },
    } as unknown as MessageEvent,
  );

  expect(ipcRenderer.send).not.toHaveBeenCalled();
});

test('handleNotificationPostMessage rejects non-plain opt', () => {
  const ipcRenderer = createMockIpcRenderer();

  handleNotificationPostMessage(
    ipcRenderer as never,
    {
      source: window,
      data: {
        channel: NOTIFY_POST_MESSAGE_CHANNEL,
        token: 'tok',
        op: 'create',
        title: 'X',
        opt: [],
      },
    } as unknown as MessageEvent,
  );

  expect(ipcRenderer.send).not.toHaveBeenCalled();
});

test('setupNotificationPostMessageBridge registers message listener', () => {
  const addListener = jest.spyOn(window, 'addEventListener');
  const ipcRenderer = createMockIpcRenderer();

  setupNotificationPostMessageBridge(ipcRenderer as never);

  expect(addListener).toHaveBeenCalledWith('message', expect.any(Function));
  addListener.mockRestore();
});
