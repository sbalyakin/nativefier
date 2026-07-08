import type {
  BrowserWindow,
  Event,
  HandlerDetails,
} from '../adapters/electronTypes';
import {
  getBrowserWindowSession,
  getSessionProperty,
  invokeSessionMethod,
  normalizeSessionFuncArgs,
  setDefaultPermissionHandlers,
  setSessionProperty,
} from '../adapters/sessionAdapter';
import {
  createBrowserWindow,
  createWindowState,
  isFullScreen,
  loadUrl,
  moveTabToNewWindow,
  onBrowserWindowEvent,
  onceBrowserWindowEvent,
  setFullScreen,
  setWindowOpenHandler,
  showBrowserWindow,
} from '../adapters/windowAdapter';
import { onIpcMainEvent } from '../adapters/ipcAdapter';
import {
  clearNotificationBadgeState,
  registerNotificationIpcHandlers,
} from '../services/notificationIpcService';
import { persistRuntimeConfig } from '../config/persistRuntimeConfig';
import { initContextMenu } from './contextMenu';
import { createMenu } from './menu';
import {
  getAppIcon,
  getCounterValue,
  isOSX,
  nativeTabsSupported,
} from '../helpers/helpers';
import * as log from '../helpers/loggingHelper';
import { IS_PLAYWRIGHT } from '../helpers/playwrightHelpers';
import { onNewWindow, setupNativefierWindow } from '../helpers/windowEvents';
import {
  clearCache,
  createNewTab,
  getDefaultWindowOptions,
  hideWindow,
} from '../helpers/windowHelpers';
import {
  OutputOptions,
  outputOptionsToWindowOptions,
} from '../runtimeContract';

type SessionInteractionRequest = {
  id?: string;
  func?: string;
  funcArgs?: unknown[];
  property?: string;
  propertyValue?: unknown;
};

type SessionInteractionResult<T = unknown> = {
  id?: string;
  value?: T | Promise<T>;
  error?: Error;
};

/**
 * @param {{}} nativefierOptions AppArgs from nativefier.json
 * @param {function} setDockBadge
 */
export async function createMainWindow(
  nativefierOptions: OutputOptions,
  setDockBadge: (value: number | string, bounce?: boolean) => void,
): Promise<BrowserWindow> {
  const options = { ...nativefierOptions };

  const mainWindowState = createWindowState({
    defaultWidth: options.width || 1280,
    defaultHeight: options.height || 800,
  });

  const mainWindow = createBrowserWindow({
    frame: !options.hideWindowFrame,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: options.minWidth,
    minHeight: options.minHeight,
    maxWidth: options.maxWidth,
    maxHeight: options.maxHeight,
    x: options.x,
    y: options.y,
    autoHideMenuBar: !options.showMenuBar,
    icon: getAppIcon(),
    fullscreen: options.fullScreen,
    // Whether the window should always stay on top of other windows. Default is false.
    alwaysOnTop: options.alwaysOnTop,
    titleBarStyle: options.titleBarStyle ?? 'default',
    // Maximize window visual glitch on Windows fix
    // We want a consistent behavior on all OSes, but Windows needs help to not glitch.
    // So, we manually mainWindow.show() later, see a few lines below
    show: options.tray !== 'start-in-tray' && process.platform !== 'win32',
    backgroundColor: options.backgroundColor,
    ...getDefaultWindowOptions(
      outputOptionsToWindowOptions(options, nativeTabsSupported()),
    ),
  });

  // Just load about:blank to start, gives playwright something to latch onto initially for testing.
  if (IS_PLAYWRIGHT) {
    await loadUrl(mainWindow, 'about:blank');
  }

  mainWindowState.manage(mainWindow);

  // after first run, no longer force maximize to be true
  if (options.maximize) {
    mainWindow.maximize();
    options.maximize = undefined;
    persistRuntimeConfig(options);
  }

  if (options.tray === 'start-in-tray') {
    mainWindow.hide();
  } else if (process.platform === 'win32') {
    // See other "Maximize window visual glitch on Windows fix" comment above.
    showBrowserWindow(mainWindow);
  }

  const windowOptions = outputOptionsToWindowOptions(
    options,
    nativeTabsSupported(),
  );
  createMenu(options, mainWindow, (pinned) => {
    options.alwaysOnTop = pinned;
    persistRuntimeConfig(options);
  });
  createContextMenu(options, mainWindow);
  setupNativefierWindow(windowOptions, mainWindow);

  // Note it is important to add these handlers only to the *main* window,
  // else we run into weird behavior like opening tabs twice
  setWindowOpenHandler(mainWindow, (details: HandlerDetails) => {
    return onNewWindow(
      windowOptions,
      setupNativefierWindow,
      details,
      mainWindow,
    );
  });
  onBrowserWindowEvent(
    mainWindow,
    'new-window-for-tab',
    (event?: Event<{ url?: string }>) => {
      log.debug('mainWindow.new-window-for-tab', { event });
      createNewTab(
        windowOptions,
        setupNativefierWindow,
        event?.url ?? options.targetUrl,
        true,
        // mainWindow,
      );
    },
  );

  if (options.counter) {
    setupCounter(options, mainWindow, setDockBadge);
  } else {
    setupNotificationBadge(options, mainWindow, setDockBadge);
  }

  registerNotificationIpcHandlers({
    onClick: () => {
      log.debug('ipcMain.nativefier-notify click');
      showBrowserWindow(mainWindow);
    },
  });

  setupSessionInteraction(mainWindow);
  setupSessionPermissionHandler(mainWindow);

  if (options.clearCache) {
    await clearCache(mainWindow);
  }

  setupCloseEvent(options, mainWindow);

  return mainWindow;
}

