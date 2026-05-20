import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('nativefierLogin', {
  submit: (username: string, password: string): void => {
    ipcRenderer.send('login-message', [username, password]);
  },
});
