import * as fs from 'fs';
import * as path from 'path';

import * as log from 'loglevel';

import {
  LEGACY_NATIVEFIER_JSON_FILENAME,
  WEBHOLM_JSON_FILENAME,
  WebholmOptions,
  RawOptions,
} from '../../buildTimeContract';
import { normalizeLegacyOutputConfig } from '../../legacyConfig';
import { dirExists, fileExists } from '../fsHelpers';
import { extractBoolean, extractString } from './plistInfoXMLHelpers';
import { getOptionsFromExecutable } from './executableHelpers';
import { parseJson } from '../../utils/parseUtils';

/** @deprecated Use {@link WebholmOptions}. */
export type NativefierOptions = WebholmOptions;

export type UpgradeAppInfo = {
  appResourcesDir: string;
  appRoot: string;
  options: WebholmOptions;
};

function configExistsInDir(searchDir: string): boolean {
  return (
    fileExists(path.join(searchDir, WEBHOLM_JSON_FILENAME)) ||
    fileExists(path.join(searchDir, LEGACY_NATIVEFIER_JSON_FILENAME))
  );
}

function findUpgradeAppResourcesDir(searchDir: string): string | null {
  searchDir = dirExists(searchDir) ? searchDir : path.dirname(searchDir);
  log.debug(`Searching for runtime config in ${searchDir}`);
  const children = fs.readdirSync(searchDir, { withFileTypes: true });
  if (configExistsInDir(searchDir)) {
    return path.resolve(searchDir);
  }
  const childDirectories = children.filter((c) => c.isDirectory());
  for (const childDir of childDirectories) {
    const result = findUpgradeAppResourcesDir(
      path.join(searchDir, childDir.name),
    );
    if (result !== null) {
      return path.resolve(result);
    }
  }

  return null;
}

function resolveRuntimeConfigPath(appResourcesDir: string): string {
  const webholmPath = path.join(appResourcesDir, WEBHOLM_JSON_FILENAME);
  if (fileExists(webholmPath)) {
    return webholmPath;
  }
  return path.join(appResourcesDir, LEGACY_NATIVEFIER_JSON_FILENAME);
}

function getAppRoot(
  appResourcesDir: string,
  options: WebholmOptions,
): string {
  switch (options.platform) {
    case 'darwin':
      return path.resolve(path.join(appResourcesDir, '..', '..', '..', '..'));
    case 'linux':
    case 'win32':
      return path.resolve(path.join(appResourcesDir, '..', '..'));
    default:
      throw new Error(
        `Could not find the app root for platform: ${
          options.platform ?? 'undefined'
        }`,
      );
  }
}

function getIconPath(appResourcesDir: string): string | undefined {
  const icnsPath = path.join(appResourcesDir, '..', 'electron.icns');
  if (fileExists(icnsPath)) {
    log.debug(`Found icon at: ${icnsPath}`);
    return path.resolve(icnsPath);
  }
  const icoPath = path.join(appResourcesDir, 'icon.ico');
  if (fileExists(icoPath)) {
    log.debug(`Found icon at: ${icoPath}`);
    return path.resolve(icoPath);
  }
  const pngPath = path.join(appResourcesDir, 'icon.png');
  if (fileExists(pngPath)) {
    log.debug(`Found icon at: ${pngPath}`);
    return path.resolve(pngPath);
  }

  log.debug('Could not find icon file.');
  return undefined;
}

