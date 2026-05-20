import contextMenu, { type Actions } from 'electron-context-menu';
import type {
  BrowserView,
  BrowserWindow,
  ContextMenuParams,
  Event,
  MenuItemConstructorOptions,
  WebContents,
  WebviewTag,
} from 'electron';

export type { Actions };

export type ContextMenuBrowserTarget =
  | BrowserWindow
  | BrowserView
  | WebviewTag
  | WebContents;

export type ContextMenuInitOptions = {
  window?: BrowserWindow;
  prepend?: (
    actions: Actions,
    params: ContextMenuParams,
    browserWindow: ContextMenuBrowserTarget,
    event: Event,
  ) => MenuItemConstructorOptions[];
  showCopyImage?: boolean;
  showCopyImageAddress?: boolean;
  showSaveImage?: boolean;
};

export function initElectronContextMenu(
  options: ContextMenuInitOptions,
): () => void {
  return contextMenu(options);
}
