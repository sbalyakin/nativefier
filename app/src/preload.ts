/**
 * Preload file that will be executed in the renderer process.
 * Note: This needs to be attached **prior to imports**, as imports
 * would delay the attachment till after the event has been raised.
 */
document.addEventListener('DOMContentLoaded', () => {
  injectScripts(ipcRenderer);
});

import { ipcRenderer } from 'electron';

import { injectScripts } from './preload/injectScripts';
import { setupIpcEvents } from './preload/ipcEvents';
import { setupNativefierBridge } from './preload/nativefierBridge';
import { setupNotificationPostMessageBridge } from './preload/notificationPostMessageBridge';

// Built as a single webpack bundle (target electron-preload) so sandbox preload can load it.
// Do *NOT* add 3rd-party imports here in preload (except for webpack `externals` like electron).
// They will work during development, but break in the prod build :-/ .
// Electron doc isn't explicit about that, so maybe *we*'re doing something wrong.
// At any rate, that's what we have now. If you want an import here, go ahead, but
// verify that apps built with a non-devbuild nativefier (installed from tarball) work.
// Recipe to monkey around this, assuming you git-cloned nativefier in /opt/nativefier/ :
// cd /opt/nativefier/ && rm -f nativefier-43.1.0.tgz && npm run build && npm pack && mkdir -p ~/n4310/ && cd ~/n4310/ \
//    && rm -rf ./* && npm i /opt/nativefier/nativefier-43.1.0.tgz && ./node_modules/.bin/nativefier 'google.com'
// See https://github.com/nativefier/nativefier/issues/1175
// and https://www.electronjs.org/docs/api/browser-window#new-browserwindowoptions / preload

const log = console; // since we can't have `loglevel` here in preload

setupNativefierBridge(ipcRenderer);
setupNotificationPostMessageBridge(ipcRenderer);
setupIpcEvents(ipcRenderer, log);
