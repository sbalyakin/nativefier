const mockClearCache = jest.fn(() => Promise.resolve());
const mockClearStorageData = jest.fn(() => Promise.resolve());
const mockSetProxy = jest.fn(() => Promise.resolve());
const mockSetPermissionCheckHandler = jest.fn();
const mockSetPermissionRequestHandler = jest.fn();

jest.mock('electron', () => ({
  Session: jest.fn(),
}));

import {
  clearSessionData,
  getSessionProperty,
  invokeSessionMethod,
  normalizeSessionFuncArgs,
  setDefaultPermissionHandlers,
  setSessionProperty,
  setSessionProxy,
} from './sessionAdapter';

function createMockSession(): {
  clearCache: jest.Mock;
  clearStorageData: jest.Mock;
  setProxy: jest.Mock;
  setPermissionCheckHandler: jest.Mock;
  setPermissionRequestHandler: jest.Mock;
  getFoo: jest.Mock;
  bar: string;
} {
  return {
    clearCache: mockClearCache,
    clearStorageData: mockClearStorageData,
    setProxy: mockSetProxy,
    setPermissionCheckHandler: mockSetPermissionCheckHandler,
    setPermissionRequestHandler: mockSetPermissionRequestHandler,
    getFoo: jest.fn(() => 'foo-value'),
    bar: 'bar-value',
  };
}

describe('sessionAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('setDefaultPermissionHandlers registers allow-all handlers', () => {
    const session = createMockSession();
    setDefaultPermissionHandlers(
      session as unknown as import('electron').Session,
    );

    expect(mockSetPermissionCheckHandler).toHaveBeenCalledTimes(1);
    expect(mockSetPermissionRequestHandler).toHaveBeenCalledTimes(1);

    const checkHandler = mockSetPermissionCheckHandler.mock.calls[0][0];
    expect(checkHandler()).toBe(true);

    const requestCallback = jest.fn();
    const requestHandler = mockSetPermissionRequestHandler.mock.calls[0][0];
    requestHandler({}, 'media', requestCallback);
    expect(requestCallback).toHaveBeenCalledWith(true);
  });

  it('clearSessionData clears storage then cache', async () => {
    const session = createMockSession();
    await clearSessionData(session as unknown as import('electron').Session);

    expect(mockClearStorageData).toHaveBeenCalled();
    expect(mockClearCache).toHaveBeenCalled();
    expect(mockClearStorageData.mock.invocationCallOrder[0]).toBeLessThan(
      mockClearCache.mock.invocationCallOrder[0],
    );
  });

  it('setSessionProxy forwards proxy rules', async () => {
    const session = createMockSession();
    await setSessionProxy(
      session as unknown as import('electron').Session,
      'http=proxy:8080',
    );

    expect(mockSetProxy).toHaveBeenCalledWith({
      proxyRules: 'http=proxy:8080',
      pacScript: '',
      proxyBypassRules: '',
    });
  });

  it('normalizeSessionFuncArgs matches legacy session-interaction spread rules', () => {
    expect(normalizeSessionFuncArgs(undefined)).toEqual([]);
    expect(normalizeSessionFuncArgs(null)).toEqual([]);
    expect(normalizeSessionFuncArgs(['a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeSessionFuncArgs(42)).toEqual([42]);
    // Bare string is iterable: legacy `...funcArgs` passes one char per arg.
    expect(normalizeSessionFuncArgs('solo')).toEqual(['s', 'o', 'l', 'o']);
  });

  it('invokeSessionMethod, setSessionProperty, and getSessionProperty use dynamic access', () => {
    const session = createMockSession();

    expect(
      invokeSessionMethod(
        session as unknown as import('electron').Session,
        'getFoo',
        ['arg1'],
      ),
    ).toBe('foo-value');
    expect(session.getFoo).toHaveBeenCalledWith('arg1');

    setSessionProperty(
      session as unknown as import('electron').Session,
      'bar',
      'new-bar',
    );
    expect(session.bar).toBe('new-bar');

    expect(
      getSessionProperty(
        session as unknown as import('electron').Session,
        'bar',
      ),
    ).toBe('new-bar');
  });
});
