import * as path from 'path';

import { app } from 'electron';

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
  app.setPath('appData', appDataPath);
  app.setPath('userData', appDataPath);
}

export function applyUserAgent(appArgs: OutputOptions): void {
  if (appArgs.userAgentHonest) {
    return;
  }

  if (appArgs.userAgent) {
    app.userAgentFallback = appArgs.userAgent;
  } else {
    app.userAgentFallback = removeUserAgentSpecifics(
      app.userAgentFallback,
      app.getName(),
      app.getVersion(),
    );
  }
}

export function applyWindowsNotificationIdentity(): void {
  if (isWindows()) {
    app.setAppUserModelId(app.getName());
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
      processEnvs = {};
      process.env.processEnvs = appArgs.processEnvs;
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
    app.commandLine.appendSwitch('ppapi-flash-path', appArgs.flashPluginDir);
  } else if (appArgs.flashPluginDir) {
    app.commandLine.appendSwitch('ppapi-flash-path', inferFlashPath());
  }

  if (appArgs.ignoreCertificate) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
  }

  if (appArgs.disableGpu) {
    app.disableHardwareAcceleration();
  }

  if (appArgs.ignoreGpuBlacklist) {
    app.commandLine.appendSwitch('ignore-gpu-blacklist');
  }

  if (appArgs.enableEs3Apis) {
    app.commandLine.appendSwitch('enable-es3-apis');
  }

  if (appArgs.diskCacheSize) {
    app.commandLine.appendSwitch(
      'disk-cache-size',
      appArgs.diskCacheSize.toString(),
    );
  }

  if (appArgs.basicAuthUsername) {
    app.commandLine.appendSwitch(
      'basic-auth-username',
      appArgs.basicAuthUsername,
    );
  }

  if (appArgs.basicAuthPassword) {
    app.commandLine.appendSwitch(
      'basic-auth-password',
      appArgs.basicAuthPassword,
    );
  }

  if (isWayland()) {
    app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
  }

  if (appArgs.lang) {
    const langParts = appArgs.lang.split(',');
    const langPartsParsed = Array.from(
      new Set(langParts.map((l) => l.split('-')[0])),
    );
    const langFlag = langPartsParsed.join(',');
    log.debug('Setting --lang flag to', langFlag);
    app.commandLine.appendSwitch('--lang', langFlag);
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
