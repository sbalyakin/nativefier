import { OpenExternalOptions, shell } from 'electron';

export function openExternalUrl(
  url: string,
  options?: OpenExternalOptions,
): Promise<void> {
  return shell.openExternal(url, options);
}
