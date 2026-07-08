const mockOnIpcMainEvent = jest.fn();

jest.mock('../adapters/ipcAdapter', () => ({
  onIpcMainEvent: (...args: unknown[]): void => {
    mockOnIpcMainEvent(...args);
  },
}));

jest.mock('../helpers/loggingHelper', () => ({
  debug: jest.fn(),
}));

import { NOTIFY_IPC_CHANNEL } from '../preload/notificationChannel';
import {
  clearNotificationBadgeState,
  registerNotificationIpcHandlers,
  resetNotificationIpcServiceForTests,
} from './notificationIpcService';
import {
  resetNotificationTokensForTests,
  rotateToken,
} from './notificationTokenStore';

function getIpcListener(): (
  event: { sender: { id: number } },
  msg: unknown,
) => void {
  const call = mockOnIpcMainEvent.mock.calls.find(
    (entry) => entry[0] === NOTIFY_IPC_CHANNEL,
  );
  if (!call) {
    throw new Error('IPC listener not registered');
  }
  return call[1] as (event: { sender: { id: number } }, msg: unknown) => void;
}

describe('notificationIpcService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNotificationIpcServiceForTests();
    resetNotificationTokensForTests();
  });

  test('registerNotificationIpcHandlers installs webholm-notify listeners once', () => {
    registerNotificationIpcHandlers({ onCreate: jest.fn() });
    registerNotificationIpcHandlers({ onClick: jest.fn() });

    expect(mockOnIpcMainEvent).toHaveBeenCalledTimes(2);
    expect(mockOnIpcMainEvent).toHaveBeenCalledWith(
      NOTIFY_IPC_CHANNEL,
      expect.any(Function),
    );
  });

  test('valid create invokes onCreate and rate-limits subsequent creates', () => {
    const onCreate = jest.fn();
    registerNotificationIpcHandlers({ onCreate });

    const listener = getIpcListener();
    const webContentsId = 42;
    const token = rotateToken(webContentsId);

    listener(
      { sender: { id: webContentsId } },
      { token, op: 'create', title: 'Hi', opt: { body: 'x' } },
    );
    expect(onCreate).toHaveBeenCalledTimes(1);

    listener(
      { sender: { id: webContentsId } },
      { token, op: 'create', title: 'Again' },
    );
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  test('invalid token is ignored', () => {
    const onCreate = jest.fn();
    registerNotificationIpcHandlers({ onCreate });

    getIpcListener()(
      { sender: { id: 1 } },
      { token: 'wrong', op: 'create', title: 'X' },
    );

    expect(onCreate).not.toHaveBeenCalled();
  });

  test('click only fires after valid create', () => {
    const onClick = jest.fn();
    registerNotificationIpcHandlers({ onClick });

    const listener = getIpcListener();
    const webContentsId = 7;
    const token = rotateToken(webContentsId);

    listener({ sender: { id: webContentsId } }, { token, op: 'click' });
    expect(onClick).not.toHaveBeenCalled();

    listener(
      { sender: { id: webContentsId } },
      { token, op: 'create', title: 'T' },
    );
    listener({ sender: { id: webContentsId } }, { token, op: 'click' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('create with title longer than 1024 is ignored', () => {
    const onCreate = jest.fn();
    registerNotificationIpcHandlers({ onCreate });

    const webContentsId = 11;
    const token = rotateToken(webContentsId);
    const longTitle = 'x'.repeat(1025);

    getIpcListener()(
      { sender: { id: webContentsId } },
      { token, op: 'create', title: longTitle },
    );

    expect(onCreate).not.toHaveBeenCalled();
  });

  test('create with opt JSON larger than 8KB is ignored', () => {
    const onCreate = jest.fn();
    registerNotificationIpcHandlers({ onCreate });

    const webContentsId = 12;
    const token = rotateToken(webContentsId);
    const largeOpt = { body: 'y'.repeat(8200) };

    getIpcListener()(
      { sender: { id: webContentsId } },
      { token, op: 'create', title: 'T', opt: largeOpt },
    );

    expect(onCreate).not.toHaveBeenCalled();
  });

  test('clearNotificationBadgeState allows click after focus clear', () => {
    const onClick = jest.fn();
    registerNotificationIpcHandlers({ onClick });

    const listener = getIpcListener();
    const webContentsId = 9;
    const token = rotateToken(webContentsId);

    listener(
      { sender: { id: webContentsId } },
      { token, op: 'create', title: 'T' },
    );
    clearNotificationBadgeState(webContentsId);
    listener({ sender: { id: webContentsId } }, { token, op: 'click' });
    expect(onClick).not.toHaveBeenCalled();
  });
});
