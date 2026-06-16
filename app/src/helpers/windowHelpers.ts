import path from 'path';

import type {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  Event,
  MessageBoxReturnValue,
  OnResponseStartedListenerDetails,
  WebPreferences,
} from '../adapters/electronTypes';
import { showMessageBox } from '../adapters/dialogAdapter';
import {
  clearSessionData,
  getBrowserWindowSession,
  onSessionWebRequestResponseStarted,
  setSessionProxy,
} from '../adapters/sessionAdapter';
import {
  addTabbedWindow,
  adjustZoomFactor,
  closeBrowserWindow,
  createBrowserWindow,
  focusBrowserWindow,
  getFocusedBrowserWindow,
  getWebContentsUrl,
  goBack as navigateBack,
  goForward as navigateForward,
  hideBrowserWindow,
  insertCSS,
  insertCSSInWebContents,
  loadUrl,
  onWebContentsEvent,
  onWebContentsOnce,
  sendToWebContents,
  setVisualZoomLevelLimits,
  setZoomFactor,
  showBrowserWindow,
} from '../adapters/windowAdapter';
import {
  getCSSToInject,
  isOSX,
  isUrlShellSafe,
  nativeTabsSupported,
} from './helpers';
import { normalizeUrl } from '../../../shared/lib/src/options/normalizeUrl';
import { promptGoToUrl } from '../components/goToUrlWindow';
import * as log from './loggingHelper';
import { serializeRendererParams } from '../config/runtimeSecrets';
import type { TrayValue, WindowOptions } from '../runtimeContract';
import { randomUUID } from 'crypto';

const ZOOM_INTERVAL = 0.1;

export function adjustWindowZoom(adjustment: number): void {
  withFocusedWindow((focusedWindow) => {
    adjustZoomFactor(focusedWindow, adjustment);
  });
}

export function showNavigationBlockedMessage(
  message: string,
  parent?: BrowserWindow,
): Promise<MessageBoxReturnValue> {
  return new Promise((resolve, reject) => {
    const showInWindow = (window: BrowserWindow): void => {
      showMessageBox(window, {
        message,
        type: 'error',
        title: 'Navigation blocked',
      })
        .then((result) => resolve(result))
        .catch((err) => {
          reject(err);
        });
    };

    if (parent) {
      showInWindow(parent);
      return;
    }

    withFocusedWindow(showInWindow);
  });
}

export async function clearAppData(window: BrowserWindow): Promise<void> {
  const response = await showMessageBox(window, {
    type: 'warning',
    buttons: ['Yes', 'Cancel'],
    defaultId: 1,
    title: 'Clear cache confirmation',
    message:
      'This will clear all data (cookies, local storage etc) from this app. Are you sure you wish to proceed?',
  });

  if (response.response !== 0) {
    return;
  }
  await clearCache(window);
}

export async function clearCache(window: BrowserWindow): Promise<void> {
  await clearSessionData(getBrowserWindowSession(window));
}

export function createAboutBlankWindow(
  options: WindowOptions,
  setupWindow: (options: WindowOptions, window: BrowserWindow) => void,
  parent?: BrowserWindow,
): BrowserWindow {
  const window = createNewWindow(
    { ...options, show: false },
    setupWindow,
    'about:blank',
    nativeTabsSupported() ? undefined : parent,
  );
  onWebContentsOnce(window, 'did-stop-loading', () => {
    if (getWebContentsUrl(window) === 'about:blank') {
      closeBrowserWindow(window);
    } else {
      showBrowserWindow(window);
    }
  });
  return window;
}

export function createNewTab(
  options: WindowOptions,
  setupWindow: (options: WindowOptions, window: BrowserWindow) => void,
  url: string,
  foreground: boolean,
): BrowserWindow | undefined {
  const focusedWindow = getFocusedBrowserWindow();
  log.debug('createNewTab', {
    url,
    foreground,
    focusedWindow,
  });
  return withFocusedWindow((focusedWindow) => {
    const newTab = createNewWindow(options, setupWindow, url);
    log.debug('createNewTab.withFocusedWindow', { focusedWindow, newTab });
    addTabbedWindow(focusedWindow, newTab);
    if (!foreground) {
      focusBrowserWindow(focusedWindow);
    }
    return newTab;
  });
}

