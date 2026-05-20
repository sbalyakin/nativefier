import {
  BrowserWindow,
  dialog,
  MessageBoxOptions,
  MessageBoxReturnValue,
  MessageBoxSyncOptions,
} from 'electron';

export function showMessageBox(
  window: BrowserWindow,
  options: MessageBoxOptions,
): Promise<MessageBoxReturnValue> {
  return dialog.showMessageBox(window, options);
}

export function showMessageBoxSync(
  window: BrowserWindow,
  options: MessageBoxSyncOptions,
): number {
  return dialog.showMessageBoxSync(window, options);
}
