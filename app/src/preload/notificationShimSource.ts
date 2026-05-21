/**
 * Page main-world Notification shim (injected via webContents.executeJavaScript).
 * Must not close over module scope in {@link installNotificationShimInPage}.
 */

import { NOTIFY_POST_MESSAGE_CHANNEL } from './notificationChannel';

export const NOTIFICATION_SHIM_INSTALLED_KEY =
  '__nativefierNotificationShimInstalled';

const NOTIFICATION_SHIM_TOKEN_KEY = '__nativefierShimToken';
const ORIGINAL_NOTIFICATION_KEY = '__nativefierOriginalNotification';

export type NativefierNotifySend = (
  op: 'create' | 'click',
  title?: string,
  opt?: NotificationOptions,
) => void;

export function wrapNotificationConstructor(
  OldNotify: typeof Notification,
  sendNotify: NativefierNotifySend,
): typeof Notification {
  const newNotify = function (
    title: string,
    opt: NotificationOptions,
  ): Notification {
    sendNotify('create', title, opt);
    const instance = new OldNotify(title, opt);
    instance.addEventListener('click', () => {
      sendNotify('click');
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
 * Runs in the page main world. Token is passed only via IIFE argument, not on `window`.
 */
export function installNotificationShimInPage(token: string): void {
  const w = window as Window &
    typeof globalThis & {
      [NOTIFICATION_SHIM_INSTALLED_KEY]?: boolean;
      [NOTIFICATION_SHIM_TOKEN_KEY]?: string;
      [ORIGINAL_NOTIFICATION_KEY]?: typeof Notification;
    };

  if (
    w[NOTIFICATION_SHIM_INSTALLED_KEY] &&
    w[NOTIFICATION_SHIM_TOKEN_KEY] === token
  ) {
    return;
  }

  const OldNotify = (w[ORIGINAL_NOTIFICATION_KEY] ??
    window.Notification) as typeof Notification;
  if (!w[ORIGINAL_NOTIFICATION_KEY]) {
    w[ORIGINAL_NOTIFICATION_KEY] = OldNotify;
  }

  const sendNotify: NativefierNotifySend = (op, title?, opt?) => {
    window.postMessage(
      {
        channel: NOTIFY_POST_MESSAGE_CHANNEL,
        token,
        op,
        title,
        opt,
      },
      '*',
    );
  };

  window.Notification = wrapNotificationConstructor(
    OldNotify,
    sendNotify,
  ) as typeof Notification;
  w[NOTIFICATION_SHIM_INSTALLED_KEY] = true;
  w[NOTIFICATION_SHIM_TOKEN_KEY] = token;
}

export function buildNotificationShimInstallScript(token: string): string {
  return `(${installNotificationShimInPage.toString()})(${JSON.stringify(token)})`;
}
