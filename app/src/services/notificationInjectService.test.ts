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

jest.mock('./notificationTokenStore', () => ({
  rotateToken: jest.fn(() => 'rotated-token'),
  getToken: jest.fn(() => 'existing-token'),
  clearToken: jest.fn(),
}));

import { registerNotificationShimInjection } from './notificationInjectService';
import { buildNotificationShimInstallScript } from '../preload/notificationShimSource';
import { clearToken, getToken, rotateToken } from './notificationTokenStore';

function createMockWindow(isLoading: boolean): {
  webContents: {
    id: number;
    isDestroyed: jest.Mock;
    isLoading: jest.Mock;
    executeJavaScript: jest.Mock;
  };
} {
  return {
    webContents: {
      id: 99,
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
    (rotateToken as jest.Mock).mockReturnValue('rotated-token');
    (getToken as jest.Mock).mockReturnValue('existing-token');
  });

  test('registers did-start-navigation, dom-ready, did-finish-load, and destroyed', () => {
    const window = createMockWindow(false);
    registerNotificationShimInjection(window as never);

    expect(mockOnWebContentsEvent).toHaveBeenCalledWith(
      window,
      'did-start-navigation',
      expect.any(Function),
    );
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
    expect(mockOnWebContentsEvent).toHaveBeenCalledWith(
      window,
      'destroyed',
      expect.any(Function),
    );
  });

  test('did-start-navigation rotates token and injects script', () => {
    const window = createMockWindow(true);
    registerNotificationShimInjection(window as never);

    const navListener = mockOnWebContentsEvent.mock.calls.find(
      (call) => call[1] === 'did-start-navigation',
    )?.[2] as () => void;
    navListener();

    expect(rotateToken).toHaveBeenCalledWith(99);
    expect(mockExecuteJavaScript).toHaveBeenCalledWith(
      buildNotificationShimInstallScript('rotated-token'),
      true,
    );
  });

  test('dom-ready retry uses existing token without rotation', () => {
    const window = createMockWindow(true);
    registerNotificationShimInjection(window as never);

    const domReadyListener = mockOnWebContentsEvent.mock.calls.find(
      (call) => call[1] === 'dom-ready',
    )?.[2] as () => void;
    domReadyListener();

    expect(rotateToken).not.toHaveBeenCalled();
    expect(mockExecuteJavaScript).toHaveBeenCalledWith(
      buildNotificationShimInstallScript('existing-token'),
      true,
    );
  });

  test('did-finish-load retry uses existing token without rotation', () => {
    const window = createMockWindow(true);
    registerNotificationShimInjection(window as never);

    const finishLoadListener = mockOnWebContentsEvent.mock.calls.find(
      (call) => call[1] === 'did-finish-load',
    )?.[2] as () => void;
    finishLoadListener();

    expect(rotateToken).not.toHaveBeenCalled();
    expect(mockExecuteJavaScript).toHaveBeenCalledWith(
      buildNotificationShimInstallScript('existing-token'),
      true,
    );
  });

  test('destroyed clears token for webContents', () => {
    const window = createMockWindow(false);
    registerNotificationShimInjection(window as never);

    const destroyedListener = mockOnWebContentsEvent.mock.calls.find(
      (call) => call[1] === 'destroyed',
    )?.[2] as () => void;
    destroyedListener();

    expect(clearToken).toHaveBeenCalledWith(99);
  });

  test('skips inject when webContents is destroyed', () => {
    const window = createMockWindow(false);
    window.webContents.isDestroyed.mockReturnValue(true);
    registerNotificationShimInjection(window as never);

    expect(mockExecuteJavaScript).not.toHaveBeenCalled();
  });
});
