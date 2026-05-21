import {
  NOTIFICATION_SHIM_INSTALLED_KEY,
  buildNotificationShimInstallScript,
  installNotificationShimInPage,
  wrapNotificationConstructor,
  type NativefierNotifyBridge,
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

function installNotificationMock(): void {
  MockNotification.permission = 'default';
  MockNotification.requestPermission.mockClear();
  const NotificationCtor = MockNotification as unknown as typeof Notification;
  globalThis.Notification = NotificationCtor;
  globalThis.window = { Notification: NotificationCtor } as Window &
    typeof globalThis;
}

beforeEach(() => {
  installNotificationMock();
  delete (globalThis.window as { [NOTIFICATION_SHIM_INSTALLED_KEY]?: boolean })[
    NOTIFICATION_SHIM_INSTALLED_KEY
  ];
  delete (globalThis.window as { __nativefierNotify?: NativefierNotifyBridge })
    .__nativefierNotify;
});

afterAll(() => {
  globalThis.Notification = originalNotification;
  globalThis.window = originalWindow;
});

test('wrapNotificationConstructor invokes bridge and wires click handler', () => {
  const create = jest.fn();
  const click = jest.fn();
  const bridge: NativefierNotifyBridge = { create, click };

  const Wrapped = wrapNotificationConstructor(
    window.Notification,
    bridge,
  ) as unknown as typeof MockNotification;
  window.Notification = Wrapped as unknown as typeof Notification;

  const notification = new window.Notification('Hello', {
    body: 'World',
  }) as unknown as MockNotification;
  expect(create).toHaveBeenCalledWith('Hello', { body: 'World' });
  expect(notification).toBeInstanceOf(MockNotification);

  notification.dispatchEvent('click');
  expect(click).toHaveBeenCalled();
});

test('wrapNotificationConstructor preserves requestPermission and permission', async () => {
  const bridge: NativefierNotifyBridge = {
    create: jest.fn(),
    click: jest.fn(),
  };
  window.Notification = wrapNotificationConstructor(
    window.Notification,
    bridge,
  ) as typeof Notification;

  await expect(window.Notification.requestPermission()).resolves.toBe(
    'granted',
  );
  MockNotification.permission = 'granted';
  expect(window.Notification.permission).toBe('granted');
});

test('installNotificationShimInPage is idempotent and requires bridge', () => {
  const create = jest.fn();
  const click = jest.fn();
  const bridge: NativefierNotifyBridge = { create, click };
  (
    globalThis.window as Window & {
      __nativefierNotify?: NativefierNotifyBridge;
    }
  ).__nativefierNotify = bridge;

  installNotificationShimInPage();
  const firstReplacement = window.Notification;

  installNotificationShimInPage();
  expect(window.Notification).toBe(firstReplacement);

  const notification = new window.Notification('Title', {
    body: 'Body',
  }) as unknown as MockNotification;
  expect(create).toHaveBeenCalledWith('Title', { body: 'Body' });

  notification.dispatchEvent('click');
  expect(click).toHaveBeenCalled();
});

test('installNotificationShimInPage skips when bridge missing', () => {
  const before = window.Notification;
  installNotificationShimInPage();
  expect(window.Notification).toBe(before);
});

test('buildNotificationShimInstallScript wraps installer IIFE', () => {
  expect(buildNotificationShimInstallScript()).toBe(
    `(${installNotificationShimInPage.toString()})()`,
  );
});
