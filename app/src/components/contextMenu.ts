import type {
  BrowserWindow,
  ContextMenuParams,
  Event,
} from '../adapters/electronTypes';
import {
  initElectronContextMenu,
  type Actions,
  type ContextMenuBrowserTarget,
} from '../adapters/contextMenuAdapter';
import {
  emitBrowserWindowEvent,
  isBrowserWindow,
} from '../adapters/windowAdapter';

import { nativeTabsSupported, openExternal } from '../helpers/helpers';
import * as log from '../helpers/loggingHelper';
import { setupNativefierWindow } from '../helpers/windowEvents';
import { createNewWindow } from '../helpers/windowHelpers';
import {
  OutputOptions,
  outputOptionsToWindowOptions,
} from '../runtimeContract';

export function initContextMenu(
  options: OutputOptions,
  window?: BrowserWindow,
): void {
  log.debug('initContextMenu');

  initElectronContextMenu({
    window,
    prepend: (
      _actions: Actions,
      params: ContextMenuParams,
      browserWindow: ContextMenuBrowserTarget,
      _event: Event,
    ) => {
      log.debug('contextMenu.prepend', { params, browserWindow });
      const items = [];
      if (params.linkURL && browserWindow) {
        items.push({
          label: 'Open Link in Default Browser',
          click: () => {
            openExternal(params.linkURL).catch((err) =>
              log.error('contextMenu Open Link in Default Browser ERROR', err),
            );
          },
        });
        items.push({
          label: 'Open Link in New Window',
          click: () =>
            createNewWindow(
              outputOptionsToWindowOptions(options, nativeTabsSupported()),
              setupNativefierWindow,
              params.linkURL,
            ),
        });
        if (nativeTabsSupported() && isBrowserWindow(browserWindow)) {
          items.push({
            label: 'Open Link in New Tab',
            click: () =>
              emitBrowserWindowEvent(browserWindow, 'new-window-for-tab', {
                ...new Event('new-window-for-tab'),
                url: params.linkURL,
              }),
          });
        }
      }
      return items;
    },
    showCopyImage: true,
    showCopyImageAddress: true,
    showSaveImage: true,
  });
}
