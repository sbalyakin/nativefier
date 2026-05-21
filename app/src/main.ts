import 'source-map-support/register';

import {
  exitApp,
  isTrustedAccessibilityClient,
  onAppEvent,
  quitApp,
} from './adapters/appAdapter';
import type { BrowserWindow, Event } from './adapters/electronTypes';
import { showMessageBox, showMessageBoxSync } from './adapters/dialogAdapter';
import {
  emitBrowserWindowEvent,
  loadUrl,
  sendInputEventToWebContents,
  sendToWebContents,
  showBrowserWindow,
} from './adapters/windowAdapter';
import { registerGlobalShortcut } from './adapters/globalShortcutAdapter';
import { createLoginWindow } from './components/loginWindow';
import { createMainWindow } from './components/mainWindow';
import { createTrayIcon } from './components/trayIcon';
import { persistRuntimeConfig } from './config/persistRuntimeConfig';
import { loadRuntimeConfig } from './config/loadRuntimeConfig';
import { isOSX } from './helpers/helpers';
import * as log from './helpers/loggingHelper';
import { IS_PLAYWRIGHT, safeGetEnv } from './helpers/playwrightHelpers';
import { createDockBadgeSetter } from './services/dockBadgeService';
import { applyRuntimeStartup } from './services/runtimeStartup';
import { registerSingleInstance } from './services/singleInstanceService';

// Entrypoint for Squirrel, a windows update framework. See https://github.com/nativefier/nativefier/pull/744
if (require('electron-squirrel-startup')) {
  exitApp();
}

if (process.argv.indexOf('--verbose') > -1 || safeGetEnv('VERBOSE') === '1') {
  log.setLevel('DEBUG');
  process.traceDeprecation = true;
  process.traceProcessWarnings = true;
  process.argv.slice(1);
}

let mainWindow: BrowserWindow | undefined;
let pendingDockShowOnReady = false;
let onReadyDidRun = false;

const appArgs = loadRuntimeConfig();
applyRuntimeStartup(appArgs);
const setDockBadge = createDockBadgeSetter();

// Nativefier is a browser, and an old browser is an insecure / badly-performant one.
// Given our builder/app design, we currently don't have an easy way to offer
// upgrades from the app themselves (like browsers do).
// As a workaround, we ask for a manual upgrade & re-build if the build is old.
// The period in days is chosen to be not too small to be exceedingly annoying,
// but not too large to be exceedingly insecure.
const OLD_BUILD_WARNING_THRESHOLD_DAYS = 90;
const OLD_BUILD_WARNING_THRESHOLD_MS =
  OLD_BUILD_WARNING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

onAppEvent('window-all-closed', () => {
  log.debug('app.window-all-closed');
  if (!isOSX() || appArgs.fastQuit || IS_PLAYWRIGHT) {
    quitApp();
  }
});

onAppEvent('before-quit', () => {
  log.debug('app.before-quit');
  // not fired when the close button on the window is clicked
  if (isOSX()) {
    // need to force a quit as a workaround here to simulate the osx app hiding behaviour
    // Somehow sokution at https://github.com/atom/electron/issues/444#issuecomment-76492576 does not work,
    // e.prevent default appears to persist

    // might cause issues in the future as before-quit and will-quit events are not called
    exitApp(0);
  }
});

onAppEvent('will-quit', (event) => {
  log.debug('app.will-quit', event);
});

onAppEvent('quit', (event, exitCode) => {
  log.debug('app.quit', { event, exitCode });
});

onAppEvent('will-finish-launching', () => {
  log.debug('app.will-finish-launching');
});

onAppEvent<[Event, string]>('open-url', (event, url) => {
  log.debug('app.open-url', { event, url });

  event.preventDefault();
  if (mainWindow) {
    sendToWebContents(mainWindow, 'open-url', url);
  }
});

function runOnReadyOnce(trigger: string): void {
  if (onReadyDidRun) {
    log.debug('runOnReadyOnce skipped (already ran)', { trigger });
    return;
  }
  onReadyDidRun = true;
  log.debug('runOnReadyOnce', { trigger });
  onReady().catch((err) => log.error('onReady ERROR', err));
}

if (appArgs.widevine) {
  // castLabs builds may not emit widevine-ready on all versions; app ready is fallback.
  onAppEvent('ready', () => {
    log.debug('app.ready (widevine)');
    runOnReadyOnce('ready');
  });

  onAppEvent<[string, string]>('widevine-ready', (version, lastVersion) => {
    log.debug('app.widevine-ready', { version, lastVersion });
    runOnReadyOnce('widevine-ready');
  });

  onAppEvent<[string, string]>(
    'widevine-update-pending',
    (currentVersion, pendingVersion) => {
      log.debug('app.widevine-update-pending', {
        currentVersion,
        pendingVersion,
      });
    },
  );

  onAppEvent<[Error]>('widevine-error', (error) => {
    log.error('app.widevine-error', error);
    runOnReadyOnce('widevine-error');
  });
} else {
  onAppEvent('ready', () => {
    log.debug('app.ready');
    runOnReadyOnce('ready');
  });
}

