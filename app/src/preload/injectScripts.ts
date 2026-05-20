import * as fs from 'fs';
import * as path from 'path';

// Preload compiles under `lib/preload/`; inject files live next to `lib/` (same as helpers).
export const INJECT_DIR = path.join(__dirname, '..', '..', 'inject');

export type InjectDirEntry = {
  name: string;
  isFile: () => boolean;
};

export function isInjectJsFile(name: string, isFile: boolean): boolean {
  return isFile && name.endsWith('.js');
}

export function injectJsRelativePath(fileName: string): string {
  return path.join('..', 'inject', fileName);
}

export function injectJsAbsolutePath(fileName: string): string {
  return path.join(INJECT_DIR, fileName);
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

export function injectScripts(log: Console = console): void {
  const needToInject = fs.existsSync(INJECT_DIR);
  if (!needToInject) {
    return;
  }
  try {
    const jsFileNames = listInjectJsFileNames(
      fs.readdirSync(INJECT_DIR, { withFileTypes: true }),
    );
    for (const fileName of jsFileNames) {
      const absolutePath = injectJsAbsolutePath(fileName);
      log.debug('Injecting JS file', absolutePath);
      require(absolutePath);
    }
  } catch (err: unknown) {
    log.error('Error encoutered injecting JS files', err);
  }
}
