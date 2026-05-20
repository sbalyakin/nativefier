import * as path from 'path';

import {
  appendCommandLineSwitch,
  disableHardwareAcceleration,
  getAppName,
  getAppVersion,
  getUserAgentFallback,
  setAppPath,
  setAppUserModelId,
  setUserAgentFallback,
} from '../adapters/appAdapter';
import { configureFileDownloads } from '../adapters/downloadAdapter';
import { inferFlashPath } from '../helpers/inferFlash';
import {
  isWayland,
  isWindows,
  removeUserAgentSpecifics,
} from '../helpers/helpers';
import * as log from '../helpers/loggingHelper';
import type { OutputOptions } from '../../../shared/src/options/model';

export function applyPortablePaths(appArgs: OutputOptions): void {
  if (!appArgs.portable) {
    return;
  }

  const appDataPath = path.resolve(path.join(__dirname, '..', 'appData'));
  log.debug(
    'App was built as portable; setting appData and userData to the app folder: ',
    appDataPath,
  );
  setAppPath('appData', appDataPath);
  setAppPath('userData', appDataPath);
}

export function applyUserAgent(appArgs: OutputOptions): void {
  if (appArgs.userAgentHonest) {
    return;
  }

  if (appArgs.userAgent) {
    setUserAgentFallback(appArgs.userAgent);
  } else {
    setUserAgentFallback(
      removeUserAgentSpecifics(
        getUserAgentFallback(),
        getAppName(),
        getAppVersion(),
      ),
    );
  }
}

export function applyWindowsNotificationIdentity(): void {
  if (isWindows()) {
    setAppUserModelId(getAppName());
  }
}

export function applyProcessEnvs(appArgs: OutputOptions): void {
  if (!appArgs.processEnvs) {
    return;
  }

  let processEnvs: Record<string, string> =
    appArgs.processEnvs as unknown as Record<string, string>;

  if (typeof appArgs.processEnvs === 'string') {
    try {
      processEnvs = JSON.parse(appArgs.processEnvs) as Record<string, string>;
    } catch {
      log.warn('processEnvs is not valid JSON; ignoring');
      return;
    }
  }

  Object.keys(processEnvs)
    .filter((key) => key !== undefined)
    .forEach((key) => {
      process.env[key] = processEnvs[key];
    });
}

export function applyCommandLineSwitches(appArgs: OutputOptions): void {
  if (typeof appArgs.flashPluginDir === 'string') {
    appendCommandLineSwitch('ppapi-flash-path', appArgs.flashPluginDir);
  } else if (appArgs.flashPluginDir) {
    appendCommandLineSwitch('ppapi-flash-path', inferFlashPath());
  }

  if (appArgs.ignoreCertificate) {
    appendCommandLineSwitch('ignore-certificate-errors');
  }

  if (appArgs.disableGpu) {
    disableHardwareAcceleration();
  }

  if (appArgs.ignoreGpuBlacklist) {
    appendCommandLineSwitch('ignore-gpu-blacklist');
  }

  if (appArgs.enableEs3Apis) {
    appendCommandLineSwitch('enable-es3-apis');
  }

  if (appArgs.diskCacheSize) {
    appendCommandLineSwitch(
      'disk-cache-size',
      appArgs.diskCacheSize.toString(),
    );
  }

  if (isWayland()) {
    appendCommandLineSwitch('enable-features', 'WebRTCPipeWireCapturer');
  }

  if (appArgs.lang) {
    const langParts = appArgs.lang.split(',');
    const langPartsParsed = Array.from(
      new Set(langParts.map((l) => l.split('-')[0])),
    );
    const langFlag = langPartsParsed.join(',');
    log.debug('Setting --lang flag to', langFlag);
    appendCommandLineSwitch('--lang', langFlag);
  }
}

export function applyFileDownloadOptions(appArgs: OutputOptions): void {
  configureFileDownloads({ ...(appArgs.fileDownloadOptions ?? {}) });
}

export function applyRuntimeStartup(appArgs: OutputOptions): void {
  applyPortablePaths(appArgs);
  applyUserAgent(appArgs);
  applyWindowsNotificationIdentity();
  applyProcessEnvs(appArgs);
  applyCommandLineSwitches(appArgs);
  applyFileDownloadOptions(appArgs);
}