onAppEvent('activate', (event: Event, hasVisibleWindows: boolean) => {
  log.debug('app.activate', { event, hasVisibleWindows });
  if (isOSX() && !IS_PLAYWRIGHT && !hasVisibleWindows) {
    // mainWindow is created in onReady (after app ready or widevine-ready)
    if (mainWindow) {
      showBrowserWindow(mainWindow);
    } else {
      pendingDockShowOnReady = true;
    }
  }
});

registerSingleInstance(appArgs, () => mainWindow);

onAppEvent('new-window-for-tab', (event: Event) => {
  log.debug('app.new-window-for-tab', { event });
  if (mainWindow) {
    emitBrowserWindowEvent(mainWindow, 'new-window-for-tab', event);
  }
});

onAppEvent<
  [
    Event,
    import('./adapters/electronTypes').WebContents,
    unknown,
    unknown,
    (username?: string, password?: string) => void,
  ]
>('login', (event, webContents, request, authInfo, callback) => {
  log.debug('app.login', { event, request });
  // for http authentication
  event.preventDefault();

  if (appArgs.basicAuthUsername && appArgs.basicAuthPassword) {
    callback(appArgs.basicAuthUsername, appArgs.basicAuthPassword);
  } else {
    createLoginWindow(
      callback,
      // mainWindow
    ).catch((err) => log.error('createLoginWindow ERROR', err));
  }
});

async function onReady(): Promise<void> {
  // Warning: `mainWindow` below is the *global* unique `mainWindow`, created at init time
  const window = await createMainWindow(appArgs, setDockBadge);
  mainWindow = window;

  createTrayIcon(appArgs, window);

  // Register global shortcuts
  if (appArgs.globalShortcuts) {
    appArgs.globalShortcuts.forEach((shortcut) => {
      registerGlobalShortcut(shortcut.key, () => {
        shortcut.inputEvents.forEach((inputEvent) => {
          sendInputEventToWebContents(
            window,
            inputEvent as Parameters<
              BrowserWindow['webContents']['sendInputEvent']
            >[0],
          );
        });
      });
    });

    if (isOSX() && appArgs.accessibilityPrompt) {
      const mediaKeys = [
        'MediaPlayPause',
        'MediaNextTrack',
        'MediaPreviousTrack',
        'MediaStop',
      ];
      const globalShortcutsKeys = appArgs.globalShortcuts.map((g) => g.key);
      const mediaKeyWasSet = globalShortcutsKeys.find((g) =>
        mediaKeys.includes(g),
      );
      if (mediaKeyWasSet && !isTrustedAccessibilityClient(false)) {
        // Since we're trying to set global keyboard shortcuts for media keys, we need to prompt
        // the user for permission on Mac.
        // For reference:
        // https://www.electronjs.org/docs/api/global-shortcut?q=MediaPlayPause#globalshortcutregisteraccelerator-callback
        const accessibilityPromptResult = showMessageBoxSync(window, {
          type: 'question',
          message: 'Accessibility Permissions Needed',
          buttons: ['Yes', 'No', 'No and never ask again'],
          defaultId: 0,
          detail:
            `${appArgs.name} would like to use one or more of your keyboard's media keys (start, stop, next track, or previous track) to control it.\n\n` +
            `Would you like Mac OS to ask for your permission to do so?\n\n` +
            `If so, you will need to restart ${appArgs.name} after granting permissions for these keyboard shortcuts to begin working.`,
        });
        switch (accessibilityPromptResult) {
          // User clicked Yes, prompt for accessibility
          case 0:
            isTrustedAccessibilityClient(true);
            break;
          // User cliecked Never Ask Me Again, save that info
          case 2:
            appArgs.accessibilityPrompt = false;
            persistRuntimeConfig(appArgs);
            break;
          // User clicked No
          default:
            break;
        }
      }
    }
  }
  if (
    !appArgs.disableOldBuildWarning &&
    new Date().getTime() - appArgs.buildDate > OLD_BUILD_WARNING_THRESHOLD_MS
  ) {
    const oldBuildWarningText =
      appArgs.oldBuildWarningText ||
      'This app was built a long time ago. Nativefier uses the Chrome browser (through Electron), and it is insecure to keep using an old version of it. Please upgrade Nativefier and rebuild this app.';
    showMessageBox(window, {
      type: 'warning',
      message: 'Old build detected',
      detail: oldBuildWarningText,
    }).catch((err) => log.error('showMessageBox ERROR', err));
  }

  if (appArgs.targetUrl) {
    await loadUrl(window, appArgs.targetUrl);
  }

  if (appArgs.tray !== 'start-in-tray') {
    showBrowserWindow(window);
  }

  if (pendingDockShowOnReady) {
    pendingDockShowOnReady = false;
    showBrowserWindow(window);
  }
}

onAppEvent(
  'accessibility-support-changed',
  (event: Event, accessibilitySupportEnabled: boolean) => {
    log.debug('app.accessibility-support-changed', {
      event,
      accessibilitySupportEnabled,
    });
  },
);

onAppEvent(
  'activity-was-continued',
  (event: Event, type: string, userInfo: unknown) => {
    log.debug('app.activity-was-continued', { event, type, userInfo });
  },
);

onAppEvent('browser-window-blur', () => {
  log.debug('app.browser-window-blur');
});

onAppEvent('browser-window-created', () => {
  log.debug('app.browser-window-created');
});

onAppEvent('browser-window-focus', () => {
  log.debug('app.browser-window-focus');
});