export function createNewWindow(
  options: WindowOptions,
  setupWindow: (options: WindowOptions, window: BrowserWindow) => void,
  url: string,
  parent?: BrowserWindow,
): BrowserWindow {
  log.debug('createNewWindow', {
    url,
    parent,
  });
  const window = createBrowserWindow({
    parent: nativeTabsSupported() ? undefined : parent,
    ...getDefaultWindowOptions(options),
  });
  setupWindow(options, window);
  loadUrl(window, url).catch((err) => log.error('window.loadURL ERROR', err));
  return window;
}

export function getCurrentURL(): string {
  return withFocusedWindow((focusedWindow) =>
    getWebContentsUrl(focusedWindow),
  ) as unknown as string;
}

export function getDefaultWindowOptions(
  options: WindowOptions,
): BrowserWindowConstructorOptions {
  const browserwindowOptions: BrowserWindowConstructorOptions = {
    ...options.browserwindowOptions,
  };
  // We're going to remove this and merge it separately into DEFAULT_WINDOW_OPTIONS.webPreferences
  // Otherwise the browserwindowOptions.webPreferences object will completely replace the
  // webPreferences specified in the DEFAULT_WINDOW_OPTIONS with itself
  delete browserwindowOptions.webPreferences;

  const webPreferences: WebPreferences = {
    ...(options.browserwindowOptions?.webPreferences ?? {}),
  };

  const defaultOptions: BrowserWindowConstructorOptions = {
    autoHideMenuBar: options.autoHideMenuBar,
    fullscreenable: true,
    tabbingIdentifier: nativeTabsSupported()
      ? (options.tabbingIdentifier ?? randomUUID())
      : undefined,
    title: options.name,
    webPreferences: {
      javascript: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      plugins: true,
      sandbox: !options.flashPluginDir,
      webSecurity: !options.insecure,
      zoomFactor: options.zoom,
      ...webPreferences,
    },
    ...browserwindowOptions,
  };

  log.debug('getDefaultWindowOptions', {
    options,
    webPreferences,
    defaultOptions,
  });

  return defaultOptions;
}

export function goBack(): void {
  log.debug('onGoBack');
  withFocusedWindow((focusedWindow) => {
    navigateBack(focusedWindow);
  });
}

export function goForward(): void {
  log.debug('onGoForward');
  withFocusedWindow((focusedWindow) => {
    navigateForward(focusedWindow);
  });
}

export function goToURL(url: string): Promise<void> | undefined {
  return withFocusedWindow((focusedWindow) => loadUrl(focusedWindow, url));
}

export async function promptAndNavigateToUrl(
  parent: BrowserWindow,
  initialUrl?: string,
): Promise<void> {
  const url = await promptGoToUrl(parent, initialUrl);
  if (!url) {
    return;
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeUrl(url);
  } catch (err: unknown) {
    log.error('normalizeUrl ERROR', err);
    await showNavigationBlockedMessage(`URL "${url}" is invalid.`, parent);
    return;
  }

  const urlShellSafety = isUrlShellSafe(normalizedUrl);
  if (urlShellSafety.blocked) {
    await showNavigationBlockedMessage(
      `Navigation blocked to ${normalizedUrl}\n\n${urlShellSafety.reason}`,
      parent,
    );
    return;
  }

  await loadUrl(parent, normalizedUrl);
}

export function hideWindow(
  window: BrowserWindow,
  event: Event,
  fastQuit: boolean,
  tray: TrayValue,
): void {
  if (isOSX() && !fastQuit) {
    // this is called when exiting from clicking the cross button on the window
    event.preventDefault();
    hideBrowserWindow(window);
  } else if (!fastQuit && tray !== 'false') {
    event.preventDefault();
    hideBrowserWindow(window);
  }
  // will close the window on other platforms
}

