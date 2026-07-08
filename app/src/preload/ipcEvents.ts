import { IpcRenderer } from 'electron';

import type { RendererParams } from '../runtimeContract';

export function setupIpcEvents(
  ipcRenderer: IpcRenderer,
  log: Console = console,
): void {
  ipcRenderer.on('params', (event, message: string) => {
    log.debug('ipcRenderer.params', { event, message });
    const rendererParams = JSON.parse(message) as RendererParams;
    log.info('webholm.json', rendererParams);
  });

  ipcRenderer.on('debug', (event, message: string) => {
    log.debug('ipcRenderer.debug', { event, message });
  });
}
