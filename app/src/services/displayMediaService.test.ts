const mockGetDesktopCapturerSources = jest.fn();
const mockSetDisplayMediaRequestHandler = jest.fn();
const mockExecuteJavaScript = jest.fn();
const mockGetWebContentsFromFrame = jest.fn();
const mockIsWayland = jest.fn(() => false);

jest.mock('../adapters/desktopCapturerAdapter', () => ({
  getWebContentsFromFrame: (...args: unknown[]): unknown =>
    mockGetWebContentsFromFrame(...args),
  getDesktopCapturerSources: (
    ...args: unknown[]
  ): ReturnType<typeof mockGetDesktopCapturerSources> =>
    mockGetDesktopCapturerSources(...args),
}));

jest.mock('../helpers/helpers', () => ({
  isWayland: (): boolean => mockIsWayland(),
}));

jest.mock('../helpers/loggingHelper', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

import type { Session } from '../adapters/electronTypes';
import { registerDisplayMediaRequestHandler } from './displayMediaService';

async function flushAsyncWork(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

function createMockSession(): {
  setDisplayMediaRequestHandler: jest.Mock;
} {
  return {
    setDisplayMediaRequestHandler: mockSetDisplayMediaRequestHandler,
  };
}

function createMockWebContents(): {
  isDestroyed: jest.Mock;
  executeJavaScript: jest.Mock;
} {
  return {
    isDestroyed: jest.fn(() => false),
    executeJavaScript: mockExecuteJavaScript,
  };
}

describe('displayMediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWayland.mockReturnValue(false);
    mockGetWebContentsFromFrame.mockImplementation(
      (frame: { webContents: unknown }) => frame.webContents,
    );
    mockGetDesktopCapturerSources.mockResolvedValue([
      {
        id: 'screen:0:0',
        name: 'Entire screen',
        thumbnail: { toDataURL: (): string => '' },
      },
      {
        id: 'window:1:0',
        name: 'App',
        thumbnail: { toDataURL: (): string => '' },
      },
    ]);
    mockExecuteJavaScript.mockResolvedValue('window:1:0');
  });

  test('registerDisplayMediaRequestHandler installs handler once per session', () => {
    const session = createMockSession();

    registerDisplayMediaRequestHandler(session as unknown as Session);
    registerDisplayMediaRequestHandler(session as unknown as Session);

    expect(mockSetDisplayMediaRequestHandler).toHaveBeenCalledTimes(1);
  });

  test('handler grants first source on Wayland without page picker', async () => {
    mockIsWayland.mockReturnValue(true);
    const session = createMockSession();
    const callback = jest.fn();

    registerDisplayMediaRequestHandler(session as unknown as Session);
    const handler = mockSetDisplayMediaRequestHandler.mock.calls[0][0];

    await handler(
      {
        frame: { webContents: createMockWebContents() } as never,
        securityOrigin: 'https://meet.example',
        videoRequested: true,
        audioRequested: false,
        userGesture: true,
      },
      callback,
    );
    await flushAsyncWork();

    expect(mockExecuteJavaScript).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith({
      video: { id: 'screen:0:0', name: 'Entire screen' },
    });
  });

  test('handler runs page picker and grants selected source', async () => {
    const session = createMockSession();
    const callback = jest.fn();
    const webContents = createMockWebContents();

    registerDisplayMediaRequestHandler(session as unknown as Session);
    const handler = mockSetDisplayMediaRequestHandler.mock.calls[0][0];

    await handler(
      {
        frame: { webContents },
        securityOrigin: 'https://meet.example',
        videoRequested: true,
        audioRequested: false,
        userGesture: true,
      },
      callback,
    );
    await flushAsyncWork();

    expect(mockExecuteJavaScript).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({
      video: { id: 'window:1:0', name: 'App' },
    });
  });

  test('handler denies when picker is cancelled', async () => {
    mockExecuteJavaScript.mockRejectedValue(
      new Error('Screen share was cancelled by the user.'),
    );
    const session = createMockSession();
    const callback = jest.fn();
    const webContents = createMockWebContents();

    registerDisplayMediaRequestHandler(session as unknown as Session);
    const handler = mockSetDisplayMediaRequestHandler.mock.calls[0][0];

    await handler(
      {
        frame: { webContents },
        securityOrigin: 'https://meet.example',
        videoRequested: true,
        audioRequested: false,
        userGesture: true,
      },
      callback,
    );
    await flushAsyncWork();

    expect(callback).toHaveBeenCalledWith({});
  });

  test('handler denies when no capturer sources are available', async () => {
    mockGetDesktopCapturerSources.mockResolvedValue([]);
    const session = createMockSession();
    const callback = jest.fn();

    registerDisplayMediaRequestHandler(session as unknown as Session);
    const handler = mockSetDisplayMediaRequestHandler.mock.calls[0][0];

    await handler(
      {
        frame: { webContents: createMockWebContents() } as never,
        securityOrigin: 'https://meet.example',
        videoRequested: true,
        audioRequested: false,
        userGesture: true,
      },
      callback,
    );
    await flushAsyncWork();

    expect(callback).toHaveBeenCalledWith({});
    expect(mockExecuteJavaScript).not.toHaveBeenCalled();
  });

  test('handler denies when webContents is destroyed', async () => {
    const session = createMockSession();
    const callback = jest.fn();
    const webContents = createMockWebContents();
    webContents.isDestroyed.mockReturnValue(true);

    registerDisplayMediaRequestHandler(session as unknown as Session);
    const handler = mockSetDisplayMediaRequestHandler.mock.calls[0][0];

    await handler(
      {
        frame: { webContents },
        securityOrigin: 'https://meet.example',
        videoRequested: true,
        audioRequested: false,
        userGesture: true,
      },
      callback,
    );
    await flushAsyncWork();

    expect(mockExecuteJavaScript).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith({});
  });

  test('handler denies when getDesktopCapturerSources fails', async () => {
    mockGetDesktopCapturerSources.mockRejectedValue(new Error('capturer fail'));
    const session = createMockSession();
    const callback = jest.fn();

    registerDisplayMediaRequestHandler(session as unknown as Session);
    const handler = mockSetDisplayMediaRequestHandler.mock.calls[0][0];

    await handler(
      {
        frame: { webContents: createMockWebContents() } as never,
        securityOrigin: 'https://meet.example',
        videoRequested: true,
        audioRequested: false,
        userGesture: true,
      },
      callback,
    );
    await flushAsyncWork();

    expect(callback).toHaveBeenCalledWith({});
  });

  test('handler denies when frame webContents is missing', async () => {
    const session = createMockSession();
    const callback = jest.fn();

    registerDisplayMediaRequestHandler(session as unknown as Session);
    const handler = mockSetDisplayMediaRequestHandler.mock.calls[0][0];

    await handler(
      {
        frame: null,
        securityOrigin: 'https://meet.example',
        videoRequested: true,
        audioRequested: false,
        userGesture: true,
      },
      callback,
    );
    await flushAsyncWork();

    expect(mockExecuteJavaScript).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith({});
  });
});
