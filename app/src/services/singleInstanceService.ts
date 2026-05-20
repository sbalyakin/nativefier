import type { BrowserWindow } from '../adapters/electronTypes';

import {
  onAppEvent,
  quitApp,
  requestSingleInstanceLock,
} from '../adapters/appAdapter';
import { focusMainWindow } from '../adapters/windowAdapter';
import * as log from '../helpers/loggingHelper';
import type { OutputOptions } from '../../../shared/src/options/model';

export function registerSingleInstance(
  appArgs: OutputOptions,
  getMainWindow: () => BrowserWindow | undefined,
): boolean {
  const shouldQuit = appArgs.singleInstance && !requestSingleInstanceLock();
  if (shouldQuit) {
    quitApp();
    return true;
  }

  onAppEvent('second-instance', () => {
    log.debug('app.second-instance');
    const mainWindow = getMainWindow();
    if (mainWindow) {
      focusMainWindow(mainWindow);
    }
  });

  return false;
}
