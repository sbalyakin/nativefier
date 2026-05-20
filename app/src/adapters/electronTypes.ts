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
  MessageBoxReturnValue,
  OnResponseStartedListenerDetails,
  OpenExternalOptions,
  Session,
  Tray,
  WebContents,
  WebPreferences,
} from 'electron';
