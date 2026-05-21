import { NOTIFY_POST_MESSAGE_CHANNEL } from './notificationChannel';
import {
  NOTIFICATION_SHIM_INSTALLED_KEY,
  buildNotificationShimInstallScript,
  installNotificationShimInPage,
  wrapNotificationConstructor,
  type NativefierNotifySend,
} from './notificationShimSource';

class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = jest
    .fn()
    .mockResolvedValue('granted' as NotificationPermission);

  title: string;
  options: NotificationOptions;
  private readonly listeners = new Map<string, EventListener>();

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options ?? {};
  }

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, listener);
  }

  dispatchEvent(type: string): void {
    const listener = this.listeners.get(type);
    if (listener) {
      listener.call(this, new Event(type));
    }
  }
}

const originalNotification = globalThis.Notification;
const originalWindow = globalThis.window;
const originalPostMessage = globalThis.window?.postMessage;

function installNotificationMock(): void {
  MockNotification.permission = 'default';
  MockNotification.requestPermission.mockClear();
  const NotificationCtor = MockNotification as unknown as typeof Notification;
  globalThis.Notification = NotificationCtor;
  globalThis.window = {
    Notification: NotificationCtor,
    postMessage: jest.fn(),
  } as unknown as Window & typeof globalThis;
}

beforeEach(() => {
  installNotificationMock();
  delete (globalThis.window as { [NOTIFICATION_SHIM_INSTALLED_KEY]?: boolean })[
    NOTIFICATION_SHIM_INSTALLED_KEY
  ];
});

afterAll(() => {
  globalThis.Notification = originalNotification;
  globalThis.window = originalWindow;
  if (originalPostMessage) {
    globalThis.window.postMessage = originalPostMessage;
  }
});

test('wrapNotificationConstructor invokes sendNotify and wires click handler', () => {
  const sendNotify = jest.fn() as jest.MockedFunction<NativefierNotifySend>;

  const Wrapped = wrapNotificationConstructor(
    window.Notification,
    sendNotify,
  ) as unknown as typeof MockNotification;
  window.Notification = Wrapped as unknown as typeof Notification;

  const notification = new window.Notification('Hello', {
    body: 'World',
  }) as unknown as MockNotification;
  expect(sendNotify).toHaveBeenCalledWith('create', 'Hello', { body: 'World' });
  expect(notification).toBeInstanceOf(MockNotification);

  notification.dispatchEvent('click');
  expect(sendNotify).toHaveBeenCalledWith('click');
});

test('wrapNotificationConstructor preserves requestPermission and permission', async () => {
  const sendNotify = jest.fn() as NativefierNotifySend;
  window.Notification = wrapNotificationConstructor(
    window.Notification,
    sendNotify,
  ) as typeof Notification;

  await expect(window.Notification.requestPermission()).resolves.toBe(
    'granted',
  );
  MockNotification.permission = 'granted';
  expect(window.Notification.permission).toBe('granted');
});

test('installNotificationShimInPage posts create and click via postMessage', () => {
  installNotificationShimInPage('tok-a');

  const notification = new window.Notification('Title', {
    body: 'Body',
  }) as unknown as MockNotification;

  expect(window.postMessage).toHaveBeenCalledWith(
    {
      channel: NOTIFY_POST_MESSAGE_CHANNEL,
      token: 'tok-a',
      op: 'create',
      title: 'Title',
      opt: { body: 'Body' },
    },
    '*',
  );

  notification.dispatchEvent('click');
  expect(window.postMessage).toHaveBeenCalledWith(
    {
      channel: NOTIFY_POST_MESSAGE_CHANNEL,
      token: 'tok-a',
      op: 'click',
    },
    '*',
  );
});

test('installNotificationShimInPage re-wraps when token changes', () => {
  installNotificationShimInPage('tok-a');
  const firstWrapped = window.Notification;

  installNotificationShimInPage('tok-b');
  expect(window.Notification).not.toBe(firstWrapped);

  (window.postMessage as jest.Mock).mockClear();
  new window.Notification('After', {});
  expect(window.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({ token: 'tok-b', op: 'create' }),
    '*',
  );
});

test('installNotificationShimInPage is idempotent for same token', () => {
  installNotificationShimInPage('tok-a');
  const firstWrapped = window.Notification;

  installNotificationShimInPage('tok-a');
  expect(window.Notification).toBe(firstWrapped);
});

test('buildNotificationShimInstallScript embeds token in IIFE', () => {
  expect(buildNotificationShimInstallScript('my-token')).toBe(
    `(${installNotificationShimInPage.toString()})("my-token")`,
  );
});
