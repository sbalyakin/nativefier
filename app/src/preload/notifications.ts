import { IpcRenderer } from 'electron';

/**
 * Patches window.Notification to:
 * - set a callback on a new Notification
 * - set a callback for clicks on notifications
 */
export function setNotificationCallback(
  createCallback: {
    (title: string, opt: NotificationOptions): void;
    (...args: unknown[]): void;
  },
  clickCallback: { (): void; (this: Notification, ev: Event): unknown },
): void {
  const OldNotify = window.Notification;
  const newNotify = function (
    title: string,
    opt: NotificationOptions,
  ): Notification {
    createCallback(title, opt);
    const instance = new OldNotify(title, opt);
    instance.addEventListener('click', clickCallback);
    return instance;
  };
  newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
  Object.defineProperty(newNotify, 'permission', {
    get: () => OldNotify.permission,
  });

  // @ts-expect-error TypeScript says its not compatible, but it works?
  window.Notification = newNotify;
}

export function setupNotifications(ipcRenderer: IpcRenderer): void {
  setNotificationCallback(
    (title, opt) => {
      ipcRenderer.send('notification', title, opt);
    },
    () => {
      ipcRenderer.send('notification-click');
    },
  );
}
