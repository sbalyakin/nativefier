import type { BrowserWindow, WebContents } from '../adapters/electronTypes';

import { onWebContentsEvent } from '../adapters/windowAdapter';
import { buildNotificationShimInstallScript } from '../preload/notificationShimSource';
import * as log from '../helpers/loggingHelper';
import {
  clearToken,
  getToken,
  rotateToken,
} from './notificationTokenStore';

function injectNotificationShim(
  webContents: WebContents,
  token: string,
): void {
  if (webContents.isDestroyed()) {
    return;
  }

  const script = buildNotificationShimInstallScript(token);
  webContents.executeJavaScript(script, true).catch((err: unknown) => {
    log.debug('notificationInjectService: shim inject failed', err);
  });
}

function injectWithToken(webContents: WebContents, rotate: boolean): void {
  if (webContents.isDestroyed()) {
    return;
  }

  const token = rotate
    ? rotateToken(webContents.id)
    : (getToken(webContents.id) ?? rotateToken(webContents.id));
  injectNotificationShim(webContents, token);
}

export function registerNotificationShimInjection(window: BrowserWindow): void {
  const webContents = window.webContents;

  onWebContentsEvent(window, 'did-start-navigation', () => {
    injectWithToken(webContents, true);
  });

  const runRetryInject = (): void => {
    injectWithToken(webContents, false);
  };

  onWebContentsEvent(window, 'dom-ready', runRetryInject);
  onWebContentsEvent(window, 'did-finish-load', runRetryInject);

  onWebContentsEvent(window, 'destroyed', () => {
    clearToken(webContents.id);
  });

  if (!webContents.isLoading()) {
    runRetryInject();
  }
}
