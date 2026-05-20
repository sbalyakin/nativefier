import { Tray, BrowserWindow } from 'electron';

import { exitApp } from '../adapters/appAdapter';
import { onIpcMainEvent } from '../adapters/ipcAdapter';
import {
  buildTrayContextMenu,
  createEmptyTray,
  loadNativeImageFromPath,
} from '../adapters/trayAdapter';
import { getAppIcon, getCounterValue, isOSX } from '../helpers/helpers';
import * as log from '../helpers/loggingHelper';
import { OutputOptions } from '../runtimeContract';

export function createTrayIcon(
  nativefierOptions: OutputOptions,
  mainWindow: BrowserWindow,
): Tray | undefined {
  const options = { ...nativefierOptions };

  if (options.tray && options.tray !== 'false') {
    const iconPath = getAppIcon();
    if (!iconPath) {
      throw new Error('Icon path not found found to use with tray option.');
    }
    const nimage = loadNativeImageFromPath(iconPath);
    const appIcon = createEmptyTray();

    if (isOSX()) {
      //sets the icon to the height of the tray.
      appIcon.setImage(
        nimage.resize({ height: appIcon.getBounds().height - 2 }),
      );
    } else {
      appIcon.setImage(nimage);
    }

    const onClick = (): void => {
      log.debug('onClick');
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    };

    const contextMenu = buildTrayContextMenu([
      {
        label: options.name,
        click: onClick,
      },
      {
        label: 'Quit',
        click: (): void => exitApp(0),
      },
    ]);

    appIcon.on('click', onClick);

    if (options.counter) {
      mainWindow.on('page-title-updated', (event, title) => {
        log.debug('mainWindow.page-title-updated', { event, title });
        const counterValue = getCounterValue(title);
        if (counterValue) {
          appIcon.setToolTip(
            `(${counterValue})  ${options.name ?? 'Nativefier'}`,
          );
        } else {
          appIcon.setToolTip(options.name ?? '');
        }
      });
    } else {
      onIpcMainEvent('notification', () => {
        log.debug('ipcMain.notification');
        if (mainWindow.isFocused()) {
          return;
        }
        if (options.name) {
          appIcon.setToolTip(`•  ${options.name}`);
        }
      });

      mainWindow.on('focus', () => {
        log.debug('mainWindow.focus');
        appIcon.setToolTip(options.name ?? '');
      });
    }

    appIcon.setToolTip(options.name ?? '');
    appIcon.setContextMenu(contextMenu);

    return appIcon;
  }

  return undefined;
}
