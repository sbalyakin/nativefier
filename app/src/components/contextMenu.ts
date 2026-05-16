import electron, {
  BrowserWindow,
  ContextMenuParams,
  Event as ElectronEvent,
} from 'electron';
import contextMenu, { type Actions } from 'electron-context-menu';

import { nativeTabsSupported, openExternal } from '../helpers/helpers';
import * as log from '../helpers/loggingHelper';
import { setupNativefierWindow } from '../helpers/windowEvents';
import { createNewWindow } from '../helpers/windowHelpers';
import {
  OutputOptions,
  outputOptionsToWindowOptions,
} from '../../../shared/src/options/model';

export function initContextMenu(
  options: OutputOptions,
  window?: BrowserWindow,
): void {
  log.debug('initContextMenu');

  contextMenu({
    window,
    prepend: (
      _actions: Actions,
      params: ContextMenuParams,
      browserWindow:
        | BrowserWindow
        | electron.BrowserView
        | electron.WebviewTag
        | electron.WebContents,
      _event: ElectronEvent,
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
              // window,
            ),
        });
        if (nativeTabsSupported() && browserWindow instanceof BrowserWindow) {
          items.push({
            label: 'Open Link in New Tab',
            click: () =>
              browserWindow.emit('new-window-for-tab', {
                ...new Event('new-window-for-tab'),
                url: params.linkURL,
              } as ElectronEvent<{ url: string }>),
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
