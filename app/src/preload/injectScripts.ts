import * as fs from 'fs';
import * as path from 'path';

export const INJECT_DIR = path.join(__dirname, '..', 'inject');

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

export function listInjectJsRelativePaths(entries: InjectDirEntry[]): string[] {
  return entries
    .filter((entry) => isInjectJsFile(entry.name, entry.isFile()))
    .map((entry) => injectJsRelativePath(entry.name));
}

export function injectScripts(log: Console = console): void {
  const needToInject = fs.existsSync(INJECT_DIR);
  if (!needToInject) {
    return;
  }
  try {
    const jsFiles = listInjectJsRelativePaths(
      fs.readdirSync(INJECT_DIR, { withFileTypes: true }),
    );
    for (const jsFile of jsFiles) {
      log.debug('Injecting JS file', jsFile);
      require(jsFile);
    }
  } catch (err: unknown) {
    log.error('Error encoutered injecting JS files', err);
  }
}
