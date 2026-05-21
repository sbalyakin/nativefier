import * as fs from 'fs';

import * as debug from 'debug';
import * as log from 'loglevel';

// package.json is `require`d to let tsc strip the `src` folder by determining
// baseUrl=src. A static import would prevent that and cause an ugly extra `src` folder in `lib`

const packageJson: {
  name: string;
  version: string;
} = require('../../package.json');
import { DEFAULT_ELECTRON_VERSION } from '../constants';
import type { SupportedPlatform } from '@electron/packager';
import { inferPlatform } from '../infer/inferOs';
import { asyncConfig } from './asyncConfig';
import { AppOptions, GlobalShortcut, RawOptions } from '../buildTimeContract';
import {
  assertValidMappedOptions,
  buildAppOptionsFromSchema,
  isElectronMajorBefore16,
  warnOnMappedOptions,
} from './optionSchema';
import { resolveWidevineElectronVersion } from './widevineElectronVersion';
import { parseJson } from '../utils/parseUtils';

/**
 * Process and validate raw user arguments
 */

export async function getOptions(rawOptions: RawOptions): Promise<AppOptions> {
  const options: AppOptions = buildAppOptionsFromSchema(
    rawOptions,
    packageJson.version,
  );
  assertValidMappedOptions(options);
  warnOnMappedOptions(options);

  if (options.nativefier.verbose) {
    log.setLevel('trace');
    try {
      debug.enable('@electron/packager');
    } catch (err: unknown) {
      log.error(
        'Failed to enable @electron/packager debug output. This should not happen,',
        'and suggests their internals changed. Please report an issue.',
        err,
      );
    }

    log.debug(
      'Running in verbose mode! This will produce a mountain of logs and',
      'is recommended only for troubleshooting or if you like Shakespeare.',
    );
  } else if (options.nativefier.quiet) {
    log.setLevel('silent');
  } else {
    log.setLevel('info');
  }

  if (options.nativefier.widevine) {
    const widevineSuffix = isElectronMajorBefore16(options)
      ? '-wvvmp'
      : '+wvcus';
    log.debug(`Using widevine release suffix "${widevineSuffix}"`);
    const requestedBaseVersion = options.packager.electronVersion as string;
    const widevineElectronVersion = await resolveWidevineElectronVersion(
      requestedBaseVersion,
      widevineSuffix,
    );

    options.packager.electronVersion = widevineElectronVersion;
    process.env.ELECTRON_MIRROR =
      'https://github.com/castlabs/electron-releases/releases/download/';
    log.warn(
      `\nATTENTION: Using the **unofficial** Electron from castLabs`,
      "\nIt implements Google's Widevine Content Decryption Module (CDM) for DRM-enabled playback.",
      `\nSimply abort & re-run without passing the widevine flag to default to ${
        options.packager.electronVersion !== undefined
          ? options.packager.electronVersion
          : DEFAULT_ELECTRON_VERSION
      }`,
    );
  }

  if (options.nativefier.flashPluginDir) {
    options.nativefier.insecure = true;
  }

  if (options.nativefier.userAgentHonest && options.nativefier.userAgent) {
    options.nativefier.userAgent = undefined;
    log.warn(
      `\nATTENTION: user-agent AND user-agent-honest/honest were provided. In this case, honesty wins. user-agent will be ignored`,
    );
  }

  options.packager.platform = normalizePlatform(
    options.packager.platform,
  ) as SupportedPlatform;

  if (
    options.nativefier.maxWidth &&
    options.nativefier.width &&
    options.nativefier.width > options.nativefier.maxWidth
  ) {
    options.nativefier.width = options.nativefier.maxWidth;
  }

  if (
    options.nativefier.maxHeight &&
    options.nativefier.height &&
    options.nativefier.height > options.nativefier.maxHeight
  ) {
    options.nativefier.height = options.nativefier.maxHeight;
  }

  if (options.packager.portable) {
    log.info(
      'Building app as portable.',
      'SECURITY WARNING: all data accumulated in the app folder after running it',
      '(including login information, cache, cookies) will be saved',
      'in the app folder. If this app is then shared with others,',
      'THEY WILL HAVE THAT ACCUMULATED DATA, POTENTIALLY INCLUDING ACCESS',
      'TO ANY ACCOUNTS YOU LOGGED INTO.',
    );
  }

  if (rawOptions.globalShortcuts) {
    if (typeof rawOptions.globalShortcuts === 'string') {
      // This is a file we got over the command line
      log.debug('Using global shortcuts file at', rawOptions.globalShortcuts);
      const globalShortcuts = parseJson<GlobalShortcut[]>(
        fs.readFileSync(rawOptions.globalShortcuts).toString(),
      );
      options.nativefier.globalShortcuts = globalShortcuts;
    } else {
      // This is an object we got from an existing config in an upgrade
      log.debug('Using global shortcuts object', rawOptions.globalShortcuts);
      options.nativefier.globalShortcuts = rawOptions.globalShortcuts;
    }
  }

  await asyncConfig(options);

  return options;
}

export function normalizePlatform(platform: string | undefined): string {
  if (!platform) {
    return inferPlatform();
  }
  if (platform.toLowerCase() === 'windows') {
    return 'win32';
  }

  if (['osx', 'mac', 'macos'].includes(platform.toLowerCase())) {
    return 'darwin';
  }

  return platform.toLowerCase();
}
