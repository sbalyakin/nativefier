import * as fs from 'fs';
import * as path from 'path';

import { onIpcMainEvent } from '../adapters/ipcAdapter';
import { INJECT_DIR } from '../helpers/helpers';
import { listInjectJsFileNames } from '../preload/injectScripts';
import * as log from '../helpers/loggingHelper';

let injectIpcRegistered = false;

export function readInjectScriptSources(): string[] {
  if (!fs.existsSync(INJECT_DIR)) {
    return [];
  }
  try {
    const jsFileNames = listInjectJsFileNames(
      fs.readdirSync(INJECT_DIR, { withFileTypes: true }),
    );
    return jsFileNames.map((fileName) => {
      const absolutePath = path.join(INJECT_DIR, fileName);
      log.debug('injectScriptService: reading', absolutePath);
      return fs.readFileSync(absolutePath, 'utf8');
    });
  } catch (err: unknown) {
    log.error('injectScriptService: failed to read inject scripts', err);
    return [];
  }
}

export function registerInjectScriptIpc(): void {
  if (injectIpcRegistered) {
    return;
  }
  injectIpcRegistered = true;

  onIpcMainEvent('get-inject-script-sources', (event) => {
    event.returnValue = readInjectScriptSources();
  });
}
