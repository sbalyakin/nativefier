import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  HandlerDetails,
} from 'electron';
import windowStateKeeper from 'electron-window-state';

export type WindowState = ReturnType<typeof windowStateKeeper>;

export type WindowStateKeeperOptions = Parameters<typeof windowStateKeeper>[0];

export function createWindowState(
  options: WindowStateKeeperOptions,
): WindowState {
  return windowStateKeeper(options);
}

export function createBrowserWindow(
  options: BrowserWindowConstructorOptions,
): BrowserWindow {
  return new BrowserWindow(options);
}

export function setWindowOpenHandler(
  window: BrowserWindow,
  handler: (
    details: HandlerDetails,
  ) => ReturnType<
    Parameters<BrowserWindow['webContents']['setWindowOpenHandler']>[0]
  >,
): void {
  window.webContents.setWindowOpenHandler(handler);
}

export function focusMainWindow(window: BrowserWindow): void {
  if (!window.isVisible()) {
    window.show();
  }
  if (window.isMinimized()) {
    window.restore();
  }
  window.focus();
}