export function injectCSS(browserWindow: BrowserWindow): void {
  const cssToInject = getCSSToInject();

  if (!cssToInject) {
    return;
  }

  onWebContentsEvent(browserWindow, 'did-navigate', () => {
    log.debug(
      'browserWindow.webContents.did-navigate',
      getWebContentsUrl(browserWindow),
    );

    insertCSS(browserWindow, cssToInject).catch((err: unknown) =>
      log.error('browserWindow.webContents.insertCSS', err),
    );

    // We must inject css early enough; so onResponseStarted is a good place.
    onSessionWebRequestResponseStarted(
      getBrowserWindowSession(browserWindow),
      { urls: [] }, // Pass an empty filter list; null will not match _any_ urls
      (details: OnResponseStartedListenerDetails): void => {
        log.debug('onResponseStarted', {
          resourceType: details.resourceType,
          url: details.url,
        });
        injectCSSIntoResponse(details, cssToInject).catch((err: unknown) => {
          log.error('injectCSSIntoResponse ERROR', err);
        });
      },
    );
  });
}

function injectCSSIntoResponse(
  details: OnResponseStartedListenerDetails,
  cssToInject: string,
): Promise<string | undefined> {
  const contentType =
    details.responseHeaders && 'content-type' in details.responseHeaders
      ? details.responseHeaders['content-type'][0]
      : undefined;

  log.debug('injectCSSIntoResponse', { details, cssToInject, contentType });

  // We go with a denylist rather than a whitelist (e.g. only text/html)
  // to avoid "whoops I didn't think this should have been CSS-injected" cases
  const nonInjectableContentTypes = [
    /application\/.*/,
    /font\/.*/,
    /image\/.*/,
  ];
  const nonInjectableResourceTypes = ['image', 'script', 'stylesheet', 'xhr'];

  if (
    (contentType &&
      nonInjectableContentTypes.filter((x) => {
        const matches = x.exec(contentType);
        return matches && matches?.length > 0;
      })?.length > 0) ||
    nonInjectableResourceTypes.includes(details.resourceType) ||
    !details.webContents
  ) {
    log.debug(
      `Skipping CSS injection for:\n${details.url}\nwith resourceType ${
        details.resourceType
      } and content-type ${contentType as string}`,
    );
    return Promise.resolve(undefined);
  }

  log.debug(
    `Injecting CSS for:\n${details.url}\nwith resourceType ${
      details.resourceType
    } and content-type ${contentType as string}`,
  );
  return insertCSSInWebContents(details.webContents, cssToInject);
}

export function sendParamsOnDidFinishLoad(
  options: WindowOptions,
  window: BrowserWindow,
): void {
  onWebContentsEvent(window, 'did-finish-load', () => {
    log.debug(
      'sendParamsOnDidFinishLoad.window.webContents.did-finish-load',
      getWebContentsUrl(window),
    );
    // In children windows too: Restore pinch-to-zoom, disabled by default in recent Electron.
    // See https://github.com/nativefier/nativefier/issues/379#issuecomment-598612128
    // and https://github.com/electron/electron/pull/12679
    setVisualZoomLevelLimits(window, 1, 3).catch((err) =>
      log.error('webContents.setVisualZoomLevelLimits', err),
    );

    sendToWebContents(window, 'params', serializeRendererParams(options));
  });
}

export function setProxyRules(
  window: BrowserWindow,
  proxyRules?: string,
): void {
  setSessionProxy(getBrowserWindowSession(window), proxyRules).catch((err) =>
    log.error('session.setProxy ERROR', err),
  );
}

export function withFocusedWindow<T>(
  block: (window: BrowserWindow) => T,
): T | undefined {
  const focusedWindow = getFocusedBrowserWindow();
  if (focusedWindow) {
    return block(focusedWindow);
  }

  return undefined;
}

export function zoomOut(): void {
  log.debug('zoomOut');
  adjustWindowZoom(-ZOOM_INTERVAL);
}

export function zoomReset(options: { zoom?: number }): void {
  log.debug('zoomReset');
  withFocusedWindow((focusedWindow) => {
    setZoomFactor(focusedWindow, options.zoom ?? 1.0);
  });
}

export function zoomIn(): void {
  log.debug('zoomIn');
  adjustWindowZoom(ZOOM_INTERVAL);
}
