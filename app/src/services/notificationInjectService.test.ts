const mockOnWebContentsEvent = jest.fn();
const mockExecuteJavaScript = jest.fn();

jest.mock('../adapters/windowAdapter', () => ({
  onWebContentsEvent: (...args: unknown[]): void => {
    mockOnWebContentsEvent(...args);
  },
}));

jest.mock('../helpers/loggingHelper', () => ({
  debug: jest.fn(),
}));

import { registerNotificationShimInjection } from './notificationInjectService';
import { buildNotificationShimInstallScript } from '../preload/notificationShimSource';

function createMockWindow(isLoading: boolean): {
  webContents: {
    isDestroyed: jest.Mock;
    isLoading: jest.Mock;
    executeJavaScript: jest.Mock;
  };
} {
  return {
    webContents: {
      isDestroyed: jest.fn(() => false),
      isLoading: jest.fn(() => isLoading),
      executeJavaScript: mockExecuteJavaScript,
    },
  };
}

describe('notificationInjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteJavaScript.mockResolvedValue(undefined);
  });

  test('registers dom-ready and did-finish-load listeners', () => {
    const window = createMockWindow(false);
    registerNotificationShimInjection(window as never);

    expect(mockOnWebContentsEvent).toHaveBeenCalledWith(
      window,
      'dom-ready',
      expect.any(Function),
    );
    expect(mockOnWebContentsEvent).toHaveBeenCalledWith(
      window,
      'did-finish-load',
      expect.any(Function),
    );
    expect(mockExecuteJavaScript).toHaveBeenCalledWith(
      buildNotificationShimInstallScript(),
      true,
    );
  });

  test('skips inject when webContents is destroyed', () => {
    const window = createMockWindow(false);
    window.webContents.isDestroyed.mockReturnValue(true);
    registerNotificationShimInjection(window as never);

    expect(mockExecuteJavaScript).not.toHaveBeenCalled();
  });

  test('does not inject immediately when still loading', () => {
    const window = createMockWindow(true);
    registerNotificationShimInjection(window as never);

    expect(mockOnWebContentsEvent).toHaveBeenCalled();
    expect(mockExecuteJavaScript).not.toHaveBeenCalled();
  });

  test('dom-ready listener injects shim script', () => {
    const window = createMockWindow(true);
    registerNotificationShimInjection(window as never);

    const domReadyListener = mockOnWebContentsEvent.mock.calls.find(
      (call) => call[1] === 'dom-ready',
    )?.[2] as () => void;
    domReadyListener();

    expect(mockExecuteJavaScript).toHaveBeenCalledWith(
      buildNotificationShimInstallScript(),
      true,
    );
  });
});
