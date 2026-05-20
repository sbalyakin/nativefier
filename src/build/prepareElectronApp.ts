import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

import * as log from 'loglevel';

import { generateRandomSuffix } from '../helpers/helpers';
import {
  AppOptions,
  NATIVEFIER_JSON_FILENAME,
  PackageJSON,
} from '../buildTimeContract';
import { parseJson } from '../utils/parseUtils';
import { mapAppOptionsToOutputOptions } from '../options/outputOptionsMapper';

async function maybeCopyScripts(
  srcs: string[] | undefined,
  dest: string,
): Promise<void> {
  if (!srcs || srcs.length === 0) {
    log.debug('No files to inject, skipping copy.');
    return;
  }

  const supportedInjectionExtensions = ['.css', '.js'];

  log.debug(`Copying ${srcs.length} files to inject in app.`);
  for (const src of srcs) {
    if (!fs.existsSync(src)) {
      throw new Error(
        `File ${src} not found. Note that Nativefier expects *local* files, not URLs.`,
      );
    }

    if (supportedInjectionExtensions.indexOf(path.extname(src)) < 0) {
      log.warn('Skipping unsupported injection file', src);
      continue;
    }

    const postFixHash = generateRandomSuffix();
    const destFileName = `inject-${postFixHash}${path.extname(src)}`;
    const destPath = path.join(dest, 'inject', destFileName);
    log.debug(`Copying injection file "${src}" to "${destPath}"`);
    await fs.copy(src, destPath);
  }
}

/**
 * Use a basic 6-character hash to prevent collisions. The hash is deterministic url & name,
 * so that an upgrade (same URL) of an app keeps using the same appData folder.
 * Warning! Changing this normalizing & hashing will change the way appNames are generated,
 *          changing appData folder, and users will get logged out of their apps after an upgrade.
 */
export function normalizeAppName(appName: string, url: string): string {
  const hash = crypto.createHash('md5');
  hash.update(url);
  const postFixHash = hash.digest('hex').substring(0, 6);
  const normalized = appName
    .toLowerCase()
    .replace(/[,:.]/g, '')
    .replace(/[\s_]/g, '-');
  return `${normalized}-nativefier-${postFixHash}`;
}

function changeAppPackageJsonName(
  appPath: string,
  name: string,
  url: string,
): string {
  const packageJsonPath = path.join(appPath, '/package.json');
  const packageJson = parseJson<PackageJSON>(
    fs.readFileSync(packageJsonPath).toString(),
  );
  if (!packageJson) {
    throw new Error(`Could not load package.json from ${packageJsonPath}`);
  }
  const normalizedAppName = normalizeAppName(name, url);
  packageJson.name = normalizedAppName;
  log.debug(`Updating ${packageJsonPath} 'name' field to ${normalizedAppName}`);

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  return normalizedAppName;
}

/**
 * Creates a temporary directory, copies the './app folder' inside,
 * and adds a text file with the app configuration.
 */
export async function prepareElectronApp(
  src: string,
  dest: string,
  options: AppOptions,
): Promise<void> {
  log.debug(`Copying electron app from ${src} to ${dest}`);
  try {
    await fs.copy(src, dest);
  } catch (err: unknown) {
    throw `Error copying electron app from ${src} to temp dir ${dest}. Error: ${
      (err as Error).message
    }`;
  }

  const appJsonPath = path.join(dest, NATIVEFIER_JSON_FILENAME);
  const pickedOptions = mapAppOptionsToOutputOptions(options);
  log.debug(`Writing app config to ${appJsonPath}`, pickedOptions);
  await fs.writeFile(appJsonPath, JSON.stringify(pickedOptions));

  if (options.nativefier.bookmarksMenu) {
    const bookmarksJsonPath = path.join(dest, '/bookmarks.json');
    try {
      await fs.copy(options.nativefier.bookmarksMenu, bookmarksJsonPath);
    } catch (err: unknown) {
      log.error('Error copying bookmarks menu config file.', err);
    }
  }

  try {
    await maybeCopyScripts(options.nativefier.inject, dest);
  } catch (err: unknown) {
    log.error('Error copying injection files.', err);
  }
  const normalizedAppName = changeAppPackageJsonName(
    dest,
    options.packager.name as string,
    options.packager.targetUrl,
  );
  options.packager.appBundleId = `com.electron.nativefier.${normalizedAppName}`;
}
