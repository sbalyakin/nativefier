import type { IpcRenderer } from 'electron';

export type InjectDirEntry = {
  name: string;
  isFile: () => boolean;
};

export function isInjectJsFile(name: string, isFile: boolean): boolean {
  return isFile && name.endsWith('.js');
}

export function injectJsRelativePath(fileName: string): string {
  return `inject/${fileName}`;
}

export function listInjectJsRelativePaths(entries: InjectDirEntry[]): string[] {
  return entries
    .filter((entry) => isInjectJsFile(entry.name, entry.isFile()))
    .map((entry) => injectJsRelativePath(entry.name));
}

export function listInjectJsFileNames(entries: InjectDirEntry[]): string[] {
  return entries
    .filter((entry) => isInjectJsFile(entry.name, entry.isFile()))
    .map((entry) => entry.name);
}

export function injectScripts(
  ipcRenderer: IpcRenderer,
  log: Console = console,
): void {
  try {
    const sources = ipcRenderer.sendSync('get-inject-script-sources');
    if (!Array.isArray(sources) || sources.length === 0) {
      return;
    }
    for (const source of sources) {
      if (typeof source !== 'string') {
        continue;
      }
      log.debug('Injecting user script from main');
      // User --inject JS runs in preload world (same as legacy require()).
      // eslint-disable-next-line @typescript-eslint/no-implied-eval -- dynamic user inject source
      const run = new Function(source);
      run();
    }
  } catch (err: unknown) {
    log.error('Error encountered injecting JS files', err);
  }
}
