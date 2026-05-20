import type { BrowserWindow, WebContents } from 'electron';

import { onWebContentsEvent } from '../adapters/windowAdapter';
import { buildNotificationShimInstallScript } from '../preload/notificationShimSource';
import * as log from '../helpers/loggingHelper';

function injectNotificationShim(webContents: WebContents): void {
  if (webContents.isDestroyed()) {
    return;
  }

  const script = buildNotificationShimInstallScript();
  webContents
    .executeJavaScript(script, true)
    .catch((err: unknown) => {
      log.debug('notificationInjectService: shim inject failed', err);
    });
}

export function registerNotificationShimInjection(
  window: BrowserWindow,
): void {
  const runInject = (): void => {
    injectNotificationShim(window.webContents);
  };

  // Shim is idempotent; dom-ready + did-finish-load retry if inject failed early.
  // Site Notification before dom-ready still skips badge IPC until stage 5 (earlier inject).
  onWebContentsEvent(window, 'dom-ready', runInject);
  onWebContentsEvent(window, 'did-finish-load', runInject);

  if (!window.webContents.isLoading()) {
    runInject();
  }
}