function getInfoPListOptions(
  appResourcesDir: string,
  priorOptions: WebholmOptions,
): WebholmOptions {
  if (!fileExists(path.join(appResourcesDir, '..', '..', 'Info.plist'))) {
    return priorOptions;
  }

  const newOptions = { ...priorOptions };

  const infoPlistXML: string = fs
    .readFileSync(path.join(appResourcesDir, '..', '..', 'Info.plist'))
    .toString();

  if (newOptions.appCopyright === undefined) {
    newOptions.appCopyright = extractString(
      infoPlistXML,
      'NSHumanReadableCopyright',
    );
    log.debug(
      `Extracted app copyright from Info.plist: ${
        newOptions.appCopyright as string
      }`,
    );
  }

  if (newOptions.appVersion === undefined) {
    const bundleVersion = extractString(infoPlistXML, 'CFBundleVersion');
    newOptions.appVersion =
      bundleVersion === undefined || bundleVersion === '1.0.0'
        ? undefined
        : bundleVersion;
    newOptions.darwinDarkModeSupport =
      newOptions.darwinDarkModeSupport === undefined
        ? undefined
        : newOptions.darwinDarkModeSupport === false;
    log.debug(
      `Extracted app version from Info.plist: ${
        newOptions.appVersion as string
      }`,
    );
  }

  if (newOptions.darwinDarkModeSupport === undefined) {
    newOptions.darwinDarkModeSupport = extractBoolean(
      infoPlistXML,
      'NSRequiresAquaSystemAppearance',
    );
    log.debug(
      `Extracted Darwin dark mode support from Info.plist: ${
        newOptions.darwinDarkModeSupport ? 'Yes' : 'No'
      }`,
    );
  }

  return newOptions;
}

function getInjectPaths(appResourcesDir: string): string[] | undefined {
  const injectDir = path.join(appResourcesDir, 'inject');
  if (!dirExists(injectDir)) {
    return undefined;
  }

  const injectPaths = fs
    .readdirSync(injectDir, { withFileTypes: true })
    .filter(
      (fd) =>
        fd.isFile() &&
        (fd.name.toLowerCase().endsWith('.css') ||
          fd.name.toLowerCase().endsWith('.js')),
    )
    .map((fd) => path.resolve(path.join(injectDir, fd.name)));
  log.debug(`CSS/JS Inject paths: ${injectPaths.join(', ')}`);
  return injectPaths;
}

function isAsar(appResourcesDir: string): boolean {
  const asar = fileExists(path.join(appResourcesDir, '..', 'electron.asar'));
  log.debug(`Is this app an ASAR? ${asar ? 'Yes' : 'No'}`);
  return asar;
}

export function findUpgradeApp(upgradeFrom: string): UpgradeAppInfo | null {
  const searchDir = dirExists(upgradeFrom)
    ? upgradeFrom
    : path.dirname(upgradeFrom);
  log.debug(`Looking for old options file in ${searchDir}`);
  const appResourcesDir = findUpgradeAppResourcesDir(searchDir);
  if (appResourcesDir === null) {
    log.debug(
      `No ${WEBHOLM_JSON_FILENAME} or ${LEGACY_NATIVEFIER_JSON_FILENAME} file found in ${searchDir}`,
    );
    return null;
  }

  const configJSONPath = resolveRuntimeConfigPath(appResourcesDir);

  log.debug(`Loading ${configJSONPath}`);
  const rawConfig = parseJson<Record<string, unknown>>(
    fs.readFileSync(configJSONPath, 'utf8'),
  );

  if (!rawConfig) {
    throw new Error(`Could not read Webholm options from ${configJSONPath}`);
  }

  let options = normalizeLegacyOutputConfig(
    rawConfig,
  ) as WebholmOptions;

  options.electronVersion = undefined;

  options = {
    ...options,
    ...getOptionsFromExecutable(appResourcesDir, options),
  };

  const appRoot = getAppRoot(appResourcesDir, options);

  return {
    appResourcesDir,
    appRoot,
    options: {
      ...options,
      ...getInfoPListOptions(appResourcesDir, options),
      asar: options.asar !== undefined ? options.asar : isAsar(appResourcesDir),
      icon: getIconPath(appResourcesDir),
      inject: getInjectPaths(appResourcesDir),
    },
  };
}

export function useOldAppOptions(
  rawOptions: RawOptions,
  oldApp: UpgradeAppInfo,
): RawOptions {
  if (rawOptions.targetUrl !== undefined && dirExists(rawOptions.targetUrl)) {
    rawOptions.out = rawOptions.targetUrl;
  }

  log.debug('oldApp', oldApp);

  const combinedOptions = { ...rawOptions, ...oldApp.options };
  if (Array.isArray(combinedOptions.icon)) {
    combinedOptions.icon = combinedOptions.icon[0];
  }

  log.debug('Combined options', combinedOptions);

  return combinedOptions;
}
