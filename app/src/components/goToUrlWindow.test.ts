import type { BrowserWindow } from '../adapters/electronTypes';

const mockHandle = jest.fn();
let mockNextWebContentsId = 1;

jest.mock('../adapters/ipcAdapter', () => ({
  handleIpcMainInvoke: (...args: unknown[]): void => mockHandle(...args),
}));

jest.mock('../adapters/windowAdapter', () => ({
  createBrowserWindow: jest.fn(() => {
    const webContentsId = mockNextWebContentsId++;
    return {
      webContents: { id: webContentsId },
      loadURL: jest.fn(() => Promise.resolve()),
      close: jest.fn(),
      on: jest.fn(),
    };
  }),
}));

jest.mock('../helpers/helpers', () => ({
  nativeTabsSupported: jest.fn(() => false),
}));

import { createBrowserWindow } from '../adapters/windowAdapter';
import { promptGoToUrl, resetGoToUrlWindowForTests } from './goToUrlWindow';

type MockGoToUrlWindow = {
  webContents: { id: number };
  loadURL: jest.Mock;
  close: jest.Mock;
  on: jest.Mock;
};

describe('promptGoToUrl', () => {
  let invokeHandler: (
    event: { sender: { id: number } },
    url: string,
  ) => void | Promise<void>;
  let cancelHandler: (
    event: { sender: { id: number } },
  ) => void | Promise<void>;
  const parent = { id: 'parent' } as unknown as BrowserWindow;
  const mockCreateBrowserWindow = createBrowserWindow as jest.MockedFunction<
    typeof createBrowserWindow
  >;

  beforeEach(() => {
    resetGoToUrlWindowForTests();
    mockNextWebContentsId = 1;
    mockHandle.mockReset();
    mockCreateBrowserWindow.mockClear();
    mockHandle.mockImplementation((channel, handler) => {
      if (channel === 'go-to-url-message') {
        invokeHandler = handler;
      }
      if (channel === 'go-to-url-cancel') {
        cancelHandler = handler;
      }
    });
  });

  test('registers ipc handlers once and routes by sender id', async () => {
    const firstPromise = promptGoToUrl(parent);
    const secondPromise = promptGoToUrl(parent);
    const firstWindow = mockCreateBrowserWindow.mock.results[0]
      .value as MockGoToUrlWindow;
    const secondWindow = mockCreateBrowserWindow.mock.results[1]
      .value as MockGoToUrlWindow;

    expect(mockHandle).toHaveBeenCalledTimes(2);

    invokeHandler(
      { sender: { id: secondWindow.webContents.id } },
      'https://second.example/',
    );
    invokeHandler(
      { sender: { id: firstWindow.webContents.id } },
      'https://first.example/',
    );

    await expect(firstPromise).resolves.toBe('https://first.example/');
    await expect(secondPromise).resolves.toBe('https://second.example/');
    expect(firstWindow.close).toHaveBeenCalledTimes(1);
    expect(secondWindow.close).toHaveBeenCalledTimes(1);
  });

  test('resolves undefined when cancel is invoked', async () => {
    const promise = promptGoToUrl(parent);
    const window = mockCreateBrowserWindow.mock.results[0]
      .value as MockGoToUrlWindow;
    const closedHandler = window.on.mock.calls.find(
      ([event]) => event === 'closed',
    )?.[1] as () => void;

    cancelHandler({ sender: { id: window.webContents.id } });
    closedHandler();

    await expect(promise).resolves.toBeUndefined();
    expect(window.close).toHaveBeenCalledTimes(1);
  });

  test('resolves undefined when dialog closes without submit', async () => {
    const promise = promptGoToUrl(parent);
    const window = mockCreateBrowserWindow.mock.results[0]
      .value as MockGoToUrlWindow;
    const closedHandler = window.on.mock.calls.find(
      ([event]) => event === 'closed',
    )?.[1] as () => void;

    closedHandler();

    await expect(promise).resolves.toBeUndefined();
  });
});
