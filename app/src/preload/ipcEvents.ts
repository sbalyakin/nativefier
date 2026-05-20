import { IpcRenderer } from 'electron';

import { OutputOptions } from '../runtimeContract';

export function setupIpcEvents(
  ipcRenderer: IpcRenderer,
  log: Console = console,
): void {
  ipcRenderer.on('params', (event, message: string) => {
    log.debug('ipcRenderer.params', { event, message });
    const appArgs: unknown = JSON.parse(message) as OutputOptions;
    log.info('nativefier.json', appArgs);
  });

  ipcRenderer.on('debug', (event, message: string) => {
    log.debug('ipcRenderer.debug', { event, message });
  });
}
