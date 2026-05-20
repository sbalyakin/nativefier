import { EventEmitter } from 'events';

import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  HandlerDetails,
  WebContents,
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

export function getFocusedBrowserWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow();
}

export function getBrowserWindowFromWebContents(
  webContents: Parameters<typeof BrowserWindow.fromWebContents>[0],
): BrowserWindow | null {
  return BrowserWindow.fromWebContents(webContents);
}

export function onBrowserWindowEvent<T extends unknown[]>(
  window: BrowserWindow,
  event: string,
  listener: (...args: T) => void,
): void {
  (window as EventEmitter).on(event, listener as (...args: unknown[]) => void);
}

export function onceBrowserWindowEvent<T extends unknown[]>(
  window: BrowserWindow,
  event: string,
  listener: (...args: T) => void,
): void {
  (window as EventEmitter).once(
    event,
    listener as (...args: unknown[]) => void,
  );
}

export function isBrowserWindow(value: unknown): value is BrowserWindow {
  return value instanceof BrowserWindow;
}

export function isBrowserWindowVisible(window: BrowserWindow): boolean {
  return window.isVisible();
}

export function isBrowserWindowFocused(window: BrowserWindow): boolean {
  return window.isFocused();
}

export function showBrowserWindow(window: BrowserWindow): void {
  window.show();
}

export function emitBrowserWindowEvent(
  window: BrowserWindow,
  event: string,
  ...args: unknown[]
): boolean {
  return window.emit(event, ...args);
}

export function isFullScreen(window: BrowserWindow): boolean {
  return window.isFullScreen();
}

export function setFullScreen(window: BrowserWindow, flag: boolean): void {
  window.setFullScreen(flag);
}

export function moveTabToNewWindow(window: BrowserWindow): void {
  window.moveTabToNewWindow();
}

export function loadUrl(window: BrowserWindow, url: string): Promise<void> {
  return window.loadURL(url);
}

export function sendToWebContents(
  window: BrowserWindow,
  channel: string,
  ...args: unknown[]
): void {
  window.webContents.send(channel, ...args);
}

export function sendInputEventToWebContents(
  window: BrowserWindow,
  inputEvent: Parameters<BrowserWindow['webContents']['sendInputEvent']>[0],
): void {
  window.webContents.sendInputEvent(inputEvent);
}

export function getWebContentsUrl(window: BrowserWindow): string {
  return window.webContents.getURL();
}

export function goBack(window: BrowserWindow): void {
  window.webContents.goBack();
}

export function goForward(window: BrowserWindow): void {
  window.webContents.goForward();
}

export function toggleDevTools(window: BrowserWindow): void {
  window.webContents.toggleDevTools();
}

export function insertCSS(window: BrowserWindow, css: string): Promise<string> {
  return window.webContents.insertCSS(css);
}

export function insertCSSInWebContents(
  webContents: WebContents,
  css: string,
): Promise<string> {
  return webContents.insertCSS(css);
}

export function setVisualZoomLevelLimits(
  window: BrowserWindow,
  minimumLevel: number,
  maximumLevel: number,
): Promise<void> {
  return window.webContents.setVisualZoomLevelLimits(
    minimumLevel,
    maximumLevel,
  );
}

export function onWebContentsEvent<T extends unknown[]>(
  window: BrowserWindow,
  event: string,
  listener: (...args: T) => void,
): void {
  (window.webContents as EventEmitter).on(
    event,
    listener as (...args: unknown[]) => void,
  );
}

export function onWebContentsOnce<T extends unknown[]>(
  window: BrowserWindow,
  event: string,
  listener: (...args: T) => void,
): void {
  (window.webContents as EventEmitter).once(
    event,
    listener as (...args: unknown[]) => void,
  );
}

export function adjustZoomFactor(
  window: BrowserWindow,
  adjustment: number,
): void {
  window.webContents.zoomFactor = window.webContents.zoomFactor + adjustment;
}

export function setZoomFactor(window: BrowserWindow, zoomFactor: number): void {
  window.webContents.zoomFactor = zoomFactor;
}

export function closeBrowserWindow(window: BrowserWindow): void {
  window.close();
}

export function hideBrowserWindow(window: BrowserWindow): void {
  window.hide();
}

export function focusBrowserWindow(window: BrowserWindow): void {
  window.focus();
}

export function addTabbedWindow(
  window: BrowserWindow,
  tab: BrowserWindow,
): void {
  window.addTabbedWindow(tab);
}
