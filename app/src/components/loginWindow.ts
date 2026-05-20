import * as path from 'path';

import type { BrowserWindow } from '../adapters/electronTypes';

import { onceIpcMainEvent } from '../adapters/ipcAdapter';
import { createBrowserWindow } from '../adapters/windowAdapter';
import * as log from '../helpers/loggingHelper';
import { nativeTabsSupported } from '../helpers/helpers';

export async function createLoginWindow(
  loginCallback: (username?: string, password?: string) => void,
  parent?: BrowserWindow,
): Promise<BrowserWindow> {
  log.debug('createLoginWindow', {
    loginCallback,
    parent,
  });

  const loginWindow = createBrowserWindow({
    parent: nativeTabsSupported() ? undefined : parent,
    width: 300,
    height: 400,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'loginPreload.js'),
    },
  });
  await loginWindow.loadURL(
    `file://${path.join(__dirname, 'static/login.html')}`,
  );

  onceIpcMainEvent('login-message', (event, usernameAndPassword: string[]) => {
    log.debug('login-message', { event, username: usernameAndPassword[0] });
    loginCallback(usernameAndPassword[0], usernameAndPassword[1]);
    loginWindow.close();
  });
  return loginWindow;
}
