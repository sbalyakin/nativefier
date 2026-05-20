import { setNotificationCallback, setupNotifications } from './notifications';

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
});

afterAll(() => {
  globalThis.Notification = originalNotification;
  globalThis.window = originalWindow;
});

test('setNotificationCallback invokes createCallback and wires click handler', () => {
  const onCreate = jest.fn();
  const onClick = jest.fn();

  setNotificationCallback(onCreate, onClick);

  const notification = new window.Notification('Hello', {
    body: 'World',
  }) as unknown as MockNotification;
  expect(onCreate).toHaveBeenCalledWith('Hello', { body: 'World' });
  expect(notification).toBeInstanceOf(MockNotification);

  notification.dispatchEvent('click');
  expect(onClick).toHaveBeenCalled();
});

test('setNotificationCallback preserves requestPermission and permission', async () => {
  setNotificationCallback(jest.fn(), jest.fn());

  await expect(window.Notification.requestPermission()).resolves.toBe(
    'granted',
  );
  MockNotification.permission = 'granted';
  expect(window.Notification.permission).toBe('granted');
});

test('setupNotifications sends IPC on create and click', () => {
  const ipcRenderer = { send: jest.fn() };

  setupNotifications(ipcRenderer as never);

  const notification = new window.Notification('Title', {
    body: 'Body',
  }) as unknown as MockNotification;
  expect(ipcRenderer.send).toHaveBeenCalledWith('notification', 'Title', {
    body: 'Body',
  });

  notification.dispatchEvent('click');
  expect(ipcRenderer.send).toHaveBeenCalledWith('notification-click');
});
