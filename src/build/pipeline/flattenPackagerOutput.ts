import * as path from 'path';

import * as fs from 'fs-extra';
import * as log from 'loglevel';

import type { AppOptions } from '../../buildTimeContract';

export function getPackagerOutputDirName(
  name: string,
  platform: string | undefined,
  arch: string | undefined,
): string {
  return `${name}-${platform}-${arch}`;
}

/**
 * electron-packager always writes to `{out}/{name}-{platform}-{arch}/`.
 * Move those artifacts up into `{out}/` so users get e.g. `~/Applications/MyApp.app`.
 */
export async function flattenPackagerOutput(
  packagedDir: string,
  options: AppOptions,
): Promise<string> {
  const outputDirectory = options.packager.out;
  if (!outputDirectory) {
    return packagedDir;
  }

  const name = String(options.packager.name ?? 'Nativefier');
  const expectedSubdir = getPackagerOutputDirName(
    name,
    options.packager.platform,
    String(options.packager.arch),
  );
  const expectedPackagedDir = path.join(outputDirectory, expectedSubdir);

  if (path.resolve(packagedDir) !== path.resolve(expectedPackagedDir)) {
    log.debug(
      'Skipping flattenPackagerOutput: packaged dir is not the default packager subfolder',
      packagedDir,
    );
    return packagedDir;
  }

  const entries = await fs.readdir(packagedDir);
  for (const entry of entries) {
    const src = path.join(packagedDir, entry);
    const dest = path.join(outputDirectory, entry);
    await fs.move(src, dest, {
      overwrite: Boolean(options.packager.overwrite),
    });
  }
  await fs.remove(packagedDir);

  log.debug(`Flattened packager output into ${outputDirectory}`);
  return outputDirectory;
}
