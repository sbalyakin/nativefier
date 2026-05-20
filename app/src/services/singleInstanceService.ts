import { app, BrowserWindow } from 'electron';

import { focusMainWindow } from '../adapters/windowAdapter';
import * as log from '../helpers/loggingHelper';
import type { OutputOptions } from '../../../shared/src/options/model';

export function registerSingleInstance(
  appArgs: OutputOptions,
  getMainWindow: () => BrowserWindow | undefined,
): boolean {
  const shouldQuit = appArgs.singleInstance && !app.requestSingleInstanceLock();
  if (shouldQuit) {
    app.quit();
    return true;
  }

  app.on('second-instance', () => {
    log.debug('app.second-instance');
    const mainWindow = getMainWindow();
    if (mainWindow) {
      focusMainWindow(mainWindow);
    }
  });

  return false;
}
