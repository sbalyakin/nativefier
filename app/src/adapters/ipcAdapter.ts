import { desktopCapturer, DesktopCapturerSource, ipcMain } from 'electron';

export function onIpcMainEvent(
  channel: string,
  listener: Parameters<typeof ipcMain.on>[1],
): void {
  ipcMain.on(channel, listener);
}

export function onceIpcMainEvent(
  channel: string,
  listener: Parameters<typeof ipcMain.once>[1],
): void {
  ipcMain.once(channel, listener);
}

export function handleIpcMainInvoke(
  channel: string,
  listener: Parameters<typeof ipcMain.handle>[1],
): void {
  ipcMain.handle(channel, listener);
}

export function getDesktopCapturerSources(options: {
  types: ('screen' | 'window')[];
}): Promise<DesktopCapturerSource[]> {
  return desktopCapturer.getSources(options);
}
