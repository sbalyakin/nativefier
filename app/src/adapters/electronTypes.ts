/**
 * Barrel for Electron types consumed outside adapters.
 * Runtime code may `import type` from here only; value imports stay in adapters.
 */
export type {
  BaseWindow,
  BrowserView,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  ContextMenuParams,
  DesktopCapturerSource,
  DisplayMediaRequestHandlerHandlerRequest,
  Event,
  HandlerDetails,
  IpcMainEvent,
  IpcRenderer,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  NativeImage,
  MessageBoxReturnValue,
  OnResponseStartedListenerDetails,
  OpenExternalOptions,
  Session,
  Streams,
  Tray,
  WebContents,
  WebPreferences,
  WebviewTag,
} from 'electron';
