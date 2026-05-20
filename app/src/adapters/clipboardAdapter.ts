import { clipboard } from 'electron';

export function readClipboardText(
  type: 'selection' | 'clipboard' = 'clipboard',
): string {
  return clipboard.readText(type);
}

export function writeClipboardText(
  text: string,
  type: 'selection' | 'clipboard' = 'clipboard',
): void {
  clipboard.writeText(text, type);
}
