/**
 * Barrel for Electron types consumed outside adapters.
 * Runtime code may `import type` from here only; value imports stay in adapters.
 */
export type {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  ContextMenuParams,
  DesktopCapturerSource,
  Event,
  HandlerDetails,
  IpcMainEvent,
  IpcRenderer,
  Menu,
  MenuItemConstructorOptions,
  OpenExternalOptions,
  Session,
  Tray,
  WebContents,
} from 'electron';
