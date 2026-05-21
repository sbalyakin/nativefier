/**
 * Page main-world Notification shim (injected via webContents.executeJavaScript).
 * Must not close over module scope in {@link installNotificationShimInPage}.
 */

export const NOTIFICATION_SHIM_INSTALLED_KEY =
  '__nativefierNotificationShimInstalled';

export type NativefierNotifyBridge = {
  create(title: string, opt: NotificationOptions): void;
  click(): void;
};

export function wrapNotificationConstructor(
  OldNotify: typeof Notification,
  bridge: NativefierNotifyBridge,
): typeof Notification {
  const newNotify = function (
    title: string,
    opt: NotificationOptions,
  ): Notification {
    bridge.create(title, opt);
    const instance = new OldNotify(title, opt);
    instance.addEventListener('click', () => {
      bridge.click();
    });
    return instance;
  };
  newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
  Object.defineProperty(newNotify, 'permission', {
    get: () => OldNotify.permission,
  });
  // @ts-expect-error Constructor vs callable shim; runtime matches wrapped Notification API.
  return newNotify;
}

/**
 * Runs in the page main world. Requires {@link NativefierNotifyBridge} on `window`.
 */
export function installNotificationShimInPage(): void {
  const w = window as Window &
    typeof globalThis & {
      __nativefierNotify?: NativefierNotifyBridge;
      [NOTIFICATION_SHIM_INSTALLED_KEY]?: boolean;
    };

  if (w[NOTIFICATION_SHIM_INSTALLED_KEY]) {
    return;
  }

  const bridge = w.__nativefierNotify;
  if (!bridge) {
    return;
  }

  const OldNotify = window.Notification;
  window.Notification = wrapNotificationConstructor(
    OldNotify,
    bridge,
  ) as typeof Notification;
  w[NOTIFICATION_SHIM_INSTALLED_KEY] = true;
}

export function buildNotificationShimInstallScript(): string {
  return `(${installNotificationShimInPage})()`;
}
