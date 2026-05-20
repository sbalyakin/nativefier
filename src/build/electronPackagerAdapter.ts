import { createRequire } from 'module';

import type { ElectronPackagerOptions } from '../buildTimeContract';

export type ElectronPackagerFn = (
  options: ElectronPackagerOptions,
) => Promise<string | string[]>;

function getElectronGet(): { initializeProxy: () => void } {
  // @electron/get is ESM-only; Jest runs compiled CJS and cannot load it.
  if (process.env.JEST_WORKER_ID !== undefined) {
    return { initializeProxy: () => undefined };
  }
  const nodeRequire = createRequire(__filename);
  return nodeRequire('@electron/get') as { initializeProxy: () => void };
}

const electronGet = getElectronGet();

export async function runElectronPackager(
  packagerOptions: ElectronPackagerOptions,
  packagerFn?: ElectronPackagerFn,
): Promise<string | string[]> {
  electronGet.initializeProxy(); // https://github.com/electron/get#proxies
  if (packagerFn) {
    return packagerFn(packagerOptions);
  }
  const { packager } = await import('@electron/packager');
  return packager(packagerOptions);
}
