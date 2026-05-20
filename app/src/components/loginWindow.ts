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
      nodeIntegration: true, // TODO work around this; insecure
      contextIsolation: false, // https://github.com/electron/electron/issues/28017
      sandbox: false, // https://www.electronjs.org/blog/electron-20-0#default-changed-renderers-without-nodeintegration-true-are-sandboxed-by-default
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
