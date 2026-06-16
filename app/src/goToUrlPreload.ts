import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('nativefierGoToUrl', {
  submit: (url: string): void => {
    void ipcRenderer.invoke('go-to-url-message', url);
  },
  cancel: (): void => {
    void ipcRenderer.invoke('go-to-url-cancel');
  },
});
