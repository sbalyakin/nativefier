import type { BrowserWindow } from '../adapters/electronTypes';

import {
  onAppEvent,
  quitApp,
  requestSingleInstanceLock,
} from '../adapters/appAdapter';
import { focusMainWindow } from '../adapters/windowAdapter';
import { extractHttpUrlFromArgv } from '../config/loadRuntimeConfig';
import * as log from '../helpers/loggingHelper';
import type { OutputOptions } from '../../../shared/src/options/model';

export function registerSingleInstance(
  appArgs: OutputOptions,
  getMainWindow: () => BrowserWindow | undefined,
  onDeepLinkUrl?: (url: string) => void,
): boolean {
  const shouldQuit = appArgs.singleInstance && !requestSingleInstanceLock();
  if (shouldQuit) {
    quitApp();
    return true;
  }

  onAppEvent('second-instance', (_event, commandLine: string[]) => {
    log.debug('app.second-instance', { commandLine });
    const mainWindow = getMainWindow();
    if (mainWindow) {
      focusMainWindow(mainWindow);
    }

    const url = extractHttpUrlFromArgv(commandLine);
    if (url && onDeepLinkUrl) {
      onDeepLinkUrl(url);
    }
  });

  return false;
}
