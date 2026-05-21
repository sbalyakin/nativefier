import type { BrowserWindow, Tray } from '../adapters/electronTypes';
import { exitApp } from '../adapters/appAdapter';
import {
  clearNotificationBadgeState,
  registerNotificationIpcHandlers,
} from '../services/notificationIpcService';
import {
  buildTrayContextMenu,
  createEmptyTray,
  getTrayBounds,
  loadNativeImageFromPath,
  onTrayEvent,
  resizeNativeImage,
  setTrayContextMenu,
  setTrayImage,
  setTrayToolTip,
} from '../adapters/trayAdapter';
import {
  hideBrowserWindow,
  isBrowserWindowFocused,
  isBrowserWindowVisible,
  onBrowserWindowEvent,
  showBrowserWindow,
} from '../adapters/windowAdapter';
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
      setTrayImage(
        appIcon,
        resizeNativeImage(nimage, {
          height: getTrayBounds(appIcon).height - 2,
        }),
      );
    } else {
      setTrayImage(appIcon, nimage);
    }

    const onClick = (): void => {
      log.debug('onClick');
      if (isBrowserWindowVisible(mainWindow)) {
        hideBrowserWindow(mainWindow);
      } else {
        showBrowserWindow(mainWindow);
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

    onTrayEvent(appIcon, 'click', onClick);

    if (options.counter) {
      onBrowserWindowEvent(
        mainWindow,
        'page-title-updated',
        (event, title: string) => {
          log.debug('mainWindow.page-title-updated', { event, title });
          const counterValue = getCounterValue(title);
          if (counterValue) {
            setTrayToolTip(
              appIcon,
              `(${counterValue})  ${options.name ?? 'Nativefier'}`,
            );
          } else {
            setTrayToolTip(appIcon, options.name ?? '');
          }
        },
      );
    } else {
      registerNotificationIpcHandlers({
        onCreate: () => {
          log.debug('ipcMain.nativefier-notify create (tray)');
          if (isBrowserWindowFocused(mainWindow)) {
            return;
          }
          if (options.name) {
            setTrayToolTip(appIcon, `•  ${options.name}`);
          }
        },
      });

      onBrowserWindowEvent(mainWindow, 'focus', () => {
        log.debug('mainWindow.focus');
        clearNotificationBadgeState(mainWindow.webContents.id);
        setTrayToolTip(appIcon, options.name ?? '');
      });
    }

    setTrayToolTip(appIcon, options.name ?? '');
    setTrayContextMenu(appIcon, contextMenu);

    return appIcon;
  }

  return undefined;
}
