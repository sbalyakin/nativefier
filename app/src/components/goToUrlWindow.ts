import * as path from 'path';

import type {
  BrowserWindow,
  IpcMainInvokeEvent,
} from '../adapters/electronTypes';

import { handleIpcMainInvoke } from '../adapters/ipcAdapter';
import { createBrowserWindow } from '../adapters/windowAdapter';
import * as log from '../helpers/loggingHelper';
import { nativeTabsSupported } from '../helpers/helpers';

type GoToUrlPending = {
  settle: (url: string | undefined) => void;
  window: BrowserWindow;
};

const pendingGoToUrlDialogs = new Map<number, GoToUrlPending>();
let goToUrlHandlerRegistered = false;

function ensureGoToUrlHandler(): void {
  if (goToUrlHandlerRegistered) {
    return;
  }
  goToUrlHandlerRegistered = true;
  handleIpcMainInvoke(
    'go-to-url-message',
    (event: IpcMainInvokeEvent, url: string) => {
      const pending = pendingGoToUrlDialogs.get(event.sender.id);
      if (!pending) {
        return;
      }
      pendingGoToUrlDialogs.delete(event.sender.id);
      pending.window.close();
      pending.settle(url);
    },
  );
}

export function promptGoToUrl(
  parent: BrowserWindow,
  initialUrl?: string,
): Promise<string | undefined> {
  log.debug('promptGoToUrl', { initialUrl });
  ensureGoToUrlHandler();

  return new Promise((resolve) => {
    let settled = false;
    const settle = (url: string | undefined): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(url);
    };

    const goToUrlWindow = createBrowserWindow({
      parent: nativeTabsSupported() ? undefined : parent,
      modal: !nativeTabsSupported(),
      width: 420,
      height: 180,
      frame: false,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'goToUrlPreload.js'),
      },
    });

    const webContentsId = goToUrlWindow.webContents.id;
    pendingGoToUrlDialogs.set(webContentsId, {
      settle,
      window: goToUrlWindow,
    });

    const query = initialUrl
      ? `?url=${encodeURIComponent(initialUrl)}`
      : '';
    void goToUrlWindow.loadURL(
      `file://${path.join(__dirname, 'static/go-to-url.html')}${query}`,
    );

    goToUrlWindow.on('closed', () => {
      pendingGoToUrlDialogs.delete(webContentsId);
      settle(undefined);
    });
  });
}
