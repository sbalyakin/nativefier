import { contextBridge, IpcRenderer } from 'electron';

import type { NativefierNotifyBridge } from './notificationShimSource';

export function createNativefierNotifyBridge(
  ipcRenderer: IpcRenderer,
): NativefierNotifyBridge {
  return {
    create(title: string, opt: NotificationOptions): void {
      ipcRenderer.send('notification', title, opt);
    },
    click(): void {
      ipcRenderer.send('notification-click');
    },
  };
}

export function exposeNativefierNotifyBridge(
  bridge: NativefierNotifyBridge,
): void {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld('__nativefierNotify', bridge);
  } else {
    (
      window as Window &
        typeof globalThis & { __nativefierNotify?: NativefierNotifyBridge }
    ).__nativefierNotify = bridge;
  }
}

export function setupNotifications(ipcRenderer: IpcRenderer): void {
  exposeNativefierNotifyBridge(createNativefierNotifyBridge(ipcRenderer));
}
