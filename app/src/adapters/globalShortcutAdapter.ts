import { globalShortcut } from 'electron';

export function registerGlobalShortcut(
  accelerator: string,
  callback: () => void,
): boolean {
  return globalShortcut.register(accelerator, callback);
}