function createContextMenu(
  options: OutputOptions,
  window: BrowserWindow,
): void {
  if (!options.disableContextMenu) {
    initContextMenu(options, window);
  }
}

function setupCloseEvent(options: OutputOptions, window: BrowserWindow): void {
  onBrowserWindowEvent(window, 'close', (event: Event) => {
    log.debug('mainWindow.close', event);
    if (isFullScreen(window)) {
      if (nativeTabsSupported()) {
        moveTabToNewWindow(window);
      }
      setFullScreen(window, false);
      // Use the outer `close` event for preventDefault; `leave-full-screen` has no event in Electron 42 typings.
      onceBrowserWindowEvent(window, 'leave-full-screen', () =>
        hideWindow(
          window,
          event,
          options.fastQuit ?? false,
          options.tray ?? 'false',
        ),
      );
    }
    hideWindow(
      window,
      event,
      options.fastQuit ?? false,
      options.tray ?? 'false',
    );

    if (options.clearCache) {
      clearCache(window).catch((err) => log.error('clearCache ERROR', err));
    }
  });
}

function setupCounter(
  options: OutputOptions,
  window: BrowserWindow,
  setDockBadge: (value: number | string, bounce?: boolean) => void,
): void {
  onBrowserWindowEvent(window, 'page-title-updated', (event, title: string) => {
    log.debug('mainWindow.page-title-updated', { event, title });
    const counterValue = getCounterValue(title);
    if (counterValue) {
      setDockBadge(counterValue, options.bounce);
    } else {
      setDockBadge('');
    }
  });
}

function setupSessionPermissionHandler(window: BrowserWindow): void {
  setDefaultPermissionHandlers(getBrowserWindowSession(window));
}

function setupNotificationBadge(
  options: OutputOptions,
  window: BrowserWindow,
  setDockBadge: (value: number | string, bounce?: boolean) => void,
): void {
  registerNotificationIpcHandlers({
    onCreate: () => {
      log.debug('ipcMain.nativefier-notify create');
      if (!isOSX() || window.isFocused()) {
        return;
      }
      setDockBadge('•', options.bounce);
    },
  });
  onBrowserWindowEvent(window, 'focus', () => {
    log.debug('mainWindow.focus');
    clearNotificationBadgeState(window.webContents.id);
    setDockBadge('');
  });
}

function setupSessionInteraction(window: BrowserWindow): void {
  const session = getBrowserWindowSession(window);

  // See API.md / "Accessing The Electron Session"
  onIpcMainEvent(
    'session-interaction',
    (event, request: SessionInteractionRequest) => {
      log.debug('ipcMain.session-interaction', { event, request });

      const result: SessionInteractionResult = { id: request.id };
      let awaitingPromise = false;
      try {
        if (request.func !== undefined) {
          const funcArgs = normalizeSessionFuncArgs(request.funcArgs);
          result.value = invokeSessionMethod(session, request.func, funcArgs);

          if (result.value !== undefined && result.value instanceof Promise) {
            // This is a promise. We'll resolve it here otherwise it will blow up trying to serialize it in the reply
            (result.value as Promise<unknown>)
              .then((trueResultValue) => {
                result.value = trueResultValue;
                log.debug('ipcMain.session-interaction:result', result);
                event.reply('session-interaction-reply', result);
              })
              .catch((err) => {
                log.error('session-interaction:error', err, event, request);
                result.error = err as Error;
                result.value = undefined;
                event.reply('session-interaction-reply', result);
              });
            awaitingPromise = true;
          }
        } else if (request.property !== undefined) {
          if (request.propertyValue !== undefined) {
            setSessionProperty(
              session,
              request.property,
              request.propertyValue,
            );
          }

          result.value = getSessionProperty(session, request.property);
        } else {
          // Why even send the event if you're going to do this? You're just wasting time! ;)
          throw new Error(
            'Received neither a func nor a property in the request. Unable to process.',
          );
        }

        // If we are awaiting a promise, that will return the reply instead, else
        if (!awaitingPromise) {
          log.debug('session-interaction:result', result);
          event.reply('session-interaction-reply', result);
        }
      } catch (err: unknown) {
        log.error('session-interaction:error', err, event, request);
        result.error = err as Error;
        result.value = undefined; // Clear out the value in case serializing the value is what got us into this mess in the first place
        event.reply('session-interaction-reply', result);
      }
    },
  );
}
